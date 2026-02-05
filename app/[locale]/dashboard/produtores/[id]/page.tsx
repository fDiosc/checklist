'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProducerForm from '@/components/forms/ProducerForm';
import { useTranslations } from 'next-intl';

export default function EditProducerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const t = useTranslations();

    const { data: producer, isLoading } = useQuery({
        queryKey: ['producers', id],
        queryFn: async () => {
            const res = await fetch(`/api/producers/${id}`);
            if (!res.ok) throw new Error('Failed to fetch producer');
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('common.loading')}</p>
            </div>
        );
    }

    if (!producer) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-black text-slate-900">{t('producer.notFound')}</h2>
            </div>
        );
    }

    return <ProducerForm initialData={producer} mode="EDIT" />;
}
