'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, ChevronDown, Building2, Eye } from 'lucide-react';
import { useTranslations, useFormatter } from 'next-intl';
import ProducerHistory from '@/components/dashboard/ProducerHistory';

import { useRouter } from 'next/navigation';
import SendChecklistModal from '@/components/modals/SendChecklistModal';

type TabType = 'own' | 'subworkspaces';

export default function ProdutoresPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const t = useTranslations();
    const format = useFormatter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedProducerId, setSelectedProducerId] = useState<string | undefined>();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('own');
    const [subworkspaceFilter, setSubworkspaceFilter] = useState<string>('');

    // Fetch user data to check if workspace has subworkspaces
    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await fetch('/api/me');
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        },
    });

    const hasSubworkspaces = userData?.workspace?.hasSubworkspaces && !userData?.workspace?.parentWorkspaceId;

    // Fetch subworkspaces for filter dropdown
    const { data: subworkspacesData } = useQuery({
        queryKey: ['subworkspaces', userData?.workspace?.id],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${userData.workspace.id}/subworkspaces`);
            if (!res.ok) throw new Error('Failed to fetch subworkspaces');
            return res.json();
        },
        enabled: hasSubworkspaces && activeTab === 'subworkspaces',
    });

    const { data: producers, isLoading } = useQuery({
        queryKey: ['producers', searchTerm, activeTab, subworkspaceFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (hasSubworkspaces) {
                params.set('scope', activeTab);
            }
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`/api/producers${queryString}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    // Filter producers by subworkspace on client side if filter is set
    const filteredProducers = subworkspaceFilter && activeTab === 'subworkspaces'
        ? producers?.filter((p: { workspace?: { id: string } }) => p.workspace?.id === subworkspaceFilter)
        : producers;

    const isReadOnly = activeTab === 'subworkspaces';

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        {t('producer.title')}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        {t('producer.description')}
                    </p>
                </div>
                {!isReadOnly && (
                    <button
                        onClick={() => router.push('/dashboard/produtores/new')}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t('producer.newProducer')}
                    </button>
                )}
            </div>

            {/* Tabs - Only show if workspace has subworkspaces */}
            {hasSubworkspaces && (
                <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => {
                                setActiveTab('own');
                                setSubworkspaceFilter('');
                                setExpandedId(null);
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === 'own'
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t('producer.tabs.own')}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('subworkspaces');
                                setExpandedId(null);
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                activeTab === 'subworkspaces'
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Building2 size={14} />
                            {t('producer.tabs.subworkspaces')}
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-12 animate-slide-up flex flex-wrap gap-4 items-center" style={{ animationDelay: '0.1s' }}>
                <div className="relative max-w-xl group flex-1 min-w-[300px]">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder={t('producer.searchPlaceholder')}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold shadow-xl shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Subworkspace filter - only show in subworkspaces tab */}
                {hasSubworkspaces && activeTab === 'subworkspaces' && subworkspacesData?.subworkspaces?.length > 0 && (
                    <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={subworkspaceFilter}
                            onChange={(e) => setSubworkspaceFilter(e.target.value)}
                            className="pl-12 pr-8 py-5 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-xl shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer min-w-[200px]"
                        >
                            <option value="">{t('producer.allSubworkspaces')}</option>
                            {subworkspacesData.subworkspaces.map((sw: { id: string; name: string }) => (
                                <option key={sw.id} value={sw.id}>{sw.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Read-only notice */}
            {isReadOnly && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3 animate-fade-in">
                    <Eye className="text-amber-600" size={20} />
                    <span className="text-sm font-medium text-amber-800">
                        {t('producer.readOnlyNotice')}
                    </span>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('common.loading')}</p>
                </div>
            ) : filteredProducers && filteredProducers.length > 0 ? (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.name')}
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.identification')}
                                    </th>
                                    {/* Workspace column - only in subworkspaces tab */}
                                    {isReadOnly && (
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {t('producer.table.workspace')}
                                        </th>
                                    )}
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.esgStatus')}
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.email')}
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.checklists')}
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.region')}
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('producer.table.createdAt')}
                                    </th>
                                    {!isReadOnly && (
                                        <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {t('common.actions')}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {filteredProducers.map((producer: any) => (
                                    <React.Fragment key={producer.id}>
                                        <tr
                                            onClick={() => setExpandedId(expandedId === producer.id ? null : producer.id)}
                                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${expandedId === producer.id ? 'bg-slate-50' : ''}`}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl transition-all ${expandedId === producer.id ? 'bg-primary text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                        <ChevronDown size={14} />
                                                    </div>
                                                    <span className="font-black text-slate-900 tracking-tight text-sm">
                                                        {producer.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                {/* Show CPF for BR, or primary identifier for international */}
                                                {producer.cpf || producer.identifiers?.find((i: { category: string }) => i.category === 'personal')?.idValue || '-'}
                                            </td>
                                            {/* Workspace column */}
                                            {isReadOnly && (
                                                <td className="px-8 py-6">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                                                        <Building2 size={12} />
                                                        {producer.workspace?.name || '-'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-8 py-6">
                                                {/* ESG Status - only applicable for Brazilian producers */}
                                                {(producer.countryCode === 'BR' || !producer.countryCode) ? (
                                                    producer.esgStatus ? (
                                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${producer.esgStatus === 'CONFORME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {producer.esgStatus === 'CONFORME' ? t('producer.esgStatus.noIssues') : t('producer.esgStatus.withIssues')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{t('producer.esgStatus.notAnalyzed')}</span>
                                                    )
                                                ) : (
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">-</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-xs font-medium text-slate-400">
                                                {producer.email || '-'}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black transition-all ${producer._count?.checklists > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                    {producer._count?.checklists || 0} {t('producer.active')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    {producer.maps?.[0]?.emeCode && (
                                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                                            {producer.maps[0].emeCode}
                                                        </span>
                                                    )}
                                                    {producer.maps?.[0]?.ruralRegionCode && (
                                                        <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                                                            RR {producer.maps[0].ruralRegionCode}
                                                        </span>
                                                    )}
                                                    {!producer.maps?.[0]?.emeCode && !producer.maps?.[0]?.ruralRegionCode && (
                                                        <span className="text-[9px] font-bold text-slate-300">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {format.dateTime(new Date(producer.createdAt), { dateStyle: 'short' })}
                                            </td>
                                            {!isReadOnly && (
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* ESG Analysis button - only for Brazilian producers */}
                                                        {(producer.countryCode === 'BR' || !producer.countryCode) && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const res = await fetch('/api/integration/esg/producer', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ producerId: producer.id, cpf: producer.cpf })
                                                                        });
                                                                        if (!res.ok) throw new Error('Analysis failed');
                                                                        queryClient.invalidateQueries({ queryKey: ['producers'] });
                                                                    } catch {
                                                                        alert(t('producer.reanalyzeError'));
                                                                    }
                                                                }}
                                                                className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                                                title={t('producer.reanalyze')}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/dashboard/produtores/${producer.id}`);
                                                            }}
                                                            className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                            title={t('producer.editProducer')}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedProducerId(producer.id);
                                                                setIsSendModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-200 transition-all group/btn"
                                                        >
                                                            <svg className="w-[12px] h-[12px] group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            {t('common.submit')}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandedId === producer.id && (
                                            <tr>
                                                <td colSpan={isReadOnly ? 8 : 8} className="p-0 border-none bg-slate-50/50">
                                                    <ProducerHistory producerId={producer.id} readOnly={isReadOnly} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 animate-fade-in shadow-inner">
                    <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                        {isReadOnly ? t('producer.noSubworkspaceProducers') : t('producer.noProducers')}
                    </h3>
                    <p className="text-slate-500 font-medium mb-10 max-w-xs mx-auto">
                        {isReadOnly ? t('producer.noSubworkspaceProducersDescription') : t('producer.noProducersDescription')}
                    </p>
                    {!isReadOnly && (
                        <button
                            onClick={() => router.push('/dashboard/produtores/new')}
                            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {t('producer.newProducer')}
                        </button>
                    )}
                </div>
            )}

            <SendChecklistModal
                isOpen={isSendModalOpen}
                onClose={() => {
                    setIsSendModalOpen(false);
                    setSelectedProducerId(undefined);
                }}
                initialProducerId={selectedProducerId}
            />
        </div>
    );
}
