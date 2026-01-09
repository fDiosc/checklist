'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, MapPin, ClipboardList, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ProducerHistoryProps {
    producerId: string;
}

export default function ProducerHistory({ producerId }: ProducerHistoryProps) {
    const { data: producer, isLoading } = useQuery({
        queryKey: ['producer-detail', producerId],
        queryFn: async () => {
            const res = await fetch(`/api/producers/${producerId}`);
            if (!res.ok) throw new Error('Failed to fetch details');
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</span>
            </div>
        );
    }

    if (!producer) return null;

    return (
        <div className="p-10 bg-slate-50/50 animate-fade-in border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Checklists Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ClipboardList className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Checklists Respondidos</h3>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                            {producer.checklists?.length || 0}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {producer.checklists && producer.checklists.length > 0 ? (
                            producer.checklists.map((checklist: any) => (
                                <Link
                                    key={checklist.id}
                                    href={`/dashboard/checklists/${checklist.id}`}
                                    className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                                >
                                    <div className="space-y-2">
                                        <h4 className="font-black text-slate-900 group-hover:text-primary transition-colors">{checklist.template.name}</h4>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                Última interação: {new Date(checklist.updatedAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                        <ExternalLink size={16} />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-8 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum checklist respondido</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Properties Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Propriedades Mapeadas</h3>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                            {producer.maps?.length || 0} Mapas
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {producer.maps && producer.maps.length > 0 ? (
                            producer.maps.map((map: any) => (
                                <div
                                    key={map.id}
                                    className="flex items-center gap-6 p-6 bg-white border border-slate-100 rounded-3xl"
                                >
                                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-900 uppercase tracking-tighter">
                                            Sede: {map.name || 'Não definida'}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                                            {map.fields?.length || 0} talhões cadastrados
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma propriedade mapeada</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
