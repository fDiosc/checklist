🚀 Plano de Implementação - Refatoração MerX
Versão: 2.0
Data: Janeiro 2026
Objetivo: Transformar MVP em plataforma production-ready com autenticação, multi-tenancy e backend robusto

📋 Índice
Visão Geral da Refatoração
Stack Tecnológica
Arquitetura do Sistema
Modelo de Dados
Fluxos de Usuário
Implementação por Fases
Segurança e Permissions
Integrações Externas
Deployment
Estimativas
1. 📊 Visão Geral da Refatoração
1.1 Objetivos
✅ Migrar de LocalStorage para Database (Neon.db)
✅ Implementar autenticação e autorização (Clerk v5)
[/] Separar fluxos por tipo de usuário (Em progresso)
[/] Cadastro proativo de produtores (API básica pronta)
[/] Sistema de convites por link público (API básica pronta)
[/] Otimizar mobile experience (Página pública pronta)
[ ] Preparar para integrações (WhatsApp, SMS, Email)

> [!IMPORTANT]
> **Status Atual**: A base tecnológica está montada, mas existem erros de integração entre Next.js 15, Clerk v5 e Prisma 5.22.0 que precisam ser corrigidos para a plataforma rodar.

### 🛑 Bloqueadores Atuais
1. **Sync Dynamic APIs**: Next.js 15 exige que `auth()` seja aguardado (`await auth()`).
2. **Prisma Client**: O modelo `db.producer` está vindo como `undefined` devido a geração incorreta do client.
3. **Hydration**: Erros de hidratação na renderização do Clerk/Dashboard.

1.2 Mudanças Principais
Aspecto	Antes (MVP)	Depois (Produção)
Storage	LocalStorage	Neon.db (PostgreSQL)
Auth	Mockado	Clerk (OAuth, JWT)
Backend	Nenhum	Next.js API Routes
Usuários	1 tipo	3 tipos (Admin/Supervisor/Produtor)
Cadastro	Reativo	Proativo
Links	N/A	Públicos com token
IA	Client-side	Server-side (proxy)
2. 🛠️ Stack Tecnológica
2.1 Frontend
{
  "framework": "Next.js 15",
  "language": "TypeScript 5.8",
  "styling": "Tailwind CSS 4.0",
  "ui": "shadcn/ui",
  "icons": "Lucide React",
  "maps": "Leaflet + React Leaflet",
  "forms": "React Hook Form + Zod",
  "state": "Zustand (se necessário)",
  "http": "Tanstack Query (react-query)"
}
Justificativa:

Next.js 15: SSR, API Routes, otimização automática, App Router
shadcn/ui: Componentes acessíveis e customizáveis
React Hook Form + Zod: Validação type-safe
Tanstack Query: Cache automático, refetch, optimistic updates
2.2 Backend
{
  "runtime": "Next.js API Routes",
  "database": "Neon.db (PostgreSQL serverless)",
  "orm": "Prisma",
  "auth": "Clerk",
  "storage": "Supabase Storage",
  "ai": "Google Gemini AI 1.33",
  "email": "Resend",
  "monitoring": "Sentry"
}
Justificativa:

