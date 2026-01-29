'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, X, ChevronDown, GripVertical } from 'lucide-react';
import Switch from '@/components/ui/Switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
}

interface TemplateSection {
    id: string;
    name: string;
    iterateOverFields: boolean;
    items: TemplateItem[];
}

interface TemplateData {
    id?: string;
    name: string;
    folder: string;
    requiresProducerIdentification: boolean;
    isContinuous: boolean;
    actionPlanPromptId: string | null;
    sections: TemplateSection[];
}

interface TemplateFormProps {
    initialData?: TemplateData;
    mode: 'CREATE' | 'EDIT';
    readOnly?: boolean;
}

export default function TemplateForm({ initialData, mode, readOnly = false }: TemplateFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [template, setTemplate] = useState<TemplateData>(
        initialData || {
            name: '',
            folder: '',
            requiresProducerIdentification: false,
            isContinuous: false,
            actionPlanPromptId: null,
            sections: [
                {
                    id: `section-${crypto.randomUUID()}`,
                    name: 'Nova Seção',
                    iterateOverFields: false,
                    items: []
                }
            ]
        }
    );

    useEffect(() => {
        if (initialData) {
            setTemplate(initialData);
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

    const addSection = () => {
        setTemplate(prev => ({
            ...prev,
            sections: [
                ...prev.sections,
                { id: `section-${crypto.randomUUID()}`, name: 'Nova Seção', iterateOverFields: false, items: [] }
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
                            {mode === 'CREATE' ? 'Criar Template' : 'Editar Template'}
                        </h1>
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">Biblioteca Operacional</p>
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
                            {mode === 'CREATE' ? 'Publicar Biblioteca' : 'Atualizar Template'}
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
                            Configurações Gerais
                        </h3>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Título do Template</label>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder="Ex: Checklist de Sustentabilidade"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                    value={template.name}
                                    onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Pasta / Categoria</label>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder="Ex: Auditoria"
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                    value={template.folder}
                                    onChange={e => setTemplate(prev => ({ ...prev, folder: e.target.value }))}
                                />
                            </div>

                            <div className="pt-4">
                                <Switch
                                    checked={template.requiresProducerIdentification}
                                    onChange={val => !readOnly && setTemplate(prev => ({ ...prev, requiresProducerIdentification: val }))}
                                    label="Exigir Identificação"
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                    Obriga o preenchimento de CPF/Email antes do checklist iniciar.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-50">
                                <Switch
                                    checked={template.isContinuous}
                                    onChange={val => !readOnly && setTemplate(prev => ({ ...prev, isContinuous: val }))}
                                    label="Checklist Contínuo"
                                />
                                <p className="text-[9px] text-slate-400 font-medium mt-3 leading-relaxed">
                                    Permite finalizações parciais e criação de checklists filhos.
                                </p>
                            </div>

                            {template.isContinuous && (
                                <div className="space-y-4 animate-fade-in">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Prompt de Plano de Ação</label>
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
                        </div>

                        {readOnly && (
                            <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                <p className="text-amber-700 text-[10px] font-bold leading-relaxed">
                                    Este template já possui checklists vinculados e não pode ter sua estrutura alterada. Para fazer mudanças, duplique-o.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Editor */}
                <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10 px-1">
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
                                        {/* Drag handle for SECTIONS could be here in future */}
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
                                        <Switch
                                            checked={section.iterateOverFields}
                                            onChange={val => !readOnly && setTemplate(prev => ({
                                                ...prev,
                                                sections: prev.sections.map(s => s.id === section.id ? { ...s, iterateOverFields: val } : s)
                                            }))}
                                            label="Repetir por Talhão"
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
                                            />
                                        ))}
                                    </SortableContext>

                                    {!readOnly && (
                                        <button
                                            onClick={() => addItem(section.id)}
                                            className="w-full py-6 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest group"
                                        >
                                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                            Novo Item
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
                            Adicionar Nova Seção
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
