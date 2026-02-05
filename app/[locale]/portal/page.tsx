'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Building2, ChevronRight } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    logoUrl: string | null;
    isSubworkspace: boolean;
}

export default function PortalLogin() {
    const [cpf, setCpf] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
    const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
    const [producerName, setProducerName] = useState('');
    const router = useRouter();
    const t = useTranslations('portal');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cpf) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/portal/checklists?cpf=${cpf}`);
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('merx_portal_cpf', cpf);
                setProducerName(data.producer.name);
                
                // Check if producer has multiple workspaces
                if (data.hasMultipleWorkspaces && data.availableWorkspaces.length > 1) {
                    setAvailableWorkspaces(data.availableWorkspaces);
                    setShowWorkspaceSelector(true);
                } else {
                    // Single workspace - go directly to dashboard
                    if (data.availableWorkspaces.length === 1) {
                        localStorage.setItem('merx_portal_workspace', data.availableWorkspaces[0].id);
                    }
                    router.push('/portal/checklists');
                }
            } else {
                const data = await res.json();
                setError(data.error || t('login.cpfNotFound'));
            }
        } catch {
            setError(t('login.connectionError'));
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceSelect = (workspaceId: string) => {
        localStorage.setItem('merx_portal_workspace', workspaceId);
        router.push('/portal/checklists');
    };

    // Workspace selector screen
    if (showWorkspaceSelector) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-lg animate-fade-in">
                    <div className="flex flex-col items-center mb-12">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Building2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-white text-xl font-black text-center">{t('selectWorkspace.title')}</h1>
                        <p className="text-slate-400 text-sm mt-2 text-center">
                            {t('selectWorkspace.greeting', { name: producerName })}
                        </p>
                        <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mt-4">
                            {t('selectWorkspace.subtitle')}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {availableWorkspaces.map((workspace) => (
                            <button
                                key={workspace.id}
                                onClick={() => handleWorkspaceSelect(workspace.id)}
                                className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl hover:bg-white/10 hover:border-emerald-500/30 transition-all group flex items-center gap-4"
                            >
                                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {workspace.logoUrl ? (
                                        <Image
                                            src={workspace.logoUrl}
                                            alt={workspace.name}
                                            width={56}
                                            height={56}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <Building2 className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">
                                        {workspace.name}
                                    </h3>
                                    {workspace.isSubworkspace && (
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                            Subworkspace
                                        </span>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            setShowWorkspaceSelector(false);
                            setAvailableWorkspaces([]);
                            setCpf('');
                        }}
                        className="w-full mt-8 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                    >
                        {t('selectWorkspace.back')}
                    </button>
                </div>
            </div>
        );
    }

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
                    <h1 className="text-white text-2xl font-black uppercase tracking-[0.3em]">{t('brand')}</h1>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mt-2">{t('title')}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
                    <h2 className="text-white text-lg font-bold mb-8 text-center">{t('login.title')}</h2>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">{t('login.cpfLabel')}</label>
                            <input
                                type="text"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder={t('login.cpfPlaceholder')}
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
                            {loading ? t('login.verifying') : t('login.enterButton')}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-slate-500 text-[10px] font-bold text-center uppercase tracking-widest leading-relaxed">
                    {t('login.description')}
                </p>

                <p className="mt-6 text-slate-600 text-[10px] font-medium text-center">Powered by Merx</p>
            </div>
        </div>
    );
}
