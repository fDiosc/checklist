'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';
import ChecklistItem from '@/components/ChecklistItem';
import { DocumentItem } from '@/types/checklist';
import { useTranslations } from 'next-intl';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Sparkles, Info, XCircle, ClipboardList } from 'lucide-react';
import ChangelogModal from '@/components/modals/ChangelogModal';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChecklistFormClient({ checklist }: { checklist: any }) {
    const t = useTranslations();

    const getChildTypeLabel = () => {
        if (!checklist.parentId) return null;
        if (checklist.type === 'CORRECTION') return t('publicChecklist.correction');
        if (checklist.type === 'COMPLETION') return t('publicChecklist.completion');
        return t('publicChecklist.original');
    };

    const typeLabel = getChildTypeLabel();

    const [currentStep, setCurrentStep] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isActionPlanModalOpen, setIsActionPlanModalOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [aiValidationResult, setAiValidationResult] = useState<{
        valid: boolean; legible: boolean; correctType: boolean; message: string; mode?: string;
    } | null>(null);
    const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
    const [showFieldSelection, setShowFieldSelection] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isFileUploading, setIsFileUploading] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

    const storageKey = `merx_draft_${checklist.publicToken}`;

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let finalResponses: Record<string, any> = {};

        if (saved) {
            try {
                finalResponses = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }

        if (checklist.responses && Array.isArray(checklist.responses)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            checklist.responses.forEach((r: any) => {
                const key = (r.fieldId && r.fieldId !== '__global__') ? `${r.itemId}::${r.fieldId}` : r.itemId;
                const local = finalResponses[key] || {};
                const isCorrectionDraft = r.status === 'REJECTED' && local.answer && local.answer !== r.answer;

                finalResponses[key] = {
                    ...local,
                    ...r,
                    itemId: r.itemId,
                    status: isCorrectionDraft ? 'PENDING_VERIFICATION' : r.status,
                    rejectionReason: r.rejectionReason,
                };
            });
        }

        setResponses(finalResponses);

        const initialFields = finalResponses['__selected_fields']?.answer ||
            Array.from(new Set(
                Object.values(finalResponses)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((r: any) => r.fieldId && r.fieldId !== '__global__')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((r: any) => r.fieldId)
            ));

        setSelectedFieldIds(initialFields as string[]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasIteratable = checklist.template.sections.some((s: any) => s.iterateOverFields);
        if (hasIteratable && (initialFields as string[]).length === 0) {
            setShowFieldSelection(true);
        }

        const initialSaved = new Set<string>();
        Object.keys(finalResponses).forEach((key: string) => {
            const resp = finalResponses[key];
            // Only consider an item "saved" if it has an answer AND is not in MISSING/REJECTED status
            // MISSING = copied from parent rejection, needs new answer
            // REJECTED = rejected by supervisor, needs correction
            if (resp.answer && resp.status !== 'MISSING' && resp.status !== 'REJECTED') {
                initialSaved.add(key);
            }
        });
        setSavedItems(initialSaved);
        setIsLoaded(true);

        if (checklist.producer?.name) {
            localStorage.setItem('merx_producer_identifier', checklist.producer.name);
        }
    }, [storageKey, checklist.producer?.name, checklist.responses, checklist.template.sections]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(storageKey, JSON.stringify(responses));
        }
    }, [responses, storageKey, isLoaded]);

    const isReadOnly = checklist.status !== 'SENT' && checklist.status !== 'IN_PROGRESS';

    // Check if this is a child checklist (has parentId)
    const isChildChecklist = !!checklist.parentId;
    // Build a set of itemIds that have responses (for child checklist filtering)
    const responseItemIds = useMemo(() => {
        return new Set(checklist.responses?.map((r: { itemId: string }) => r.itemId) || []);
    }, [checklist.responses]);

    // Get published action plans (from this checklist or parent)
    const publishedActionPlans = useMemo(() => {
        const plans = [...(checklist.actionPlans || []), ...(checklist.parent?.actionPlans || [])];
        return plans.filter((p: { isPublished: boolean }) => p.isPublished);
    }, [checklist.actionPlans, checklist.parent?.actionPlans]);

    const computedSections = useMemo(() => {
        const sections = checklist.template.sections;

        if (selectedFieldIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newSections: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sections.forEach((section: any) => {
                if (section.iterateOverFields) {
                    selectedFieldIds.forEach((fieldId: string) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const allFields = checklist.producer?.maps?.flatMap((m: any) => m.fields || []) || [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const field = allFields.find((f: any) => f.id === fieldId);
                        const fieldName = field?.name || `Talhão ${fieldId}`;

                        // Filter items for child checklists
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const filteredItems = section.items
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .filter((item: any) => !isChildChecklist || responseItemIds.has(item.id))
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map((item: any) => ({
                                ...item,
                                id: `${item.id}::${fieldId}`
                            }));

                        if (filteredItems.length > 0) {
                            newSections.push({
                                ...section,
                                id: `${section.id}::${fieldId}`,
                                name: `${section.name} - ${fieldName}`,
                                fieldId,
                                items: filteredItems
                            });
                        }
                    });
                } else {
                    // For non-iterating sections, also filter items for child checklists
                    if (isChildChecklist) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const filteredItems = section.items.filter((item: any) => responseItemIds.has(item.id));
                        if (filteredItems.length > 0) {
                            newSections.push({ ...section, items: filteredItems });
                        }
                    } else {
                        newSections.push(section);
                    }
                }
            });
            return newSections;
        }

        // If no field selection, still filter for child checklists
        if (isChildChecklist) {
            return sections
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((section: any) => ({
                    ...section,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: section.items.filter((item: any) => responseItemIds.has(item.id))
                }))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((section: any) => section.items.length > 0);
        }

        return sections;
    }, [checklist.template.sections, selectedFieldIds, checklist.producer?.maps, isChildChecklist, responseItemIds]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allItems: any[] = useMemo(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        computedSections.flatMap((s: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            s.items.map((item: any) => ({ ...item, sectionName: s.name }))
        ),
        [computedSections]);

    const currentItem = allItems[currentStep];
    const progress = ((currentStep + 1) / (allItems.length || 1)) * 100;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validateItem = (item: any, response: any) => {
        if (!item?.required) return true;
        const answer = response?.answer;
        if (!answer) return false;
        if (Array.isArray(answer) && answer.length === 0) return false;
        return true;
    };

    const handleUpdateItem = (updates: Partial<DocumentItem>) => {
        const currentResponse = responses[currentItem.id] || {};
        if (currentResponse.status === 'APPROVED') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResponses((prev: Record<string, any>) => {
            const currentResponse = prev[currentItem.id] || {};
            const newResponse = { ...currentResponse, ...updates };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newResponses: Record<string, any> = {
                ...prev,
                [currentItem.id]: newResponse
            };

            if (updates.metadata) {
                const { composition, unit } = updates.metadata;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentSection = computedSections.find((s: any) => s.items.some((i: any) => i.id === currentItem.id));
                if (currentSection) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    currentSection.items.forEach((item: any) => {
                        const isCompositionField = item.name.toLowerCase().includes('composição');
                        const isUnitField = item.name.toLowerCase().includes('unidade de dose');

                        if (isCompositionField && composition) {
                            newResponses[item.id] = {
                                ...(newResponses[item.id] || {}),
                                answer: composition,
                                status: 'PENDING_VERIFICATION'
                            };
                        }
                        if (isUnitField && unit) {
                            newResponses[item.id] = {
                                ...(newResponses[item.id] || {}),
                                answer: unit,
                                status: 'PENDING_VERIFICATION'
                            };
                        }
                    });
                }
            }

            return newResponses;
        });
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleNext = () => {
        if (isSaving || isFileUploading) return;
        if (currentStep < allItems.length - 1) {
            setCurrentStep(currentStep + 1);
            setAiValidationResult(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevious = () => {
        if (isSaving) return;
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setAiValidationResult(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFinish = async () => {
        const invalidIdx = allItems.findIndex(item => !validateItem(item, responses[item.id]));
        if (invalidIdx !== -1) {
            alert(`${t('publicChecklist.validation.requiredField')} "${allItems[invalidIdx].name}"`);
            setCurrentStep(invalidIdx);
            return;
        }

        try {
            const res = await fetch(`/api/c/${checklist.publicToken}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });

            if (!res.ok) throw new Error('Falha ao enviar');

            alert(t('publicChecklist.validation.submitSuccess'));
            localStorage.removeItem(storageKey);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert(t('publicChecklist.validation.submitError'));
        }
    };

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const handleManualSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveStatus('saving');
        try {
            const res = await fetch(`/api/c/${checklist.publicToken}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });
            if (!res.ok) throw new Error('Falha no salvamento');

            setSaveStatus('success');
            setSavedItems(prev => new Set(prev).add(currentItem.id));
            setTimeout(() => {
                setSaveStatus('idle');
                setIsSaving(false);
            }, 1200);
        } catch (error) {
            console.error("Manual save failed", error);
            setSaveStatus('error');
            setTimeout(() => {
                setSaveStatus('idle');
                setIsSaving(false);
            }, 2000);
        }
    };

    const handleConfirmFields = () => {
        if (selectedFieldIds.length === 0) {
            alert(t('publicChecklist.validation.selectAtLeastOneField'));
            return;
        }

        setResponses(prev => ({
            ...prev,
            '__selected_fields': {
                answer: selectedFieldIds,
                status: 'APPROVED'
            }
        }));

        setShowFieldSelection(false);
    };

    if (showFieldSelection) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allFields = checklist.producer?.maps?.flatMap((m: any) => m.fields || []) || [];

        // Calculate center for the map
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allPoints = allFields.flatMap((f: any) => f.points || []);
        const center: [number, number] = allPoints.length > 0
            ? [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allPoints.reduce((sum: number, p: any) => sum + p.lat, 0) / allPoints.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allPoints.reduce((sum: number, p: any) => sum + p.lng, 0) / allPoints.length
            ]
            : [-15.7942, -47.8822];

        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
                <div className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl animate-scale-up">
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Map Area */}
                        <div className="w-full md:w-1/2 h-64 md:h-auto border-b md:border-b-0 md:border-r border-slate-100 relative bg-slate-50">
                            {isMounted ? (
                                <MapContainer
                                    center={center}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                >
                                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {allFields.map((field: any) => {
                                        const isSelected = selectedFieldIds.includes(field.id);
                                        return (
                                            <Polygon
                                                key={field.id}
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                positions={field.points.map((p: any) => [p.lat, p.lng])}
                                                pathOptions={{
                                                    color: isSelected ? '#10b981' : '#fbbf24',
                                                    fillColor: isSelected ? '#10b981' : '#fbbf24',
                                                    fillOpacity: 0.3,
                                                    weight: 3,
                                                    dashArray: isSelected ? '' : '5, 5'
                                                }}
                                            />
                                        );
                                    })}
                                </MapContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</div>
                            )}
                            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg text-[9px] font-black uppercase tracking-widest text-slate-500 z-[400]">
                                {t('publicChecklist.fieldVisualization')}
                            </div>
                        </div>

                        {/* Controls Area */}
                        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-8">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{t('publicChecklist.fieldSelection')}</h2>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10">
                                {t('publicChecklist.fieldSelectionDescription')}
                            </p>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-10" style={{ maxHeight: '350px' }}>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{t('publicChecklist.selectFields')}</label>
                                <div className="grid gap-3">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {allFields.map((field: any) => {
                                        const isSelected = selectedFieldIds.includes(field.id);
                                        return (
                                            <button
                                                key={field.id}
                                                onClick={() => {
                                                    setSelectedFieldIds(prev =>
                                                        isSelected ? prev.filter(id => id !== field.id) : [...prev, field.id]
                                                    );
                                                }}
                                                className={`
                                                flex items-center justify-between p-5 rounded-2xl border-2 transition-all group
                                                ${isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-emerald-200'}
                                            `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-slate-200 group-hover:border-emerald-300'}`}>
                                                        {isSelected && (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className={`font-black text-sm transition-colors ${isSelected ? 'text-emerald-900' : 'text-slate-600 group-hover:text-emerald-600'}`}>
                                                            {field.name}
                                                        </span>
                                                        {field.area && <span className="text-[10px] font-bold text-slate-400">{field.area}</span>}
                                                    </div>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full transition-all ${isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-auto pt-6 border-t border-slate-50">
                                <button
                                    onClick={() => window.history.back()}
                                    className="flex-1 px-8 py-5 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    {t('publicChecklist.previousStep')}
                                </button>
                                <button
                                    onClick={handleConfirmFields}
                                    className="flex-1 px-8 py-5 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                                >
                                    {t('publicChecklist.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-white flex flex-col md:flex-row overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white sticky top-0 z-50 shadow-2xl">
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Image src="/MX_logo_formC_Green.png" alt="Maxsum" width={36} height={36} className="rounded-xl shadow-lg shadow-emerald-500/20 brightness-0 invert flex-shrink-0" />
                        <div className="overflow-hidden">
                            <h1 className="text-[10px] font-black uppercase tracking-widest truncate opacity-60">{checklist.template.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-bold text-emerald-400 truncate max-w-[140px]">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {computedSections.find((s: any) => s.items.some((i: any) => i.id === currentItem?.id))?.name || 'Início'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                            {currentStep + 1} / {allItems.length}
                        </span>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M4 12h16M4 6h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                {/* Mobile Progress Bar */}
                <div className="h-1 w-full bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Child Checklist Notification */}
            {checklist.children && checklist.children.length > 0 && (
                <div className="fixed top-20 md:top-4 right-4 z-[100] animate-slide-left">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {checklist.children.map((child: { publicToken: string }) => (
                        <a
                            key={child.publicToken}
                            href={`/c/${child.publicToken}`}
                            className="block bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mb-2"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">{t('publicChecklist.actionNeeded')}</p>
                                    <p className="font-bold text-sm">{t('publicChecklist.newCorrectionAvailable')}</p>
                                </div>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {isReadOnly && (
                <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-4 text-center z-[100] font-black uppercase tracking-widest text-xs animate-slide-down">
                    Checklist Enviado e Bloqueado para Edição
                </div>
            )}

            {/* Action Plan Modal */}
            {isActionPlanModalOpen && publishedActionPlans.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in" onClick={() => setIsActionPlanModalOpen(false)}>
                    <div
                        className="w-full md:max-w-2xl max-h-[85vh] md:max-h-[80vh] bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black">{t('publicChecklist.actionPlan.title')}</h2>
                                    <p className="text-xs text-emerald-100 font-medium">{t('publicChecklist.actionPlan.subtitle')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsActionPlanModalOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {publishedActionPlans.map((plan: { id: string; title: string; description: string; summary?: string; createdAt?: string }) => (
                                <div key={plan.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <h3 className="font-black text-lg text-slate-900 mb-2">{plan.title}</h3>
                                    {plan.summary && (
                                        <p className="text-sm text-emerald-600 font-medium italic mb-3">&ldquo;{plan.summary}&rdquo;</p>
                                    )}
                                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {plan.description}
                                    </div>
                                    {plan.createdAt && (
                                        <p className="text-[10px] text-slate-400 mt-4 font-medium">
                                            {t('publicChecklist.actionPlan.generatedAt', { date: new Date(plan.createdAt).toLocaleDateString() })}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex-shrink-0">
                            <button
                                onClick={() => setIsActionPlanModalOpen(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                {t('publicChecklist.actionPlan.understood')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Sidebar */}
            <aside className={`
            fixed inset-0 z-40 md:relative md:flex md:w-[380px] md:flex-shrink-0 bg-slate-900 transition-transform duration-500 ease-out h-screen
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
                <div className="flex flex-col h-full w-full p-8 overflow-hidden">
                    <div className="hidden md:flex items-center gap-4 mb-16 px-2">
                        <Image src="/MX_logo_formC_Green.png" alt="Maxsum" width={56} height={56} className="rounded-2xl shadow-2xl shadow-emerald-500/40 brightness-0 invert" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-white font-black text-sm uppercase tracking-[0.25em] leading-tight">{checklist.template.name}</h1>
                                {typeLabel && (
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1",
                                        checklist.type === 'CORRECTION' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    )}>
                                        {checklist.type === 'CORRECTION' ? <XCircle size={8} /> : <ClipboardList size={8} />}
                                        {typeLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 opacity-90">{t('publicChecklist.title')}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-12 pr-2 scrollbar-hidden pb-4">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {computedSections.map((section: any, sIdx: number) => (
                            <div key={section.id} className="animate-fade-in group/section" style={{ animationDelay: `${sIdx * 0.1}s` }}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-[2px] w-8 bg-emerald-500/30 rounded-full" />
                                    <h3 className="text-slate-100 text-[11px] font-black uppercase tracking-[0.35em] whitespace-nowrap">
                                        {section.name}
                                    </h3>
                                    <div className="h-[1px] flex-1 bg-white/5" />
                                </div>
                                <div className="space-y-3">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {section.items.map((item: any) => {
                                        const globalIdx = allItems.findIndex(ai => ai.id === item.id);
                                        const isActive = currentStep === globalIdx;
                                        const response = responses[item.id];
                                        const isRejected = response?.status === 'REJECTED';
                                        // savedItems already excludes MISSING and REJECTED status items
                                        const isCompleted = savedItems.has(item.id);

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { if (isSaving) return; setCurrentStep(globalIdx); setIsSidebarOpen(false); }}
                                                className={`
                                                w-full flex items-center gap-4 p-4 rounded-2xl transition-all group text-left
                                                ${isActive ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20 scale-[1.02]' : 'hover:bg-white/5 text-slate-400'}
                                            `}
                                            >
                                                <div className={`
                                                w-9 h-9 rounded-xl flex items-center justify-center transition-all border
                                                ${isActive ? 'bg-white/20 border-white/30' : isRejected ? 'bg-red-500/10 text-red-400 border-red-500/20' : isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/80 text-slate-400 border-white/5 group-hover:border-white/10'}
                                            `}>
                                                    {isRejected ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    ) : isCompleted ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    ) : <span className="text-[11px] font-black">{globalIdx + 1}</span>}
                                                </div>
                                                <span className={`text-[12px] font-bold uppercase tracking-wider truncate transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                    {item.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('publicChecklist.progress')}</span>
                            <span className="text-[11px] font-black text-emerald-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium text-center mt-4">Powered by Merx</p>
                    </div>
                </div>
                <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
            </aside>

            {/* Workspace Area */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative scrollbar-hidden">
                {/* Top Bar for Desktop - Breadcrumbs/Header */}
                <header className="hidden md:flex items-center justify-between px-10 py-8 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20">
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span className="hover:text-emerald-500 transition-colors cursor-default">{checklist.template.name}</span>
                        <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-slate-900">{currentItem?.name || t('publicChecklist.end')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/10 px-4 py-2 rounded-full uppercase tracking-[0.1em]">
                            {t('publicChecklist.step')} {currentStep + 1} {t('publicChecklist.of')} {allItems.length}
                        </span>
                    </div>
                </header>

                <div className="flex flex-col p-4 md:p-8 max-w-4xl mx-auto pb-32 md:pb-28">
                    <div className="flex-1 bg-white rounded-[2rem] p-6 md:p-12 shadow-xl shadow-slate-100 border border-slate-100">
                        {currentItem ? (
                            <div className="space-y-8">
                                <ChecklistItem
                                    item={{
                                        ...currentItem,
                                        answer: responses[currentItem.id]?.answer,
                                        quantity: responses[currentItem.id]?.quantity,
                                        observationValue: responses[currentItem.id]?.observationValue,
                                        fileUrl: responses[currentItem.id]?.fileUrl
                                    }}
                                    onUpdate={handleUpdateItem}
                                    producerIdentifier={checklist.producer?.name}
                                    producerMaps={checklist.producer?.maps}
                                    readOnly={isReadOnly || responses[currentItem.id]?.status === 'APPROVED'}
                                    countryCode={checklist.producer?.countryCode || 'BR'}
                                    uploadContext={{
                                        workspaceId: checklist.workspaceId,
                                        subworkspaceId: checklist.subworkspaceId,
                                        checklistId: checklist.id,
                                    }}
                                    onAiValidationResult={(result) => setAiValidationResult(result)}
                                    onUploadingChange={setIsFileUploading}
                                />

                                {/* AI Document Validation Feedback */}
                                {aiValidationResult && !aiValidationResult.valid && (
                                    <div className={`rounded-2xl p-5 flex flex-col gap-2 animate-slide-up ${
                                        aiValidationResult.mode === 'block'
                                            ? 'bg-red-50 border border-red-200'
                                            : 'bg-amber-50 border border-amber-200'
                                    }`}>
                                        <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-xs ${
                                            aiValidationResult.mode === 'block' ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {aiValidationResult.mode === 'block'
                                                ? (t('publicChecklist.aiValidation.blocked') || 'Documento não aprovado pela validação')
                                                : (t('publicChecklist.aiValidation.warning') || 'Aviso sobre o documento')}
                                        </div>
                                        <p className={`text-sm font-medium ${
                                            aiValidationResult.mode === 'block' ? 'text-red-800' : 'text-amber-800'
                                        }`}>
                                            {aiValidationResult.message}
                                        </p>
                                        {!aiValidationResult.legible && (
                                            <p className="text-xs text-slate-500">{t('publicChecklist.aiValidation.notLegible') || 'O documento pode não estar legível.'}</p>
                                        )}
                                        {!aiValidationResult.correctType && (
                                            <p className="text-xs text-slate-500">{t('publicChecklist.aiValidation.wrongType') || 'O documento pode não ser do tipo esperado.'}</p>
                                        )}
                                        {aiValidationResult.mode === 'block' && (
                                            <p className="text-xs text-red-600 font-bold mt-1">{t('publicChecklist.aiValidation.mustReupload') || 'Faça o upload novamente com um documento válido para continuar.'}</p>
                                        )}
                                        <button
                                            onClick={() => setAiValidationResult(null)}
                                            className="self-end text-xs text-slate-400 hover:text-slate-600 mt-1"
                                        >
                                            {t('common.dismiss') || 'Dispensar'}
                                        </button>
                                    </div>
                                )}

                                {/* Approval Notice */}
                                {responses[currentItem.id]?.status === 'APPROVED' && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col gap-3 animate-slide-up">
                                        <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-wider text-xs">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {t('publicChecklist.approved')}
                                        </div>
                                        <p className="text-emerald-900 font-medium">
                                            Este item já foi verificado e aprovado pelo auditor. Não pode mais ser editado.
                                        </p>
                                    </div>
                                )}

                                {/* Rejection Notice */}
                                {responses[currentItem.id]?.status === 'REJECTED' && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col gap-3 animate-slide-up">
                                        <div className="flex items-center gap-3 text-red-600 font-bold uppercase tracking-wider text-xs">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {t('publicChecklist.rejected')}
                                        </div>
                                        <p className="text-red-900 font-medium">
                                            {responses[currentItem.id]?.rejectionReason || "Motivo não especificado pelo auditor."}
                                        </p>
                                        <p className="text-red-600/70 text-xs">
                                            Por favor, corrija as informações acima e salve novamente para nova análise.
                                        </p>
                                    </div>
                                )}

                                {/* Action Plans Section - Only show published plans, now as reminder */}
                                {publishedActionPlans.length > 0 && responses[currentItem.id]?.status === 'REJECTED' && (
                                    <div className="space-y-4 pt-6 border-t border-slate-50">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                            <Sparkles size={12} className="text-emerald-500" />
                                            {t('publicChecklist.actionPlan.availableGuidelines')}
                                        </h3>
                                        <button
                                            onClick={() => setIsActionPlanModalOpen(true)}
                                            className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Sparkles size={16} />
                                            Ver Plano de Ação com orientações
                                        </button>
                                    </div>
                                )}

                                {/* Main Action Button - Save */}
                                <div className="pt-8 border-t border-slate-50">
                                    {responses[currentItem.id]?.status !== 'APPROVED' ? (
                                        <button
                                            onClick={handleManualSave}
                                            disabled={isSaving || isFileUploading || (aiValidationResult?.mode === 'block' && !aiValidationResult?.valid)}
                                            className={`
                                            w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-3
                                            ${saveStatus === 'success'
                                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                    : saveStatus === 'error'
                                                        ? 'bg-red-500 text-white shadow-red-200'
                                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.99]'}
                                            ${(isSaving || isFileUploading) ? 'cursor-not-allowed' : ''}
                                        `}
                                        >
                                            {isFileUploading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {t('publicChecklist.uploading') || 'Enviando arquivo...'}
                                                </>
                                            ) : saveStatus === 'saving' ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {t('publicChecklist.saving')}
                                                </>
                                            ) : saveStatus === 'success' ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {t('publicChecklist.saved')}
                                                </>
                                            ) : saveStatus === 'error' ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {t('publicChecklist.saveError') || 'Erro ao salvar - tente novamente'}
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path d="M12 19V5M5 12l7-7 7 7" transform="rotate(180 12 12)" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {t('publicChecklist.saveResponse')}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="text-center py-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">
                                                {t('publicChecklist.lockedAfterApproval')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-100">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{t('publicChecklist.readyToSubmit')}</h1>
                                <p className="text-slate-500 font-medium max-w-sm mb-12">{t('publicChecklist.readyToSubmitDescription')}</p>

                                <button
                                    onClick={handleFinish}
                                    className="w-full max-w-md bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest animate-pulse"
                                >
                                    Finalizar e Enviar Checklist
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Saving overlay */}
                {isSaving && (
                    <div className="fixed inset-0 md:left-[380px] bg-white/60 backdrop-blur-[2px] z-30 flex items-center justify-center pointer-events-auto transition-opacity">
                        <div className="flex flex-col items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{t('publicChecklist.saving')}</span>
                        </div>
                    </div>
                )}

                {/* Sticky Bottom Navigation Footer */}
                {currentItem && (
                    <div className="fixed bottom-0 left-0 md:left-[380px] right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 p-4 md:px-8 z-40 flex items-center justify-between gap-2 shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.08)]">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 0 || isSaving}
                            className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 md:px-8 py-4 md:py-5 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-2 border border-slate-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="hidden md:inline">{t('publicChecklist.previousStep')}</span>
                        </button>

                        {/* Action Plan Button - Only show when plans exist */}
                        {publishedActionPlans.length > 0 && (
                            <button
                                onClick={() => setIsActionPlanModalOpen(true)}
                                className="relative bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 md:px-6 py-4 md:py-5 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                            >
                                <Sparkles size={16} />
                                <span className="hidden md:inline">Ver Plano de Ação</span>
                                <span className="md:hidden">Plano</span>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-white">
                                    {publishedActionPlans.length}
                                </span>
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={isSaving || isFileUploading}
                            className={`bg-slate-900 text-white hover:bg-slate-800 px-4 md:px-10 py-4 md:py-5 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${!responses[currentItem.id]?.answer ? 'opacity-90' : ''}`}
                        >
                            <span className="hidden md:inline">{t('publicChecklist.nextStep')}</span>
                            <span className="md:hidden">{t('publicChecklist.next')}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                )}
            </main>
        </div >
    );
}
