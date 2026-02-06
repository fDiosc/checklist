'use client';

import React, { useState } from 'react';
import { X, Sparkles, Layers, ListRestart, Languages, Rocket, Zap, Bug, LayoutList, BarChart3, FileText, Settings, Smartphone, EyeOff, Globe, MapPin, Upload, Palette, Building2, Users, Shield, Network, ClipboardCopy, GitBranch, Filter, Share2, Lock, HardDrive, Eye, ScanSearch, Loader2, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const releases = [
    {
        version: "V 0.5.0",
        date: "06 de Fevereiro, 2026",
        features: [
            {
                title: "Gestão de Subworkspaces (Admin)",
                description: "ADMINs agora podem criar subworkspaces, gerenciar usuários e visualizar toda a hierarquia.",
                icon: Network,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Integração AWS S3",
                description: "Documentos e fotos armazenados no S3 com estrutura organizada por workspace e checklist.",
                icon: HardDrive,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Visualizador de Documentos",
                description: "Supervisores podem ver fotos e documentos de dentro do checklist em modal com zoom e navegação.",
                icon: Eye,
                color: "text-purple-500",
                bg: "bg-purple-50/50"
            },
            {
                title: "Validação de Documentos por IA",
                description: "Gemini analisa legibilidade e tipo dos documentos enviados. Modo aviso ou bloqueio configurável.",
                icon: ScanSearch,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "UX de Salvamento Melhorada",
                description: "Loading overlay, navegação bloqueada durante save e feedback visual completo para o produtor.",
                icon: Loader2,
                color: "text-red-500",
                bg: "bg-red-50/50"
            },
            {
                title: "Preenchimento Interno Type-Aware",
                description: "Preencher Internamente agora adapta o input ao tipo: dropdown, múltipla escolha, arquivo, data, etc.",
                icon: PenTool,
                color: "text-slate-500",
                bg: "bg-slate-50/50"
            }
        ],
        bugfixes: [
            { text: "Checklist pai não pode mais ser finalizado se houver filhos em aberto." },
            { text: "Chaves i18n duplicadas corrigidas em en.json e es.json (modals.partialFinalize)." },
            { text: "8 chaves de tradução faltantes adicionadas nos 3 locales." },
            { text: "611 chaves de tradução sincronizadas entre pt-BR, en e es." }
        ]
    },
    {
        version: "V 0.4.1",
        date: "05 de Fevereiro, 2026",
        features: [
            {
                title: "Configuração ESG por Workspace",
                description: "Cada workspace configura seus próprios tokens para integração socioambiental ESG/CAR.",
                icon: Shield,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Herança de Configuração",
                description: "Subworkspaces podem herdar configuração ESG do workspace pai quando habilitado.",
                icon: Network,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Controle Granular",
                description: "SuperAdmins controlam quais workspaces e subworkspaces têm acesso à análise ESG.",
                icon: Settings,
                color: "text-purple-500",
                bg: "bg-purple-50/50"
            }
        ],
        bugfixes: [
            { text: "ESG agora funciona corretamente em subworkspaces." },
            { text: "Tokens de API migrados de configuração global para por workspace." },
            { text: "Validação de país para análise ESG (apenas Brasil)." }
        ]
    },
    {
        version: "V 0.4.0",
        date: "05 de Fevereiro, 2026",
        features: [
            {
                title: "Subworkspaces",
                description: "Crie subworkspaces dentro de um workspace. Cada um com logo, nome e CNPJ próprios.",
                icon: Network,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Atribuição de Templates",
                description: "Compartilhe templates do workspace pai com subworkspaces específicos (somente leitura).",
                icon: Share2,
                color: "text-purple-500",
                bg: "bg-purple-50/50"
            },
            {
                title: "Pré-preenchimento",
                description: "Carregue respostas de um checklist anterior ao criar um novo. Economize tempo na auditoria.",
                icon: ClipboardCopy,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Hierarquia Expandida",
                description: "Grid de checklists agora exibe até 4 níveis de profundidade (pai, filho, neto, bisneto).",
                icon: GitBranch,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Filtro por Origem",
                description: "Filtre checklists e templates por workspace de origem quando há subworkspaces ativos.",
                icon: Filter,
                color: "text-red-500",
                bg: "bg-red-50/50"
            },
            {
                title: "Templates Read-Only",
                description: "Templates do workspace pai são exibidos como somente leitura com indicador de cadeado.",
                icon: Lock,
                color: "text-slate-500",
                bg: "bg-slate-50/50"
            }
        ],
        bugfixes: [
            { text: "CAR não é mais obrigatório para produtores brasileiros (apenas CPF)." },
            { text: "Checklists netos e bisnetos agora aparecem corretamente no grid." },
            { text: "Coluna 'Origem' exibida em checklists e templates." },
            { text: "CPF agora é único por workspace, permitindo mesmo produtor em diferentes ambientes." },
            { text: "Campos vazios no cadastro de produtor não causam mais erro de validação." }
        ]
    },
    {
        version: "V 0.3.0",
        date: "02 de Fevereiro, 2026",
        features: [
            {
                title: "Multi-tenancy",
                description: "Workspaces isolados para diferentes organizações com dados completamente segregados.",
                icon: Building2,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Autenticação Própria",
                description: "Sistema de login com email/senha substituindo Clerk. Maior controle e segurança.",
                icon: Shield,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Gerenciamento de Usuários",
                description: "Crie e gerencie usuários por workspace. ADMINs podem criar outros ADMINs, Supervisores e Produtores.",
                icon: Users,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Logo Dinâmica",
                description: "Cada workspace pode ter sua própria logo e nome exibidos no dashboard.",
                icon: Palette,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "Primeiro acesso agora exige alteração de senha para maior segurança." },
            { text: "CPF agora é único apenas dentro do mesmo workspace." },
            { text: "Toggle de mostrar/esconder senha nas telas de login e alteração." }
        ]
    },
    {
        version: "V 0.1.0",
        date: "02 de Fevereiro, 2026",
        features: [
            {
                title: "Produtores Internacionais",
                description: "Cadastro de produtores de múltiplos países com documentos dinâmicos (CPF, DNI, SSN).",
                icon: Globe,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Upload de Propriedades",
                description: "Importe arquivos KML ou GeoJSON para definir limites de propriedade automaticamente.",
                icon: Upload,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Desenho no Mapa",
                description: "Para países sem CAR, desenhe o polígono da propriedade diretamente no mapa.",
                icon: MapPin,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Hierarquia Visual",
                description: "Fazendas em branco, talhões em amarelo. Distinção clara entre propriedade e subdivisões.",
                icon: Palette,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "DNI agora exibido corretamente ao editar produtor argentino." },
            { text: "Identificação correta na tabela de produtores para todos os países." },
            { text: "Análise ESG desativada para produtores internacionais." }
        ]
    },
    {
        version: "V 0.0.9",
        date: "02 de Fevereiro, 2026",
        features: [
            {
                title: "Internacionalização (i18n)",
                description: "Suporte completo a Português, Inglês e Espanhol com roteamento por URL.",
                icon: Languages,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Gemini 3 Flash",
                description: "Modelo de IA atualizado para gemini-3-flash-preview com performance superior.",
                icon: Zap,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Portal Traduzido",
                description: "Portal do produtor e formulário público totalmente traduzidos.",
                icon: Globe,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Status Dinâmicos",
                description: "Labels de status traduzidos automaticamente conforme o idioma selecionado.",
                icon: LayoutList,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "Correção de função getPortalStatusInfo não definida no portal." },
            { text: "Hook useTranslations inicializado corretamente em todos os componentes." },
            { text: "Prompt de IA inserido automaticamente no banco de dados." }
        ]
    },
    {
        version: "V 0.0.8",
        date: "28 de Janeiro, 2026",
        features: [
            {
                title: "Modal de Plano de Ação",
                description: "Nova interface mobile-friendly com popup para visualizar planos de ação do produtor.",
                icon: Smartphone,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Botão Integrado",
                description: "O acesso ao plano de ação fica na barra de navegação, aparece apenas quando há planos.",
                icon: LayoutList,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Scroll Independente",
                description: "Sidebar e área de respostas rolam de forma independente, melhorando a navegação.",
                icon: Layers,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Scrollbars Ocultas",
                description: "Visual mais limpo com barras de rolagem invisíveis mas funcionais.",
                icon: EyeOff,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "Planos de ação agora vinculados ao checklist filho correto, não mais ao pai." },
            { text: "Espaçamento corrigido para não sobrepor barra de navegação." },
            { text: "Interface do produtor simplificada, sem botão de changelog." }
        ]
    },
    {
        version: "V 0.0.7",
        date: "27 de Janeiro, 2026",
        features: [
            {
                title: "Accordion de Derivados",
                description: "Painel colapsável para visualizar checklists filhos com tipo, status, progresso e datas.",
                icon: LayoutList,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Estatísticas no Header",
                description: "Barra de progresso e contagem de aprovados/rejeitados/pendentes no topo da página.",
                icon: BarChart3,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Planos Estruturados",
                description: "Ações individuais com prioridade, prazo, documentos necessários e responsável.",
                icon: FileText,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Prompts por Tipo",
                description: "Sistema flexível de prompts específicos para Correção e Complemento.",
                icon: Settings,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "Cálculo de progresso corrigido: aprovados / total de itens do template." },
            { text: "Accordion de filhos agora inicia colapsado por padrão." },
            { text: "Query de filhos agora inclui tipo, status de respostas e datas." }
        ]
    },
    {
        version: "V 0.0.6",
        date: "27 de Janeiro, 2026",
        features: [
            {
                title: "Sincronização AS-IS",
                description: "Agora as rejeições também são levadas para o checklist pai, mantendo o histórico fiel da auditoria.",
                icon: Zap,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            },
            {
                title: "Tipagem Robusta",
                description: "Novo sistema de identificação no banco de dados para badges de Correção e Complemento 100% precisas.",
                icon: Rocket,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Sidebar Colorida",
                description: "Novo código de cores semântico para itens (Aprovado, Rejeitado, Respondido) facilitando a revisão.",
                icon: Sparkles,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Segurança no Merge",
                description: "Modal de confirmação preventivo ao finalizar checklists com itens pendentes ou rejeitados.",
                icon: ListRestart,
                color: "text-red-500",
                bg: "bg-red-50/50"
            }
        ],
        bugfixes: [
            { text: "Correção de badges de complemento para checklists com muitos itens (PAGR)." },
            { text: "Melhoria na detecção de itens respondidos (ignora valores vazios)." },
            { text: "Ajuste na navegação hierárquica entre checklists filhos e netos." }
        ]
    },
    {
        version: "V 0.0.5",
        date: "27 de Janeiro, 2026",
        features: [
            {
                title: "Plano de Ação com IA",
                description: "Analise falhas automaticamente e receba guias de correção estruturados via Google Gemini.",
                icon: Sparkles,
                color: "text-emerald-500",
                bg: "bg-emerald-50/50"
            },
            {
                title: "Hierarquia Multinível",
                description: "Navegação fluida entre checklists Pai, Filhos e Netos com badges de status.",
                icon: Layers,
                color: "text-indigo-500",
                bg: "bg-indigo-50/50"
            },
            {
                title: "Correção vs. Complemento",
                description: "Fluxos distintos para itens rejeitados e itens pendentes, melhorando o foco do produtor.",
                icon: ListRestart,
                color: "text-red-500",
                bg: "bg-red-50/50"
            },
            {
                title: "Localização Total",
                description: "Interface 100% em Português-BR, incluindo status, tipos de itens e dashboards.",
                icon: Languages,
                color: "text-amber-500",
                bg: "bg-amber-50/50"
            }
        ],
        bugfixes: [
            { text: "Cálculo de itens concluídos no Portal do Produtor." },
            { text: "Sincronização de respostas aprovadas para o checklist pai." },
            { text: "Geração de snapshots (Reports) em finalizações parciais." }
        ]
    }
];

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const activeRelease = releases[activeIdx];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-100/50">
                {/* Header */}
                <div className="px-10 pt-10 pb-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-br from-slate-50 to-white">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">
                                Novidades
                            </span>
                            <span className="text-slate-400 text-xs font-bold">{activeRelease.version}</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">O que mudou?</h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:rotate-90">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-10 py-4 bg-white flex items-center gap-2 border-b border-slate-50 overflow-x-auto no-scrollbar">
                    {releases.map((release, idx) => (
                        <button
                            key={release.version}
                            onClick={() => setActiveIdx(idx)}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeIdx === idx
                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            )}
                        >
                            {release.version}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-10 group/content">
                    {/* Features Grid */}
                    <div key={activeRelease.version} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeRelease.features.map((feature, idx) => (
                            <div key={idx} className="group p-6 rounded-[2rem] border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3", feature.bg, feature.color)}>
                                    <feature.icon size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-2">{feature.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Bugfixes */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
                            <Bug size={120} />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <Zap className="text-amber-400" size={20} fill="currentColor" />
                            <h3 className="font-black text-xs uppercase tracking-[0.2em]">Ajustes e Correções</h3>
                        </div>
                        <ul className="space-y-4">
                            {activeRelease.bugfixes.map((fix, idx) => (
                                <li key={idx} className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                                    <span className="text-[11px] font-bold text-slate-400 leading-relaxed">{fix.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-10 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Rocket size={14} className="text-slate-300" />
                        Versão {activeRelease.version} • {activeRelease.date}
                    </p>
                    <button
                        onClick={onClose}
                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Entendi!
                    </button>
                </div>
            </div>
        </div>
    );
}
