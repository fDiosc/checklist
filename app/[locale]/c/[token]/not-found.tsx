'use client';

import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                    {t('publicChecklist.notFound.title')}
                </h2>
                <p className="text-gray-600">
                    {t('publicChecklist.notFound.description')}
                </p>
            </div>
        </div>
    );
}
