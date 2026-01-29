'use client';

import { useState } from 'react';
import { X, CheckCircle2, ListRestart, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartialFinalizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: {
        createCorrection: boolean;
        createCompletion: boolean;
        generateActionPlan: boolean
    }) => Promise<void>;
    isPending: boolean;
}

export default function PartialFinalizeModal({ isOpen, onClose, onConfirm, isPending }: PartialFinalizeModalProps) {
    const [createCorrection, setCreateCorrection] = useState(true);
    const [createCompletion, setCreateCompletion] = useState(true);
    const [generateActionPlan, setGenerateActionPlan] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finalização Parcial</h2>
                        <p className="text-sm text-slate-500 font-medium">Capture um status e crie ações corretivas</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-4">
                    <div
                        onClick={() => setCreateCorrection(!createCorrection)}
                        className={cn(
                            "p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-start gap-4",
                            createCorrection ? "border-red-600 bg-red-50/30" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                    >
                        <div className={cn("p-3 rounded-2xl", createCorrection ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400")}>
                            <ListRestart size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className={cn("font-bold text-sm", createCorrection ? "text-red-900" : "text-slate-700")}>Gerar Checklist de Correção</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                Inclui apenas os itens que foram <strong>rejeitados</strong> nesta análise.
                            </p>
                        </div>
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1",
                            createCorrection ? "border-red-600 bg-red-600" : "border-slate-200"
                        )}>
                            {createCorrection && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                    </div>

                    <div
                        onClick={() => setCreateCompletion(!createCompletion)}
                        className={cn(
                            "p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-start gap-4",
                            createCompletion ? "border-indigo-600 bg-indigo-50/30" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                    >
                        <div className={cn("p-3 rounded-2xl", createCompletion ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                            <ListRestart size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className={cn("font-bold text-sm", createCompletion ? "text-indigo-900" : "text-slate-700")}>Gerar Checklist de Complemento</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                Inclui os itens que <strong>não foram respondidos</strong> ou estão pendentes.
                            </p>
                        </div>
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1",
                            createCompletion ? "border-indigo-600 bg-indigo-600" : "border-slate-200"
                        )}>
                            {createCompletion && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                    </div>

                    <div
                        onClick={() => setGenerateActionPlan(!generateActionPlan)}
                        className={cn(
                            "p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-start gap-4",
                            generateActionPlan ? "border-emerald-600 bg-emerald-50/30" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                    >
                        <div className={cn("p-3 rounded-2xl", generateActionPlan ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className={cn("font-bold text-sm", generateActionPlan ? "text-emerald-900" : "text-slate-700")}>Gerar Plano de Ação (IA)</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                Inteligência Artificial analisará as falhas e criará um guia de correção.
                            </p>
                        </div>
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1",
                            generateActionPlan ? "border-emerald-600 bg-emerald-600" : "border-slate-200"
                        )}>
                            {generateActionPlan && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50/50 flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm({ createCorrection, createCompletion, generateActionPlan })}
                        disabled={isPending || (!createCorrection && !createCompletion)}
                        className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="animate-spin" size={18} /> : "Finalizar Parcial"}
                    </button>
                </div>
            </div>
        </div>
    );
}
