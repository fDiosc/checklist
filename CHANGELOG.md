# Changelog 📜

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [V 0.0.8] - 2026-01-28

### ✨ Novas Funcionalidades
- **Modal de Plano de Ação (Produtor):** Nova interface mobile-friendly com popup para visualizar planos de ação, substituindo o banner fixo anterior.
- **Botão na Barra de Navegação:** O acesso ao plano de ação agora fica integrado à barra inferior de navegação, aparece apenas quando há planos publicados.
- **Scroll Independente:** Sidebar e área de respostas agora rolam de forma independente, melhorando a usabilidade.
- **Scrollbars Ocultas:** Visual mais limpo com scrollbars invisíveis mas funcionais.

### 🐛 Correções (Bugfixes)
- **Vinculação Correta de Planos:** Planos de ação agora são gerados e vinculados ao checklist filho correto (Correção/Complemento), não mais ao pai.
- **Espaçamento para Barra de Navegação:** Ajuste de padding inferior para evitar sobreposição com botões de navegação.
- **Remoção do Changelog do Produtor:** Interface do produtor simplificada, sem botão de versão.

---

## [V 0.0.7] - 2026-01-27

### ✨ Novas Funcionalidades
- **Accordion de Checklists Derivados:** Novo painel colapsável para visualizar checklists filhos com tipo (Correção/Complemento), status, progresso e datas.
- **Estatísticas no Cabeçalho:** Barra de progresso e contagem de aprovados/rejeitados/pendentes no topo da página de gerenciamento.
- **Planos de Ação Estruturados:** Nova estrutura com ações individuais contendo prioridade, prazo, documentos e responsável.
- **Prompts por Tipo de Checklist:** Sistema flexível de prompts para geração de planos de ação específicos por tipo (Correção vs Complemento).

### 🐛 Correções (Bugfixes)
- **Correção do Cálculo de Progresso:** Percentual agora baseado em aprovados/total de itens do template.
- **Accordion Colapsado por Padrão:** Melhoria de UX, accordion inicia fechado ao carregar a página.
- **Carregamento de Dados de Filhos:** Query corrigida para incluir tipo, status de respostas e datas.

---

## [V 0.0.6] - 2026-01-27

### ✨ Novas Funcionalidades
- **Sincronização "AS IS" (Merge Completo):** Agora os checklists sincronizam tanto aprovações quanto rejeições com o pai, mantendo o histórico fiel da revisão.
- **Tipagem de Checklist em Banco:** Introdução do campo `type` para garantir que badges de "Correção" e "Complemento" nunca falhem por heurísticas.
- **Modal de Confirmação de Segurança:** Aviso preventivo ao finalizar checklists que contenham itens rejeitados, informando a sincronização para o mestre.
- **Visualização de Status por Cores:** Nova barra lateral com cores semânticas (Verde/Vermelho/Amarelo/Cinza) para facilitar a scaneabilidade do supervisor.

### 🐛 Correções (Bugfixes)
- **Correção de Badges Legadas:** Ajuste manual de checklists do projeto PAGR para exibirem o tipo correto imediatamente.
- **Detecção de Respostas:** Melhoria na lógica que identifica se um item foi ou não respondido pelo produtor.

---

## [V 0.0.5] - 2026-01-27

### ✨ Novas Funcionalidades
- **Geração de Plano de Ação via IA:** Integração com Google Gemini para análise automática de falhas e criação de guias de correção estruturados.
- **Hierarquia Multinível de Checklists:** Suporte completo para checklists Pai, Filhos e Netos, com badges de navegação e status em tempo real.
- **Checklists de Correção vs. Complemento:** Separação lógica no fluxo de reenvio, distinguindo itens rejeitados (erros) de itens não respondidos (lacunas).
- **Sincronização Automática:** Respostas aprovadas em checklists de correção são sincronizadas instantaneamente com o checklist pai.
- **Localização PT-BR:** Tradução integral da interface de gerenciamento, badges de status e tipos de itens para o português brasileiro.

### 🐛 Correções (Bugfixes)
- **Portal do Produtor:** Correção no cálculo de itens concluídos, garantindo que itens rejeitados ou pendentes apareçam corretamente para preenchimento.
- **Sincronização de Snapshots:** Garantia de que cada finalização parcial gera um registro histórico (Report) íntegro.
- **Ajustes de UI:** Melhoria na densidade de informações do cabeçalho de gerenciamento e correção de typos.

---
*Fim da versão V 0.0.5*
