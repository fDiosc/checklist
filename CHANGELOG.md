# Changelog 📜

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [V 0.5.1] - 2026-02-06

### 🔧 UI de Configuração IA, Melhorias no Viewer e Correções de Attachment

#### ✨ Novas Funcionalidades

- **UI de Configuração de Validação IA (SuperAdmin):** Modal dedicado na página de Workspaces para habilitar/desabilitar validação por IA, configurar herança para subworkspaces e selecionar modo (avisar/bloquear).
- **UI de Configuração de Validação IA (Admin):** Seção de configuração de IA na página de Subworkspaces com status do workspace pai e seletor de modo por subworkspace.
- **Visualização de Template (Eye icon):** Templates já utilizados agora mostram ícone de olho para navegação em modo read-only, substituindo o botão de edição desabilitado.
- **requestArtifact universal:** Upload de documentos agora aparece sempre que `requestArtifact=true`, independente da resposta selecionada e em todos os tipos de item (single_choice, multiple_choice, dropdown_select).

#### 🐛 Correções

- **DocumentViewerModal via Portal:** Modal agora renderizado via `createPortal(document.body)` para evitar problemas de stacking context causados por containers com `transform`/`animation`.
- **Nome limpo do documento:** Removido caminho S3 e prefixo de timestamp do nome exibido no viewer (ex: `1770401230265_doc.pdf` → `doc.pdf`).
- **Restrição de envio de checklist:** Workspace pai não pode mais enviar checklists para produtores de subworkspaces (`?scope=own`).
- **Upload bloqueando save:** Botão "Salvar Resposta" e "Próximo" desabilitados durante upload de arquivo na visão do produtor.
- **File state no produtor:** `fileUrl` agora corretamente passado para `ChecklistItem` mostrando badge "Arquivo enviado" após upload.
- **Attachment no supervisor:** Documentos anexados (requestArtifact) agora visíveis na visão do supervisor para itens não-FILE.
- **Correção de locale:** Adicionadas chaves faltantes `common.items`, `checklistDetail.attachedDocument`, `template.viewTemplate`.

#### 🌐 Internacionalização

- Novas chaves `aiValidation.*` (14 chaves) em pt-BR, en e es para configurações de validação por IA.
- Nova chave `template.viewTemplate` em todos os locales.

---

## [V 0.5.0] - 2026-02-06

### 🚀 Gestão de Subworkspaces por Admin, S3 Storage, Validação de Documentos por IA e Melhorias de UX

Esta versão implementa 5 grandes funcionalidades: gestão de subworkspaces por admins, bloqueio de finalização com filhos abertos, integração S3, validação de documentos por IA e melhorias na experiência do produtor.

### ✨ Novas Funcionalidades

#### 1. Gestão de Subworkspaces por Admin
- **Admin pode ver subworkspaces:** Usuários ADMIN de workspaces com subworkspaces habilitados agora veem o menu "Subworkspaces" no dashboard.
- **Criar subworkspaces:** ADMINs podem criar novos subworkspaces dentro de sua hierarquia (nome, slug, CNPJ, logo).
- **Gerenciar usuários:** ADMINs podem criar e visualizar usuários dentro de cada subworkspace.
- **Listagem de usuários expandida:** API GET `/api/users` agora retorna usuários de todos os subworkspaces para ADMINs.

#### 2. Bloqueio de Finalização com Filhos Abertos
- **Validação server-side:** Um checklist pai não pode ser finalizado se possuir checklists filhos em aberto (não finalizados).
- **Feedback no frontend:** Mensagem de erro clara com lista dos checklists filhos em aberto (tipo e status) quando a finalização é bloqueada.

#### 3. Integração com AWS S3
- **Bucket `pocs-merxlabs`:** Todo armazenamento de documentos e fotos migrado de Supabase para AWS S3.
- **Estrutura organizada:** Path `checklist/{workspaceId}/{subworkspaceId|_root}/{checklistId}/{itemId}/{fieldId}/{timestamp}_{filename}`.
- **Upload API:** Novo endpoint `POST /api/upload` para upload de arquivos via `multipart/form-data`.
- **Presigned URLs:** Novo endpoint `GET /api/upload/presigned-url` para acesso temporário a objetos S3.
- **Utilitário centralizado:** `lib/s3.ts` com funções `uploadToS3`, `getPresignedUrl`, `getPresignedUploadUrl`, `deleteFromS3`, `buildS3Key`.

