'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PortalLogin() {
    const [cpf, setCpf] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cpf) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/portal/checklists?cpf=${cpf}`);
            if (res.ok) {
                localStorage.setItem('merx_portal_cpf', cpf);
                router.push('/portal/checklists');
            } else {
                const data = await res.json();
                setError(data.error || 'CPF não encontrado ou sem checklists vinculados.');
            }
        } catch {
            setError('Erro ao conectar ao servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-fade-in">
                <div className="flex flex-col items-center mb-12">
                    <Image
                        src="/MX_logo_formC_Green.png"
                        alt="Maxsum"
                        width={120}
                        height={120}
                        className="mb-6 rounded-2xl shadow-2xl shadow-emerald-500/20 brightness-0 invert"
                    />
                    <h1 className="text-white text-2xl font-black uppercase tracking-[0.3em]">Maxsum</h1>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mt-2">Portal do Produtor</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
                    <h2 className="text-white text-lg font-bold mb-8 text-center">Acesse seus checklists</h2>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Informe seu CPF</label>
                            <input
                                type="text"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full bg-white/10 border-2 border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <p className="text-red-400 text-xs font-bold text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full py-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]
                                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-400'}
                            `}
                        >
                            {loading ? 'Verificando...' : 'Entrar no Portal'}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-slate-500 text-[10px] font-bold text-center uppercase tracking-widest leading-relaxed">
                    Identifique-se com seu CPF para visualizar<br />os checklists atribuídos à sua propriedade.
                </p>

                <p className="mt-6 text-slate-600 text-[10px] font-medium text-center">Powered by Merx</p>
            </div>
        </div>
    );
}
