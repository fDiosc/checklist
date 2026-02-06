# Integrações Externas - MerX Platform

> **Versão:** 5.0  
> **Última atualização:** 06 Fevereiro 2026

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Google Gemini (IA)](#2-google-gemini-ia)
3. [NextAuth (Autenticação)](#3-nextauth-autenticação)
4. [AWS S3 (Storage)](#4-aws-s3-storage)
5. [Evolution API (WhatsApp)](#5-evolution-api-whatsapp)
6. [CAR API (Cadastro Ambiental Rural)](#6-car-api-cadastro-ambiental-rural)
7. [ESG API](#7-esg-api)
8. [Resend (Email)](#8-resend-email)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)

---

## 1. Visão Geral

O MerX Platform integra com diversos serviços externos:

```
┌─────────────────────────────────────────────────────────────┐
│                      MerX Platform                          │
└─────────────────────────────────────────────────────────────┘
          │         │         │         │         │
          ▼         ▼         ▼         ▼         ▼
     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
     │ Gemini │ │NextAuth│ │ AWS S3 │ │Evolution│ │ CAR/ESG│
     │  (IA)  │ │ (Auth) │ │(Storage)│ │(WhatsApp)│ │ (Geo) │
     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 2. Google Gemini (IA)

### Propósito

- Análise automática de respostas de checklist
- Geração de planos de ação
- Geração de templates

### Configuração

```bash
# .env.local
GEMINI_API_KEY=your-gemini-api-key
```

### Modelos Utilizados

| Modelo | Uso |
|--------|-----|
| `gemini-3-flash-preview` | Análise de respostas (padrão) - Inteligência Pro, velocidade Flash |
| `gemini-1.5-flash` | Fallback se 3.0 falhar |

> **Nota:** O Gemini 3 Flash oferece context window de 1M tokens de entrada e 64K tokens de saída, com preço de $0.50/milhão de tokens de entrada.

### Implementação

```typescript
// lib/services/ai.service.ts (implícito nos route handlers)

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Exemplo de chamada
const result = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    responseMimeType: 'application/json',
    temperature: 0.1
  }
});
```

### Endpoints que Usam IA

| Endpoint | Função |
|----------|--------|
| `POST /api/ai/analyze` | Analisa resposta individual |
| `POST /api/ai/generate-action-plan` | Gera plano de ação |
| `POST /api/ai/generate-template` | Gera template de checklist |
| `POST /api/ai/validate-document` | Valida legibilidade e tipo de documento |

### Prompts Configuráveis

Os prompts são armazenados no banco (`AiPrompt`) e podem ser editados:

```prisma
model AiPrompt {
  slug        String   @unique  // Ex: 'analyze-checklist-item'
  template    String   @db.Text // Template com placeholders
  model       String   @default("gpt-4o")
  temperature Float    @default(0)
}
```

### Placeholders Disponíveis

| Placeholder | Descrição |
|-------------|-----------|
| `{{itemName}}` | Nome do item |
| `{{itemDescription}}` | Descrição do item |
| `{{userAnswer}}` | Resposta do usuário |
| `{{userObservation}}` | Observação do usuário |
| `{{producerName}}` | Nome do produtor |
| `{{checklistName}}` | Nome do template |
| `{{rejectedItems}}` | JSON dos itens rejeitados |

---

## 3. NextAuth (Autenticação)

### Propósito

- Autenticação própria com email/senha
- Gerenciamento de sessões JWT
- Multi-tenancy com workspaces
- Roles hierárquicos (SUPERADMIN, ADMIN, SUPERVISOR, PRODUCER)

### Configuração

```bash
# .env.local
AUTH_SECRET="<string-aleatória-32-chars>"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### Arquitetura

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user) return null;
        
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        
        return valid ? user : null;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      session.user.workspaceId = token.workspaceId;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    }
  }
});
```

### Uso nas API Routes

```typescript
import { auth } from "@/lib/auth";
import { isAdmin, getWorkspaceFilter } from "@/lib/workspace-context";

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Filtrar por workspace automaticamente
  const filter = getWorkspaceFilter(session);
  const data = await db.producer.findMany({ where: filter });
  
  return NextResponse.json(data);
}
```

### Fluxo de Primeiro Acesso

1. Admin cria usuário com `mustChangePassword: true`
2. Usuário faz login
3. Middleware detecta `mustChangePassword` e redireciona
4. Usuário altera senha em `/dashboard/change-password`
5. Sistema atualiza `mustChangePassword: false`

---

## 4. AWS S3 (Storage)

### Propósito

- Armazenamento de documentos e fotos de checklists
- Bucket compartilhado entre projetos com segregação por prefixo
- Acesso via presigned URLs (temporárias)

### Configuração

```bash
# .env.local
S3_BUCKET=pocs-merxlabs
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
# S3_ENDPOINT=  # Opcional, para S3-compatible storage
```

### Estrutura do Path

```
checklist/{workspaceId}/{subworkspaceId|_root}/{checklistId}/{itemId}/{fieldId}/{timestamp}_{filename}
```

- `_root` para workspaces sem subworkspace
- `timestamp` em milissegundos para evitar colisões

### Implementação

```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// Funções disponíveis
export function buildS3Key(params): string;
export async function uploadToS3(key, buffer, contentType): Promise<void>;
export async function getPresignedUrl(key, expiresIn?): Promise<string>;  // Default: 1 hora
export async function getPresignedUploadUrl(key, contentType, expiresIn?): Promise<string>;
export async function deleteFromS3(key): Promise<void>;
```

### APIs

| Endpoint | Função |
|----------|--------|
| `POST /api/upload` | Upload via multipart/form-data |
| `GET /api/upload/presigned-url` | Gerar URL temporária de leitura |

### Visualização de Documentos

O componente `DocumentViewerModal` permite supervisores visualizar documentos inline:
- **Imagens:** Zoom controls (25% - 300%), pan
- **PDFs:** Embedding via iframe
- **Resolução automática:** S3 keys → presigned URLs

---

## 5. Evolution API (WhatsApp)

### Propósito

- Envio de notificações via WhatsApp
- Links de checklists para produtores

### Configuração

```bash
# .env.local
EVOLUTION_API_URL=https://evolution.yourserver.com
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE=your-instance
```

### Implementação

```typescript
// lib/evolution.ts

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  const response = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    }
  );
  
  return response.ok;
}
```

### Formato do Telefone

- Deve incluir código do país: `5511999998888`
- Sem caracteres especiais

---

## 6. CAR API (Cadastro Ambiental Rural)

### Propósito

- Busca de dados do Cadastro Ambiental Rural
- Validação de propriedades rurais
- Obtenção de geometrias

### Configuração

As credenciais CAR são configuradas **por workspace** através do painel de SuperAdmin:

```prisma
model Workspace {
  carApiKey        String?  // Token da API CAR
  carCooperativeId String?  // ID da Cooperativa
  esgApiEnabled    Boolean  // Se integração está habilitada
  esgEnabledForSubworkspaces Boolean  // Se subworkspaces podem usar
}
```

**Hierarquia de Credenciais:**
1. Se workspace é subworkspace e pai tem `esgEnabledForSubworkspaces = true`, usa credenciais do pai
2. Caso contrário, usa credenciais do próprio workspace

### Endpoint Interno

```http
GET /api/integration/car?latitude=-23.5505&longitude=-46.6333
```

### Implementação

```typescript
// app/api/integration/car/route.ts

