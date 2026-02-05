/**
 * Centralized status and type label utilities for checklists.
 * Used across dashboard and management components.
 * 
 * For internationalization, use the STATUS_TRANSLATION_KEYS and TYPE_TRANSLATION_KEYS
 * with the useTranslations hook from next-intl.
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

export type ResponseStatus = 'MISSING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';

export interface StatusInfo {
    label: string;
    variant: string;
}

/**
 * Translation keys for checklist status.
 * Use with t(STATUS_TRANSLATION_KEYS[status]) from next-intl.
 */
export const STATUS_TRANSLATION_KEYS: Record<ChecklistStatus, string> = {
    DRAFT: 'status.draft',
    SENT: 'status.sent',
    IN_PROGRESS: 'status.inProgress',
    PENDING_REVIEW: 'status.pendingReview',
    APPROVED: 'status.approved',
    REJECTED: 'status.rejected',
    PARTIALLY_FINALIZED: 'status.partiallyFinalized',
    FINALIZED: 'status.finalized',
};

/**
 * Translation keys for checklist types.
 * Use with t(TYPE_TRANSLATION_KEYS[type]) from next-intl.
 */
export const TYPE_TRANSLATION_KEYS: Record<ChecklistType, string> = {
    ORIGINAL: 'checklistType.original',
    CORRECTION: 'checklistType.correction',
    COMPLETION: 'checklistType.completion',
};

/**
 * Translation keys for response status.
 * Use with t(RESPONSE_STATUS_KEYS[status]) from next-intl.
 */
export const RESPONSE_STATUS_KEYS: Record<ResponseStatus, string> = {
    MISSING: 'responseStatus.missing',
    PENDING_VERIFICATION: 'responseStatus.pendingVerification',
    APPROVED: 'responseStatus.approved',
    REJECTED: 'responseStatus.rejected',
};

/**
 * Returns a human-readable label for a checklist status.
 * @deprecated Use STATUS_TRANSLATION_KEYS with useTranslations hook for i18n support.
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
 * @deprecated Use TYPE_TRANSLATION_KEYS with useTranslations hook for i18n support.
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
 * The labelKey can be used with useTranslations to get localized labels.
 */
export const CHECKLIST_STATUSES = [
    { value: '', labelKey: 'checklists.allStatus', labelFallback: 'Todos os status' },
    { value: 'DRAFT', labelKey: 'status.draft', labelFallback: 'Rascunho' },
    { value: 'SENT', labelKey: 'status.sent', labelFallback: 'Enviado' },
    { value: 'IN_PROGRESS', labelKey: 'status.inProgress', labelFallback: 'Em Progresso' },
    { value: 'PENDING_REVIEW', labelKey: 'status.pendingReview', labelFallback: 'Aguardando Revisão' },
    { value: 'APPROVED', labelKey: 'status.approved', labelFallback: 'Aprovado' },
    { value: 'REJECTED', labelKey: 'status.rejected', labelFallback: 'Rejeitado' },
    { value: 'PARTIALLY_FINALIZED', labelKey: 'status.partiallyFinalized', labelFallback: 'Finalizado Parcialmente' },
    { value: 'FINALIZED', labelKey: 'status.finalized', labelFallback: 'Finalizado' },
] as const;

/**
 * Portal status info with translation keys.
 */
export const PORTAL_STATUS_INFO: Record<string, { labelKey: string; class: string }> = {
    SENT: { labelKey: 'status.pending', class: 'bg-amber-100 text-amber-700' },
    IN_PROGRESS: { labelKey: 'status.inProgress', class: 'bg-blue-100 text-blue-700' },
    REJECTED: { labelKey: 'status.rejected', class: 'bg-red-100 text-red-700' },
    PENDING_REVIEW: { labelKey: 'status.pendingReview', class: 'bg-indigo-100 text-indigo-700' },
    APPROVED: { labelKey: 'status.approved', class: 'bg-emerald-100 text-emerald-700' },
    FINALIZED: { labelKey: 'status.finalized', class: 'bg-slate-100 text-slate-700' },
    PARTIALLY_FINALIZED: { labelKey: 'status.partiallyFinalized', class: 'bg-violet-100 text-violet-700' },
};
