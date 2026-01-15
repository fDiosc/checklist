'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, X, Sparkles, ChevronDown, GripVertical } from 'lucide-react';
import Switch from '@/components/ui/Switch';
import Checkbox from '@/components/ui/Checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ITEM_TYPES = [
    { value: 'TEXT', label: 'TEXTO CURTO' },
    { value: 'LONG_TEXT', label: 'TEXTO LONGO' },
    { value: 'FILE', label: 'DOCUMENTO (FOTO/UPLOAD)' },
    { value: 'DATE', label: 'DATA' },
    { value: 'SINGLE_CHOICE', label: 'ÚNICA ESCOLHA (SIM/NÃO)' },
    { value: 'MULTIPLE_CHOICE', label: 'MÚLTIPLA ESCOLHA' },
    { value: 'DROPDOWN_SELECT', label: 'SELEÇÃO (DROPDOWN)' },
    { value: 'PROPERTY_MAP', label: 'DESENHAR MAPA/TALHÃO' },
    { value: 'FIELD_SELECTOR', label: 'SELEÇÃO DE TALHÃO EXISTENTE' },
];

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
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {section.items.map((item: any) => (
                                    <div key={item.id} className="bg-slate-50/30 rounded-3xl p-6 border border-slate-50 group hover:border-primary/20 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-6">
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        placeholder="Pergunta ou Título do Item..."
                                                        className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                                        value={item.name}
                                                        onChange={e => updateItem(section.id, item.id, { name: e.target.value })}
                                                    />
                                                    <select
                                                        disabled={readOnly}
                                                        className="md:w-64 p-4 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                                                        value={item.type}
                                                        onChange={e => updateItem(section.id, item.id, { type: e.target.value })}
                                                    >
                                                        {ITEM_TYPES.map(t => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-6 w-full">
                                                        <Checkbox
                                                            checked={item.required}
                                                            onChange={val => !readOnly && updateItem(section.id, item.id, { required: val })}
                                                            label="OBRIGATÓRIO"
                                                        />
                                                        {item.type === 'SINGLE_CHOICE' && (
                                                            <Checkbox
                                                                checked={item.requestArtifact}
                                                                onChange={val => !readOnly && updateItem(section.id, item.id, { requestArtifact: val })}
                                                                label="SOLICITAR ANEXO"
                                                            />
                                                        )}
                                                        <Checkbox
                                                            checked={item.observationEnabled}
                                                            onChange={val => !readOnly && updateItem(section.id, item.id, { observationEnabled: val })}
                                                            label="CAMPO OBSERVAÇÃO"
                                                        />
                                                        <Checkbox
                                                            checked={item.validityControl}
                                                            onChange={val => !readOnly && updateItem(section.id, item.id, { validityControl: val })}
                                                            label="VALIDADE"
                                                        />
                                                    </div>

                                                    {(item.type === 'SINGLE_CHOICE' || item.type === 'MULTIPLE_CHOICE' || (item.type === 'DROPDOWN_SELECT' && !item.databaseSource)) && (
                                                        <div className="w-full animate-fade-in pt-4">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {item.type === 'DROPDOWN_SELECT' ? 'OPÇÕES DO DROPDOWN' : 'OPÇÕES DE RESPOSTA'}
                                                                </label>
                                                                {!readOnly && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const currentOptions = item.options || [];
                                                                            updateItem(section.id, item.id, { options: [...currentOptions, 'Nova Opção'] });
                                                                        }}
                                                                        className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                                                                    >
                                                                        ADICIONAR OPÇÃO
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="space-y-3">
                                                                {(item.options || []).map((opt: string, optIdx: number) => (
                                                                    <div key={optIdx} className="flex items-center gap-3 animate-fade-in group/opt">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                        <input
                                                                            type="text"
                                                                            disabled={readOnly}
                                                                            value={opt}
                                                                            onChange={e => {
                                                                                const newOptions = [...item.options];
                                                                                newOptions[optIdx] = e.target.value;
                                                                                updateItem(section.id, item.id, { options: newOptions });
                                                                            }}
                                                                            className="flex-1 p-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                                    const newOptions = item.options.filter((_: any, idx: number) => idx !== optIdx);
                                                                                    updateItem(section.id, item.id, { options: newOptions });
                                                                                }}
                                                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/opt:opacity-100"
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {(!item.options || item.options.length === 0) && (
                                                                    <p className="text-[10px] text-slate-400 italic">Nenhuma opção adicionada.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.type === 'DROPDOWN_SELECT' && (
                                                        <div className="w-full space-y-6 pt-4 border-t border-slate-100 mt-4 px-1">
                                                            <div className="flex items-center gap-8">
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!item.databaseSource ? 'border-primary bg-primary' : 'border-slate-200 group-hover:border-primary/30'}`}>
                                                                        {!item.databaseSource && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                    </div>
                                                                    <input
                                                                        type="radio"
                                                                        disabled={readOnly}
                                                                        checked={!item.databaseSource}
                                                                        onChange={() => updateItem(section.id, item.id, { databaseSource: null })}
                                                                        className="hidden"
                                                                    />
                                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Manual</span>
                                                                </label>
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!!item.databaseSource ? 'border-primary bg-primary' : 'border-slate-200 group-hover:border-primary/30'}`}>
                                                                        {!!item.databaseSource && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                    </div>
                                                                    <input
                                                                        type="radio"
                                                                        disabled={readOnly}
                                                                        checked={!!item.databaseSource}
                                                                        onChange={() => updateItem(section.id, item.id, { databaseSource: 'fertilizers_soil' })}
                                                                        className="hidden"
                                                                    />
                                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Banco de Dados</span>
                                                                </label>
                                                            </div>

                                                            {item.databaseSource && (
                                                                <div className="flex flex-col gap-3 animate-fade-in">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fonte de Dados</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            disabled={readOnly}
                                                                            value={item.databaseSource}
                                                                            onChange={e => updateItem(section.id, item.id, { databaseSource: e.target.value })}
                                                                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none appearance-none focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                                                        >
                                                                            <option value="fertilizers_soil">Fertilizante Solo</option>
                                                                            <option value="seed_treatment">Tratamento Sementes</option>
                                                                            <option value="seed_variety">Variedade Semente</option>
                                                                            <option value="desiccation_pre_planting">Dessecação Pré Plantio</option>
                                                                            <option value="pre_emergent_planting">Pré Emergente Plante Aplique</option>
                                                                            <option value="post_emergent_narrow_leaves">Pós Emergente Folhas Estreitas</option>
                                                                            <option value="post_emergent_broad_leaves">Pós Emergente Folhas Largas</option>
                                                                            <option value="insect_control">Controle de Insetos</option>
                                                                            <option value="disease_management">Manejo de Doenças</option>
                                                                            <option value="foliar_nutrition">Nutrição Foliar</option>
                                                                            <option value="desiccation_pre_harvest">Dessecação Pré Colheita</option>
                                                                        </select>
                                                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <Checkbox
                                                                checked={item.askForQuantity}
                                                                onChange={val => !readOnly && updateItem(section.id, item.id, { askForQuantity: val })}
                                                                label="EXIGIR QUANTIDADE"
                                                            />
                                                        </div>
                                                    )}

                                                    {item.type === 'PROPERTY_MAP' && (
                                                        <div className="w-full pt-4 animate-fade-in">
                                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                                                                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                                                                    < Sparkles size={18} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-amber-900 font-bold text-sm">Informação importante</p>
                                                                    <p className="text-amber-700/80 text-xs font-medium mt-1 leading-relaxed">
                                                                        O produtor poderá desenhar a propriedade e talhões no mapa.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    onClick={() => removeItem(section.id, item.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 mt-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

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
