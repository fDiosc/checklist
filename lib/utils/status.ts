/**
 * Centralized status and type label utilities for checklists.
 * Used across dashboard and management components.
 */

export type ChecklistStatus =
    | 'DRAFT'
    | 'SENT'
    | 'IN_PROGRESS'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'PARTIALLY_FINALIZED'
    | 'FINALIZED';

export type ChecklistType = 'ORIGINAL' | 'CORRECTION' | 'COMPLETION';

export interface StatusInfo {
    label: string;
    variant: string;
}

/**
 * Returns a human-readable label for a checklist status.
 */
export function getStatusLabel(status: string): string {
    switch (status) {
        case 'DRAFT': return 'Rascunho';
        case 'SENT': return 'Enviado';
        case 'IN_PROGRESS': return 'Respondendo';
        case 'PENDING_REVIEW': return 'Revisão Pendente';
        case 'APPROVED': return 'Aprovado';
        case 'REJECTED': return 'Rejeitado';
        case 'PARTIALLY_FINALIZED': return 'Finalizado Parcialmente';
        case 'FINALIZED': return 'Finalizado';
        default: return status;
    }
}

/**
 * Returns a human-readable label for a child checklist type.
 */
export function getChildTypeLabel(child: { type?: ChecklistType }): string {
    if (child.type === 'CORRECTION') return 'Correção';
    if (child.type === 'COMPLETION') return 'Complemento';
    return 'Original';
}

/**
 * Returns CSS class variants for checklist status badges.
 */
export function getStatusVariant(status: string): string {
    switch (status) {
        case 'APPROVED':
            return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'REJECTED':
            return 'bg-red-50 text-red-600 border-red-100';
        case 'PENDING_REVIEW':
            return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'IN_PROGRESS':
            return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        case 'PARTIALLY_FINALIZED':
            return 'bg-violet-50 text-violet-600 border-violet-100';
        case 'FINALIZED':
            return 'bg-slate-100 text-slate-600 border-slate-200';
        default:
            return 'bg-slate-50 text-slate-500 border-slate-100';
    }
}

/**
 * Returns status info for portal view (label + CSS class).
 */
export function getPortalStatusInfo(status: string): { label: string; class: string } {
    switch (status) {
        case 'SENT': return { label: 'Pendente', class: 'bg-amber-100 text-amber-700' };
        case 'IN_PROGRESS': return { label: 'Em Preenchimento', class: 'bg-blue-100 text-blue-700' };
        case 'REJECTED': return { label: 'Revisão Necessária', class: 'bg-red-100 text-red-700' };
        case 'PENDING_REVIEW': return { label: 'Em Auditoria', class: 'bg-indigo-100 text-indigo-700' };
        case 'APPROVED': return { label: 'Aprovado', class: 'bg-emerald-100 text-emerald-700' };
        case 'FINALIZED': return { label: 'Finalizado', class: 'bg-slate-100 text-slate-700' };
        case 'PARTIALLY_FINALIZED': return { label: 'Parcialmente Finalizado', class: 'bg-violet-100 text-violet-700' };
        default: return { label: status, class: 'bg-gray-100 text-gray-700' };
    }
}

/**
 * List of all checklist statuses for filter dropdowns.
 */
export const CHECKLIST_STATUSES = [
    { value: '', label: 'Todos os status' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'SENT', label: 'Enviado' },
    { value: 'IN_PROGRESS', label: 'Em Progresso' },
    { value: 'PENDING_REVIEW', label: 'Aguardando Revisão' },
    { value: 'APPROVED', label: 'Aprovado' },
    { value: 'REJECTED', label: 'Rejeitado' },
    { value: 'PARTIALLY_FINALIZED', label: 'Finalizado Parcialmente' },
    { value: 'FINALIZED', label: 'Finalizado' },
] as const;
