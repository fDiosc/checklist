# Documentação Técnica: MerX Platform

> **Versão:** 3.0  
> **Última atualização:** Fevereiro 2026  
> **Documentação completa:** [docs/](./docs/)

Este documento descreve a implementação técnica do MerX Platform, incluindo multi-tenancy, autenticação, hierarquia de checklists e internacionalização.

> **Nota:** Para documentação completa do projeto, consulte a pasta [docs/](./docs/):
> - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Arquitetura técnica
> - [DATABASE.md](./docs/DATABASE.md) - Modelo de dados
> - [BUSINESS_FLOWS.md](./docs/BUSINESS_FLOWS.md) - Fluxos de negócio
> - [API.md](./docs/API.md) - Endpoints da API
> - [INTEGRATIONS.md](./docs/INTEGRATIONS.md) - Integrações externas

---

## 1. Multi-tenancy (Workspaces)

### 1.1 Conceito
O sistema suporta múltiplas organizações (workspaces) isoladas. Cada workspace possui seus próprios produtores, templates, checklists e usuários.

### 1.2 Modelo de Dados

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logoUrl   String?  @map("logo_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users      User[]
  producers  Producer[]
  templates  Template[]
  checklists Checklist[]
  auditLogs  AuditLog[]
  aiPrompts  AiPrompt[]

  @@map("workspaces")
}
```

### 1.3 Segregação de Dados
Todas as entidades principais possuem `workspaceId`:
- `Producer.workspaceId` - Obrigatório
- `Template.workspaceId` - Obrigatório
- `Checklist.workspaceId` - Obrigatório
- `User.workspaceId` - Opcional (null = global/SuperAdmin)
- `AuditLog.workspaceId` - Opcional
- `AiPrompt.workspaceId` - Opcional (prompts globais ou por workspace)

### 1.4 Filtro Automático
O helper `getWorkspaceFilter()` em `lib/workspace-context.ts` aplica filtros automaticamente:

```typescript
// SuperAdmin vê tudo
if (session.user.role === "SUPERADMIN") return {};

// Outros usuários veem apenas seu workspace
return { workspaceId: session.user.workspaceId };
```

---

## 2. Autenticação e Autorização

### 2.1 Stack de Autenticação
- **NextAuth.js v5** - Framework de autenticação
- **Credentials Provider** - Login com email/senha
- **bcryptjs** - Hash de senhas (cost factor 12)
- **JWT Strategy** - Tokens stateless

### 2.2 Modelo de Usuário

```prisma
enum UserRole {
  SUPERADMIN  // Global - gerencia workspaces
  ADMIN       // Workspace - acesso total no workspace
  SUPERVISOR  // Gerencia produtores atribuídos
  PRODUCER    // Acesso apenas às próprias informações
}

model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  name               String?
  passwordHash       String    @map("password_hash")
  mustChangePassword Boolean   @default(true) @map("must_change_password")
  cpf                String?
  role               UserRole  @default(SUPERVISOR)
  workspaceId        String?   @map("workspace_id")
  
  @@unique([cpf, workspaceId]) // CPF único por workspace
}
```

### 2.3 Hierarquia de Permissões

| Role | Workspaces | Usuários | Produtores | Templates | Checklists |
|------|------------|----------|------------|-----------|------------|
| SUPERADMIN | CRUD | CRUD (todos) | CRUD (todos) | CRUD (todos) | CRUD (todos) |
| ADMIN | Ver próprio | CRUD (workspace) | CRUD (workspace) | CRUD (workspace) | CRUD (workspace) |
| SUPERVISOR | Ver próprio | - | Ver atribuídos | Ver | CRUD (atribuídos) |
| PRODUCER | Ver próprio | - | Ver próprio | - | Ver próprios |

**Notas sobre criação de usuários:**
- **SUPERADMIN**: Pode criar qualquer role em qualquer workspace (ou global)
- **ADMIN**: Pode criar ADMIN, SUPERVISOR e PRODUCER **apenas no seu workspace**
- Usuários criados por ADMIN são automaticamente vinculados ao workspace do ADMIN
- Menu "Usuários" visível para ADMIN e SUPERADMIN; "Workspaces" apenas para SUPERADMIN

### 2.4 Fluxo de Primeiro Acesso
1. Admin cria usuário com senha temporária
2. Usuário faz login → `mustChangePassword: true`
3. Middleware redireciona para `/dashboard/change-password`
4. Após alterar senha → `mustChangePassword: false`
5. Acesso liberado ao dashboard

### 2.5 Configuração NextAuth

```typescript
// lib/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Valida email/senha com bcrypt
        // Retorna user ou null
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      // Adiciona role, workspaceId, mustChangePassword ao token
    },
    session({ session, token }) {
      // Propaga dados do token para a sessão
    }
  }
});
```

### 2.6 Variáveis de Ambiente

```env
AUTH_SECRET=<string-aleatória-32-chars>
NEXTAUTH_URL=http://localhost:3000
```

---

## 3. Hierarquia de Checklists
Os checklists são organizados em uma estrutura recursiva no banco de dados através dos campos `parentId` e da relação `children`.

- **Checklist Original:** O ponto de partida da auditoria.
- **Checklist Filho (Correção/Complemento):** Gerado a partir de uma finalização parcial.
- **Checklist Neto:** Gerado a partir de um filho, permitindo ciclos infinitos de revisão.

### 3.1 Modelagem de Dados (Prisma)
Adicionamos o enum `ChecklistType` para garantir a integridade da identificação visual.

```prisma
enum ChecklistType {
  ORIGINAL
  CORRECTION
  COMPLETION
}

