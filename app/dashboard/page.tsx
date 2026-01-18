'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, FolderOpen, ClipboardList, ShieldCheck, Zap } from "lucide-react";

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        }
    });

    const statCards = [
        {
            name: 'Produtores Ativos',
            value: stats?.producers ?? '...',
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50'
        },
        {
            name: 'Templates Criados',
            value: stats?.templates ?? '...',
            icon: FolderOpen,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50'
        },
        {
            name: 'Checklists Enviados',
            value: stats?.checklists ?? '...',
            icon: ClipboardList,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            name: 'Checklists Finalizados',
            value: stats?.finalizedChecklists ?? '...',
            icon: ShieldCheck,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
    ];

    return (
        <div className="animate-fade-in">
            <div className="mb-12 animate-slide-up">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                    Olá, bem-vindo de volta
                </h1>
                <p className="text-slate-500 font-medium mt-2 max-w-lg">
                    Aqui está um resumo da sua operação de compliance e monitoramento ESG.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
                {statCards.map((stat, idx) => (
                    <div
                        key={stat.name}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 hover:shadow-2xl transition-all group animate-slide-up"
                        style={{ animationDelay: `${0.1 + idx * 0.1}s` }}
                    >
                        <div className={`${stat.bg} ${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.name}</h3>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">
                            {isLoading ? '...' : String(stat.value).padStart(2, '0')}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white overflow-hidden relative group">
                    <div className="relative z-10">
                        <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                            <Zap size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight mb-4">Novo Template com IA</h2>
                        <p className="text-slate-400 text-sm font-medium mb-8 max-w-xs">
                            Crie checklists complexos em segundos carregando seu documento PDF ou DOCX.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/templates/new')}
                            className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                        >
                            Testar Gerador IA
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32"></div>
                </div>

                <div className="bg-primary rounded-[3rem] p-10 text-white overflow-hidden relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                            <ShieldCheck size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight mb-4">Relatório de Auditoria</h2>
                        <p className="text-emerald-100/70 text-sm font-medium mb-8 max-w-xs">
                            Gere relatórios automatizados baseados nas fotos e evidências coletadas.
                        </p>
                        <button disabled className="bg-slate-900/50 text-white/50 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest cursor-not-allowed border border-white/10">
                            EM BREVE
                        </button>
                    </div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mb-32 -mr-32"></div>
                </div>
            </div>
        </div>
    );
}