Neon.db: PostgreSQL serverless, escala automática, branching
Prisma: Type-safe ORM, migrações, excelente DX
Clerk: Auth completo, webhooks, multi-org, roles nativo
Supabase Storage: S3-compatible, CDN, transformações de imagem
Resend: API moderna de email, templates React
2.3 DevOps
{
  "hosting": "Vercel",
  "ci_cd": "GitHub Actions",
  "monitoring": "Sentry + Vercel Analytics",
  "logs": "Vercel Logs",
  "env": "Vercel Environment Variables"
}
3. 🏗️ Arquitetura do Sistema
3.1 Diagrama de Arquitetura
⚠️ Failed to render Mermaid diagram: Lexical error on line 9. Unrecognized text.
... F[/api/producers] --> G[Prisma ORM]
-----------------------^
graph TB
    subgraph "Frontend - Next.js"
        A[Admin Dashboard] --> B[Clerk Auth]
        C[Supervisor Dashboard] --> B
        D[Public Checklist Form] --> E[No Auth]
    end
    
    subgraph "Backend - API Routes"
        F[/api/producers] --> G[Prisma ORM]
        H[/api/checklists] --> G
        I[/api/templates] --> G
        J[/api/ai/analyze] --> K[Gemini AI]
        L[/api/webhooks/clerk] --> M[Sync Users]
    end
    
    subgraph "Database - Neon.db"
        G --> N[(PostgreSQL)]
    end
    
    subgraph "Storage"
        O[Supabase Storage] --> P[S3-compatible]
    end
    
    subgraph "External Services"
        Q[WhatsApp API]
        R[SMS Provider]
        S[Resend Email]
    end
    
    B --> F
    B --> H
    B --> I
    E --> H
    H --> O
    F --> Q
    F --> R
    F --> S
