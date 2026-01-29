# Documentação Técnica: Hierarquia e Sincronização de Checklists 🛠️

Este documento descreve a implementação técnica dos mecanismos de hierarquia, sincronização "AS IS" e identificação de tipos de checklists.

## 1. Arquitetura de Hierarquia
Os checklists são organizados em uma estrutura recursiva no banco de dados através dos campos `parentId` e da relação `children`.

- **Checklist Original:** O ponto de partida da auditoria.
- **Checklist Filho (Correção/Complemento):** Gerado a partir de uma finalização parcial.
- **Checklist Neto:** Gerado a partir de um filho, permitindo ciclos infinitos de revisão.

## 2. Modelagem de Dados (Prisma)
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

## 3. Lógica de Sincronização "AS IS"
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

## 4. Diferenciação de Tipos (Correção vs. Complemento)
A tipagem não é mais baseada em heurísticas de conteúdo, mas sim na intenção de criação:

- **CORRECTION:** Criado levando itens explicitamente `REJECTED`.
- **COMPLETION:** Criado levando itens `MISSING` ou que sequer possuem registro de resposta no banco (Faltantes).

## 5. Interface de Auditoria
A barra lateral de itens (`ChecklistManagementClient`) utiliza um sistema de códigos de cores baseado no estado da resposta:

- `bg-emerald-50`: Aprovado
- `bg-red-50`: Rejeitado
- `bg-amber-50`: Respondido (Aguardando Verificação)
- `bg-slate-100`: Não Respondido (Vazio)

## 6. Segurança e Confirmação
Implementamos um guard rails no `handleFinalize` para evitar sincronizações acidentais de erros:
- Se existirem itens `REJECTED`, um `window.confirm` solicita autorização explícita do supervisor informando que esses itens serão marcados como falhas no checklist master.
