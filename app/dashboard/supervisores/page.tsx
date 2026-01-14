'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, Search, MapPin } from 'lucide-react';

export default function SupervisoresPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
    const [producerSearch, setProducerSearch] = useState('');

    // Fetch Supervisors
    const { data: supervisors, isLoading: loadingSupervisors } = useQuery({
        queryKey: ['supervisors'],
        queryFn: async () => {
            const res = await fetch('/api/users/supervisors');
            if (!res.ok) throw new Error('Failed to fetch supervisors');
            return res.json();
        }
    });

    // Fetch Producers for assignment
    const { data: producers } = useQuery({
        queryKey: ['producers', producerSearch],
        queryFn: async () => {
            const res = await fetch(`/api/producers?search=${producerSearch}`);
            if (!res.ok) throw new Error('Failed to fetch producers');
            return res.json();
        }
    });

    // Assignment Mutation
    const assignmentMutation = useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async ({ supervisorId, producerId, action }: any) => {
            const res = await fetch('/api/users/supervisors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisorId, producerId, action })
            });
            if (!res.ok) throw new Error('Action failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supervisors'] });
        }
    });



    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredSupervisors = supervisors?.filter((a: any) =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loadingSupervisors) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Carregando Supervisores...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        Supervisores
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Gerencie os supervisores e suas atribuições de produtores
                    </p>
                </div>
            </div>

            <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative max-w-xl group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold shadow-xl shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {filteredSupervisors?.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    filteredSupervisors.map((supervisor: any) => (
                        <div key={supervisor.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-10 space-y-8">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                        <Users size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{supervisor.name || 'Sem Nome'}</h3>
                                        <p className="text-xs font-medium text-slate-400">{supervisor.email}</p>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                    {supervisor.role}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produtores Atribuídos ({supervisor.assignedProducers?.length || 0})</h4>
                                    <button
                                        onClick={() => {
                                            setSelectedSupervisor(supervisor);
                                            setIsAssignModalOpen(true);
                                        }}
                                        className="text-primary hover:text-primary/70 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Atribuir Novo
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {supervisor.assignedProducers?.length > 0 ? (
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        supervisor.assignedProducers.map((prod: any) => (
                                            <div key={prod.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group/item">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-slate-400 group-hover/item:text-primary transition-colors">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{prod.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase">{prod.cpf}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => assignmentMutation.mutate({ supervisorId: supervisor.id, producerId: prod.id, action: 'unassign' })}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Remover Atribuição"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum produtor vinculado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="lg:col-span-2 text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-50">
                        <Users className="mx-auto w-12 h-12 text-slate-200 mb-4" />
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Nenhum supervisor encontrado</h3>
                        <p className="text-slate-400 text-sm font-medium">Verifique o banco de dados para garantir que existam usuários com a ROLE de SUPERVISOR.</p>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Atribuir Produtor</h2>
                                <p className="text-xs text-slate-400 font-medium">Selecione um produtor para vincular a {selectedSupervisor?.name}</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar produtor..."
                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                value={producerSearch}
                                onChange={(e) => setProducerSearch(e.target.value)}
                            />
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {producers?.length > 0 ? (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                producers.filter((p: any) => !selectedSupervisor?.assignedProducers?.some((ap: any) => ap.id === p.id)).map((prod: any) => (
                                    <button
                                        key={prod.id}
                                        onClick={() => {
                                            assignmentMutation.mutate({ supervisorId: selectedSupervisor.id, producerId: prod.id, action: 'assign' });
                                            setIsAssignModalOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-primary/5 hover:ring-2 hover:ring-primary/10 rounded-2xl group transition-all text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{prod.name}</p>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{prod.cpf}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                            <Plus size={16} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center py-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum produtor disponível</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
