
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Layers,
  Send,
  AlertCircle,
  Loader2,
  Check,
  AlignLeft,
  Type,
  List,
  CheckSquare,
  MessageSquare,
  Camera,
  X,
  RefreshCcw,
  AlertTriangle,
  Paperclip,
  Map as MapIcon,
  MousePointer2,
  User,
  Sprout,
  ChevronDown,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DocumentStatus, DocumentItem, ChecklistSection, ProducerData, PropertyMapData, PropertyField } from '../types';
import PropertyMapInput from './PropertyMapInput';
import FieldSelectorInput from './FieldSelectorInput';

// --- BASES DE DADOS ---
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

const ChecklistSubmission: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // States do Template
  const [templateName, setTemplateName] = useState('Checklist');
  const [baseSections, setBaseSections] = useState<ChecklistSection[]>([]);
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  
  // States de Controle de Fluxo
  const [currentStep, setCurrentStep] = useState<'identification' | 'scope_selection' | 'filling'>('identification');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // States de Identificação e Escopo
  const [producerIdentifier, setProducerIdentifier] = useState('');
  const [requiresIdentification, setRequiresIdentification] = useState(false);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  
  // States de Formulário
  const [tempAnswer, setTempAnswer] = useState<any>(''); 
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [tempObservation, setTempObservation] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isInternalView = location.pathname.includes('/fill/');

  // Initial Load
  useEffect(() => {
    const storedTemplates = JSON.parse(localStorage.getItem('merx_templates') || '[]');
    const currentTemplate = storedTemplates.find((t: any) => t.id === id);

    if (currentTemplate) {
      setTemplateName(currentTemplate.name);
      
      // Armazena a estrutura base original
      const loadedSections = currentTemplate.sections || [];
      setBaseSections(loadedSections);
      
      // Inicialmente, as seções exibidas são as base (serão regeneradas se houver seleção de escopo)
      setSections(loadedSections);
      
      const reqId = currentTemplate.requiresProducerIdentification || false;
      setRequiresIdentification(reqId);
      
      // Determina passo inicial
      if (reqId) {
        setCurrentStep('identification');
      } else {
        // Se não precisa identificar, vai direto pro preenchimento
        // (Nota: Se houver seções dinâmicas mas sem login, elas não funcionam. 
        // O CreateTemplate força login se ativar seções dinâmicas)
        setCurrentStep('filling');
      }

      // Seleciona o primeiro item se já estiver na fase de preenchimento (caso sem login)
      // On mobile we start with the list, not a selected item
      if (!reqId && loadedSections.length > 0 && window.innerWidth >= 768) {
        const firstItem = loadedSections[0].items?.[0];
        if (firstItem) selectItem(firstItem);
      }
      
      setIsInitialized(true);
    }
  }, [id]);

  // Sync com LocalStorage (apenas quando updates acontecem na fase de filling)
  useEffect(() => {
    if (isInitialized && currentStep === 'filling' && sections.length > 0 && id) {
      // Nota: Salvar estruturas dinâmicas complexas no localStorage do template "mestre" pode ser perigoso
      // Idealmente salvaríamos em uma "Submission", mas para este protótipo, vamos salvar.
      // CUIDADO: Isso vai sobrescrever o template com os talhões específicos deste preenchimento.
      // Para o protótipo, assumimos que isso é o comportamento desejado (persistence stateful)
      const stored = JSON.parse(localStorage.getItem('merx_templates') || '[]');
      localStorage.setItem('merx_templates', JSON.stringify(stored.map((t: any) => t.id === id ? { ...t, sections } : t)));
    }
  }, [sections, id, isInitialized, currentStep]);

  // Camera hook
  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
        setCameraError("Falha ao reproduzir o vídeo da câmera.");
      });
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isCameraActive, cameraStream]);

  const allDocs = sections.flatMap(s => s.items);
  const selectedDoc = allDocs.find(d => d.id === selectedDocId);

  const selectItem = (doc: DocumentItem) => {
    setSelectedDocId(doc.id);
    setTempAnswer(doc.answer || (doc.type === 'multiple_choice' || doc.type === 'field_selector' ? [] : ''));
    setTempQuantity(doc.quantity || '');
    setTempObservation(doc.observationValue || '');
    setSelectedFile(null);
    closeCamera();
  }

  const handleSelectDoc = (docId: string) => {
    const doc = allDocs.find(d => d.id === docId);
    if(doc) selectItem(doc);
  };

  const handleNextItem = () => {
    const currentIndex = allDocs.findIndex(d => d.id === selectedDocId);
    if (currentIndex >= 0 && currentIndex < allDocs.length - 1) {
      selectItem(allDocs[currentIndex + 1]);
    } else {
      // Loop back or just close? Close for mobile feel
      setSelectedDocId(null);
    }
  };

  const handlePrevItem = () => {
    const currentIndex = allDocs.findIndex(d => d.id === selectedDocId);
    if (currentIndex > 0) {
      selectItem(allDocs[currentIndex - 1]);
    }
  };

  // --- Logic for Dynamic Section Generation ---
  const generateDynamicSections = (fieldIds: string[]) => {
      // 1. Obter detalhes dos talhões selecionados
      const allProducers = JSON.parse(localStorage.getItem('merx_producers') || '[]');
      const producer = allProducers.find((p: any) => p.identifier === producerIdentifier);
      const allFields: PropertyField[] = producer ? producer.savedMaps.flatMap((m: PropertyMapData) => m.fields) : [];
      const selectedFields = allFields.filter(f => fieldIds.includes(f.id));

      const newSections: ChecklistSection[] = [];

      baseSections.forEach(section => {
          if (section.iterateOverFields && selectedFields.length > 0) {
              // Replica a seção para cada talhão
              selectedFields.forEach(field => {
                  // Deep copy da seção
                  const clonedSection: ChecklistSection = JSON.parse(JSON.stringify(section));
                  
                  // Modifica ID e Nome da Seção
                  clonedSection.id = `${section.id}::${field.id}`;
                  clonedSection.name = `${section.name} - ${field.name}`;
                  
                  // Modifica IDs dos itens para serem únicos
                  clonedSection.items = clonedSection.items.map(item => ({
                      ...item,
                      id: `${item.id}::${field.id}`,
                      // Limpa respostas ao gerar (ou poderia tentar recuperar de um save anterior)
                      status: item.status // Mantém status se já salvo no base, mas idealmente seria resetado para novas gerações
                  }));

                  newSections.push(clonedSection);
              });
          } else {
              // Seção normal, mantém
              newSections.push(section);
          }
      });

      setSections(newSections);
      
      // Seleciona o primeiro item da nova estrutura se for Desktop
      if (window.innerWidth >= 768 && newSections.length > 0 && newSections[0].items.length > 0) {
          selectItem(newSections[0].items[0]);
      }
  };

  const registerProducerInteraction = () => {
    if (!producerIdentifier || !id) return;
    const allProducers: ProducerData[] = JSON.parse(localStorage.getItem('merx_producers') || '[]');
    let producerIndex = allProducers.findIndex(p => p.identifier === producerIdentifier);
    
    // Create if not exists
    if (producerIndex === -1) {
        allProducers.push({ 
            identifier: producerIdentifier, 
            savedMaps: [],
            checklists: []
        });
        producerIndex = allProducers.length - 1;
    }
    
    // Update checklist history
    const producer = allProducers[producerIndex];
    if (!producer.checklists) producer.checklists = []; // Safety check for old data
    
    const checklistEntryIndex = producer.checklists.findIndex(c => c.id === id);
    if (checklistEntryIndex >= 0) {
        producer.checklists[checklistEntryIndex].lastInteraction = new Date().toLocaleDateString('pt-BR');
        producer.checklists[checklistEntryIndex].name = templateName; // Update name in case it changed
    } else {
        producer.checklists.push({
            id: id,
            name: templateName,
            lastInteraction: new Date().toLocaleDateString('pt-BR')
        });
    }
    
    allProducers[producerIndex] = producer;
    localStorage.setItem('merx_producers', JSON.stringify(allProducers));
  };

  const handleIdentificationSubmit = () => {
      if(producerIdentifier.length < 3) return alert("Identificador inválido");
      
      registerProducerInteraction();

      // Verifica se o template tem seções iteráveis
      const hasIteratableSections = baseSections.some(s => s.iterateOverFields);
      
      if (hasIteratableSections) {
          setCurrentStep('scope_selection');
      } else {
          setCurrentStep('filling');
      }
  };

  const handleScopeSubmit = () => {
      if (selectedFieldIds.length === 0) return alert("Selecione pelo menos um talhão.");
      
      generateDynamicSections(selectedFieldIds);
      setCurrentStep('filling');
  };

  // --- Persistence Logic ---
  const saveProducerMapData = (mapData: PropertyMapData) => {
     if (!producerIdentifier) return;
     const allProducers: ProducerData[] = JSON.parse(localStorage.getItem('merx_producers') || '[]');
     const producerIndex = allProducers.findIndex(p => p.identifier === producerIdentifier);
     
     // Note: registerProducerInteraction usually runs first, so producer should exist, but being safe
     if (producerIndex >= 0) {
        const producer = allProducers[producerIndex];
        producer.savedMaps.push(mapData);
        allProducers[producerIndex] = producer;
     } else {
        allProducers.push({ 
            identifier: producerIdentifier, 
            savedMaps: [mapData],
            checklists: [] // Will be populated if this func is called from context of checklist
        });
     }
     localStorage.setItem('merx_producers', JSON.stringify(allProducers));
  };

  // --- Camera Logic ---
  const startCamera = async () => { /* ... existing ... */ 
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        setCameraStream(stream);
        setIsCameraActive(true);
      } catch (err: any) {
         setCameraError("Erro ao acessar câmera.");
         setIsCameraActive(true);
      }
  };
  const closeCamera = () => {
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
  };
  const capturePhoto = () => { /* ... existing ... */ 
      if (videoRef.current && canvasRef.current) {
          const v = videoRef.current;
          const c = canvasRef.current;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          if(ctx) {
              ctx.drawImage(v, 0, 0);
              c.toBlob(b => {
                  if(b) {
                      setSelectedFile(new File([b], `foto_${Date.now()}.jpg`, {type: 'image/jpeg'}));
                      closeCamera();
                  }
              }, 'image/jpeg');
          }
      }
  };

  const handleSubmitItem = () => {
    if (!selectedDoc) return;
    setIsUploading(true);
    
    // Ensure producer is tracked when saving items too, just in case
    if (producerIdentifier) registerProducerInteraction();

    setTimeout(() => {
      let finalAnswer = tempAnswer;
      let fileUrl = selectedDoc.fileUrl;

      if (selectedDoc.type === 'file') finalAnswer = selectedFile?.name || tempAnswer;
      if (selectedFile) fileUrl = selectedFile.name;

      if (selectedDoc.type === 'property_map' && typeof finalAnswer === 'string' && producerIdentifier) {
          try {
             const mapData = JSON.parse(finalAnswer);
             if (mapData.fields && mapData.fields.length > 0) saveProducerMapData(mapData);
          } catch (e) { }
      }

      setSections(sections.map(s => ({
        ...s,
        items: s.items.map(i => i.id === selectedDoc.id ? {
          ...i,
          status: DocumentStatus.PENDING_VERIFICATION,
          lastUpdate: new Date().toLocaleDateString('pt-BR'),
          answer: finalAnswer,
          quantity: tempQuantity, // Salva a quantidade
          fileUrl: fileUrl,
          observationValue: tempObservation,
          rejectionReason: ''
        } : i)
      })));
      setIsUploading(false);
      setSelectedFile(null);
      // Auto advance handled by user now or we can auto advance
      // handleNextItem(); // Optional: Auto advance
    }, 800);
  };

  // --- Render Functions (Camera, Upload, Input) ---
  const renderCamera = (isCompact = false) => (
      <div className={`relative w-full ${isCompact ? 'h-full' : 'bg-black rounded-[2.5rem] overflow-hidden aspect-video shadow-2xl'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8 z-20">
          <button onClick={closeCamera} className="w-14 h-14 rounded-full bg-black/40 text-white flex items-center justify-center"><X size={24} /></button>
          <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"><div className="w-16 h-16 bg-white rounded-full"></div></button>
        </div>
      </div>
  );

  const renderFileUpload = (compact = false) => {
      if (compact) {
          return (
            <div className="mt-6 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                 {!isCameraActive ? (
                     <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                           <Paperclip size={18} />
                           <span className="text-xs font-black uppercase tracking-widest">Anexar Comprovante</span>
                        </div>
                        {selectedFile ? (
                           <div className="flex items-center gap-3 bg-emerald-100 px-4 py-2 rounded-full text-emerald-700">
                              <Check size={16} /><span className="text-sm font-bold">{selectedFile.name}</span>
                              <button onClick={() => setSelectedFile(null)} className="ml-2"><X size={14}/></button>
                           </div>
                        ) : (
                           <div className="flex gap-3">
                                <button onClick={() => fileInputRef.current?.click()} className="bg-white border px-4 py-2 rounded-xl text-xs font-bold">Arquivo</button>
                                <button onClick={startCamera} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold flex gap-1"><Camera size={14} /> Foto</button>
                           </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} />
                     </div>
                 ) : <div className="h-64 relative rounded-2xl overflow-hidden bg-black">{renderCamera(true)}</div>}
            </div>
          )
      }
      return (
          <div className="space-y-6">
            {!isCameraActive ? (
              <div className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center ${selectedFile ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100'}`}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} />
                <div className="flex flex-col items-center gap-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${selectedFile ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-500'}`}>
                    {selectedFile ? <Check size={32} /> : <Upload size={32} />}
                  </div>
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Carregar Documento'}</h3>
                  <div className="flex gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">Selecionar Arquivo</button>
                    <button onClick={startCamera} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2"><Camera size={14} /> Câmera</button>
                  </div>
                </div>
              </div>
            ) : renderCamera()}
          </div>
      );
  };

  const renderInput = () => {
    if (!selectedDoc) return null;
    switch (selectedDoc.type) {
      case 'file': return renderFileUpload(false);
      
      case 'dropdown_select': {
          let options: string[] = [];
          let currentUnit = '';

          // Determinar opções baseado na fonte
          if (selectedDoc.databaseSource === 'fertilizers') {
              options = DATABASE_FERTILIZERS.map(i => i.product);
          } else if (selectedDoc.databaseSource === 'desiccation') {
              options = DATABASE_DESICCATION.map(i => i.product);
          } else {
              options = selectedDoc.options || [];
          }

          // Determinar unidade se algo estiver selecionado
          if (selectedDoc.databaseSource && tempAnswer) {
              const db = selectedDoc.databaseSource === 'fertilizers' ? DATABASE_FERTILIZERS : DATABASE_DESICCATION;
              const item = db.find(i => i.product === tempAnswer);
              if (item) currentUnit = item.unit;
          }

          return (
             <div className="space-y-6">
                <div className="relative">
                   <select 
                      value={tempAnswer}
                      onChange={(e) => setTempAnswer(e.target.value)}
                      className="w-full appearance-none p-6 bg-gray-50 border-none rounded-2xl text-xl font-bold outline-none shadow-inner pr-12"
                   >
                      <option value="">Selecione uma opção...</option>
                      {options.map((opt, i) => (
                         <option key={i} value={opt}>{opt}</option>
                      ))}
                   </select>
                   <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={24} />
                </div>

                {/* Campo de Quantidade Condicional */}
                {selectedDoc.askForQuantity && tempAnswer && (
                   <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-fade-in">
                       <label className="block text-xs font-black text-purple-800 uppercase tracking-widest mb-2">
                           Quantidade {currentUnit ? `(${currentUnit})` : ''}
                       </label>
                       <div className="flex items-center gap-2">
                          <input 
                             type="number" 
                             value={tempQuantity}
                             onChange={(e) => setTempQuantity(e.target.value)}
                             placeholder="0.00"
                             className="flex-1 p-4 bg-white border-2 border-purple-200 rounded-xl font-bold text-lg outline-none focus:border-purple-500 text-purple-900"
                          />
                          {currentUnit && (
                             <span className="text-purple-600 font-bold px-4">{currentUnit}</span>
                          )}
                       </div>
                   </div>
                )}
             </div>
          );
      }

      case 'single_choice': return (
          <div className="space-y-6">
            <div className="space-y-3">
                {selectedDoc.options?.map((opt, i) => (
                <label key={i} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer ${tempAnswer === opt ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tempAnswer === opt ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{tempAnswer === opt && <div className="w-2 h-2 rounded-full bg-white"></div>}</div>
                    <input type="radio" className="hidden" name="single" value={opt} checked={tempAnswer === opt} onChange={(e) => setTempAnswer(e.target.value)} />
                    <span className={`font-bold ${tempAnswer === opt ? 'text-emerald-900' : 'text-gray-600'}`}>{opt}</span>
                </label>
                ))}
            </div>
            {selectedDoc.requestArtifact && <div className={`transition-all ${tempAnswer === 'Sim' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>{renderFileUpload(true)}</div>}
          </div>
      );
      case 'multiple_choice': return (
          <div className="space-y-3">
            {selectedDoc.options?.map((opt, i) => {
              const isChecked = Array.isArray(tempAnswer) && tempAnswer.includes(opt);
              return (
                <label key={i} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer ${isChecked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100'}`}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${isChecked ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{isChecked && <Check size={14} className="text-white" />}</div>
                  <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => { const c = Array.isArray(tempAnswer) ? tempAnswer : []; setTempAnswer(e.target.checked ? [...c, opt] : c.filter((v:any) => v !== opt)); }} />
                  <span className={`font-bold ${isChecked ? 'text-emerald-900' : 'text-gray-600'}`}>{opt}</span>
                </label>
              );
            })}
          </div>
      );
      case 'date': return <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100"><input type="date" value={tempAnswer} onChange={(e) => setTempAnswer(e.target.value)} className="w-full p-4 border-2 border-white bg-white rounded-2xl outline-none text-xl font-black text-gray-800" /></div>;
      case 'long_text': return <textarea value={tempAnswer} onChange={(e) => setTempAnswer(e.target.value)} className="w-full h-64 p-8 bg-gray-50 border-none rounded-[2rem] text-xl font-medium outline-none resize-none" placeholder="Digite sua resposta detalhada..." />;
      case 'property_map': return <PropertyMapInput value={typeof tempAnswer === 'string' ? tempAnswer : ''} onChange={(val) => setTempAnswer(val)} />;
      case 'field_selector': return <FieldSelectorInput producerIdentifier={producerIdentifier} value={Array.isArray(tempAnswer) ? tempAnswer : []} onChange={(val) => setTempAnswer(val)} />;
      default: return <input type="text" value={tempAnswer} onChange={(e) => setTempAnswer(e.target.value)} className="w-full p-6 bg-gray-50 border-none rounded-2xl text-xl font-bold outline-none" placeholder="Digite sua resposta..." />;
    }
  };

  // --- Views ---

  if (currentStep === 'identification' && isInitialized) {
     return (
        <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-8 animate-fade-in">
           <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-emerald-100 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <User size={32} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Identificação</h1>
              <p className="text-gray-500 mb-8">Informe seu CPF ou Email para iniciar.</p>
              <input type="text" placeholder="CPF ou Email" value={producerIdentifier} onChange={(e) => setProducerIdentifier(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl mb-6 font-bold text-center outline-none focus:border-emerald-500" />
              <button onClick={handleIdentificationSubmit} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200">Iniciar</button>
           </div>
        </div>
     );
  }

  if (currentStep === 'scope_selection') {
      return (
         <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-8 animate-fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-indigo-100 max-w-2xl w-full">
               <div className="text-center mb-10">
                   <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Sprout size={32} className="text-indigo-500" />
                   </div>
                   <h1 className="text-2xl font-black text-gray-900 mb-2">Seleção de Talhões</h1>
                   <p className="text-gray-500">Este checklist requer dados específicos por talhão. Selecione quais áreas você deseja reportar agora.</p>
               </div>
               
               <div className="mb-10 max-h-[400px] overflow-y-auto">
                   <FieldSelectorInput 
                      producerIdentifier={producerIdentifier}
                      value={selectedFieldIds}
                      onChange={setSelectedFieldIds}
                   />
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setCurrentStep('identification')} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200">Voltar</button>
                  <button onClick={handleScopeSubmit} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200">Confirmar e Iniciar</button>
               </div>
            </div>
         </div>
      );
  }

  // --- Main Filling View ---
  return (
    <div className="h-full bg-gray-50 flex flex-col">
       <header className="bg-white px-4 md:px-10 py-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm border-b border-gray-100 flex-shrink-0 gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
             <div className="flex items-center gap-4">
                {isInternalView && <button onClick={() => navigate('/fill')} className="p-2 md:p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><ArrowLeft size={24}/></button>}
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-none truncate max-w-[200px] md:max-w-none">{templateName}</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase mt-1 md:mt-2 tracking-[0.2em]">
                    {isInternalView ? 'Preenchimento Interno' : 'Portal do Produtor'}
                    </p>
                </div>
             </div>
             
             {/* Mobile Progress */}
             <div className="md:hidden flex flex-col items-end">
                <span className="text-xs font-black text-emerald-500">{allDocs.filter(d => d.status !== DocumentStatus.MISSING).length}/{allDocs.length}</span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(allDocs.filter(d => d.status !== DocumentStatus.MISSING).length / allDocs.length) * 100}%` }}></div>
                </div>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
             <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status de Conclusão</p>
                <div className="flex items-center gap-3">
                   <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(allDocs.filter(d => d.status !== DocumentStatus.MISSING).length / allDocs.length) * 100}%` }}></div>
                   </div>
                   <p className="text-sm font-black text-emerald-500">{allDocs.filter(d => d.status !== DocumentStatus.MISSING).length}/{allDocs.length}</p>
                </div>
             </div>
          </div>
       </header>

       <div className="flex-1 min-h-0 w-full md:p-6 flex flex-col md:flex-row md:gap-8 overflow-hidden relative">
           
           {/* Sidebar / List View - Hidden on Mobile when Item Selected */}
           <div className={`
              flex-1 md:flex-none md:w-1/3 bg-slate-50 md:rounded-[2.5rem] md:shadow-xl md:shadow-gray-200/50 md:border md:border-gray-100 overflow-y-auto pb-20 md:pb-10
              ${selectedDocId ? 'hidden md:block' : 'block'}
           `}>
               {sections.map(section => (
                 <div key={section.id} className="mb-1 md:mb-4">
                    <div className="bg-white md:bg-slate-900 px-6 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm border-b border-gray-100 md:border-t md:border-slate-800 md:first:border-0">
                       <div className="flex items-center gap-3 md:text-white">
                          <Layers size={16} className="text-emerald-500 md:text-emerald-400" />
                          <span className="text-xs md:text-[10px] font-bold md:font-black uppercase tracking-wider md:tracking-[0.25em] text-slate-900 md:text-white">{section.name}</span>
                       </div>
                       <div className="bg-emerald-100 md:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-200 md:border-emerald-500/30 text-[10px] md:text-[8px] font-bold md:font-black text-emerald-700 md:text-emerald-400 uppercase tracking-tighter">
                          {section.items.length} itens
                       </div>
                    </div>
                    
                    <div className="bg-white">
                       {section.items.map(doc => {
                         const hasAnswer = doc.status !== DocumentStatus.MISSING;
                         return (
                           <div key={doc.id} onClick={() => handleSelectDoc(doc.id)} className={`p-6 cursor-pointer active:bg-gray-50 md:hover:bg-emerald-50 transition-all flex justify-between items-center border-b border-slate-50 relative ${selectedDocId === doc.id ? 'bg-emerald-50' : ''}`}>
                              {selectedDocId === doc.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-r-full hidden md:block" />}
                              <div className="flex flex-col gap-1.5">
                                 <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold md:font-black tracking-tight ${selectedDocId === doc.id ? 'text-emerald-900' : 'text-slate-700'}`}>{doc.name}</span>
                                    {doc.required && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Obrigatório"></span>}
                                 </div>
                                 <span className="text-[10px] md:text-[9px] text-slate-400 font-bold md:font-black uppercase tracking-widest">{doc.type.replace('_', ' ')}</span>
                              </div>
                              <div className={`flex-shrink-0 ml-4`}>
                                 {hasAnswer ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                       <Check size={14} strokeWidth={3} />
                                    </div>
                                 ) : (
                                    <ChevronRight size={20} className="text-gray-300" />
                                 )}
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
               ))}
           </div>

           {/* Workspace / Detail View - Full Screen on Mobile when Item Selected */}
           <div className={`
              fixed inset-0 z-20 bg-white md:static md:flex-1 md:bg-white md:rounded-[2.5rem] md:shadow-xl md:shadow-gray-200/50 md:border md:border-gray-100 flex flex-col
              ${selectedDocId ? 'flex animate-slide-up md:animate-none' : 'hidden md:flex'}
           `}>
               {/* Mobile Header for Detail View */}
               <div className="md:hidden px-4 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
                  <button onClick={() => setSelectedDocId(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-600">
                     <ArrowLeft size={24} />
                  </button>
                  <span className="font-bold text-gray-900 truncate flex-1">Preencher Item</span>
               </div>

               <div className="flex-1 overflow-y-auto p-6 md:p-12">
                   {selectedDoc ? (
                       <div className="max-w-3xl animate-fade-in pb-20 mx-auto">
                           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                              <div>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest">{selectedDoc.type.replace('_', ' ')}</span>
                                <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight mt-3">{selectedDoc.name}</h2>
                                {producerIdentifier && <p className="text-xs text-emerald-600 mt-2 font-bold">Identificado como: {producerIdentifier}</p>}
                              </div>
                              {selectedDoc.required && <span className="self-start md:self-auto bg-red-50 text-red-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">Obrigatório</span>}
                           </div>
                           
                           {selectedDoc.status === DocumentStatus.REJECTED && (
                              <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 md:p-8 mb-10 flex gap-6 items-start animate-bounce-slow">
                                 <div className="bg-red-500 p-2 rounded-xl text-white flex-shrink-0"><AlertCircle size={24} /></div>
                                 <div>
                                    <h4 className="font-black text-red-900 text-xs uppercase tracking-[0.2em] mb-2">Reenvio Necessário</h4>
                                    <p className="text-sm md:text-base text-red-700 font-medium leading-relaxed">{selectedDoc.rejectionReason || 'Por favor, revise os dados.'}</p>
                                 </div>
                              </div>
                           )}

                           {selectedDoc.status === DocumentStatus.APPROVED ? (
                              <div className="bg-emerald-50 rounded-[3rem] p-10 md:p-20 text-center border-4 border-emerald-100/50">
                                 <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-200"><Check size={40} className="text-white" strokeWidth={4} /></div>
                                 <h3 className="text-emerald-900 font-black text-2xl md:text-3xl uppercase tracking-wider">Item Validado</h3>
                                 <p className="text-emerald-700 font-bold mt-4 opacity-70">A equipe de compliance já aprovou esta resposta.</p>
                              </div>
                           ) : (
                              <div className="space-y-10">
                                 <div className="min-h-[200px]">{renderInput()}</div>
                                 {selectedDoc.observationEnabled && (
                                   <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-gray-100 shadow-sm animate-fade-in hover:border-emerald-200">
                                      <div className="flex items-center gap-3 mb-4 text-gray-400"><MessageSquare size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Observações Adicionais</span></div>
                                      <textarea value={tempObservation} onChange={(e) => setTempObservation(e.target.value)} placeholder="Comentários sobre este item?" className="w-full h-32 bg-gray-50 border-none rounded-2xl p-4 md:p-6 font-medium outline-none resize-none shadow-inner" />
                                   </div>
                                 )}
                                 <div className="pt-6 pb-12 md:pb-0">
                                    <button onClick={handleSubmitItem} disabled={isUploading || ((!selectedFile && !tempAnswer && (Array.isArray(tempAnswer) ? tempAnswer.length === 0 : true) && selectedDoc.type !== 'multiple_choice' && !tempObservation) && selectedDoc.type !== 'property_map')} className="w-full bg-emerald-500 text-white py-5 md:py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-xs md:text-sm hover:bg-emerald-600 shadow-2xl shadow-emerald-100 disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-transform">
                                      {isUploading ? <><Loader2 size={24} className="animate-spin" /> Salvando...</> : <><Send size={18}/> Salvar Resposta</>}
                                    </button>
                                 </div>
                              </div>
                           )}
                       </div>
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-gray-100">
                          <Layers size={80} md:size={120} className="opacity-10 mb-6"/>
                          <p className="font-black uppercase tracking-[0.2em] md:tracking-[0.5em] text-xs md:text-sm text-center px-8">Selecione um item da lista para começar o preenchimento</p>
                       </div>
                   )}
               </div>

               {/* Mobile Footer Navigation */}
               {selectedDoc && (
                  <div className="md:hidden border-t border-gray-100 p-4 bg-white flex justify-between items-center gap-4 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                      <button onClick={handlePrevItem} className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                         <ArrowLeft size={16} /> Anterior
                      </button>
                      <button onClick={handleNextItem} className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                         Próximo <ArrowRight size={16} />
                      </button>
                  </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default ChecklistSubmission;