#### 4. Visualização de Documentos pelo Supervisor
- **DocumentViewerModal:** Novo componente modal para visualizar documentos e fotos de dentro do checklist.
- **Suporte a imagens:** Zoom, pan e controles visuais para análise de fotos.
- **Suporte a PDFs:** Embedding via iframe para documentos PDF.
- **Resolução de S3 keys:** URLs presigned geradas automaticamente para objetos S3.
- **Integração no checklist-item-detail:** Botões "Expandir" para imagens e "Visualizar Documento" para outros arquivos.

#### 5. Validação de Documentos por IA (Gemini)
- **Análise automática:** Ao fazer upload, o documento pode ser analisado pela IA para verificar legibilidade e tipo correto.
- **Controle por workspace:** SuperAdmin habilita/desabilita a feature por workspace e subworkspaces.
- **Modo warn/block:** Admin do workspace escolhe se a IA apenas avisa (warn) ou bloqueia o envio (block).
- **Herança de configuração:** Subworkspaces herdam configuração do workspace pai quando habilitado.
- **Novos endpoints:**
  - `GET/PUT /api/workspaces/[id]/doc-validation-config` - Configurar validação de documentos
  - `GET /api/workspaces/doc-validation-status` - Status efetivo da validação
  - `POST /api/ai/validate-document` - Validar documento via Gemini

#### 6. Melhorias na Experiência do Produtor (Save State)
- **Loading overlay:** Tela semi-transparente com spinner durante operações de salvamento, bloqueando interação.
- **Navegação bloqueada:** Botões Anterior/Próximo desabilitados enquanto está salvando.
- **Feedback visual:** Botão de salvar com estados visuais (salvando, sucesso, erro) com cores distintas.
- **AI validation feedback:** Banners de aviso ou bloqueio após upload de documentos validados por IA.

#### 7. Preenchimento Interno Type-Aware (Audit Panel)
- **Inputs dinâmicos:** "Preencher Internamente" agora adapta a interface ao tipo do item:
  - Escolha única (radio buttons)
  - Múltipla escolha (checkboxes)
  - Dropdown (select)
  - Data (date picker)
  - Arquivo (upload com integração S3)
  - Texto/Texto Longo (input/textarea)
  - Número (input numérico)
- **Quantidade e observação:** Campos opcionais quando habilitados no template.
- **Upload de arquivos:** Integração direta com S3 no painel de auditoria.

### 🔧 Melhorias Técnicas
- **Novos campos no Workspace (Prisma):**
  - `aiDocValidationEnabled` - Habilita validação IA de documentos
  - `aiDocValidationEnabledForSubs` - Permite subworkspaces usarem a validação
  - `aiDocValidationMode` - Modo de comportamento (`warn` ou `block`)
- **Novo pacote `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`**
- **Novo arquivo `lib/s3.ts`** com client S3 e funções utilitárias
- **Nova página `app/[locale]/dashboard/subworkspaces/page.tsx`**
- **Novo componente `components/modals/DocumentViewerModal.tsx`**
- **Autorização expandida:** ADMINs agora podem criar subworkspaces e usuários dentro de sua hierarquia
- **API de usuários expandida:** GET retorna usuários de subworkspaces; POST permite criação em subworkspaces do admin

### 🌐 Internacionalização
- Chaves i18n adicionadas para todas as novas funcionalidades em pt-BR, en e es
- Correção de chaves duplicadas `modals.partialFinalize` em en.json e es.json
- Novas chaves: `common.dismiss`, `common.name`, `common.password`, `audit.uploadFile`, `checklistDetail.expandView`, `checklistDetail.viewDocument`, `checklistManagement.correction`, `checklistManagement.completion`
- Total de 611 chaves sincronizadas entre os 3 locales

