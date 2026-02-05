'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, XCircle, ClipboardList, CheckCircle, Clock, AlertTriangle, Calendar, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusLabel } from '@/lib/utils/status';
import { useLocale, useTranslations } from 'next-intl';

interface ChildChecklist {
    id: string;
    status: string;
    type?: string;
    createdAt?: string | Date;
    finalizedAt?: string | Date | null;
    responses?: Array<{ status: string }>;
    children?: ChildChecklist[];
}

interface ChildChecklistsAccordionProps {
    childChecklists: ChildChecklist[];
}

function getTypeLabel(type: string | undefined, t: ReturnType<typeof useTranslations>): string {
    if (type === 'CORRECTION') return t('checklistType.correction');
    if (type === 'COMPLETION') return t('checklistType.completion');
    return t('checklistType.original');
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'FINALIZED':
        case 'APPROVED':
            return <CheckCircle size={14} className="text-emerald-500" />;
        case 'REJECTED':
            return <XCircle size={14} className="text-red-500" />;
        case 'PARTIALLY_FINALIZED':
            return <AlertTriangle size={14} className="text-amber-500" />;
        default:
            return <Clock size={14} className="text-slate-400" />;
    }
}

function getProgressStats(responses: Array<{ status: string }> | undefined) {
    if (!responses || responses.length === 0) return { approved: 0, rejected: 0, pending: 0, total: 0 };

    const approved = responses.filter(r => r.status === 'APPROVED').length;
    const rejected = responses.filter(r => r.status === 'REJECTED').length;
    const pending = responses.length - approved - rejected;

    return { approved, rejected, pending, total: responses.length };
}

function formatDate(date: string | Date | undefined | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ChildChecklistRow({ child, level = 0 }: { child: ChildChecklist; level?: number }) {
    const locale = useLocale();
    const t = useTranslations();
    const typeLabel = getTypeLabel(child.type, t);
    const isCorrection = child.type === 'CORRECTION';
    const isCompletion = child.type === 'COMPLETION';
    const stats = getProgressStats(child.responses);
    const progressPercent = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

    return (
        <>
            <Link
                href={`/${locale}/dashboard/checklists/${child.id}`}
                className={cn(
                    "flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group",
                    level > 0 && "ml-6 border-l-2 border-slate-200"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                        "p-1.5 rounded-lg shrink-0",
                        isCorrection ? "bg-red-100" : isCompletion ? "bg-indigo-100" : "bg-slate-100"
                    )}>
                        {isCorrection ? (
                            <XCircle size={14} className="text-red-600" />
                        ) : (
                            <ClipboardList size={14} className={isCompletion ? "text-indigo-600" : "text-slate-600"} />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                                "text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                isCorrection ? "bg-red-100 text-red-700" :
                                    isCompletion ? "bg-indigo-100 text-indigo-700" :
                                        "bg-slate-100 text-slate-600"
                            )}>
                                {typeLabel}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                {getStatusIcon(child.status)}
                                {getStatusLabel(child.status)}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {/* Progress bar */}
                            {stats.total > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                progressPercent === 100
                                                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                                    : "bg-gradient-to-r from-blue-400 to-blue-500"
                                            )}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {stats.approved}/{stats.total}
                                    </span>
                                    {stats.rejected > 0 && (
                                        <span className="text-[10px] text-red-500 font-medium">
                                            ({stats.rejected} rej.)
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Dates */}
                            {child.createdAt && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {formatDate(child.createdAt)}
                                </span>
                            )}
                            {child.finalizedAt && (
                                <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                                    <CalendarCheck size={10} />
                                    {formatDate(child.finalizedAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <span className="text-xs text-indigo-600 font-medium">Ver →</span>
                </div>
            </Link>

            {/* Render grandchildren (netos) */}
            {child.children?.map((grandchild) => (
                <ChildChecklistRow key={grandchild.id} child={grandchild} level={level + 1} />
            ))}
        </>
    );
}

export default function ChildChecklistsAccordion({ childChecklists }: ChildChecklistsAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Count total children including grandchildren
    const totalCount = childChecklists.reduce((acc: number, child: ChildChecklist) => {
        return acc + 1 + (child.children?.length || 0);
    }, 0);

    // Count by type
    const corrections = childChecklists.filter((c: ChildChecklist) => c.type === 'CORRECTION').length;
    const completions = childChecklists.filter((c: ChildChecklist) => c.type === 'COMPLETION').length;

    // Count pending (not finalized)
    const pendingCount = childChecklists.filter((c: ChildChecklist) =>
        !['FINALIZED', 'APPROVED'].includes(c.status)
    ).length;

    return (
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/80 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <ClipboardList size={16} className="text-indigo-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-black text-slate-900">
                            Checklists Derivados
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500">
                                {totalCount} checklist{totalCount !== 1 ? 's' : ''}
                            </span>
                            {corrections > 0 && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                    {corrections} correção{corrections !== 1 ? 'ões' : ''}
                                </span>
                            )}
                            {completions > 0 && (
                                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                                    {completions} complemento{completions !== 1 ? 's' : ''}
                                </span>
                            )}
                            {pendingCount > 0 && (
                                <span className="text-[10px] font-bold text-amber-600">
                                    • {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isExpanded ? "bg-indigo-100" : "bg-slate-100"
                )}>
                    {isExpanded ? (
                        <ChevronUp size={16} className="text-indigo-600" />
                    ) : (
                        <ChevronDown size={16} className="text-slate-500" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-1 animate-fade-in">
                    {childChecklists.map((child: ChildChecklist) => (
                        <ChildChecklistRow key={child.id} child={child} />
                    ))}
                </div>
            )}
        </div>
    );
}
