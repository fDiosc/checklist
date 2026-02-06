import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedUrl, isS3Key } from "@/lib/s3";

export const maxDuration = 60;
export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
    try {
        const { s3Key, itemName, itemType, workspaceId } = await req.json();

        if (!s3Key || !itemName || !workspaceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if AI doc validation is enabled for this workspace
        const workspace = await db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                aiDocValidationEnabled: true,
                aiDocValidationMode: true,
                parentWorkspaceId: true,
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        let validationEnabled = workspace.aiDocValidationEnabled;
        let validationMode = workspace.aiDocValidationMode;

        // If not enabled directly, check parent workspace
        if (!validationEnabled && workspace.parentWorkspaceId) {
            const parent = await db.workspace.findUnique({
                where: { id: workspace.parentWorkspaceId },
                select: {
                    aiDocValidationEnabled: true,
                    aiDocValidationEnabledForSubs: true,
                    aiDocValidationMode: true,
                }
            });
            if (parent?.aiDocValidationEnabled && parent?.aiDocValidationEnabledForSubs) {
                validationEnabled = true;
                // Use the child workspace's mode if set, otherwise parent's
                if (validationMode === 'warn') {
                    validationMode = workspace.aiDocValidationMode || parent.aiDocValidationMode;
                }
            }
        }

        if (!validationEnabled) {
            // AI validation is disabled - return a passing result
            return NextResponse.json({
                valid: true,
                legible: true,
                correctType: true,
                message: "AI validation is not enabled for this workspace.",
                mode: "disabled",
            });
        }

        // Get a URL for the file so the AI can access it
        let fileUrl: string;
        if (isS3Key(s3Key)) {
            fileUrl = await getPresignedUrl(s3Key, 300); // 5 min expiry
        } else if (s3Key.startsWith('http')) {
            fileUrl = s3Key;
        } else {
            return NextResponse.json({
                valid: true,
                legible: true,
                correctType: true,
                message: "Cannot validate this file format.",
                mode: validationMode,
            });
        }

        // Call Gemini to analyze the document
        const prompt = `Você é um assistente especializado em validação de documentos para processos de auditoria e compliance agrícola.

Analise a imagem/documento fornecido e responda em formato JSON com os seguintes campos:
- "legible": boolean - Se o documento está legível (não borrado, cortado, ou ilegível)
- "correctType": boolean - Se o documento parece ser do tipo esperado para o item "${itemName}" (tipo: ${itemType})
- "message": string - Uma breve mensagem em português explicando o resultado da análise
- "confidence": number (0-1) - Nível de confiança na análise

Se não for possível analisar a imagem, retorne legible: false com uma mensagem explicativa.

Responda APENAS com o JSON, sem markdown ou formatação adicional.`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                fileData: {
                                    fileUri: fileUrl,
                                    mimeType: "image/jpeg",
                                }
                            }
                        ]
                    }
                ],
            });

            const text = response.text?.trim() || '';
            // Parse the JSON from Gemini response
            let result;
            try {
                // Remove potential markdown code fences
                const cleanText = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
                result = JSON.parse(cleanText);
            } catch {
                console.warn("Failed to parse AI response as JSON:", text);
                result = {
                    legible: true,
                    correctType: true,
                    message: "Não foi possível analisar o documento automaticamente.",
                    confidence: 0,
                };
            }

            const valid = result.legible !== false && result.correctType !== false;

            return NextResponse.json({
                valid,
                legible: result.legible ?? true,
                correctType: result.correctType ?? true,
                message: result.message || "",
                confidence: result.confidence || 0,
                mode: validationMode,
            });
        } catch (aiError) {
            console.error("Gemini AI error:", aiError);
            // On AI failure, don't block the user
            return NextResponse.json({
                valid: true,
                legible: true,
                correctType: true,
                message: "Validação automática indisponível no momento.",
                mode: validationMode,
            });
        }
    } catch (error) {
        console.error("Document validation error:", error);
        return NextResponse.json({ error: "Validation failed" }, { status: 500 });
    }
}