const apiUrl = `https://api.merx.tech/api/v1/integration/car/getCarsByLatLong?latitude=${lat}&longitude=${lng}&cooperative-id=${coopId}`;

const response = await fetch(apiUrl, {
  headers: {
    'Authorization': authKey,
    'Content-Type': 'application/json'
  }
});
```

### Dados Retornados

```json
{
  "cod_imovel": "SP-1234567-ABCDEF...",
  "nom_imovel": "Fazenda São João",
  "num_area": 150.5,
  "des_condic": "Ativo",
  "geom": "...",           // WKB hex
  "geoJson": {             // Convertido pelo backend
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

### Conversão de Geometria

```typescript
import wkx from 'wkx';

if (item.geom) {
  const buffer = Buffer.from(item.geom, 'hex');
  const geometry = wkx.Geometry.parse(buffer);
  item.geoJson = geometry.toGeoJSON();
}
```

---

## 7. ESG API

### Propósito

- Verificação de status ESG de produtores
- Verificação de status ESG de propriedades
- Compliance ambiental

### Endpoints Internos

```http
GET /api/integration/esg/producer?cpf=12345678901
GET /api/integration/esg/property?carCode=SP-1234567...
```

### Dados Armazenados

```prisma
model Producer {
  esgStatus    String?    // Status atual
  esgData      Json?      // Dados completos
  esgLastCheck DateTime?  // Última verificação
}

model PropertyMap {
  carEsgStatus     String?
  carEsgData       Json?
  carEsgLastCheck  DateTime?
}
```

---

## 8. Resend (Email)

### Propósito

- Envio de emails transacionais
- Notificações de checklist

### Configuração

```bash
# .env.local
RESEND_API_KEY=re_...
```

### Implementação

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'MerX <noreply@merx.com.br>',
  to: email,
  subject: `Checklist: ${templateName}`,
  html: `<p>Acesse: <a href="${link}">${link}</a></p>`
});
```

---

## 9. Variáveis de Ambiente

### Completas

```bash
# ===========================================
# BANCO DE DADOS
# ===========================================
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# ===========================================
# AUTENTICAÇÃO (NextAuth)
# ===========================================
AUTH_SECRET="<string-aleatória-32-chars>"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"       # URL base da aplicação

