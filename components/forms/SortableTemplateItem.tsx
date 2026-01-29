'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, X, ChevronDown, Sparkles, GripVertical } from 'lucide-react';
import Checkbox from '@/components/ui/Checkbox';

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

interface SortableTemplateItemProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any;
    sectionId: string;
    readOnly: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (sectionId: string, itemId: string, updates: any) => void;
    onRemove: (sectionId: string, itemId: string) => void;
}

export function SortableTemplateItem({ item, sectionId, readOnly, onUpdate, onRemove }: SortableTemplateItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-slate-50/30 rounded-3xl p-6 border border-slate-50 group hover:border-primary/20 transition-all"
        >
            <div className="flex items-start gap-4">
                {/* Drag Handle */}
                {!readOnly && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors touch-none"
                    >
                        <GripVertical size={20} />
                    </div>
                )}

                <div className="flex-1 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            disabled={readOnly}
                            placeholder="Pergunta ou Título do Item..."
                            className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                            value={item.name}
                            onChange={e => onUpdate(sectionId, item.id, { name: e.target.value })}
                        />
                        <select
                            disabled={readOnly}
                            className="md:w-64 p-4 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                            value={item.type}
                            onChange={e => onUpdate(sectionId, item.id, { type: e.target.value })}
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
                                onChange={val => !readOnly && onUpdate(sectionId, item.id, { required: val })}
                                label="OBRIGATÓRIO"
                            />
                            {item.type === 'SINGLE_CHOICE' && (
                                <Checkbox
                                    checked={item.requestArtifact}
                                    onChange={val => !readOnly && onUpdate(sectionId, item.id, { requestArtifact: val })}
                                    label="SOLICITAR ANEXO"
                                />
                            )}
                            <Checkbox
                                checked={item.observationEnabled}
                                onChange={val => !readOnly && onUpdate(sectionId, item.id, { observationEnabled: val })}
                                label="CAMPO OBSERVAÇÃO"
                            />
                            <Checkbox
                                checked={item.validityControl}
                                onChange={val => !readOnly && onUpdate(sectionId, item.id, { validityControl: val })}
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
                                                onUpdate(sectionId, item.id, { options: [...currentOptions, 'Nova Opção'] });
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
                                                    onUpdate(sectionId, item.id, { options: newOptions });
                                                }}
                                                className="flex-1 p-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                            />
                                            {!readOnly && (
                                                <button
                                                    onClick={() => {
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        const newOptions = item.options.filter((_: any, idx: number) => idx !== optIdx);
                                                        onUpdate(sectionId, item.id, { options: newOptions });
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
                                            onChange={() => onUpdate(sectionId, item.id, { databaseSource: null })}
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
                                            onChange={() => onUpdate(sectionId, item.id, { databaseSource: 'fertilizers_soil' })}
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
                                                onChange={e => onUpdate(sectionId, item.id, { databaseSource: e.target.value })}
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
                                    onChange={val => !readOnly && onUpdate(sectionId, item.id, { askForQuantity: val })}
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
                        onClick={() => onRemove(sectionId, item.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 mt-2"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
