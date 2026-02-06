# Documento de Negócio & Implementação
## Cadastro Internacional de Produtores e Propriedades

> **Status:** ✅ IMPLEMENTADO (Fase 1 Completa)
> **Última atualização:** 2026-02-06

---

## Integração com Multi-tenancy e Subworkspaces

A partir da versão 0.3.0, o cadastro de produtores está integrado ao sistema de multi-tenancy.
A versão 0.4.0 adiciona suporte a subworkspaces.
A versão 0.4.1 adiciona configuração de ESG por workspace.
A versão 0.5.0 adiciona integração S3, validação de documentos por IA, gestão de subworkspaces por admin, e melhorias de UX.
A versão 0.5.1 adiciona UI de configuração de IA, melhorias no viewer de documentos, requestArtifact universal e correções:

- **Segregação por Workspace:** Cada produtor pertence a um workspace específico
- **CPF/DNI por Workspace:** O mesmo documento pode existir em workspaces diferentes
- **Configuração por País:** Regras de país são globais, mas dados são por workspace
- **ESG por País:** Análise ESG disponível apenas para BR, independente do workspace
- **ESG por Workspace:** Cada workspace configura suas próprias credenciais CAR/ESG
- **Herança de ESG:** Subworkspaces podem herdar configuração ESG do workspace pai
- **Subworkspaces:** Produtores de subworkspaces são visíveis pelo workspace pai
- **Filtro por Origem:** Grids permitem filtrar por subworkspace específico
- **AWS S3:** Armazenamento de documentos e fotos migrado para S3 (bucket pocs-merxlabs)
- **Validação IA:** Documentos validados por Gemini com controle por workspace (warn/block)
- **Admin Subworkspaces:** ADMINs podem criar e gerenciar subworkspaces e seus usuários
- **UI Config IA:** SuperAdmin e Admin podem configurar validação IA via interface gráfica
- **requestArtifact universal:** Upload de documentos aparece sempre quando habilitado, em todos os tipos de item
- **Template View-Only:** Ícone de olho para visualizar templates já utilizados
- **i18n Completa:** 625+ chaves sincronizadas entre pt-BR, en e es

---

## Status da Implementação

### ✅ Concluído
- [x] Schema Prisma com modelos `ProducerIdentifier` e `AgriculturalRegistry`
- [x] Configuração centralizada em `lib/countries.ts` (BR, AR, US)
- [x] Componente `CountrySelector` para seleção de país
- [x] Componente `GeoFileUpload` para upload de KML/GeoJSON
- [x] `ProducerForm` refatorado para campos dinâmicos por país
- [x] APIs de produtor atualizadas (POST, PATCH, GET)
- [x] `PropertyMapInput` com upload e desenho para países não-BR
- [x] Hierarquia propriedade (branco) vs talhões (amarelo)
- [x] Identificação exibida corretamente na tabela de produtores
- [x] ESG desativado para produtores internacionais
- [x] Traduções em pt-BR, en, es
- [x] **Multi-tenancy:** Produtores segregados por workspace
- [x] **CPF único por workspace:** Mesmo CPF pode existir em workspaces diferentes
- [x] **ESG por Workspace:** Credenciais CAR/ESG configuradas por workspace (v0.4.1)
- [x] **Herança de ESG:** Subworkspaces podem usar credenciais do workspace pai
- [x] **AWS S3:** Integração com bucket pocs-merxlabs para armazenamento de documentos (v0.5.0)
- [x] **Validação de Documentos por IA:** Gemini analisa legibilidade e tipo de documentos (v0.5.0)
- [x] **Admin Subworkspaces:** ADMINs podem criar e gerenciar subworkspaces e usuários (v0.5.0)
- [x] **i18n 611 chaves:** Todas as chaves sincronizadas entre os 3 locales (v0.5.0)

### ⏳ Próximas Fases
- [ ] Integração RENSPA (Argentina)
- [ ] Catastros provinciais

---

1. Contexto

O Checklist OK atualmente é orientado ao modelo brasileiro (CPF + CAR).
Com a expansão para outros países (Argentina, EUA, Europa), torna-se necessário:

Suportar identificação por país

Permitir cadastro geográfico manual (desenho ou upload)

Não depender, neste momento, de integrações governamentais externas

A abordagem inicial será flexível, escalável e incremental.

2. Objetivo do Projeto

Implementar um modelo internacional que permita:

Cadastro do produtor por país

Definição de documento principal de identificação

Cadastro de propriedades via:

Upload (KML / GeoJSON)

Desenho no mapa

Associação opcional a registros agrícolas locais

Sem impacto no fluxo atual do Brasil.

3. Escopo Inicial (Fase 1)
Incluído

✅ Brasil (modelo atual – sem mudanças)
✅ Argentina (primeiro país internacional)
✅ Upload/desenho de propriedades fora do BR
✅ Cadastro dinâmico por país
✅ Validações básicas
✅ Padronização de dados

Fora do Escopo (por enquanto)

❌ Integrações com catastro
❌ Validação governamental automática
❌ Consulta a bases públicas
❌ Certificação ambiental automática

4. Regras de Negócio
4.1 Seleção de País

No cadastro do produtor:

Campo obrigatório:

País do produtor


Exemplos:

