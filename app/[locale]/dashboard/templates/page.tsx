'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Copy, Send, Folder, Trash2, Filter, Building2, Lock, Eye } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useFormatter } from 'next-intl';
import SendChecklistModal from '@/components/modals/SendChecklistModal';

export default function TemplatesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const t = useTranslations();
    const format = useFormatter();
    const [searchTerm, setSearchTerm] = useState('');
    const [folderFilter, setFolderFilter] = useState('');
    const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
    const [originFilter, setOriginFilter] = useState<'all' | 'own' | 'parent'>('all');
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

    const { data: templates, isLoading } = useQuery({
        queryKey: ['templates', searchTerm, folderFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (folderFilter) params.append('folder', folderFilter);
            const res = await fetch(`/api/templates?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to duplicate template');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete template');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    // Check if user is in a subworkspace by checking if any template is assigned
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isInSubworkspace = templates?.some((t: any) => t.isAssigned === true) ?? false;
    
    // Filtrar por status de uso e origem localmente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredTemplates = templates?.filter((t: any) => {
        // Usage filter
        if (usageFilter === 'used' && t._count?.checklists === 0) return false;
        if (usageFilter === 'unused' && t._count?.checklists > 0) return false;
        
        // Origin filter (only applies if in subworkspace)
        if (isInSubworkspace && originFilter !== 'all') {
            if (originFilter === 'own' && t.isAssigned) return false;
            if (originFilter === 'parent' && !t.isAssigned) return false;
        }
        
        return true;
    });

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        {t('template.title')}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        {t('template.description')}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/templates/new')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={20} />
                    {t('template.newTemplate')}
                </button>
            </div>

            {/* Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isInSubworkspace ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-8 animate-slide-up`} style={{ animationDelay: '0.1s' }}>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder={t('template.searchPlaceholder')}
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Folder size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder={t('template.filterByFolder')}
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={folderFilter}
                        onChange={(e) => setFolderFilter(e.target.value)}
                    />
                </div>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                        <Filter size={18} />
                    </div>
                    <select
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
                        value={usageFilter}
                        onChange={(e) => setUsageFilter(e.target.value as 'all' | 'used' | 'unused')}
                    >
                        <option value="all">{t('template.allTemplates')}</option>
                        <option value="used">{t('template.withChecklists')}</option>
                        <option value="unused">{t('template.withoutChecklists')}</option>
                    </select>
                </div>
                {isInSubworkspace && (
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                            <Building2 size={18} />
                        </div>
                        <select
                            className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-500/5 transition-all appearance-none cursor-pointer"
                            value={originFilter}
                            onChange={(e) => setOriginFilter(e.target.value as 'all' | 'own' | 'parent')}
                        >
                            <option value="all">{t('template.originFilter.all')}</option>
                            <option value="own">{t('template.originFilter.own')}</option>
                            <option value="parent">{t('template.originFilter.parent')}</option>
                        </select>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('common.loading')}</p>
                </div>
            ) : filteredTemplates && filteredTemplates.length > 0 ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('template.table.name')}</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('template.table.folder')}</th>
                                    {isInSubworkspace && (
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('template.table.origin')}</th>
                                    )}
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('template.table.sectionsItems')}</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('template.table.usage')}</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {filteredTemplates.map((template: any, idx: number) => (
                                    <tr
                                        key={template.id}
                                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group animate-slide-up"
                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/5 p-3 rounded-xl text-primary">
                                                    <Folder size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{template.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{t('dates.createdAt', { date: format.dateTime(new Date(template.createdAt), { dateStyle: 'short' }) })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                                {template.folder}
                                            </span>
                                        </td>
                                        {isInSubworkspace && (
                                            <td className="px-8 py-6 text-center">
                                                {template.isAssigned ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-widest border border-violet-100">
                                                        <Building2 size={12} />
                                                        {t('template.origin.parent')}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                        {t('template.origin.own')}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xs font-bold text-slate-600">
                                                {template._count?.sections || 0} {t('template.stats.sections')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                {template._count?.checklists || 0} {t('template.stats.used')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Read-only indicator for assigned templates */}
                                                {template.isReadOnly && (
                                                    <span className="p-2 text-slate-300" title={t('template.readOnly')}>
                                                        <Lock size={16} />
                                                    </span>
                                                )}
                                                {/* View button - shown when template has been used (read-only) */}
                                                {(template.isReadOnly || template._count?.checklists > 0) && (
                                                    <button
                                                        onClick={() => router.push(`/dashboard/templates/${template.id}`)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title={t('template.viewTemplate') || 'Visualizar Template'}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                {/* Edit button - disabled if read-only or has checklists */}
                                                {!template.isReadOnly && template._count?.checklists === 0 && (
                                                    <button
                                                        onClick={() => router.push(`/dashboard/templates/${template.id}`)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                        title={t('template.edit')}
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {/* Duplicate button - always available */}
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t('template.confirmDuplicate'))) {
                                                            duplicateMutation.mutate(template.id);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={t('template.duplicate')}
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                {/* Delete button - disabled if read-only or has checklists */}
                                                <button
                                                    onClick={() => {
                                                        if (template.isReadOnly || template._count?.checklists > 0) return;
                                                        if (confirm(t('template.confirmDelete'))) {
                                                            deleteMutation.mutate(template.id);
                                                        }
                                                    }}
                                                    disabled={template.isReadOnly || template._count?.checklists > 0}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        template.isReadOnly || template._count?.checklists > 0
                                                            ? 'text-slate-200 cursor-not-allowed'
                                                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                    title={
                                                        template.isReadOnly 
                                                            ? t('template.readOnlyHint')
                                                            : template._count?.checklists > 0 
                                                                ? t('template.inUseDeleteHint') 
                                                                : t('template.delete')
                                                    }
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                {/* Send checklist button - always available */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedTemplateId(template.id);
                                                        setIsSendModalOpen(true);
                                                    }}
                                                    className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                                                    title={t('template.sendChecklist')}
                                                >
                                                    <Send size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{t('template.noTemplates')}</h3>
                    <p className="text-slate-500 font-medium mb-10">{t('template.noTemplatesDescription')}</p>
                    <button
                        onClick={() => router.push('/dashboard/templates/new')}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                        {t('template.createTemplate')}
                    </button>
                </div>
            )}

            <SendChecklistModal
                isOpen={isSendModalOpen}
                onClose={() => {
                    setIsSendModalOpen(false);
                    setSelectedTemplateId(undefined);
                }}
                initialTemplateId={selectedTemplateId}
            />
        </div>
    );
}
