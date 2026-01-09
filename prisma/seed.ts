import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.aiPrompt.upsert({
        where: { slug: 'analyze-checklist-item' },
        update: {},
        create: {
            slug: 'analyze-checklist-item',
            description: 'Prompt para análise individual de itens do checklist',
            model: 'gpt-4o',
            temperature: 0.2,
            template: `
Você é um auditor especialista em compliance socioambiental.
Analise a resposta abaixo para o item "{itemName}" do checklist "{checklistName}".

Contexto do Item: {itemDescription}
Resposta do Produtor: {userAnswer}
Observação: {userObservation}

Regras:
1. Verifique se a resposta atende ao requisito.
2. Se houver anexo (URL), verifique a validade aparente (mock).
3. Seja rigoroso mas justo.

Responda EXCLUSIVAMENTE em JSON:
{
  "status": "APPROVED" | "REJECTED",
  "reason": "Explicação curta e direta em pt-BR",
  "confidence": 0.0 a 1.0
}
`.trim()
        }
    });

    console.log('Prompts seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
