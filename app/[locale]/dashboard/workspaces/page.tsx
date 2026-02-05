'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    Plus, Search, Edit2, Trash2, Loader2, AlertCircle,
    Building2, Users, FileText, ClipboardList, X, Check, Network, ChevronRight
} from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    cnpj: string | null;
    hasSubworkspaces: boolean;
    parentWorkspaceId: string | null;
    createdAt: string;
    _count: {
        users: number;
        producers: number;
        templates: number;
        checklists: number;
        subworkspaces: number;
    };
}

interface Subworkspace {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    cnpj: string | null;
    createdAt: string;
    _count: {
        users: number;
        checklists: number;
        producers: number;
    };
}

export default function WorkspacesPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [subworkspaceModal, setSubworkspaceModal] = useState<Workspace | null>(null);

    const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

    const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
        queryKey: ['workspaces'],
        queryFn: async () => {
            const res = await fetch('/api/workspaces');
            if (!res.ok) throw new Error('Failed to fetch workspaces');
            return res.json();
        },
        enabled: isSuperAdmin
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao excluir');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            setDeleteConfirm(null);
        },
    });

    // Show loading while checking session
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    // Redirect if not SuperAdmin (only on client side)
    if (status === 'authenticated' && !isSuperAdmin) {
        if (typeof window !== 'undefined') {
            router.push(`/${locale}/dashboard`);
        }
        return null;
    }

    const filteredWorkspaces = workspaces.filter(ws =>
        ws.name.toLowerCase().includes(search.toLowerCase()) ||
        ws.slug.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingWorkspace(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Building2 className="text-indigo-600" size={24} />
                        </div>
                        {t('navigation.workspaces')}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gerencie workspaces e organizações
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
                >
                    <Plus size={18} />
                    Novo Workspace
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou slug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            {/* Workspaces Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
            ) : filteredWorkspaces.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
                    <Building2 size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum workspace encontrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className="bg-white rounded-[2rem] border border-slate-200 p-6 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {workspace.logoUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={workspace.logoUrl}
                                            alt={workspace.name}
                                            className="w-12 h-12 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                            <Building2 className="text-indigo-600" size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-slate-900">{workspace.name}</h3>
                                        <p className="text-xs text-slate-400 font-mono">{workspace.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(workspace)}
                                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} className="text-slate-600" />
                                    </button>
                                    {deleteConfirm === workspace.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => deleteMutation.mutate(workspace.id)}
                                                disabled={deleteMutation.isPending}
                                                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                                            >
                                                {deleteMutation.isPending ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Check size={16} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="p-2 bg-slate-200 rounded-xl hover:bg-slate-300 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(workspace.id)}
                                            className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Subworkspaces indicator */}
                                {!workspace.parentWorkspaceId && (
                                    <button
                                        onClick={() => setSubworkspaceModal(workspace)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all mb-3 ${
                                            workspace.hasSubworkspaces 
                                                ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Network size={16} className={workspace.hasSubworkspaces ? 'text-indigo-500' : 'text-slate-400'} />
                                            <span className={`text-sm font-medium ${workspace.hasSubworkspaces ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                {workspace.hasSubworkspaces 
                                                    ? `${workspace._count?.subworkspaces || 0} subworkspaces`
                                                    : 'Habilitar subworkspaces'
                                                }
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className={workspace.hasSubworkspaces ? 'text-indigo-400' : 'text-slate-400'} />
                                    </button>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Users size={14} className="text-slate-400" />
                                        <span className="font-medium">{workspace._count.users}</span>
                                        <span className="text-slate-400">usuários</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Users size={14} className="text-slate-400" />
                                        <span className="font-medium">{workspace._count.producers}</span>
                                        <span className="text-slate-400">produtores</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <FileText size={14} className="text-slate-400" />
                                        <span className="font-medium">{workspace._count.templates}</span>
                                        <span className="text-slate-400">templates</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <ClipboardList size={14} className="text-slate-400" />
                                        <span className="font-medium">{workspace._count.checklists}</span>
                                        <span className="text-slate-400">checklists</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            {/* Subworkspace Modal */}
            {subworkspaceModal && (
                <SubworkspaceModal
                    workspace={subworkspaceModal}
                    onClose={() => setSubworkspaceModal(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                    }}
                />
            )}

            {/* Workspace Modal */}
            {isModalOpen && (
                <WorkspaceModal
                    workspace={editingWorkspace}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingWorkspace(null);
                    }}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                        setIsModalOpen(false);
                        setEditingWorkspace(null);
                    }}
                />
            )}
        </div>
    );
}

interface WorkspaceModalProps {
    workspace: Workspace | null;
    onClose: () => void;
    onSuccess: () => void;
}

function WorkspaceModal({ workspace, onClose, onSuccess }: WorkspaceModalProps) {
    const [formData, setFormData] = useState({
        name: workspace?.name || '',
        slug: workspace?.slug || '',
        logoUrl: workspace?.logoUrl || '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: workspace ? formData.slug : generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const url = workspace ? `/api/workspaces/${workspace.id}` : '/api/workspaces';
            const method = workspace ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    slug: formData.slug,
                    logoUrl: formData.logoUrl || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao salvar');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                        {workspace ? 'Editar Workspace' : 'Novo Workspace'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Nome *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Minha Empresa"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Slug *
                        </label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            placeholder="minha-empresa"
                            required
                        />
                        <p className="text-xs text-slate-400 mt-1">Identificador único (apenas letras minúsculas, números e hífens)</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            URL do Logo (opcional)
                        </label>
                        <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="https://..."
                        />
                    </div>

                    {formData.logoUrl && (
                        <div className="flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={formData.logoUrl}
                                alt="Preview"
                                className="w-24 h-24 rounded-xl object-cover border border-slate-200"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus size={18} />
                                    {workspace ? 'Salvar' : 'Criar Workspace'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Subworkspace Management Modal
interface SubworkspaceModalProps {
    workspace: Workspace;
    onClose: () => void;
    onSuccess: () => void;
}

function SubworkspaceModal({ workspace, onClose, onSuccess }: SubworkspaceModalProps) {
    const locale = useLocale();
    const [isCreating, setIsCreating] = useState(false);
    const [newSubworkspace, setNewSubworkspace] = useState({
        name: '',
        slug: '',
        cnpj: '',
        logoUrl: ''
    });
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    // Fetch subworkspaces
    const { data: subworkspacesData, isLoading } = useQuery({
        queryKey: ['subworkspaces', workspace.id],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspace.id}/subworkspaces`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });

    const subworkspaces: Subworkspace[] = subworkspacesData?.subworkspaces || [];
    // Use API response for hasSubworkspaces state (updates after toggle)
    const hasSubworkspacesEnabled = subworkspacesData?.parentWorkspace?.hasSubworkspaces ?? workspace.hasSubworkspaces;

    // Toggle subworkspaces mutation
    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch(`/api/workspaces/${workspace.id}/toggle-subworkspaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to toggle');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subworkspaces', workspace.id] });
            onSuccess();
        }
    });

    // Create subworkspace mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof newSubworkspace) => {
            const res = await fetch(`/api/workspaces/${workspace.id}/subworkspaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || 'Failed to create');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subworkspaces', workspace.id] });
            onSuccess();
            setIsCreating(false);
            setNewSubworkspace({ name: '', slug: '', cnpj: '', logoUrl: '' });
            setError('');
        },
        onError: (err: Error) => {
            setError(err.message);
        }
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (name: string) => {
        setNewSubworkspace({
            ...newSubworkspace,
            name,
            slug: generateSlug(name)
        });
    };

    const handleCreate = () => {
        if (!newSubworkspace.name || !newSubworkspace.slug) {
            setError('Nome e slug são obrigatórios');
            return;
        }
        createMutation.mutate(newSubworkspace);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Network className="text-indigo-500" size={20} />
                            Subworkspaces
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {workspace.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Toggle */}
                    {!hasSubworkspacesEnabled ? (
                        <div className="bg-slate-50 rounded-2xl p-6 text-center">
                            <Network className="mx-auto text-slate-400 mb-4" size={48} />
                            <h3 className="font-bold text-slate-900 mb-2">Habilitar Subworkspaces</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Subworkspaces permitem criar organizações vinculadas que compartilham dados com o workspace pai, 
                                mas têm seus próprios usuários e checklists.
                            </p>
                            <button
                                onClick={() => toggleMutation.mutate(true)}
                                disabled={toggleMutation.isPending}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                                {toggleMutation.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}
                                Habilitar Subworkspaces
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Subworkspaces list */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-slate-400" size={32} />
                                </div>
                            ) : subworkspaces.length === 0 && !isCreating ? (
                                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                                    <Network className="mx-auto text-slate-300 mb-3" size={40} />
                                    <p className="text-slate-500 mb-4">Nenhum subworkspace criado ainda</p>
                                    <button
                                        onClick={() => toggleMutation.mutate(false)}
                                        disabled={toggleMutation.isPending}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {toggleMutation.isPending ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <X size={14} />
                                        )}
                                        Desabilitar Subworkspaces
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {subworkspaces.map((sw) => (
                                        <div
                                            key={sw.id}
                                            className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                {sw.logoUrl ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={sw.logoUrl}
                                                        alt={sw.name}
                                                        className="w-10 h-10 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                        <Building2 className="text-indigo-600" size={18} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{sw.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <span className="font-mono">{sw.slug}</span>
                                                        {sw.cnpj && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{sw.cnpj}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Users size={14} />
                                                        <span>{sw._count?.users || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ClipboardList size={14} />
                                                        <span>{sw._count?.checklists || 0}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => window.location.href = `/${locale}/dashboard/users`}
                                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Gerenciar usuários"
                                                >
                                                    <Users size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Create form */}
                            {isCreating ? (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 space-y-4">
                                    <h3 className="font-bold text-indigo-900">Novo Subworkspace</h3>
                                    
                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                Nome *
                                            </label>
                                            <input
                                                type="text"
                                                value={newSubworkspace.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="Empresa Filial"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                Slug *
                                            </label>
                                            <input
                                                type="text"
                                                value={newSubworkspace.slug}
                                                onChange={(e) => setNewSubworkspace({ ...newSubworkspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                                placeholder="empresa-filial"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                CNPJ (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={newSubworkspace.cnpj}
                                                onChange={(e) => setNewSubworkspace({ ...newSubworkspace, cnpj: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="00.000.000/0001-00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                Logo URL (opcional)
                                            </label>
                                            <input
                                                type="url"
                                                value={newSubworkspace.logoUrl}
                                                onChange={(e) => setNewSubworkspace({ ...newSubworkspace, logoUrl: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2">
                                        <button
                                            onClick={() => {
                                                setIsCreating(false);
                                                setError('');
                                            }}
                                            className="px-4 py-2 bg-white text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreate}
                                            disabled={createMutation.isPending}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {createMutation.isPending ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : (
                                                <Plus size={16} />
                                            )}
                                            Criar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
                                >
                                    <Plus size={18} />
                                    Adicionar Subworkspace
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
