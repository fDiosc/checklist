'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Clock, XCircle, Search, Sparkles, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useTranslations, useFormatter } from 'next-intl';

// Action Plan Card Component with expandable text
function ActionPlanCard({
    plan,
    isPublishing,
    onPublish,
    t,
    format
}: {
    plan: { id: string; title: string; description: string; summary?: string; isPublished: boolean; createdAt?: string };
    isPublishing: boolean;
    onPublish: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format: any;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Format the description preserving line breaks
    const formattedDescription = plan.description || '';
    const hasLongText = formattedDescription.length > 200;
    const displayText = isExpanded ? formattedDescription : formattedDescription.substring(0, 200) + (hasLongText ? '...' : '');

    return (
        <div className="bg-white rounded-xl border border-indigo-100/50 shadow-sm">
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm">{plan.title}</h4>
                        {plan.createdAt && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                <Calendar size={10} />
                                {format.dateTime(new Date(plan.createdAt), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {plan.isPublished ? (
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full whitespace-nowrap">
                                {t('actionPlan.published')} ✓
                            </span>
                        ) : (
                            <button
                                onClick={onPublish}
                                disabled={isPublishing}
                                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                {isPublishing ? t('common.loading') : t('actionPlan.publish')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Description with expand/collapse */}
            <div className="px-4 pb-3">
                {plan.summary && (
                    <p className="text-xs text-indigo-600 font-medium mb-2 italic">&ldquo;{plan.summary}&rdquo;</p>
                )}
                <div
                    className={cn(
                        "text-xs text-slate-600 whitespace-pre-wrap transition-all duration-200",
                        isExpanded ? "max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200" : "overflow-hidden"
                    )}
                >
                    {displayText}
                </div>
                {hasLongText && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} />
                                {t('common.close')}
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} />
                                {t('common.view')}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { STATUS_TRANSLATION_KEYS, type ChecklistStatus } from '@/lib/utils/status';
import ChecklistItemDetail from './checklist-item-detail';
import AuditActionPanel from './audit-action-panel';
import PartialFinalizeModal from '@/components/modals/PartialFinalizeModal';
import ChildChecklistsAccordion from '@/components/checklists/ChildChecklistsAccordion';

interface ChecklistManagementClientProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checklist: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    producerMaps?: any[];
}

import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ChecklistManagementClient({ checklist, producerMaps }: ChecklistManagementClientProps) {
    const router = useRouter();
    const t = useTranslations();
    const format = useFormatter();
    // Local state for responses to allow optimistic updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [responses, setResponses] = useState<any[]>(checklist.responses?.map((r: any) => ({
        ...r,
        aiSuggestion: r.aiFlag ? {
            status: r.aiFlag,
            reason: r.aiMessage,
            confidence: r.aiConfidence
        } : null
    })) || []);

    // Check if this is a child checklist (has parentId)
    const isChildChecklist = !!checklist.parentId;
    // Build a set of itemIds that have responses (for child checklist filtering)
    const responseItemIds = new Set(responses.map((r: { itemId: string }) => r.itemId));

    // Extract unique field IDs from responses to rebuild computed sections
    const selectedFieldIds = Array.from(new Set(
        responses
            .filter(r => r.fieldId && r.fieldId !== '__global__')
            .map(r => r.fieldId)
    )) as string[];

    // Action Plans state - show this checklist's action plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [actionPlans, setActionPlans] = useState<any[]>(
        checklist.actionPlans || []
    );
    const [isPublishing, setIsPublishing] = useState<string | null>(null);

    const handlePublishActionPlan = async (planId: string) => {
        setIsPublishing(planId);
        try {
            const res = await fetch(`/api/action-plans/${planId}/publish`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to publish');
            setActionPlans(prev => prev.map(p => p.id === planId ? { ...p, isPublished: true } : p));
            alert(t('common.success'));
        } catch (error) {
            console.error(error);
            alert(t('errors.genericError'));
        } finally {
            setIsPublishing(null);
        }
    };

    // Replicate computedSections logic for Auditor view
    const computedSections = (() => {
        const sections = checklist.template.sections;

        // If no field-specific sections AND not a child checklist, return as-is
        if (selectedFieldIds.length === 0 && !isChildChecklist) {
            return sections;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSections: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sections.forEach((section: any) => {
            if (section.iterateOverFields && selectedFieldIds.length > 0) {
                selectedFieldIds.forEach((fieldId: string) => {
                    // Try to find field name in producer maps
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const allFields = checklist.producer?.maps?.flatMap((m: any) => m.fields || []) || [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const field = allFields.find((f: any) => f.id === fieldId);
                    const fieldName = field?.name || `${t('common.field')} ${fieldId}`;

                    const filteredItems = section.items
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .filter((item: any) => !isChildChecklist || responseItemIds.has(item.id))
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((item: any) => ({
                            ...item,
                            id: `${item.id}::${fieldId}`,
                            originalId: item.id
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
                // For non-iterating sections, filter items for child checklists
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
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedItem, setSelectedItem] = useState<{ item: any, response: any } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [isFinalizingParcial, setIsFinalizingParcial] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isInternalFilling, setIsInternalFilling] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInternalFill = async (data: any) => {
        if (!selectedItem) return;
        const { item } = selectedItem;

        // Parse ID and FieldID if composite
        const realItemId = item.originalId || item.id;
        const fieldId = item.id.includes('::') ? item.id.split('::')[1] : null;

        try {
            const res = await fetch(`/api/checklists/${checklist.id}/responses/${realItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, isInternal: true, fieldId })
            });

            if (!res.ok) throw new Error('Failed to save internal fill');
            const savedResponse = await res.json();

            // Update local state
            setResponses(prev => {
                // Must match both itemId and fieldId
                const idx = prev.findIndex(r => r.itemId === realItemId && r.fieldId === (fieldId || "__global__"));
                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = savedResponse;
                    return updated;
                }
                // Determine snapshot behavior: if response didn't exist, we add it
                return [...prev, savedResponse];
            });

            setSelectedItem(prev => prev ? ({ ...prev, response: savedResponse }) : null);
            setIsInternalFilling(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert(t('errors.genericError'));
        }
    };

    const handleAnalyzeCurrentItem = async () => {
        if (!selectedItem) return;

        setIsAnalyzing(true);
        const item = selectedItem.item;
        const response = selectedItem.response;

        if (!response || !response.answer) {
            alert(t('checklistManagement.noResponseToAnalyze'));
            setIsAnalyzing(false);
            return;
        }

        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checklistId: checklist.id,
                    itemId: item.id,
                    itemName: item.name,
                    itemDescription: item.description,
                    userAnswer: response.answer,
                    userObservation: response.observation
                })
            });
            const analysis = await res.json();

            if (analysis.error) throw new Error(analysis.error);

            // Update State
            setResponses(prev => {
                const idx = prev.findIndex(r => r.itemId === item.id);
                // If response didn't exist in array (unlikely for currentItem flow), handle graceful?
                // Actually selectedItem.response ensures it exists in our view model logic usually, 
                // but local 'responses' state is the source of truth.
                const updated = [...prev];
                if (idx !== -1) {
                    updated[idx] = {
                        ...updated[idx],
                        aiSuggestion: {
                            status: analysis.status,
                            reason: analysis.reason,
                            confidence: analysis.confidence
                        }
                    };
                }
                return updated;
            });

            // Update Selected Item View
            setSelectedItem(prev => prev ? ({
                ...prev,
                response: {
                    ...prev.response,
                    aiSuggestion: {
                        status: analysis.status,
                        reason: analysis.reason,
                        confidence: analysis.confidence
                    }
                }
            }) : null);

        } catch (e) {
            console.error("Analysis failed", e);
            alert(t('checklistManagement.aiAnalysisFailed'));
        }
        setIsAnalyzing(false);
    };

    const updateResponseStatus = async (itemId: string, status: string, reason: string | null = null, fieldId: string | null = null) => {
        // Optimistic Update Snapshot
        const snapshotResponses = [...responses];

        // Apply Optimistic Update
        setResponses(prev => {
            const existingIdx = prev.findIndex(r => r.itemId === itemId && r.fieldId === (fieldId || "__global__"));
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    status,
                    rejectionReason: reason
                };
                return updated;
            } else {
                return [...prev, { itemId, checklistId: checklist.id, status, rejectionReason: reason, fieldId: fieldId || "__global__" }];
            }
        });

        // Update selected item view
        if (selectedItem?.item.id === (fieldId ? `${itemId}::${fieldId}` : itemId)) {
            setSelectedItem(prev => prev ? ({
                ...prev,
                response: { ...prev.response, status, rejectionReason: reason }
            }) : null);
        }

        // API Call
        try {
            const res = await fetch(`/api/checklists/${checklist.id}/responses/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejectionReason: reason, fieldId })
            });

            if (!res.ok) throw new Error('Failed to save');
            router.refresh(); // Sync server state in background
        } catch (error) {
            console.error(error);
            alert(t('errors.genericError'));
            setResponses(snapshotResponses); // Revert
        }
    };

    const handleFinalize = async () => {
        const hasRejectedItems = responses.some(r => r.status === 'REJECTED');

        const message = hasRejectedItems
            ? t('checklistManagement.confirmFinalizeWithRejected')
            : t('checklistManagement.confirmFinalize');

        if (!confirm(message)) return;

        try {
            const res = await fetch(`/api/checklists/${checklist.id}/finalize`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            alert(t('checklistManagement.finalizeSuccess'));
            router.refresh();
        } catch (error) {
            console.error(error);
            alert(t('errors.genericError'));
        }
    };

    const handlePartialFinalize = async (options: {
        createCorrection: boolean;
        createCompletion: boolean;
        generateActionPlan: boolean
    }) => {
        setIsFinalizingParcial(true);
        try {
            const res = await fetch(`/api/checklists/${checklist.id}/partial-finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });

            if (!res.ok) throw new Error('Failed to partially finalize');

            const result = await res.json();

            // Generate action plans for EACH child checklist created (not the parent)
            if (options.generateActionPlan && result.childIds?.length > 0) {
                for (const childId of result.childIds) {
                    try {
                        await fetch('/api/ai/generate-action-plan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ checklistId: childId })
                        });
                    } catch (error) {
                        console.error(`Failed to generate action plan for child ${childId}:`, error);
                    }
                }
            }

            alert(t('checklistManagement.partialFinalizeSuccess'));
            setIsPartialModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert(t('errors.genericError'));
        } finally {
            setIsFinalizingParcial(false);
        }
    };

    // Process data to group by section and handle sections that iterate over fields (if any)
    // For now, simple view
    // const sections = checklist.template.sections;

    return (
        <div className="flex flex-col h-auto lg:h-[calc(100vh-2rem)] gap-4 lg:gap-6 animate-fade-in" suppressHydrationWarning>
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 lg:pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/checklists"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {checklist.template.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm font-medium text-slate-500">
                                {checklist.producer?.name || 'Produtor não identificado'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {t(STATUS_TRANSLATION_KEYS[checklist.status as ChecklistStatus] || checklist.status)}
                            </span>
                            {checklist.parentId && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <Link
                                        href={`/dashboard/checklists/${checklist.parentId}`}
                                        className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"
                                    >
                                        <AlertCircle size={10} />
                                        Filho de: {checklist.parent?.template?.name || 'Checklist Anterior'}
                                    </Link>
                                </>
                            )}
                            {/* Child checklists badge count (for non-continuous, show simple badge) */}
                            {checklist.children?.length > 0 && !checklist.template.isContinuous && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                        {checklist.children.length} {t('checklistManagement.derivedCount')}
                                    </span>
                                </>
                            )}
                            {/* EME Badge */}
                            {checklist.producer?.maps?.[0]?.emeCode && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                        {checklist.producer.maps[0].emeCode}
                                    </span>
                                </>
                            )}
                            {/* Rural Region Badge */}
                            {checklist.producer?.maps?.[0]?.ruralRegionCode && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                                        RR {checklist.producer.maps[0].ruralRegionCode}
                                    </span>
                                </>
                            )}
                        </div>
                        {/* Response Statistics */}
                        {(() => {
                            const approved = checklist.responses?.filter((r: { status: string }) => r.status === 'APPROVED').length || 0;
                            const rejected = checklist.responses?.filter((r: { status: string }) => r.status === 'REJECTED').length || 0;
                            // Total items from all sections in template
                            const totalItems = checklist.template.sections?.reduce((acc: number, s: { items?: unknown[] }) => acc + (s.items?.length || 0), 0) || 0;
                            const pending = totalItems - approved - rejected;
                            const completionPercent = totalItems > 0 ? Math.round((approved / totalItems) * 100) : 0;

                            return totalItems > 0 ? (
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    completionPercent === 100
                                                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                                        : "bg-gradient-to-r from-blue-400 to-blue-500"
                                                )}
                                                style={{ width: `${completionPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">
                                            {completionPercent}%
                                        </span>
                                    </div>
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        ✓ {approved} {t('checklistManagement.approved')}
                                    </span>
                                    {rejected > 0 && (
                                        <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                                            ✗ {rejected} {t('checklistManagement.rejected')}
                                        </span>
                                    )}
                                    {pending > 0 && (
                                        <span className="text-xs text-slate-400 font-medium">
                                            ⏳ {pending} {t('checklistManagement.pending')}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                        ({totalItems} {t('checklistManagement.items')})
                                    </span>
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleAnalyzeCurrentItem}
                        // Disable if analyzing OR no item selected OR item has no answer
                        disabled={isAnalyzing || !selectedItem || !selectedItem.response?.answer}
                        className={cn(
                            "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 text-sm transition-all flex items-center gap-2",
                            (!selectedItem || !selectedItem.response?.answer) && "disabled:bg-indigo-600 disabled:shadow-none disabled:opacity-50"
                        )}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('checklistManagement.analyzing')}
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                {t('checklistManagement.analyzeWithAI')}
                            </>
                        )}
                    </button>
                    {checklist.template.isContinuous && (
                        <button
                            onClick={() => setIsPartialModalOpen(true)}
                            disabled={checklist.status === 'FINALIZED'}
                            className={cn(
                                "px-5 py-2.5 font-bold rounded-xl shadow-lg text-sm transition-all",
                                checklist.status === 'FINALIZED'
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                            )}
                        >
                            {t('checklistManagement.partialFinalize')}
                        </button>
                    )}
                    <button
                        onClick={handleFinalize}
                        disabled={checklist.status === 'FINALIZED'}
                        className={cn(
                            "px-5 py-2.5 font-bold rounded-xl shadow-lg text-sm transition-all",
                            checklist.status === 'FINALIZED'
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                        )}
                    >
                        {checklist.status === 'FINALIZED' ? t('checklistManagement.checklistFinalized') : t('checklistManagement.finalize')}
                    </button>
                </div>
            </header>

            <PartialFinalizeModal
                isOpen={isPartialModalOpen}
                onClose={() => setIsPartialModalOpen(false)}
                onConfirm={handlePartialFinalize}
                isPending={isFinalizingParcial}
            />

            {/* Child Checklists Accordion (only for isContinuous templates with children) */}
            {checklist.template.isContinuous && checklist.children?.length > 0 && (
                <ChildChecklistsAccordion childChecklists={checklist.children} />
            )}

            {/* Action Plans Management Section */}
            {actionPlans.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-indigo-500" />
                            {t('actionPlan.title')} ({actionPlans.length})
                        </h3>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {actionPlans.map((plan: { id: string; title: string; description: string; summary?: string; isPublished: boolean; createdAt?: string }) => (
                            <ActionPlanCard
                                key={plan.id}
                                plan={plan}
                                isPublishing={isPublishing === plan.id}
                                onPublish={() => handlePublishActionPlan(plan.id)}
                                t={t}
                                format={format}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content (Split View) */}
            <div className="flex flex-1 gap-4 xl:gap-8 overflow-hidden min-h-0">

                {/* Sidebar - Items List */}
                <aside className="w-56 xl:w-72 flex-shrink-0 flex flex-col bg-white rounded-[1.5rem] xl:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={t('common.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {computedSections.map((section: any) => (
                            <div key={section.id}>
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                    {section.name}
                                </h3>
                                <div className="space-y-1">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {section.items.map((item: any) => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const response = responses.find((r: any) =>
                                            r.itemId === (item.originalId || item.id) &&
                                            r.fieldId === (section.fieldId || "__global__")
                                        );
                                        const isSelected = selectedItem?.item.id === item.id;
                                        const hasAnswer = response?.answer && response.answer !== "null" && response.answer !== "";

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem({ item, response })}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                                                    isSelected
                                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                                        : "hover:bg-slate-50 text-slate-600"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected
                                                        ? "bg-white/10"
                                                        : response?.status === 'APPROVED' ? "bg-emerald-50"
                                                            : response?.status === 'REJECTED' ? "bg-red-50"
                                                                : hasAnswer ? "bg-amber-50"
                                                                    : "bg-slate-100"
                                                )}>
                                                    {response?.status === 'APPROVED' ? (
                                                        <CheckCircle size={16} className={isSelected ? "text-emerald-400" : "text-emerald-500"} />
                                                    ) : response?.status === 'REJECTED' ? (
                                                        <XCircle size={16} className={isSelected ? "text-red-400" : "text-red-500"} />
                                                    ) : hasAnswer ? (
                                                        <AlertCircle size={16} className={isSelected ? "text-amber-400" : "text-amber-500"} />
                                                    ) : (
                                                        <Clock size={16} className={isSelected ? "text-slate-400" : "text-slate-400"} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-slate-700")}>
                                                            {item.name}
                                                        </p>
                                                        {response?.isInternal && (
                                                            <span className={cn(
                                                                "shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                                                                isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600 border border-indigo-200"
                                                            )}>
                                                                Interno
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={cn("text-[10px] truncate opacity-70", isSelected ? "text-white" : "text-slate-500")}>
                                                        {hasAnswer ? response.answer : t('checklistManagement.noResponse')}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Area - Item Detail */}
                <main className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden flex relative">
                    {selectedItem ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-slate-200">
                                <ChecklistItemDetail
                                    item={selectedItem.item}
                                    response={selectedItem.response}
                                />
                            </div>

                            <AuditActionPanel
                                status={selectedItem.response?.status || 'MISSING'}
                                rejectionReason={selectedItem.response?.rejectionReason}
                                aiSuggestion={selectedItem.response?.aiSuggestion /* Mock for now */}
                                itemType={selectedItem.item.type}
                                onApprove={() => {
                                    const nextStatus = selectedItem.response?.status === 'APPROVED' ? 'PENDING_VERIFICATION' : 'APPROVED';
                                    const itemId = selectedItem.item.originalId || selectedItem.item.id;
                                    const fieldId = selectedItem.item.id.includes('::') ? selectedItem.item.id.split('::')[1] : null;
                                    updateResponseStatus(itemId, nextStatus, null, fieldId);
                                }}
                                onReject={(reason) => {
                                    const itemId = selectedItem.item.originalId || selectedItem.item.id;
                                    const fieldId = selectedItem.item.id.includes('::') ? selectedItem.item.id.split('::')[1] : null;
                                    updateResponseStatus(itemId, 'REJECTED', reason, fieldId);
                                }}
                                onAcceptAi={() => {
                                    // Mock acceptance logic
                                    const suggestion = selectedItem.response?.aiSuggestion;
                                    if (suggestion) {
                                        updateResponseStatus(selectedItem.item.id, suggestion.status, suggestion.reason);
                                    } else {
                                        alert(t('checklistManagement.noAiSuggestion'));
                                    }
                                }}
                                onInternalFill={(data) => {
                                    handleInternalFill(data);
                                }}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="text-slate-300" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">
                                {t('checklistManagement.selectItem')}
                            </h2>
                            <p className="text-slate-500 max-w-sm">
                                {t('checklistManagement.selectItemDescription')}
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