model Checklist {
  // ...
  type        ChecklistType   @default(ORIGINAL)
  parentId    String?
  parent      Checklist?      @relation("ChecklistHistory", fields: [parentId], references: [id])
  children    Checklist[]     @relation("ChecklistHistory")
}
```

### 3.2 Lógica de Sincronização "AS IS"
A sincronização ocorre durante o `finalize` e o `partial-finalize`. Diferente da lógica anterior (que sincronizava apenas aprovados), agora sincronizamos o estado atual completo.

### Algoritmo de Merge:
1. Identifica o `parentId`.
2. Itera sobre todas as respostas do checklist atual.
3. Filtra apenas respostas com status `APPROVED` ou `REJECTED`.
4. Executa um `upsert` no checklist pai, transportando:
   - `status` (Exato como no filho)
   - `answer` e `observation`
   - `fileUrl`, `quantity`, `validity`
   - `rejectionReason` (Fundamental para manter o histórico de falhas no pai)

### 3.3 Diferenciação de Tipos (Correção vs. Complemento)
A tipagem não é mais baseada em heurísticas de conteúdo, mas sim na intenção de criação:

- **CORRECTION:** Criado levando itens explicitamente `REJECTED`.
- **COMPLETION:** Criado levando itens `MISSING` ou que sequer possuem registro de resposta no banco (Faltantes).

### 3.4 Interface de Auditoria
A barra lateral de itens (`ChecklistManagementClient`) utiliza um sistema de códigos de cores baseado no estado da resposta:

- `bg-emerald-50`: Aprovado
- `bg-red-50`: Rejeitado
- `bg-amber-50`: Respondido (Aguardando Verificação)
- `bg-slate-100`: Não Respondido (Vazio)

### 3.5 Segurança e Confirmação
Implementamos um guard rails no `handleFinalize` para evitar sincronizações acidentais de erros:
- Se existirem itens `REJECTED`, um `window.confirm` solicita autorização explícita do supervisor informando que esses itens serão marcados como falhas no checklist master.

## 4. Internacionalização de Produtores

### 7.1 Modelo de Dados
Adicionamos suporte a produtores internacionais através de novos modelos:

```prisma
model ProducerIdentifier {
  id         String   @id @default(cuid())
  producerId String
  category   String   // personal | fiscal
  idType     String   // cpf, dni, ssn, cnpj, cuit, ein
  idValue    String
  createdAt  DateTime @default(now())
  
  @@unique([producerId, category])
  @@map("producer_identifiers")
}

model AgriculturalRegistry {
  id            String   @id @default(cuid())
  producerId    String   @unique
  registryType  String   // car, renspa, fsa
  registryValue String
  countryCode   String
  
  @@map("agricultural_registries")
}
```

### 7.2 Configuração por País
O arquivo `lib/countries.ts` centraliza as regras de cada país:

```typescript
export const COUNTRIES: Record<string, CountryConfig> = {
  BR: {
    personalDoc: { type: 'cpf', validation: 'cpf', required: true },
    fiscalDoc: { type: 'cnpj', validation: 'cnpj', required: false },
    agriculturalRegistry: { type: 'car', useIntegration: true },
    propertySource: 'car',
    requiresEsg: true
  },
  AR: {
    personalDoc: { type: 'dni', validation: 'numeric', required: true },
    fiscalDoc: { type: 'cuit', validation: 'alphanumeric', required: false },
    agriculturalRegistry: { type: 'renspa', useIntegration: false },
    propertySource: 'manual',
    requiresEsg: false
  }
};
```

### 7.3 Hierarquia de Propriedades
O campo `type` em `PropertyField` distingue:

- **`property`**: Polígono da fazenda/propriedade (renderizado com contorno branco)
- **`field`**: Talhão dentro da propriedade (renderizado em amarelo)

### 7.4 Fluxo de Cadastro por País

| País | Identificação | Propriedade | ESG |
|------|---------------|-------------|-----|
| BR | CPF + CNPJ (opcional) | CAR automático | Sim |
| AR | DNI + CUIT (opcional) | Upload/Desenho | Não |
| US | SSN + EIN (opcional) | Upload/Desenho | Não |

### 7.5 Componentes Especializados

- **`CountrySelector`**: Dropdown de seleção de país com bandeiras
- **`GeoFileUpload`**: Upload de KML/GeoJSON com parsing e cálculo de área
- **`PropertyMapInput`**: Comportamento dinâmico baseado em `countryCode`