3.2 Estrutura de Pastas
merx-platform/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   ├── supervisor/
│   │   │   └── layout.tsx
│   │   ├── (public)/
│   │   │   └── c/[token]/page.tsx
│   │   ├── api/
│   │   │   ├── producers/route.ts
│   │   │   ├── checklists/route.ts
│   │   │   ├── templates/route.ts
│   │   │   ├── ai/analyze/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── webhooks/clerk/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── admin/
│   │   ├── supervisor/
│   │   ├── public/
│   │   └── shared/
│   ├── lib/
│   │   ├── db.ts (Prisma client)
│   │   ├── auth.ts (Clerk helpers)
│   │   ├── validations/ (Zod schemas)
│   │   ├── services/
│   │   │   ├── ai.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   └── whatsapp.service.ts
│   │   └── utils/
│   └── types/
│       └── index.ts
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
4. 🗄️ Modelo de Dados
4.1 Schema Prisma Completo
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
// ============================================
// USERS & AUTH (synced from Clerk)
// ============================================
enum UserRole {
  ADMIN
  SUPERVISOR
  PRODUCER
}
model User {
  id        String   @id // Clerk user ID
  email     String   @unique
  name      String?
  role      UserRole @default(PRODUCER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // Relations
  templatesCreated  Template[]
  checklistsCreated Checklist[]
  auditLogs         AuditLog[]
  
  @@map("users")
}
// ============================================
// PRODUCERS
// ============================================
model Producer {
  id        String   @id @default(cuid())
  name      String
  cpf       String   @unique
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // Relations
  subUsers   SubUser[]
  checklists Checklist[]
  maps       PropertyMap[]
  
  @@index([cpf])
  @@index([email])
  @@map("producers")
}
model SubUser {
  id         String   @id @default(cuid())
  producerId String
  name       String
  cpf        String
  email      String
  phone      String?
  role       String? // Ex: "Contador", "Gerente", etc
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  // Relations
  producer   Producer @relation(fields: [producerId], references: [id], onDelete: Cascade)
  checklists Checklist[]
  
  @@index([producerId])
  @@map("sub_users")
}
// ============================================
// TEMPLATES
// ============================================
enum TemplateStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
model Template {
  id                              String         @id @default(cuid())
  name                            String
  folder                          String
  status                          TemplateStatus @default(ACTIVE)
  requiresProducerIdentification  Boolean        @default(false)
  createdById                     String
  createdAt                       DateTime       @default(now())
  updatedAt                       DateTime       @updatedAt
  // Relations
  createdBy User      @relation(fields: [createdById], references: [id])
  sections  Section[]
  checklists Checklist[]
  
  @@index([status])
  @@index([createdById])
  @@map("templates")
}
model Section {
  id                String  @id @default(cuid())
  templateId        String
  name              String
  order             Int
  iterateOverFields Boolean @default(false)
  // Relations
  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  items    Item[]
  
  @@index([templateId])
  @@map("sections")
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
model Item {
  id                String   @id @default(cuid())
  sectionId         String
  name              String
  type              ItemType
  order             Int
  required          Boolean  @default(true)
  validityControl   Boolean  @default(false)
  observationEnabled Boolean @default(false)
  requestArtifact   Boolean  @default(false)
  artifactRequired  Boolean  @default(false)
  askForQuantity    Boolean  @default(false)
  
  // Configurações específicas
  options          String[] // Para choice/multiple
  databaseSource   String? // 'fertilizers' | 'desiccation'
  
  // Relations
  section  Section   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  responses Response[]
  
  @@index([sectionId])
  @@map("items")
}
// ============================================
// CHECKLISTS (Instâncias)
// ============================================
enum ChecklistStatus {
  DRAFT
  SENT
  IN_PROGRESS
  PENDING_REVIEW
  APPROVED
  REJECTED
  FINALIZED
}
model Checklist {
  id                String          @id @default(cuid())
  templateId        String
  producerId        String?
  subUserId         String?
  status            ChecklistStatus @default(DRAFT)
  publicToken       String          @unique // Para acesso sem login
  sentAt            DateTime?
  submittedAt       DateTime?
  reviewedAt        DateTime?
  finalizedAt       DateTime?
  createdById       String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Metadados
  sentVia           String? // 'whatsapp' | 'email' | 'sms' | 'link'
  sentTo            String? // Email ou telefone do destinatário
  
  // Relations
  template   Template  @relation(fields: [templateId], references: [id])
  producer   Producer? @relation(fields: [producerId], references: [id])
  subUser    SubUser?  @relation(fields: [subUserId], references: [id])
  createdBy  User      @relation(fields: [createdById], references: [id])
  responses  Response[]
  auditLogs  AuditLog[]
  
  @@index([publicToken])
  @@index([producerId])
  @@index([status])
  @@map("checklists")
}
// ============================================
// RESPONSES
// ============================================
enum ResponseStatus {
  MISSING
  PENDING_VERIFICATION
  APPROVED
  REJECTED
}
model Response {
  id               String         @id @default(cuid())
  checklistId      String
  itemId           String
  status           ResponseStatus @default(MISSING)
  
  // Resposta
  answer           String? // JSON para arrays, texto para string
  quantity         String?
  observation      String?
  fileUrl          String?
  validity         DateTime?
  
  // Revisão
  rejectionReason  String?
  reviewedAt       DateTime?
  
  // IA Analysis
  aiFlag           String? // 'APROVADO' | 'REPROVADO'
  aiMessage        String?
  aiConfidence     Float?
  
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  
  // Relations
  checklist Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  item      Item      @relation(fields: [itemId], references: [id])
  
  @@unique([checklistId, itemId])
  @@index([checklistId])
  @@map("responses")
}
// ============================================
// MAPAS GEOESPACIAIS
// ============================================
model PropertyMap {
  id               String   @id @default(cuid())
  producerId       String
  propertyLocation Json? // { lat, lng }
  fields           Json // Array de Field[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Relations
  producer Producer @relation(fields: [producerId], references: [id], onDelete: Cascade)
  
  @@index([producerId])
  @@map("property_maps")
}
// ============================================
// AUDIT LOGS
// ============================================
model AuditLog {
  id          String   @id @default(cuid())
  checklistId String?
  userId      String
  action      String // 'created', 'approved', 'rejected', 'finalized'
  details     Json?
  createdAt   DateTime @default(now())
  
  // Relations
  checklist Checklist? @relation(fields: [checklistId], references: [id], onDelete: SetNull)
  user      User       @relation(fields: [userId], references: [id])
  
  @@index([checklistId])
  @@index([userId])
  @@map("audit_logs")
}
4.2 Relacionamentos
creates
creates
performs
has
receives
owns
contains
instantiates
contains
has
tracks
answered_in
User
Template
Checklist
AuditLog
Producer
SubUser
PropertyMap
Section
Item
Response
5. 👥 Fluxos de Usuário
5.1 Fluxo Admin/Supervisor
External API
Database
Sistema
Admin/Supervisor
External API
Database
Sistema
Admin/Supervisor
Cadastro de Produtor
Disparo de Checklist
Análise
Login (Clerk)
Verifica role
Admin/Supervisor
Dashboard
Cadastra Produtor + SubUsuários
Salva Producer + SubUsers
Confirmação
Produtor cadastrado
Seleciona Template + Produtor
Escolhe canal (WhatsApp/Email/SMS)
Cria Checklist + publicToken
Envia notificação
Enviado
Checklist disparado
Acessa checklist preenchido
Busca responses
Solicita análise IA
Chama Gemini AI
Análise (APROVADO/REPROVADO)
Exibe sugestão
Aprova/Rejeita item
Atualiza status
Finaliza checklist
Status = FINALIZED
5.2 Fluxo Produtor (Não Autenticado)
Database
Sistema
Link Público
Produtor
Database
Sistema
Link Público
Produtor
loop
[Para cada item]
Clica em link (WhatsApp/Email/SMS)
GET /c/[token]
Busca checklist por token
Template + Items
Formulário de preenchimento
Preenche campo
Salva progressivamente (auto-save)
Envia respostas finais
Atualiza status → PENDING_REVIEW
Confirmação de envio
5.3 Fluxo de Notificações
WhatsApp
Email
SMS
Link Manual
Admin dispara checklist
Canal escolhido
WhatsApp API
Resend
SMS Provider
Copia link
Produtor recebe
Clica em link
Preenche checklist
6. 📅 Implementação por Fases
Fase 1: Fundação (Semana 1-2)
Objetivo: Setup completo do projeto

1.1 Setup Next.js + TypeScript
npx create-next-app@latest merx-platform --typescript --tailwind --app
cd merx-platform
1.2 Instalar Dependências
# Core
npm install @clerk/nextjs prisma @prisma/client
# UI
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
# Forms & Validation
npm install react-hook-form zod @hookform/resolvers
# Data Fetching
npm install @tanstack/react-query
# Maps
npm install leaflet react-leaflet
npm install -D @types/leaflet
# AI
npm install @google/genai
# File Upload
npm install @supabase/supabase-js
# Email
npm install resend react-email
# Dev
npm install -D prisma eslint-config-next
1.3 Configurar Clerk
.env.local:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
middleware.ts:

import { authMiddleware } from "@clerk/nextjs";
export default authMiddleware({
  publicRoutes: ["/", "/c/:token"], // Checklist público
});
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
1.4 Configurar Neon.db + Prisma
npx prisma init
.env.local:

DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/merx?sslmode=require"
Copiar schema do item 4.1 para prisma/schema.prisma.

npx prisma migrate dev --name init
npx prisma generate
1.5 Criar Database Client
src/lib/db.ts:

import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
Deliverables:

✅ Projeto Next.js configurado
✅ Clerk funcionando (login/signup)
✅ Database conectada
✅ Migrations aplicadas
Fase 2: Backend Core (Semana 3-4)
Objetivo: APIs essenciais

2.1 API de Produtores
src/app/api/producers/route.ts:

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const createProducerSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().length(11),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  subUsers: z.array(z.object({
    name: z.string(),
    cpf: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
});
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const validatedData = createProducerSchema.parse(body);
  const producer = await db.producer.create({
    data: {
      name: validatedData.name,
      cpf: validatedData.cpf,
      email: validatedData.email,
      phone: validatedData.phone,
      subUsers: validatedData.subUsers ? {
        create: validatedData.subUsers,
      } : undefined,
    },
    include: { subUsers: true },
  });
  return NextResponse.json(producer);
}
export async function GET(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const producers = await db.producer.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    include: {
      subUsers: true,
      _count: {
        select: { checklists: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(producers);
}
2.2 API de Templates
src/app/api/templates/route.ts:

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const template = await db.template.create({
    data: {
      name: body.name,
      folder: body.folder,
      requiresProducerIdentification: body.requiresProducerIdentification,
      createdById: userId,
      sections: {
        create: body.sections.map((section: any, sIdx: number) => ({
          name: section.name,
          order: sIdx,
          iterateOverFields: section.iterateOverFields,
          items: {
            create: section.items.map((item: any, iIdx: number) => ({
              name: item.name,
              type: item.type,
              order: iIdx,
              required: item.required,
              validityControl: item.validityControl,
              observationEnabled: item.observationEnabled,
              requestArtifact: item.requestArtifact,
              artifactRequired: item.artifactRequired,
              askForQuantity: item.askForQuantity,
              options: item.options || [],
              databaseSource: item.databaseSource,
            })),
          },
        })),
      },
    },
    include: {
      sections: {
        include: { items: true },
      },
    },
  });
  return NextResponse.json(template);
}
2.3 API de Checklists (Disparo)
src/app/api/checklists/send/route.ts:

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp.service";
import { sendEmail } from "@/lib/services/email.service";
import { sendSMS } from "@/lib/services/sms.service";
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { templateId, producerId, subUserId, channel } = await req.json();
  const publicToken = nanoid(32);
  const checklist = await db.checklist.create({
    data: {
      templateId,
      producerId,
      subUserId,
      publicToken,
      status: 'SENT',
      sentAt: new Date(),
      sentVia: channel,
      createdById: userId,
    },
    include: {
      template: true,
      producer: true,
      subUser: true,
    },
  });
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/c/${publicToken}`;
  // Enviar notificação baseado no canal
  const recipient = checklist.subUser || checklist.producer;
  if (!recipient) throw new Error("Recipient not found");
  switch (channel) {
    case 'whatsapp':
      await sendWhatsAppMessage(recipient.phone!, link, checklist.template.name);
      break;
    case 'email':
      await sendEmail(recipient.email!, link, checklist.template.name);
      break;
    case 'sms':
      await sendSMS(recipient.phone!, link);
      break;
  }
  return NextResponse.json({ checklist, link });
}
Deliverables:

✅ CRUD completo de Produtores
✅ CRUD de Templates
✅ Sistema de disparo de checklists
✅ Geração de tokens públicos
Fase 3: Frontend Admin (Semana 5-6)
Objetivo: Dashboard administrativo completo

3.1 Layout com Auth
src/app/(dashboard)/layout.tsx:

import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.role === 'PRODUCER') {
    redirect("/unauthorized");
  }
  return (
    <div className="flex h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-8">
          <h1>MerX Platform</h1>
          <UserButton />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
3.2 Página de Produtores
src/app/(dashboard)/admin/producers/page.tsx:

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProducerDialog } from '@/components/admin/producer-dialog';
export default function ProducersPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: producers, isLoading } = useQuery({
    queryKey: ['producers'],
    queryFn: async () => {
      const res = await fetch('/api/producers');
      return res.json();
    },
  });
  const createProducer = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/producers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers'] });
      setIsDialogOpen(false);
    },
  });
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produtores</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          Novo Produtor
        </Button>
      </div>
      {/* Lista de produtores com tabela shadcn/ui */}
    </div>
  );
}
Deliverables:

✅ Dashboard com navegação
✅ CRUD visual de Produtores
✅ CRUD visual de Templates
✅ Disparador de checklists
Fase 4: Frontend Público (Semana 7-8)
Objetivo: Formulário mobile-first para produtores

4.1 Página Pública de Checklist
src/app/(public)/c/[token]/page.tsx:

import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ChecklistForm } from '@/components/public/checklist-form';
export default async function PublicChecklistPage({
  params,
}: {
  params: { token: string };
}) {
  const checklist = await db.checklist.findUnique({
    where: { publicToken: params.token },
    include: {
      template: {
        include: {
          sections: {
            include: { items: true },
            orderBy: { order: 'asc' },
          },
        },
      },
      responses: true,
    },
  });
  if (!checklist) notFound();
  if (checklist.status === 'FINALIZED') {
    return <div>Este checklist já foi finalizado.</div>;
  }
  return <ChecklistForm checklist={checklist} />;
}
4.2 Componente de Formulário Mobile-Optimized
src/components/public/checklist-form.tsx:

'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { PropertyMapInput } from '@/components/shared/property-map-input';
import { FileUpload } from '@/components/shared/file-upload';
export function ChecklistForm({ checklist }: { checklist: any }) {
  const [currentStep, setCurrentStep] = useState(0);
  const allItems = checklist.template.sections.flatMap((s: any) => s.items);
  // Auto-save progressivo a cada mudança
  const saveResponse = useMutation({
    mutationFn: async (data: any) => {
      await fetch(`/api/checklists/${checklist.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  });
  const handleFieldChange = (itemId: string, value: any) => {
    saveResponse.mutate({ itemId, value });
  };
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header com progresso */}
      <header className="sticky top-0 bg-white shadow-sm p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold">{checklist.template.name}</h1>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(currentStep / allItems.length) * 100}%` }}
            />
          </div>
        </div>
      </header>
      {/* Item atual em tela cheia (mobile-first) */}
      <main className="max-w-2xl mx-auto p-4 mt-6">
        <CurrentItemCard
          item={allItems[currentStep]}
          onNext={() => setCurrentStep(s => s + 1)}
          onChange={handleFieldChange}
        />
      </main>
    </div>
  );
}
Deliverables:

✅ Formulário público funcional
✅ Mobile-first e responsivo
✅ Auto-save progressivo
✅ Navegação step-by-step
Fase 5: Integrações (Semana 9)
Objetivo: Conectar serviços externos

5.1 Service de Email (Resend)
src/lib/services/email.service.ts:

import { Resend } from 'resend';
import { ChecklistEmail } from '@/emails/checklist-email';
const resend = new Resend(process.env.RESEND_API_KEY);
export async function sendEmail(
  to: string,
  link: string,
  templateName: string
) {
  await resend.emails.send({
    from: 'MerX <noreply@merx.com.br>',
    to,
    subject: `Checklist: ${templateName}`,
    react: ChecklistEmail({ link, templateName }),
  });
}
5.2 Service de WhatsApp (Stub para API proprietária)
src/lib/services/whatsapp.service.ts:

export async function sendWhatsAppMessage(
  phone: string,
  link: string,
  templateName: string
) {
  // TODO: Integrar com API proprietária
  const message = `Olá! Você recebeu um checklist "${templateName}". Acesse: ${link}`;
  
  const response = await fetch(process.env.WHATSAPP_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  });
  return response.json();
}
5.3 Service de IA (Proxy Gemini)
src/app/api/ai/analyze/route.ts:

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemName, answer, quantity, observation } = await req.json();
  const prompt = `Analise a resposta do produtor:
  
  Pergunta: "${itemName}"
  Resposta: "${answer}"
  Quantidade: "${quantity || 'N/A'}"
  Observação: "${observation || 'Nenhuma'}"
  
  Determine se está APROVADO ou REPROVADO e justifique.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          flag: { type: Type.STRING, enum: ['APROVADO', 'REPROVADO'] },
          message: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
      },
    },
  });
  return NextResponse.json(JSON.parse(response.text));
}
Deliverables:

