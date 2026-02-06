'use client';

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Info, LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChangelogModal from '@/components/modals/ChangelogModal';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const t = useTranslations('navigation');

    // Persist collapsed state in localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved === 'true') setIsCollapsed(true);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar_collapsed', String(newState));
    };

    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await fetch('/api/me');
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        }
    });

    useEffect(() => {
        if (userData?.needsOnboarding && pathname !== '/dashboard/onboarding') {
            router.push('/dashboard/onboarding');
        } else if (userData && !userData.needsOnboarding && pathname === '/dashboard/onboarding') {
            router.push('/dashboard');
        }
    }, [userData, pathname, router]);

    const isAdmin = userData?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN';
    const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
    const hasSubworkspaces = userData?.workspace?.hasSubworkspaces === true;
    const isParentWorkspaceAdmin = isAdmin && !isSuperAdmin && hasSubworkspaces;
    
    // Workspace branding
    const workspace = userData?.workspace;
    const workspaceName = workspace?.name || 'MerX Platform';
    const workspaceLogo = workspace?.logoUrl;

    const navItems = [
        {
            name: t('dashboard'),
            href: "/dashboard",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
        },
        {
            name: t('producers'),
            href: "/dashboard/produtores",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
        },
        {
            name: t('templates'),
            href: "/dashboard/templates",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 008.01 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" /></svg>
        },
        {
            name: t('checklists'),
            href: "/dashboard/checklists",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M9 14l2 2 4-4M8 10h8M8 18h8" /></svg>
        },
        ...(isAdmin ? [{
            name: t('supervisors'),
            href: "/dashboard/supervisores",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
        }] : []),
        ...(isAdmin ? [
            {
                name: t('users') || 'Usuários',
                href: "/dashboard/users",
                icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5z" /><path d="M19 21H5a2 2 0 01-2-2v-1a7 7 0 0114 0v1a2 2 0 01-2 2z" /></svg>
            }
        ] : []),
        ...(isParentWorkspaceAdmin ? [
            {
                name: t('subworkspaces') || 'Subworkspaces',
                href: "/dashboard/subworkspaces",
                icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 10h-4V6" /><path d="M14 10l6.1-6.1" /><path d="M22 2L14 10" /><path d="M22 12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h7" /></svg>
            }
        ] : []),
        ...(isSuperAdmin ? [
            {
                name: t('workspaces') || 'Workspaces',
                href: "/dashboard/workspaces",
                icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14h18V7M5 3h14l2 4H3l2-4z" /></svg>
            }
        ] : []),
    ];

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' });
    };

    // User Menu Component
    const UserMenu = ({ collapsed = false }: { collapsed?: boolean }) => (
        <div className="relative">
            <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`bg-white/5 p-4 rounded-[1.5rem] flex items-center ${collapsed ? 'justify-center' : 'gap-4'} w-full hover:bg-white/10 transition-all`}
            >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                </div>
                {!collapsed && (
                    <div className="flex-1 overflow-hidden text-left">
                        <p className="text-xs font-bold text-white truncate">{session?.user?.name || 'Usuário'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{session?.user?.email}</p>
                    </div>
                )}
            </button>
            
            {isUserMenuOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsUserMenuOpen(false)} 
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                        <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-3"
                        >
                            <LogOut size={16} />
                            <span>Sair</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50/50 font-sans selection:bg-primary/10 selection:text-primary overflow-hidden">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-300 hidden lg:flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
                {/* Collapse Toggle Button */}
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3 top-20 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-full shadow-lg z-50 transition-all"
                    title={isCollapsed ? 'Expandir' : 'Recolher'}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className={`p-8 flex items-center gap-4 ${isCollapsed ? 'justify-center px-4' : ''}`}>
                    {workspaceLogo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={workspaceLogo}
                            alt={workspaceName}
                            className={`rounded-xl object-contain ${isCollapsed ? 'w-9 h-9' : 'w-12 h-12'}`}
                        />
                    ) : (
                        <div className={`bg-primary/20 rounded-xl flex items-center justify-center ${isCollapsed ? 'w-9 h-9' : 'w-12 h-12'}`}>
                            <span className="text-primary font-black text-lg">
                                {workspaceName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-white font-black text-xs uppercase tracking-[0.2em]">{workspaceName}</h1>
                            <p className="text-primary/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Gestão ESG</p>
                        </div>
                    )}
                </div>

                <nav className={`flex-1 space-y-2 mt-4 ${isCollapsed ? 'px-2' : 'px-6'}`}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                                    flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 rounded-2xl transition-all group
                                    ${isActive ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]' : 'hover:bg-white/5 hover:text-white text-slate-400'}
                                `}
                            >
                                <div className={`flex items-center ${isCollapsed ? '' : 'gap-4'}`}>
                                    <div className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary transition-colors'}>
                                        <item.icon />
                                    </div>
                                    {!isCollapsed && <span className="text-xs font-bold uppercase tracking-widest">{item.name}</span>}
                                </div>
                                {!isCollapsed && isActive && <div className="w-1 h-1 rounded-full bg-white"></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`p-6 mt-auto border-t border-white/5 ${isCollapsed ? 'px-2' : ''}`}>
                    {/* Language Switcher */}
                    {!isCollapsed && (
                        <div className="mb-4">
                            <LocaleSwitcher className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" />
                        </div>
                    )}
                    <UserMenu collapsed={isCollapsed} />
                    {!isCollapsed && (
                        <div className="flex flex-col items-center mt-4">
                            <button
                                onClick={() => setIsChangelogOpen(true)}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all mb-4"
                            >
                                <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-widest transition-colors">v 0.5.1</span>
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse group-hover:animate-none">
                                    <Info size={10} className="text-white" />
                                </div>
                            </button>
                            <p className="text-[10px] text-slate-600 font-medium">Powered by Merx</p>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => setIsChangelogOpen(true)}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                                title="Versão V 0.5.1"
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
                {/* Topbar Mobile (Simplified) */}
                <div className="lg:hidden bg-slate-900 p-6 flex flex-none items-center justify-between">
                    {workspaceLogo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={workspaceLogo} alt={workspaceName} className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-black text-sm">{workspaceName.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                    >
                        <LogOut size={18} className="text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 animate-fade-in custom-scrollbar">
                    {children}
                </div>

                <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
            </main>
        </div>
    );
}
