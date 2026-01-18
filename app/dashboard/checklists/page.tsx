'use client';

import { useState } from 'react';
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
    ExternalLink,
    Search,
    Folder,
    Calendar,
    Filter
} from 'lucide-react';

const CHECKLIST_STATUSES = [
    { value: '', label: 'Todos os status' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'SENT', label: 'Enviado' },
    { value: 'IN_PROGRESS', label: 'Em Progresso' },
    { value: 'PENDING_REVIEW', label: 'Aguardando Revisão' },
    { value: 'APPROVED', label: 'Aprovado' },
    { value: 'REJECTED', label: 'Rejeitado' },
    { value: 'FINALIZED', label: 'Finalizado' },
];

export default function ChecklistsPage() {
    // Filtros
    const [statusFilter, setStatusFilter] = useState('');
    const [templateFilter, setTemplateFilter] = useState('');
    const [producerSearch, setProducerSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Query de templates para o dropdown
    const { data: templates } = useQuery({
        queryKey: ['templates-list'],
        queryFn: async () => {
            const res = await fetch('/api/templates');
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
    });

    const { data: checklists, isLoading } = useQuery({
        queryKey: ['checklists', statusFilter, templateFilter, producerSearch, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (templateFilter) params.append('templateId', templateFilter);
            if (producerSearch) params.append('producer', producerSearch);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            const res = await fetch(`/api/checklists?${params.toString()}`);
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

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {/* Status Filter */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Filter size={18} />
                    </div>
                    <select
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {CHECKLIST_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Template Filter */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Folder size={18} />
                    </div>
                    <select
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer"
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                    >
                        <option value="">Todos os templates</option>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {templates?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Producer Search */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar produtor..."
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        value={producerSearch}
                        onChange={(e) => setProducerSearch(e.target.value)}
                    />
                </div>

                {/* Date From */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="Data inicial"
                    />
                </div>

                {/* Date To */}
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        className="w-full pl-16 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="Data final"
                    />
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
