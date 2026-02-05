import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['pt-BR', 'en', 'es'],
  defaultLocale: 'pt-BR',
  localePrefix: 'always' // Always include locale prefix: /pt-BR/dashboard, /en/dashboard
});

// Exportar helpers de navegação tipados
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
