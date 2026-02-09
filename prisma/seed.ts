import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to upsert global prompts (where workspaceId is null)
async function upsertGlobalPrompt(slug: string, data: {
  description?: string;
  model?: string;
  temperature?: number;
  template: string;
}) {
  const existing = await prisma.aiPrompt.findFirst({
    where: { slug, workspaceId: null }
  });

  if (existing) {
    await prisma.aiPrompt.update({
      where: { id: existing.id },
      data: { template: data.template }
    });
  } else {
    await prisma.aiPrompt.create({
      data: {
        slug,
        workspaceId: null,
        description: data.description,
        model: data.model || 'gemini-3-flash-preview',
        temperature: data.temperature || 0.3,
        template: data.template
      }
    });
  }
}

async function main() {
  // Prompt for individual item analysis (with attachment & sanity check support)
  await upsertGlobalPrompt('analyze-checklist-item', {
    description: 'Prompt para análise individual de itens do checklist (com suporte a anexos e sanity check)',
    model: 'gemini-3-flash-preview',
    temperature: 0.1,
    template: `
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
`.trim()
  });

  // Default action plan prompt
  await upsertGlobalPrompt('generate-action-plan-default', {
    description: 'Prompt padrão para geração de planos de ação estruturados',
    model: 'gemini-3-flash-preview',
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
  });

  // Prompt for CORRECTION type - focuses on rejected items
  await upsertGlobalPrompt('generate-action-plan-default-correction', {
    description: 'Prompt para plano de ação focado em itens rejeitados (CORREÇÃO)',
    model: 'gemini-3-flash-preview',
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
  });

  // Prompt for COMPLETION type - focuses on pending items to help level up
  await upsertGlobalPrompt('generate-action-plan-default-completion', {
    description: 'Prompt para plano de ação focado em itens pendentes (COMPLEMENTO/Evolução)',
    model: 'gemini-3-flash-preview',
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
