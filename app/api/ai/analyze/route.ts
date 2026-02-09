import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getPresignedUrl, isS3Key } from "@/lib/s3";

// Extend timeout for AI processing (5 minutes)
export const maxDuration = 300;
export const runtime = "nodejs";

// Language instructions for AI responses
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
    'pt-BR': 'Responda em Português do Brasil.',
    'en': 'Respond in English.',
    'es': 'Responde en Español.'
};

// Default prompt template - used when DB prompt is not found (self-healing)
const DEFAULT_PROMPT_TEMPLATE = `
Você é um auditor especialista em compliance socioambiental para o agronegócio.
Sua tarefa é analisar UM ÚNICO ITEM de um checklist de conformidade.

ITEM: "{{itemName}}"
DESCRIÇÃO/REGRA: "{{itemDescription}}"
TIPO DO ITEM: "{{itemType}}"
RESPOSTA DO PRODUTOR: "{{userAnswer}}"
OBSERVAÇÃO DO PRODUTOR: "{{userObservation}}"
QUANTIDADE INFORMADA: "{{quantity}}"
POSSUI ANEXO: {{hasAttachment}}

DIRETRIZES DE ANÁLISE:

1. VALIDAÇÃO DA RESPOSTA:
   - Verifique se a resposta faz sentido para a pergunta.
   - Se houver quantidade, verifique se é plausível (ex: aplicar 100.000 kg/ha de adubo é absurdo; 200 kg/ha é razoável).
   - Se a resposta for "Sim" ou "Não", verifique se é coerente com a descrição do item.

2. VALIDAÇÃO DE ANEXO (SE HOUVER):
   - Se o item pede um DOCUMENTO ESPECÍFICO (ex: CNH, Escritura, Licença Ambiental, CAR, CCIR), verifique se o anexo é condizente.
   - Se o anexo parece ser de um tipo completamente diferente do solicitado, REJEITE e explique qual documento era esperado.
   - Se não for possível determinar o tipo do documento, APROVE com confiança mais baixa e mencione a incerteza.

3. FORMATOS JSON/MAPA:
   - Se a resposta contiver dados estruturados ([{"id":..., "lat":...}] ou Geometrias), considere DADO VÁLIDO.
   - NÃO trate JSON como "link quebrado" ou "texto ilegível".
   - Se o item pede "Talhões", "Polígono" ou "Mapa", coordenadas JSON são exatamente o esperado.

4. SANITY CHECK DE QUANTIDADES:
   - Fertilizantes: aplicações típicas entre 50-500 kg/ha
   - Defensivos: aplicações típicas entre 0.5-5 L/ha
   - Área plantada: verificar se está em faixa razoável para o tipo de cultura
   - Número de colaboradores: tipicamente entre 1-500 para fazendas
   - Se um valor parecer extremamente alto ou baixo, REJEITE ou marque como PENDING_VERIFICATION.

CRITÉRIOS DE DECISÃO:
- APPROVED: A resposta satisfaz a descrição do item, o anexo (se houver) é compatível, quantidades são plausíveis.
- REJECTED: Resposta vazia/incoerente, anexo incompatível com o solicitado, ou valores claramente absurdos.
- PENDING_VERIFICATION: Há dúvidas que um humano precisa resolver (confiança < 0.6).

SAÍDA OBRIGATÓRIA (JSON puro, sem markdown):
{
  "status": "APPROVED" | "REJECTED" | "PENDING_VERIFICATION",
  "reason": "Explicação técnica e direta. Se reprovar, diga exatamente o que está errado e o que é esperado.",
  "confidence": 0.0 a 1.0
}
`.trim();

async function getOrCreatePrompt() {
    let promptConfig = await db.aiPrompt.findFirst({
        where: { slug: 'analyze-checklist-item' }
    });

    if (!promptConfig) {
        // Self-healing: create the default prompt in DB
        console.warn("Prompt 'analyze-checklist-item' not found in DB. Creating default...");
        promptConfig = await db.aiPrompt.create({
            data: {
                slug: 'analyze-checklist-item',
                workspaceId: null,
                description: 'Prompt para análise individual de itens do checklist (com suporte a anexos e sanity check)',
                model: 'gemini-3-flash-preview',
                temperature: 0.1,
                template: DEFAULT_PROMPT_TEMPLATE
            }
        });
        console.log("Default prompt 'analyze-checklist-item' created successfully.");
    }

    return promptConfig;
}

