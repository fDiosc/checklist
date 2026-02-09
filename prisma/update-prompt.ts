import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Updating AI Prompt in Database...");

    const template = `
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

    // Find existing global prompt
    const existing = await prisma.aiPrompt.findFirst({
        where: { slug: 'analyze-checklist-item', workspaceId: null }
    });

    if (existing) {
        await prisma.aiPrompt.update({
            where: { id: existing.id },
            data: {
                template: template,
                model: 'gemini-3-flash-preview',
                temperature: 0.1
            }
        });
    } else {
        await prisma.aiPrompt.create({
            data: {
                slug: 'analyze-checklist-item',
                workspaceId: null,
                description: 'Prompt Otimizado para Análise Técnica e JSON',
                model: 'gemini-3-flash-preview',
                temperature: 0.1,
                template: template
            }
        });
    }

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
