'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations, useFormatter } from 'next-intl';
import { ClipboardCopy, History } from 'lucide-react';

interface SendChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTemplateId?: string;
    initialProducerId?: string;
}

const SendChecklistModal: React.FC<SendChecklistModalProps> = ({
    isOpen,
    onClose,
    initialTemplateId,
    initialProducerId
}) => {
    const t = useTranslations();
    const format = useFormatter();
    // Internal selection state (used when not provided via props)
    const [templateId, setTemplateId] = useState('');
    const [producerId, setProducerId] = useState('');
    const [sentVia, setSentVia] = useState<'EMAIL' | 'WHATSAPP' | 'LINK'>('LINK');
    const [generatedLink, setGeneratedLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    
    // Pre-fill state
    const [enablePrefill, setEnablePrefill] = useState(false);
    const [prefillChecklistId, setPrefillChecklistId] = useState('');

    // Final IDs to use (prioritizing props)
    const activeTemplateId = initialTemplateId || templateId;
    const activeProducerId = initialProducerId || producerId;

    // Reset internal state when modal opens/closes or props change
    useEffect(() => {
        if (isOpen) {
            setGeneratedLink('');
            setIsCopied(false);
            setEnablePrefill(false);
            setPrefillChecklistId('');
            if (!initialTemplateId) setTemplateId('');
            if (!initialProducerId) setProducerId('');
        }
    }, [isOpen, initialTemplateId, initialProducerId]);

    const { data: templates } = useQuery({
        queryKey: ['templates-simple'],
        queryFn: () => fetch('/api/templates').then(res => res.json()),
        enabled: isOpen && !initialTemplateId
    });

    const { data: producers } = useQuery({
        queryKey: ['producers-simple'],
        queryFn: () => fetch('/api/producers?scope=own').then(res => res.json()),
        enabled: isOpen && !initialProducerId
    });

    // Query for available checklists to prefill from
    const { data: availableForPrefill, isLoading: loadingPrefill } = useQuery({
        queryKey: ['checklists-prefill', activeTemplateId, activeProducerId],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('templateId', activeTemplateId);
            if (activeProducerId) params.append('producerId', activeProducerId);
            const res = await fetch(`/api/checklists/available-for-prefill?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: isOpen && !!activeTemplateId && enablePrefill
    });

    const mutation = useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async (data: any) => {
            const res = await fetch('/api/checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to send checklist');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setGeneratedLink(data.link);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            console.error('Checklist creation error:', err);
            alert(`${t('modals.sendChecklist.generateError')}: ${err.message}`);
        }
    });

    const handleSend = () => {
        if (!activeTemplateId || !activeProducerId) {
            alert(t('modals.sendChecklist.selectBoth'));
            return;
        }
        mutation.mutate({
            templateId: activeTemplateId,
            producerId: activeProducerId,
            sentVia: sentVia === 'LINK' ? null : sentVia,
            prefillFromChecklistId: enablePrefill && prefillChecklistId ? prefillChecklistId : undefined
        });
    };

    const copyToClipboard = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t('modals.sendChecklist.title')}</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{t('modals.sendChecklist.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {!generatedLink ? (
                    <div className="p-10 space-y-10">
                        {/* Step 1: Template Selection (only if not provided) */}
                        {!initialTemplateId && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                    <svg className="text-primary w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    1. Selecionar Template
                                </label>
                                <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {templates?.map((t: any) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTemplateId(t.id)}
                                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${activeTemplateId === t.id ? 'border-primary bg-primary/[0.03]' : 'border-slate-50 hover:border-slate-200'}`}
                                        >
                                            <div>
                                                <p className={`font-bold text-sm ${activeTemplateId === t.id ? 'text-primary' : 'text-slate-700'}`}>{t.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.folder}</p>
                                            </div>
                                            {activeTemplateId === t.id && (
                                                <svg className="text-primary w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Producer Selection (only if not provided) */}
                        {!initialProducerId && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                    <svg className="text-indigo-500 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-14a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {t('modals.sendChecklist.selectProducer')}
                                </label>
                                <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {producers?.map((p: any) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setProducerId(p.id)}
                                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${activeProducerId === p.id ? 'border-primary bg-primary/[0.03]' : 'border-slate-50 hover:border-slate-200'}`}
                                        >
                                            <div>
                                                <p className={`font-bold text-sm ${activeProducerId === p.id ? 'text-primary' : 'text-slate-700'}`}>{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{p.cpf}</p>
                                            </div>
                                            {activeProducerId === p.id && (
                                                <svg className="text-primary w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pre-fill Option (shown when template and producer are selected) */}
                        {activeTemplateId && activeProducerId && (
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={enablePrefill}
                                        onChange={(e) => {
                                            setEnablePrefill(e.target.checked);
                                            if (!e.target.checked) setPrefillChecklistId('');
                                        }}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary focus:ring-offset-0"
                                    />
                                    <div className="flex items-center gap-2">
                                        <History size={16} className="text-amber-500" />
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                            {t('modals.sendChecklist.prefillFromPrevious') || 'Pré-preencher com checklist anterior'}
                                        </span>
                                    </div>
                                </label>
                                
                                {enablePrefill && (
                                    <div className="pl-8 animate-fade-in">
                                        {loadingPrefill ? (
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                                                {t('common.loading') || 'Carregando...'}
                                            </div>
                                        ) : availableForPrefill && availableForPrefill.length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {availableForPrefill.map((checklist: any) => (
                                                    <button
                                                        key={checklist.id}
                                                        onClick={() => setPrefillChecklistId(checklist.id)}
                                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                                            prefillChecklistId === checklist.id 
                                                                ? 'border-amber-400 bg-amber-50' 
                                                                : 'border-slate-100 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <ClipboardCopy size={16} className={prefillChecklistId === checklist.id ? 'text-amber-500' : 'text-slate-400'} />
                                                            <div>
                                                                <p className={`font-bold text-sm ${prefillChecklistId === checklist.id ? 'text-amber-700' : 'text-slate-700'}`}>
                                                                    {checklist.producer?.name || t('common.unknown')}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {checklist.finalizedAt 
                                                                        ? format.dateTime(new Date(checklist.finalizedAt), { dateStyle: 'short' })
                                                                        : format.dateTime(new Date(checklist.createdAt), { dateStyle: 'short' })
                                                                    } • {checklist._count?.responses || 0} {t('common.items') || 'itens'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {prefillChecklistId === checklist.id && (
                                                            <svg className="text-amber-500 w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">
                                                {t('modals.sendChecklist.noPreviousChecklists') || 'Nenhum checklist anterior disponível para este template'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Method Selection */}
                        <div className="flex gap-4">
                            {[
                                {
                                    id: 'LINK',
                                    label: t('modals.sendChecklist.uniqueLink'),
                                    icon: () => (
                                        <svg className={`w-5 h-5 ${sentVia === 'LINK' ? 'text-primary' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )
                                },
                                {
                                    id: 'WHATSAPP',
                                    label: 'WhatsApp',
                                    icon: () => (
                                        <svg className={`w-5 h-5 ${sentVia === 'WHATSAPP' ? 'text-primary' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-14h.6A8.5 8.5 0 0121 11.5z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )
                                },
                                {
                                    id: 'EMAIL',
                                    label: t('modals.sendChecklist.email'),
                                    icon: () => (
                                        <svg className={`w-5 h-5 ${sentVia === 'EMAIL' ? 'text-primary' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )
                                },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onClick={() => setSentVia(method.id as any)}
                                    className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${sentVia === method.id ? 'border-primary bg-primary/[0.03] scale-[1.05] shadow-xl shadow-primary/5' : 'border-slate-50 hover:border-slate-100 opacity-60'}`}
                                >
                                    <method.icon />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${sentVia === method.id ? 'text-primary' : 'text-slate-400'}`}>{method.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            disabled={!activeTemplateId || !activeProducerId || mutation.isPending}
                            onClick={handleSend}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:scale-100 flex items-center justify-center gap-4 group"
                        >
                            {mutation.isPending ? 'Processando...' : (
                                <>
                                    Gerar Acesso
                                    <svg className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="p-12 text-center space-y-8 animate-fade-in">
                        <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{t('modals.sendChecklist.generated')}</h3>
                            <p className="text-slate-500 font-medium text-sm mt-2">{t('modals.sendChecklist.generatedDescription')}</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4 group">
                            <input
                                type="text"
                                readOnly
                                value={generatedLink}
                                className="bg-transparent border-none text-xs font-bold text-slate-600 flex-1 outline-none select-all"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="bg-white p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                            >
                                {isCopied ? (
                                    <svg className="text-emerald-500 w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {isCopied ? t('modals.sendChecklist.copied') : t('modals.sendChecklist.copy')}
                            </button>
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-5 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Fechar Modal
                            </button>
                            {sentVia === 'WHATSAPP' && (
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`${t('modals.sendChecklist.whatsappMessage')}: ${generatedLink}`)}`}
                                    target="_blank"
                                    className="flex-1 py-5 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-200"
                                >
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-14h.6A8.5 8.5 0 0121 11.5z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SendChecklistModal;
