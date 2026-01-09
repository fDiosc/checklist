'use client';

import React, { useEffect } from 'react';
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: clerkUser } = useUser();

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
        }
    }, [userData, pathname, router]);

    const isAdmin = userData?.role === 'ADMIN';

    const navItems = [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
        },
        {
            name: "Produtores",
            href: "/dashboard/produtores",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
        },
        {
            name: "Templates",
            href: "/dashboard/templates",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 008.01 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" /></svg>
        },
        {
            name: "Checklists",
            href: "/dashboard/checklists",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M9 14l2 2 4-4M8 10h8M8 18h8" /></svg>
        },
        ...(isAdmin ? [{
            name: "Supervisores",
            href: "/dashboard/supervisores",
            icon: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
        }] : []),
    ];

    return (
        <div className="flex h-screen bg-gray-50/50 font-sans selection:bg-primary/10 selection:text-primary overflow-hidden">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col z-50">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center shadow-2xl shadow-primary/20">
                        <span className="text-white font-black text-xl">M</span>
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xs uppercase tracking-[0.2em]">MerX Platform</h1>
                        <p className="text-primary/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Gestão ESG</p>
                    </div>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center justify-between p-4 rounded-2xl transition-all group
                                    ${isActive ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]' : 'hover:bg-white/5 hover:text-white text-slate-400'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary transition-colors'}>
                                        <item.icon />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">{item.name}</span>
                                </div>
                                {isActive && <div className="w-1 h-1 rounded-full bg-white"></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 mt-auto border-t border-white/5">
                    <div className="bg-white/5 p-4 rounded-[1.5rem] flex items-center gap-4">
                        <UserButton afterSignOutUrl="/" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{clerkUser?.fullName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 flex flex-col h-screen overflow-hidden relative">
                {/* Topbar Mobile (Simplified) */}
                <div className="lg:hidden bg-slate-900 p-6 flex flex-none items-center justify-between">
                    <h1 className="text-white font-black text-sm uppercase tracking-widest leading-none">MerX</h1>
                    <UserButton afterSignOutUrl="/" />
                </div>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 animate-fade-in custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}
