'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { isS3Key } from '@/lib/s3';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    filename?: string;
}

export default function DocumentViewerModal({ isOpen, onClose, fileUrl, filename }: DocumentViewerModalProps) {
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);

    // Extract clean filename from S3 key or raw filename
    // S3 keys look like: checklist/{ws}/{sub}/{cl}/{item}/{field}/{timestamp}_{filename}
    const cleanFilename = (() => {
        const raw = filename || fileUrl || 'Documento';
        // Get last segment of path
        const lastSegment = raw.split('/').pop() || raw;
        // Remove leading timestamp prefix (digits followed by underscore)
        return lastSegment.replace(/^\d+_/, '');
    })();

    useEffect(() => {
        if (!isOpen || !fileUrl) return;

        setIsLoading(true);
        setError(null);
        setZoom(1);

        if (isS3Key(fileUrl)) {
            // Resolve S3 key to a presigned URL
            fetch(`/api/upload/presigned-url?key=${encodeURIComponent(fileUrl)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to get URL');
                    return res.json();
                })
                .then(data => {
                    setResolvedUrl(data.url);
                })
                .catch(() => {
                    setError('Não foi possível carregar o arquivo.');
                })
                .finally(() => setIsLoading(false));
        } else if (fileUrl.startsWith('http') || fileUrl.startsWith('/')) {
            setResolvedUrl(fileUrl);
            setIsLoading(false);
        } else {
            setError('Formato de arquivo não reconhecido.');
            setIsLoading(false);
        }
    }, [isOpen, fileUrl]);

    if (!isOpen) return null;

    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(fileUrl) || /\.(jpeg|jpg|gif|png|webp)$/i.test(cleanFilename);
    const isPdf = /\.pdf$/i.test(fileUrl) || /\.pdf$/i.test(cleanFilename);

    const handleDownload = () => {
        if (resolvedUrl) {
            const a = document.createElement('a');
            a.href = resolvedUrl;
            a.download = cleanFilename;
            a.target = '_blank';
            a.click();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 text-sm truncate max-w-md">{cleanFilename}</h3>
                        {isImage && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Diminuir zoom"
                                >
                                    <ZoomOut size={16} className="text-slate-500" />
                                </button>
                                <span className="text-xs font-bold text-slate-400 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                                <button
                                    onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Aumentar zoom"
                                >
                                    <ZoomIn size={16} className="text-slate-500" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                        >
                            <Download size={14} />
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-50 min-h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={32} className="animate-spin text-slate-400" />
                            <span className="text-xs font-bold text-slate-400">Carregando...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center">
                            <p className="text-red-500 font-bold mb-2">{error}</p>
                            <p className="text-slate-400 text-sm">Chave: {fileUrl}</p>
                        </div>
                    ) : resolvedUrl ? (
                        isImage ? (
                            <div className="overflow-auto max-w-full max-h-full" style={{ cursor: zoom > 1 ? 'grab' : 'default' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={resolvedUrl}
                                    alt={cleanFilename}
                                    className="transition-transform duration-200"
                                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                                />
                            </div>
                        ) : isPdf ? (
                            <iframe
                                src={resolvedUrl}
                                className="w-full h-full min-h-[600px] rounded-xl border border-slate-200"
                                title="PDF Viewer"
                            />
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                                        <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 font-medium">Este tipo de arquivo não pode ser visualizado diretamente.</p>
                                <button
                                    onClick={handleDownload}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    Baixar Arquivo
                                </button>
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
