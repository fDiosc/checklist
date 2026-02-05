import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import type { Locale } from '@/i18n/config';

// Gerar rotas estáticas para cada locale
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validar que o locale é suportado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Habilitar renderização estática
    setRequestLocale(locale as Locale);

    // Carregar mensagens para o locale
    const messages = await getMessages();

    return (
        <SessionProvider>
            <NextIntlClientProvider messages={messages}>
                <QueryProvider>{children}</QueryProvider>
            </NextIntlClientProvider>
        </SessionProvider>
    );
}
