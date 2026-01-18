import { useState } from 'react';
import { CheckCircle, XCircle, Sparkles, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

interface AuditActionPanelProps {
    status: 'MISSING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string | null;
    aiSuggestion?: {
        status: 'APPROVED' | 'REJECTED';
        reason: string;
        confidence: number;
    } | null;
    onApprove: () => void;
    onReject: (reason: string) => void;
    onAcceptAi: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onInternalFill: (data: any) => void;
    itemType?: string;
}

export default function AuditActionPanel({
    status,
    rejectionReason,
    aiSuggestion,
    onApprove,
    onReject,
    onAcceptAi,
    onInternalFill,
    itemType
}: AuditActionPanelProps) {
    const [isRejecting, setIsRejecting] = useState(false);
    const [isInternalFilling, setIsInternalFilling] = useState(false);
    const [reason, setReason] = useState(rejectionReason || '');
    const [answer, setAnswer] = useState('');

    const handleRejectSubmit = () => {
        if (!reason.trim()) return;
        onReject(reason);
        setIsRejecting(false);
    };

    const handleInternalFillSubmit = () => {
        if (!answer.trim()) return;
        onInternalFill({ answer });
        setIsInternalFilling(false);
        setAnswer('');
    };

    return (
        <div className="flex flex-col gap-6 w-64 xl:w-80 shrink-0 animate-fade-in pl-4 xl:pl-8 border-l border-slate-100 bg-slate-50/30">
            <div className="space-y-4 px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Ação do Auditor
                </h3>

                {status === 'APPROVED' ? (
                    <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 text-center shadow-sm">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <CheckCircle size={24} strokeWidth={2.5} />
                        </div>
                        <p className="font-black text-emerald-900 text-lg tracking-tight">Item Aprovado</p>
                        <p className="text-xs text-emerald-600 mt-1 mb-4">Verificado pelo auditor</p>
                        <button
                            onClick={onApprove}
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-all"
                        >
                            Revalidar
                        </button>
                    </div>
                ) : status === 'REJECTED' ? (
                    <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border border-red-100 shadow-sm">
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <XCircle size={24} strokeWidth={2.5} />
                            </div>
                            <p className="font-black text-red-900 text-lg tracking-tight">Item Rejeitado</p>
                            <p className="text-xs text-red-600 mt-1">Ajuste solicitado ao produtor</p>
                        </div>
                        <div className="text-xs text-red-800 bg-red-100/30 p-4 rounded-xl border border-red-100/50 leading-relaxed font-medium">
                            <span className="font-black uppercase text-[9px] tracking-widest block mb-1 opacity-50">Motivo:</span>
                            {rejectionReason}
                        </div>
                        <button
                            onClick={() => setIsRejecting(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 bg-red-100/50 hover:bg-red-100 px-4 py-2 rounded-lg transition-all w-full mt-4"
                        >
                            Editar Parecer
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {!isRejecting && !isInternalFilling ? (
                            <>
                                <button
                                    onClick={onApprove}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} strokeWidth={3} />
                                    Aprovar Item
                                </button>
                                <button
                                    onClick={() => setIsRejecting(true)}
                                    className="w-full py-4 bg-white border-2 border-slate-100 hover:border-red-500 hover:text-red-500 text-slate-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} strokeWidth={3} />
                                    Rejeitar / Solicitar Ajuste
                                </button>

                                <div className="mt-4 pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => setIsInternalFilling(true)}
                                        className="w-full py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle size={14} strokeWidth={2.5} />
                                        Preencher Internamente
                                    </button>
                                    <p className="text-[9px] text-slate-400 text-center mt-2 font-bold uppercase tracking-wider">
                                        Use se o produtor enviou os dados por fora
                                    </p>
                                </div>
                            </>
                        ) : isRejecting ? (
                            <div className="space-y-3 animate-fade-in">
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Descreva o motivo da rejeição..."
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 min-h-[120px]"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsRejecting(false)}
                                        className="flex-1 py-3 text-slate-400 hover:bg-slate-50 rounded-lg font-bold text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleRejectSubmit}
                                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-red-200"
                                    >
                                        Confirmar Rejeição
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Preencher Item</h4>
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder={itemType === 'FILE' ? "Cole o link do arquivo ou descreva..." : "Digite a resposta do produtor..."}
                                    className="w-full p-4 bg-white border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[120px]"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsInternalFilling(false)}
                                        className="flex-1 py-3 text-indigo-400 hover:bg-white rounded-lg font-bold text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleInternalFillSubmit}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-lg shadow-indigo-200"
                                    >
                                        Salvar Preenchimento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Suggestion Card - Persistent */}
            {aiSuggestion && (
                <div className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-50 text-indigo-200 group-hover:scale-110 transition-transform">
                        <Sparkles size={40} />
                    </div>

                    <div className="relative z-10 space-y-3">
                        <h4 className="font-black text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Sparkles size={14} className="text-indigo-500" />
                            Análise da IA
                        </h4>

                        <div className="flex items-center gap-2">
                            {aiSuggestion.status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                    <ThumbsUp size={12} /> Sugere Aprovação
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                    <ThumbsDown size={12} /> Sugere Rejeição
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-indigo-400">
                                {Math.round(aiSuggestion.confidence * 100)}% Confiança
                            </span>
                        </div>

                        <p className="text-xs text-indigo-800 leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100/50">
                            {aiSuggestion.reason}
                        </p>

                        <button
                            onClick={onAcceptAi}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            Aceitar Sugestão e Aplicar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
