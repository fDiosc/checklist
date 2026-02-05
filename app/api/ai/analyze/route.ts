import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Language instructions for AI responses
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
    'pt-BR': 'Responda em Português do Brasil.',
    'en': 'Respond in English.',
    'es': 'Responde en Español.'
};

export async function POST(req: Request) {
    try {
        const { checklistId, itemId, userAnswer, userObservation, itemName, itemDescription, fieldId, locale = 'pt-BR' } = await req.json();

        // Fetch prompt config
        // In a real app we might cache this or use a singleton
        const promptConfig = await db.aiPrompt.findFirst({
            where: { slug: 'analyze-checklist-item' }
        });

        if (!promptConfig) {
            console.error("Prompt 'analyze-checklist-item' not found");
            return NextResponse.json({ error: "Prompt configuration not found" }, { status: 500 });
        }

        // Prepare Prompt (Validation moved to specific block below)

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn("GEMINI_API_KEY not found. Returning mock.");
            // Mock delay
            await new Promise(r => setTimeout(r, 1500));

            // Random mock logic
            const isApproved = Math.random() > 0.3;
            // The original mock returned NextResponse.json directly.
            // The new structure implies this logic might be inside a function that returns an object.
            // For now, let's adapt the mock to return the expected analysis object.
            const mockAnalysis = {
                status: isApproved ? 'APPROVED' : 'REJECTED',
                reason: isApproved
                    ? "A resposta está em conformidade com o padrão exigido (Mock)."
                    : "A justificativa apresentada é insuficiente para o item (Mock).",
                confidence: 0.9 + (Math.random() * 0.1)
            };

            // Persist mock result to DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db.response as any).update({
                where: {
                    checklistId_itemId_fieldId: {
                        checklistId,
                        itemId: itemId,
                        fieldId: fieldId || "__global__"
                    }
                },
                data: {
                    aiFlag: mockAnalysis.status,
                    aiMessage: mockAnalysis.reason,
                    aiConfidence: mockAnalysis.confidence,
                }
            });

            return NextResponse.json(mockAnalysis);
        }

        // Real AI Call
        const ai = new GoogleGenAI({ apiKey });

        // Use Gemini 3 Flash as requested
        let modelName = 'gemini-3-flash-preview';

        if (promptConfig.model && promptConfig.model.trim().length > 0) {
            const dbModel = promptConfig.model.toLowerCase();

            // Allow explicit overrides from DB if needed, but defaulting to 2.5
            // If the DB has legacy 1.5, we can upgrade it, or respect it.
            // Let's respect it if it's explicitly set to something valid.
            if (dbModel.includes('1.5') || dbModel.includes('pro') || dbModel.includes('2.0')) {
                modelName = promptConfig.model;
            }
        }

        // Safe Fallback logic for Experimental Models
        // If 2.0/3.0 fails (404), fallback to 1.5 Flash

        // Add language instruction based on locale
        const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] || LANGUAGE_INSTRUCTIONS['pt-BR'];

        const prompt = promptConfig.template
            .replace('{{itemName}}', itemName)
            .replace('{{itemDescription}}', itemDescription || '')
            .replace('{{userAnswer}}', userAnswer)
            .replace('{{userObservation}}', userObservation || 'Nenhuma');

        // Handle Image content if answer looks like URL
        let finalPrompt = `${languageInstruction}\n\n${prompt}`;

        // HALLUCINATION FIX: Detect JSON/Map Data
        if (userAnswer && (userAnswer.trim().startsWith('[') || userAnswer.trim().startsWith('{'))) {
            finalPrompt = `CONTEXTO TÉCNICO: A resposta do usuário (userAnswer) está em formato JSON (dados estruturados, exemplo: coordenadas de mapa, lista de arquivos ou ids).
             INSTRUÇÃO: Não trate este JSON como um texto comum e não alucine que ele é uma URL de documento, a menos que seja explicitamente um link http.
             Se o item pede 'Talhões' ou 'Mapa', uma lista de coordenadas JSON é uma resposta VÁLIDA.
             Avalie se o JSON não está vazio. Se tiver dados, considere VÁLIDO/APROVADO para este critério de preenchimento.
             
             ` + finalPrompt;
        }

        if (userAnswer && (userAnswer.startsWith('http') || userAnswer.startsWith('/')) && userAnswer.match(/\.(jpeg|jpg|png|webp)$/i)) {
            finalPrompt += `\n\n[Arquivo anexado: ${userAnswer}]`;
        }

        try {
            // New SDK Syntax: ai.models.generateContent({ model: ..., contents: ... })
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: finalPrompt }]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: promptConfig.temperature
                }
            });

            const responseText = result.text;

            // Parse JSON
            const jsonMatch = responseText ? responseText.match(/\{[\s\S]*\}/) : null;

            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);

                // Normalize status and reasoning keys
                if (!['APPROVED', 'REJECTED'].includes(analysis.status)) {
                    analysis.status = 'PENDING_VERIFICATION';
                }

                // URGENT FIX: Ensure 'reason' is populated for frontend
                analysis.reason = analysis.reasoning || analysis.reason;

                // PERSIST TO DATABASE
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (db.response as any).update({
                    where: {
                        checklistId_itemId_fieldId: {
                            checklistId,
                            itemId: itemId,
                            fieldId: fieldId || "__global__"
                        }
                    },
                    data: {
                        aiFlag: analysis.status,
                        aiMessage: analysis.reason,
                        aiConfidence: analysis.confidence || 0.9,
                    }
                });

                return NextResponse.json(analysis);
            }
        } catch (e) {
            console.error(`Gemini ${modelName} failed, retrying with 1.5`, e);
            // FALLBACK
            if (modelName !== 'gemini-1.5-flash') {
                try {
                    const resFallback = await ai.models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                        config: { responseMimeType: 'application/json' }
                    });

                    const textFallback = resFallback.text;
                    const jsonFallback = textFallback ? textFallback.match(/\{[\s\S]*\}/) : null;

                    if (jsonFallback) {
                        const analysis = JSON.parse(jsonFallback[0]);

                        if (!['APPROVED', 'REJECTED'].includes(analysis.status)) {
                            analysis.status = 'PENDING_VERIFICATION';
                        }

                        // NORMALIZE KEY
                        analysis.reason = analysis.reasoning || analysis.reason;

                        // PERSIST FALLBACK RESULT
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (db.response as any).update({
                            where: {
                                checklistId_itemId_fieldId: {
                                    checklistId,
                                    itemId: itemId,
                                    fieldId: fieldId || "__global__"
                                }
                            },
                            data: {
                                aiFlag: analysis.status,
                                aiMessage: analysis.reason,
                                aiConfidence: analysis.confidence || 0.9
                            }
                        });

                        return NextResponse.json(analysis);
                    }
                } catch (fbError) {
                    console.error("Fallback 1.5 failed", fbError);
                }
            }
            throw e; // Rethrow if fallback fails
        }

        // If AI call fails and no fallback, or parsing fails
        return NextResponse.json({
            error: "AI Processing Failed: Could not parse AI response or unexpected error.",
            details: "The AI model returned an unparseable response or an unhandled error occurred.",
        }, { status: 500 });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({
            error: "AI Processing Failed",
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
