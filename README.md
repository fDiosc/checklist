# MerX Platform - Gestão de Contrapartes

Sistema de gestão de compliance e auditoria digital para o agronegócio.

## 🚀 Setup

1. **Clone o repositório**

2. **Instale as dependências**
```bash
npm install --legacy-peer-deps
```

3. **Configure as variáveis de ambiente**
Copie `.env.example` para `.env.local` e preencha com suas credenciais:
- Clerk (autenticação)
- Neon.db (database)
- Supabase (storage)
- Gemini AI
- Resend (email)

4. **Configure o banco de dados**
```bash
npx prisma generate
npx prisma db push
```

5. **Execute o projeto**
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📚 Documentação

Ver `implementation_plan.md` para detalhes completos da arquitetura.

## 🏗️ Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Auth**: Clerk
- **Database**: Neon.db (PostgreSQL) + Prisma
- **Storage**: Supabase
- **AI**: Google Gemini
- **Email**: Resend
