'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, X, ChevronDown, GripVertical, Layers, BarChart3, Settings2 } from 'lucide-react';
import Switch from '@/components/ui/Switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTemplateItem } from './SortableTemplateItem';
import TemplateSubworkspaceAssignment from './TemplateSubworkspaceAssignment';

// Level-based types
interface ItemConditionData {
    id?: string;
    scopeFieldIndex: number;
    operator: string;
    value: string;
    action: string;
}

interface TemplateItem {
    id: string;
    name: string;
    type: string;
    required: boolean;
    validityControl: boolean;
    observationEnabled: boolean;
    requestArtifact: boolean;
    askForQuantity: boolean;
    databaseSource: string | null;
    options: string[];
    // Level-based fields
    classificationIndex?: number | null;
    blocksAdvancementToLevelIndex?: number | null;
    allowNA?: boolean;
    responsible?: string | null;
    reference?: string | null;
    conditions?: ItemConditionData[];
}

interface TemplateSection {
    id: string;
    name: string;
    iterateOverFields: boolean;
    levelIndex?: number | null; // null = global
    items: TemplateItem[];
}

interface LevelData {
    id?: string;
    name: string;
    order: number;
}

interface ClassificationData {
    id?: string;
    name: string;
    code: string;
    order: number;
    requiredPercentage: number;
}

interface ScopeFieldData {
    id?: string;
    name: string;
    type: string;
    options: string[];
    order: number;
}

interface TemplateData {
    id?: string;
    name: string;
    folder: string;
    requiresProducerIdentification: boolean;
    isContinuous: boolean;
    actionPlanPromptId: string | null;
    isLevelBased?: boolean;
    levelAccumulative?: boolean;
    levels?: LevelData[];
    classifications?: ClassificationData[];
    scopeFields?: ScopeFieldData[];
    sections: TemplateSection[];
}

// Raw DB types for initialData transformation (DB uses IDs, form uses indices)
interface RawCondition {
    id?: string;
    scopeFieldId?: string;
    scopeFieldIndex?: number;
    operator: string;
    value: string;
    action: string;
}

interface RawItem {
    id: string;
    name: string;
    type: string;
    required: boolean;
    validityControl: boolean;
    observationEnabled: boolean;
    requestArtifact: boolean;
    askForQuantity: boolean;
    databaseSource: string | null;
    options?: string[];
    classificationId?: string;
    classificationIndex?: number | null;
    blocksAdvancementToLevelId?: string;
    blocksAdvancementToLevelIndex?: number | null;
    allowNA?: boolean;
    responsible?: string | null;
    reference?: string | null;
    conditions?: RawCondition[];
}

interface RawSection {
    id: string;
    name: string;
    iterateOverFields?: boolean;
    levelId?: string;
    level?: { id: string };
    levelIndex?: number | null;
    items: RawItem[];
}

interface RawTemplateData {
    id?: string;
    name: string;
    folder: string;
    requiresProducerIdentification: boolean;
    isContinuous: boolean;
    actionPlanPromptId: string | null;
    isLevelBased?: boolean;
    levelAccumulative?: boolean;
    levels?: (LevelData & { id: string })[];
    classifications?: (ClassificationData & { id: string })[];
    scopeFields?: (ScopeFieldData & { id: string })[];
    sections: RawSection[];
}

type EditorTab = 'structure' | 'levels' | 'scope';

interface TemplateFormProps {
    initialData?: TemplateData;
    mode: 'CREATE' | 'EDIT';
    readOnly?: boolean;
}

