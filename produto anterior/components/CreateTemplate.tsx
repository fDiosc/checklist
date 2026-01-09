
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Calendar, 
  FileText, 
  Save, 
  CheckSquare, 
  Type as TypeIcon, 
  List, 
  AlignLeft, 
  X, 
  Layers, 
  ChevronDown, 
  Check, 
  MessageSquare, 
  Sparkles, 
  Upload, 
  FileUp, 
  Loader2, 
  AlertCircle,
  Map as MapIcon,
  MousePointer2,
  UserCheck,
  Copy,
  Sprout,
  Database,
  Hash
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { ChecklistSection, DocumentItem, DocumentStatus } from '../types';

const CreateTemplate: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de Controle de Fluxo
  const [mode, setMode] = useState<'select' | 'manual' | 'ai_processing'>('select');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Dados do Template
  const [templateName, setTemplateName] = useState('');
  const [templateFolder, setTemplateFolder] = useState('');
  const [requiresProducerIdentification, setRequiresProducerIdentification] = useState(false);
  const [sections, setSections] = useState<ChecklistSection[]>([
    { id: 'sec-1', name: 'Nova Seção', items: [] }
  ]);

  // --- Lógica de IA ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode('ai_processing');
    setIsAnalyzing(true);

    try {
      // 1. Converter arquivo para Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
           const result = reader.result as string;
           // Remove o prefixo data:image/png;base64, para enviar apenas os bytes
           const base64Content = result.split(',')[1]; 
           resolve(base64Content);
        };
        reader.onerror = error => reject(error);
      });

      // 2. Preparar Prompt para o Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const mimeType = file.type;

      const prompt = `
        Você é um especialista em Compliance e Auditoria do Agronegócio (PAGR, ISO, etc).
        Analise o documento anexo (que pode ser um PDF, Imagem de formulário ou Excel) e extraia a estrutura de checklist.

        Sua tarefa é converter o conteúdo visual em uma estrutura JSON estrita para minha aplicação.

        Regras de Mapeamento:
        1. Agrupe os itens em 'sections' baseadas nos cabeçalhos visuais do documento (ex: "Nível II - Registros", "Infraestrutura", "Manejo").
        2. Para cada item/pergunta, determine o 'type' ideal:
           - Se pede uma foto, evidência visual ou documento anexo -> type: 'file'
           - Se é uma pergunta de Sim/Não -> type: 'single_choice', options: ['Sim', 'Não', 'N/A']
           - Se é uma data -> type: 'date'
           - Se é texto livre -> type: 'text'
        3. Se for uma pergunta (single_choice) que implicitamente requer uma prova (ex: "Existe contrato?", "Possui outorga?"), defina 'requestArtifact': true.
        4. O 'name' deve ser a pergunta completa.

        Retorne APENAS um JSON com o seguinte formato (sem markdown):
        [
          {
            "id": "sec-1",
            "name": "Nome da Seção",
            "items": [
               {
                 "id": "item-1",
                 "name": "Texto da pergunta",
                 "type": "single_choice" | "file" | "text" | "date",
                 "options": ["Sim", "Não"] (apenas se type for single_choice),
                 "required": true,
                 "requestArtifact": true (se precisar de anexo na pergunta),
                 "validityControl": false (true se for documento com validade ex: ASO, CNH)
               }
            ]
          }
        ]
      `;

      // 3. Chamar Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      });

      // 4. Parsear Resposta
      let jsonStr = response.text || '';
      // Limpeza de Markdown caso a IA retorne ```json ... ```
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const generatedSections = JSON.parse(jsonStr);

      // Tratamento pós-IA para garantir IDs únicos e defaults
      const sanitizedSections = generatedSections.map((sec: any, sIdx: number) => ({
        id: `ai-sec-${sIdx}-${Date.now()}`,
        name: sec.name || 'Seção Importada',
        items: sec.items.map((item: any, iIdx: number) => ({
            id: `ai-item-${sIdx}-${iIdx}-${Date.now()}`,
            name: item.name || 'Item sem nome',
            type: item.type || 'text',
            status: DocumentStatus.MISSING,
            itemsSent: 0,
            lastUpdate: '-',
            validity: null,
            options: item.options || [],
            required: item.required !== undefined ? item.required : true,
            validityControl: item.validityControl || false,
            observationEnabled: true,
            requestArtifact: item.requestArtifact || false,
            artifactRequired: false
        }))
      }));

      setSections(sanitizedSections);
      setTemplateName(file.name.split('.')[0].replace(/_/g, ' '));
      setTemplateFolder('Importados IA');
      setMode('manual'); // Vai para o editor manual com os dados pré-carregados
      
    } catch (error) {
      console.error("Erro na análise IA:", error);
      alert("Não foi possível analisar o arquivo. Tente novamente ou crie manualmente.");
      setMode('select');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Funções CRUD Manuais (Mantidas) ---

  const addSection = () => {
    setSections([...sections, { id: `sec-${Date.now()}`, name: 'Nova Seção', items: [] }]);
  };

  const removeSection = (secId: string) => {
    if (sections.length > 1) setSections(sections.filter(s => s.id !== secId));
  };

  const toggleSectionIterator = (secId: string) => {
    setSections(sections.map(s => {
       if (s.id !== secId) return s;
       // Se estiver ativando, forçamos a identificação do produtor (necessário para ter talhões)
       if (!s.iterateOverFields) {
          setRequiresProducerIdentification(true);
       }
       return { ...s, iterateOverFields: !s.iterateOverFields };
    }));
  };

  const addItem = (secId: string) => {
    setSections(sections.map(s => s.id === secId ? { ...s, items: [...s.items, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'file',
      status: DocumentStatus.MISSING,
      lastUpdate: '-',
      itemsSent: 0,
      validity: null,
      options: [],
      required: true,
      validityControl: false,
      observationEnabled: false,
      requestArtifact: false,
      artifactRequired: false,
      askForQuantity: false
    }]} : s));
  };

  const removeItem = (secId: string, itemId: string) => {
    setSections(sections.map(s => s.id === secId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s));
  };

  const updateSectionName = (secId: string, name: string) => {
    setSections(sections.map(s => s.id === secId ? { ...s, name } : s));
  };

  const updateItem = (secId: string, itemId: string, field: keyof DocumentItem, value: any) => {
    setSections(sections.map(s => s.id === secId ? { ...s, items: s.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) } : s));
  };

  const handleAddOption = (secId: string, itemId: string) => {
    setSections(sections.map(s => s.id === secId ? { ...s, items: s.items.map(item => item.id === itemId ? { ...item, options: [...(item.options || []), 'Nova Opção'] } : item) } : s));
  };

  const handleSave = () => {
    if (!templateName) return alert("Insira o nome do template.");
    setIsSaving(true);
    const newTemplate = { 
      id: Date.now().toString(), 
      name: templateName, 
      folder: templateFolder || 'Geral', 
      status: 'Ativo', 
      producersLinked: 0, 
      createdAt: new Date().toLocaleDateString('pt-BR'), 
      createdBy: 'Usuário Admin', 
      requiresProducerIdentification,
      sections 
    };
    const existing = JSON.parse(localStorage.getItem('merx_templates') || '[]');
    localStorage.setItem('merx_templates', JSON.stringify([...existing, newTemplate]));
    setTimeout(() => navigate('/checklists'), 500);
  };

  // --- Renderização Condicional por Modo ---

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 animate-fade-in">
         <div className="max-w-4xl w-full">
            <button onClick={() => navigate('/checklists')} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-all mb-8">
              <ArrowLeft size={16} /> Cancelar e Voltar
            </button>
            
            <h1 className="text-4xl font-black text-slate-900 mb-2">Como deseja criar seu Checklist?</h1>
            <p className="text-slate-500 mb-12 text-lg">Escolha a melhor forma de estruturar sua auditoria.</p>

            <div className="grid grid-cols-2 gap-8">
               {/* Card Manual */}
               <div 
                  onClick={() => setMode('manual')}
                  className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
               >
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-slate-100 transition-colors">
                     <List size={32} className="text-slate-700" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">Manual</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">Crie seções e itens um por um, configurando cada detalhe manualmente do zero.</p>
               </div>

               {/* Card AI */}
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-500 p-10 rounded-[3rem] shadow-xl shadow-emerald-200/50 border-2 border-transparent cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-10 opacity-20">
                     <Sparkles size={120} className="text-white" />
                  </div>
                  
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 relative z-10">
                     <Sparkles size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 relative z-10">IA Mágica</h3>
                  <p className="text-emerald-100 leading-relaxed font-medium relative z-10">Faça upload de um PDF, Imagem ou Excel e deixe nossa IA estruturar tudo automaticamente.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png" // Limitando a arquivos visuais por enquanto para garantir parse multimodal
                    onChange={handleFileUpload}
                  />
               </div>
            </div>
         </div>
      </div>
    );
  }

  if (mode === 'ai_processing') {
    return (
       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
          <div className="bg-white p-16 rounded-[3rem] shadow-2xl shadow-emerald-100 border border-emerald-50">
             <div className="relative mb-8 mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-emerald-500 w-24 h-24 rounded-full flex items-center justify-center">
                   <Sparkles size={40} className="text-white animate-pulse" />
                </div>
             </div>
             <h2 className="text-3xl font-black text-slate-900 mb-4">Analisando Documento</h2>
             <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
               Nossa Inteligência Artificial está lendo seu arquivo, identificando seções e configurando os tipos de perguntas...
             </p>
             <div className="mt-8 flex justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
             </div>
          </div>
       </div>
    );
  }

  // --- Modo Manual (Editor) ---
  return (
    <div className="p-10 max-w-[1200px] mx-auto pb-32 bg-gray-50/30 animate-fade-in">
      <div className="mb-12 flex justify-between items-center">
        <div>
          <button onClick={() => setMode('select')} className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest hover:text-emerald-600 transition-all mb-4">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3">
             <h1 className="text-[32px] font-black text-slate-900 tracking-tight">Editor de Template</h1>
             {templateFolder === 'Importados IA' && (
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                   <Sparkles size={12} /> Gerado por IA
                </span>
             )}
          </div>
        </div>
        <button onClick={addSection} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl hover:bg-emerald-100 transition-all font-bold text-xs uppercase tracking-widest border border-emerald-100">
          <Layers size={18} /> Nova Seção
        </button>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-4">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 sticky top-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Informações Gerais</h3>
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nome do Template</label>
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all" placeholder="Ex: Auditoria Fazenda 2024" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Categoria / Pasta</label>
                <input type="text" value={templateFolder} onChange={(e) => setTemplateFolder(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all" placeholder="Ex: Socioambiental" />
              </div>
              
              {/* Toggle de Identificação */}
              <div className="pt-6 border-t border-slate-100">
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className={`w-12 h-7 rounded-full transition-all duration-300 relative ${requiresProducerIdentification ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${requiresProducerIdentification ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={requiresProducerIdentification}
                      onChange={(e) => setRequiresProducerIdentification(e.target.checked)}
                    />
                    <div>
                        <span className="block text-xs font-black text-slate-700 uppercase tracking-wide">Exigir Identificação</span>
                        <span className="block text-[10px] text-slate-400 leading-tight mt-1">Produtor deve informar CPF/Email antes de iniciar</span>
                    </div>
                 </label>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
               <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                     <h4 className="text-indigo-900 font-bold text-sm mb-1">Dica de Edição</h4>
                     <p className="text-indigo-700 text-xs leading-relaxed">Você pode ajustar os tipos de campos que a IA sugeriu. Lembre-se de marcar "Solicitar Anexo" para perguntas que exigem evidência.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-10">
          {sections.map(section => (
            <div key={section.id} className={`bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border overflow-hidden animate-slide-up transition-all ${section.iterateOverFields ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
              <div className={`px-10 py-6 flex justify-between items-center border-b ${section.iterateOverFields ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50/30 border-slate-50'}`}>
                <div className="flex-1 flex flex-col gap-2">
                   {section.iterateOverFields && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-white px-3 py-1 rounded-full w-fit shadow-sm">
                         <Sprout size={12} /> Repetir por Talhão
                      </span>
                   )}
                   <input 
                    type="text" 
                    value={section.name} 
                    onChange={(e) => updateSectionName(section.id, e.target.value)}
                    className="bg-transparent border-none focus:ring-0 font-black text-slate-800 p-0 text-xl w-full"
                    />
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                     onClick={() => toggleSectionIterator(section.id)}
                     title={section.iterateOverFields ? "Desativar repetição por talhão" : "Ativar repetição por talhão"}
                     className={`w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-sm ${section.iterateOverFields ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200'}`}
                  >
                     <Sprout size={20} />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  <button onClick={() => addItem(section.id)} className="w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                    <Plus size={20} />
                  </button>
                  <button onClick={() => removeSection(section.id)} className="p-2 text-slate-300 hover:text-red-500">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-8">
                {section.items.map(item => (
                  <div key={item.id} className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100/50 relative group transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-emerald-100">
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <textarea 
                        value={item.name} 
                        placeholder="Nome do Item ou Pergunta"
                        rows={item.name.length > 60 ? 2 : 1}
                        onChange={(e) => updateItem(section.id, item.id, 'name', e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 font-black text-slate-800 p-0 text-lg resize-none leading-tight"
                      />
                      <div className="flex items-center gap-3 flex-shrink-0">
                         <div className="relative">
                            <select 
                              value={item.type} 
                              onChange={(e) => updateItem(section.id, item.id, 'type', e.target.value)}
                              className={`appearance-none border border-slate-200 rounded-xl text-[10px] font-black uppercase px-6 py-2.5 shadow-sm pr-10 focus:ring-2 focus:ring-emerald-500/20 transition-colors ${
                                  item.type === 'file' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                  item.type === 'single_choice' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                  item.type === 'property_map' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 
                                  item.type === 'field_selector' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                  item.type === 'dropdown_select' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                  'bg-white text-slate-600'
                              }`}
                            >
                              <option value="file">Documento (Foto/Upload)</option>
                              <option value="text">Texto Curto</option>
                              <option value="date">Data</option>
                              <option value="single_choice">Única Escolha (Sim/Não)</option>
                              <option value="multiple_choice">Múltipla Escolha</option>
                              <option value="dropdown_select">Seleção (Dropdown)</option>
                              <option value="property_map">Desenhar Mapa/Talhão</option>
                              <option value="field_selector">Seleção de Talhão Existente</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                         </div>
                         <button onClick={() => removeItem(section.id, item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                           <X size={18} />
                         </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 border-t border-slate-200/50 pt-6">
                       <label className="flex items-center gap-3 cursor-pointer group/check">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.required ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover/check:border-emerald-300'}`}>
                            {item.required && <Check size={12} strokeWidth={4} className="text-white" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={item.required} onChange={(e) => updateItem(section.id, item.id, 'required', e.target.checked)} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/check:text-slate-600 transition-colors">Obrigatório</span>
                       </label>

                       {item.type === 'single_choice' && (
                           <label className="flex items-center gap-3 cursor-pointer group/check">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.requestArtifact ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-200 group-hover/check:border-indigo-300'}`}>
                                    {item.requestArtifact && <Check size={12} strokeWidth={4} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={item.requestArtifact || false} onChange={(e) => updateItem(section.id, item.id, 'requestArtifact', e.target.checked)} />
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${item.requestArtifact ? 'text-indigo-500' : 'text-slate-400 group-hover/check:text-slate-600'}`}>Solicitar Anexo</span>
                           </label>
                       )}

                       {item.type === 'file' && (
                         <label className="flex items-center gap-3 cursor-pointer group/check">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.validityControl ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover/check:border-emerald-300'}`}>
                              {item.validityControl && <Check size={12} strokeWidth={4} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={item.validityControl} onChange={(e) => updateItem(section.id, item.id, 'validityControl', e.target.checked)} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/check:text-slate-600 transition-colors">Controlar Validade</span>
                         </label>
                       )}

                       <label className="flex items-center gap-3 cursor-pointer group/check">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.observationEnabled ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover/check:border-emerald-300'}`}>
                            {item.observationEnabled && <Check size={12} strokeWidth={4} className="text-white" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={item.observationEnabled} onChange={(e) => updateItem(section.id, item.id, 'observationEnabled', e.target.checked)} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/check:text-slate-600 transition-colors">Campo Observação</span>
                       </label>
                    </div>
                    
                    {/* Configuração Específica do Dropdown */}
                    {item.type === 'dropdown_select' && (
                        <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                             <div className="flex items-center gap-6 mb-4">
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name={`source-${item.id}`}
                                        checked={!item.databaseSource}
                                        onChange={() => updateItem(section.id, item.id, 'databaseSource', null)}
                                        className="text-purple-600 focus:ring-purple-500"
                                     />
                                     <span className="text-xs font-bold text-purple-900">Manual</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name={`source-${item.id}`}
                                        checked={!!item.databaseSource}
                                        onChange={() => updateItem(section.id, item.id, 'databaseSource', 'fertilizers')} // Default DB
                                        className="text-purple-600 focus:ring-purple-500"
                                     />
                                     <span className="text-xs font-bold text-purple-900">Banco de Dados</span>
                                 </label>
                             </div>

                             {item.databaseSource ? (
                                <div className="space-y-4">
                                   <div className="relative">
                                       <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                       <select 
                                          value={item.databaseSource}
                                          onChange={(e) => updateItem(section.id, item.id, 'databaseSource', e.target.value)}
                                          className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                       >
                                          <option value="fertilizers">Base de Fertilizantes</option>
                                          <option value="desiccation">Base de Dessecação</option>
                                       </select>
                                   </div>
                                </div>
                             ) : (
                                <div className="pl-4 space-y-3 border-l-2 border-purple-200">
                                   <div className="flex items-center justify-between">
                                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Opções do Dropdown</p>
                                      <button onClick={() => handleAddOption(section.id, item.id)} className="text-[10px] font-black text-purple-600 hover:underline uppercase tracking-widest">Adicionar Opção</button>
                                   </div>
                                   {item.options?.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-4 bg-white p-2 rounded-lg border border-purple-100 shadow-sm">
                                         <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
                                         <input 
                                           type="text" 
                                           value={opt}
                                           onChange={(e) => {
                                             const opts = [...(item.options || [])];
                                             opts[oIdx] = e.target.value;
                                             updateItem(section.id, item.id, 'options', opts);
                                           }}
                                           className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                                         />
                                         <button onClick={() => {
                                           const opts = (item.options || []).filter((_, idx) => idx !== oIdx);
                                           updateItem(section.id, item.id, 'options', opts);
                                         }} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                      </div>
                                   ))}
                                </div>
                             )}
                             
                             {/* Checkbox de Quantidade */}
                             <div className="mt-4 pt-4 border-t border-purple-200/50">
                                <label className="flex items-center gap-3 cursor-pointer group/check">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.askForQuantity ? 'bg-purple-500 border-purple-500' : 'bg-white border-purple-200 group-hover/check:border-purple-300'}`}>
                                    {item.askForQuantity && <Check size={12} strokeWidth={4} className="text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={item.askForQuantity || false} onChange={(e) => updateItem(section.id, item.id, 'askForQuantity', e.target.checked)} />
                                  <span className="text-xs font-bold text-purple-900 group-hover/check:text-purple-700 transition-colors">Exigir Quantidade</span>
                                </label>
                                {item.askForQuantity && (
                                   <p className="text-[10px] text-purple-600 mt-1 pl-8">O usuário verá um campo numérico para preencher a quantidade.</p>
                                )}
                             </div>
                        </div>
                    )}

                    {(item.type === 'single_choice' || item.type === 'multiple_choice') && (
                       <div className="mt-6 pl-8 space-y-3 border-l-2 border-slate-100 ml-2">
                          <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções de Resposta</p>
                             <button onClick={() => handleAddOption(section.id, item.id)} className="text-[10px] font-black text-emerald-500 hover:underline uppercase tracking-widest">Adicionar Opção</button>
                          </div>
                          {item.options?.map((opt, oIdx) => (
                             <div key={oIdx} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-fade-in group/opt">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                <input 
                                  type="text" 
                                  value={opt}
                                  onChange={(e) => {
                                    const opts = [...(item.options || [])];
                                    opts[oIdx] = e.target.value;
                                    updateItem(section.id, item.id, 'options', opts);
                                  }}
                                  className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                                />
                                <button onClick={() => {
                                  const opts = (item.options || []).filter((_, idx) => idx !== oIdx);
                                  updateItem(section.id, item.id, 'options', opts);
                                }} className="opacity-0 group-hover/opt:opacity-100 text-slate-300 hover:text-red-500 transition-all"><X size={14}/></button>
                             </div>
                          ))}
                       </div>
                    )}
                    
                    {item.type === 'property_map' && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center gap-3">
                           <MapIcon size={20} className="text-yellow-600" />
                           <p className="text-xs text-yellow-800 font-bold">O produtor poderá desenhar a propriedade e talhões no mapa.</p>
                        </div>
                    )}

                    {item.type === 'field_selector' && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                           <MousePointer2 size={20} className="text-blue-600" />
                           <p className="text-xs text-blue-800 font-bold">O produtor poderá selecionar talhões previamente cadastrados.</p>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-8 flex justify-end gap-10 z-50">
        <button onClick={() => setMode('select')} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={isSaving} className="px-16 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-emerald-600 transition-all hover:scale-105">
          Publicar Template
        </button>
      </div>
    </div>
  );
};

export default CreateTemplate;