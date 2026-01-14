'use client';

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
    ExternalLink
} from 'lucide-react';

export default function ChecklistsPage() {
    const { data: checklists, isLoading } = useQuery({
        queryKey: ['checklists'],
        queryFn: async () => {
            const res = await fetch('/api/checklists');
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
            default:
                return <Clock className="text-slate-400" size={18} />;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'REJECTED':
                return 'bg-red-50 text-red-600 border-red-100';
            case 'PENDING_REVIEW':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'IN_PROGRESS':
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            default:
                return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        Checklists
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Acompanhe o status e as respostas de todas as vistorias
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consultando Registros...</p>
                </div>
            ) : checklists && checklists.length > 0 ? (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Template / Projeto
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Produtor Responsável
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Estado Atual
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Respostas
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Data de Envio
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {checklists.map((checklist: any) => {
                                    const publicLink = `${window.location.origin}/c/${checklist.publicToken}`;

                                    const copyLink = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(publicLink);
                                        alert('Link copiado!');
                                    };

                                    const openLink = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        window.open(publicLink, '_blank');
                                    };

                                    const shareWhatsapp = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const text = encodeURIComponent(`Olá! Siga o link para preencher seu checklist: ${publicLink}`);
                                        window.open(`https://wa.me/?text=${text}`, '_blank');
                                    };

                                    const handleRowClick = () => {
                                        // Open Dashboard
                                        window.location.href = `/dashboard/checklists/${checklist.id}`;
                                    };

                                    return (
                                        <tr
                                            key={checklist.id}
                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                            onClick={handleRowClick}
                                        >
                                            <td className="px-8 py-6">
                                                <div>
                                                    <div className="font-black text-slate-900 tracking-tight text-sm">
                                                        {checklist.template?.name}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                                        {checklist.template?.folder}
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
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusVariant(checklist.status)}`}>
                                                        {getStatusIcon(checklist.status)}
                                                        {checklist.status}
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
                                                    ? new Date(checklist.sentAt).toLocaleDateString('pt-BR')
                                                    : '-'}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); window.location.href = `/dashboard/checklists/${checklist.id}`; }}
                                                        className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"
                                                        title="Gerenciar / Analisar"
                                                    >
                                                        <ClipboardList size={16} />
                                                    </button>
                                                    <button
                                                        onClick={copyLink}
                                                        className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                                        title="Copiar Link Público"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={shareWhatsapp}
                                                        className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={openLink}
                                                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                                                        title="Ver como Produtor (Link Público)"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
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
                        Nenhum Checklist
                    </h3>
                    <p className="text-slate-500 font-medium mb-10 max-w-xs mx-auto">
                        Envie checklists para seus produtores para começar a monitorar os dados.
                    </p>
                </div>
            )}
        </div>
    );
}
