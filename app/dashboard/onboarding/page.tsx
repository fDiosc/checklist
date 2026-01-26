'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, User, CreditCard, ChevronRight, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: async (data: { name: string; cpf: string }) => {
            const res = await fetch('/api/users/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao salvar dados');
            }
            return res.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['me'] });
            await queryClient.refetchQueries({ queryKey: ['me'] });
            router.replace('/dashboard');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            setError(err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (name.length < 3) {
            setError('Por favor, insira seu nome completo.');
            return;
        }

        const cleanCpf = cpf.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
            setError('O CPF deve conter exatamente 11 dígitos.');
            return;
        }

        mutation.mutate({ name, cpf: cleanCpf });
    };

    const formatCPF = (val: string) => {
        const value = val.replace(/\D/g, '');
        if (value.length <= 11) {
            return value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        }
        return value.substring(0, 11);
    };

    return (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6 z-[1000]">
            <div className="w-full max-w-lg animate-fade-in">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
                    <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-primary/20">
                                <ShieldCheck size={32} className="text-white" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter mb-4">Bem-vindo à MerX</h1>
                            <p className="text-slate-400 font-medium text-sm leading-relaxed">
                                Para garantir a segurança e conformidade da plataforma, precisamos de alguns dados adicionais para completar seu perfil.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-12 space-y-8">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-bold animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-primary transition-colors">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Seu nome completo"
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-primary transition-colors">
                                    CPF
                                </label>
                                <div className="relative">
                                    <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={formatCPF(cpf)}
                                        onChange={(e) => setCpf(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-slate-900/10"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Finalizar Cadastro
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>

                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Seus dados estão protegidos por criptografia de ponta a ponta.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