### 🐛 Correções
- **i18n duplicata corrigida:** `modals.partialFinalize` estava definido duas vezes em en.json e es.json (segunda definição sobrescrevia a primeira com chaves diferentes)
- **Chaves i18n faltantes:** 8 chaves adicionadas que estavam referenciadas no código mas ausentes nos arquivos de tradução

---

## [V 0.4.1] - 2026-02-05

### 🔐 Configuração ESG por Workspace

Esta versão introduz a configuração individual de integração ESG/CAR por workspace, removendo tokens globais do sistema.

### ✨ Novas Funcionalidades
- **Configuração ESG por Workspace:** Cada workspace agora configura seus próprios tokens de API para integração ESG/CAR.
- **Modal de Configuração ESG:** SuperAdmins podem acessar configuração de integração socioambiental diretamente na página de workspaces.
- **Herança de Configuração:** Subworkspaces podem usar a integração ESG do workspace pai (quando habilitado).
- **Controle Granular:** Workspaces pais podem habilitar/desabilitar acesso ESG para seus subworkspaces.
- **Validação de País:** Análise ESG só é disponibilizada para produtores brasileiros (CPF) e propriedades no Brasil (CAR).
- **Botões Condicionais:** Botões de análise ESG só aparecem quando a integração está habilitada e configurada.

### 🔧 Melhorias Técnicas
- **Novos campos no Workspace:**
  - `carApiKey` - Token da API CAR
  - `carCooperativeId` - ID da Cooperativa
  - `esgApiEnabled` - Habilita integração ESG
  - `esgEnabledForSubworkspaces` - Permite subworkspaces usarem a integração
- **Novas APIs:**
  - `GET/PUT /api/workspaces/[id]/esg-config` - Configurar integração ESG (SuperAdmin)
  - `GET /api/workspaces/esg-status` - Verificar status de ESG para o workspace atual
- **Refatoração de APIs:**
  - `/api/integration/esg/producer` - Agora busca tokens do workspace
  - `/api/integration/esg/property` - Agora busca tokens do workspace
  - `/api/integration/car` - Agora busca tokens do workspace

### 🐛 Correções
- **ESG não funcionava em subworkspaces:** Corrigido erro de configuração que impedia análise socioambiental.
- **Tokens globais removidos:** Migrado de SystemConfig global para configuração por workspace.
- **Navegação de checklists de subworkspaces:** Botão Eye agora navega corretamente para visualização read-only.
- **Histórico de produtores:** Workspace pai agora consegue ver histórico de checklists de produtores de subworkspaces.
- **Checklists filhos/netos de subworkspaces:** Exibem apenas botão Eye (read-only) quando vêm de subworkspaces.
- **URLs sem locale:** Corrigidas URLs em `ChildChecklistsAccordion`, `checklist-management-client` e `ProducerHistory`.
- **Strings hardcoded:** Corrigidas strings em português que não usavam sistema de tradução.

---

## [V 0.4.0] - 2026-02-05

### 🚀 Subworkspaces, Atribuição de Templates e Pré-preenchimento

Esta versão introduz o sistema de subworkspaces para segmentação organizacional, atribuição de templates, pré-preenchimento de checklists e correções importantes de bugs.

