'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ClipboardList, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import PropertyMapInput from '@/components/PropertyMapInput';
import { useTranslations, useFormatter } from 'next-intl';

interface ProducerHistoryProps {
    producerId: string;
    readOnly?: boolean;
}

export default function ProducerHistory({ producerId, readOnly = false }: ProducerHistoryProps) {
    const t = useTranslations();
    const format = useFormatter();
    const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('producer.loadingHistory')}</span>
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
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('producer.checklistsAnswered')}</h3>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                            {producer.checklists?.length || 0}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {producer.checklists && producer.checklists.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                                                {t('producer.lastInteraction')}: {format.dateTime(new Date(checklist.updatedAt), { dateStyle: 'short' })}
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
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('producer.noChecklistsAnswered')}</p>
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
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('producer.mappedProperties')}</h3>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                            {producer.maps?.length || 0} {t('producer.maps')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {producer.maps && producer.maps.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            producer.maps.map((map: any) => (
                                <div
                                    key={map.id}
                                    className="flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                                >
                                    <div
                                        onClick={() => setExpandedMapId(expandedMapId === map.id ? null : map.id)}
                                        className="flex items-center gap-6 p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                    >
                                        <div className={`p-4 rounded-2xl transition-all ${expandedMapId === map.id ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500'}`}>
                                            <MapPin size={24} />
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 uppercase tracking-tighter truncate">
                                                {map.name || t('producer.noHeadquarters')}
                                            </h4>
                                            <div className="flex flex-col gap-0.5">
                                                {map.city && (
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">
                                                        {map.city} - {map.state}
                                                    </p>
                                                )}
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                                                    {map.fields?.length || 0} talhões cadastrados
                                                </p>
                                                {/* EME and Rural Region Badges */}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {map.emeCode && (
                                                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                                            {map.emeCode}
                                                        </span>
                                                    )}
                                                    {map.ruralRegionCode && (
                                                        <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                                                            RR {map.ruralRegionCode}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 text-slate-300">
                                            {expandedMapId === map.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>

                                    {expandedMapId === map.id && (
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 animate-fade-in">
                                            <div className="w-full rounded-2xl shadow-inner border border-slate-200 bg-white">
                                                <PropertyMapInput
                                                    mapId={map.id}
                                                    value={JSON.stringify({
                                                        propertyLocation: map.location || map.propertyLocation,
                                                        fields: map.fields || [],
                                                        city: map.city,
                                                        state: map.state,
                                                        carCode: map.carCode,
                                                        carData: map.carData,
                                                        carEsgStatus: map.carEsgStatus,
                                                        carEsgData: map.carEsgData,
                                                        emeCode: map.emeCode,
                                                        ruralRegionCode: map.ruralRegionCode
                                                    })}
                                                    readOnly={true}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('producer.noPropertiesMapped')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
