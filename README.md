# MerX Platform - Gestão de Contrapartes

Sistema multi-tenant de gestão de compliance e auditoria digital para o agronegócio.

## Visão Geral

O MerX Platform permite:

- **Multi-tenancy**: Workspaces isolados para diferentes organizações
- **Autenticação Própria**: Sistema de login com email/senha (NextAuth.js)
- **Criação de Templates**: Modelos de checklist personalizados com diversos tipos de campos
- **Envio para Produtores**: Links públicos via WhatsApp/Email sem necessidade de login
- **Auditoria com IA**: Análise automática de respostas usando Google Gemini
- **Ciclos de Correção**: Hierarquia de checklists para correções iterativas
- **Planos de Ação**: Geração automática de guias de correção
- **Integração Geoespacial**: CAR, ESG, mapas de propriedades
- **Internacionalização**: Suporte a múltiplos países (BR, AR, US) e idiomas (pt-BR, en, es)

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, next-intl |
| Auth | NextAuth.js v5 + bcryptjs |
| Database | Neon.db (PostgreSQL) + Prisma ORM |
| Storage | Supabase |
| IA | Google Gemini |
| Email | Resend |
| WhatsApp | Evolution API |

## Setup Rápido

### 1. Clone o repositório

```bash
git clone <repo-url>
cd merx-platform
```

### 2. Instale as dependências

```bash
npm install --legacy-peer-deps
```

### 3. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth (NextAuth)
AUTH_SECRET="<string-aleatória-32-chars>"  # Gerar com: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# IA
GEMINI_API_KEY=...

# Storage
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# WhatsApp
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE=...

# Email
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configure o banco de dados

```bash
npx prisma generate
npx prisma db push
```

### 5. Execute o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
merx-platform/
├── app/
│   ├── [locale]/           # Rotas internacionalizadas (pt-BR, en, es)
│   │   ├── c/[token]/      # Página pública de checklist
│   │   ├── dashboard/      # Dashboard do supervisor
│   │   └── portal/         # Portal do produtor
│   └── api/                # API Routes
├── components/             # Componentes React
├── lib/                    # Utilitários e serviços
├── messages/               # Arquivos de tradução (pt-BR.json, en.json, es.json)
├── prisma/                 # Schema e migrations
├── docs/                   # Documentação técnica
└── scripts/                # Scripts de manutenção
```

## Documentação

A documentação completa está disponível na pasta `docs/`:

| Documento | Descrição |
|-----------|-----------|
| [docs/README.md](./docs/README.md) | Índice da documentação |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitetura técnica |
| [docs/DATABASE.md](./docs/DATABASE.md) | Modelo de dados |
| [docs/BUSINESS_FLOWS.md](./docs/BUSINESS_FLOWS.md) | Fluxos de negócio |
| [docs/API.md](./docs/API.md) | Documentação de endpoints |
| [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) | Integrações externas |
| [CHANGELOG.md](./CHANGELOG.md) | Histórico de versões |

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor de desenvolvimento
npm run build                  # Build de produção
npm run start                  # Inicia servidor de produção

# Banco de Dados
npx prisma studio              # GUI do banco
npx prisma migrate dev         # Criar nova migration
npx prisma db push             # Push sem migration (dev)
npx prisma generate            # Regenerar client

# Linting
npm run lint                   # Verificar erros de lint
```

## Principais Funcionalidades

### Templates de Checklist

- Seções com ordenação drag-and-drop
- Tipos de campos: texto, escolha, data, arquivo, mapa
- Campos iterativos por talhão
- Controle de validade e observações

### Ciclo de Auditoria

1. Supervisor cria e envia checklist
2. Produtor preenche via link público
3. Supervisor revisa com auxílio de IA
4. Itens rejeitados geram checklist de correção
5. Ciclo repete até aprovação total

### Hierarquia de Checklists

```
ORIGINAL
  ├── CORRECTION (itens rejeitados)
  └── COMPLETION (itens faltantes)
```

### Integração CAR/ESG

- Busca automática por coordenadas
- Validação de propriedades rurais
- Verificação de compliance ambiental

## Versão Atual

**V 0.3.0** - Fevereiro 2026

Principais novidades:
- Multi-tenancy com Workspaces isolados
- Autenticação própria (NextAuth.js) substituindo Clerk
- Gerenciamento de usuários e permissões por workspace
- Logo e branding dinâmico por organização

Veja [CHANGELOG.md](./CHANGELOG.md) para histórico completo.

## Licença

Proprietário - MerX
