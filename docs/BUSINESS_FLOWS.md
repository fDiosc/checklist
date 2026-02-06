# Fluxos de Negócio - MerX Platform

> **Versão:** 5.0  
> **Última atualização:** 06 Fevereiro 2026

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Ciclo de Vida do Checklist](#2-ciclo-de-vida-do-checklist)
3. [Fluxo de Preenchimento](#3-fluxo-de-preenchimento)
4. [Fluxo de Auditoria](#4-fluxo-de-auditoria)
5. [Hierarquia de Checklists](#5-hierarquia-de-checklists)
6. [Sincronização "AS IS"](#6-sincronização-as-is)
7. [Geração de Planos de Ação](#7-geração-de-planos-de-ação)
8. [Integração com Dados Geoespaciais](#8-integração-com-dados-geoespaciais)

---

## 1. Visão Geral do Sistema

O MerX Platform é um sistema de **compliance documental para o agronegócio**. O fluxo principal envolve:

1. **Supervisor** cria e envia checklist para produtor
2. **Produtor** preenche via link público (sem login)
3. **Supervisor** revisa respostas com auxílio de IA
4. **Sistema** gera planos de ação para correções
5. **Ciclos de correção** até aprovação total

### Atores do Sistema

| Ator | Descrição | Escopo | Acesso |
|------|-----------|--------|--------|
| **SuperAdmin** | Administrador global | Todos workspaces | Gerenciamento de workspaces, usuários globais |
| **Admin** | Administrador de workspace | Seu workspace | Dashboard completo, todos os produtores do workspace |
| **Supervisor** | Supervisor de campo | Seu workspace | Apenas produtores atribuídos |
| **Produtor** | Produtor rural | Seu workspace | Via link público, sem login |

---

## 2. Ciclo de Vida do Checklist

### Estados do Checklist

```
    ┌─────────┐
    │  DRAFT  │ (não utilizado atualmente)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  SENT   │ ◀─────────────────────────────────────┐
    └────┬────┘                                       │
         │                                            │
         ▼                                            │
┌─────────────────┐                                   │
│  IN_PROGRESS    │ (produtor está preenchendo)       │
└────────┬────────┘                                   │
         │                                            │
         ▼                                            │
┌─────────────────┐                                   │
│ PENDING_REVIEW  │ (aguardando supervisão)           │
└────────┬────────┘                                   │
         │                                            │
         ├───────────────────┬────────────────────────┤
         │                   │                        │
         ▼                   ▼                        │
┌─────────────────┐  ┌───────────────────┐            │
│    APPROVED     │  │ PARTIALLY_FINALIZED│────────────┘
└─────────────────┘  └────────┬──────────┘  (gera checklist filho)
                              │
                              ▼
                     ┌─────────────────┐
                     │   FINALIZED     │
                     └─────────────────┘
```

### Descrição dos Estados

| Estado | Descrição |
|--------|-----------|
| `DRAFT` | Checklist criado mas não enviado |
| `SENT` | Checklist enviado ao produtor |
| `IN_PROGRESS` | Produtor iniciou o preenchimento |
| `PENDING_REVIEW` | Produtor submeteu, aguardando revisão |
| `APPROVED` | Todos os itens aprovados |
| `PARTIALLY_FINALIZED` | Revisado com itens rejeitados/faltantes |
| `FINALIZED` | Processo completo |

---

## 3. Fluxo de Preenchimento

### 3.1 Envio do Checklist

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Supervisor  │────▶│  Seleciona   │────▶│  Seleciona   │
│              │     │   Template   │     │   Produtor   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐     ┌──────────────┐
              │  Gera Token  │────▶│  Envia Link  │
              │   Público    │     │  (WhatsApp)  │
              └──────────────┘     └──────────────┘
```

**Endpoints envolvidos:**
- `POST /api/checklists` - Cria checklist
- `POST /api/checklists/[id]/send-whatsapp` - Envia via WhatsApp

### 3.2 Preenchimento pelo Produtor

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Produtor   │────▶│ Acessa link │────▶│  Preenche   │
│  recebe     │     │  /c/[token] │     │   campos    │
│  WhatsApp   │     └─────────────┘     └──────┬──────┘
└─────────────┘                                │
                                               │
                    ┌──────────────────────────┘
                    │
                    ▼
             ┌─────────────┐     ┌─────────────┐
             │  Auto-save  │────▶│  Submissão  │
             │  parcial    │     │   final     │
             └─────────────┘     └─────────────┘
```

**Endpoints envolvidos:**
- `GET /c/[token]` - Página pública
- `POST /api/c/[token]/save` - Salvar resposta parcial
- `POST /api/c/[token]/submit` - Submissão final

### 3.3 Tipos de Campos

| Tipo | Descrição | Exemplo de Uso |
|------|-----------|----------------|
| `FILE` | Upload de documento | Nota fiscal, laudo |
| `TEXT` | Texto curto | Nome, código |
| `LONG_TEXT` | Texto longo | Observações |
| `SINGLE_CHOICE` | Seleção única | Sim/Não |
| `MULTIPLE_CHOICE` | Seleção múltipla | Práticas adotadas |
| `DATE` | Data | Validade |
| `PROPERTY_MAP` | Mapa da propriedade | Geolocalização |
| `FIELD_SELECTOR` | Seletor de talhão | Área específica |
| `DROPDOWN_SELECT` | Dropdown com opções do banco | Fertilizantes |

---

## 4. Fluxo de Auditoria

### 4.1 Revisão pelo Supervisor

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Supervisor  │────▶│  Acessa      │────▶│  Revisa cada │
│  acessa      │     │  dashboard   │     │    item      │
│  dashboard   │     │  /checklists │     └──────┬───────┘
└──────────────┘     └──────────────┘            │
                                                  │
                     ┌────────────────────────────┤
                     │                            │
                     ▼                            ▼
              ┌──────────────┐            ┌──────────────┐
              │   Aprova     │            │   Rejeita    │
              │    item      │            │    item      │
              │              │            │  (+ motivo)  │
              └──────────────┘            └──────────────┘
```

### 4.2 Análise por IA

Para cada item, o supervisor pode solicitar análise automática:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Resposta   │────▶│  Google      │────▶│  Resultado:  │
│   do item    │     │  Gemini      │     │  - APPROVED  │
│              │     │              │     │  - REJECTED  │
└──────────────┘     └──────────────┘     │  + confiança │
                                          │  + justific. │
                                          └──────────────┘
```

**Endpoint:** `POST /api/ai/analyze`

**Payload:**
```json
{
  "checklistId": "clx...",
  "itemId": "clx...",
  "userAnswer": "Sim, possui documentação",
  "userObservation": "Anexado comprovante",
  "itemName": "Possui licença ambiental?",
  "fieldId": "__global__"
}
```

### 4.3 Estados das Respostas

| Status | Cor | Descrição |
|--------|-----|-----------|
| `MISSING` | Cinza | Não respondido |
| `PENDING_VERIFICATION` | Amarelo | Respondido, aguardando revisão |
| `APPROVED` | Verde | Aprovado |
| `REJECTED` | Vermelho | Rejeitado (precisa correção) |

---

## 5. Hierarquia de Checklists

### 5.1 Tipos de Checklist

| Tipo | Descrição | Quando é criado |
|------|-----------|-----------------|
| `ORIGINAL` | Checklist inicial | Criado pelo supervisor |
| `CORRECTION` | Checklist de correção | Itens **rejeitados** do pai |
| `COMPLETION` | Checklist de complemento | Itens **faltantes** do pai |

### 5.2 Fluxo de Correção

```
┌────────────────────────────────────────────────────────────────┐
│                    CHECKLIST ORIGINAL                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │  ✓  │ │  ✓  │ │  ✗  │ │  ✓  │ │  -  │ │  ✓  │ │  ✗  │      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
└────────────────────────┬────────────────────┬──────────────────┘
                         │                    │
            ┌────────────┘                    └────────────┐
            │                                              │
            ▼                                              ▼
┌────────────────────────────┐            ┌────────────────────────────┐
│    CHECKLIST CORRECTION    │            │    CHECKLIST COMPLETION    │
│  (Itens rejeitados: 2)     │            │  (Itens faltantes: 1)      │
│  ┌─────┐ ┌─────┐           │            │  ┌─────┐                   │
│  │  ?  │ │  ?  │           │            │  │  ?  │                   │
│  └─────┘ └─────┘           │            │  └─────┘                   │
└────────────────────────────┘            └────────────────────────────┘

Legenda: ✓ Aprovado  ✗ Rejeitado  - Faltante  ? Pendente
```

### 5.3 Criação de Checklists Filhos

**Endpoint:** `POST /api/checklists/[id]/partial-finalize`

**Payload:**
```json
{
  "createCorrection": true,    // Cria checklist de correção
  "createCompletion": true,    // Cria checklist de complemento
  "generateActionPlan": true   // Gera plano de ação
}
```

---

## 6. Sincronização "AS IS"

### 6.1 Conceito

Quando um checklist filho (CORRECTION ou COMPLETION) é finalizado, suas respostas são sincronizadas de volta ao pai, **mantendo o estado exato** (approved ou rejected).

### 6.2 Algoritmo de Merge

```typescript
// lib/services/sync.service.ts

export async function syncResponsesToParent(
  parentId: string,
  responses: ResponseToSync[]
): Promise<void> {
  // 1. Filtra apenas APPROVED ou REJECTED
  const responsesToSync = responses.filter(
    r => r.status === 'APPROVED' || r.status === 'REJECTED'
  );

  // 2. Para cada resposta, faz upsert no pai
  for (const resp of responsesToSync) {
    await db.response.upsert({
      where: {
        checklistId_itemId_fieldId: {
          checklistId: parentId,
          itemId: resp.itemId,
          fieldId: resp.fieldId
        }
      },
      update: {
        status: resp.status,
        answer: resp.answer,
        observation: resp.observation,
        fileUrl: resp.fileUrl,
        quantity: resp.quantity,
        validity: resp.validity,
        rejectionReason: resp.rejectionReason,
        reviewedAt: resp.reviewedAt || new Date()
      },
      create: { /* mesmos campos */ }
    });
  }
}
```

### 6.3 Fluxo de Sincronização

```
┌────────────────────┐
│  Checklist Filho   │
│  (CORRECTION)      │
│  ┌────┐ ┌────┐     │
│  │ ✓  │ │ ✗  │     │
│  └────┘ └────┘     │
└─────────┬──────────┘
          │
          │ finalize()
          ▼
┌────────────────────┐     ┌────────────────────┐
│  syncResponses     │────▶│   Checklist Pai    │
│  ToParent()        │     │  ┌────┐ ┌────┐     │
└────────────────────┘     │  │ ✓  │ │ ✗  │     │
                           │  └────┘ └────┘     │
                           │  (estado atualizado)│
                           └────────────────────┘
```

---

## 7. Geração de Planos de Ação

### 7.1 Quando é Gerado

O plano de ação é gerado automaticamente após a finalização parcial, quando:
- Existem itens rejeitados
- Ou existem itens faltantes/pendentes

### 7.2 Estrutura do Plano

```json
{
  "title": "Plano de Ação - Checklist ESG",
  "summary": "Resumo das correções necessárias",
  "actions": [
    {
      "itemRef": "Licença Ambiental",
      "priority": "ALTA",
      "action": "Providenciar licença ambiental válida junto ao IBAMA",
      "deadline": 30,
      "documents": ["Licença ambiental", "Protocolo de renovação"],
      "responsible": "Produtor"
    }
  ]
}
```

### 7.3 Fluxo de Geração

```
┌────────────────────┐
│  Itens Rejeitados/ │
│  Faltantes         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐     ┌────────────────────┐
│   Google Gemini    │────▶│   ActionPlan       │
│   (Prompt config.) │     │   + ActionItems    │
└────────────────────┘     └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │  Publicar para     │
                           │  produtor ver      │
                           └────────────────────┘
```

### 7.4 Prompts Configuráveis

O sistema suporta prompts diferentes por tipo de checklist:

| Template Field | Uso |
|----------------|-----|
| `actionPlanPromptId` | Prompt padrão para ORIGINAL |
| `correctionActionPlanPromptId` | Prompt para CORRECTION |
| `completionActionPlanPromptId` | Prompt para COMPLETION |

**Endpoint:** `POST /api/ai/generate-action-plan`

---

## 8. Integração com Dados Geoespaciais

### 8.1 Cadastro Ambiental Rural (CAR)

Integração com API externa para buscar dados do CAR por coordenadas.

```
┌────────────────────┐     ┌────────────────────┐
│  Coordenadas       │────▶│  API CAR           │
│  (lat, lng)        │     │  (merx.tech)       │
└────────────────────┘     └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │  Dados retornados: │
                           │  - Código CAR      │
                           │  - Geometria       │
                           │  - Área            │
                           │  - Status          │
                           └────────────────────┘
```

**Endpoint:** `GET /api/integration/car?latitude=X&longitude=Y`

### 8.2 Verificação ESG

Consulta status ESG de produtores e propriedades.

**Endpoints:**
- `GET /api/integration/esg/producer?cpf=XXX`
- `GET /api/integration/esg/property?carCode=XXX`

### 8.3 Lookup de Regiões

- `GET /api/lookup/eme-rr?munCode=XXX` - Busca EME e Região Rural por município

---

## Resumo dos Fluxos Principais

| Fluxo | Atores | Resultado |
|-------|--------|-----------|
| Envio de Checklist | Supervisor → Produtor | Link público gerado |
| Preenchimento | Produtor | Respostas salvas |
| Upload de Documentos | Produtor | Arquivo no S3 + validação IA |
| Auditoria | Supervisor + IA | Items aprovados/rejeitados |
| Preenchimento Interno | Supervisor | Resposta type-aware preenchida |
| Finalização | Supervisor | Bloqueada se filhos abertos |
| Finalização Parcial | Supervisor | Checklists filhos criados |
| Correção | Produtor | Itens corrigidos |
| Sincronização | Sistema | Pai atualizado |
| Plano de Ação | IA | Guia de correções |
| Gestão de Subworkspaces | Admin | Subworkspaces e usuários gerenciados |

---

## 9. Upload e Validação de Documentos

### 9.1 Fluxo de Upload (Produtor)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Produtor    │────▶│  Upload via  │────▶│  AWS S3      │
│  seleciona   │     │  /api/upload │     │  pocs-merxlabs│
│  arquivo     │     └──────────────┘     └──────┬───────┘
└──────────────┘                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  Validação   │
                                         │  Gemini IA   │
                                         └──────┬───────┘
                                                 │
                              ┌──────────────────┤
                              │                  │
                              ▼                  ▼
                     ┌──────────────┐    ┌──────────────┐
                     │ Mode: WARN   │    │ Mode: BLOCK  │
                     │ Banner aviso │    │ Impede envio │
                     └──────────────┘    └──────────────┘
```

### 9.2 Visualização pelo Supervisor

O supervisor pode visualizar documentos e fotos diretamente do checklist usando o `DocumentViewerModal`:
- Botão "Expandir" para imagens (com zoom 25%-300%)
- Botão "Visualizar Documento" para PDFs e outros formatos
- S3 keys são resolvidas automaticamente em presigned URLs

### 9.3 Preenchimento Interno Type-Aware

Ao usar "Preencher Internamente", o formulário se adapta ao tipo do item:
- **Escolha Única / Múltipla / Dropdown:** Exibe as opções do template
- **Data:** Date picker
- **Arquivo:** Upload direto ao S3
- **Texto / Número:** Input adequado
- **Quantidade / Observação:** Campos adicionais quando habilitados

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica
- [DATABASE.md](./DATABASE.md) - Modelo de dados
- [API.md](./API.md) - Documentação de endpoints
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integrações externas
