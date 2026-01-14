'use client';

import React from 'react';
import { PropertyField } from '@/types/checklist';

interface FieldSelectorInputProps {
    producerIdentifier?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    producerMaps?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (val: any[]) => void;
    readOnly?: boolean;
}

const FieldSelectorInput: React.FC<FieldSelectorInputProps> = ({
    producerIdentifier,
    producerMaps = [],
    value = [],
    onChange,
    readOnly = false
}) => {
    // Extract and merge fields from server maps AND localStorage history
    const fields: PropertyField[] = React.useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serverFields = producerMaps.flatMap((map: any) => map.fields || []);

        let localFields: PropertyField[] = [];
        try {
            const allProducers = JSON.parse(localStorage.getItem('merx_producers') || '[]');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const producer = allProducers.find((p: any) => p.identifier === producerIdentifier);
            if (producer?.savedMaps) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                localFields = producer.savedMaps.flatMap((m: any) => m.fields || []);
            }
        } catch (e) {
            console.error("Error loading local history", e);
        }

        // Merge and remove duplicates by ID
        const allFields = [...serverFields, ...localFields];
        const uniqueFields: PropertyField[] = [];
        const seenIds = new Set();

        allFields.forEach(f => {
            if (!seenIds.has(f.id)) {
                seenIds.add(f.id);
                uniqueFields.push(f);
            }
        });

        return uniqueFields;
    }, [producerMaps, producerIdentifier]);

    const toggleField = (fieldId: string) => {
        if (readOnly) return;

        if (value.includes(fieldId)) {
            onChange(value.filter(id => id !== fieldId));
        } else {
            onChange([...value, fieldId]);
        }
    };

    if (!producerIdentifier) {
        return (
            <div className="p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-amber-500 shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <h4 className="font-black text-amber-900 uppercase tracking-widest text-xs">Identificação Necessária</h4>
                    <p className="text-sm text-amber-700/60 font-medium mt-1">Nenhum produtor identificado para carregar talhões.</p>
                </div>
            </div>
        );
    }

    if (fields.length === 0) {
        return (
            <div className="p-10 bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2.5rem] text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M9 20l-5.447-2.724A2 2 0 013 15.483V4.118a2 2 0 011.658-1.97L12 1l7.342 1.148A2 2 0 0121 4.118v11.365a2 2 0 01-1.153 1.793L15 20l-3 2-3-2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Nenhum talhão encontrado</p>
                    <p className="text-sm text-slate-400 font-medium mt-1 italic">Vá para o item de Mapa de Propriedade primeiro.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                {readOnly ? 'Talhões Selecionados' : 'Selecione os talhões:'}
            </p>

            <div className="grid grid-cols-1 gap-4">
                {fields.map(field => {
                    const isSelected = value.includes(field.id);
                    if (readOnly && !isSelected) return null;

                    return (
                        <button
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`
                                p-8 rounded-[2.5rem] border-4 transition-all flex items-center justify-between text-left
                                ${isSelected
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xl shadow-emerald-500/20 scale-[1.02]'
                                    : 'bg-gray-50 border-transparent text-slate-600 hover:bg-white hover:border-gray-100'}
                            `}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-xl font-black uppercase tracking-tighter">
                                    {field.name}
                                </span>
                                {field.area && <span className={`text-xs font-bold tracking-widest ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{field.area} HA</span>}
                            </div>

                            <div className={`w-10 h-10 rounded-2xl border-4 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white' : 'bg-white border-gray-200'
                                }`}>
                                {isSelected && (
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default FieldSelectorInput;
