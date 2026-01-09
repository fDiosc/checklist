'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import ProducerHistory from '@/components/dashboard/ProducerHistory';

import { useRouter } from 'next/navigation';
import SendChecklistModal from '@/components/modals/SendChecklistModal';

export default function ProdutoresPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedProducerId, setSelectedProducerId] = useState<string | undefined>();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { data: producers, isLoading } = useQuery({
        queryKey: ['producers', searchTerm],
        queryFn: async () => {
            const params = searchTerm ? `?search=${searchTerm}` : '';
            const res = await fetch(`/api/producers${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        Produtores
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Gerencie os produtores e parceiros cadastrados
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/produtores/new')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Novo Produtor
                </button>
            </div>

            <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative max-w-xl group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou email..."
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold shadow-xl shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Carregando Base...</p>
                </div>
            ) : producers && producers.length > 0 ? (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Nome do Produtor
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Identificação
                                    </th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        E-mail de Contato
                                    </th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Checklists
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Cadastro
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Ação
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {producers.map((producer: any) => (
                                    <React.Fragment key={producer.id}>
                                        <tr
                                            onClick={() => setExpandedId(expandedId === producer.id ? null : producer.id)}
                                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${expandedId === producer.id ? 'bg-slate-50' : ''}`}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl transition-all ${expandedId === producer.id ? 'bg-primary text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                        <ChevronDown size={14} />
                                                    </div>
                                                    <span className="font-black text-slate-900 tracking-tight text-sm">
                                                        {producer.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest">{producer.cpf}</td>
                                            <td className="px-8 py-6 text-xs font-medium text-slate-400">
                                                {producer.email || '-'}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black transition-all ${producer._count?.checklists > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                    {producer._count?.checklists || 0} Ativos
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(producer.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/dashboard/produtores/${producer.id}`);
                                                        }}
                                                        className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Editar Produtor"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedProducerId(producer.id);
                                                            setIsSendModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-200 transition-all group/btn"
                                                    >
                                                        <svg className="w-[12px] h-[12px] group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Enviar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === producer.id && (
                                            <tr>
                                                <td colSpan={6} className="p-0 border-none bg-slate-50/50">
                                                    <ProducerHistory producerId={producer.id} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 animate-fade-in shadow-inner">
                    <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                        Nenhum Produtor
                    </h3>
                    <p className="text-slate-500 font-medium mb-10 max-w-xs mx-auto">
                        Comece cadastrando seu primeiro produtor para gerenciar checklists.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/produtores/new')}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                        Adicionar Produtor
                    </button>
                </div>
            )}

            <SendChecklistModal
                isOpen={isSendModalOpen}
                onClose={() => {
                    setIsSendModalOpen(false);
                    setSelectedProducerId(undefined);
                }}
                initialProducerId={selectedProducerId}
            />
        </div>
    );
}
