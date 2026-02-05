# Arquitetura Técnica - MerX Platform

> **Versão:** 4.0  
> **Última atualização:** 05 Fevereiro 2026  
> **Status:** Produção

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Camadas da Aplicação](#4-camadas-da-aplicação)
5. [Autenticação e Autorização](#5-autenticação-e-autorização)
6. [Padrões de Desenvolvimento](#6-padrões-de-desenvolvimento)

---

## 1. Visão Geral

O MerX Platform é um sistema de **gestão de compliance e auditoria digital para o agronegócio**. A plataforma permite:

- Criação de templates de checklists personalizados
- Envio de checklists para produtores rurais via link público
- Revisão e auditoria de respostas por supervisores
- Análise automática de respostas via IA (Google Gemini)
- Geração de planos de ação para correções
- Integração com dados geoespaciais (CAR, ESG)

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │   Portal    │  │  Página Pública (/c/)  │  │
│  │ (Supervisor)│  │ (Produtor)  │  │    (Sem autenticação)   │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │/api/     │ │/api/     │ │/api/     │ │/api/     │            │
│  │checklists│ │templates │ │producers │ │ai/*      │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────────────────────────────────────────────────┐
│                    SERVICES LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ sync.service│  │ evolution   │  │ Gemini AI     │  │
│  │             │  │ (WhatsApp)  │  │               │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                    DATA LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ Prisma ORM  │  │ Supabase    │  │ External APIs │  │
│  │ (Neon.db)   │  │ Storage     │  │ (CAR, ESG)    │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js | 15.1.0 | Framework React com App Router |
| React | 19.0.0 | Biblioteca de UI |
| TypeScript | 5.7.2 | Tipagem estática |
| TailwindCSS | 3.4.17 | Estilização utility-first |
| React Query | 5.90.16 | Cache e estado de servidor |
| React Hook Form | 7.70.0 | Gerenciamento de formulários |
| Zod | 3.24.1 | Validação de schemas |
| Leaflet | 1.9.4 | Mapas interativos |
| Lucide React | 0.469.0 | Ícones |
| next-intl | 4.8.2 | Internacionalização (i18n) |

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js API Routes | 15.1.0 | Endpoints REST |
| Prisma | 5.22.0 | ORM type-safe |
| Neon.db | - | PostgreSQL serverless |
| NextAuth.js | 5.0.0-beta.30 | Autenticação própria |
| bcryptjs | 3.0.3 | Hash de senhas |
| Supabase | 2.90.0 | Storage de arquivos |
| Google Gemini | 1.34.0 | IA para análise |
| Resend | 6.6.0 | Envio de emails |

### Infraestrutura

| Serviço | Propósito |
|---------|-----------|
| CapRover | Hospedagem (Docker) |
| Neon.db | Banco de dados PostgreSQL |
| Supabase | Storage S3-compatible |

---

## 3. Estrutura do Projeto

```
merx-platform/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── action-plans/         # Endpoints de planos de ação
│   │   ├── ai/                   # Endpoints de IA (analyze, generate)
│   │   ├── c/[token]/            # API pública (save, submit)
│   │   ├── checklists/           # CRUD de checklists
│   │   ├── dashboard/            # Estatísticas
│   │   ├── database-options/     # Opções dinâmicas
│   │   ├── integration/          # CAR, ESG
│   │   ├── lookup/               # EME, Rural Regions
│   │   ├── portal/               # API do portal do produtor
│   │   ├── producers/            # CRUD de produtores
│   │   ├── templates/            # CRUD de templates
│   │   └── users/                # Onboarding, supervisores
│   │
│   └── [locale]/                 # Rotas internacionalizadas (pt-BR, en, es)
│       ├── c/[token]/            # Página pública de checklist
│       ├── dashboard/            # Dashboard do supervisor
│       │   ├── checklists/       # Gerenciamento de checklists
│       │   ├── produtores/       # Cadastro de produtores
│       │   ├── supervisores/     # Gestão de supervisores
│       │   └── templates/        # Editor de templates
│       ├── portal/               # Portal do produtor
│       ├── sign-in/              # Login (Clerk)
│       └── sign-up/              # Registro (Clerk)
│
├── components/                   # Componentes React
│   ├── ai/                       # Componentes de IA
│   ├── checklists/               # Componentes de checklist
│   ├── dashboard/                # Componentes do dashboard
│   ├── forms/                    # Formulários
│   ├── modals/                   # Modais
│   ├── providers/                # Context providers
│   └── ui/                       # Componentes base (Checkbox, Switch)
│
├── lib/                          # Utilitários e serviços
│   ├── services/                 # Serviços de negócio
│   │   └── sync.service.ts       # Sincronização pai-filho
│   ├── utils/                    # Funções utilitárias
│   │   └── status.ts             # Helpers de status
│   ├── constants.ts              # Constantes (fertilizantes, etc.)
│   ├── db.ts                     # Cliente Prisma
│   ├── evolution.ts              # API WhatsApp
│   ├── geo.ts                    # Utilitários geográficos
│   └── utils.ts                  # Utilitários gerais
│
├── messages/                     # Arquivos de internacionalização
│   ├── pt-BR.json                # Português do Brasil (padrão)
│   ├── en.json                   # Inglês
│   └── es.json                   # Espanhol
│
├── prisma/                       # Configuração do banco
│   ├── migrations/               # Migrações SQL
│   ├── schema.prisma             # Schema do banco
│   └── seed*.ts                  # Scripts de seed
│
├── scripts/                      # Scripts de manutenção
├── types/                        # Tipos TypeScript
├── public/                       # Assets estáticos
└── docs/                         # Documentação
```

---

## 4. Camadas da Aplicação

### 4.1 Presentation Layer (Frontend)

- **Pages**: Renderização server-side com Next.js App Router
- **Client Components**: Interatividade com React 19
- **Forms**: React Hook Form + Zod para validação
- **State Management**: React Query para cache de servidor

### 4.2 API Layer

- **Route Handlers**: Next.js API Routes em `app/api/`
- **Autenticação**: Middleware Clerk para rotas protegidas
- **Validação**: Zod schemas para input validation

### 4.3 Business Logic Layer

- **Services**: Lógica de negócio encapsulada em `lib/services/`
- **Sync Service**: Sincronização de respostas entre checklists
- **AI Service**: Integração com Google Gemini

### 4.4 Data Layer

- **Prisma ORM**: Type-safe queries ao PostgreSQL
- **Supabase Storage**: Upload e download de arquivos
- **External APIs**: CAR, ESG, Evolution (WhatsApp)

### 4.5 Internacionalização (i18n)

A plataforma suporta múltiplos idiomas usando `next-intl`:

| Idioma | Código | Arquivo |
|--------|--------|---------|
| Português do Brasil | `pt-BR` | `messages/pt-BR.json` |
| Inglês | `en` | `messages/en.json` |
| Espanhol | `es` | `messages/es.json` |

**Estratégia de Roteamento**: Prefixo de URL (`/pt-BR/dashboard`, `/en/dashboard`, etc.)

**Uso em Componentes**:
```typescript
import { useTranslations, useFormatter } from 'next-intl';

function MyComponent() {
  const t = useTranslations();
  const format = useFormatter();
  
  return (
    <div>
      <h1>{t('dashboard.welcome')}</h1>
      <p>{format.dateTime(new Date(), { dateStyle: 'short' })}</p>
    </div>
  );
}
```

---

## 5. Autenticação e Autorização

### 5.1 Sistema de Autenticação

A plataforma utiliza **NextAuth.js v5** com Credentials Provider para autenticação própria:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuário   │────▶│  NextAuth   │────▶│  Middleware │
│  (email/    │     │  (JWT)      │     │  (next-intl │
│   senha)    │     │             │     │  + auth)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
            │   Dashboard   │          │    Portal     │          │  Página /c/   │
            │  (Protegido)  │          │  (Protegido)  │          │   (Pública)   │
            └───────────────┘          └───────────────┘          └───────────────┘
```

### 5.2 Multi-tenancy (Workspaces)

O sistema suporta múltiplas organizações isoladas com hierarquia de subworkspaces:

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logoUrl   String?
  cnpj      String?  // Para subworkspaces
  
  // Hierarquia de Subworkspaces
  parentWorkspaceId  String?
  parentWorkspace    Workspace? @relation("WorkspaceHierarchy")
  subworkspaces      Workspace[] @relation("WorkspaceHierarchy")
  hasSubworkspaces   Boolean    @default(false)
  
  users      User[]
  producers  Producer[]
  templates  Template[]
  checklists Checklist[]
}
```

**Subworkspaces:**
- Workspace pai pode ter múltiplos subworkspaces
- Cada subworkspace tem logo, nome e CNPJ próprios
- Subworkspaces não veem dados uns dos outros
- Workspace pai vê todos os dados de seus subworkspaces
- Subworkspaces não podem ter seus próprios subworkspaces (máx. 2 níveis)

### 5.3 Roles e Permissões

| Role | Descrição | Escopo | Permissões |
|------|-----------|--------|------------|
| `SUPERADMIN` | Administrador global | Todos workspaces | CRUD total, gerenciar workspaces |
| `ADMIN` | Administrador de workspace | Seu workspace | CRUD completo no workspace |
| `SUPERVISOR` | Supervisor de campo | Seu workspace | Apenas produtores atribuídos |
| `PRODUCER` | Produtor rural | Seu workspace | Acesso via link público |

### 5.4 Middleware de Proteção

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";

const publicRoutes = ["/", "/c/", "/sign-in", "/sign-up", "/api/c/"];

export default async function middleware(request) {
  const session = await auth();
  
  // Rotas públicas não precisam de auth
  if (isPublicRoute(request.pathname)) return;
  
  // Redireciona para login se não autenticado
  if (!session) return redirect("/sign-in");
  
  // Força alteração de senha no primeiro acesso
  if (session.user.mustChangePassword) {
    return redirect("/dashboard/change-password");
  }
}
```

### 5.5 Controle de Acesso por Workspace

```typescript
// lib/workspace-context.ts
import { auth } from "@/lib/auth";

export function getWorkspaceFilter(session: Session) {
  if (session.user.role === "SUPERADMIN") return {};
  return { workspaceId: session.user.workspaceId };
}

export function isAdmin(session: Session): boolean {
  return ["SUPERADMIN", "ADMIN"].includes(session.user.role);
}
```

---

## 6. Padrões de Desenvolvimento

### 6.1 Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `ChecklistItem.tsx` |
| Hooks | camelCase com prefixo "use" | `useChecklist.ts` |
| Utilitários | camelCase | `formatDate.ts` |
| Constantes | UPPER_SNAKE_CASE | `DATABASE_FERTILIZERS` |
| Rotas API | kebab-case | `/api/action-plans` |

### 6.2 Estrutura de Componentes

```typescript
// Componente Server (default)
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Componente Client
'use client';
export function ClientComponent({ data }) {
  const [state, setState] = useState();
  // ...
}
```

### 6.3 API Routes Pattern

```typescript
// app/api/resource/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Business logic
    const data = await db.resource.findMany();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 6.4 Error Handling

- API Routes: try/catch com NextResponse.json({ error }, { status })
- Frontend: React Query error boundaries
- Logging: console.error para erros críticos

---

## Próximos Documentos

- [DATABASE.md](./DATABASE.md) - Modelo de dados completo
- [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) - Fluxos de negócio
- [API.md](./API.md) - Documentação de endpoints
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integrações externas
