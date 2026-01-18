'use client';

import TemplateForm from '@/components/forms/TemplateForm';
import AITemplateSelector from '@/components/ai/AITemplateSelector';
import { useState } from 'react';

export default function NewTemplatePage() {
    const [mode, setMode] = useState<'SELECT' | 'FORM'>('SELECT');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [initialData, setInitialData] = useState<any>(undefined);

    const handleSelectManual = () => {
        setMode('FORM');
        setInitialData(undefined);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAIComplete = (sections: any[], templateName: string) => {
        // Transform AI Response to TemplateForm format if necessary
        // The prompt already asks for the correct format, but we ensure IDs are unique and status is set

        const formattedSections = sections.map((sec, sIdx) => ({
            ...sec,
            id: `sec-${Date.now()}-${sIdx}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: sec.items.map((item: any, iIdx: number) => ({
                ...item,
                id: `item-${Date.now()}-${sIdx}-${iIdx}`,
                status: 'MISSING',
                required: item.required ?? true
            }))
        }));

        const aiTemplateData = {
            name: templateName,
            folder: 'Importados IA',
            requiresProducerIdentification: true, // Default safe assumption for audits
            sections: formattedSections
        };

        setInitialData(aiTemplateData);
        setMode('FORM');
    };

    if (mode === 'SELECT') {
        return <AITemplateSelector onSelectManual={handleSelectManual} onAIComplete={handleAIComplete} />;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-screen">
            <TemplateForm mode="CREATE" initialData={initialData} />
        </div>
    );
}