### ✨ Novas Funcionalidades
- **Subworkspaces:** Workspaces podem ter subworkspaces vinculados. Cada subworkspace tem logo, nome, CNPJ próprios e controla seus usuários.
- **Atribuição de Templates:** Templates do workspace pai podem ser atribuídos a subworkspaces específicos. Templates atribuídos ficam disponíveis como somente leitura nos subworkspaces (podem ser copiados mas não editados).
- **Painel de Atribuição:** Nova seção na edição de templates para selecionar quais subworkspaces terão acesso ao template.
- **Hierarquia de Dados:** Workspace pai visualiza dados de todos os subworkspaces em tempo real. Subworkspaces não se veem entre si.
- **Pré-preenchimento de Checklist:** Ao criar novo checklist, opção de carregar respostas aprovadas de um checklist anterior (mesmo template, finalizado).
- **Coluna de Origem em Checklists:** Grid de checklists exibe coluna "Origem" com nome do workspace quando há subworkspaces ativos.
- **Coluna de Origem em Templates:** Grid de templates exibe coluna "Origem" para usuários em subworkspaces (Próprio vs Workspace Pai).
- **Filtro de Origem de Templates:** Dropdown para filtrar templates por origem (todos, próprios, do workspace pai).
- **Indicador Read-Only:** Ícone de cadeado 🔒 exibido para templates que são somente leitura (do workspace pai).
- **Filtro por Subworkspace:** Dropdown para filtrar checklists por workspace específico.
- **Hierarquia Recursiva de Checklists:** Grid exibe até 4 níveis de profundidade (pai → filho → neto → bisneto).
- **Drill-down de Usuários:** SuperAdmin pode criar usuários diretamente em subworkspaces com seleção hierárquica (Workspace → Subworkspace).
- **Abas de Produtores (Workspace Pai):** Nova interface com abas "Meus Produtores" e "Subworkspaces" para visualizar produtores de subworkspaces em modo somente leitura.
- **Abas de Checklists (Workspace Pai):** Nova interface com abas "Meus Checklists" e "Subworkspaces" para visualizar checklists de subworkspaces em modo somente leitura.
- **Seletor de Workspace no Portal:** Produtores que pertencem a múltiplos workspaces/subworkspaces agora veem um seletor após login para escolher qual ambiente acessar.
- **Alternador de Workspace no Portal:** Dropdown no cabeçalho do portal permite alternar entre workspaces sem fazer logout.

### 🔧 Melhorias Técnicas
- **Modelo TemplateAssignment:** Nova tabela de junção many-to-many para atribuição de templates a subworkspaces.
- **Modelo Workspace Expandido:** Novos campos `cnpj`, `parentWorkspaceId`, `hasSubworkspaces`.
- **APIs de Subworkspaces:**
  - `GET/POST /api/workspaces/[id]/subworkspaces` - Listar/criar subworkspaces
  - `POST /api/workspaces/[id]/toggle-subworkspaces` - Ativar/desativar funcionalidade
- **APIs de Atribuição de Templates:**
  - `GET /api/templates/[id]/assignments` - Listar subworkspaces atribuídos
  - `POST /api/templates/[id]/assignments` - Atualizar atribuições
- **APIs de Pré-preenchimento:**
  - `GET /api/checklists/available-for-prefill` - Lista checklists finalizados para pré-preencher
  - `GET /api/checklists/[id]/responses-for-copy` - Busca respostas aprovadas para cópia
- **APIs de Scope para Multi-tenancy:**
  - `GET /api/producers?scope=own|subworkspaces` - Filtra produtores por escopo (próprios ou de subworkspaces)
  - `GET /api/checklists?scope=own|subworkspaces` - Filtra checklists por escopo
  - `GET /api/portal/checklists?workspaceId=xxx` - Filtra checklists do portal por workspace selecionado
  - `GET /api/me` - Retorna `hasSubworkspaces` e `parentWorkspaceId` do workspace do usuário
- **Componente `TemplateSubworkspaceAssignment`:** Painel UI para gerenciar atribuições de templates.
- **Função `getSubworkspaceFilter()`:** Filtro automático que inclui dados do workspace pai e seus subworkspaces.
- **Função `getVisibleWorkspaceIds()`:** Retorna IDs de workspaces visíveis para o usuário.
- **API GET Templates Expandida:** Retorna templates próprios + atribuídos para subworkspaces, com flag `isReadOnly`.
- **Portal Multi-workspace:** Portal do produtor agora suporta seleção e alternância entre múltiplos workspaces.

### 🗃️ Migrações de Banco de Dados
- `20260202220000_add_subworkspaces` - Adiciona campos de subworkspace à tabela workspaces
- `template_assignments` - Nova tabela para atribuições de templates a subworkspaces
- `20260205170000_slug_partial_unique_indexes` - Implementa unique indexes parciais para slug (por tipo de workspace)
- `20260205171000_cpf_unique_per_workspace` - CPF único por workspace (não globalmente)

