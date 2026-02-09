'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Clock, XCircle, Search, Sparkles, ChevronDown, ChevronUp, Calendar, ClipboardList, Trophy } from 'lucide-react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';

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
import { Link } from '@/i18n/routing';
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
    readOnly?: boolean;
}

import { useRouter } from '@/i18n/routing';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ChecklistManagementClient({ checklist, producerMaps, readOnly = false }: ChecklistManagementClientProps) {
    const router = useRouter();
    const t = useTranslations();
    const format = useFormatter();
    const locale = useLocale();
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedItem, setSelectedItem] = useState<{ item: any, response: any } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [isFinalizingParcial, setIsFinalizingParcial] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isInternalFilling, setIsInternalFilling] = useState(false);

    // ─── Scope & Level Achievement ───
    const isLevelBased = checklist.template?.isLevelBased ?? false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scopeFields = (checklist.template?.scopeFields || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateLevels = (checklist.template?.levels || []) as any[];
    const targetLevelId = checklist.targetLevelId;
    const levelAccumulative = checklist.template?.levelAccumulative ?? false;
    const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
    const [scopeAnswers, setScopeAnswers] = useState<Record<string, string>>({});
    const [scopeSaving, setScopeSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [levelAchievement, setLevelAchievement] = useState<any>(null);
    const [levelLoading, setLevelLoading] = useState(false);

    // Initialize scope answers from server data
    useEffect(() => {
        if (checklist.scopeAnswers && Array.isArray(checklist.scopeAnswers)) {
            const answers: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            checklist.scopeAnswers.forEach((a: any) => { answers[a.scopeFieldId] = a.value; });
            setScopeAnswers(answers);
        }
    }, [checklist.scopeAnswers]);

    // ─── Level & Condition Filtering Helpers ───
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isItemActiveByConditions = (item: any): boolean => {
        if (!item.conditions || item.conditions.length === 0) return true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const cond of item.conditions) {
            const scopeValue = scopeAnswers[cond.scopeFieldId];
            if (!scopeValue) continue;
            const numVal = parseFloat(scopeValue);
            const condVal = parseFloat(cond.value);
            let match = false;
            switch (cond.operator) {
                case 'EQ': match = scopeValue === cond.value; break;
                case 'NEQ': match = scopeValue !== cond.value; break;
                case 'GT': match = numVal > condVal; break;
                case 'LT': match = numVal < condVal; break;
                case 'GTE': match = numVal >= condVal; break;
                case 'LTE': match = numVal <= condVal; break;
            }
            if (match && cond.action === 'REMOVE') return false;
        }
        return true;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSectionForTargetLevel = (section: any): boolean => {
        if (!isLevelBased || !targetLevelId) return true;
        if (!section.levelId && !section.level) return true; // Global section
        const sectionLevelId = section.levelId || section.level?.id;
        if (!sectionLevelId) return true;
        if (levelAccumulative) {
            const targetLevel = templateLevels.find((l: { id: string }) => l.id === targetLevelId);
            const sectionLevel = templateLevels.find((l: { id: string }) => l.id === sectionLevelId);
            if (!targetLevel || !sectionLevel) return true;
            return sectionLevel.order <= targetLevel.order;
        }
        return sectionLevelId === targetLevelId;
    };

    // Replicate computedSections logic for Auditor view (with level + condition filtering)
    const computedSections = (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sections = checklist.template.sections as any[];

        // 1. Filter by level
        if (isLevelBased) {
            sections = sections.filter(isSectionForTargetLevel);
        }

        // 2. Filter items by scope conditions
        if (isLevelBased) {
            sections = sections
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((section: any) => ({
                    ...section,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: section.items.filter((item: any) => isItemActiveByConditions(item)),
                }))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((section: any) => section.items.length > 0);
        }

        // 3. Handle field iteration and child checklist filtering
        if (selectedFieldIds.length > 0 || isChildChecklist) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newSections: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sections.forEach((section: any) => {
                if (section.iterateOverFields && selectedFieldIds.length > 0) {
                    selectedFieldIds.forEach((fieldId: string) => {
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
                } else if (isChildChecklist) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const filteredItems = section.items.filter((item: any) => responseItemIds.has(item.id));
                    if (filteredItems.length > 0) {
                        newSections.push({ ...section, items: filteredItems });
                    }
                } else {
                    newSections.push(section);
                }
            });
            return newSections;
        }

        return sections;
    })();

    // Fetch level achievement
    const fetchLevelAchievement = useCallback(async () => {
        if (!isLevelBased) return;
        // Only calculate if there are responses
        const hasResponses = responses.some((r: { answer?: string }) => r.answer);
        if (!hasResponses) return;

        setLevelLoading(true);
        try {
            const res = await fetch(`/api/checklists/${checklist.id}/level-achievement`);
            if (res.ok) {
                const data = await res.json();
                setLevelAchievement(data);
            }
        } catch (e) {
            console.error("Failed to fetch level achievement", e);
        } finally {
            setLevelLoading(false);
        }
    }, [isLevelBased, checklist.id, responses]);

    useEffect(() => {
        fetchLevelAchievement();
    }, [fetchLevelAchievement]);

    const handleSaveScopeAnswers = async () => {
        setScopeSaving(true);
        try {
            const answers = Object.entries(scopeAnswers)
                .filter(([, value]) => value !== '')
                .map(([scopeFieldId, value]) => ({ scopeFieldId, value }));

            const res = await fetch(`/api/checklists/${checklist.id}/scope-answers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });

            if (!res.ok) throw new Error('Failed to save');
            alert(t('levelChecklist.scopeSaved'));
            setIsScopeModalOpen(false);
            // Re-calculate level after scope change
            fetchLevelAchievement();
            router.refresh();
        } catch (e) {
            console.error("Failed to save scope answers", e);
            alert(t('levelChecklist.scopeSaveError'));
        } finally {
            setScopeSaving(false);
        }
    };

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
                    itemType: item.type,
                    userAnswer: response.answer,
                    userObservation: response.observation,
                    fileUrl: response.fileUrl || null,
                    quantity: response.quantity || null,
                    fieldId: response.fieldId || '__global__',
                    locale
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
            if (!res.ok) {
                const data = await res.json();
                if (res.status === 400 && data.openChildren) {
                    const childTypes = data.openChildren.map((c: { type: string; status: string }) =>
                        `${c.type === 'CORRECTION' ? t('checklistManagement.correction') : t('checklistManagement.completion')} (${t('status.' + c.status.toLowerCase().replace('_', ''))})`
                    ).join(', ');
                    alert(`${t('checklistManagement.cannotFinalizeOpenChildren') || 'Não é possível finalizar: existem checklists filhos em aberto.'}\n\n${childTypes}`);
                    return;
                }
                throw new Error(data.error || 'Failed');
            }
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
        generateActionPlan: boolean;
        completionTargetLevelId?: string;
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
                                        {t('checklistManagement.childOf')}: {checklist.parent?.template?.name || t('checklistManagement.previousChecklist')}
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
                            {/* Target Level Badge */}
                            {checklist.targetLevel && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                                        {t('levelChecklist.targetLevel')}: {checklist.targetLevel.name}
                                    </span>
                                </>
                            )}
                            {/* Achieved Level Badge (dynamic) */}
                            {isLevelBased && (() => {
                                const hasResponses = responses.some((r: { answer?: string }) => r.answer);
                                if (!hasResponses) return null;

                                if (levelLoading) {
                                    return (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-xs font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                                {t('levelChecklist.calculatingLevel')}
                                            </span>
                                        </>
                                    );
                                }

                                const achieved = levelAchievement?.achievedLevel;
                                return (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className={cn(
                                            "text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                                            achieved
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-amber-50 text-amber-600"
                                        )}>
                                            <Trophy size={10} />
                                            {achieved
                                                ? `${t('levelChecklist.levelAchievedBadge')}: ${achieved.name}`
                                                : t('levelChecklist.noLevelAchieved')
                                            }
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                        {/* Response Statistics */}
                        {(() => {
                            const approved = checklist.responses?.filter((r: { status: string }) => r.status === 'APPROVED').length || 0;
                            const rejected = checklist.responses?.filter((r: { status: string }) => r.status === 'REJECTED').length || 0;
                            // Total items from all sections in template
                            const totalItems = computedSections?.reduce((acc: number, s: { items?: unknown[] }) => acc + (s.items?.length || 0), 0) || 0;
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
                    {/* Scope Button - visible for level-based templates, hidden for child checklists */}
                    {isLevelBased && scopeFields.length > 0 && !checklist.parentId && (
                        <button
                            onClick={() => setIsScopeModalOpen(true)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 text-sm transition-all flex items-center gap-2"
                        >
                            <ClipboardList size={16} />
                            {t('levelChecklist.scopeAnswers')}
                        </button>
                    )}
                    {readOnly ? (
                        <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-bold flex items-center gap-2">
                            <AlertCircle size={16} />
                            {t('common.readOnly') || 'Somente Leitura'}
                        </span>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </header>

            <PartialFinalizeModal
                isOpen={isPartialModalOpen}
                onClose={() => setIsPartialModalOpen(false)}
                onConfirm={handlePartialFinalize}
                isPending={isFinalizingParcial}
                isLevelBased={isLevelBased}
                templateLevels={templateLevels}
                currentTargetLevelId={checklist.targetLevelId}
            />

            {/* Scope Answers Modal */}
            {isScopeModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsScopeModalOpen(false)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-amber-500 text-white p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black">{t('levelChecklist.scopeAnswers')}</h2>
                                    <p className="text-xs text-amber-100 font-medium">{t('levelChecklist.scopeAnswersDescription')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsScopeModalOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            {scopeFields.length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center py-8">{t('levelChecklist.noScopeFields')}</p>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                scopeFields.map((sf: any) => (
                                    <div key={sf.id} className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {sf.name}
                                        </label>
                                        {sf.type === 'NUMBER' && (
                                            <input
                                                type="number"
                                                value={scopeAnswers[sf.id] || ''}
                                                onChange={e => setScopeAnswers(prev => ({ ...prev, [sf.id]: e.target.value }))}
                                                disabled={readOnly}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="0"
                                            />
                                        )}
                                        {sf.type === 'YES_NO' && (
                                            <div className="flex gap-3">
                                                {[
                                                    { value: 'Sim', label: t('levelChecklist.scopeYes') },
                                                    { value: 'Não', label: t('levelChecklist.scopeNo') },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => !readOnly && setScopeAnswers(prev => ({ ...prev, [sf.id]: opt.value }))}
                                                        disabled={readOnly}
                                                        className={cn(
                                                            "flex-1 p-3 rounded-xl border-2 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                            scopeAnswers[sf.id] === opt.value
                                                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {sf.type === 'TEXT' && (
                                            <input
                                                type="text"
                                                value={scopeAnswers[sf.id] || ''}
                                                onChange={e => setScopeAnswers(prev => ({ ...prev, [sf.id]: e.target.value }))}
                                                disabled={readOnly}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        )}
                                        {sf.type === 'SELECT' && (
                                            <select
                                                value={scopeAnswers[sf.id] || ''}
                                                onChange={e => setScopeAnswers(prev => ({ ...prev, [sf.id]: e.target.value }))}
                                                disabled={readOnly}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">{t('levelChecklist.notAnswered')}</option>
                                                {(sf.options || []).map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}
                                        {/* Show current value indicator */}
                                        {!scopeAnswers[sf.id] && (
                                            <p className="text-[10px] text-slate-400 italic">{t('levelChecklist.notAnswered')}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        {!readOnly && scopeFields.length > 0 && (
                            <div className="p-4 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={() => setIsScopeModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleSaveScopeAnswers}
                                    disabled={scopeSaving}
                                    className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {scopeSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {t('common.saving')}
                                        </>
                                    ) : (
                                        t('common.save')
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                        // For FILE items, also check fileUrl as fallback (backward compat)
                                        const hasAnswer = (response?.answer && response.answer !== "null" && response.answer !== "")
                                            || (item.type === 'FILE' && response?.fileUrl);

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
                                itemOptions={selectedItem.item.options || []}
                                databaseSource={selectedItem.item.databaseSource}
                                askForQuantity={selectedItem.item.askForQuantity}
                                observationEnabled={selectedItem.item.observationEnabled}
                                requestArtifact={selectedItem.item.requestArtifact}
                                uploadContext={{
                                    workspaceId: checklist.workspaceId,
                                    subworkspaceId: checklist.subworkspaceId,
                                    checklistId: checklist.id,
                                    itemId: selectedItem.item.originalId || selectedItem.item.id,
                                }}
                                readOnly={readOnly}
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