# ===========================================
# IA (Google Gemini)
# ===========================================
GEMINI_API_KEY=your-gemini-api-key

# ===========================================
# STORAGE (AWS S3)
# ===========================================
S3_BUCKET=pocs-merxlabs
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
# S3_ENDPOINT=  # Opcional, para S3-compatible storage

# ===========================================
# WHATSAPP (Evolution API)
# ===========================================
EVOLUTION_API_URL=https://evolution.yourserver.com
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE=your-instance

# ===========================================
# EMAIL (Resend)
# ===========================================
RESEND_API_KEY=re_...

# ===========================================
# APLICAÇÃO
# ===========================================
NEXT_PUBLIC_APP_URL=https://app.merx.com.br
```

### Configurações no Banco (Por Workspace)

Credenciais ESG/CAR são configuradas individualmente por workspace:

```prisma
model Workspace {
  // Integração ESG/CAR
  carApiKey                  String?
  carCooperativeId           String?
  esgApiEnabled              Boolean @default(false)
  esgEnabledForSubworkspaces Boolean @default(false)
}
```

**Interface:** SuperAdmin configura via botão "Integração Socioambiental" na página de workspaces.

---

## Fluxo de Dados entre Integrações

```
┌─────────────┐
│  Produtor   │
│  preenche   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   AWS S3    │◀────│   Upload    │
│  Storage    │     │   arquivo   │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Supervisor │────▶│   Gemini    │
│   revisa    │     │  analisa    │
└─────────────┘     └─────────────┘
       │
       ├───────────────────────────┐
       │                           │
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│  Evolution  │             │   Resend    │
│  WhatsApp   │             │   Email     │
└─────────────┘             └─────────────┘
       │
       ▼
┌─────────────┐
│  Produtor   │
│  recebe     │
│  notificação│
└─────────────┘
```

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica
- [DATABASE.md](./DATABASE.md) - Modelo de dados
- [API.md](./API.md) - Documentação de endpoints
