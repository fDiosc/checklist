import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Extend timeout for AI processing (5 minutes)
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { fileBase64, mimeType } = await req.json();

        if (!fileBase64 || !mimeType) {
            return NextResponse.json({ error: "File content and mimeType are required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Server API Key not configured" }, { status: 500 });
        }

        // 1. Fetch or Seed Prompt
        let promptConfig = await db.aiPrompt.findFirst({
            where: { slug: 'generate-template-structure' }
        });

        if (!promptConfig) {
            // Auto-seed for convenience
            promptConfig = await db.aiPrompt.create({
                data: {
                    slug: 'generate-template-structure',
                    description: 'Extracts checklist structure from document images/PDFs',
                    model: 'gemini-3-flash-preview',
                    temperature: 0.1,
                    template: `
                        Você é um especialista em Compliance e Auditoria do Agronegócio (PAGR, ISO, etc).
                        Analise o documento anexo (que pode ser um PDF, Imagem de formulário ou Excel) e extraia a estrutura de checklist.

                        Sua tarefa é converter o conteúdo visual em uma estrutura JSON estrita para minha aplicação.

                        Regras de Mapeamento:
                        1. Agrupe os itens em 'sections' baseadas nos cabeçalhos visuais do documento (ex: "Nível II - Registros", "Infraestrutura", "Manejo").
                        2. Para cada item/pergunta, determine o 'type' ideal (USE LETRAS MAIÚSCULAS):
                           - Se pede uma foto, evidência visual ou documento anexo -> type: 'FILE'
                           - Se é uma pergunta de Sim/Não -> type: 'SINGLE_CHOICE', options: ['Sim', 'Não', 'N/A']
                           - Se é uma data -> type: 'DATE'
                           - Se é texto livre -> type: 'TEXT'
                           - Se pede para desenhar ou selecionar talhão -> type: 'PROPERTY_MAP'
                        3. Se for uma pergunta (single_choice) que implicitamente requer uma prova (ex: "Existe contrato?", "Possui outorga?"), defina 'requestArtifact': true.
                        4. O 'name' deve ser a pergunta completa.

                        Retorne APENAS um JSON com o seguinte formato (sem markdown):
                        [
                          {
                            "id": "sec-1",
                            "name": "Nome da Seção",
                            "items": [
                               {
                                 "id": "item-1",
                                 "name": "Texto da pergunta",
                                 "type": "SINGLE_CHOICE" | "FILE" | "TEXT" | "DATE" | "PROPERTY_MAP",
                                 "options": ["Sim", "Não"] (apenas se type for SINGLE_CHOICE),
                                 "required": true,
                                 "requestArtifact": true (se precisar de anexo na pergunta),
                                 "validityControl": false (true se for documento com validade ex: ASO, CNH)
                               }
                            ]
                          }
                        ]
                    `
                }
            });
        }

        // 2. Call Gemini
        const ai = new GoogleGenAI({ apiKey });

        // Use configured model or fallback/update to 2.5
        const modelName = promptConfig.model || 'gemini-3-flash-preview';

        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: promptConfig.template },
                            { inlineData: { mimeType: mimeType, data: fileBase64 } }
                        ]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: promptConfig.temperature
                }
            });

            const responseText = result.text;
            const cleanJson = responseText?.replace(/```json/g, '').replace(/```/g, '').trim();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sections = JSON.parse(cleanJson || '[]');

            // Normalize types to Uppercase to match Enum/Zod
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sections = sections.map((section: any) => ({
                ...section,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: section.items.map((item: any) => ({
                    ...item,
                    type: (item.type?.toUpperCase() === 'SINGLE_CHOICE' || item.type?.toUpperCase() === 'single_choice') ? 'SINGLE_CHOICE' : (item.type?.toUpperCase() || 'TEXT')
                }))
            }));

            return NextResponse.json(sections);

        } catch (error) {
            console.error("[AI Template] Gemini Generation Error:", error);
            // Fallback to 1.5 if 2.5 fails (unlikely but safe)
            if (modelName !== 'gemini-1.5-flash') {
                // Retry logic could go here, but keeping it simple for now
            }
            return NextResponse.json({ error: "Failed to process document with AI" }, { status: 500 });
        }

    } catch (error) {
        console.error("[AI Template] Endpoint Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
