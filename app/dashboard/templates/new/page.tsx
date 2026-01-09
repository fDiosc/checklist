'use client';

import TemplateForm from '@/components/forms/TemplateForm';

export default function NewTemplatePage() {
    return (
        <div className="p-8 max-w-7xl mx-auto h-screen">
            <TemplateForm mode="CREATE" />
        </div>
    );
}
