'use client';

import React, { useState } from 'react';
import { DocumentItem } from '@/types/checklist';
import PropertyMapInput from './PropertyMapInput';
import CameraCapture from './CameraCapture';
import FieldSelectorInput from './FieldSelectorInput';
import { useTranslations } from 'next-intl';
import { CountryCode } from '@/lib/countries';

interface UploadContext {
    workspaceId: string;
    subworkspaceId?: string | null;
    checklistId: string;
}

interface ChecklistItemProps {
    item: DocumentItem;
    idSuffix?: string;
    onUpdate: (updates: Partial<DocumentItem>) => void;
    producerIdentifier?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    producerMaps?: any[];
    readOnly?: boolean;
    countryCode?: CountryCode;
    uploadContext?: UploadContext;
    onAiValidationResult?: (result: { valid: boolean; legible: boolean; correctType: boolean; message: string }) => void;
    onUploadingChange?: (uploading: boolean) => void;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
    item,
    idSuffix = '',
    onUpdate,
    producerIdentifier,
    producerMaps,
    readOnly = false,
    countryCode = 'BR',
    uploadContext,
    onAiValidationResult,
    onUploadingChange,
}) => {
    const t = useTranslations();
    const [showCamera, setShowCamera] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dbOptions, setDbOptions] = useState<any[]>([]);
    const [isLoadingDb, setIsLoadingDb] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const uniqueId = `${item.id}${idSuffix}`;

    React.useEffect(() => {
        if (item.databaseSource) {
            setIsLoadingDb(true);
            fetch(`/api/database-options?source=${item.databaseSource}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setDbOptions(data);
                    }
                })
                .finally(() => setIsLoadingDb(false));
        }
    }, [item.databaseSource]);

    const uploadFile = async (file: File) => {
        if (!uploadContext) {
            // Fallback to old behavior if no upload context provided
            onUpdate({ fileUrl: file.name, status: item.status });
            return;
        }

        setIsUploading(true);
        onUploadingChange?.(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', uploadContext.workspaceId);
            if (uploadContext.subworkspaceId) formData.append('subworkspaceId', uploadContext.subworkspaceId);
            formData.append('checklistId', uploadContext.checklistId);
            formData.append('itemId', item.id);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            const data = await res.json();
            onUpdate({ fileUrl: data.key, status: item.status });

            // Trigger AI validation if callback provided
            if (onAiValidationResult) {
                try {
                    const valRes = await fetch('/api/ai/validate-document', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            s3Key: data.key,
                            itemName: item.name,
                            itemType: item.type,
                            workspaceId: uploadContext.workspaceId,
                        }),
                    });
                    if (valRes.ok) {
                        const valData = await valRes.json();
                        onAiValidationResult(valData);
                    }
                } catch {
                    // AI validation is optional, don't block the upload
                    console.warn('AI validation failed, continuing');
                }
            }
        } catch (error) {
            console.error('File upload error:', error);
            setUploadError(error instanceof Error ? error.message : 'Erro no upload');
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const renderFileUpload = () => (
        <div className={`mt-6 p-6 md:p-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100 transition-all hover:bg-white hover:border-primary/20`}>
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('publicChecklist.attachFile')}</span>
                </div>

                {isUploading ? (
                    <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-2xl text-blue-600 border border-blue-100 animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-xs font-bold">{t('publicChecklist.uploading') || 'Enviando arquivo...'}</span>
                    </div>
                ) : item.fileUrl ? (
                    <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl text-emerald-700 border border-emerald-100 animate-fade-in">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs font-bold truncate max-w-[150px]">{t('publicChecklist.fileUploaded')}</span>
                        <button onClick={() => onUpdate({ fileUrl: '' })} className="ml-2 hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={() => document.getElementById(`file-${uniqueId}`)?.click()}
                            className="bg-white border text-gray-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all"
                        >
                            {t('publicChecklist.file')}
                        </button>
                        <button
                            onClick={() => setShowCamera(true)}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('publicChecklist.camera')}
                        </button>
                        <input
                            id={`file-${uniqueId}`}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}
            </div>
            {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {uploadError}
                </div>
            )}
            {showCamera && <CameraCapture onCapture={(file) => { uploadFile(file); setShowCamera(false); }} onClose={() => setShowCamera(false)} />}
        </div>
    );

    const renderInput = () => {
        const type = item.type.toLowerCase();
        switch (type) {
            case 'file': return renderFileUpload();
            case 'dropdown_select': {
                const options = item.databaseSource ? dbOptions.map(o => o.label) : (item.options || []);

                return (
                    <div className="space-y-6">
                        <div className="relative group">
                            {isLoadingDb ? (
                                <div className="w-full p-8 bg-gray-50 rounded-[2.5rem] flex items-center justify-center">
                                    <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : (
                                <select
                                    value={item.answer as string || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const selectedOption = dbOptions.find(o => o.label === val);
                                        onUpdate({
                                            answer: val,
                                            // Pass DB metadata if available so parent can auto-fill
                                            metadata: selectedOption ? {
                                                composition: selectedOption.composition,
                                                unit: selectedOption.unit
                                            } : undefined
                                        });
                                    }}
                                    className="w-full appearance-none p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold outline-none shadow-sm text-slate-900 transition-all focus:bg-white focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500"
                                >
                                    <option value="">{t('publicChecklist.selectOption')}</option>
                                    {options.map((opt, i) => (
                                        <option key={i} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-primary transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        {item.askForQuantity && item.answer && (
                            <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col gap-4 animate-fade-in">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex flex-col gap-1">
                                    <span>{item.databaseSource ? t('publicChecklist.dose') : `${t('publicChecklist.quantity')} ${item.answer}`}</span>
                                    {dbOptions.find(o => o.label === item.answer)?.composition && (
                                        <span className="text-xs font-bold text-emerald-700 italic">
                                            ({dbOptions.find(o => o.label === item.answer)?.composition})
                                        </span>
                                    )}
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={item.quantity || ''}
                                        onChange={(e) => onUpdate({ quantity: e.target.value })}
                                        placeholder="0.00"
                                        className="flex-1 bg-transparent border-none text-3xl font-black text-emerald-900 outline-none placeholder:text-emerald-200"
                                    />
                                    <span className="text-xl font-black text-emerald-400">
                                        {dbOptions.find(o => o.label === item.answer)?.unit || 'un'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            case 'single_choice': return (
                <div className="grid gap-4">
                    {item.options?.map((opt, i) => {
                        const isSelected = item.answer === opt;
                        return (
                            <button
                                key={i}
                                onClick={() => onUpdate({ answer: opt })}
                                className={`
                                    flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all text-left group
                                    ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-[1.01]' : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/10'}
                                `}
                            >
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white' : 'bg-slate-50 border-slate-200 group-hover:border-emerald-300'}`}>
                                    {isSelected && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                                </div>
                                <span className="text-xl font-black tracking-tight">{opt}</span>
                            </button>
                        );
                    })}
                    {item.requestArtifact && item.answer === 'Sim' && renderFileUpload()}
                </div>
            );

            case 'multiple_choice': return (
                <div className="grid gap-4">
                    {item.options?.map((opt, i) => {
                        const answers = Array.isArray(item.answer) ? item.answer : [];
                        const isSelected = answers.includes(opt);
                        const handleToggle = () => {
                            const newAnswers = isSelected ? answers.filter(a => a !== opt) : [...answers, opt];
                            onUpdate({ answer: newAnswers });
                        };

                        return (
                            <button
                                key={i}
                                onClick={handleToggle}
                                className={`
                                    flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all text-left group
                                    ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-[1.01]' : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/10'}
                                `}
                            >
                                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white' : 'bg-slate-50 border-slate-200 group-hover:border-emerald-300'}`}>
                                    {isSelected && (
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xl font-black tracking-tight">{opt}</span>
                            </button>
                        );
                    })}
                </div>
            );

            case 'date': return (
                <div className="p-8 bg-gray-50 rounded-[2.5rem] shadow-inner">
                    <input
                        type="date"
                        value={item.answer as string || ''}
                        onChange={(e) => onUpdate({ answer: e.target.value })}
                        className="w-full bg-transparent border-none text-2xl font-black text-slate-800 outline-none"
                    />
                </div>
            );

            case 'long_text': return (
                <textarea
                    value={item.answer as string || ''}
                    onChange={(e) => onUpdate({ answer: e.target.value })}
                    className="w-full h-64 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold outline-none resize-none shadow-sm text-slate-900 transition-all focus:bg-white focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500"
                    placeholder={t('publicChecklist.typeDetailedAnswer')}
                />
            );

            case 'property_map': return (
                <PropertyMapInput
                    value={item.answer as string || ''}
                    onChange={(val) => onUpdate({ answer: val })}
                    readOnly={readOnly}
                    countryCode={countryCode}
                />
            );

            case 'field_selector': return (
                <FieldSelectorInput
                    producerIdentifier={producerIdentifier}
                    producerMaps={producerMaps}
                    value={Array.isArray(item.answer) ? item.answer : []}
                    onChange={(val) => onUpdate({ answer: val })}
                />
            );


            default: return (
                <input
                    type="text"
                    value={item.answer as string || ''}
                    onChange={(e) => onUpdate({ answer: e.target.value })}
                    className="w-full p-8 bg-gray-50 border-none rounded-[2.5rem] text-xl font-bold outline-none shadow-inner text-slate-800 transition-all focus:bg-white focus:ring-4 focus:ring-primary/10"
                    placeholder="Digite sua resposta..."
                />
            );
        }
    };

    return (
        <div className="animate-fade-in pb-20 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-6 bg-slate-50/50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100">
                <div className="flex-1">
                    <span className="px-3 py-1 bg-emerald-100/50 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{item.type.replace('_', ' ')}</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] mt-5 tracking-tighter">{item.name}</h2>
                    {producerIdentifier && (
                        <div className="flex items-center gap-3 mt-4 text-slate-500 font-bold text-xs bg-white/80 w-fit px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            {producerIdentifier}
                        </div>
                    )}
                </div>
                {item.required && <span className="self-start md:self-auto bg-red-50 text-red-500 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border-2 border-red-100/50 shadow-sm animate-bounce-slow">{t('publicChecklist.required')}</span>}
            </div>

            <div className="space-y-12">
                <div className="min-h-[200px]">{renderInput()}</div>

                {item.observationEnabled && (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 animate-fade-in transition-all hover:border-primary/30">
                        <div className="flex items-center gap-3 mb-4 text-gray-400">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M17 10H3M21 6H3M21 14H3M17 18H3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('publicChecklist.observations')}</span>
                        </div>
                        <textarea
                            value={item.observationValue || ''}
                            onChange={(e) => onUpdate({ observationValue: e.target.value })}
                            placeholder={t('publicChecklist.observationsPlaceholder')}
                            className="w-full h-32 bg-gray-50 border-none rounded-2xl p-6 font-medium outline-none resize-none shadow-inner text-slate-800 transition-all focus:bg-white"
                        />
                    </div>
                )}

                {item.validityControl && (
                    <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 animate-fade-in">
                        <div className="flex items-center gap-3 mb-4 text-indigo-500">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('publicChecklist.validityControl')}</span>
                        </div>
                        <input
                            type="date"
                            value={item.validity ? new Date(item.validity).toISOString().split('T')[0] : ''}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={(e) => onUpdate({ validity: e.target.value as any })}
                            className="w-full p-4 bg-white rounded-xl font-bold outline-none border-2 border-indigo-100 focus:border-indigo-500 text-indigo-900 transition-all"
                        />
                        <p className="mt-3 text-[10px] font-bold text-indigo-400 italic">{t('publicChecklist.validityDescription')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChecklistItem;
