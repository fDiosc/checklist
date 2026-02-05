'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useFormatter } from 'next-intl';
import { PORTAL_STATUS_INFO } from '@/lib/utils/status';
import { Building2, ChevronDown, Check } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    logoUrl: string | null;
    isSubworkspace: boolean;
}

export default function PortalDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
    const router = useRouter();
    const t = useTranslations();
    const format = useFormatter();

    // Helper to get status info with i18n
    const getStatusInfo = (status: string) => {
        const info = PORTAL_STATUS_INFO[status] || { labelKey: 'status.pending', class: 'bg-slate-100 text-slate-600' };
        return { label: t(info.labelKey), class: info.class };
    };

    const fetchData = async (cpf: string, workspaceId?: string | null) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ cpf });
            if (workspaceId) {
                params.append('workspaceId', workspaceId);
            }
            const res = await fetch(`/api/portal/checklists?${params.toString()}`);
            const responseData = await res.json();
            setData(responseData);
            setAvailableWorkspaces(responseData.availableWorkspaces || []);
            
            // Set selected workspace
            if (responseData.selectedWorkspace) {
                setSelectedWorkspace(responseData.selectedWorkspace);
            } else if (responseData.availableWorkspaces?.length > 0) {
                const storedWorkspaceId = localStorage.getItem('merx_portal_workspace');
                const found = responseData.availableWorkspaces.find((w: Workspace) => w.id === storedWorkspaceId);
                setSelectedWorkspace(found || responseData.availableWorkspaces[0]);
            }
        } catch {
            // Handle error silently
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cpf = localStorage.getItem('merx_portal_cpf');
        if (!cpf) {
            router.push('/portal');
            return;
        }

        const workspaceId = localStorage.getItem('merx_portal_workspace');
        fetchData(cpf, workspaceId);
    }, [router]);

    const handleWorkspaceSwitch = async (workspace: Workspace) => {
        localStorage.setItem('merx_portal_workspace', workspace.id);
        setSelectedWorkspace(workspace);
        setShowWorkspaceSwitcher(false);
        
        const cpf = localStorage.getItem('merx_portal_cpf');
        if (cpf) {
            await fetchData(cpf, workspace.id);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('merx_portal_cpf');
        localStorage.removeItem('merx_portal_workspace');
        router.push('/portal');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t('portal.dashboard.loading')}</p>
                </div>
            </div>
        );
    }

    const pendingStatuses = ['SENT', 'IN_PROGRESS', 'REJECTED'];
    const finishedStatuses = ['PENDING_REVIEW', 'APPROVED', 'FINALIZED', 'PARTIALLY_FINALIZED'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingChecklists = data?.checklists?.filter((c: any) => pendingStatuses.includes(c.status)) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finishedChecklists = data?.checklists?.filter((c: any) => finishedStatuses.includes(c.status)) || [];

    const hasMultipleWorkspaces = availableWorkspaces.length > 1;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900 p-6 md:p-10 text-white shadow-2xl">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {selectedWorkspace?.logoUrl ? (
                            <Image
                                src={selectedWorkspace.logoUrl}
                                alt={selectedWorkspace.name}
                                width={48}
                                height={48}
                                className="rounded-2xl shadow-lg shadow-emerald-500/20"
                            />
                        ) : (
                            <Image
                                src="/MX_logo_formC_Green.png"
                                alt="Maxsum"
                                width={48}
                                height={48}
                                className="rounded-2xl shadow-lg shadow-emerald-500/20 brightness-0 invert"
                            />
                        )}
                        <div>
                            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t('portal.dashboard.title')}</h1>
                            <p className="text-xl font-black truncate max-w-[250px]">{data?.producer?.name}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Workspace Switcher */}
                        {hasMultipleWorkspaces && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
                                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl border border-white/10 transition-all"
                                >
                                    <Building2 size={16} className="text-emerald-400" />
                                    <span className="text-sm font-bold text-white truncate max-w-[150px]">
                                        {selectedWorkspace?.name || t('portal.selectWorkspace.title')}
                                    </span>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showWorkspaceSwitcher ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showWorkspaceSwitcher && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setShowWorkspaceSwitcher(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[250px] animate-fade-in">
                                            <div className="p-3 border-b border-slate-700">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {t('portal.switchWorkspace.title')}
                                                </p>
                                            </div>
                                            <div className="p-2">
                                                {availableWorkspaces.map((workspace) => (
                                                    <button
                                                        key={workspace.id}
                                                        onClick={() => handleWorkspaceSwitch(workspace)}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                                            selectedWorkspace?.id === workspace.id
                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                : 'hover:bg-white/5 text-white'
                                                        }`}
                                                    >
                                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            {workspace.logoUrl ? (
                                                                <Image
                                                                    src={workspace.logoUrl}
                                                                    alt={workspace.name}
                                                                    width={32}
                                                                    height={32}
                                                                    className="rounded-lg object-cover"
                                                                />
                                                            ) : (
                                                                <Building2 size={14} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <span className="text-sm font-bold block truncate">{workspace.name}</span>
                                                            {workspace.isSubworkspace && (
                                                                <span className="text-[9px] text-indigo-400 font-bold uppercase">Subworkspace</span>
                                                            )}
                                                        </div>
                                                        {selectedWorkspace?.id === workspace.id && (
                                                            <Check size={16} className="text-emerald-400" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        <button
                            onClick={handleLogout}
                            className="text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/5 transition-all text-emerald-400"
                        >
                            {t('portal.dashboard.logout')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-10 -mt-8">
                {/* Current workspace indicator */}
                {hasMultipleWorkspaces && selectedWorkspace && (
                    <div className="mb-6 bg-white border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm animate-fade-in">
                        <Building2 size={16} className="text-indigo-500" />
                        <span className="text-sm text-slate-600">
                            {t('portal.dashboard.viewingChecklists')}: <span className="font-bold text-slate-900">{selectedWorkspace.name}</span>
                        </span>
                    </div>
                )}

                <div className="grid gap-10">
                    {/* Pendentes */}
                    <section className="animate-fade-in">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                            {t('portal.dashboard.pendingChecklists')}
                            <div className="flex-1 h-[1px] bg-slate-200" />
                        </h2>
                        {pendingChecklists.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {pendingChecklists.map((c: any) => {
                                    const status = getStatusInfo(c.status);
                                    return (
                                        <Link
                                            key={c.id}
                                            href={`/c/${c.publicToken}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 hover:border-emerald-500 transition-all hover:scale-[1.01]"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 leading-tight pr-8">{c.template.name}</h3>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-slate-400 font-medium">{t('portal.dashboard.createdAt', { date: format.dateTime(new Date(c.createdAt), { dateStyle: 'short' }) })}</p>
                                                    {hasMultipleWorkspaces && c.workspaceName && (
                                                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                                                            {c.workspaceName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">{t('portal.dashboard.noPending')}</p>
                            </div>
                        )}
                    </section>

                    {/* Concluídos */}
                    {finishedChecklists.length > 0 && (
                        <section className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity">
                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                {t('portal.dashboard.history')}
                                <div className="flex-1 h-[1px] bg-slate-200" />
                            </h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {finishedChecklists.map((c: any) => {
                                    const status = getStatusInfo(c.status);
                                    return (
                                        <Link
                                            key={c.id}
                                            href={`/c/${c.publicToken}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${status.class}`}>
                                                    {status.label}
                                                </span>
                                                {hasMultipleWorkspaces && c.workspaceName && (
                                                    <span className="text-[8px] font-bold text-indigo-500">
                                                        {c.workspaceName}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 truncate">{c.template.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold">{t('portal.dashboard.sentAt', { date: format.dateTime(new Date(c.submittedAt || c.updatedAt), { dateStyle: 'short' }) })}</p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}
