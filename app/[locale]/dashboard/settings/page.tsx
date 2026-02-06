'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
    BrainCircuit, AlertCircle, Network, X, Loader2, ChevronDown, ChevronUp, Check
} from 'lucide-react';

interface SubworkspaceInfo {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
}

export default function SettingsPage() {
    const t = useTranslations();
    const { data: session } = useSession();

    const workspaceId = session?.user?.workspaceId;

    // Fetch AI validation config for the parent workspace
    const { data: aiConfig, refetch: refetchAiConfig, isLoading: isLoadingAiConfig } = useQuery({
        queryKey: ['ai-doc-config', workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/doc-validation-config`);
            if (!res.ok) throw new Error('Failed to fetch AI config');
            return res.json();
        },
        enabled: !!workspaceId
    });

    // Fetch subworkspaces list
    const { data: subworkspaces = [], isLoading: isLoadingSubs } = useQuery<SubworkspaceInfo[]>({
        queryKey: ['subworkspaces-settings', workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/subworkspaces`);
            if (!res.ok) throw new Error('Failed to fetch subworkspaces');
            return res.json();
        },
        enabled: !!workspaceId
    });

    const isLoading = isLoadingAiConfig || isLoadingSubs;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {t('settings.title') || 'Configurações'}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {t('settings.description') || 'Gerencie as configurações do seu workspace'}
                </p>
            </div>

            {/* AI Document Validation Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-violet-100 rounded-xl">
                        <BrainCircuit size={20} className="text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            {t('aiValidation.title') || 'Validação IA de Documentos'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {t('aiValidation.parentDescription') || 'Configuração do workspace principal'}
                        </p>
                    </div>
                </div>

                {/* Parent Workspace Config */}
                <AiValidationCard
                    workspaceId={workspaceId!}
                    config={aiConfig}
                    onUpdate={() => refetchAiConfig()}
                    t={t}
                />

                {/* Subworkspaces Config */}
                {subworkspaces.length > 0 && aiConfig?.aiDocValidationEnabledForSubs && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-6">
                            {t('settings.subworkspacesConfig') || 'Configuração por Subworkspace'}
                        </h3>
                        {subworkspaces.map((sw: SubworkspaceInfo) => (
                            <SubworkspaceAiConfig
                                key={sw.id}
                                subworkspaceId={sw.id}
                                subworkspaceName={sw.name}
                                t={t}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

// Parent workspace AI validation config card
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AiValidationCard({ workspaceId, config, onUpdate, t }: { workspaceId: string; config: any; onUpdate: () => void; t: ReturnType<typeof useTranslations> }) {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [enabled, setEnabled] = useState<boolean>(config?.aiDocValidationEnabled || false);
    const [mode, setMode] = useState<'warn' | 'block'>(config?.aiDocValidationMode || 'warn');

    const isEnabledForSubs = config?.aiDocValidationEnabledForSubs || false;
    // SuperAdmin made feature available if effectiveEnabled or aiDocValidationEnabled ever was set
    // We check if the config exists at all (API returned data)
    const featureAvailable = config !== null && config !== undefined;

    useEffect(() => {
        if (saved) {
            const timer = setTimeout(() => setSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [saved]);

    const handleToggleEnabled = async () => {
        const newValue = !enabled;
        setEnabled(newValue);
        setIsSaving(true);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/doc-validation-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiDocValidationEnabled: newValue }),
            });
            if (!res.ok) throw new Error('Failed to save');
            onUpdate();
            setSaved(true);
        } catch {
            setEnabled(!newValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleModeChange = async (newMode: 'warn' | 'block') => {
        setMode(newMode);
        setIsSaving(true);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/doc-validation-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiDocValidationMode: newMode }),
            });
            if (!res.ok) throw new Error('Failed to save');
            onUpdate();
            setSaved(true);
        } catch {
            setMode(config?.aiDocValidationMode || 'warn');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
            {/* Toggle enable/disable */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-bold text-slate-700">
                        {t('settings.featureStatus') || 'Status da funcionalidade'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {enabled
                            ? (t('settings.enabledDesc') || 'Documentos serão validados por IA ao serem enviados')
                            : (t('settings.disabledDesc') || 'Validação por IA desabilitada para este workspace')}
                    </p>
                </div>
                {featureAvailable && (
                    <button
                        onClick={handleToggleEnabled}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 ${
                            enabled ? 'bg-violet-600' : 'bg-slate-200'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                )}
            </div>

            {enabled && (
                <>
                    {isEnabledForSubs && (
                        <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg border border-violet-100">
                            <Network size={14} />
                            <span className="font-bold">{t('aiValidation.inheritedToSubs') || 'Herança habilitada para subworkspaces'}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            {t('aiValidation.modeLabel') || 'Modo de validação'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleModeChange('warn')}
                                disabled={isSaving}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    mode === 'warn'
                                        ? 'border-amber-400 bg-amber-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                } disabled:opacity-50`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={16} className={mode === 'warn' ? 'text-amber-500' : 'text-slate-400'} />
                                    <span className="font-bold text-sm text-slate-900">{t('aiValidation.modeWarn') || 'Avisar'}</span>
                                </div>
                                <p className="text-[11px] text-slate-500">{t('aiValidation.modeWarnDesc') || 'Permite envio com aviso'}</p>
                            </button>
                            <button
                                onClick={() => handleModeChange('block')}
                                disabled={isSaving}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    mode === 'block'
                                        ? 'border-red-400 bg-red-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                } disabled:opacity-50`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <X size={16} className={mode === 'block' ? 'text-red-500' : 'text-slate-400'} />
                                    <span className="font-bold text-sm text-slate-900">{t('aiValidation.modeBlock') || 'Bloquear'}</span>
                                </div>
                                <p className="text-[11px] text-slate-500">{t('aiValidation.modeBlockDesc') || 'Impede envio se inválido'}</p>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Feedback */}
            {saved && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                    <Check size={14} />
                    <span className="text-xs font-bold">{t('common.saved') || 'Salvo'}</span>
                </div>
            )}
            {isSaving && (
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs font-bold">{t('common.saving') || 'Salvando...'}</span>
                </div>
            )}
        </div>
    );
}

// Per-subworkspace AI validation config
function SubworkspaceAiConfig({ subworkspaceId, subworkspaceName, t }: { subworkspaceId: string; subworkspaceName: string; t: ReturnType<typeof useTranslations> }) {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [mode, setMode] = useState<'warn' | 'block'>('warn');
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [subConfig, setSubConfig] = useState<{
        aiDocValidationEnabled: boolean;
        aiDocValidationMode: string;
        effectiveEnabled: boolean;
    } | null>(null);

    useEffect(() => {
        if (saved) {
            const timer = setTimeout(() => setSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [saved]);

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`/api/workspaces/${subworkspaceId}/doc-validation-config`);
                if (res.ok) {
                    const data = await res.json();
                    setSubConfig(data);
                    setMode(data.aiDocValidationMode || 'warn');
                }
            } catch {
                console.warn('Failed to fetch sub AI config');
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
    }, [subworkspaceId]);

    const isEffectivelyEnabled = subConfig?.effectiveEnabled || false;

    const handleModeChange = async (newMode: 'warn' | 'block') => {
        setMode(newMode);
        setIsSaving(true);
        try {
            const res = await fetch(`/api/workspaces/${subworkspaceId}/doc-validation-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiDocValidationMode: newMode }),
            });
            if (!res.ok) throw new Error('Failed to save');
            setSaved(true);
        } catch {
            setMode(subConfig?.aiDocValidationMode as 'warn' | 'block' || 'warn');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-xs font-black text-violet-600">
                        {subworkspaceName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{subworkspaceName}</span>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin text-slate-400" />
                    ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            isEffectivelyEnabled
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                            {isEffectivelyEnabled ? (t('aiValidation.enabled') || 'Ativo') : (t('aiValidation.disabled') || 'Inativo')}
                        </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {isExpanded && !isLoading && (
                <div className="px-4 pb-4 pt-0">
                    {isEffectivelyEnabled ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleModeChange('warn')}
                                    disabled={isSaving}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                                        mode === 'warn'
                                            ? 'border-amber-400 bg-amber-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    } disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className={mode === 'warn' ? 'text-amber-500' : 'text-slate-400'} />
                                        <span className="font-bold text-xs text-slate-900">{t('aiValidation.modeWarn') || 'Avisar'}</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleModeChange('block')}
                                    disabled={isSaving}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                                        mode === 'block'
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    } disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-2">
                                        <X size={14} className={mode === 'block' ? 'text-red-500' : 'text-slate-400'} />
                                        <span className="font-bold text-xs text-slate-900">{t('aiValidation.modeBlock') || 'Bloquear'}</span>
                                    </div>
                                </button>
                            </div>
                            {saved && (
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                    <Check size={12} />
                                    <span className="text-[10px] font-bold">{t('common.saved') || 'Salvo'}</span>
                                </div>
                            )}
                            {isSaving && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span className="text-[10px] font-bold">{t('common.saving') || 'Salvando...'}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-400 italic">
                            {t('aiValidation.notEnabledForSub') || 'Validação por IA não habilitada para este subworkspace.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
