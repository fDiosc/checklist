import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Type for the structured action plan response from AI
interface ActionPlanResponse {
    title?: string;
    summary?: string;
    description?: string;
    actions?: Array<{
        itemRef?: string;
        priority?: string;
        action: string;
        deadline?: number;
        documents?: string[];
        responsible?: string;
    }>;
}

export async function POST(req: Request) {
    try {
        const { checklistId } = await req.json();

        // Fetch checklist with ALL responses (not just rejected)
        const checklist = await db.checklist.findUnique({
            where: { id: checklistId },
            include: {
                template: {
                    include: {
                        sections: {
                            include: { items: true }
                        }
                    }
                },
                responses: {
                    include: { item: true }
                },
                producer: true
            }
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checklistType = (checklist as any).type as string || 'ORIGINAL';
        const isCorrection = checklistType === 'CORRECTION';
        const isCompletion = checklistType === 'COMPLETION';

        // For CORRECTION: work with rejected items
        // For COMPLETION: work with pending/unanswered items
        let relevantItems: Array<{ item: string; answer?: string; status?: string; rejectionReason?: string | null; field?: string }> = [];

        if (isCorrection) {
            // In a correction checklist, items that need correction usually have a rejectionReason 
            // from the parent, but their status in the child is 'MISSING' until re-answered.
            const rejectedResponses = checklist.responses.filter(r => r.status === 'REJECTED' || r.rejectionReason);
            if (rejectedResponses.length === 0) {
                return NextResponse.json({ error: "Não há itens com pendência de correção para gerar plano" }, { status: 400 });
            }
            relevantItems = rejectedResponses.map(r => ({
                item: r.item.name,
                answer: r.answer || undefined,
                rejectionReason: r.rejectionReason,
                field: r.fieldId !== '__global__' ? r.fieldId : 'Geral'
            }));
        } else if (isCompletion) {
            // Get all template items
            const allTemplateItems = checklist.template.sections.flatMap(s => s.items);
            const answeredItemIds = new Set(checklist.responses.map(r => r.itemId));

            // Pending = items not answered yet
            const pendingItems = allTemplateItems.filter(item => !answeredItemIds.has(item.id));

            // Also include non-approved items
            const nonApprovedResponses = checklist.responses.filter(r => r.status !== 'APPROVED');

            if (pendingItems.length === 0 && nonApprovedResponses.length === 0) {
                return NextResponse.json({ error: "Não há itens pendentes para gerar plano de complemento" }, { status: 400 });
            }

            relevantItems = [
                ...pendingItems.map(item => ({
                    item: item.name,
                    status: 'PENDENTE'
                })),
                ...nonApprovedResponses.map(r => ({
                    item: r.item.name,
                    answer: r.answer || undefined,
                    status: r.status
                }))
            ];
        } else {
            // ORIGINAL: work with unanswered items AND non-approved responses
            const allTemplateItems = checklist.template.sections.flatMap(s => s.items);
            const answeredItemIds = new Set(checklist.responses.map(r => r.itemId));
            const unansweredItems = allTemplateItems.filter(item => !answeredItemIds.has(item.id));
            const nonApprovedResponses = checklist.responses.filter(r => r.status !== 'APPROVED');

            if (unansweredItems.length === 0 && nonApprovedResponses.length === 0) {
                return NextResponse.json({ error: "Não há itens pendentes ou não-aprovados para gerar plano de ação" }, { status: 400 });
            }

            relevantItems = [
                ...unansweredItems.map(item => ({
                    item: item.name,
                    status: 'PENDENTE'
                })),
                ...nonApprovedResponses.map(r => ({
                    item: r.item.name,
                    answer: r.answer || undefined,
                    status: r.status,
                    rejectionReason: r.rejectionReason
                }))
            ];
        }

        // Find the appropriate prompt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const template = checklist.template as any;
        let promptConfig = null;

        // Strategy: If template has actionPlanPromptId, try to find variant with suffix
        // e.g., if actionPlanPromptId points to slug "plano-de-acao", look for:
        // - "plano-de-acao-correction" for CORRECTION
        // - "plano-de-acao-completion" for COMPLETION

        if (template.actionPlanPromptId) {
            const basePrompt = await db.aiPrompt.findUnique({
                where: { id: template.actionPlanPromptId }
            });

            if (basePrompt) {
                const typeSuffix = isCorrection ? '-correction' : isCompletion ? '-completion' : '';
                if (typeSuffix) {
                    // Try to find type-specific variant
                    const variantSlug = basePrompt.slug + typeSuffix;
                    const variantPrompt = await db.aiPrompt.findUnique({
                        where: { slug: variantSlug }
                    });
                    promptConfig = variantPrompt || basePrompt;
                } else {
                    promptConfig = basePrompt;
                }
            }
        }

        // Fallback to system default with type suffix
        if (!promptConfig) {
            const defaultSuffix = isCorrection ? '-correction' : isCompletion ? '-completion' : '';
            const defaultSlug = 'generate-action-plan-default' + defaultSuffix;

            promptConfig = await db.aiPrompt.findUnique({
                where: { slug: defaultSlug }
            });

            // Ultimate fallback
            if (!promptConfig) {
                promptConfig = await db.aiPrompt.findUnique({
                    where: { slug: 'generate-action-plan-default' }
                });
            }
        }

        if (!promptConfig) {
            return NextResponse.json({ error: "No action plan prompt configured" }, { status: 500 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI API Key not configured" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const modelName = promptConfig.model || 'gemini-2.5-flash';

        // Prepare prompt with context
        let prompt = promptConfig.template
            .replace('{{producerName}}', checklist.producer?.name || 'Produtor')
            .replace('{{checklistName}}', checklist.template.name)
            .replace('{{checklistType}}', checklistType);

        // Replace any of the item placeholders
        prompt = prompt
            .replace('{{rejectedItems}}', JSON.stringify(relevantItems, null, 2))
            .replace('{{pendingItems}}', JSON.stringify(relevantItems, null, 2))
            .replace('{{items}}', JSON.stringify(relevantItems, null, 2));

        console.log("=== ACTION PLAN GENERATION ===");
        console.log("Type:", checklistType);
        console.log("Prompt slug:", promptConfig.slug);
        console.log("Items count:", relevantItems.length);

        const result = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            config: {
                responseMimeType: 'application/json',
                temperature: promptConfig.temperature
            }
        });

        // Debug logging
        console.log("Raw result.text:", result.text?.substring(0, 500));

        let plan: ActionPlanResponse = {};
        try {
            plan = JSON.parse(result.text || '{}');
            console.log("Parsed plan - title:", plan.title, "actions:", plan.actions?.length);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.log("Full raw text:", result.text);
        }

        // Create description from actions if not provided
        let description = plan.description || plan.summary || "Plano gerado automaticamente pela IA.";
        if (plan.actions && plan.actions.length > 0 && !plan.description) {
            description = plan.actions.map((a, i) =>
                `${i + 1}. ${a.action}${a.deadline ? ` (Prazo: ${a.deadline} dias)` : ''}`
            ).join('\n\n');
        }

        // Persist Action Plan
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionPlan = await (db as any).actionPlan.create({
            data: {
                checklistId,
                title: plan.title || `Plano de Ação - ${checklist.template.name}`,
                description: description,
                summary: plan.summary || null,
                status: "OPEN"
            }
        });

        // Persist individual ActionItems if available
        if (plan.actions && plan.actions.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db as any).actionItem.createMany({
                data: plan.actions.map(action => ({
                    actionPlanId: actionPlan.id,
                    itemRef: action.itemRef || null,
                    priority: action.priority || 'MEDIA',
                    action: action.action,
                    deadline: action.deadline || null,
                    documents: action.documents || [],
                    responsible: action.responsible || 'Produtor',
                    isCompleted: false
                }))
            });
        }

        // Return action plan with items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionPlanWithItems = await (db as any).actionPlan.findUnique({
            where: { id: actionPlan.id },
            include: { items: true }
        });

        return NextResponse.json(actionPlanWithItems);

    } catch (error) {
        console.error("Action Plan Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate action plan" }, { status: 500 });
    }
}
