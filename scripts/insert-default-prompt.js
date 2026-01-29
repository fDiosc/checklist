// Script to insert or upsert the default action plan AI prompt
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const slug = 'generate-action-plan-default';

    const existingPrompt = await db.aiPrompt.findUnique({
        where: { slug }
    });

    if (existingPrompt) {
        console.log('Default action plan prompt already exists:', existingPrompt.slug);
        return;
    }

    const prompt = await db.aiPrompt.create({
        data: {
            slug,
            description: 'Prompt padrão para geração de planos de ação baseados em itens rejeitados',
            template: `Você é um especialista agrícola que auxilia produtores rurais a corrigir problemas identificados em auditorias de boas práticas agrícolas.

Analise os seguintes itens que foram rejeitados na auditoria e gere um plano de ação claro e prático para o produtor corrigir cada um:

ITENS REJEITADOS:
{rejectedItems}

Para cada item rejeitado, forneça:
1. Uma explicação clara do problema identificado
2. Passos práticos e específicos para correção
3. Prazo sugerido para implementação
4. Evidências que o produtor deve fornecer para comprovar a correção

Seja objetivo, prático e use linguagem acessível para produtores rurais. Evite termos técnicos desnecessários.

Formate sua resposta de forma clara e organizada, usando marcadores ou numeração quando apropriado.`,
            model: 'gemini-2.5-flash',
            temperature: 0.3
        }
    });

    console.log('Created default action plan prompt:', prompt.slug);
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
