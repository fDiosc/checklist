# Modelo de Dados - MerX Platform

> **Versão:** 6.0  
> **Última atualização:** 07 Fevereiro 2026  
> **ORM:** Prisma 5.22.0  
> **Banco:** PostgreSQL (Neon.db)

## Índice

1. [Diagrama ER](#1-diagrama-er)
2. [Entidades Principais](#2-entidades-principais)
3. [Enums](#3-enums)
4. [Relacionamentos](#4-relacionamentos)
5. [Índices](#5-índices)

---

## 1. Diagrama ER

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │    Producer     │       │    Template     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │       │ id (PK)         │
│ email           │  │    │ name            │       │ name            │
│ name            │  │    │ cpf (UK)        │       │ folder          │
│ cpf             │  │    │ email           │       │ status          │
│ role            │  │    │ phone           │       │ isContinuous    │
└────────┬────────┘  │    │ city, state     │       │ createdById(FK) │
         │           │    │ esgStatus       │       └────────┬────────┘
         │           │    │ esgData         │                │
         │           │    └────────┬────────┘                │
         │           │             │                         │
         │           └─────────────┼─────────────────────────┘
         │                         │                         │
         │    ┌────────────────────┼─────────────────────────┤
         │    │                    │                         │
         ▼    ▼                    ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Checklist     │       │    SubUser      │       │    Section      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ templateId (FK) │       │ producerId (FK) │       │ templateId (FK) │
│ producerId (FK) │       │ name            │       │ name            │
│ subUserId (FK)  │       │ cpf             │       │ order           │
│ status          │       │ email           │       │ iterateOverFields│
│ type            │       └─────────────────┘       └────────┬────────┘
│ publicToken(UK) │                                          │
│ parentId (FK)   │──┐                                       │
└────────┬────────┘  │                                       ▼
         │           │                              ┌─────────────────┐
         │           └──────────────────────────┐   │      Item       │
         │                                      │   ├─────────────────┤
         ▼                                      │   │ id (PK)         │
┌─────────────────┐                             │   │ sectionId (FK)  │
│    Response     │                             │   │ name            │
├─────────────────┤                             │   │ type            │
│ id (PK)         │                             │   │ order           │
│ checklistId(FK) │                             │   │ required        │
│ itemId (FK)     │                             │   │ options[]       │
│ fieldId         │                             │   │ databaseSource  │
│ status          │                             │   └─────────────────┘
│ answer          │                             │
│ fileUrl         │                             │
│ aiFlag          │                             │
└─────────────────┘                             │
                                                │
┌─────────────────┐       ┌─────────────────┐   │
│   ActionPlan    │       │   ActionItem    │   │
├─────────────────┤       ├─────────────────┤   │
│ id (PK)         │──────▶│ id (PK)         │   │
│ checklistId(FK) │       │ actionPlanId(FK)│   │
│ title           │       │ priority        │   │
│ description     │       │ action          │   │
│ status          │       │ deadline        │   │
│ isPublished     │       │ documents[]     │   │
└─────────────────┘       └─────────────────┘   │
                                                │
┌─────────────────┐       ┌─────────────────┐   │
│  PropertyMap    │       │    AuditLog     │◀──┘
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ producerId (FK) │       │ checklistId(FK) │
│ propertyLocation│       │ userId (FK)     │
│ carCode         │       │ action          │
│ carData         │       │ details         │
│ fields (JSON)   │       └─────────────────┘
│ city, state     │
│ emeCode         │
│ ruralRegionCode │
└─────────────────┘

── Level-Based Entities (Templates level-based) ──

┌─────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│  TemplateLevel  │    │TemplateClassification │    │   ScopeField    │
├─────────────────┤    ├───────────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)               │    │ id (PK)         │
│ templateId (FK) │    │ templateId (FK)        │    │ templateId (FK) │
│ name            │    │ name, code            │    │ label, type     │
│ order           │    │ requiredPercentage    │    │ options, order  │
└─────────────────┘    └───────────────────────┘    └─────────────────┘
        │                        │                          │
        ▼                        ▼                          ▼
  Section.levelId          Item.classifId            ItemCondition
  Checklist.targetLevelId                            ScopeAnswer
  Checklist.achievedLevelId
```

---

## 2. Entidades Principais

### 2.0 Workspace (Organizações Multi-tenant)

Organizações isoladas no sistema para multi-tenancy. Suporta hierarquia de subworkspaces.

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   // Único para workspaces root ou combinado parent+slug
  cnpj      String?
  logoUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Hierarquia de Subworkspaces
  parentWorkspaceId String?
  parentWorkspace   Workspace?  @relation("SubworkspaceHierarchy", fields: [parentWorkspaceId], references: [id])
  subworkspaces     Workspace[] @relation("SubworkspaceHierarchy")
  hasSubworkspaces  Boolean     @default(false)

  // Integração ESG/CAR
  carApiKey                  String?   @map("car_api_key")
  carCooperativeId           String?   @map("car_cooperative_id")
  esgApiEnabled              Boolean   @default(false) @map("esg_api_enabled")
  esgEnabledForSubworkspaces Boolean   @default(false) @map("esg_enabled_for_subworkspaces")

  // Validação de Documentos por IA
  aiDocValidationEnabled         Boolean  @default(false) @map("ai_doc_validation_enabled")
  aiDocValidationEnabledForSubs  Boolean  @default(false) @map("ai_doc_validation_enabled_for_subs")
  aiDocValidationMode            String   @default("warn") @map("ai_doc_validation_mode")

  users      User[]
  producers  Producer[]
  templates  Template[]
  checklists Checklist[]
  auditLogs  AuditLog[]
  aiPrompts  AiPrompt[]
  templateAssignments TemplateAssignment[]
}
```

**Campos de Subworkspaces:**
- `parentWorkspaceId`: ID do workspace pai (null para workspaces root)
- `hasSubworkspaces`: Flag que habilita funcionalidade de subworkspaces
- `cnpj`: CNPJ do subworkspace

**Campos de Integração ESG:**
- `carApiKey`: Token da API CAR
- `carCooperativeId`: ID da Cooperativa
- `esgApiEnabled`: Habilita integração ESG para o workspace
- `esgEnabledForSubworkspaces`: Permite subworkspaces usarem a integração do pai

**Campos de Validação de Documentos por IA:**
- `aiDocValidationEnabled`: Habilita validação automática de documentos via Gemini
- `aiDocValidationEnabledForSubs`: Permite subworkspaces herdarem a configuração
- `aiDocValidationMode`: Modo de comportamento (`warn` = apenas avisa, `block` = impede envio)

### 2.1 User (Usuários)

Usuários autenticados via NextAuth (email/senha).

```prisma
model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  name               String?
  cpf                String?
  passwordHash       String
  role               UserRole  @default(SUPERVISOR)
  mustChangePassword Boolean   @default(true)
  workspaceId        String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  workspace         Workspace? @relation(fields: [workspaceId], references: [id])
  templatesCreated  Template[]
  checklistsCreated Checklist[]
  auditLogs         AuditLog[]
  internalResponses Response[]    @relation("InternalResponses")
  assignedProducers Producer[]    @relation("SupervisorProducers")

  @@unique([cpf, workspaceId])  // CPF único por workspace
}
```

### 2.2 Producer (Produtores)

Produtores rurais cadastrados no sistema, com suporte a múltiplos países.

```prisma
model Producer {
  id          String   @id @default(cuid())
  name        String
  cpf         String?              // Legacy, mantido para BR
  email       String?
  phone       String?
  city        String?
  state       String?
  country     String   @default("BR")  // BR, AR, US
  workspaceId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ESG Data (apenas BR)
  esgStatus    String?
  esgData      Json?
  esgLastCheck DateTime?

  // Relations
  workspace            Workspace?           @relation(fields: [workspaceId], references: [id])
  subUsers             SubUser[]
  checklists           Checklist[]
  maps                 PropertyMap[]
  assignedSupervisors  User[]               @relation("SupervisorProducers")
  identifiers          ProducerIdentifier[]   // Documentos flexíveis
  agriculturalRegistries AgriculturalRegistry[]  // Registros agrícolas

  @@unique([cpf, workspaceId])  // CPF único por workspace
}

model ProducerIdentifier {
  id         String  @id @default(cuid())
  producerId String
  type       String  // CPF, DNI, CUIT, SSN, TIN, EIN
  value      String
  isPrimary  Boolean @default(false)

  producer Producer @relation(fields: [producerId], references: [id], onDelete: Cascade)

  @@unique([producerId, type])
}

model AgriculturalRegistry {
  id           String  @id @default(cuid())
  producerId   String
  registryType String  // CAR (BR), RENSPA (AR), FSA (US)
  registryNumber String
  isActive     Boolean @default(true)

  producer Producer @relation(fields: [producerId], references: [id], onDelete: Cascade)

  @@unique([producerId, registryType])
}
```

### 2.3 Template (Templates de Checklist)

Modelos de checklist reutilizáveis. Suporta templates baseados em nível com classificações e perguntas de escopo.

```prisma
model Template {
  id                              String         @id @default(cuid())
  name                            String
  folder                          String
  status                          TemplateStatus @default(ACTIVE)
  requiresProducerIdentification  Boolean        @default(false)
  isContinuous                    Boolean        @default(false)
  
  // Level-based checklist fields
  isLevelBased                    Boolean        @default(false)
  levelAccumulative               Boolean        @default(false)
  
  // AI Prompts
  actionPlanPromptId              String?
  correctionActionPlanPromptId    String?
  completionActionPlanPromptId    String?
  
  createdById                     String
  createdAt                       DateTime       @default(now())
  updatedAt                       DateTime       @updatedAt

  createdBy       User                    @relation(fields: [createdById], references: [id])
  sections        Section[]
  checklists      Checklist[]
  levels          TemplateLevel[]
  classifications TemplateClassification[]
  scopeFields     ScopeField[]
}
```

**Campos de Nível:**
- `isLevelBased`: Se `true`, o template usa o sistema de níveis com classificações e escopo.
- `levelAccumulative`: Se `true`, cada nível inclui os itens de todos os níveis anteriores. Se `false`, cada nível é independente.

### 2.3.1 TemplateLevel (Níveis do Template)

Níveis hierárquicos dentro de um template level-based.

```prisma
model TemplateLevel {
  id         String @id @default(cuid())
  templateId String @map("template_id")
  name       String
  order      Int

  template   Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  sections   Section[]
  targetChecklists  Checklist[] @relation("TargetLevel")
  achievedChecklists Checklist[] @relation("AchievedLevel")
  blockedItems Item[] @relation("BlocksAdvancementToLevel")

  @@index([templateId])
  @@map("template_levels")
}
```

### 2.3.2 TemplateClassification (Classificações de Itens)

Classificações que determinam o peso de cada item na avaliação de nível (ex: Essencial, Importante, Aspiracional).

```prisma
model TemplateClassification {
  id                 String @id @default(cuid())
  templateId         String @map("template_id")
  name               String
  code               String   // Ex: "E", "I", "A"
  requiredPercentage Float    // Ex: 100, 80, 50
  order              Int

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  items    Item[]

  @@index([templateId])
  @@map("template_classifications")
}
```

### 2.3.3 ScopeField (Perguntas de Escopo)

Campos dinâmicos respondidos antes do checklist para determinar quais itens se aplicam.

```prisma
model ScopeField {
  id         String @id @default(cuid())
  templateId String @map("template_id")
  label      String
  type       String // "NUMBER", "TEXT", "SELECT"
  options    Json?  // Para tipo SELECT: [{ label, value }]
  order      Int

  template   Template       @relation(fields: [templateId], references: [id], onDelete: Cascade)
  conditions ItemCondition[]
  answers    ScopeAnswer[]

  @@index([templateId])
  @@map("scope_fields")
}
```

### 2.3.4 ItemCondition (Condições de Item)

Regras que removem ou tornam opcional um item com base nas respostas de escopo.

```prisma
model ItemCondition {
  id           String @id @default(cuid())
  itemId       String @map("item_id")
  scopeFieldId String @map("scope_field_id")
  operator     String // "EQ", "NEQ", "GT", "LT", "GTE", "LTE"
  value        String
  action       String // "REMOVE" | "OPTIONAL"

  item       Item       @relation(fields: [itemId], references: [id], onDelete: Cascade)
  scopeField ScopeField @relation(fields: [scopeFieldId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@map("item_conditions")
}
```

### 2.3.5 ScopeAnswer (Respostas de Escopo)

Respostas de escopo por checklist. Para checklists filhos, as respostas são herdadas do pai (não possuem registros próprios).

```prisma
model ScopeAnswer {
  id           String @id @default(cuid())
  checklistId  String @map("checklist_id")
  scopeFieldId String @map("scope_field_id")
  value        String

  checklist  Checklist  @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  scopeField ScopeField @relation(fields: [scopeFieldId], references: [id], onDelete: Cascade)

  @@unique([checklistId, scopeFieldId])
  @@map("scope_answers")
}
```

### 2.4 Section (Seções)

Grupos de itens dentro de um template. Pode pertencer a um nível específico ou ser global.

```prisma
model Section {
  id                String  @id @default(cuid())
  templateId        String
  name              String
  order             Int
  iterateOverFields Boolean @default(false)  // Repete por talhão
  levelId           String? @map("level_id") // null = seção global (aparece em todos os níveis)

  template Template       @relation(fields: [templateId], references: [id], onDelete: Cascade)
  level    TemplateLevel? @relation(fields: [levelId], references: [id])
  items    Item[]

  @@index([levelId])
}
```

**Campo `levelId`:**
- `null`: Seção global, aparece em todos os checklists independente do nível alvo.
- ID de um `TemplateLevel`: Seção pertence a esse nível. Em modo acumulativo, aparece em checklists com nível alvo >= ao nível da seção.

### 2.5 Item (Itens/Perguntas)

Campos individuais do checklist. Pode ter classificação (E/I/A), condições baseadas em escopo e regras de bloqueio de avanço.

```prisma
model Item {
  id                          String   @id @default(cuid())
  sectionId                   String
  name                        String
  type                        ItemType
  order                       Int
  required                    Boolean  @default(true)
  validityControl             Boolean  @default(false)
  observationEnabled          Boolean  @default(false)
  requestArtifact             Boolean  @default(false)
  artifactRequired            Boolean  @default(false)
  askForQuantity              Boolean  @default(false)
  options                     String[]                      // Para choice types
  databaseSource              String?                       // Ex: 'fertilizers'
  
  // Level-based fields
  classificationId            String?  @map("classification_id")
  blocksAdvancementToLevelId  String?  @map("blocks_advancement_to_level_id")
  
  section          Section                 @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  classification   TemplateClassification? @relation(fields: [classificationId], references: [id])
  blocksAdvancementToLevel TemplateLevel?  @relation("BlocksAdvancementToLevel", fields: [blocksAdvancementToLevelId], references: [id])
  conditions       ItemCondition[]
  responses        Response[]
}
```

**Campos de Nível:**
- `classificationId`: Classificação do item (E/I/A) que define o percentual exigido para aprovação.
- `blocksAdvancementToLevelId`: Se preenchido, este item bloqueia o avanço para o nível indicado quando não está aprovado.
- `conditions`: Lista de condições que podem remover ou tornar o item opcional baseado em respostas de escopo.

### 2.6 Checklist (Instâncias)

Instância de um template enviada a um produtor. Para templates level-based, inclui nível alvo e nível atingido.

```prisma
model Checklist {
  id          String          @id @default(cuid())
  templateId  String
  producerId  String?
  subUserId   String?
  status      ChecklistStatus @default(DRAFT)
  type        ChecklistType   @default(ORIGINAL)
  publicToken String          @unique              // Token de acesso público
  sentAt      DateTime?
  submittedAt DateTime?
  reviewedAt  DateTime?
  finalizedAt DateTime?
  createdById String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  sentVia     String?                              // 'whatsapp' | 'email' | 'link'
  sentTo      String?
  
  // Hierarquia (pai-filho)
  parentId    String?
  parent      Checklist?  @relation("ChecklistHistory", fields: [parentId], references: [id])
  children    Checklist[] @relation("ChecklistHistory")
  
  // Level-based fields
  targetLevelId   String? @map("target_level_id")
  achievedLevelId String? @map("achieved_level_id")

  template      Template       @relation(fields: [templateId], references: [id])
  producer      Producer?      @relation(fields: [producerId], references: [id])
  subUser       SubUser?       @relation(fields: [subUserId], references: [id])
  createdBy     User           @relation(fields: [createdById], references: [id])
  targetLevel   TemplateLevel? @relation("TargetLevel", fields: [targetLevelId], references: [id])
  achievedLevel TemplateLevel? @relation("AchievedLevel", fields: [achievedLevelId], references: [id])
  responses     Response[]
  scopeAnswers  ScopeAnswer[]
  auditLogs     AuditLog[]
  reports       Report[]
  actionPlans   ActionPlan[]
}
```

**Campos de Nível:**
- `targetLevelId`: Nível alvo selecionado pelo supervisor. Define quais itens são exibidos ao produtor.
- `achievedLevelId`: Nível atingido calculado pelo sistema com base nas respostas e classificações.
- `scopeAnswers`: Respostas de escopo. Para checklists filhos, são herdadas do pai (API retorna as do pai, UI esconde edição).

### 2.7 Response (Respostas)

Respostas dos itens de um checklist.

```prisma
model Response {
  id              String         @id @default(cuid())
  checklistId     String
  itemId          String
  fieldId         String         @default("__global__")  // ID do talhão ou global
  status          ResponseStatus @default(MISSING)
  
  // Dados da resposta
  answer          String?
  quantity        String?
  observation     String?
  fileUrl         String?
  validity        DateTime?
  
  // Revisão
  rejectionReason String?
  reviewedAt      DateTime?
  
  // IA Analysis
  aiFlag          String?        // 'APPROVED' | 'REJECTED'
  aiMessage       String?
  aiConfidence    Float?
  
  // Metadata
  isInternal      Boolean        @default(false)
  filledById      String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  checklist Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  item      Item      @relation(fields: [itemId], references: [id])
  filledBy  User?     @relation("InternalResponses", fields: [filledById], references: [id])

  @@unique([checklistId, itemId, fieldId])
}
```

### 2.8 ActionPlan (Planos de Ação)

Planos de correção gerados pela IA.

```prisma
model ActionPlan {
  id          String   @id @default(cuid())
  checklistId String
  title       String
  description String   @db.Text
  summary     String?  @db.Text
  status      String   @default("OPEN")
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  checklist   Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  items       ActionItem[]
}
```

### 2.9 ActionItem (Itens do Plano)

Ações individuais de um plano de ação.

```prisma
model ActionItem {
  id           String    @id @default(cuid())
  actionPlanId String
  itemRef      String?                        // Ref ao item rejeitado
  priority     String    @default("MEDIA")   // ALTA, MEDIA, BAIXA
  action       String    @db.Text
  deadline     Int?                           // Prazo em dias
  documents    String[]                       // Documentos necessários
  responsible  String?
  isCompleted  Boolean   @default(false)
  completedAt  DateTime?
  createdAt    DateTime  @default(now())

  actionPlan ActionPlan @relation(fields: [actionPlanId], references: [id], onDelete: Cascade)
}
```

### 2.10 PropertyMap (Mapas de Propriedade)

Dados geoespaciais das propriedades rurais.

```prisma
model PropertyMap {
  id               String   @id @default(cuid())
  producerId       String
  propertyLocation Json?                      // { lat, lng }
  carCode          String?                    // Código do CAR
  carData          Json?                      // Dados do CAR
  carEsgStatus     String?
  carEsgData       Json?
  carEsgLastCheck  DateTime?
  fields           Json                       // Array de talhões
  city             String?
  state            String?
  emeCode          String?
  ruralRegionCode  Int?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  producer Producer @relation(fields: [producerId], references: [id], onDelete: Cascade)
}
```

### 2.11 AiPrompt (Prompts de IA)

Configuração de prompts para IA.

```prisma
model AiPrompt {
  id          String   @id @default(cuid())
  slug        String   @unique              // Ex: 'analyze-checklist-item'
  description String?
  template    String   @db.Text             // Template com placeholders
  model       String   @default("gpt-4o")   // Modelo de IA
  temperature Float    @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.12 DatabaseOption (Opções Dinâmicas)

Opções carregadas dinamicamente do banco.

```prisma
model DatabaseOption {
  id          String   @id @default(cuid())
  source      String                         // 'fertilizers', 'seeds', etc.
  label       String
  value       String
  composition String?
  unit        String?
  createdAt   DateTime @default(now())
}
```

### 2.13 Entidades Auxiliares

```prisma
model SubUser {
  id         String   @id @default(cuid())
  producerId String
  name       String
  cpf        String
  email      String
  phone      String?
  role       String?                         // Ex: "Contador", "Gerente"
  // ...
}

model Report {
  id          String   @id @default(cuid())
  checklistId String
  content     Json                           // Snapshot das respostas
  url         String?
  createdAt   DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(cuid())
  checklistId String?
  userId      String
  action      String                         // 'CHECKLIST_FINALIZED', etc.
  details     Json?
  createdAt   DateTime @default(now())
}

model RuralRegion {
  id           String @id @default(cuid())
  munCode      String @unique
  municipality String
  stateCode    String
  stateShort   String
  rrCode       Int
}

model EME {
  id     String @id @default(cuid())
  uf     String @unique
  codigo Int
  eme    String                              // Nome do órgão estadual
}

model SystemConfig {
  key   String @id
  value String
}
```

---

## 3. Enums

```prisma
enum UserRole {
  SUPERADMIN    // Administrador global (acessa todos workspaces)
  ADMIN         // Administrador de workspace
  SUPERVISOR    // Supervisor de campo
  PRODUCER      // Produtor rural
}

enum TemplateStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum ItemType {
  FILE
  TEXT
  LONG_TEXT
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  DATE
  PROPERTY_MAP
  FIELD_SELECTOR
  DROPDOWN_SELECT
}

enum ChecklistStatus {
  DRAFT
  SENT
  IN_PROGRESS
  PENDING_REVIEW
  APPROVED
  REJECTED
  PARTIALLY_FINALIZED
  FINALIZED
}

enum ChecklistType {
  ORIGINAL
  CORRECTION
  COMPLETION
}

enum ResponseStatus {
  MISSING
  PENDING_VERIFICATION
  APPROVED
  REJECTED
}
```

---

## 4. Relacionamentos

### 4.1 Relacionamentos Principais

| De | Para | Tipo | Descrição |
|----|------|------|-----------|
| Workspace | User | 1:N | Workspace contém usuários |
| Workspace | Producer | 1:N | Workspace contém produtores |
| Workspace | Template | 1:N | Workspace contém templates |
| Workspace | Checklist | 1:N | Workspace contém checklists |
| User | Template | 1:N | Usuário cria templates |
| User | Checklist | 1:N | Usuário cria checklists |
| User | Producer | N:M | Supervisores atribuídos a produtores |
| Producer | Checklist | 1:N | Produtor recebe checklists |
| Producer | PropertyMap | 1:N | Produtor tem mapas de propriedade |
| Producer | ProducerIdentifier | 1:N | Produtor tem documentos |
| Producer | AgriculturalRegistry | 1:N | Produtor tem registros agrícolas |
| Template | Section | 1:N | Template contém seções |
| Section | Item | 1:N | Seção contém itens |
| Checklist | Response | 1:N | Checklist tem respostas |
| Checklist | ActionPlan | 1:N | Checklist pode ter planos de ação |
| Checklist | Checklist | Self (pai-filho) | Hierarquia de correção |
| Checklist | ScopeAnswer | 1:N | Respostas de escopo |
| Checklist | TemplateLevel | N:1 | Nível alvo (targetLevel) |
| Checklist | TemplateLevel | N:1 | Nível atingido (achievedLevel) |
| Template | TemplateLevel | 1:N | Níveis do template |
| Template | TemplateClassification | 1:N | Classificações (E/I/A) |
| Template | ScopeField | 1:N | Perguntas de escopo |
| Section | TemplateLevel | N:1 | Seção pertence a um nível |
| Item | TemplateClassification | N:1 | Classificação do item |
| Item | TemplateLevel | N:1 | Bloqueia avanço para nível |
| Item | ItemCondition | 1:N | Condições baseadas em escopo |
| ScopeField | ItemCondition | 1:N | Condições referenciam campo |
| ScopeField | ScopeAnswer | 1:N | Respostas referenciam campo |

### 4.2 Hierarquia de Checklists

```
Checklist ORIGINAL
    │
    ├── Checklist CORRECTION (itens rejeitados)
    │       │
    │       └── Checklist CORRECTION (novo ciclo)
    │
    └── Checklist COMPLETION (itens faltantes)
            │
            └── Checklist COMPLETION (novo ciclo)
```

---

## 5. Índices

```prisma
// Índices principais para performance
@@index([cpf])           // Producer
@@index([email])         // Producer
@@index([status])        // Template, Checklist
@@index([createdById])   // Template
@@index([publicToken])   // Checklist
@@index([producerId])    // Checklist, PropertyMap
@@index([templateId])    // Section
@@index([sectionId])     // Item
@@index([checklistId])   // Response, AuditLog
@@index([userId])        // AuditLog
@@index([source])        // DatabaseOption
@@index([stateShort])    // RuralRegion
@@index([rrCode])        // RuralRegion
@@index([actionPlanId])  // ActionItem

// Unique constraints
@@unique([checklistId, itemId, fieldId])  // Response
```

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica
- [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) - Fluxos de negócio
- [API.md](./API.md) - Documentação de endpoints
