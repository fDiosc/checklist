'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import TemplateForm from '@/components/forms/TemplateForm';
import { useTranslations } from 'next-intl';

export default function EditTemplatePage() {
    const { id } = useParams();
    const t = useTranslations();

    const { data: template, isLoading, error } = useQuery({
        queryKey: ['template', id],
        queryFn: async () => {
            const res = await fetch(`/api/templates/${id}`);
            if (!res.ok) throw new Error('Failed to fetch template');
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('common.loading')}</p>
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-red-500 font-bold">{t('errors.genericError')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                    {t('common.retry')}
                </button>
            </div>
        );
    }

    // A template is readOnly for structural changes if it has been used in any checklist
    const isUsed = template._count?.checklists > 0;

    return (
        <div className="p-8 max-w-7xl mx-auto h-screen">
            <TemplateForm
                initialData={template}
                mode="EDIT"
                readOnly={isUsed}
            />
        </div>
    );
}
