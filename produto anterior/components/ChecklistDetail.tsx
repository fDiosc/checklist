
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ChevronRight,
  CheckCircle2, 
  Sparkles,
  X,
  Share2,
  FileText,
  Calendar,
  Type as TypeIcon,
  List as ListIcon,
  CheckSquare,
  Bot,
  AlertTriangle,
  Loader2,
  Lock,
  MessageCircle,
  Mail,
  Copy,
  Layers,
  AlignLeft,
  Check,
  Flag,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCheck,
  Map as MapIcon,
  Scale
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentStatus, DocumentItem, ChecklistSection } from '../types';
import PropertyMapInput from './PropertyMapInput';

// --- BASES DE DADOS (Duplicadas para lookup de unidade) ---
const DATABASE_FERTILIZERS = [
  { usage: 'Fertilizante Solo', product: 'Boro Ulexita', comp: 'B2O3 43%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'KCl', comp: 'K2O 60%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'MAP', comp: 'N 11%-P 52%-K 00%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'NPK 18-00-18', comp: 'N 18%-P 00%-K 18%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'NPK 20-00-20', comp: 'N 20%-P 00%-K 20%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Uréia', comp: 'N 45%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Superfosfato Simples', comp: 'P2O5 20%-S 10%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Superfosfato Triplo', comp: 'P2O5 45%-Ca 10%', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Enxofre', comp: '', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Manganês', comp: '', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Níquel', comp: '', unit: 'kg/ha' },
  { usage: 'Fertilizante Solo', product: 'Zinco', comp: '', unit: 'kg/ha' }
];

const DATABASE_DESICCATION = [
  { usage: 'Dessecação Pré Plantio', product: 'Glifosato 480 SL Genérico Líquido', comp: 'Glifosato 360 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Glifosato Nortox 480 SL', comp: 'Glifosato 360 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Roundup Original', comp: 'Glifosato 360 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Roundup Original Mais', comp: 'Glifosato 480 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Roundup Transorb', comp: 'Glifosato 480 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Glifosato Genérico 500 Líquido', comp: 'Glifosato 500 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Zapp QI Líquido', comp: 'Glifosato 500 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Crucial 698 Sumitomo', comp: 'Glifosato 540 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Glifosato Genérico WG 720', comp: 'Glifosato 720 g/kg', unit: 'kg/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Roundup WG 720', comp: 'Glifosato 720 g/kg', unit: 'kg/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Connor 200 SL', comp: 'Glufosinato 200 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Finale 200 SL', comp: 'Glufosinato 200 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Glufosinato Genérico 200 SL', comp: 'Glufosinato 200 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Liberty 200 SL', comp: 'Glufosinato 200 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Lifeline 280 SL', comp: 'Glufosinato 280 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Trunfo 280 SL', comp: 'Glufosinato 280 g/l', unit: 'l/ha' },
  { usage: 'Dessecação Pré Plantio', product: 'Outro', comp: 'Outro', unit: '' }
];

const ChecklistDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [templateName, setTemplateName] = useState('Checklist');
  const [templateStatus, setTemplateStatus] = useState<'Ativo' | 'Inativo' | 'Finalizado'>('Ativo');
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);
  const [comment, setComment] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('merx_templates') || '[]');
    const current = stored.find((t: any) => t.id === id);
    if (current) {
      setTemplateName(current.name);
      setTemplateStatus(current.status || 'Ativo');
      setSections(current.sections || []);
      const first = current.sections?.[0]?.items?.[0];
      if (first) setSelectedDocId(first.id);
    }
  }, [id]);

  // Sincronizar alterações com o localStorage de forma robusta
  useEffect(() => {
    if (sections.length > 0 && id) {
      const stored = JSON.parse(localStorage.getItem('merx_templates') || '[]');
      const updatedTemplates = stored.map((t: any) => 
        t.id === id ? { ...t, sections, status: templateStatus } : t
      );
      localStorage.setItem('merx_templates', JSON.stringify(updatedTemplates));
    }
  }, [sections, templateStatus, id]);

  const allDocs = sections.flatMap(s => s.items);
  const selectedDoc = allDocs.find(d => d.id === selectedDocId);

  useEffect(() => {
    if (selectedDoc) setComment(selectedDoc.rejectionReason || '');
  }, [selectedDocId]);

  const handleFinalizeChecklist = () => {
    const confirm = window.confirm("Deseja finalizar este processo de checklist? Nenhuma alteração poderá ser feita pelo produtor após isso. O status mudará para 'Finalizado'.");
    if (confirm) {
      setIsFinalizing(true);
      setTemplateStatus('Finalizado');
      setTimeout(() => {
        setIsFinalizing(false);
        navigate('/checklists');
      }, 800);
    }
  };

  const performAIAnalysis = async (doc: DocumentItem) => {
    if (doc.status === DocumentStatus.MISSING) return doc;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise o documento/pergunta "${doc.name}".
      Resposta principal: "${doc.answer}".
      Quantidade (se houver): "${doc.quantity}".
      Observação adicional do produtor: "${doc.observationValue || 'Nenhuma observação fornecida'}".
      Determine se a resposta é condizente (APROVADO) ou se há problemas (REPROVADO). Considere a observação para contextulizar a resposta.
      Retorne JSON: { "flag": "APROVADO" | "REPROVADO", "message": "explicação", "confidence": 0.9 }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flag: { type: Type.STRING, enum: ['APROVADO', 'REPROVADO'] },
              message: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['flag', 'message', 'confidence']
          }
        }
      });
      return { ...doc, aiAnalysis: JSON.parse(response.text) };
    } catch (e) { return doc; }
  };

  const handleGlobalAIAnalysis = async () => {
    setIsGlobalAnalyzing(true);
    const updated = await Promise.all(sections.map(async (sec) => ({
      ...sec, items: await Promise.all(sec.items.map(item => performAIAnalysis(item)))
    })));
    setSections(updated);
    setIsGlobalAnalyzing(false);
  };

  const handleAcceptAllAISuggestions = () => {
    const hasAnalysis = allDocs.some(d => d.aiAnalysis);
    if (!hasAnalysis) {
      alert("Nenhuma análise de IA disponível para aceitar. Clique em 'Analisar Tudo' primeiro.");
      return;
    }

    const confirm = window.confirm("Deseja aplicar as sugestões da IA em todos os itens analisados? Isso mudará o status dos documentos aprovados ou reprovados pela IA.");
    if (confirm) {
      const updated = sections.map(sec => ({
        ...sec,
        items: sec.items.map(item => {
          if (item.aiAnalysis) {
            const isApprovedByAI = item.aiAnalysis.flag === 'APROVADO';
            return {
              ...item,
              status: isApprovedByAI ? DocumentStatus.APPROVED : DocumentStatus.REJECTED,
              rejectionReason: !isApprovedByAI ? (item.aiAnalysis.message || 'Reprovado pela Inteligência Artificial.') : ''
            };
          }
          return item;
        })
      }));
      setSections([...updated]); // Force deep copy to trigger state update
    }
  };

  const updateItemStatus = (newStatus: DocumentStatus) => {
    if (templateStatus === 'Finalizado') return;
    setSections(sections.map(s => ({
      ...s, items: s.items.map(i => i.id === selectedDocId ? { ...i, status: newStatus, rejectionReason: newStatus === DocumentStatus.REJECTED ? (comment || (i.aiAnalysis?.flag === 'REPROVADO' ? i.aiAnalysis.message : '')) : '' } : i)
    })));
  };

  const isAiSuggestionReject = selectedDoc?.aiAnalysis?.flag === 'REPROVADO';

  const getUnitForDropdown = (doc: DocumentItem) => {
    if (!doc.databaseSource || !doc.answer) return '';
    const db = doc.databaseSource === 'fertilizers' ? DATABASE_FERTILIZERS : DATABASE_DESICCATION;
    const item = db.find(i => i.product === doc.answer);
    return item ? item.unit : '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" onClick={() => setShowShareMenu(false)}>
      <header className="bg-white border-b border-gray-100 px-10 py-6 flex items-center justify-between flex-shrink-0 shadow-sm z-20">
        <div className="flex-1">
           <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
             <span>Checklists</span>
             <ChevronRight size={10} />
             <span className="text-gray-900">Gestão de Auditoria</span>
           </div>
           <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-gray-900 leading-none">
                {templateName}
              </h1>
              <span className={`text-[10px] px-3 py-1.5 rounded-full font-black border uppercase tracking-widest ${
                templateStatus === 'Finalizado' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
              }`}>
                {templateStatus}
              </span>
           </div>
        </div>
        <div className="flex items-center gap-4">
          {templateStatus !== 'Finalizado' && (
            <>
              <button 
                onClick={handleAcceptAllAISuggestions} 
                className="bg-white text-indigo-600 border-2 border-indigo-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-50"
              >
                <CheckCheck size={16} /> Aceitar sugestão da IA
              </button>
              <button onClick={handleGlobalAIAnalysis} disabled={isGlobalAnalyzing} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50">
                {isGlobalAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Analisar Tudo
              </button>
              <button onClick={handleFinalizeChecklist} disabled={isFinalizing} className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200">
                {isFinalizing ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} Finalizar Checklist
              </button>
            </>
          )}
          
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowShareMenu(!showShareMenu)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-200">
              <Share2 size={16} /> Link Externo
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden">
                <button className="w-full text-left px-6 py-4 text-xs font-black text-gray-600 uppercase hover:bg-gray-50 flex items-center gap-4"><MessageCircle size={18} className="text-emerald-500" /> WhatsApp</button>
                <button onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/#/submit/${id}`); alert("Copiado!")}} className="w-full text-left px-6 py-4 text-xs font-black text-gray-600 uppercase hover:bg-gray-50 flex items-center gap-4"><Copy size={18} className="text-gray-400" /> Copiar Link</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 min-w-[400px] bg-slate-50 border-r border-gray-200 flex flex-col overflow-y-auto pb-20">
          {sections.map((section, idx) => (
            <div key={section.id} className="mb-4">
               {/* Section Title Header */}
               <div className="bg-slate-900 px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <Layers size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">{section.name}</span>
                  </div>
                  <div className="bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">{section.items.length} itens</span>
                  </div>
               </div>
               
               <div className="bg-white">
                  {section.items.map(doc => (
                    <div 
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`px-8 py-5 cursor-pointer hover:bg-emerald-50/30 transition-all border-b border-slate-50 relative ${selectedDocId === doc.id ? 'bg-emerald-50' : ''}`}
                    >
                      {selectedDocId === doc.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-r-full" />
                      )}
                      
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="flex items-center gap-2">
                           <h4 className={`text-sm font-black tracking-tight ${selectedDocId === doc.id ? 'text-emerald-900' : 'text-slate-700'}`}>{doc.name}</h4>
                           {doc.required && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Item Obrigatório"></span>}
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-widest ${
                          doc.status === DocumentStatus.APPROVED ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                          doc.status === DocumentStatus.REJECTED ? 'bg-red-50 border-red-100 text-red-500' : 
                          'bg-gray-100 border-gray-200 text-gray-500'
                        }`}>{doc.status}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {doc.aiAnalysis && (
                           <div className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 ${doc.aiAnalysis.flag === 'APROVADO' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                             <Bot size={10} className="text-white" />
                             <span className="text-[8px] font-black text-white uppercase tracking-tighter">{doc.aiAnalysis.flag} IA</span>
                           </div>
                        )}
                        {doc.quantity && (
                          <div className="flex items-center gap-1 text-purple-500 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                             <Scale size={10} />
                             <span className="text-[8px] font-black uppercase">Qtd</span>
                          </div>
                        )}
                        {doc.observationValue && (
                          <div className="flex items-center gap-1 text-slate-400">
                             <MessageSquare size={10} />
                             <span className="text-[8px] font-bold uppercase">Obs</span>
                          </div>
                        )}
                        {doc.validityControl && (
                          <div className="flex items-center gap-1 text-indigo-400 border border-indigo-100 px-1.5 py-0.5 rounded-md bg-indigo-50/30">
                             <Calendar size={10} />
                             <span className="text-[8px] font-black uppercase">C.V.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-gray-50/30 p-12 overflow-y-auto">
          {selectedDoc ? (
            <div className="max-w-6xl mx-auto space-y-10">
               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex justify-between items-center">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-500 shadow-inner">
                       {selectedDoc.type === 'file' ? <FileText size={36} /> : selectedDoc.type === 'property_map' ? <MapIcon size={36} /> : <AlignLeft size={36} />}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{selectedDoc.name}</h2>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">{selectedDoc.type}</span>
                         {selectedDoc.required && <span className="text-[10px] font-black text-red-400 uppercase tracking-widest border border-red-50 px-3 py-1.5 rounded-full">Obrigatório</span>}
                      </div>
                    </div>
                  </div>
                  {selectedDoc.status !== DocumentStatus.MISSING && templateStatus !== 'Finalizado' && (
                    <button 
                      onClick={() => updateItemStatus(isAiSuggestionReject ? DocumentStatus.REJECTED : DocumentStatus.APPROVED)} 
                      className={`${isAiSuggestionReject ? 'bg-red-500 shadow-red-200' : 'bg-emerald-500 shadow-emerald-200'} text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
                    >
                      {isAiSuggestionReject ? <ThumbsDown size={16} /> : <ThumbsUp size={16} />}
                      {isAiSuggestionReject ? 'Reprovar Imediatamente' : 'Aprovar Imediatamente'}
                    </button>
                  )}
               </div>

               <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-8 space-y-10">
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col">
                       <div className="bg-gray-900 px-10 py-5 text-white flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Visualização do Item</span>
                         <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full">{selectedDoc.lastUpdate}</span>
                       </div>
                       <div className="bg-gray-50/20 flex flex-col items-center justify-center p-20 min-h-[400px]">
                          {selectedDoc.status === DocumentStatus.MISSING ? (
                             <div className="text-center">
                                <Lock size={80} className="mx-auto text-gray-100 mb-8" />
                                <h3 className="text-gray-900 font-black uppercase tracking-widest text-lg">Aguardando Produtor</h3>
                                <p className="text-gray-400 font-bold mt-2">Este item ainda não foi preenchido.</p>
                             </div>
                          ) : (
                             <>
                                {selectedDoc.type === 'property_map' ? (
                                    <div className="w-full">
                                        <PropertyMapInput 
                                            value={typeof selectedDoc.answer === 'string' ? selectedDoc.answer : ''} 
                                            readOnly={true} 
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-white p-20 shadow-2xl rounded-[3rem] w-full max-w-xl text-center border border-gray-50 relative group mb-10">
                                        <div className="mb-10 group-hover:scale-110 transition-transform duration-500">
                                            {selectedDoc.type === 'file' ? <FileText size={120} className="text-emerald-500 mx-auto" /> : <AlignLeft size={120} className="text-indigo-400 mx-auto" />}
                                        </div>
                                        <h4 className="font-black text-gray-900 text-2xl mb-4 leading-tight">{selectedDoc.answer || 'Resposta do Produtor'}</h4>
                                        
                                        {/* Display Quantity if available */}
                                        {selectedDoc.quantity && (
                                           <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
                                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Quantidade Informada</span>
                                              <div className="text-3xl font-black text-purple-600">
                                                 {selectedDoc.quantity} 
                                                 <span className="text-lg text-purple-400 ml-1">{getUnitForDropdown(selectedDoc)}</span>
                                              </div>
                                           </div>
                                        )}
                                    </div>
                                )}
                                
                                {selectedDoc.observationValue && (
                                   <div className="w-full max-w-xl bg-white p-10 rounded-[2.5rem] border border-emerald-100 shadow-lg shadow-emerald-50/50 mt-8">
                                      <div className="flex items-center gap-3 mb-6 text-emerald-500">
                                         <MessageSquare size={20} />
                                         <span className="text-[10px] font-black uppercase tracking-widest">Observação do Produtor</span>
                                      </div>
                                      <p className="text-lg font-bold text-gray-700 leading-relaxed italic">"{selectedDoc.observationValue}"</p>
                                   </div>
                                )}
                             </>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="col-span-4 space-y-10">
                    {selectedDoc.aiAnalysis && (
                      <div className={`p-10 rounded-[3rem] shadow-2xl ${selectedDoc.aiAnalysis.flag === 'APROVADO' ? 'bg-emerald-500' : 'bg-red-500'} text-white animate-fade-in`}>
                        <div className="flex items-center gap-4 mb-6">
                          <Bot size={32} />
                          <h4 className="font-black uppercase text-base tracking-widest">{selectedDoc.aiAnalysis.flag} pela IA</h4>
                        </div>
                        <p className="text-base font-bold leading-relaxed opacity-90">{selectedDoc.aiAnalysis.message}</p>
                        <div className="mt-8 pt-8 border-t border-white/20">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                              <span>Confiança</span>
                              <span>{Math.round(selectedDoc.aiAnalysis.confidence * 100)}%</span>
                           </div>
                           <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                              <div className="h-full bg-white" style={{ width: `${selectedDoc.aiAnalysis.confidence * 100}%` }}></div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                      <h4 className="font-black text-gray-900 mb-8 uppercase text-xs tracking-[0.2em]">Parecer do Analista</h4>
                      <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={templateStatus === 'Finalizado'}
                        placeholder={templateStatus === 'Finalizado' ? "Este checklist está finalizado." : "Caso rejeite, explique o motivo para o produtor..."}
                        className="w-full text-base p-6 bg-gray-50 border-none rounded-3xl h-48 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none mb-8 font-medium transition-all disabled:opacity-50"
                      />
                      {templateStatus !== 'Finalizado' && (
                        <div className="flex flex-col gap-4">
                          <button onClick={() => updateItemStatus(DocumentStatus.APPROVED)} className="bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-2xl shadow-emerald-200 transition-all">Aprovar Documento</button>
                          <button onClick={() => updateItemStatus(DocumentStatus.REJECTED)} className="bg-white border-2 border-red-100 text-red-500 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-50 transition-all">Solicitar Reenvio</button>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-100">
               <Layers size={120} className="mb-8 opacity-5" />
               <p className="font-black uppercase tracking-[0.5em] text-xs text-gray-300">Selecione para iniciar auditoria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistDetail;