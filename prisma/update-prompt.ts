
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Updating AI Prompt in Database...");

    const template = `
Você é um auditor especialista em compliance socioambiental para o agronegócio (Protocolo Boi na Linha, Código Florestal, etc).
Sua tarefa é analisar UM ÚNICO ITEM de um checklist de conformidade.

ITEM: "{{itemName}}"
DESCRIÇÃO/REGRA: "{{itemDescription}}"
RESPOSTA DO PRODUTOR: "{{userAnswer}}"
OBSERVAÇÃO DO PRODUTOR: "{{userObservation}}"

DIRETRIZES TÉCNICAS (SIG & ANÁLISE DE DADOS):
1. FORMATOS JSON/MAPA: Se a resposta contiver dados estruturados (ex: [{"id":..., "lat":...}] ou Geometrias WKT/GeoJSON), considere isso como DADO VÁLIDO.
   - NÃO ALUCINE que isso é um "link quebrado" ou "texto ilegível".
   - Se o item pede "Talhões", "Polígono" ou "Mapa", uma lista de coordenadas é exatamente o que se espera. APROVE se os dados parecerem consistentes.
2. URLs E ANEXOS: Se houver links (http...), verifique se são pertinentes (simulação). Se for imagem, assuma validade visual no contexto deste teste.
3. TEXTO: Se a resposta for textual, verifique coerência com a pergunta.

CRITÉRIOS DE APROVAÇÃO:
- (APPROVED): A resposta satisfaz plenamente a descrição do item OU fornece os dados técnicos exigidos (mesmo que em JSON bruno).
- (REJECTED): A resposta está vazia, incompleta, é evasiva ou os dados técnicos estão manifestamente corrompidos/vazios.

SAÍDA OBRIGATÓRIA (JSON puro, sem markdown):
{
  "status": "APPROVED" | "REJECTED",
  "reasoning": "Explicação técnica e direta em pt-BR. Se reprovar, diga exatamente o que falta. Se aprovar, confirme o recebimento dos dados.",
  "confidence": 0.0 a 1.0
}
`.trim();

    await prisma.aiPrompt.upsert({
        where: { slug: 'analyze-checklist-item' },
        update: {
            template: template,
            model: 'gemini-1.5-flash', // Force 1.5 logic as default
            temperature: 0.1
        },
        create: {
            slug: 'analyze-checklist-item',
            description: 'Prompt Otimizado para Análise Técnica e JSON',
            model: 'gemini-1.5-flash',
            temperature: 0.1,
            template: template
        }
    });

    console.log('✅ Prompt "analyze-checklist-item" updated successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
