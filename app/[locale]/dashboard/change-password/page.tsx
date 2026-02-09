'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Loader2, Lock, AlertCircle, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordPage() {
    const t = useTranslations('auth.changePassword');
    const router = useRouter();
    const { update } = useSession();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validate passwords
        if (newPassword.length < 8) {
            setError(t('errorWeak'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('errorMismatch'));
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erro ao alterar senha');
                setIsLoading(false);
                return;
            }

            // Update session to reflect password change
            await update({ mustChangePassword: false });
            
            setSuccess(true);
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
            }, 2000);
        } catch {
            setError('Erro ao alterar senha. Tente novamente.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
                        <Shield className="text-amber-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
                                <CheckCircle className="text-emerald-600" size={32} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">
                                {t('success')}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                Redirecionando...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600">
                                    <AlertCircle size={20} />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            {/* Current Password */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                    {t('currentPassword')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                    {t('newPassword')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        required
                                        disabled={isLoading}
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                    {t('confirmPassword')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                                        required
                                        disabled={isLoading}
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                                        {t('loading')}
                                    </>
                                ) : (
                                    t('submit')
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
