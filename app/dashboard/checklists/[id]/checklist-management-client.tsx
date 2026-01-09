'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Clock, XCircle, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import ChecklistItemDetail from './checklist-item-detail';
import AuditActionPanel from './audit-action-panel';

interface ChecklistManagementClientProps {
    checklist: any;
}

import { useRouter } from 'next/navigation';

export default function ChecklistManagementClient({ checklist }: ChecklistManagementClientProps) {
    const router = useRouter();
    // Local state for responses to allow optimistic updates
    const [responses, setResponses] = useState<any[]>(checklist.responses?.map((r: any) => ({
        ...r,
        // Hydrate AI Suggestion from DB fields
        aiSuggestion: r.aiFlag ? {
            status: r.aiFlag,
            reason: r.aiMessage,
            confidence: r.aiConfidence
        } : null
    })) || []);
    const [selectedItem, setSelectedItem] = useState<{ item: any, response: any } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isInternalFilling, setIsInternalFilling] = useState(false);

    const handleInternalFill = async (data: any) => {
        if (!selectedItem) return;
        const { item } = selectedItem;

        try {
            const res = await fetch(`/api/checklists/${checklist.id}/responses/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, isInternal: true })
            });

            if (!res.ok) throw new Error('Failed to save internal fill');
            const savedResponse = await res.json();

            // Update local state
            setResponses(prev => {
                const idx = prev.findIndex(r => r.itemId === item.id);
                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = savedResponse;
                    return updated;
                }
                return [...prev, savedResponse];
            });

            setSelectedItem(prev => prev ? ({ ...prev, response: savedResponse }) : null);
            setIsInternalFilling(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar preenchimento interno.");
        }
    };

    const handleAnalyzeCurrentItem = async () => {
        if (!selectedItem) return;

        setIsAnalyzing(true);
        const item = selectedItem.item;
        const response = selectedItem.response;

        if (!response || !response.answer) {
            alert("Este item não possui resposta para analisar.");
            setIsAnalyzing(false);
            return;
        }

        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checklistId: checklist.id,
                    itemId: item.id,
                    itemName: item.name,
                    itemDescription: item.description,
                    userAnswer: response.answer,
                    userObservation: response.observation
                })
            });
            const analysis = await res.json();

            if (analysis.error) throw new Error(analysis.error);

            // Update State
            setResponses(prev => {
                const idx = prev.findIndex(r => r.itemId === item.id);
                // If response didn't exist in array (unlikely for currentItem flow), handle graceful?
                // Actually selectedItem.response ensures it exists in our view model logic usually, 
                // but local 'responses' state is the source of truth.
                const updated = [...prev];
                if (idx !== -1) {
                    updated[idx] = {
                        ...updated[idx],
                        aiSuggestion: {
                            status: analysis.status,
                            reason: analysis.reason,
                            confidence: analysis.confidence
                        }
                    };
                }
                return updated;
            });

            // Update Selected Item View
            setSelectedItem(prev => prev ? ({
                ...prev,
                response: {
                    ...prev.response,
                    aiSuggestion: {
                        status: analysis.status,
                        reason: analysis.reason,
                        confidence: analysis.confidence
                    }
                }
            }) : null);

        } catch (e) {
            console.error("Analysis failed", e);
            alert("Falha na análise da IA.");
        }
        setIsAnalyzing(false);
    };

    const updateResponseStatus = async (itemId: string, status: string, reason: string | null = null, aiSuggestion: any = null) => {
        // Optimistic Update Snapshot
        const snapshotResponses = [...responses];

        // Apply Optimistic Update
        setResponses(prev => {
            const existingIdx = prev.findIndex(r => r.itemId === itemId);
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    status,
                    rejectionReason: reason
                };
                return updated;
            } else {
                return [...prev, { itemId, checklistId: checklist.id, status, rejectionReason: reason }];
            }
        });

        // Update selected item view
        if (selectedItem?.item.id === itemId) {
            setSelectedItem(prev => prev ? ({
                ...prev,
                response: { ...prev.response, status, rejectionReason: reason }
            }) : null);
        }

        // API Call
        try {
            const res = await fetch(`/api/checklists/${checklist.id}/responses/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejectionReason: reason })
            });

            if (!res.ok) throw new Error('Failed to save');
            router.refresh(); // Sync server state in background
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar alteração. Revertendo...");
            setResponses(snapshotResponses); // Revert
            if (selectedItem?.item.id === itemId) {
                // Revert selected item view roughly (or just let router refresh fix it)
            }
        }
    };

    const handleFinalize = async () => {
        if (!confirm("Tem certeza que deseja finalizar este checklist? A ação é irreversível e bloqueará edições.")) return;

        try {
            const res = await fetch(`/api/checklists/${checklist.id}/finalize`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            alert("Checklist finalizado com sucesso!");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Erro ao finalizar checklist.");
        }
    };

    // Process data to group by section and handle sections that iterate over fields (if any)
    // For now, simple view
    const sections = checklist.template.sections;

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] gap-6 animate-fade-in" suppressHydrationWarning>
            {/* Header */}
            <header className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/checklists"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {checklist.template.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-slate-500">
                                {checklist.producer?.name || 'Produtor não identificado'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {checklist.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleAnalyzeCurrentItem}
                        // Disable if analyzing OR no item selected OR item has no answer
                        disabled={isAnalyzing || !selectedItem || !selectedItem.response?.answer}
                        className={cn(
                            "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 text-sm transition-all flex items-center gap-2",
                            (!selectedItem || !selectedItem.response?.answer) && "disabled:bg-indigo-600 disabled:shadow-none disabled:opacity-50"
                        )}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Analisar com IA
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleFinalize}
                        disabled={checklist.status === 'FINALIZED'}
                        className={cn(
                            "px-5 py-2.5 font-bold rounded-xl shadow-lg text-sm transition-all",
                            checklist.status === 'FINALIZED'
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                        )}
                    >
                        {checklist.status === 'FINALIZED' ? 'Checklist Finalizado' : 'Finalizar Checklist'}
                    </button>
                </div>
            </header>

            {/* Main Content (Split View) */}
            <div className="flex flex-1 gap-8 overflow-hidden">

                {/* Sidebar - Items List */}
                <aside className="w-96 flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar itens..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                        {sections.map((section: any) => (
                            <div key={section.id}>
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                    {section.name}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item: any) => {
                                        const response = responses.find((r: any) => r.itemId === item.id);
                                        const isSelected = selectedItem?.item.id === item.id;

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem({ item, response })}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                                                    isSelected
                                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                                        : "hover:bg-slate-50 text-slate-600"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected ? "bg-white/10" : "bg-slate-100"
                                                )}>
                                                    {response?.status === 'APPROVED' ? (
                                                        <CheckCircle size={16} className={isSelected ? "text-emerald-400" : "text-emerald-500"} />
                                                    ) : response?.status === 'REJECTED' ? (
                                                        <XCircle size={16} className={isSelected ? "text-red-400" : "text-red-500"} />
                                                    ) : response?.answer ? (
                                                        <AlertCircle size={16} className={isSelected ? "text-amber-400" : "text-amber-500"} />
                                                    ) : (
                                                        <Clock size={16} className={isSelected ? "text-slate-400" : "text-slate-400"} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-slate-700")}>
                                                            {item.name}
                                                        </p>
                                                        {response?.isInternal && (
                                                            <span className={cn(
                                                                "shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                                                                isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600 border border-indigo-200"
                                                            )}>
                                                                Interno
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={cn("text-[10px] truncate opacity-70", isSelected ? "text-white" : "text-slate-500")}>
                                                        {response?.answer || 'Pendente'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Area - Item Detail */}
                <main className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden flex relative">
                    {selectedItem ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-slate-200">
                                <ChecklistItemDetail
                                    item={selectedItem.item}
                                    response={selectedItem.response}
                                />
                            </div>

                            <AuditActionPanel
                                status={selectedItem.response?.status || 'MISSING'}
                                rejectionReason={selectedItem.response?.rejectionReason}
                                aiSuggestion={selectedItem.response?.aiSuggestion /* Mock for now */}
                                itemType={selectedItem.item.type}
                                onApprove={() => {
                                    const nextStatus = selectedItem.response?.status === 'APPROVED' ? 'PENDING_VERIFICATION' : 'APPROVED';
                                    updateResponseStatus(selectedItem.item.id, nextStatus);
                                }}
                                onReject={(reason) => {
                                    updateResponseStatus(selectedItem.item.id, 'REJECTED', reason);
                                }}
                                onAcceptAi={() => {
                                    // Mock acceptance logic
                                    const suggestion = selectedItem.response?.aiSuggestion;
                                    if (suggestion) {
                                        updateResponseStatus(selectedItem.item.id, suggestion.status, suggestion.reason);
                                    } else {
                                        alert('Sem sugestão de IA disponível');
                                    }
                                }}
                                onInternalFill={(data) => {
                                    handleInternalFill(data);
                                }}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="text-slate-300" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">
                                Selecione um item
                            </h2>
                            <p className="text-slate-500 max-w-sm">
                                Clique em um item na lista lateral para visualizar os detalhes, aprovar ou rejeitar.
                            </p>
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
}
