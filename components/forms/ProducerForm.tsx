'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, X, Shield } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

interface SubUser {
    id: string;
    name: string;
    cpf: string;
    email: string;
    phone?: string;
    role?: string;
}

interface Supervisor {
    id: string;
    name: string;
    email: string;
}

interface ProducerData {
    id?: string;
    name: string;
    cpf: string;
    email: string;
    phone: string;
    city?: string;
    state?: string;
    subUsers: SubUser[];
    assignedSupervisors?: Supervisor[];
}

interface ProducerFormProps {
    initialData?: ProducerData;
    mode: 'CREATE' | 'EDIT';
}

export default function ProducerForm({ initialData, mode }: ProducerFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [producer, setProducer] = useState<ProducerData>(
        initialData || {
            name: '',
            cpf: '',
            email: '',
            phone: '',
            city: '',
            state: '',
            subUsers: [],
            assignedSupervisors: []
        }
    );

    // Fetch user role
    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await fetch('/api/me');
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        }
    });

    const isAdmin = userData?.role === 'ADMIN';

    // Fetch all supervisors if Admin
    const { data: allSupervisors } = useQuery({
        queryKey: ['supervisors'],
        queryFn: async () => {
            const res = await fetch('/api/users/supervisors');
            if (!res.ok) throw new Error('Failed to fetch supervisors');
            return res.json();
        },
        enabled: isAdmin
    });

    const mutation = useMutation({
        mutationFn: async (data: ProducerData) => {
            const url = mode === 'EDIT' ? `/api/producers/${data.id}` : '/api/producers';
            const method = mode === 'EDIT' ? 'PATCH' : 'POST';

            const payload = {
                ...data,
                assignedSupervisorIds: data.assignedSupervisors?.map(a => a.id)
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to ${mode === 'EDIT' ? 'update' : 'create'} producer`);
            }
            return res.json();
        },
        onSuccess: async (data) => {
            // Trigger ESG Analysis in background
            try {
                await fetch('/api/integration/esg/producer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ producerId: data.id, cpf: data.cpf })
                });
            } catch (e) {
                console.error("Failed to trigger ESG analysis", e);
            }

            queryClient.invalidateQueries({ queryKey: ['producers'] });
            if (producer.id) {
                queryClient.invalidateQueries({ queryKey: ['producers', producer.id] });
            }
            router.push('/dashboard/produtores');
        },
        onError: (error: any) => {
            alert(error.message);
        }
    });

    const addSubUser = () => {
        setProducer(prev => ({
            ...prev,
            subUsers: [
                ...prev.subUsers,
                { id: `temp-${crypto.randomUUID()}`, name: '', cpf: '', email: '', phone: '', role: 'Operador' }
            ]
        }));
    };

    const removeSubUser = (id: string) => {
        setProducer(prev => ({
            ...prev,
            subUsers: prev.subUsers.filter(u => u.id !== id)
        }));
    };

    const updateSubUser = (id: string, updates: Partial<SubUser>) => {
        setProducer(prev => ({
            ...prev,
            subUsers: prev.subUsers.map(u => u.id === id ? { ...u, ...updates } : u)
        }));
    };

    const handleSave = () => {
        if (!producer.name || !producer.cpf) {
            alert('Nome e CPF são obrigatórios');
            return;
        }
        // Basic CPF validation (length)
        if (producer.cpf.replace(/\D/g, '').length !== 11) {
            alert('CPF deve ter 11 dígitos');
            return;
        }
        mutation.mutate(producer);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Actions */}
            <div className="flex-none flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                            {mode === 'CREATE' ? 'Novo Produtor' : 'Editar Produtor'}
                        </h1>
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">
                            {mode === 'CREATE' ? 'Cadastro de Contraparte' : `ID: ${producer.id?.slice(-8) || '...'}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="bg-white text-slate-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all"
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                        {mutation.isPending ? 'Salvando...' : (
                            <>
                                <Save size={18} />
                                {mode === 'CREATE' ? 'Salvar Cadastro' : 'Atualizar Dados'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
                {/* Main Info */}
                <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10 flex items-center gap-3">
                            <Plus className="text-primary w-4 h-4" />
                            Dados Principais
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Nome Completo</label>
                                <input
                                    type="text"
                                    placeholder="Digite o nome completo do produtor"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={producer.name || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">CPF (somente números)</label>
                                <input
                                    type="text"
                                    maxLength={11}
                                    placeholder="00000000000"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={producer.cpf || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">E-mail</label>
                                <input
                                    type="email"
                                    placeholder="contato@exemplo.com"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={producer.email || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={producer.phone || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                    Cidade
                                    <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] leading-none">NOVO</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Sorriso"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={producer.city || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, city: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                    Estado (UF)
                                    <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] leading-none">NOVO</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: MT"
                                    maxLength={2}
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all uppercase"
                                    value={producer.state || ''}
                                    onChange={e => setProducer(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sub-users Section */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10 overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                <Plus className="w-4 h-4 text-primary" />
                                Contatos / Sub-usuários Vinculados
                            </h3>
                            <button
                                onClick={addSubUser}
                                type="button"
                                className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                            >
                                <Plus size={14} /> Adicionar Vínculo
                            </button>
                        </div>

                        <div className="space-y-4">
                            {producer.subUsers.length > 0 ? producer.subUsers.map((user, idx) => (
                                <div
                                    key={user.id}
                                    className="bg-slate-50/50 rounded-3xl p-6 border border-slate-50 grid grid-cols-1 md:grid-cols-12 gap-6 items-end group hover:border-primary/20 transition-all animate-slide-up"
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className="md:col-span-4">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none"
                                            value={user.name}
                                            onChange={e => updateSubUser(user.id, { name: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">CPF</label>
                                        <input
                                            type="text"
                                            maxLength={11}
                                            className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none"
                                            value={user.cpf}
                                            onChange={e => updateSubUser(user.id, { cpf: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">E-mail</label>
                                        <input
                                            type="email"
                                            className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none"
                                            value={user.email}
                                            onChange={e => updateSubUser(user.id, { email: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex justify-center">
                                        <button
                                            onClick={() => removeSubUser(user.id)}
                                            type="button"
                                            className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-50 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum sub-usuário adicionado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Context */}
                <div className="lg:col-span-4 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20">
                        <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-8 text-primary">
                            <Save size={24} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight mb-4">Gestão de Parceiros</h3>
                        <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">
                            Mantenha os dados dos produtores atualizados para garantir a integridade socioambiental da operação.
                        </p>
                        <ul className="space-y-4">
                            {[
                                'Contatos atualizados facilitam o envio',
                                'Sub-usuários podem responder em nome do titular',
                                'Histórico vinculado ao CPF principal',
                                'Sincronização automática com checklists'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Analyst Assignment (ADMIN ONLY) */}
                    {isAdmin && (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10 overflow-hidden">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10 flex items-center gap-3">
                                <Shield className="w-4 h-4 text-primary" />
                                Supervisores Responsáveis [RESTRITO ADMIN]
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Atribuir Supervisor</label>
                                    <select
                                        className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        onChange={(e) => {
                                            const supervisorId = e.target.value;
                                            if (!supervisorId) return;
                                            const supervisor = allSupervisors?.find((a: any) => a.id === supervisorId);
                                            if (supervisor && !producer.assignedSupervisors?.some(a => a.id === supervisorId)) {
                                                setProducer(prev => ({
                                                    ...prev,
                                                    assignedSupervisors: [...(prev.assignedSupervisors || []), { id: supervisor.id, name: supervisor.name, email: supervisor.email }]
                                                }));
                                            }
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">Selecione um supervisor para atribuir...</option>
                                        {allSupervisors?.filter((a: any) => !producer.assignedSupervisors?.some(ap => ap.id === a.id)).map((a: any) => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {producer.assignedSupervisors && producer.assignedSupervisors.length > 0 ? (
                                    producer.assignedSupervisors.map((supervisor) => (
                                        <div key={supervisor.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                                                    {supervisor.name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{supervisor.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{supervisor.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setProducer(prev => ({
                                                    ...prev,
                                                    assignedSupervisors: prev.assignedSupervisors?.filter(a => a.id !== supervisor.id)
                                                }))}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="md:col-span-2 py-8 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum supervisor vinculado a este produtor</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