### 🐛 Correções (Bugfixes)
- **CAR não obrigatório para Brasil:** Corrigido cadastro de produtor BR que exigia CAR incorretamente. Agora apenas CPF é obrigatório.
- **Checklists netos não apareciam no grid:** Correção da query e UI para exibir toda a hierarquia de checklists.
- **Indentação visual de níveis:** Cada nível de filho tem indentação progressiva para clareza visual.
- **Estado de subworkspaces no modal:** Modal agora usa estado da API para exibir botão correto (Habilitar/Desabilitar).
- **Validação de logoUrl vazia:** Corrigido erro Zod ao criar subworkspace sem logo.
- **CPF único por workspace:** CPF agora é único apenas dentro do mesmo workspace, permitindo o mesmo produtor em workspaces diferentes.
- **Slug único por tipo de workspace:** Workspaces pai e subworkspaces podem ter o mesmo slug (partial unique indexes).
- **Templates do pai não editáveis:** Templates atribuídos do workspace pai são exibidos como read-only em subworkspaces.
- **Campos vazios no cadastro de produtor:** Corrigido erro de validação quando email/telefone/cidade/estado são enviados como strings vazias.
- **Portal de checklists multi-workspace:** Produtor consegue ver seus checklists de todos os workspaces onde está cadastrado.

---

## [V 0.3.0] - 2026-02-02

### 🚀 Multi-tenancy e Autenticação Customizada

Esta versão introduz suporte completo a multi-tenancy com workspaces isolados e sistema de autenticação proprietário.

### ✨ Novas Funcionalidades
- **Workspaces (Multi-tenancy):** Sistema de organizações isoladas com dados segregados (produtores, templates, checklists, usuários).
- **Autenticação NextAuth:** Substituição do Clerk por autenticação customizada com NextAuth.js e bcrypt.
- **Roles Hierárquicos:** SUPERADMIN (global), ADMIN (workspace), SUPERVISOR, PRODUCER.
- **Gerenciamento de Usuários:** Tela completa para CRUD de usuários por workspace. ADMINs podem criar outros ADMINs no mesmo workspace.
- **Gerenciamento de Workspaces:** Tela exclusiva SuperAdmin para criar/editar organizações.
- **Logo Dinâmica:** Dashboard exibe logo e nome do workspace do usuário logado.
- **Primeiro Acesso:** Usuários novos são obrigados a alterar senha no primeiro login.
- **Toggle de Senha:** Botão "olhinho" para mostrar/esconder senha nas telas de login e alteração.
- **Menu Usuários para ADMIN:** Menu de gerenciamento de usuários visível para ADMINs de workspace (não apenas SUPERADMIN).

### 🔧 Melhorias Técnicas
- **Modelo Workspace:** Nova entidade com `name`, `slug`, `logoUrl`.
- **workspaceId em Entidades:** Producers, Templates, Checklists, Users, AuditLogs agora pertencem a um workspace.
- **CPF por Workspace:** Constraint `@@unique([cpf, workspaceId])` permite mesmo CPF em workspaces diferentes.
- **Session com Workspace:** Token JWT inclui `workspaceId` e `role` para controle de acesso.
- **Middleware Atualizado:** Integração next-intl + NextAuth com redirecionamentos inteligentes.
- **APIs Segregadas:** Todas as APIs aplicam filtro de workspace automaticamente.
- **helpers `workspace-context.ts`:** Funções `getWorkspaceFilter`, `hasWorkspaceAccess`, `isAdmin`, `isSuperAdmin`.

### 🗃️ Migrações de Banco de Dados
- `20260202200000_add_workspaces_and_auth` - Cria tabela workspaces e adiciona campos de auth
- `20260202210000_cpf_unique_per_workspace` - Altera constraint de CPF para ser por workspace

### 📁 Novos Arquivos
- `lib/auth.ts` - Configuração NextAuth com Credentials provider
- `lib/workspace-context.ts` - Helpers de controle de acesso
- `app/api/auth/[...nextauth]/route.ts` - Handler NextAuth
- `app/api/users/route.ts` - CRUD de usuários
- `app/api/users/[id]/route.ts` - Operações em usuário específico
- `app/api/users/change-password/route.ts` - Alteração de senha
- `app/api/workspaces/route.ts` - CRUD de workspaces
- `app/api/workspaces/[id]/route.ts` - Operações em workspace específico
- `app/[locale]/dashboard/users/page.tsx` - Gerenciamento de usuários
- `app/[locale]/dashboard/workspaces/page.tsx` - Gerenciamento de workspaces
- `app/[locale]/dashboard/change-password/page.tsx` - Tela de alteração de senha
- `components/providers/session-provider.tsx` - Provider do NextAuth

