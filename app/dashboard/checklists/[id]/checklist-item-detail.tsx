import { AlertCircle } from 'lucide-react';
import PropertyMapInput from '@/components/PropertyMapInput';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';

interface ChecklistItemDetailProps {
    item: any;
    response: any;
}

export default function ChecklistItemDetail({ item, response }: ChecklistItemDetailProps) {
    const [unit, setUnit] = useState<string>('');

    useEffect(() => {
        if (item?.askForQuantity && response?.answer && item?.databaseSource) {
            fetch(`/api/database-options?source=${item.databaseSource}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const opt = data.find(o => o.label === response.answer);
                        if (opt?.unit) setUnit(opt.unit);
                    }
                })
                .catch(console.error);
        }
    }, [item, response?.answer]);

    if (!item) return null;
    const answer = response?.answer;
    const observation = response?.observation;
    const quantity = response?.quantity;

    const renderContent = () => {
        // Safe check for answer type
        if (answer && typeof answer !== 'string') {
            // If answer is not a string (e.g. object), try to stringify or just show error
            if (typeof answer === 'object') return <pre>{JSON.stringify(answer, null, 2)}</pre>;
            return <p className="text-red-500">Formato de resposta inválido</p>;
        }

        switch (item.type) {
            case 'PROPERTY_MAP':
                return (
                    <div className="w-full h-[500px]">
                        <PropertyMapInput value={answer || ''} readOnly={true} hideEsg={true} />
                    </div>
                );
            case 'FILE':
                if (!answer) return <p className="text-slate-400 italic">Nenhum arquivo enviado.</p>;

                // Ensure answer is a string and looks like a URL/Path
                const isImage = typeof answer === 'string' && answer.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

                // If it's a file but not obviously an image, or if we want to be safe
                // We'll trust next/image only if we are relatively sure, or use standard img tag as fallback to avoid constructor errors?
                // next/image requires absolute source or imported. if "answer" is just "foo.jpg", it fails.
                // Let's assume valid URL if it starts with http or /
                const isValidUrl = typeof answer === 'string' && (answer.startsWith('http') || answer.startsWith('/'));

                if (isImage && isValidUrl) {
                    return (
                        <div className="flex flex-col items-center">
                            <div className="relative w-full max-w-2xl h-[400px] rounded-2xl overflow-hidden border border-slate-200">
                                <Image
                                    src={answer}
                                    alt="Arquivo enviado"
                                    fill
                                    className="object-contain bg-slate-50"
                                    onError={() => { /* Fallback or suppress? */ }}
                                />
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col items-center">
                        <a
                            href={answer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 font-medium"
                        >
                            🔗 Baixar Arquivo
                        </a>
                    </div>
                );

            case 'DROPDOWN_SELECT':
            case 'SINGLE_CHOICE':
            case 'MULTIPLE_CHOICE':
                let displayAnswer = answer;
                try {
                    // Try to parse if it's JSON stringified array
                    if (answer && (answer.startsWith('[') || answer.startsWith('{'))) {
                        const parsed = JSON.parse(answer);
                        if (Array.isArray(parsed)) displayAnswer = parsed.join(', ');
                    }
                } catch (e) { }

                return (
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="text-3xl font-black text-slate-800 text-center">
                            {displayAnswer || <span className="text-slate-300 italic">Não respondido</span>}
                        </h3>
                        {quantity && item.askForQuantity && (
                            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                Quantidade: {quantity} <span className="opacity-60 text-xs">{unit || 'un'}</span>
                            </div>
                        )}
                    </div>
                );
            default:
                return (
                    <p className="text-xl text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {answer || <span className="text-slate-300 italic">Não respondido</span>}
                    </p>
                );
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8 animate-fade-in my-auto">
            <div className="text-center space-y-2">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                    {item.type.replace('_', ' ')}
                </span>
                {response?.isInternal && (
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                            <AlertCircle size={12} strokeWidth={2.5} />
                            Preenchido Internamente
                        </span>
                    </div>
                )}
                <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
                    {item.name}
                </h2>
                {item.description && (
                    <p className="text-slate-500 max-w-xl mx-auto text-lg">
                        {item.description}
                    </p>
                )}
            </div>

            <div className="p-8 md:p-12 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                {renderContent()}
            </div>

            {observation && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-amber-900">
                    <h4 className="flex items-center gap-2 font-bold mb-2 text-amber-700 text-xs uppercase tracking-wider">
                        📝 Observação do Produtor
                    </h4>
                    <p className="text-sm leading-relaxed">{observation}</p>
                </div>
            )}
        </div>
    );
}