✅ Email funcionando (Resend)
✅ Stub WhatsApp pronto
✅ Stub SMS pronto
✅ IA via proxy server-side
Fase 6: Polimento (Semana 10)
Testes E2E (Playwright)
Performance optimization
Acessibilidade (WCAG)
Documentação de APIs
7. 🔒 Segurança e Permissions
7.1 Roles e Permissões
Ação	Admin	Supervisor	Produtor
Ver todos checklists	✅	✅	❌
Criar templates	✅	❌	❌
Cadastrar produtores	✅	✅	❌
Disparar checklists	✅	✅	❌
Analisar com IA	✅	✅	❌
Finalizar checklist	✅	✅	❌
Preencher checklist	N/A	N/A	Público
7.2 Middleware de Autorização
src/lib/auth-helpers.ts:

import { auth } from "@clerk/nextjs";
import { db } from "./db";
import { UserRole } from "@prisma/client";
export async function requireRole(allowedRoles: UserRole[]) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
Uso:

// Em API Route
export async function POST(req: Request) {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  // ... resto da lógica
}
8. 📡 Integrações Externas
8.1 WhatsApp Business API
Requisitos:

URL da API proprietária
Token de autenticação
Formato esperado de payload
Exemplo de integração:

const response = await fetch('https://api-whatsapp.yourcompany.com/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipient: phone,
    type: 'template',
    template: {
      name: 'checklist_notification',
      language: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: templateName },
            { type: 'text', text: link },
          ],
        },
      ],
    },
  }),
});
8.2 SMS Provider
Similar ao WhatsApp, aguardando especificações do provider.