### ⚠️ Breaking Changes
- **Clerk removido:** Todas as referências ao Clerk foram substituídas por NextAuth.
- **Variáveis de ambiente:** Remover variáveis `CLERK_*`, adicionar `AUTH_SECRET` e `NEXTAUTH_URL`.
- **Onboarding simplificado:** Fluxo de primeiro acesso agora é apenas alteração de senha.

---

## [V 0.1.0] - 2026-02-02

### ✨ Novas Funcionalidades
- **Suporte Internacional de Produtores:** Cadastro de produtores de múltiplos países (Brasil, Argentina, EUA).
- **Documentos Dinâmicos por País:** CPF para BR, DNI para AR, SSN para US - campos ajustam automaticamente.
- **Registro Agrícola Flexível:** CAR (BR), RENSPA (AR), FSA (US) com validações específicas.
- **Upload de Propriedades:** Suporte a arquivos KML e GeoJSON para definir limites de propriedade.
- **Desenho de Propriedade:** Para países sem CAR, usuário pode desenhar o polígono da propriedade diretamente no mapa.
- **Hierarquia Propriedade/Talhões:** Distinção visual entre fazenda (contorno branco) e talhões (amarelo).

### 🔧 Melhorias Técnicas
- **Novo Schema Prisma:** Modelos `ProducerIdentifier` e `AgriculturalRegistry` para dados internacionais.
- **Campo `type` em PropertyField:** Diferencia `property` (fazenda) de `field` (talhão).
- **Configuração Centralizada:** `lib/countries.ts` com regras de validação por país.
- **Componentes Reutilizáveis:** `CountrySelector` e `GeoFileUpload` para formulários internacionais.
- **ESG Condicional:** Análise socioambiental disponível apenas para produtores brasileiros.

### 🐛 Correções (Bugfixes)
- **DNI não exibido ao editar:** Correção de mapeamento `idValue` vs `value` no ProducerForm.
- **PropertyMapInput para não-BR:** Upload e desenho agora funcionam corretamente.
- **Identificação na tabela:** Coluna mostra DNI/SSN para produtores internacionais.
- **Traduções hardcoded:** Strings em português no PropertyMapInput agora traduzidas.

---

## [V 0.0.9] - 2026-02-02

### ✨ Novas Funcionalidades
- **Internacionalização (i18n):** Suporte completo a múltiplos idiomas usando `next-intl` com roteamento baseado em prefixo de URL (`/pt-BR/`, `/en/`, `/es/`).
- **Idiomas Suportados:** Português do Brasil (padrão), Inglês e Espanhol.
- **Tradução Completa:** Dashboard, Portal do Produtor, Formulário Público de Checklist, Modais e Componentes traduzidos.
- **Gemini 3 Flash:** Atualização do modelo de IA para `gemini-3-flash-preview` com inteligência nível Pro e velocidade Flash.

### 🔧 Melhorias Técnicas
- **Arquivos de Mensagens:** Estrutura de tradução em `messages/pt-BR.json`, `messages/en.json` e `messages/es.json`.
- **Hook useTranslations:** Componentes utilizam `useTranslations()` para strings traduzíveis.
- **Hook useFormatter:** Formatação de datas e números respeitando o locale.
- **Fallback de Modelo IA:** Se Gemini 3 Flash falhar, fallback automático para `gemini-1.5-flash`.

### 🐛 Correções (Bugfixes)
- **Portal do Produtor:** Correção de função `getPortalStatusInfo` não definida.
- **Componente ChecklistItem:** Correção de `t is not defined` por falta de inicialização do hook.
- **Prompt de IA:** Inserção automática do prompt `analyze-checklist-item` no banco de dados.

---

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
