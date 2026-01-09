'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PortalDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const cpf = localStorage.getItem('merx_portal_cpf');
        if (!cpf) {
            router.push('/portal');
            return;
        }

        fetch(`/api/portal/checklists?cpf=${cpf}`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Painel...</p>
                </div>
            </div>
        );
    }

    const pendingStatuses = ['SENT', 'IN_PROGRESS', 'REJECTED'];
    const finishedStatuses = ['PENDING_REVIEW', 'APPROVED', 'FINALIZED'];

    const pendingChecklists = data?.checklists?.filter((c: any) => pendingStatuses.includes(c.status)) || [];
    const finishedChecklists = data?.checklists?.filter((c: any) => finishedStatuses.includes(c.status)) || [];

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'SENT': return { label: 'Pendente', class: 'bg-amber-100 text-amber-700' };
            case 'IN_PROGRESS': return { label: 'Em Preenchimento', class: 'bg-blue-100 text-blue-700' };
            case 'REJECTED': return { label: 'Revisão Necessária', class: 'bg-red-100 text-red-700' };
            case 'PENDING_REVIEW': return { label: 'Em Auditoria', class: 'bg-indigo-100 text-indigo-700' };
            case 'APPROVED': return { label: 'Aprovado', class: 'bg-emerald-100 text-emerald-700' };
            case 'FINALIZED': return { label: 'Finalizado', class: 'bg-slate-100 text-slate-700' };
            default: return { label: status, class: 'bg-gray-100 text-gray-700' };
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900 p-6 md:p-10 text-white shadow-2xl">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <rect width="7" height="7" x="3" y="3" rx="2" /><rect width="7" height="7" x="14" y="3" rx="2" /><rect width="7" height="7" x="14" y="14" rx="2" /><rect width="7" height="7" x="3" y="14" rx="2" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Maxsum Portal</h1>
                            <p className="text-xl font-black truncate max-w-[250px]">{data?.producer?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { localStorage.removeItem('merx_portal_cpf'); router.push('/portal'); }}
                        className="text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/5 transition-all text-emerald-400"
                    >
                        Sair do Portal
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-10 -mt-8">
                <div className="grid gap-10">
                    {/* Pendentes */}
                    <section className="animate-fade-in">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                            Checklists Pendentes
                            <div className="flex-1 h-[1px] bg-slate-200" />
                        </h2>
                        {pendingChecklists.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-4">
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
                                                <p className="text-xs text-slate-400 font-medium">Criado em {new Date(c.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Nenhum formulário pendente agora.</p>
                            </div>
                        )}
                    </section>

                    {/* Concluídos */}
                    {finishedChecklists.length > 0 && (
                        <section className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity">
                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                Histórico de Envios
                                <div className="flex-1 h-[1px] bg-slate-200" />
                            </h2>
                            <div className="grid md:grid-cols-3 gap-4">
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
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${status.class}`}>
                                                {status.label}
                                            </span>
                                            <h3 className="text-sm font-black text-slate-900 truncate">{c.template.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold">Enviado em {new Date(c.submittedAt || c.updatedAt).toLocaleDateString()}</p>
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
