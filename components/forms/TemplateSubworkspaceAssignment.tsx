'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Network, Check, Loader2, Building2, AlertCircle } from 'lucide-react';

interface Subworkspace {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
}

interface AssignmentData {
    template: {
        id: string;
        name: string;
        workspaceId: string;
    };
    parentWorkspace: {
        id: string;
        name: string;
        hasSubworkspaces: boolean;
    };
    availableSubworkspaces: Subworkspace[];
    assignedWorkspaceIds: string[];
}

interface Props {
    templateId: string;
}

export default function TemplateSubworkspaceAssignment({ templateId }: Props) {
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const { data, isLoading, error } = useQuery<AssignmentData>({
        queryKey: ['template-assignments', templateId],
        queryFn: async () => {
            const res = await fetch(`/api/templates/${templateId}/assignments`);
            if (!res.ok) throw new Error('Failed to fetch assignments');
            return res.json();
        },
        enabled: !!templateId,
    });

    // Initialize selected IDs when data loads
    useEffect(() => {
        if (data?.assignedWorkspaceIds) {
            setSelectedIds(data.assignedWorkspaceIds);
            setHasChanges(false);
        }
    }, [data?.assignedWorkspaceIds]);

    const saveMutation = useMutation({
        mutationFn: async (subworkspaceIds: string[]) => {
            const res = await fetch(`/api/templates/${templateId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subworkspaceIds }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['template-assignments', templateId] });
            setHasChanges(false);
        },
    });

    const toggleSubworkspace = (id: string) => {
        setSelectedIds(prev => {
            const newIds = prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id];
            setHasChanges(true);
            return newIds;
        });
    };

    const handleSave = () => {
        saveMutation.mutate(selectedIds);
    };

    const handleSelectAll = () => {
        if (data?.availableSubworkspaces) {
            setSelectedIds(data.availableSubworkspaces.map(sw => sw.id));
            setHasChanges(true);
        }
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
        setHasChanges(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
                <AlertCircle size={18} />
                <span className="text-sm">Erro ao carregar subworkspaces</span>
            </div>
        );
    }

    if (!data?.parentWorkspace.hasSubworkspaces) {
        return (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
                <Network className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="font-bold text-slate-700 mb-2">Subworkspaces não habilitados</h3>
                <p className="text-sm text-slate-500">
                    O workspace pai não possui subworkspaces habilitados.
                    Habilite subworkspaces na página de Workspaces para usar esta funcionalidade.
                </p>
            </div>
        );
    }

    if (data.availableSubworkspaces.length === 0) {
        return (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
                <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="font-bold text-slate-700 mb-2">Nenhum subworkspace criado</h3>
                <p className="text-sm text-slate-500">
                    Crie subworkspaces na página de Workspaces para poder atribuir este template.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <Network size={14} />
                        Atribuir a Subworkspaces
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Selecione os subworkspaces que terão acesso a este template (somente leitura)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        Selecionar todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={handleDeselectAll}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            {/* Subworkspaces list */}
            <div className="space-y-2">
                {data.availableSubworkspaces.map((sw) => (
                    <button
                        key={sw.id}
                        onClick={() => toggleSubworkspace(sw.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                            selectedIds.includes(sw.id)
                                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            selectedIds.includes(sw.id)
                                ? 'bg-indigo-600'
                                : 'bg-slate-200'
                        }`}>
                            {selectedIds.includes(sw.id) && (
                                <Check size={14} className="text-white" />
                            )}
                        </div>

                        {/* Logo */}
                        {sw.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={sw.logoUrl}
                                alt={sw.name}
                                className="w-8 h-8 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Building2 className="text-indigo-600" size={14} />
                            </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 text-left">
                            <h4 className="font-bold text-slate-900">{sw.name}</h4>
                            <p className="text-xs text-slate-400 font-mono">{sw.slug}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Save button */}
            {hasChanges && (
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <Check size={16} />
                        )}
                        Salvar Atribuições
                    </button>
                </div>
            )}

            {/* Success message */}
            {saveMutation.isSuccess && !hasChanges && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                    <Check size={16} />
                    Atribuições salvas com sucesso!
                </div>
            )}
        </div>
    );
}
