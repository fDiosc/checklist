'use client';

import React, { useState } from 'react';
import { X, Sparkles, Layers, ListRestart, Languages, Rocket, Zap, Bug, LayoutList, BarChart3, FileText, Settings, Smartphone, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const releases = [
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
