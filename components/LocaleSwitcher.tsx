'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { useTransition } from 'react';

interface LocaleSwitcherProps {
    className?: string;
}

export function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    function handleChange(newLocale: string) {
        startTransition(() => {
            // O router do next-intl lida automaticamente com os prefixos de locale
            router.replace(pathname, { locale: newLocale as Locale });
        });
    }

    return (
        <select
            value={locale}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            className={`bg-transparent border border-gray-200 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${className}`}
            aria-label="Select language"
        >
            {locales.map((loc) => (
                <option key={loc} value={loc}>
                    {localeFlags[loc]} {localeNames[loc]}
                </option>
            ))}
        </select>
    );
}
