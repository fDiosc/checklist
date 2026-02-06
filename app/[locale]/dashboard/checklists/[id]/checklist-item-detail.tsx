'use client';

import { AlertCircle, Eye } from 'lucide-react';
import PropertyMapInput from '@/components/PropertyMapInput';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import DocumentViewerModal from '@/components/modals/DocumentViewerModal';

interface ChecklistItemDetailProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any;
}

export default function ChecklistItemDetail({ item, response }: ChecklistItemDetailProps) {
    const t = useTranslations();
    const [unit, setUnit] = useState<string>('');
    const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
    const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
    // Separate state for attachment file (fileUrl field on response, used by requestArtifact items)
    const [resolvedAttachmentUrl, setResolvedAttachmentUrl] = useState<string | null>(null);
    const [isAttachmentViewerOpen, setIsAttachmentViewerOpen] = useState(false);

    const resolveFileUrl = useCallback(async (fileKey: string) => {
        if (fileKey.startsWith('http') || fileKey.startsWith('/')) {
            return fileKey;
        }
        // It's an S3 key, get presigned URL
        if (fileKey.startsWith('checklist/')) {
            try {
                const res = await fetch(`/api/upload/presigned-url?key=${encodeURIComponent(fileKey)}`);
                if (res.ok) {
                    const data = await res.json();
                    return data.url as string;
                }
            } catch {
                console.warn('Failed to resolve S3 URL');
            }
        }
        return null;
    }, []);

    // Resolve file URL for FILE type items (answer contains S3 key)
    useEffect(() => {
        if (response?.answer && item?.type === 'FILE') {
            resolveFileUrl(response.answer).then(url => setResolvedFileUrl(url));
        }
    }, [response?.answer, item?.type, resolveFileUrl]);

    // Resolve attachment URL for non-FILE items with requestArtifact (fileUrl field on response)
    useEffect(() => {
        if (response?.fileUrl && item?.type !== 'FILE') {
            resolveFileUrl(response.fileUrl).then(url => setResolvedAttachmentUrl(url));
        }
    }, [response?.fileUrl, item?.type, resolveFileUrl]);

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

    const renderAttachment = () => {
        const attachmentKey = response?.fileUrl;
        if (!attachmentKey) return null;

        const isImage = typeof attachmentKey === 'string' && attachmentKey.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

        if (isImage && resolvedAttachmentUrl) {
            return (
                <div className="w-full mt-4 flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('checklistDetail.attachedDocument') || 'Documento Anexado'}</span>
                    <div className="relative w-full max-w-xl h-[300px] rounded-xl overflow-hidden border border-slate-200 cursor-pointer group" onClick={() => setIsAttachmentViewerOpen(true)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={resolvedAttachmentUrl}
                            alt="Documento anexado"
                            className="w-full h-full object-contain bg-white"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                                <Eye size={20} className="text-slate-700" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAttachmentViewerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        <Eye size={14} />
                        {t('checklistDetail.expandView') || 'Expandir'}
                    </button>
                </div>
            );
        }

        return (
            <div className="w-full mt-4 flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('checklistDetail.attachedDocument') || 'Documento Anexado'}</span>
                {resolvedAttachmentUrl ? (
                    <button
                        onClick={() => setIsAttachmentViewerOpen(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl hover:bg-slate-100 transition-colors text-slate-700 font-medium border border-slate-200"
                    >
                        <Eye size={18} />
                        {t('checklistDetail.viewDocument') || 'Visualizar Documento'}
                    </button>
                ) : attachmentKey.startsWith('checklist/') ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                        {t('common.loading') || 'Carregando...'}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm font-medium">{attachmentKey}</p>
                )}
            </div>
        );
    };

    const renderContent = () => {
        // Safe check for answer type
        if (answer && typeof answer !== 'string') {
            // If answer is not a string (e.g. object), try to stringify or just show error
            if (typeof answer === 'object') return <pre>{JSON.stringify(answer, null, 2)}</pre>;
            return <p className="text-red-500">{t('checklistDetail.invalidFormat')}</p>;
        }

        switch (item.type) {
            case 'PROPERTY_MAP':
                return (
                    <div className="w-full h-[500px]">
                        <PropertyMapInput value={answer || ''} readOnly={true} hideEsg={true} />
                    </div>
                );
            case 'FILE':
                if (!answer) return <p className="text-slate-400 italic">{t('checklistDetail.noFileSent')}</p>;

                const isImage = typeof answer === 'string' && answer.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                const displayUrl = resolvedFileUrl;

                if (isImage && displayUrl) {
                    return (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-full max-w-2xl h-[400px] rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group" onClick={() => setIsDocViewerOpen(true)}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={displayUrl}
                                    alt="Arquivo enviado"
                                    className="w-full h-full object-contain bg-slate-50"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                                        <Eye size={20} className="text-slate-700" />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDocViewerOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                            >
                                <Eye size={14} />
                                {t('checklistDetail.expandView') || 'Expandir'}
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col items-center gap-4">
                        {displayUrl ? (
                            <button
                                onClick={() => setIsDocViewerOpen(true)}
                                className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 font-medium border border-slate-200"
                            >
                                <Eye size={18} />
                                {t('checklistDetail.viewDocument') || 'Visualizar Documento'}
                            </button>
                        ) : answer.startsWith('checklist/') ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                Carregando...
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm font-medium">{answer}</p>
                        )}
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
                } catch { }

                return (
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="text-3xl font-black text-slate-800 text-center">
                            {displayAnswer || <span className="text-slate-300 italic">{t('checklistManagement.noResponse')}</span>}
                        </h3>
                        {quantity && item.askForQuantity && (
                            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                {t('checklistDetail.quantity')}: {quantity} <span className="opacity-60 text-xs">{unit || t('checklistDetail.unit')}</span>
                            </div>
                        )}
                        {/* Show attached document/photo for items with requestArtifact */}
                        {response?.fileUrl && renderAttachment()}
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-xl text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {answer || <span className="text-slate-300 italic">{t('checklistManagement.noResponse')}</span>}
                        </p>
                        {response?.fileUrl && renderAttachment()}
                    </div>
                );
        }
    };

    const getItemTypeLabel = (type: string) => {
        switch (type) {
            case 'SINGLE_CHOICE': return t('checklistDetail.itemTypes.singleChoice');
            case 'MULTIPLE_CHOICE': return t('checklistDetail.itemTypes.multipleChoice');
            case 'DROPDOWN_SELECT': return t('checklistDetail.itemTypes.dropdown');
            case 'FILE': return t('checklistDetail.itemTypes.file');
            case 'PROPERTY_MAP': return t('checklistDetail.itemTypes.propertyMap');
            case 'TEXT': return t('checklistDetail.itemTypes.text');
            case 'NUMBER': return t('checklistDetail.itemTypes.number');
            default: return type.replace('_', ' ');
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8 animate-fade-in my-auto">
            <div className="text-center space-y-2">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                    {getItemTypeLabel(item.type)}
                </span>
                {response?.isInternal && (
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                            <AlertCircle size={12} strokeWidth={2.5} />
                            {t('checklistDetail.filledInternally')}
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
                        📝 {t('checklistDetail.producerObservation')}
                    </h4>
                    <p className="text-sm leading-relaxed">{observation}</p>
                </div>
            )}

            {/* Document Viewer Modal - for FILE type items */}
            <DocumentViewerModal
                isOpen={isDocViewerOpen}
                onClose={() => setIsDocViewerOpen(false)}
                fileUrl={answer || ''}
                filename={typeof answer === 'string' ? answer.split('/').pop() : undefined}
            />

            {/* Document Viewer Modal - for attachment (requestArtifact) items */}
            {response?.fileUrl && (
                <DocumentViewerModal
                    isOpen={isAttachmentViewerOpen}
                    onClose={() => setIsAttachmentViewerOpen(false)}
                    fileUrl={response.fileUrl}
                    filename={typeof response.fileUrl === 'string' ? response.fileUrl.split('/').pop() : undefined}
                />
            )}
        </div>
    );
}