8.3 Email (Resend)
Já implementado. Templates React com react-email:

emails/checklist-email.tsx:

import { Html, Button, Text } from '@react-email/components';
export function ChecklistEmail({ link, templateName }: any) {
  return (
    <Html>
      <Text>Você recebeu um checklist: {templateName}</Text>
      <Button href={link}>Preencher Agora</Button>
    </Html>
  );
}
9. 🚀 Deployment
9.1 Vercel (Recomendado)
Vantagens:

Deploy automático do Git
Preview deployments
Edge functions
Analytics integrado
Otimização automática
Setup:

Conectar repositório GitHub no Vercel
Configurar environment variables:
DATABASE_URL
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
GEMINI_API_KEY
SUPABASE_URL e SUPABASE_ANON_KEY
RESEND_API_KEY
WHATSAPP_API_URL e WHATSAPP_API_KEY
Deploy automático a cada push
9.2 Neon.db Branching
Usar branches do Neon para ambientes:

main → Produção
preview → Preview (Vercel preview deployments)
dev → Desenvolvimento local
10. ⏱️ Estimativas
10.1 Cronograma Detalhado
Fase	Duração	Entregas
Fase 1: Fundação	2 semanas	Setup completo, auth, database
Fase 2: Backend Core	2 semanas	APIs de Produtores, Templates, Checklists
Fase 3: Frontend Admin	2 semanas	Dashboard, CRUD visual, Disparador
Fase 4: Frontend Público	2 semanas	Formulário mobile-first
Fase 5: Integrações	1 semana	Email, WhatsApp, SMS, IA
Fase 6: Polimento	1 semana	Testes, docs, performance
Total	10 semanas	MVP Production-Ready
10.2 Equipe Recomendada
1 Full-Stack Senior: Arquitetura, backend, infraestrutura
1 Frontend Senior: UI/UX, otimização mobile
Opcional: 1 QA Engineer (testes automatizados)
10.3 Custos Estimados
Item	Custo Mensal	Custo Inicial
Vercel Pro	$20	-
Neon.db Scale	$19	-
Clerk Pro	$25	-
Supabase Pro	$25	-
Resend	$10	-
Desenvolvimento	-	$40.000 (10 semanas × $4k/semana)
Total Inicial	$99/mês	$40.000
11. 📚 Recursos Adicionais
11.1 Documentação Oficial
Next.js 15
Clerk
Neon.db
Prisma
shadcn/ui
Resend
11.2 Comandos Úteis
# Desenvolvimento
npm run dev
# Build
npm run build
# Prisma
npx prisma studio           # GUI do banco
npx prisma migrate dev      # Nova migration
npx prisma db push         # Push sem migration (dev)
npx prisma generate        # Regenerar client
# Deploy
vercel                     # Deploy para produção
vercel --prod             # Force production
12. ✅ Checklist de Pronto para Produção
 Todos os testes passando (>80% coverage)
 Performance otimizada (Lighthouse >90)
 Acessibilidade WCAG AA
 SEO básico configurado
 Error tracking (Sentry) ativo
 Analytics configurado
 Backup de database configurado
 Domínio customizado
 SSL/HTTPS
 GDPR/LGPD compliance
 Terms of Service + Privacy Policy
 Documentação de API
 Runbook de operações
Documento preparado por: IA Arquiteto de Sistemas
Última atualização: Janeiro 2026