export default function TemplateForm({ initialData, mode, readOnly = false }: TemplateFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const t = useTranslations();

    const [activeTab, setActiveTab] = useState<EditorTab>('structure');
    const [template, setTemplate] = useState<TemplateData>(
        initialData || {
            name: '',
            folder: '',
            requiresProducerIdentification: false,
            isContinuous: false,
            actionPlanPromptId: null,
            isLevelBased: false,
            levelAccumulative: false,
            levels: [],
            classifications: [],
            scopeFields: [],
            sections: [
                {
                    id: `section-${crypto.randomUUID()}`,
                    name: t('template.form.newSection'),
                    iterateOverFields: false,
                    levelIndex: null,
                    items: []
                }
            ]
        }
    );

    useEffect(() => {
        if (initialData) {
            // Transform DB IDs to index-based references for the form
            const raw = initialData as RawTemplateData;
            const levels: LevelData[] = (raw.levels || []).map((l) => ({ id: l.id, name: l.name, order: l.order }));
            const classifications: ClassificationData[] = (raw.classifications || []).map((c) => ({
                id: c.id, name: c.name, code: c.code, order: c.order, requiredPercentage: c.requiredPercentage,
            }));
            const scopeFields: ScopeFieldData[] = (raw.scopeFields || []).map((sf) => ({
                id: sf.id, name: sf.name, type: sf.type, options: sf.options || [], order: sf.order,
            }));

            // Build lookup maps: DB ID -> array index
            const levelIdToIndex: Record<string, number> = {};
            levels.forEach((l, i) => { if (l.id) levelIdToIndex[l.id] = i; });
            const classIdToIndex: Record<string, number> = {};
            classifications.forEach((c, i) => { if (c.id) classIdToIndex[c.id] = i; });
            const scopeIdToIndex: Record<string, number> = {};
            scopeFields.forEach((sf, i) => { if (sf.id) scopeIdToIndex[sf.id] = i; });

            const sections: TemplateSection[] = (raw.sections || []).map((s: RawSection) => {
                // Convert section.level / section.levelId -> levelIndex
                const sectionLevelId = s.levelId || s.level?.id || null;
                const levelIndex = sectionLevelId ? (levelIdToIndex[sectionLevelId] ?? null) : (s.levelIndex ?? null);

                const items: TemplateItem[] = (s.items || []).map((it: RawItem) => {
                    // Convert classificationId -> classificationIndex
                    const classificationIndex = it.classificationId
                        ? (classIdToIndex[it.classificationId] ?? null)
                        : (it.classificationIndex ?? null);

                    // Convert blocksAdvancementToLevelId -> blocksAdvancementToLevelIndex
                    const blocksAdvancementToLevelIndex = it.blocksAdvancementToLevelId
                        ? (levelIdToIndex[it.blocksAdvancementToLevelId] ?? null)
                        : (it.blocksAdvancementToLevelIndex ?? null);

                    // Convert conditions scopeFieldId -> scopeFieldIndex
                    const conditions: ItemConditionData[] = (it.conditions || []).map((c: RawCondition) => ({
                        id: c.id,
                        scopeFieldIndex: c.scopeFieldId
                            ? (scopeIdToIndex[c.scopeFieldId] ?? c.scopeFieldIndex ?? 0)
                            : (c.scopeFieldIndex ?? 0),
                        operator: c.operator,
                        value: c.value,
                        action: c.action,
                    }));

                    return {
                        id: it.id,
                        name: it.name,
                        type: it.type,
                        required: it.required,
                        validityControl: it.validityControl,
                        observationEnabled: it.observationEnabled,
                        requestArtifact: it.requestArtifact,
                        askForQuantity: it.askForQuantity,
                        databaseSource: it.databaseSource,
                        options: it.options || [],
                        classificationIndex,
                        blocksAdvancementToLevelIndex,
                        allowNA: it.allowNA ?? false,
                        responsible: it.responsible || null,
                        reference: it.reference || null,
                        conditions,
                    };
                });

                return {
                    id: s.id,
                    name: s.name,
                    iterateOverFields: s.iterateOverFields ?? false,
                    levelIndex,
                    items,
                };
            });

            setTemplate({
                id: raw.id,
                name: raw.name,
                folder: raw.folder,
                requiresProducerIdentification: raw.requiresProducerIdentification,
                isContinuous: raw.isContinuous ?? false,
                actionPlanPromptId: raw.actionPlanPromptId || null,
                isLevelBased: raw.isLevelBased ?? false,
                levelAccumulative: raw.levelAccumulative ?? false,
                levels,
                classifications,
                scopeFields,
                sections,
            });
        }
    }, [initialData]);

    const { data: prompts } = useQuery({
        queryKey: ['ai-prompts'],
        queryFn: async () => {
            const res = await fetch('/api/ai/prompts');
            if (!res.ok) throw new Error('Failed to fetch prompts');
            return res.json();
        }
    });

    const mutation = useMutation({
        mutationFn: async (data: TemplateData) => {
            const url = mode === 'EDIT' ? `/api/templates/${data.id}` : '/api/templates';
            const method = mode === 'EDIT' ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to save template');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            router.push('/dashboard/templates');
        }
    });

    // ─── Level management ───
    const addLevel = () => {
        setTemplate(prev => ({
            ...prev,
            levels: [...(prev.levels || []), {
                name: `${t('template.form.levelName')} ${(prev.levels?.length || 0) + 1}`,
                order: (prev.levels?.length || 0),
            }],
        }));
    };

    const removeLevel = (index: number) => {
        const isLinked = template.sections.some(s => s.levelIndex === index);
        if (isLinked) return; // Can't remove if sections use it
        setTemplate(prev => ({
            ...prev,
            levels: (prev.levels || []).filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i })),
            // Adjust section levelIndex references
            sections: prev.sections.map(s => ({
                ...s,
                levelIndex: s.levelIndex != null
                    ? s.levelIndex > index ? s.levelIndex - 1 : s.levelIndex === index ? null : s.levelIndex
                    : null,
            })),
        }));
    };

    const updateLevel = (index: number, updates: Partial<LevelData>) => {
        setTemplate(prev => ({
            ...prev,
            levels: (prev.levels || []).map((l, i) => i === index ? { ...l, ...updates } : l),
        }));
    };

    // ─── Classification management ───
    const addClassification = () => {
        setTemplate(prev => ({
            ...prev,
            classifications: [...(prev.classifications || []), {
                name: '',
                code: '',
                order: (prev.classifications?.length || 0),
                requiredPercentage: 100,
            }],
        }));
    };

    const removeClassification = (index: number) => {
        const isLinked = template.sections.some(s =>
            s.items.some(it => it.classificationIndex === index));
        if (isLinked) return;
        setTemplate(prev => ({
            ...prev,
            classifications: (prev.classifications || []).filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i })),
            // Adjust item classificationIndex references
            sections: prev.sections.map(s => ({
                ...s,
                items: s.items.map(it => ({
                    ...it,
                    classificationIndex: it.classificationIndex != null
                        ? it.classificationIndex > index ? it.classificationIndex - 1
                            : it.classificationIndex === index ? null : it.classificationIndex
                        : null,
                })),
            })),
        }));
    };

    const updateClassification = (index: number, updates: Partial<ClassificationData>) => {
        setTemplate(prev => ({
            ...prev,
            classifications: (prev.classifications || []).map((c, i) => i === index ? { ...c, ...updates } : c),
        }));
    };

    // ─── Scope field management ───
    const addScopeField = () => {
        setTemplate(prev => ({
            ...prev,
            scopeFields: [...(prev.scopeFields || []), {
                name: '',
                type: 'NUMBER',
                options: [],
                order: (prev.scopeFields?.length || 0),
            }],
        }));
    };

    const removeScopeField = (index: number) => {
        // Check if any item conditions reference this scope field
        const isLinked = template.sections.some(s =>
            s.items.some(it => it.conditions?.some(c => c.scopeFieldIndex === index)));
        if (isLinked) return;
        setTemplate(prev => ({
            ...prev,
            scopeFields: (prev.scopeFields || []).filter((_, i) => i !== index).map((sf, i) => ({ ...sf, order: i })),
            // Adjust condition scopeFieldIndex references
            sections: prev.sections.map(s => ({
                ...s,
                items: s.items.map(it => ({
                    ...it,
                    conditions: it.conditions?.map(c => ({
                        ...c,
                        scopeFieldIndex: c.scopeFieldIndex > index ? c.scopeFieldIndex - 1 : c.scopeFieldIndex,
                    })).filter(c => c.scopeFieldIndex !== index),
                })),
            })),
        }));
    };

    const updateScopeField = (index: number, updates: Partial<ScopeFieldData>) => {
        setTemplate(prev => ({
            ...prev,
            scopeFields: (prev.scopeFields || []).map((sf, i) => i === index ? { ...sf, ...updates } : sf),
        }));
    };

    // ─── Conditions map (read-only overview) ───
    const conditionsMap = useMemo(() => {
        const map: { itemName: string; scopeFieldName: string; operator: string; value: string; action: string }[] = [];
        template.sections.forEach(s => {
            s.items.forEach(it => {
                it.conditions?.forEach(c => {
                    const sf = template.scopeFields?.[c.scopeFieldIndex];
                    if (sf) {
                        map.push({
                            itemName: it.name || '(sem nome)',
                            scopeFieldName: sf.name,
                            operator: c.operator,
                            value: c.value,
                            action: c.action,
                        });
                    }
                });
            });
        });
        return map;
    }, [template.sections, template.scopeFields]);

    const addSection = () => {
        setTemplate(prev => ({
            ...prev,
            sections: [
                ...prev.sections,
                { id: `section-${crypto.randomUUID()}`, name: t('template.form.newSection'), iterateOverFields: false, levelIndex: null, items: [] }
            ]
        }));
    };

    const removeSection = (sectionId: string) => {
        setTemplate(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== sectionId)
        }));
    };

    const addItem = (sectionId: string) => {
        setTemplate(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? {
                ...s,
                items: [...s.items, {
                    id: `item-${crypto.randomUUID()}`,
                    name: '',
                    type: 'TEXT',
                    required: true,
                    validityControl: false,
                    observationEnabled: false,
                    requestArtifact: false,
                    askForQuantity: false,
                    databaseSource: null,
                    options: []
                }]
            } : s)
        }));
    };

    const removeItem = (sectionId: string, itemId: string) => {
        setTemplate(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? {
                ...s,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: s.items.filter((i: any) => i.id !== itemId)
            } : s)
        }));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateItem = (sectionId: string, itemId: string, updates: any) => {
        setTemplate(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? {
                ...s,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: s.items.map((i: any) => i.id === itemId ? { ...i, ...updates } : i)
            } : s)
        }));
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setTemplate((prev) => {
                const newSections = prev.sections.map((section) => {
                    const oldIndex = section.items.findIndex((item) => item.id === active.id);
                    const newIndex = section.items.findIndex((item) => item.id === over?.id);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        return {
                            ...section,
                            items: arrayMove(section.items, oldIndex, newIndex),
                        };
                    }
                    return section;
                });

                return {
                    ...prev,
                    sections: newSections,
                };
            });
        }
    };

    const handleSave = () => {
        if (!template.name || !template.folder) {
            alert('Preencha o nome e a pasta do template');
            return;
        }
        mutation.mutate(template);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-none flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                            {mode === 'CREATE' ? t('template.createTemplate') : t('template.editTemplate')}
                        </h1>
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">{t('template.form.library')}</p>
                    </div>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-4">
                        <button
                            className="bg-white text-slate-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all"
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={mutation.isPending}
                            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            {mutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : <Save size={18} />}
                            {mode === 'CREATE' ? t('template.form.publish') : t('template.form.update')}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
                {/* Sidebar Configs */}
                <div className="lg:col-span-4 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10">
                        {/* Sidebar content remains same... */}
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {t('template.form.generalSettings')}
                        </h3>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">{t('template.form.templateName')}</label>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder={t('template.form.templateNamePlaceholder')}
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                    value={template.name}
                                    onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">{t('template.form.folder')}</label>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder={t('template.form.folderPlaceholder')}
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                    value={template.folder}
                                    onChange={e => setTemplate(prev => ({ ...prev, folder: e.target.value }))}
                                />
                            </div>

                            <div className="pt-4">
                                <Switch
                                    checked={template.requiresProducerIdentification}
                                    onChange={val => !readOnly && setTemplate(prev => ({ ...prev, requiresProducerIdentification: val }))}
                                    label={t('template.form.requireIdentification')}
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                    {t('template.form.requireIdentificationDesc')}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-50">
                                <Switch
                                    checked={template.isContinuous}
                                    onChange={val => !readOnly && setTemplate(prev => ({ ...prev, isContinuous: val }))}
                                    label={t('template.form.continuousChecklist')}
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                    {t('template.form.continuousChecklistDesc')}
                                </p>
                            </div>

                            {template.isContinuous && (
                                <div className="space-y-4 animate-fade-in">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">{t('template.form.actionPlanPrompt')}</label>
                                    <div className="relative">
                                        <select
                                            disabled={readOnly}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50 appearance-none cursor-pointer text-sm"
                                            value={template.actionPlanPromptId || ''}
                                            onChange={e => setTemplate(prev => ({ ...prev, actionPlanPromptId: e.target.value || null }))}
                                        >
                                            <option value="">Selecione um prompt...</option>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {prompts?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.slug} - {p.description}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium px-1">
                                        Selecione o prompt que a IA usará para gerar o Plano de Ação.
                                    </p>
                                </div>
                            )}

                            {/* Level-based toggle */}
                            <div className="pt-4 border-t border-slate-50">
                                <Switch
                                    checked={template.isLevelBased ?? false}
                                    onChange={val => !readOnly && setTemplate(prev => ({ ...prev, isLevelBased: val }))}
                                    label={t('template.form.levelBased')}
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                    {t('template.form.levelBasedDesc')}
                                </p>
                            </div>

                            {template.isLevelBased && (
                                <div className="pt-4 border-t border-slate-50 animate-fade-in">
                                    <Switch
                                        checked={template.levelAccumulative ?? false}
                                        onChange={val => !readOnly && setTemplate(prev => ({ ...prev, levelAccumulative: val }))}
                                        label={t('template.form.levelAccumulative')}
                                    />
                                    <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                        {t('template.form.levelAccumulativeDesc')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {readOnly && (
                            <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                <p className="text-amber-700 text-[10px] font-bold leading-relaxed">
                                    Este template já possui checklists vinculados e não pode ter sua estrutura alterada. Para fazer mudanças, duplique-o.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Subworkspace Assignment - Only in EDIT mode */}
                    {mode === 'EDIT' && initialData?.id && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10">
                            <TemplateSubworkspaceAssignment templateId={initialData.id} />
                        </div>
                    )}
                </div>

                {/* Main Editor */}
                <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10 px-1">
                    {/* Tabs - only show when level-based */}
                    {template.isLevelBased && (
                        <div className="flex gap-2 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
                            {([
                                { key: 'structure' as EditorTab, label: t('template.form.tabStructure'), icon: Layers },
                                { key: 'levels' as EditorTab, label: t('template.form.tabLevels'), icon: BarChart3 },
                                { key: 'scope' as EditorTab, label: t('template.form.tabScope'), icon: Settings2 },
                            ]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab.key
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ═══ TAB: Levels & Classifications ═══ */}
                    {template.isLevelBased && activeTab === 'levels' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Levels Panel */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {t('template.form.levelsTitle')}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-medium mb-6">{t('template.form.levelsDescription')}</p>

                                <div className="space-y-3 mb-6">
                                    {(template.levels || []).map((level, idx) => {
                                        const isLinked = template.sections.some(s => s.levelIndex === idx);
                                        return (
                                            <div key={idx} className="flex items-center gap-3 group animate-fade-in">
                                                <GripVertical className="text-slate-200 shrink-0" size={16} />
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    value={level.name}
                                                    onChange={e => updateLevel(idx, { name: e.target.value })}
                                                    className="flex-1 p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-sm disabled:opacity-50"
                                                    placeholder={t('template.form.levelName')}
                                                />
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => removeLevel(idx)}
                                                        disabled={isLinked}
                                                        title={isLinked ? t('template.form.levelInUse') : ''}
                                                        className={`p-1.5 rounded-lg transition-colors ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500'}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(!template.levels || template.levels.length === 0) && (
                                        <p className="text-[10px] text-slate-400 italic py-4 text-center">{t('template.form.noLevels')}</p>
                                    )}
                                </div>

                                {!readOnly && (
                                    <button
                                        onClick={addLevel}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Plus size={14} />
                                        {t('template.form.addLevel')}
                                    </button>
                                )}

                                {(template.levels?.length || 0) > 0 && (
                                    <p className="text-[9px] text-slate-400 font-medium mt-4 text-center">
                                        {t('template.form.levelsSummary', { count: template.levels?.length || 0 })}
                                    </p>
                                )}
                            </div>

                            {/* Classifications Panel */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {t('template.form.classificationsTitle')}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-medium mb-6">{t('template.form.classificationsDescription')}</p>

                                <div className="space-y-4 mb-6">
                                    {(template.classifications || []).map((cls, idx) => {
                                        const isLinked = template.sections.some(s => s.items.some(it => it.classificationIndex === idx));
                                        return (
                                            <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 space-y-3 animate-fade-in">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        value={cls.code}
                                                        onChange={e => updateClassification(idx, { code: e.target.value })}
                                                        className="w-14 p-2 bg-white border border-slate-100 rounded-xl font-black text-center text-slate-900 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-xs uppercase disabled:opacity-50"
                                                        placeholder={t('template.form.classificationCode')}
                                                    />
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        value={cls.name}
                                                        onChange={e => updateClassification(idx, { name: e.target.value })}
                                                        className="flex-1 p-2 bg-white border border-slate-100 rounded-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-sm disabled:opacity-50"
                                                        placeholder={t('template.form.classificationName')}
                                                    />
                                                    {!readOnly && (
                                                        <button
                                                            onClick={() => removeClassification(idx)}
                                                            disabled={isLinked}
                                                            title={isLinked ? t('template.form.classificationInUse') : ''}
                                                            className={`p-1.5 rounded-lg transition-colors ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500'}`}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 px-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('template.form.requiredPercentage')}</label>
                                                    <input
                                                        type="range"
                                                        disabled={readOnly}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        value={cls.requiredPercentage}
                                                        onChange={e => updateClassification(idx, { requiredPercentage: Number(e.target.value) })}
                                                        className="flex-1 accent-primary h-1.5 disabled:opacity-50"
                                                    />
                                                    <span className="text-xs font-black text-slate-600 w-10 text-right">{cls.requiredPercentage}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!template.classifications || template.classifications.length === 0) && (
                                        <p className="text-[10px] text-slate-400 italic py-4 text-center">{t('template.form.noClassifications')}</p>
                                    )}
                                </div>

                                {!readOnly && (
                                    <button
                                        onClick={addClassification}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 hover:text-emerald-500 hover:border-emerald-200 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Plus size={14} />
                                        {t('template.form.addClassification')}
                                    </button>
                                )}

                                <div className="mt-4 text-[9px] text-slate-400 font-medium space-y-1">
                                    <p>{t('template.form.percentageLegend100')}</p>
                                    <p>{t('template.form.percentageLegend0')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: Scope & Conditions ═══ */}
                    {template.isLevelBased && activeTab === 'scope' && (
                        <div className="space-y-8">
                            {/* Scope Fields */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {t('template.form.scopeTitle')}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-medium mb-6">{t('template.form.scopeDescription')}</p>

                                <div className="space-y-3 mb-6">
                                    {(template.scopeFields || []).map((sf, idx) => {
                                        const isLinked = template.sections.some(s =>
                                            s.items.some(it => it.conditions?.some(c => c.scopeFieldIndex === idx)));
                                        return (
                                            <div key={idx} className="flex items-center gap-3 animate-fade-in">
                                                <GripVertical className="text-slate-200 shrink-0" size={16} />
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    value={sf.name}
                                                    onChange={e => updateScopeField(idx, { name: e.target.value })}
                                                    className="flex-1 p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-sm disabled:opacity-50"
                                                    placeholder={t('template.form.scopeFieldName')}
                                                />
                                                <div className="relative">
                                                    <select
                                                        disabled={readOnly}
                                                        value={sf.type}
                                                        onChange={e => updateScopeField(idx, { type: e.target.value })}
                                                        className="p-3 bg-white border border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none pr-8 disabled:opacity-50"
                                                    >
                                                        <option value="NUMBER">{t('template.form.scopeFieldTypeNumber')}</option>
                                                        <option value="YES_NO">{t('template.form.scopeFieldTypeYesNo')}</option>
                                                        <option value="TEXT">{t('template.form.scopeFieldTypeText')}</option>
                                                        <option value="SELECT">{t('template.form.scopeFieldTypeSelect')}</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => removeScopeField(idx)}
                                                        disabled={isLinked}
                                                        className={`p-1.5 rounded-lg transition-colors ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500'}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(!template.scopeFields || template.scopeFields.length === 0) && (
                                        <p className="text-[10px] text-slate-400 italic py-4 text-center">{t('template.form.noScopeFields')}</p>
                                    )}
                                </div>

                                {!readOnly && (
                                    <button
                                        onClick={addScopeField}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 hover:text-amber-500 hover:border-amber-200 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Plus size={14} />
                                        {t('template.form.addScopeField')}
                                    </button>
                                )}
                            </div>

                            {/* Conditions Map (read-only overview) */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                    {t('template.form.conditionsMapTitle')}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-medium mb-6">{t('template.form.conditionsMapDescription')}</p>

                                {conditionsMap.length > 0 ? (
                                    <div className="space-y-2">
                                        {conditionsMap.map((c, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl text-xs">
                                                <span className="font-bold text-slate-700 flex-1 truncate">{c.itemName}</span>
                                                <span className="text-slate-400 shrink-0">
                                                    {c.scopeFieldName} {t(`template.form.operator${c.operator}`)} {c.value}
                                                </span>
                                                <span className={`font-black text-[9px] uppercase px-2 py-0.5 rounded-full ${c.action === 'REMOVE' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                                                    {c.action === 'REMOVE' ? t('template.form.conditionRemove') : t('template.form.conditionOptional')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic py-4 text-center">{t('template.form.conditionsMapEmpty')}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: Structure (default / always for non-level) ═══ */}
                    {(!template.isLevelBased || activeTab === 'structure') && (<>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        {template.sections.map((section, sIdx) => (
                            <div
                                key={section.id}
                                className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden animate-slide-up"
                                style={{ animationDelay: `${sIdx * 0.1}s` }}
                            >
                                {/* Section Header */}
                                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                    <div className="flex items-center gap-6 flex-1">
                                        <GripVertical className="text-slate-200" />
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            value={section.name}
                                            onChange={e => setTemplate(prev => ({
                                                ...prev,
                                                sections: prev.sections.map(s => s.id === section.id ? { ...s, name: e.target.value } : s)
                                            }))}
                                            className="bg-transparent border-none text-xl font-black text-slate-900 outline-none focus:text-primary transition-colors flex-1 disabled:opacity-70"
                                        />
                                    </div>
                                    <div className="flex items-center gap-6">
                                        {/* Level dropdown for section */}
                                        {template.isLevelBased && (template.levels?.length || 0) > 0 && (
                                            <div className="flex items-center gap-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('template.form.sectionLevel')}</label>
                                                <div className="relative">
                                                    <select
                                                        disabled={readOnly}
                                                        value={section.levelIndex ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                                            setTemplate(prev => ({
                                                                ...prev,
                                                                sections: prev.sections.map(s => s.id === section.id ? { ...s, levelIndex: val } : s)
                                                            }));
                                                        }}
                                                        className="p-2 bg-white border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none pr-7 disabled:opacity-50"
                                                    >
                                                        <option value="">{t('template.form.sectionGlobal')}</option>
                                                        {(template.levels || []).map((level, lIdx) => (
                                                            <option key={lIdx} value={lIdx}>{level.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                                                </div>
                                            </div>
                                        )}
                                        <Switch
                                            checked={section.iterateOverFields}
                                            onChange={val => !readOnly && setTemplate(prev => ({
                                                ...prev,
                                                sections: prev.sections.map(s => s.id === section.id ? { ...s, iterateOverFields: val } : s)
                                            }))}
                                            label={t('template.form.repeatByField')}
                                        />
                                        {!readOnly && (
                                            <button
                                                onClick={() => removeSection(section.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Section Items */}
                                <div className="p-8 space-y-6">
                                    <SortableContext
                                        items={section.items}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {section.items.map((item) => (
                                            <SortableTemplateItem
                                                key={item.id}
                                                item={item}
                                                sectionId={section.id}
                                                readOnly={readOnly}
                                                onUpdate={updateItem}
                                                onRemove={removeItem}
                                                isLevelBased={template.isLevelBased ?? false}
                                                levels={template.levels || []}
                                                classifications={template.classifications || []}
                                                scopeFields={template.scopeFields || []}
                                            />
                                        ))}
                                    </SortableContext>

                                    {!readOnly && (
                                        <button
                                            onClick={() => addItem(section.id)}
                                            className="w-full py-6 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest group"
                                        >
                                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                            {t('template.form.newItem')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </DndContext>

                    {!readOnly && (
                        <button
                            onClick={addSection}
                            className="w-full py-8 bg-slate-900 rounded-[3rem] text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-4 group"
                        >
                            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                            {t('template.form.addSection')}
                        </button>
                    )}
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
