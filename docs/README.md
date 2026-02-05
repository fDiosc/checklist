# Documentação - MerX Platform

> **Versão:** 4.0  
> **Última atualização:** 05 Fevereiro 2026

## Índice de Documentos

| Documento | Descrição |
|-----------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura técnica, stack, estrutura do projeto |
| [DATABASE.md](./DATABASE.md) | Modelo de dados completo (Prisma schema) |
| [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) | Fluxos de negócio e ciclo de vida |
| [API.md](./API.md) | Documentação de endpoints REST |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Integrações externas (Gemini, Clerk, etc.) |

## Outros Documentos

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| CHANGELOG | [../CHANGELOG.md](../CHANGELOG.md) | Histórico de versões |
| README Principal | [../README.md](../README.md) | Setup e visão geral |
| Documentação Técnica | [../TECHNICAL_DOCUMENTATION.md](../TECHNICAL_DOCUMENTATION.md) | Hierarquia de checklists |

## Arquivos Legados

| Documento | Localização | Status |
|-----------|-------------|--------|
| implementation.md | [./legacy/implementation.md](./legacy/implementation.md) | **Desatualizado** - Plano inicial de implementação |

---

## Guia Rápido

### Para Novos Desenvolvedores

1. Comece pelo [README principal](../README.md) para setup
2. Leia [ARCHITECTURE.md](./ARCHITECTURE.md) para entender a estrutura
3. Consulte [DATABASE.md](./DATABASE.md) para o modelo de dados
4. Veja [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) para os fluxos

### Para Integrações

1. Consulte [API.md](./API.md) para endpoints disponíveis
2. Veja [INTEGRATIONS.md](./INTEGRATIONS.md) para configuração de serviços externos

### Para Manutenção

1. Verifique o [CHANGELOG](../CHANGELOG.md) para histórico de mudanças
2. Consulte [TECHNICAL_DOCUMENTATION.md](../TECHNICAL_DOCUMENTATION.md) para detalhes de hierarquia

---

## Mantendo a Documentação Atualizada

### Quando Atualizar

- [ ] Ao adicionar novas entidades no banco → Atualizar `DATABASE.md`
- [ ] Ao criar novos endpoints → Atualizar `API.md`
- [ ] Ao modificar fluxos de negócio → Atualizar `BUSINESS_FLOWS.md`
- [ ] Ao adicionar integrações → Atualizar `INTEGRATIONS.md`
- [ ] Ao adicionar novas strings traduzíveis → Atualizar `messages/*.json`
- [ ] Ao fazer releases → Atualizar `CHANGELOG.md`

### Padrão de Documentação

```markdown
# Título do Documento

> **Versão:** X.X  
> **Última atualização:** Mês Ano

## Índice
1. [Seção 1](#seção-1)
2. [Seção 2](#seção-2)

---

## 1. Seção 1

Conteúdo...
```
