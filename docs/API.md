# Documentação da API - MerX Platform

> **Versão:** 5.2  
> **Última atualização:** 06 Fevereiro 2026  
> **Base URL:** `/api`

## Índice

1. [Autenticação](#1-autenticação)
2. [Workspaces](#2-workspaces)
3. [Usuários](#3-usuários)
4. [Checklists](#4-checklists)
5. [Templates](#5-templates)
6. [Produtores](#6-produtores)
7. [Respostas](#7-respostas)
8. [IA](#8-ia)
9. [Integrações](#9-integrações)
10. [Planos de Ação](#10-planos-de-ação)
11. [Upload e Storage (S3)](#11-upload-e-storage-s3)
12. [Utilitários](#12-utilitários)

---

## 1. Autenticação

A API utiliza **NextAuth.js v5** para autenticação com Credentials Provider (email/senha).

### Rotas Públicas

As seguintes rotas não requerem autenticação:

```
/api/auth/*          # Rotas NextAuth (login, logout, session)
/api/c/[token]/*     # Operações do produtor no checklist público
/api/portal/*        # Portal do produtor
/api/database-options
/api/integration/*
/api/lookup/*
```

### Rotas Protegidas

Todas as outras rotas requerem autenticação via NextAuth session.

### Roles e Permissões

| Role | Escopo | Acesso |
|------|--------|--------|
| `SUPERADMIN` | Todos workspaces | Acesso total, gerenciamento de workspaces |
| `ADMIN` | Seu workspace | Acesso total no workspace |
| `SUPERVISOR` | Seu workspace | Apenas produtores atribuídos |
| `PRODUCER` | Seu workspace | Apenas próprios recursos |

### Filtro de Workspace

Todas as rotas protegidas aplicam automaticamente o filtro de workspace:
- **SUPERADMIN**: Vê todos os workspaces
- **Outros roles**: Veem apenas dados do seu workspace

---

## 2. Workspaces

### 2.1 Listar Workspaces

```http
GET /api/workspaces
Authorization: SUPERADMIN
```

### 2.2 Criar Workspace

```http
POST /api/workspaces
Authorization: SUPERADMIN
Content-Type: application/json

{
  "name": "Nome da Organização",
  "slug": "slug-unico",
  "logoUrl": "https://..." // opcional
}
```

### 2.3 Atualizar Workspace

```http
PATCH /api/workspaces/[id]
Authorization: SUPERADMIN
```

### 2.4 Subworkspaces

#### Listar Subworkspaces

```http
GET /api/workspaces/[id]/subworkspaces
Authorization: SUPERADMIN ou ADMIN do workspace

Response:
{
  "parentWorkspace": { "id": "...", "name": "...", "hasSubworkspaces": true },
  "subworkspaces": [
    { "id": "...", "name": "...", "slug": "...", "cnpj": "...", "logoUrl": "..." }
  ]
}
```

#### Criar Subworkspace

```http
POST /api/workspaces/[id]/subworkspaces
Authorization: SUPERADMIN ou ADMIN do workspace
Content-Type: application/json

{
  "name": "Nome do Subworkspace",
  "slug": "slug-unico",
  "cnpj": "12.345.678/0001-90",  // opcional
  "logoUrl": "https://..."       // opcional
}
```

#### Ativar/Desativar Subworkspaces

```http
POST /api/workspaces/[id]/toggle-subworkspaces
Authorization: SUPERADMIN
Content-Type: application/json

{
  "enabled": true  // ou false
}
```

**Nota:** Não é possível desativar se existirem subworkspaces. Delete todos primeiro.

---

## 3. Usuários

### 3.1 Listar Usuários

```http
GET /api/users
Authorization: ADMIN ou SUPERADMIN
```

Retorna usuários do workspace do usuário autenticado (ou todos para SUPERADMIN).

### 3.2 Criar Usuário

```http
POST /api/users
Authorization: ADMIN ou SUPERADMIN
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Nome do Usuário",
  "password": "senha-temporaria",
  "role": "SUPERVISOR", // ADMIN, SUPERVISOR, PRODUCER
  "cpf": "12345678900" // opcional
}
```

**Regras:**
- ADMINs podem criar usuários apenas no seu workspace
- Usuários criados têm `mustChangePassword: true`

### 3.3 Alterar Senha

```http
POST /api/users/change-password
Content-Type: application/json

{
  "currentPassword": "senha-atual",
  "newPassword": "nova-senha"
}
```

---

## 4. Checklists

### 4.1 Listar Checklists

```http
GET /api/checklists
```

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | Filtrar por status (SENT, PENDING_REVIEW, etc.) |
| `templateId` | string | Filtrar por template |
| `producer` | string | Busca por nome ou CPF do produtor |
| `dateFrom` | string | Data inicial (ISO 8601) |
| `dateTo` | string | Data final (ISO 8601) |

**Response:**

```json
[
  {
    "id": "clx123...",
    "templateId": "clx456...",
    "producerId": "clx789...",
    "status": "PENDING_REVIEW",
    "type": "ORIGINAL",
    "publicToken": "abc123xyz...",
    "sentAt": "2026-01-15T10:00:00Z",
    "template": {
      "name": "Checklist ESG",
      "folder": "Compliance"
    },
    "producer": {
      "name": "João Silva",
      "cpf": "12345678901",
      "phone": "11999998888"
    },
    "parent": null,
    "children": [
      {
        "id": "clx...",
        "status": "SENT",
        "type": "CORRECTION",
        "createdAt": "2026-01-20T10:00:00Z"
      }
    ],
    "_count": {
      "responses": 15
    }
  }
]
```

### 4.2 Criar Checklist

```http
POST /api/checklists
```

**Request Body:**

```json
{
  "templateId": "clx456...",
  "producerId": "clx789...",
  "subUserId": "clx...",           // opcional
  "sentVia": "whatsapp",           // opcional
  "sentTo": "11999998888"          // opcional
}
```

**Response:**

```json
{
  "checklist": {
    "id": "clx123...",
    "publicToken": "abc123xyz...",
    "status": "SENT",
    "sentAt": "2026-01-15T10:00:00Z"
  },
  "link": "https://app.merx.com/c/abc123xyz..."
}
```

### 4.3 Finalizar Checklist

```http
POST /api/checklists/[id]/finalize
```

Finaliza completamente o checklist. Se for um checklist filho, sincroniza respostas com o pai.

**Validação:** Se o checklist possuir filhos em aberto (não finalizados), retorna erro 400.

**Response (sucesso):**

```json
{
  "id": "clx123...",
  "status": "FINALIZED",
  "finalizedAt": "2026-01-20T15:00:00Z"
}
```

**Response (erro - filhos abertos):**

```json
{
  "error": "Cannot finalize: open child checklists exist",
  "openChildren": [
    { "id": "clx456...", "type": "CORRECTION", "status": "SENT" }
  ]
}
```

### 4.4 Finalização Parcial

```http
POST /api/checklists/[id]/partial-finalize
```

Finaliza parcialmente, criando checklists filhos para itens rejeitados/faltantes.

**Request Body:**

```json
{
  "createCorrection": true,     // Criar checklist de correção
  "createCompletion": true,     // Criar checklist de complemento
  "generateActionPlan": true    // Gerar plano de ação
}
```

**Response:**

```json
{
  "success": true,
  "checklistId": "clx123...",
  "childIds": ["clx456...", "clx789..."],
  "generateActionPlan": true
}
```

### 4.5 Enviar WhatsApp

```http
POST /api/checklists/[id]/send-whatsapp
```

Envia o link do checklist via WhatsApp (Evolution API).

**Request Body:**

```json
{
  "phone": "5511999998888",
  "message": "Mensagem personalizada"  // opcional
}
```

### 4.6 Pré-preenchimento

#### Listar Checklists Disponíveis para Pré-preencher

```http
GET /api/checklists/available-for-prefill?templateId=xxx&producerId=yyy
```

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `templateId` | string | Sim | ID do template |
| `producerId` | string | Não | Filtrar por produtor específico |

**Response:**

```json
[
  {
    "id": "clx123...",
    "finalizedAt": "2026-01-20T15:00:00Z",
    "createdAt": "2026-01-15T10:00:00Z",
    "producer": { "id": "...", "name": "João Silva" },
    "_count": { "responses": 25 }
  }
]
```

#### Criar Checklist com Pré-preenchimento

```http
POST /api/checklists
Content-Type: application/json

{
  "templateId": "clx123...",
  "producerId": "clx456...",
  "sentVia": "whatsapp",
  "sentTo": "5511999998888",
  "prefillFromChecklistId": "clxOriginal..."  // opcional - copia respostas aprovadas
}
```

**Nota:** Respostas copiadas recebem status `PENDING_VERIFICATION` para nova análise.

---

## 5. Templates

### 5.1 Listar Templates

```http
GET /api/templates
```

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | Filtrar por status (ACTIVE, INACTIVE) |

**Response:**

```json
[
  {
    "id": "clx123...",
    "name": "Checklist ESG Completo",
    "folder": "Compliance",
    "status": "ACTIVE",
    "requiresProducerIdentification": true,
    "isContinuous": false,
    "sections": [
      {
        "id": "clx...",
        "name": "Documentação Geral",
        "order": 0,
        "iterateOverFields": false,
        "items": [
          {
            "id": "clx...",
            "name": "Possui licença ambiental?",
            "type": "SINGLE_CHOICE",
            "required": true,
            "options": ["Sim", "Não"]
          }
        ]
      }
    ],
    "_count": {
      "checklists": 45
    }
  }
]
```

### 5.2 Criar Template

```http
POST /api/templates
```

**Request Body:**

```json
{
  "name": "Novo Template",
  "folder": "Categoria",
  "requiresProducerIdentification": true,
  "sections": [
    {
      "name": "Seção 1",
      "iterateOverFields": false,
      "items": [
        {
          "name": "Pergunta 1",
          "type": "TEXT",
          "required": true,
          "validityControl": false,
          "observationEnabled": true
        }
      ]
    }
  ]
}
```

### 5.3 Atualizar Template

```http
PUT /api/templates/[id]
```

### 5.4 Duplicar Template

```http
POST /api/templates/[id]/duplicate
```

Cria uma cópia do template com novo nome.

### 5.5 Atribuição de Templates a Subworkspaces

Templates do workspace pai podem ser compartilhados com subworkspaces específicos.

#### Listar Atribuições

```http
GET /api/templates/[id]/assignments
```

**Response:**

```json
{
  "template": {
    "id": "clx123...",
    "name": "Checklist ESG",
    "workspaceId": "clw456..."
  },
  "parentWorkspace": {
    "id": "clw456...",
    "name": "Empresa Pai",
    "hasSubworkspaces": true
  },
  "availableSubworkspaces": [
    {
      "id": "clw789...",
      "name": "Filial SP",
      "slug": "filial-sp",
      "logoUrl": null
    }
  ],
  "assignments": [
    {
      "id": "cla123...",
      "workspaceId": "clw789...",
      "workspaceName": "Filial SP",
      "workspaceSlug": "filial-sp",
      "assignedAt": "2026-02-05T10:00:00Z"
    }
  ],
  "assignedWorkspaceIds": ["clw789..."]
}
```

#### Atualizar Atribuições

```http
POST /api/templates/[id]/assignments
```

**Request Body:**

```json
{
  "subworkspaceIds": ["clw789...", "clw012..."]
}
```

Substitui todas as atribuições existentes pelas novas.

**Comportamento:**
- Templates atribuídos ficam **somente leitura** nos subworkspaces
- Subworkspaces podem **duplicar** templates atribuídos para ter versão editável
- Checklists já criados não são afetados pela remoção de atribuição

---

## 6. Produtores

### 6.1 Listar Produtores

```http
GET /api/producers
```

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por nome, CPF ou email |
| `scope` | string | `own` (apenas workspace atual), `subworkspaces` (apenas subworkspaces), ou vazio (todos acessíveis) |

**Nota:** O modal de envio de checklist usa `scope=own` para garantir que o workspace pai não envie checklists para produtores de subworkspaces.

**Response:**

```json
[
  {
    "id": "clx123...",
    "name": "João Silva",
    "cpf": "12345678901",
    "email": "joao@email.com",
    "phone": "11999998888",
    "city": "São Paulo",
    "state": "SP",
    "esgStatus": "REGULAR",
    "subUsers": [
      {
        "id": "clx...",
        "name": "Maria Contadora",
        "role": "Contador"
      }
    ],
    "maps": [...],
    "_count": {
      "checklists": 12
    }
  }
]
```

### 6.2 Criar Produtor

```http
POST /api/producers
```

**Request Body:**

```json
{
  "name": "João Silva",
  "cpf": "12345678901",
  "email": "joao@email.com",
  "phone": "11999998888",
  "city": "São Paulo",
  "state": "SP",
  "subUsers": [
    {
      "name": "Maria",
      "cpf": "98765432100",
      "email": "maria@email.com",
      "role": "Contador"
    }
  ]
}
```

### 6.3 Buscar Produtor

```http
GET /api/producers/[id]
```

### 6.4 Atualizar Produtor

```http
PUT /api/producers/[id]
```

---

## 7. Respostas

### 7.1 Salvar Resposta (Público)

```http
POST /api/c/[token]/save
```

Salva resposta parcial sem submeter o checklist.

**Request Body:**

```json
{
  "itemId": "clx123...",
  "fieldId": "__global__",
  "answer": "Sim",
  "quantity": "100",
  "observation": "Observação do produtor",
  "fileUrl": "https://..."
}
```

### 7.2 Submeter Checklist (Público)

```http
POST /api/c/[token]/submit
```

Submete o checklist para revisão.

**Request Body:**

```json
{
  "responses": [
    {
      "itemId": "clx123...",
      "fieldId": "__global__",
      "answer": "Sim",
      "observation": "..."
    }
  ]
}
```

### 7.3 Atualizar Resposta (Supervisor)

```http
PUT /api/checklists/[id]/responses/[itemId]
```

**Request Body:**

```json
{
  "fieldId": "__global__",
  "status": "APPROVED",           // ou "REJECTED"
  "rejectionReason": "Motivo..."  // se rejeitado
}
```

---

## 8. IA

### 8.1 Analisar Resposta

```http
POST /api/ai/analyze
```

Analisa uma resposta usando Google Gemini.

**Request Body:**

```json
{
  "checklistId": "clx123...",
  "itemId": "clx456...",
  "userAnswer": "Sim, possui documentação",
  "userObservation": "Anexado comprovante",
  "itemName": "Possui licença ambiental?",
  "itemDescription": "Verificar validade",
  "fieldId": "__global__"
}
```

**Response:**

```json
{
  "status": "APPROVED",
  "reason": "A documentação está em conformidade...",
  "confidence": 0.95
}
```

### 8.2 Gerar Plano de Ação

```http
POST /api/ai/generate-action-plan
```

Gera plano de ação para itens pendentes/rejeitados.

**Request Body:**

```json
{
  "checklistId": "clx123..."
}
```

**Response:**

```json
{
  "id": "clx789...",
  "title": "Plano de Ação - Checklist ESG",
  "description": "Ações necessárias...",
  "summary": "Resumo executivo...",
  "status": "OPEN",
  "items": [
    {
      "id": "clx...",
      "itemRef": "Licença Ambiental",
      "priority": "ALTA",
      "action": "Providenciar licença...",
      "deadline": 30,
      "documents": ["Licença", "Protocolo"],
      "responsible": "Produtor"
    }
  ]
}
```

### 8.3 Gerar Template

```http
POST /api/ai/generate-template
```

Gera template de checklist baseado em descrição.

**Request Body:**

```json
{
  "description": "Checklist para verificação de compliance ESG",
  "category": "Compliance"
}
```

### 8.4 Validar Documento (IA)

```http
POST /api/ai/validate-document
Content-Type: application/json

{
  "s3Key": "checklist/ws123/sub456/cl789/item1/field1/1707200000000_doc.pdf",
  "itemName": "Licença Ambiental",
  "itemType": "FILE",
  "workspaceId": "ws123"
}
```

Analisa um documento enviado via S3 usando Google Gemini para verificar legibilidade e tipo correto.

**Response:**

```json
{
  "valid": true,
  "legible": true,
  "correctType": true,
  "message": "Document is legible and matches the expected type.",
  "mode": "warn"
}
```

**Nota:** Se a validação IA estiver desabilitada para o workspace, retorna `{ valid: true, bypassed: true }`.

### 8.5 Gerenciar Prompts

```http
GET /api/ai/prompts
PUT /api/ai/prompts
```

Busca e atualiza prompts de IA configuráveis.

---

## 9. Integrações

### 9.1 CAR (Cadastro Ambiental Rural)

```http
GET /api/integration/car?latitude=X&longitude=Y
```

Busca dados do CAR por coordenadas.

**Response:**

```json
[
  {
    "cod_imovel": "SP-1234567-ABC...",
    "nom_imovel": "Fazenda São João",
    "num_area": 150.5,
    "geoJson": {
      "type": "Polygon",
      "coordinates": [...]
    }
  }
]
```

### 9.2 ESG - Produtor

```http
GET /api/integration/esg/producer?cpf=12345678901
```

Verifica status ESG do produtor.

### 9.3 ESG - Propriedade

```http
GET /api/integration/esg/property?carCode=SP-1234567...
```

Verifica status ESG da propriedade.

### 9.4 Configuração ESG por Workspace

#### Buscar Configuração

```http
GET /api/workspaces/[id]/esg-config
Authorization: SUPERADMIN
```

**Response:**

```json
{
  "carApiKey": "abc...",
  "carCooperativeId": "123",
  "esgApiEnabled": true,
  "esgEnabledForSubworkspaces": false
}
```

#### Atualizar Configuração

```http
PUT /api/workspaces/[id]/esg-config
Authorization: SUPERADMIN
Content-Type: application/json

{
  "carApiKey": "new-key",
  "carCooperativeId": "new-id",
  "esgApiEnabled": true,
  "esgEnabledForSubworkspaces": true
}
```

### 9.5 Status ESG do Workspace Atual

```http
GET /api/workspaces/esg-status
```

Retorna se o workspace do usuário atual tem integração ESG habilitada.

**Response:**

```json
{
  "esgEnabled": true,
  "source": "inherited"  // ou "own"
}
```

---

## 10. Planos de Ação

### 10.1 Publicar Plano

```http
POST /api/action-plans/[id]/publish
```

Publica plano de ação para o produtor visualizar.

**Response:**

```json
{
  "id": "clx123...",
  "isPublished": true
}
```

---

## 11. Upload e Storage (S3)

### 11.1 Upload de Arquivo

```http
POST /api/upload
Content-Type: multipart/form-data

Fields:
  file: <binary>
  workspaceId: "ws123"
  checklistId: "cl456"
  itemId: "item789"
  fieldId: "__global__"          // opcional, default "__global__"
  subworkspaceId: "sub123"       // opcional
```

**Response:**

```json
{
  "s3Key": "checklist/ws123/sub123/cl456/item789/__global__/1707200000000_document.pdf",
  "success": true
}
```

**Validações:**
- Tamanho máximo: 10MB
- Tipos aceitos: imagens (jpeg, png, gif, webp), PDFs, documentos comuns

### 11.2 Gerar Presigned URL

```http
GET /api/upload/presigned-url?s3Key=checklist/ws123/...
```

Gera URL temporária (1 hora) para acesso de leitura ao arquivo no S3.

**Response:**

```json
{
  "url": "https://pocs-merxlabs.s3.amazonaws.com/checklist/...?X-Amz-Algorithm=..."
}
```

### 11.3 Configuração de Validação de Documentos por IA

#### Buscar Configuração

```http
GET /api/workspaces/[id]/doc-validation-config
Authorization: SUPERADMIN ou ADMIN
```

**Response:**

```json
{
  "aiDocValidationEnabled": true,
  "aiDocValidationEnabledForSubs": false,
  "aiDocValidationMode": "warn"
}
```

#### Atualizar Configuração

```http
PUT /api/workspaces/[id]/doc-validation-config
Authorization: SUPERADMIN (todos os campos) ou ADMIN (apenas mode)
Content-Type: application/json

{
  "aiDocValidationEnabled": true,
  "aiDocValidationEnabledForSubs": true,
  "aiDocValidationMode": "block"
}
```

**Nota:** ADMINs podem alterar `aiDocValidationEnabled` e `aiDocValidationMode` para seu workspace ou subworkspaces diretos. Apenas SuperAdmin pode alterar `aiDocValidationEnabledForSubs`.

#### UI de Configuração:
- **SuperAdmin:** Modal `AiDocValidationConfigModal` na página Workspaces (`/dashboard/workspaces`)
- **Admin:** Página Settings (`/dashboard/settings`) com toggle on/off, seletor de modo e config por subworkspace

### 11.4 Status Efetivo de Validação de Documentos

```http
GET /api/workspaces/doc-validation-status?workspaceId=ws123
```

Retorna o status efetivo considerando herança do workspace pai.

**Response:**

```json
{
  "enabled": true,
  "mode": "warn"
}
```

---

## 12. Utilitários

### 11.1 Estatísticas do Dashboard

```http
GET /api/dashboard/stats
```

**Response:**

```json
{
  "totalChecklists": 150,
  "pendingReview": 23,
  "approved": 100,
  "rejected": 5,
  "inProgress": 22
}
```

### 11.2 Opções do Banco de Dados

```http
GET /api/database-options?source=fertilizers
```

Busca opções dinâmicas do banco.

**Response:**

```json
[
  {
    "id": "clx...",
    "label": "Ureia",
    "value": "ureia",
    "composition": "N 45%",
    "unit": "kg/ha"
  }
]
```

### 11.3 Lookup EME/Região Rural

```http
GET /api/lookup/eme-rr?munCode=3550308
```

Busca EME e Região Rural por código do município.

**Response:**

```json
{
  "eme": {
    "uf": "SP",
    "codigo": 35,
    "eme": "CETESB"
  },
  "ruralRegion": {
    "municipality": "São Paulo",
    "rrCode": 3515
  }
}
```

### 11.4 Informações do Usuário

```http
GET /api/me
```

Retorna dados do usuário autenticado.

### 11.5 Onboarding

```http
POST /api/users/onboarding
```

Completa o processo de onboarding do usuário.

### 11.6 Listar Supervisores

```http
GET /api/users/supervisors
```

Lista supervisores para atribuição a produtores.

### 11.7 Checklists do Portal

```http
GET /api/portal/checklists
```

Lista checklists para o portal do produtor.

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro interno |

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica
- [DATABASE.md](./DATABASE.md) - Modelo de dados
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integrações externas