async function resolveFileToBase64(fileKey: string): Promise<{ base64: string; mimeType: string } | null> {
    try {
        let fileUrl: string;
        if (isS3Key(fileKey)) {
            fileUrl = await getPresignedUrl(fileKey, 300);
        } else if (fileKey.startsWith('http')) {
            fileUrl = fileKey;
        } else {
            return null;
        }

        const extension = fileKey.split('.').pop()?.toLowerCase() || '';
        const mimeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
        };
        const mimeType = mimeMap[extension] || 'application/octet-stream';

        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
        const buffer = Buffer.from(await fileResponse.arrayBuffer());
        const base64 = buffer.toString('base64');
        return { base64, mimeType };
    } catch (error) {
        console.warn("Failed to resolve file for AI analysis:", error);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const {
            checklistId,
            itemId,
            userAnswer,
            userObservation,
            itemName,
            itemDescription,
            itemType,
            fileUrl: attachmentKey,
            quantity,
            fieldId,
            locale = 'pt-BR'
        } = await req.json();

        // Fetch or create prompt config (self-healing)
        const promptConfig = await getOrCreatePrompt();

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn("GEMINI_API_KEY not found. Returning mock.");
            await new Promise(r => setTimeout(r, 1500));

            const isApproved = Math.random() > 0.3;
            const mockAnalysis = {
                status: isApproved ? 'APPROVED' : 'REJECTED',
                reason: isApproved
                    ? "A resposta está em conformidade com o padrão exigido (Mock)."
                    : "A justificativa apresentada é insuficiente para o item (Mock).",
                confidence: 0.9 + (Math.random() * 0.1)
            };

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

        let modelName = 'gemini-3-flash-preview';
        if (promptConfig.model && promptConfig.model.trim().length > 0) {
            const dbModel = promptConfig.model.toLowerCase();
            if (dbModel.includes('1.5') || dbModel.includes('pro') || dbModel.includes('2.0')) {
                modelName = promptConfig.model;
            }
        }

        // Add language instruction based on locale
        const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] || LANGUAGE_INSTRUCTIONS['pt-BR'];

        const hasAttachment = !!attachmentKey;
        const prompt = promptConfig.template
            .replace('{{itemName}}', itemName || '')
            .replace('{{itemDescription}}', itemDescription || '')
            .replace('{{itemType}}', itemType || 'N/A')
            .replace('{{userAnswer}}', userAnswer || '')
            .replace('{{userObservation}}', userObservation || 'Nenhuma')
            .replace('{{quantity}}', quantity || 'N/A')
            .replace('{{hasAttachment}}', hasAttachment ? 'Sim (veja imagem/documento abaixo)' : 'Não');

        let finalPrompt = `${languageInstruction}\n\n${prompt}`;

        // HALLUCINATION FIX: Detect JSON/Map Data
        if (userAnswer && (userAnswer.trim().startsWith('[') || userAnswer.trim().startsWith('{'))) {
            finalPrompt = `CONTEXTO TÉCNICO: A resposta do usuário (userAnswer) está em formato JSON (dados estruturados, exemplo: coordenadas de mapa, lista de arquivos ou ids).
             INSTRUÇÃO: Não trate este JSON como um texto comum e não alucine que ele é uma URL de documento, a menos que seja explicitamente um link http.
             Se o item pede 'Talhões' ou 'Mapa', uma lista de coordenadas JSON é uma resposta VÁLIDA.
             Avalie se o JSON não está vazio. Se tiver dados, considere VÁLIDO/APROVADO para este critério de preenchimento.
             
             ` + finalPrompt;
        }

        // Build multimodal content parts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentParts: any[] = [{ text: finalPrompt }];

        // If there's an attachment, resolve and add as inline data for multimodal analysis
        if (attachmentKey) {
            const fileData = await resolveFileToBase64(attachmentKey);
            if (fileData) {
                contentParts.push({
                    inlineData: {
                        data: fileData.base64,
                        mimeType: fileData.mimeType,
                    }
                });
            } else {
                // If we couldn't download, at least tell the AI about the attachment
                contentParts[0] = {
                    text: finalPrompt + `\n\n[NOTA: Há um anexo (${attachmentKey}) mas não foi possível carregá-lo para análise visual. Avalie apenas com base na resposta textual.]`
                };
            }
        }

        // Also handle FILE type where the answer IS the file
        if (!attachmentKey && userAnswer && itemType === 'FILE') {
            const fileData = await resolveFileToBase64(userAnswer);
            if (fileData) {
                contentParts.push({
                    inlineData: {
                        data: fileData.base64,
                        mimeType: fileData.mimeType,
                    }
                });
            }
        }

        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: 'user',
                        parts: contentParts
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: promptConfig.temperature
                }
            });

            const responseText = result.text;
            const jsonMatch = responseText ? responseText.match(/\{[\s\S]*\}/) : null;

            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);

                if (!['APPROVED', 'REJECTED', 'PENDING_VERIFICATION'].includes(analysis.status)) {
                    analysis.status = 'PENDING_VERIFICATION';
                }

                // Normalize key: some models return 'reasoning' instead of 'reason'
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
                        contents: [{ role: 'user', parts: contentParts }],
                        config: { responseMimeType: 'application/json' }
                    });

                    const textFallback = resFallback.text;
                    const jsonFallback = textFallback ? textFallback.match(/\{[\s\S]*\}/) : null;

                    if (jsonFallback) {
                        const analysis = JSON.parse(jsonFallback[0]);

                        if (!['APPROVED', 'REJECTED', 'PENDING_VERIFICATION'].includes(analysis.status)) {
                            analysis.status = 'PENDING_VERIFICATION';
                        }

                        analysis.reason = analysis.reasoning || analysis.reason;

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
            throw e;
        }

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
