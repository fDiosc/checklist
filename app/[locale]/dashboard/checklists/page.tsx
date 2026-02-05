'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ClipboardList,
    UserCheck,
    Copy,
    MessageCircle,
    ExternalLink,
    Search,
    Folder,
    Calendar,
    Filter,
    ChevronDown,
    ChevronRight,
    GitBranch,
    Building2,
    Eye
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { getStatusVariant, CHECKLIST_STATUSES, STATUS_TRANSLATION_KEYS, TYPE_TRANSLATION_KEYS, type ChecklistStatus, type ChecklistType } from '@/lib/utils/status';

type TabType = 'own' | 'subworkspaces';

export default function ChecklistsPage() {
    const t = useTranslations();
    const format = useFormatter();
    const locale = useLocale();
    
    // Filtros
    const [statusFilter, setStatusFilter] = useState('');
    const [templateFilter, setTemplateFilter] = useState('');
    const [producerSearch, setProducerSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [subworkspaceFilter, setSubworkspaceFilter] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('own');
    
    const { data: session } = useSession();

    // Fetch user data to check if workspace has subworkspaces
    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await fetch('/api/me');
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        },
    });

    const hasSubworkspacesEnabled = userData?.workspace?.hasSubworkspaces && !userData?.workspace?.parentWorkspaceId;
    const isReadOnly = activeTab === 'subworkspaces';
    
    // Helper functions for i18n
    const getStatusLabelI18n = (status: string) => {
        const key = STATUS_TRANSLATION_KEYS[status as ChecklistStatus];
        return key ? t(key) : status;
    };
    
    const getTypeLabelI18n = (type: string) => {
        const key = TYPE_TRANSLATION_KEYS[type as ChecklistType];
        return key ? t(key) : type;
    };
    
    const formatDate = (date: string | Date) => {
        return format.dateTime(new Date(date), { dateStyle: 'short' });
    };

    const toggleExpand = (checklistId: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (next.has(checklistId)) {
                next.delete(checklistId);
            } else {
                next.add(checklistId);
            }
            return next;
        });
    };

    // Recursive function to render child checklists at any depth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderChildRows = (children: any[], parentProducer: any, depth: number = 1, isReadOnlyMode: boolean = false): React.ReactNode[] => {
        if (!children || children.length === 0) return [];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return children.flatMap((child: any) => {
            const childPublicLink = `${window.location.origin}/c/${child.publicToken}`;
            const typeLabel = child.type ? getTypeLabelI18n(child.type) : t('checklistType.original');
            const isCorrection = child.type === 'CORRECTION';
            const hasGrandchildren = child.children && child.children.length > 0;
            const isChildExpanded = expandedParents.has(child.id);
            const indentPadding = 6 + (depth * 6); // Increase indentation per level

            const copyChildLink = (e: React.MouseEvent) => {
                e.stopPropagation();
                navigator.clipboard.writeText(childPublicLink);
                alert('Link copiado!');
            };

            const openChildLink = (e: React.MouseEvent) => {
                e.stopPropagation();
                window.open(childPublicLink, '_blank');
            };

            const shareChildWhatsapp = async (e: React.MouseEvent) => {
                e.stopPropagation();
                if (sendingWhatsappId) return;

                if (!parentProducer?.phone) {
                    alert("Este produtor não possui telefone cadastrado.");
                    return;
                }

                if (!confirm(`Enviar checklist de correção via WhatsApp para ${parentProducer.name} (${parentProducer.phone})?`)) return;

                setSendingWhatsappId(child.id);
                try {
                    const res = await fetch(`/api/checklists/${child.id}/send-whatsapp`, {
                        method: 'POST',
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Falha ao enviar');
                    }

                    alert('Checklist enviado com sucesso!');
                } catch (error: unknown) {
                    console.error(error);
                    alert(error instanceof Error ? error.message : t('checklists.sendError'));
                } finally {
                    setSendingWhatsappId(null);
                }
            };

            const rows: React.ReactNode[] = [
                <tr
                    key={child.id}
                    className={cn(
                        "transition-colors cursor-pointer",
                        isCorrection ? "bg-red-50/20 hover:bg-red-50/40" : "bg-indigo-50/20 hover:bg-indigo-50/40"
                    )}
                    onClick={() => window.location.href = `/${locale}/dashboard/checklists/${child.id}`}
                >
                    <td className="px-8 py-4">
                        <div className="flex items-center gap-3" style={{ paddingLeft: `${indentPadding * 4}px` }}>
                            {/* Expand/Collapse for grandchildren */}
                            {hasGrandchildren ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(child.id); }}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                    title={isChildExpanded ? 'Recolher' : 'Expandir'}
                                >
                                    {isChildExpanded ? (
                                        <ChevronDown size={14} className={isCorrection ? "text-red-500" : "text-indigo-500"} />
                                    ) : (
                                        <ChevronRight size={14} className="text-slate-400" />
                                    )}
                                </button>
                            ) : (
                                <div className="w-5" />
                            )}
                            <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center",
                                isCorrection ? "bg-red-100" : "bg-indigo-100"
                            )}>
                                {isCorrection ? <GitBranch size={12} className="text-red-500" /> : <ClipboardList size={12} className="text-indigo-500" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "font-bold tracking-tight text-sm",
                                        isCorrection ? "text-red-900" : "text-indigo-900"
                                    )}>
                                        {typeLabel}
                                    </span>
                                    {hasGrandchildren && (
                                        <span className={cn(
                                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                            isCorrection ? "bg-red-100 text-red-500" : "bg-indigo-100 text-indigo-500"
                                        )}>
                                            +{child.children.length}
                                        </span>
                                    )}
                                </div>
                                <div className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    isCorrection ? "text-red-400" : "text-indigo-400"
                                )}>
                                    {depth > 1 ? `Nível ${depth}` : `Checklist de ${typeLabel}`}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-4">
                        <span className={cn(
                            "text-[10px] font-bold",
                            isCorrection ? "text-red-400" : "text-indigo-400"
                        )}>
                            {t('checklistManagement.sameProducer')}
                        </span>
                    </td>
                    {hasSubworkspaces && (
                        <td className="px-8 py-4">
                            <span className="text-[10px] font-bold text-slate-300">—</span>
                        </td>
                    )}
                    <td className="px-8 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusVariant(child.status)}`}>
                            {getStatusIcon(child.status)}
                            {getStatusLabelI18n(child.status)}
                        </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-sm font-black",
                                isCorrection ? "text-red-900" : "text-indigo-900"
                            )}>
                                {child._count?.responses || 0}
                            </span>
                            <span className={cn(
                                "text-[10px] font-bold uppercase",
                                isCorrection ? "text-red-400" : "text-indigo-400"
                            )}>Itens</span>
                        </div>
                    </td>
                    <td className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {child.createdAt
                            ? formatDate(child.createdAt)
                            : '-'}
                    </td>
                    <td className="px-8 py-4">
                        <div className="flex items-center justify-center gap-2">
                            {isReadOnlyMode ? (
                                /* View-only button for subworkspace child checklists */
                                <button
                                    onClick={(e) => { e.stopPropagation(); window.location.href = `/${locale}/dashboard/checklists/${child.id}?readonly=true`; }}
                                    className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"
                                    title={t('common.view') || 'Visualizar'}
                                >
                                    <Eye size={16} />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.location.href = `/${locale}/dashboard/checklists/${child.id}`; }}
                                        className={cn(
                                            "p-3 rounded-xl transition-all shadow-sm",
                                            isCorrection ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                        )}
                                        title={`Gerenciar ${typeLabel}`}
                                    >
                                        <ClipboardList size={16} />
                                    </button>
                                    <button
                                        onClick={copyChildLink}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                        title={t('checklists.copyLink')}
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={shareChildWhatsapp}
                                        disabled={sendingWhatsappId === child.id}
                                        className={cn(
                                            "p-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm",
                                            sendingWhatsappId === child.id && "animate-pulse cursor-wait"
                                        )}
                                        title={t('checklists.sendWhatsApp')}
                                    >
                                        {sendingWhatsappId === child.id ? (
                                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <MessageCircle size={16} />
                                        )}
                                    </button>
                                    <button
                                        onClick={openChildLink}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                                        title={t('checklists.viewAsProducer')}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </td>
                </tr>
            ];

            // Recursively render grandchildren if expanded
            if (hasGrandchildren && isChildExpanded) {
                rows.push(...renderChildRows(child.children, parentProducer, depth + 1, isReadOnlyMode));
            }

            return rows;
        });
    };

    // Query de templates para o dropdown
    const { data: templates } = useQuery({
        queryKey: ['templates-list'],
        queryFn: async () => {
            const res = await fetch('/api/templates');
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
    });

    // Query para buscar subworkspaces (se o workspace atual tiver subworkspaces)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subworkspacesData } = useQuery<{ parentWorkspace: any; subworkspaces: any[] }>({
        queryKey: ['my-subworkspaces', session?.user?.workspaceId],
        queryFn: async () => {
            if (!session?.user?.workspaceId) return { parentWorkspace: null, subworkspaces: [] };
            const res = await fetch(`/api/workspaces/${session.user.workspaceId}/subworkspaces`);
            if (!res.ok) return { parentWorkspace: null, subworkspaces: [] };
            return res.json();
        },
        enabled: !!session?.user?.workspaceId
    });

    // Check if we should show the origin column (either from tabs or from API data)
    const hasSubworkspaces = hasSubworkspacesEnabled || (subworkspacesData?.parentWorkspace?.hasSubworkspaces && 
        subworkspacesData?.subworkspaces && subworkspacesData.subworkspaces.length > 0);

    const { data: checklists, isLoading } = useQuery({
        queryKey: ['checklists', statusFilter, templateFilter, producerSearch, dateFrom, dateTo, subworkspaceFilter, activeTab],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (templateFilter) params.append('templateId', templateFilter);
            if (producerSearch) params.append('producer', producerSearch);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            if (subworkspaceFilter) params.append('subworkspaceId', subworkspaceFilter);
            // Add scope parameter when workspace has subworkspaces enabled
            if (hasSubworkspacesEnabled) {
                params.append('scope', activeTab);
            }
            const res = await fetch(`/api/checklists?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle className="text-emerald-500" size={18} />;
            case 'REJECTED':
                return <XCircle className="text-red-500" size={18} />;
            case 'PENDING_REVIEW':
                return <AlertCircle className="text-amber-500" size={18} />;
            case 'PARTIALLY_FINALIZED':
                return <Clock className="text-violet-500" size={18} />;
            default:
                return <Clock className="text-slate-400" size={18} />;
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        {t('checklists.title')}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        {t('checklists.description')}
                    </p>
                </div>
            </div>

            {/* Tabs - Only show if workspace has subworkspaces */}
            {hasSubworkspacesEnabled && (
                <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => {
                                setActiveTab('own');
                                setSubworkspaceFilter('');
                                setExpandedParents(new Set());
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === 'own'
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t('checklists.tabs.own')}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('subworkspaces');
                                setExpandedParents(new Set());
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                activeTab === 'subworkspaces'
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Building2 size={14} />
                            {t('checklists.tabs.subworkspaces')}
                        </button>
                    </div>
                </div>
            )}

            {/* Read-only notice */}
            {isReadOnly && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3 animate-fade-in">
                    <Eye className="text-amber-600" size={20} />
                    <span className="text-sm font-medium text-amber-800">
                        {t('checklists.readOnlyNotice')}
                    </span>
                </div>
            )}

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {/* Status Filter */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Filter size={18} />
                    </div>
                    <select
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {CHECKLIST_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                        ))}
                    </select>
                </div>

                {/* Template Filter */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Folder size={18} />
                    </div>
                    <select
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer"
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                    >
                        <option value="">{t('checklists.allTemplates')}</option>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {templates?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Producer Search */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder={t('checklists.searchPlaceholder')}
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        value={producerSearch}
                        onChange={(e) => setProducerSearch(e.target.value)}
                    />
                </div>

                {/* Date From */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="Data inicial"
                    />
                </div>

                {/* Date To */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="Data final"
                    />
                </div>

                {/* Subworkspace Filter - only shown if in subworkspaces tab */}
                {hasSubworkspacesEnabled && activeTab === 'subworkspaces' && (subworkspacesData?.subworkspaces?.length || 0) > 0 && (
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                            <Building2 size={18} />
                        </div>
                        <select
                            className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-500/5 transition-all appearance-none cursor-pointer"
                            value={subworkspaceFilter}
                            onChange={(e) => setSubworkspaceFilter(e.target.value)}
                        >
                            <option value="">{t('checklists.allWorkspaces') || 'Todos os workspaces'}</option>
                            <option value={session?.user?.workspaceId || ''}>
                                {subworkspacesData?.parentWorkspace?.name || 'Workspace Principal'}
                            </option>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {subworkspacesData?.subworkspaces?.map((sw: any) => (
                                <option key={sw.id} value={sw.id}>{sw.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('common.loading')}</p>
                </div>
            ) : checklists && checklists.length > 0 ? (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.template')}
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.producer')}
                                    </th>
                                    {hasSubworkspaces && (
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {t('checklists.table.origin') || 'Origem'}
                                        </th>
                                    )}
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.status')}
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.responses')}
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.sentDate')}
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('checklists.table.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* Filter to only show parent checklists (those without parentId) */}
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {checklists.filter((c: any) => !c.parentId).map((checklist: any) => {
                                    const publicLink = `${window.location.origin}/c/${checklist.publicToken}`;
                                    const hasChildren = checklist.children && checklist.children.length > 0;
                                    const isExpanded = expandedParents.has(checklist.id);

                                    const copyLink = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(publicLink);
                                        alert(t('checklists.linkCopied'));
                                    };

                                    const openLink = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        window.open(publicLink, '_blank');
                                    };

                                    const shareWhatsapp = async (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (sendingWhatsappId) return;

                                        if (!checklist.producer?.phone) {
                                            alert(t('checklists.noPhone'));
                                            return;
                                        }

                                        if (!confirm(`Enviar checklist via WhatsApp para ${checklist.producer.name} (${checklist.producer.phone})?`)) return;

                                        setSendingWhatsappId(checklist.id);
                                        try {
                                            const res = await fetch(`/api/checklists/${checklist.id}/send-whatsapp`, {
                                                method: 'POST',
                                            });

                                            if (!res.ok) {
                                                const data = await res.json();
                                                throw new Error(data.error || 'Falha ao enviar');
                                            }

                                            alert(t('checklists.sentSuccess'));
                                        } catch (error: unknown) {
                                            console.error(error);
                                            alert(error instanceof Error ? error.message : t('checklists.sendError'));
                                        } finally {
                                            setSendingWhatsappId(null);
                                        }
                                    };

                                    const handleRowClick = () => {
                                        window.location.href = `/${locale}/dashboard/checklists/${checklist.id}`;
                                    };

                                    return (
                                        <React.Fragment key={checklist.id}>
                                            <tr
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                                onClick={handleRowClick}
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        {/* Expand/Collapse button for parents with children */}
                                                        {hasChildren ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(checklist.id); }}
                                                                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title={isExpanded ? 'Recolher correções' : 'Expandir correções'}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown size={16} className="text-indigo-500" />
                                                                ) : (
                                                                    <ChevronRight size={16} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <div className="w-6" />
                                                        )}
                                                        <div>
                                                            <div className="font-black text-slate-900 tracking-tight text-sm">
                                                                {checklist.template?.name}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                    {checklist.template?.folder}
                                                                </span>
                                                                {hasChildren && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                        {checklist.children.some((c: any) => c.type === 'CORRECTION') && (
                                                                            <span className="text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                                <XCircle size={8} /> {checklist.children.filter((c: any) => c.type === 'CORRECTION').length} {t('checklistType.correction')}
                                                                            </span>
                                                                        )}
                                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                        {checklist.children.some((c: any) => c.type === 'COMPLETION') && (
                                                                            <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                                <ClipboardList size={8} /> {checklist.children.filter((c: any) => c.type === 'COMPLETION').length} {t('checklistType.completion')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <UserCheck size={14} className="text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-xs">
                                                                {checklist.producer?.name || '-'}
                                                            </div>
                                                            {checklist.producer?.cpf && (
                                                                <div className="text-[10px] text-slate-400 font-medium">
                                                                    {checklist.producer.cpf}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                {hasSubworkspaces && (
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 size={14} className={checklist.workspace?.parentWorkspaceId ? 'text-indigo-500' : 'text-slate-400'} />
                                                            <div>
                                                                <div className="font-bold text-slate-700 text-xs">
                                                                    {checklist.workspace?.name || '-'}
                                                                </div>
                                                                {checklist.workspace?.parentWorkspaceId && (
                                                                    <div className="text-[9px] text-indigo-500 font-bold uppercase">Subworkspace</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusVariant(checklist.status)}`}>
                                                            {getStatusIcon(checklist.status)}
                                                            {getStatusLabelI18n(checklist.status)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black text-slate-900">
                                                            {checklist._count?.responses || 0}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Itens</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {checklist.sentAt
                                                        ? formatDate(checklist.sentAt)
                                                        : '-'}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {isReadOnly ? (
                                                            /* View-only button for subworkspace checklists */
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); window.location.href = `/${locale}/dashboard/checklists/${checklist.id}?readonly=true`; }}
                                                                className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"
                                                                title={t('common.view') || 'Visualizar'}
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); window.location.href = `/${locale}/dashboard/checklists/${checklist.id}`; }}
                                                                    className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"
                                                                    title={t('checklists.manage')}
                                                                >
                                                                    <ClipboardList size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={copyLink}
                                                                    className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                                                    title={t('checklists.copyLink')}
                                                                >
                                                                    <Copy size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={shareWhatsapp}
                                                                    disabled={sendingWhatsappId === checklist.id}
                                                                    className={cn(
                                                                        "p-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm",
                                                                        sendingWhatsappId === checklist.id && "animate-pulse cursor-wait"
                                                                    )}
                                                                    title={t('checklists.sendWhatsApp')}
                                                                >
                                                                    {sendingWhatsappId === checklist.id ? (
                                                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        <MessageCircle size={16} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={openLink}
                                                                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                                                                    title={t('checklists.viewAsProducer')}
                                                                >
                                                                    <ExternalLink size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Child checklists (corrections/completions) - shown when expanded, recursive */}
                                            {hasChildren && isExpanded && renderChildRows(checklist.children, checklist.producer, 1, isReadOnly)}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 animate-fade-in shadow-inner">
                    <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <ClipboardList size={48} className="text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                        {t('checklists.noChecklists')}
                    </h3>
                    <p className="text-slate-500 font-medium mb-10 max-w-xs mx-auto">
                        {t('checklists.noChecklistsDescription')}
                    </p>
                </div>
            )}
        </div>
    );
}
