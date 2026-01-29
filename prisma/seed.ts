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

  await prisma.aiPrompt.upsert({
    where: { slug: 'generate-action-plan-default' },
    update: {
      template: `
Você é um consultor especialista em regularização socioambiental rural.
Com base nos itens REJEITADOS no checklist "{{checklistName}}" do produtor "{{producerName}}", gere um plano de ação estruturado.

Itens Rejeitados:
{{rejectedItems}}

Para cada item rejeitado, crie uma ação corretiva específica considerando:
- Prioridade baseada na gravidade da não-conformidade
- Prazos realistas para regularização
- Documentos ou evidências necessárias
- Quem deve ser responsável pela ação

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Ação - [Nome do Produtor]",
  "summary": "Resumo executivo do plano em 2-3 frases.",
  "actions": [
    {
      "itemRef": "Nome do item rejeitado",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Descrição detalhada da ação corretiva necessária",
      "deadline": 30,
      "documents": ["Lista de documentos ou evidências necessárias"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim()
    },
    create: {
      slug: 'generate-action-plan-default',
      description: 'Prompt padrão para geração de planos de ação estruturados',
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      template: `
Você é um consultor especialista em regularização socioambiental rural.
Com base nos itens REJEITADOS no checklist "{{checklistName}}" do produtor "{{producerName}}", gere um plano de ação estruturado.

Itens Rejeitados:
{{rejectedItems}}

Para cada item rejeitado, crie uma ação corretiva específica considerando:
- Prioridade baseada na gravidade da não-conformidade
- Prazos realistas para regularização
- Documentos ou evidências necessárias
- Quem deve ser responsável pela ação

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Ação - [Nome do Produtor]",
  "summary": "Resumo executivo do plano em 2-3 frases.",
  "actions": [
    {
      "itemRef": "Nome do item rejeitado",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Descrição detalhada da ação corretiva necessária",
      "deadline": 30,
      "documents": ["Lista de documentos ou evidências necessárias"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim()
    }
  });

  // Prompt for CORRECTION type - focuses on rejected items
  await prisma.aiPrompt.upsert({
    where: { slug: 'generate-action-plan-default-correction' },
    update: {
      template: `
Você é um consultor especialista em regularização socioambiental rural.
O produtor "{{producerName}}" teve itens REJEITADOS no checklist "{{checklistName}}".

Itens Rejeitados:
{{rejectedItems}}

Analise cada item rejeitado e crie um plano de CORREÇÃO com ações específicas para resolver cada não-conformidade.

Para cada item, considere:
- Gravidade da não-conformidade (ALTA para riscos legais/ambientais, MEDIA para processos, BAIXA para documentação)
- Prazos realistas baseados na complexidade
- Documentos ou evidências que comprovem a correção
- Responsável mais adequado para a ação

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Correção - {{producerName}}",
  "summary": "Resumo das correções necessárias em 2-3 frases.",
  "actions": [
    {
      "itemRef": "Nome do item rejeitado",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Descrição detalhada da ação corretiva",
      "deadline": 30,
      "documents": ["Documentos necessários para comprovar a correção"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim()
    },
    create: {
      slug: 'generate-action-plan-default-correction',
      description: 'Prompt para plano de ação focado em itens rejeitados (CORREÇÃO)',
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      template: `
Você é um consultor especialista em regularização socioambiental rural.
O produtor "{{producerName}}" teve itens REJEITADOS no checklist "{{checklistName}}".

Itens Rejeitados:
{{rejectedItems}}

Analise cada item rejeitado e crie um plano de CORREÇÃO com ações específicas para resolver cada não-conformidade.

Para cada item, considere:
- Gravidade da não-conformidade (ALTA para riscos legais/ambientais, MEDIA para processos, BAIXA para documentação)
- Prazos realistas baseados na complexidade
- Documentos ou evidências que comprovem a correção
- Responsável mais adequado para a ação

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Correção - {{producerName}}",
  "summary": "Resumo das correções necessárias em 2-3 frases.",
  "actions": [
    {
      "itemRef": "Nome do item rejeitado",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Descrição detalhada da ação corretiva",
      "deadline": 30,
      "documents": ["Documentos necessários para comprovar a correção"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim()
    }
  });

  // Prompt for COMPLETION type - focuses on pending items to help level up
  await prisma.aiPrompt.upsert({
    where: { slug: 'generate-action-plan-default-completion' },
    update: {
      template: `
Você é um consultor especialista em certificações e níveis de conformidade rural.
O produtor "{{producerName}}" está preenchendo o checklist "{{checklistName}}" e precisa avançar de nível.

Itens Pendentes ou Não Aprovados:
{{pendingItems}}

Sua tarefa é criar um plano de COMPLEMENTO estratégico que ajude o produtor a:
1. Identificar os itens MAIS FÁCEIS de resolver primeiro (quick wins)
2. Priorizar itens que dão mais pontos ou desbloqueiam outros benefícios
3. Sugerir a ordem mais eficiente para completar os itens

Para cada item, considere:
- Facilidade de implementação (ALTA = fácil de fazer, BAIXA = complexo)
- Impacto na pontuação/nível do produtor
- Dependências entre itens
- Recursos já disponíveis vs. necessários

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Evolução - {{producerName}}",
  "summary": "Estratégia para avançar de nível em 2-3 frases, começando pelos itens mais fáceis.",
  "actions": [
    {
      "itemRef": "Nome do item pendente",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Como resolver este item da forma mais simples possível",
      "deadline": 15,
      "documents": ["O que será necessário providenciar"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
}
`.trim()
    },
    create: {
      slug: 'generate-action-plan-default-completion',
      description: 'Prompt para plano de ação focado em itens pendentes (COMPLEMENTO/Evolução)',
      model: 'gemini-2.5-flash',
      temperature: 0.4,
      template: `
Você é um consultor especialista em certificações e níveis de conformidade rural.
O produtor "{{producerName}}" está preenchendo o checklist "{{checklistName}}" e precisa avançar de nível.

Itens Pendentes ou Não Aprovados:
{{pendingItems}}

Sua tarefa é criar um plano de COMPLEMENTO estratégico que ajude o produtor a:
1. Identificar os itens MAIS FÁCEIS de resolver primeiro (quick wins)
2. Priorizar itens que dão mais pontos ou desbloqueiam outros benefícios
3. Sugerir a ordem mais eficiente para completar os itens

Para cada item, considere:
- Facilidade de implementação (ALTA = fácil de fazer, BAIXA = complexo)
- Impacto na pontuação/nível do produtor
- Dependências entre itens
- Recursos já disponíveis vs. necessários

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "Plano de Evolução - {{producerName}}",
  "summary": "Estratégia para avançar de nível em 2-3 frases, começando pelos itens mais fáceis.",
  "actions": [
    {
      "itemRef": "Nome do item pendente",
      "priority": "ALTA" | "MEDIA" | "BAIXA",
      "action": "Como resolver este item da forma mais simples possível",
      "deadline": 15,
      "documents": ["O que será necessário providenciar"],
      "responsible": "Produtor" | "Técnico" | "Empresa"
    }
  ]
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