🇧🇷 Brasil

🇦🇷 Argentina

🇺🇸 EUA

🇪🇺 Europa (por país)

Este campo define:

Campos obrigatórios

Regras de validação

Tipos de documento aceitos

4.2 Identificação do Produtor

Cada produtor terá:

1️⃣ Documento Principal (Obrigatório)

Usado para login e identificação no portal

País	Tipo
BR	CPF
AR	DNI
US	SSN / ITIN (ou alternativo)
EU	NIF / ID nacional

Campo:

Número de Identificação Principal


Obrigatório em todos os países.

2️⃣ Número Agrícola / Produtivo (Opcional)

Registro ligado à atividade rural, quando existir

País	Exemplo
BR	CAR / CCIR
AR	RENSPA
US	FSA Farm ID
EU	Registros locais

Campo:

Número Agrícola (opcional)


Pode ser usado:

Para busca

Para integração futura

Para validações comerciais

4.3 Cadastro da Propriedade (Não-BR)
Regra Geral

Quando país ≠ BR:

O usuário poderá:

✅ Upload:

KML

GeoJSON

OU

✅ Desenhar no mapa (mesmo modelo de talhão)

Fluxo

Usuário cria propriedade

Escolhe:

Upload arquivo

Desenhar no mapa

Sistema gera polígono padrão

Calcula área

Salva geometria

Regra Brasil (mantida)

Quando país = BR:

➡️ Continua usando CAR como principal referência

5. Experiência do Usuário (UX)
5.1 Cadastro do Produtor
Etapa 1 – Dados Básicos
Nome
País
Tipo: Pessoa Física / Jurídica

Etapa 2 – Identificação

Dinâmica por país:

Exemplo: Argentina
DNI (obrigatório)
RENSPA (opcional)

Exemplo: Brasil
CPF (obrigatório)
CAR (opcional)

Etapa 3 – Propriedades

Para não-BR:

[ ] Upload arquivo
[ ] Desenhar no mapa

6. Modelo de Dados (Implementação)
6.1 Tabela: producers
id
name
country_code
subject_type      -- person | org
created_at

6.2 Tabela: producer_identifiers
id
producer_id
id_type            -- cpf, dni, ssn, vat, etc
id_value
is_primary
created_at

6.3 Tabela: agricultural_registries
id
producer_id
registry_type      -- car, renspa, fsa, etc
registry_value
country_code
created_at

6.4 Tabela: properties
id
producer_id
name
country_code
area_ha
geometry           -- GeoJSON
source_type         -- upload | draw | integration
created_at

6.5 Tabela: property_files
id
property_id
file_type           -- kml, geojson
file_url
uploaded_at

7. Validações Técnicas
7.1 Documento Principal
Brasil – CPF

Algoritmo módulo 11

Argentina – DNI

7 a 9 dígitos numéricos

EUA – SSN (opcional)

9 dígitos

Europa

Por país (futuro)

7.2 Arquivos Geográficos

Aceitos:

Tipo	Validação
KML	Schema + geometria
GeoJSON	RFC 7946

Regras:

Apenas Polygon / MultiPolygon

CRS convertido para WGS84

Limite máximo de área configurável

8. API / Backend – Ajustes
8.1 Criação de Produtor
POST /api/producers


Payload:

{
  "name": "Juan Perez",
  "country": "AR",
  "identifiers": [
    {
      "type": "dni",
      "value": "32456789",
      "primary": true
    }
  ],
  "agriculturalRegistry": {
    "type": "renspa",
    "value": "02-123456"
  }
}

8.2 Upload de Propriedade
POST /api/properties/upload

multipart/form-data
file: property.kml

8.3 Desenho
POST /api/properties/draw

{
  "geometry": {...}
}

9. Governança e Compliance
Responsabilidade do Usuário

Para países fora do BR:

O usuário declara que os dados e geometrias são corretos.

Termo:

Declaro que as informações prestadas são verdadeiras


Aceite obrigatório.

Auditoria

Campos:

created_by
source_type
uploaded_file


Mantêm rastreabilidade.

10. Roadmap Evolutivo
Fase 1 (Concluída ✅)

✅ Upload KML/GeoJSON
✅ Desenho de propriedade no mapa
✅ Argentina (DNI + CUIT + RENSPA)
✅ Modelo de dados flexível
✅ Configuração centralizada por país
✅ Hierarquia propriedade/talhões
✅ ESG condicional (apenas BR)
✅ Traduções i18n

Fase 2 (Planejada)

⬜ Integração RENSPA automática
⬜ Catastros provinciais argentinos
⬜ FSA EUA

Fase 3 (Futuro)

⬜ Validação ambiental internacional
⬜ Deforestation-free verification
⬜ APIs governamentais

11. Benefícios Estratégicos
Produto

✅ Expansão LATAM / Global
✅ Baixo custo inicial
✅ Sem dependência estatal
✅ Time-to-market rápido

Comercial

✅ Onboarding rápido
✅ Menos fricção
✅ Menos rejeição
✅ Escalabilidade

12. Riscos e Mitigações
Risco	Mitigação
Dados imprecisos	Termo + auditoria
Polígonos ruins	Validação geométrica
Fraude	KYC futuro
Escalabilidade	Schema flexível