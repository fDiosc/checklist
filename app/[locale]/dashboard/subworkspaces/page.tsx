'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
    Plus, Search, Loader2, X, Check, Network, Users, ClipboardList, UserPlus, ChevronDown, ChevronUp
} from 'lucide-react';

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

interface SubworkspaceUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    workspace: { id: string; name: string; slug: string } | null;
}

export default function SubworkspacesPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState<string | null>(null);

    // Form state for new subworkspace
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [newCnpj, setNewCnpj] = useState('');
    const [newLogoUrl, setNewLogoUrl] = useState('');

    // Form state for new user
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'SUPERVISOR'>('ADMIN');

    const workspaceId = session?.user?.workspaceId;

    const { data, isLoading } = useQuery({
        queryKey: ['subworkspaces', workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/subworkspaces`);
            if (!res.ok) throw new Error('Failed to fetch subworkspaces');
            return res.json();
        },
        enabled: !!workspaceId
    });

    // Fetch all users visible to this admin (includes subworkspace users)
    const { data: allUsers = [] } = useQuery<SubworkspaceUser[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        },
        enabled: !!workspaceId
    });

    const createSubworkspaceMutation = useMutation({
        mutationFn: async (data: { name: string; slug: string; cnpj?: string; logoUrl?: string }) => {
            const res = await fetch(`/api/workspaces/${workspaceId}/subworkspaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subworkspaces'] });
            setIsCreateOpen(false);
            setNewName('');
            setNewSlug('');
            setNewCnpj('');
            setNewLogoUrl('');
        }
    });

    const createUserMutation = useMutation({
        mutationFn: async (data: { email: string; name: string; password: string; role: string; workspaceId: string }) => {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create user');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['subworkspaces'] });
            setIsCreateUserOpen(null);
            setNewUserEmail('');
            setNewUserName('');
            setNewUserPassword('');
            setNewUserRole('ADMIN');
        }
    });

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    const subworkspaces: Subworkspace[] = data?.subworkspaces || [];
    const filtered = subworkspaces.filter(sw =>
        sw.name.toLowerCase().includes(search.toLowerCase()) ||
        sw.slug.toLowerCase().includes(search.toLowerCase())
    );

    const getUsersForWorkspace = (wsId: string) =>
        allUsers.filter(u => u.workspace?.id === wsId);

    const handleCreateSubworkspace = () => {
        if (!newName.trim() || !newSlug.trim()) return;
        createSubworkspaceMutation.mutate({
            name: newName.trim(),
            slug: newSlug.trim().toLowerCase(),
            cnpj: newCnpj.trim() || undefined,
            logoUrl: newLogoUrl.trim() || undefined,
        });
    };

    const handleCreateUser = (subWsId: string) => {
        if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) return;
        createUserMutation.mutate({
            email: newUserEmail.trim(),
            name: newUserName.trim(),
            password: newUserPassword.trim(),
            role: newUserRole,
            workspaceId: subWsId,
        });
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {t('subworkspaces.title') || 'Subworkspaces'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('subworkspaces.description') || 'Gerencie os subworkspaces da sua organização'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
                >
                    <Plus size={18} />
                    {t('subworkspaces.create') || 'Novo Subworkspace'}
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('subworkspaces.search') || 'Buscar subworkspaces...'}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setIsCreateOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900">{t('subworkspaces.createTitle') || 'Novo Subworkspace'}</h2>
                            <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('common.name') || 'Nome'}</label>
                                <input value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug || newSlug === newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Nome do subworkspace" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slug</label>
                                <input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="slug-unico" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CNPJ</label>
                                <input value={newCnpj} onChange={e => setNewCnpj(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Opcional" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logo URL</label>
                                <input value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="https://... (opcional)" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm">
                                {t('common.cancel') || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleCreateSubworkspace}
                                disabled={createSubworkspaceMutation.isPending || !newName.trim() || !newSlug.trim()}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createSubworkspaceMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {t('common.create') || 'Criar'}
                            </button>
                        </div>
                        {createSubworkspaceMutation.isError && (
                            <p className="text-red-500 text-xs mt-3 font-medium">{createSubworkspaceMutation.error.message}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Subworkspaces List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
                    <Network size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">{t('subworkspaces.empty') || 'Nenhum subworkspace encontrado'}</p>
                    <p className="text-slate-400 text-sm mt-1">{t('subworkspaces.emptyHint') || 'Crie o primeiro subworkspace para começar.'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(sw => {
                        const isExpanded = expandedId === sw.id;
                        const swUsers = getUsersForWorkspace(sw.id);
                        return (
                            <div key={sw.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                {/* Card Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : sw.id)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        {sw.logoUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={sw.logoUrl} alt={sw.name} className="w-10 h-10 rounded-xl object-contain border border-slate-100" />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                                <span className="font-black text-slate-400">{sw.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-slate-900">{sw.name}</h3>
                                            <p className="text-xs text-slate-400 font-medium">{sw.slug}{sw.cnpj ? ` · ${sw.cnpj}` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><Users size={14} /> {sw._count.users}</span>
                                            <span className="flex items-center gap-1"><ClipboardList size={14} /> {sw._count.checklists}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </div>
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-6 bg-slate-50/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                                {t('subworkspaces.users') || 'Usuários'} ({swUsers.length})
                                            </h4>
                                            <button
                                                onClick={() => setIsCreateUserOpen(sw.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                                            >
                                                <UserPlus size={14} />
                                                {t('subworkspaces.addUser') || 'Adicionar Usuário'}
                                            </button>
                                        </div>

                                        {swUsers.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic py-4">{t('subworkspaces.noUsers') || 'Nenhum usuário neste subworkspace. Adicione o primeiro administrador.'}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {swUsers.map(u => (
                                                    <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700">{u.name || u.email}</p>
                                                            <p className="text-xs text-slate-400">{u.email}</p>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{u.role}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Create User Form (inline) */}
                                        {isCreateUserOpen === sw.id && (
                                            <div className="mt-4 p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                                                <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest">{t('subworkspaces.newUser') || 'Novo Usuário'}</h5>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder={t('common.name') || 'Nome'} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                    <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email" type="email" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                    <input value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder={t('common.password') || 'Senha'} type="password" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'ADMIN' | 'SUPERVISOR')} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                                        <option value="ADMIN">Admin</option>
                                                        <option value="SUPERVISOR">Supervisor</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setIsCreateUserOpen(null)} className="px-4 py-2 text-slate-400 hover:bg-slate-50 rounded-lg text-xs font-bold">{t('common.cancel') || 'Cancelar'}</button>
                                                    <button
                                                        onClick={() => handleCreateUser(sw.id)}
                                                        disabled={createUserMutation.isPending || !newUserEmail || !newUserName || !newUserPassword}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
                                                    >
                                                        {createUserMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                        {t('common.create') || 'Criar'}
                                                    </button>
                                                </div>
                                                {createUserMutation.isError && (
                                                    <p className="text-red-500 text-xs font-medium">{createUserMutation.error.message}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
