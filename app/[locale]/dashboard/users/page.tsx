'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { 
    Plus, Search, Edit2, Trash2, Loader2, AlertCircle, 
    UserPlus, Shield, Users, Building2, Key, X, Check
} from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'SUPERADMIN' | 'ADMIN' | 'SUPERVISOR' | 'PRODUCER';
    cpf: string | null;
    mustChangePassword: boolean;
    createdAt: string;
    workspace: { id: string; name: string; slug: string } | null;
}

interface Subworkspace {
    id: string;
    name: string;
    slug: string;
}

interface WorkspaceWithSubs {
    id: string;
    name: string;
    slug: string;
    hasSubworkspaces: boolean;
    subworkspaces: Subworkspace[];
}

interface WorkspacesResponse {
    workspaces: WorkspaceWithSubs[];
}

const roleColors: Record<string, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    SUPERVISOR: 'bg-emerald-100 text-emerald-700',
    PRODUCER: 'bg-amber-100 text-amber-700',
};

const roleLabels: Record<string, string> = {
    SUPERADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    PRODUCER: 'Produtor',
};

export default function UsersPage() {
    const t = useTranslations();
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        }
    });

    const { data: workspacesData } = useQuery<WorkspacesResponse>({
        queryKey: ['workspaces-all'],
        queryFn: async () => {
            const res = await fetch('/api/workspaces/all');
            if (!res.ok) throw new Error('Failed to fetch workspaces');
            return res.json();
        },
        enabled: isSuperAdmin,
    });

    const workspaces = workspacesData?.workspaces || [];

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao excluir');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setDeleteConfirm(null);
        },
    });

    const filteredUsers = users.filter(user => 
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-xl">
                            <Users className="text-purple-600" size={24} />
                        </div>
                        {t('navigation.users')}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gerencie usuários e permissões do sistema
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
                >
                    <UserPlus size={18} />
                    Novo Usuário
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Usuário
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Função
                                    </th>
                                    {isSuperAdmin && (
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Workspace
                                        </th>
                                    )}
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900">{user.name || 'Sem nome'}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${roleColors[user.role]}`}>
                                                <Shield size={12} />
                                                {roleLabels[user.role]}
                                            </span>
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-6 py-4">
                                                {user.workspace ? (
                                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                                                        <Building2 size={14} />
                                                        {user.workspace.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">Global</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            {user.mustChangePassword ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                    <Key size={12} />
                                                    Alterar Senha
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                    <Check size={12} />
                                                    Ativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} className="text-slate-600" />
                                                </button>
                                                {user.role !== 'SUPERADMIN' && user.id !== session?.user?.id && (
                                                    deleteConfirm === user.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => deleteMutation.mutate(user.id)}
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
                                                            onClick={() => setDeleteConfirm(user.id)}
                                                            className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} className="text-red-500" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Modal */}
            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    workspaces={workspaces}
                    isSuperAdmin={isSuperAdmin}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingUser(null);
                    }}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                        setIsModalOpen(false);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
}

interface UserModalProps {
    user: User | null;
    workspaces: WorkspaceWithSubs[];
    isSuperAdmin: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function UserModal({ user, workspaces, isSuperAdmin, onClose, onSuccess }: UserModalProps) {
    // Find if user's workspace is a subworkspace
    const findUserWorkspaceInfo = () => {
        if (!user?.workspace?.id) return { parentId: '', subId: '' };
        
        // Check if it's a parent workspace
        const isParent = workspaces.find(ws => ws.id === user.workspace?.id);
        if (isParent) return { parentId: user.workspace.id, subId: '' };
        
        // Check if it's a subworkspace
        for (const ws of workspaces) {
            const sub = ws.subworkspaces?.find(s => s.id === user.workspace?.id);
            if (sub) return { parentId: ws.id, subId: sub.id };
        }
        return { parentId: '', subId: '' };
    };

    const userWsInfo = findUserWorkspaceInfo();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'SUPERVISOR',
        parentWorkspaceId: userWsInfo.parentId,
        subworkspaceId: userWsInfo.subId,
        cpf: user?.cpf || '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Get selected parent workspace
    const selectedParentWorkspace = workspaces.find(ws => ws.id === formData.parentWorkspaceId);
    const hasSubworkspaces = selectedParentWorkspace?.hasSubworkspaces && 
        (selectedParentWorkspace?.subworkspaces?.length || 0) > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const url = user ? `/api/users/${user.id}` : '/api/users';
            const method = user ? 'PUT' : 'POST';

            const body: Record<string, unknown> = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
            };

            // Password is required for new users, optional for edit
            if (formData.password || !user) {
                body.password = formData.password;
            }

            // Only send cpf if it has value
            if (formData.cpf) {
                body.cpf = formData.cpf;
            }

            // SuperAdmin can assign workspace - use subworkspace if selected, otherwise parent
            if (isSuperAdmin) {
                if (formData.subworkspaceId) {
                    body.workspaceId = formData.subworkspaceId;
                } else if (formData.parentWorkspaceId) {
                    body.workspaceId = formData.parentWorkspaceId;
                }
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                // Show validation details if available
                if (data.details?.fieldErrors) {
                    const fieldErrors = Object.entries(data.details.fieldErrors)
                        .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
                        .join('; ');
                    throw new Error(fieldErrors || data.error || 'Erro ao salvar');
                }
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
                        {user ? 'Editar Usuário' : 'Novo Usuário'}
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
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {user ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required={!user}
                            minLength={8}
                        />
                        <p className="text-xs text-slate-400 mt-1">Mínimo 8 caracteres</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Função *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="ADMIN">Admin</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="PRODUCER">Produtor</option>
                        </select>
                    </div>

                    {isSuperAdmin && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Workspace *
                                </label>
                                <select
                                    value={formData.parentWorkspaceId}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        parentWorkspaceId: e.target.value,
                                        subworkspaceId: '' // Reset subworkspace when parent changes
                                    })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="">Global (sem workspace)</option>
                                    {workspaces.map((ws) => (
                                        <option key={ws.id} value={ws.id}>
                                            {ws.name} {ws.hasSubworkspaces ? `(${ws.subworkspaces.length} subs)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {hasSubworkspaces && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Subworkspace (opcional)
                                    </label>
                                    <select
                                        value={formData.subworkspaceId}
                                        onChange={(e) => setFormData({ ...formData, subworkspaceId: e.target.value })}
                                        className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
                                    >
                                        <option value="">Workspace principal ({selectedParentWorkspace?.name})</option>
                                        {selectedParentWorkspace?.subworkspaces.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                ↳ {sub.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-indigo-500 mt-1">
                                        Se selecionado, o usuário pertencerá ao subworkspace
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            CPF (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.cpf}
                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="000.000.000-00"
                        />
                    </div>

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
                                    {user ? 'Salvar' : 'Criar Usuário'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
