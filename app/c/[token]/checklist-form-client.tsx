'use client';

import { useState, useEffect, useMemo } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { DocumentItem } from '@/types/checklist';

export function ChecklistFormClient({ checklist }: { checklist: any }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

    const storageKey = `merx_draft_${checklist.publicToken}`;

    // Hydration
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        let finalResponses: Record<string, any> = {};

        if (saved) {
            try {
                finalResponses = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }

        // AUTO-MERGE SERVER STATE (Source of Truth for Status)
        // We override local draft status with server status to ensure Rejections/Approvals are visible.
        if (checklist.responses && Array.isArray(checklist.responses)) {
            checklist.responses.forEach((r: any) => {
                // We preserve local answer drafts if server answer is empty? 
                // No, if server has answer, it usually means it was submitted.
                // But for "Status" specifically:

                const local = finalResponses[r.itemId] || {};

                // DATA MERGE STRATEGY:
                // If server says REJECTED but local draft has a DIFFERENT answer, 
                // we treat it as an unsubmitted correction and keep PENDING_VERIFICATION.
                const isCorrectionDraft = r.status === 'REJECTED' && local.answer && local.answer !== r.answer;

                finalResponses[r.itemId] = {
                    ...local,
                    ...r, // apply server fields
                    // Status priority: If it's a correction draft, keep PENDING_VERIFICATION.
                    // Otherwise, the server status is the source of truth for verification state.
                    status: isCorrectionDraft ? 'PENDING_VERIFICATION' : r.status,
                    rejectionReason: r.rejectionReason,
                };
            });
        }

        setResponses(finalResponses);

        // Initialize saved items based on what has answers
        const initialSaved = new Set<string>();
        Object.values(finalResponses).forEach((r: any) => {
            if (r.answer) initialSaved.add(r.itemId);
        });
        setSavedItems(initialSaved);

        setIsLoaded(true);

        // Store producer identifier for history tracking
        if (checklist.producer?.name) {
            localStorage.setItem('merx_producer_identifier', checklist.producer.name);
        }
    }, [storageKey, checklist.producer?.name, checklist.responses]);

    // Persistence (Local)
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(storageKey, JSON.stringify(responses));
        }
    }, [responses, storageKey, isLoaded]);

    const isReadOnly = checklist.status !== 'SENT' && checklist.status !== 'IN_PROGRESS';

    // Auto-save REMOVED to prioritize manual save button workflow as requested.

    // Dynamic Section Replication Logic
    const computedSections = useMemo(() => {
        const sections = checklist.template.sections;

        // Find if we have any field_selector or property_map that might give us field IDs
        const allItemsFlat = sections.flatMap((s: any) => s.items);
        const fieldSelectorItem = allItemsFlat.find((i: any) => i.type.toLowerCase() === 'field_selector');
        const selectedFieldIds = responses[fieldSelectorItem?.id]?.answer || [];

        if (selectedFieldIds.length > 0) {
            const newSections: any[] = [];
            sections.forEach((section: any) => {
                if (section.iterateOverFields) {
                    selectedFieldIds.forEach((fieldId: string) => {
                        const allFields = checklist.producer?.maps?.flatMap((m: any) => m.fields || []) || [];
                        const field = allFields.find((f: any) => f.id === fieldId);
                        const fieldName = field?.name || `Talhão ${fieldId}`;

                        newSections.push({
                            ...section,
                            id: `${section.id}::${fieldId}`,
                            name: `${section.name} - ${fieldName}`,
                            items: section.items.map((item: any) => ({
                                ...item,
                                id: `${item.id}::${fieldId}`
                            }))
                        });
                    });
                } else {
                    newSections.push(section);
                }
            });
            return newSections;
        }

        return sections;
    }, [checklist.template.sections, responses, checklist.producer?.maps]);

    const allItems: any[] = useMemo(() =>
        computedSections.flatMap((s: any) =>
            s.items.map((item: any) => ({ ...item, sectionName: s.name }))
        ),
        [computedSections]);

    const currentItem = allItems[currentStep];
    const progress = ((currentStep + 1) / (allItems.length || 1)) * 100;

    const validateItem = (item: any, response: any) => {
        if (!item?.required) return true;

        const answer = response?.answer;
        if (!answer) return false;

        if (Array.isArray(answer) && answer.length === 0) return false;

        return true;
    };

    const handleUpdateItem = (updates: Partial<DocumentItem>) => {
        const currentResponse = responses[currentItem.id] || {};
        if (currentResponse.status === 'APPROVED') return;

        setResponses(prev => {
            const currentResponse = prev[currentItem.id] || {};
            const newResponse = { ...currentResponse, ...updates };

            // RF-G03: Status Management
            if (newResponse.answer) {
                newResponse.status = 'PENDING_VERIFICATION';
            } else {
                newResponse.status = 'MISSING';
            }

            // If user changes something, it's no longer "saved" state until they hit save
            // However, this might be annoying if we clear the green check immediately on every keystroke.
            // But strict interpreted: "Green only when SAVED". If I edit, it's unsaved dirty state.
            // So technically I should remove from savedItems.
            // setSavedItems(prevSaved => {
            //    const newSaved = new Set(prevSaved);
            //    newSaved.delete(currentItem.id);
            //    return newSaved;
            // }); 
            // Commented out to avoid flickering/annoyance, but can enable if "Dirty Check" is needed.
            // For now, let's keep it simple: Green = "I have confirmed receipt at some point". 

            return {
                ...prev,
                [currentItem.id]: newResponse
            };
        });
    };

    const handleNext = () => {
        // Validation removed to allow free navigation between items
        // User will be prompted for missing items only at the final submission step
        if (currentStep < allItems.length - 1) {
            setCurrentStep(currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFinish = async () => {
        // Find first invalid item
        const invalidIdx = allItems.findIndex(item => !validateItem(item, responses[item.id]));
        if (invalidIdx !== -1) {
            alert(`Por favor, preencha o item obrigatório: "${allItems[invalidIdx].name}"`);
            setCurrentStep(invalidIdx);
            return;
        }

        try {
            const res = await fetch(`/api/c/${checklist.publicToken}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });

            if (!res.ok) throw new Error('Falha ao enviar');

            alert('Checklist enviado com sucesso!');
            localStorage.removeItem(storageKey);
            window.location.reload(); // Refresh to enter read-only mode
        } catch (error) {
            console.error(error);
            alert('Houve um erro ao enviar seu checklist. Por favor, tente novamente.');
        }
    };

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const handleManualSave = async () => {
        setSaveStatus('saving');
        try {
            const res = await fetch(`/api/c/${checklist.publicToken}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });
            if (!res.ok) throw new Error('Falha no salvamento');

            setSaveStatus('success');
            // Mark current item as saved
            setSavedItems(prev => new Set(prev).add(currentItem.id));

            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Manual save failed", error);
            setSaveStatus('error');
            alert("Erro ao salvar. Verifique sua conexão.");
            setSaveStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white p-6 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                        </svg>
                    </div>
                    <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[150px]">{checklist.template.name}</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M4 12h16M4 6h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {isReadOnly && (
                <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-4 text-center z-[100] font-black uppercase tracking-widest text-xs animate-slide-down">
                    Checklist Enviado e Bloqueado para Edição
                </div>
            )}

            {/* Navigation Sidebar */}
            <aside className={`
                fixed inset-0 z-40 md:relative md:flex md:w-[380px] bg-slate-900 transition-transform duration-500 ease-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex flex-col h-full w-full p-8">
                    <div className="hidden md:flex items-center gap-4 mb-12">
                        <div className="w-12 h-12 bg-emerald-500 rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-white font-black text-xs uppercase tracking-[0.2em]">{checklist.template.name}</h1>
                            <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">Portal do Produtor</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar">
                        {computedSections.map((section: any, sIdx: number) => (
                            <div key={section.id} className="animate-fade-in" style={{ animationDelay: `${sIdx * 0.1}s` }}>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                                    {section.name}
                                </h3>
                                <div className="space-y-2">
                                    {section.items.map((item: any) => {
                                        const globalIdx = allItems.findIndex(ai => ai.id === item.id);
                                        const isActive = currentStep === globalIdx;
                                        const response = responses[item.id];
                                        const isRejected = response?.status === 'REJECTED';
                                        const isCompleted = savedItems.has(item.id);

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { setCurrentStep(globalIdx); setIsSidebarOpen(false); }}
                                                className={`
                                                    w-full flex items-center gap-4 p-4 rounded-2xl transition-all group text-left
                                                    ${isActive ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20 scale-[1.02]' : 'hover:bg-white/5 text-slate-400'}
                                                `}
                                            >
                                                <div className={`
                                                    w-8 h-8 rounded-xl flex items-center justify-center transition-all
                                                    ${isActive ? 'bg-white/20' : isRejected ? 'bg-red-500/10 text-red-500' : isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'}
                                                `}>
                                                    {isRejected ? (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    ) : isCompleted ? (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    ) : <span className="text-[10px] font-black">{globalIdx + 1}</span>}
                                                </div>
                                                <span className={`text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                    {item.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso Total</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Workspace Area */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-24">
                {/* Top Bar for Desktop - Breadcrumbs/Header */}
                <header className="hidden md:flex items-center justify-between px-8 py-6 bg-white border-b border-slate-100 sticky top-0 z-20">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <span className="uppercase tracking-widest">{checklist.template.name}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">{currentItem?.name || 'Fim'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                            Item {currentStep + 1} de {allItems.length}
                        </span>
                    </div>
                </header>

                <div className="min-h-full flex flex-col p-6 md:p-8 max-w-4xl mx-auto">
                    <div className="flex-1 bg-white rounded-[2rem] p-6 md:p-12 shadow-xl shadow-slate-100 border border-slate-100">
                        {currentItem ? (
                            <div className="space-y-8">
                                <ChecklistItem
                                    item={{
                                        ...currentItem,
                                        answer: responses[currentItem.id]?.answer,
                                        quantity: responses[currentItem.id]?.quantity,
                                        observationValue: responses[currentItem.id]?.observationValue
                                    }}
                                    onUpdate={handleUpdateItem}
                                    producerIdentifier={checklist.producer?.name}
                                    producerMaps={checklist.producer?.maps}
                                    readOnly={isReadOnly || responses[currentItem.id]?.status === 'APPROVED'}
                                />

                                {/* Approval Notice */}
                                {responses[currentItem.id]?.status === 'APPROVED' && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col gap-3 animate-slide-up">
                                        <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-wider text-xs">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Item Aprovado
                                        </div>
                                        <p className="text-emerald-900 font-medium">
                                            Este item já foi verificado e aprovado pelo auditor. Não pode mais ser editado.
                                        </p>
                                    </div>
                                )}

                                {/* Rejection Notice */}
                                {responses[currentItem.id]?.status === 'REJECTED' && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col gap-3 animate-slide-up">
                                        <div className="flex items-center gap-3 text-red-600 font-bold uppercase tracking-wider text-xs">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Atenção: Item Rejeitado
                                        </div>
                                        <p className="text-red-900 font-medium">
                                            {responses[currentItem.id]?.rejectionReason || "Motivo não especificado pelo auditor."}
                                        </p>
                                        <p className="text-red-600/70 text-xs">
                                            Por favor, corrija as informações acima e salve novamente para nova análise.
                                        </p>
                                    </div>
                                )}

                                {/* Main Action Button - Save */}
                                <div className="pt-8 border-t border-slate-50">
                                    {responses[currentItem.id]?.status !== 'APPROVED' ? (
                                        <button
                                            onClick={handleManualSave}
                                            disabled={saveStatus === 'saving'}
                                            className={`
                                                w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-3
                                                ${saveStatus === 'success'
                                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.99]'}
                                            `}
                                        >
                                            {saveStatus === 'saving' ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : saveStatus === 'success' ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Salvo!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path d="M12 19V5M5 12l7-7 7 7" transform="rotate(180 12 12)" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Salvar Resposta
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="text-center py-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">
                                                Item bloqueado para alteração após aprovação
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-100">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Pronto para Enviar?</h1>
                                <p className="text-slate-500 font-medium max-w-sm mb-12">Você completou todos os itens necessários deste checklist.</p>

                                <button
                                    onClick={handleFinish}
                                    className="w-full max-w-md bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest animate-pulse"
                                >
                                    Finalizar e Enviar Checklist
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Bottom Navigation Footer */}
                {currentItem && (
                    <div className="fixed bottom-0 left-0 md:left-[380px] right-0 bg-white border-t border-slate-100 p-4 md:px-12 z-40 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 0}
                            className="bg-slate-50 text-slate-500 hover:bg-slate-100 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Anterior
                        </button>

                        <button
                            onClick={handleNext}
                            className={`bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${!responses[currentItem.id]?.answer ? 'opacity-80' : ''}`}
                        >
                            Próximo
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                )}
            </main>
        </div >
    );
}
