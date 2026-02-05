'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

// Map NextAuth error codes to user-friendly messages
const errorMessages: Record<string, string> = {
    'CredentialsSignin': 'Email ou senha incorretos',
    'undefined': 'Email ou senha incorretos',
    'CallbackRouteError': 'Email ou senha incorretos',
    'Configuration': 'Erro de configuração do servidor',
    'AccessDenied': 'Acesso negado',
    'Verification': 'Erro de verificação',
    'Default': 'Erro ao fazer login. Tente novamente.',
};

function getErrorMessage(error: string | null): string {
    if (!error || error === 'undefined') return errorMessages['CredentialsSignin'];
    return errorMessages[error] || errorMessages['Default'];
}

export default function SignInPage() {
    const t = useTranslations('auth');
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || `/${locale}/dashboard`;
    const urlError = searchParams.get('error');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Handle URL error on mount
    useEffect(() => {
        if (urlError) {
            setError(getErrorMessage(urlError));
        }
    }, [urlError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(getErrorMessage(result.error));
                setIsLoading(false);
                return;
            }

            if (result?.ok) {
                // Login successful - redirect to dashboard
                // Use window.location for a full page navigation to ensure cookies are sent
                const targetUrl = callbackUrl.startsWith('/') 
                    ? callbackUrl 
                    : `/${locale}/dashboard`;
                window.location.href = targetUrl;
                // Don't reset isLoading - let the page navigate
            } else {
                setError('Erro inesperado ao fazer login');
                setIsLoading(false);
            }
        } catch {
            setError('Erro ao fazer login. Tente novamente.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {t('signIn.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">
                        {t('signIn.subtitle')}
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600">
                                <AlertCircle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                {t('signIn.email')}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('signIn.emailPlaceholder')}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                {t('signIn.password')}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('signIn.passwordPlaceholder')}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('signIn.loading')}
                                </>
                            ) : (
                                t('signIn.submit')
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-400 text-xs mt-8">
                    {t('signIn.footer')}
                </p>
            </div>
        </div>
    );
}
