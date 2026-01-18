'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Copy, Send, Folder, Trash2, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SendChecklistModal from '@/components/modals/SendChecklistModal';

export default function TemplatesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [folderFilter, setFolderFilter] = useState('');
    const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
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

    // Filtrar por status de uso localmente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredTemplates = templates?.filter((t: any) => {
        if (usageFilter === 'used') return t._count?.checklists > 0;
        if (usageFilter === 'unused') return t._count?.checklists === 0;
        return true;
    });

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        Biblioteca de Templates
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Gerencie e duplique seus formulários de coleta
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/templates/new')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={20} />
                    Novo Template
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
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
                        placeholder="Filtrar por pasta/categoria..."
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
                        <option value="all">Todos os templates</option>
                        <option value="used">Em uso (com checklists)</option>
                        <option value="unused">Não utilizados</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Carregando Biblioteca...</p>
                </div>
            ) : filteredTemplates && filteredTemplates.length > 0 ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Template</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pasta</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seções/Itens</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Uso</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
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
                                                    <p className="text-[10px] text-slate-400 font-medium">Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                                {template.folder}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xs font-bold text-slate-600">
                                                {template._count?.sections || 0} Seções
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                {template._count?.checklists || 0} Utilizados
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (template._count?.checklists > 0) return;
                                                        router.push(`/dashboard/templates/${template.id}`);
                                                    }}
                                                    disabled={template._count?.checklists > 0}
                                                    className={`p-2 rounded-lg transition-all ${template._count?.checklists > 0
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-primary hover:bg-primary/5'
                                                        }`}
                                                    title={template._count?.checklists > 0 ? "Template em uso não pode ser editado estruturalmente. Duplique para alterar." : "Editar Template"}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Deseja duplicar este template?')) {
                                                            duplicateMutation.mutate(template.id);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Duplicar Template"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (template._count?.checklists > 0) return;
                                                        if (confirm('Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.')) {
                                                            deleteMutation.mutate(template.id);
                                                        }
                                                    }}
                                                    disabled={template._count?.checklists > 0}
                                                    className={`p-2 rounded-lg transition-all ${template._count?.checklists > 0
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                    title={template._count?.checklists > 0 ? "Template em uso não pode ser excluído" : "Excluir Template"}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTemplateId(template.id);
                                                        setIsSendModalOpen(true);
                                                    }}
                                                    className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                                                    title="Enviar Checklist"
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
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Biblioteca Vazia</h3>
                    <p className="text-slate-500 font-medium mb-10">Crie seu primeiro template para começar.</p>
                    <button
                        onClick={() => router.push('/dashboard/templates/new')}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                        Criar Agora
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
