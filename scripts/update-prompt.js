const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Update the "Plano de Ação" prompt with correct template
    const result = await prisma.aiPrompt.update({
        where: { id: 'cmkvlauws0000r0qmv3x207tc' },
        data: {
            template: `
Você é um consultor especialista em compliance e regularização rural.
Analise os itens pendentes/rejeitados do checklist "{{checklistName}}" do produtor "{{producerName}}" e crie um plano de ação estruturado.

Itens para análise:
{{items}}

Para cada item, crie uma ação específica considerando:
- Prioridade baseada na importância do item
- Prazos realistas para resolução
- Documentos ou evidências necessárias
- Quem deve ser responsável pela ação

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Ação - {{producerName}}",
  "summary": "Resumo do plano em 2-3 frases.",
  "actions": [
    {
      "itemRef": "Nome do item",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Descrição detalhada da ação necessária",
      "deadline": 30,
      "documents": ["Documentos ou evidências necessárias"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim(),
            description: 'Prompt atualizado para geração de planos de ação estruturados',
            model: 'gemini-2.5-flash',
            temperature: 0.3
        }
    });

    console.log('Updated prompt:', result.slug);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
