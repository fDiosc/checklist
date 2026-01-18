'use client';

import { useState, useRef } from 'react';
import { Sparkles, List, ArrowLeft, Upload, Command, FileText } from 'lucide-react';

interface AITemplateSelectorProps {
    onSelectManual: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAIComplete: (sections: any[], templateName: string) => void;
}

export default function AITemplateSelector({ onSelectManual, onAIComplete }: AITemplateSelectorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined;

        if ('dataTransfer' in e) {
            e.preventDefault();
            file = e.dataTransfer.files[0];
        } else {
            file = e.target.files?.[0];
        }

        if (!file) return;

        setIsAnalyzing(true);
        try {
            // Convert to Base64
            const base64Content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file as File);
                reader.onload = () => {
                    const result = reader.result as string;
                    const content = result.split(',')[1];
                    resolve(content);
                };
                reader.onerror = error => reject(error);
            });

            // Call API
            const response = await fetch('/api/ai/generate-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileBase64: base64Content,
                    mimeType: file.type
                })
            });

            if (!response.ok) throw new Error('Falha na análise IA');

            const sections = await response.json();

            // Generate basic name from file
            const templateName = file.name.split('.')[0].replace(/_/g, ' ');

            onAIComplete(sections, templateName);

        } catch (error) {
            console.error("AI Error:", error);
            alert("Erro ao processar arquivo. Tente novamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center animate-fade-in text-slate-800">
                <div className="bg-white p-16 rounded-[3rem] shadow-2xl shadow-emerald-100 border border-emerald-50">
                    <div className="relative mb-8 mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-emerald-500 w-24 h-24 rounded-full flex items-center justify-center">
                            <Sparkles size={40} className="text-white animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Analisando Documento</h2>
                    <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                        Nossa Inteligência Artificial está lendo seu arquivo, identificando seções e estruturando o checklist...
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

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-10 animate-fade-in">
            <div className="max-w-5xl w-full">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all mb-8"
                >
                    <ArrowLeft size={16} /> Cancelar e Voltar
                </button>

                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">
                        Como deseja criar seu Checklist?
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">
                        Escolha a melhor forma de estruturar sua auditoria ou inspeção.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Card Manual */}
                    <div
                        onClick={onSelectManual}
                        className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
                    >
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-slate-100 transition-colors">
                            <List size={32} className="text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Manual do Zero</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">
                            Crie seções e itens um por um, configurando cada detalhe manualmente conforme sua necessidade.
                        </p>
                    </div>

                    {/* Card AI */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={() => setDragActive(true)}
                        onDragLeave={() => setDragActive(false)}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            handleFileUpload(e);
                        }}
                        className={`bg-slate-900 p-10 rounded-[3rem] shadow-xl shadow-slate-900/20 border-2 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden ${dragActive ? 'border-emerald-400 scale-[1.02]' : 'border-transparent'}`}
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Sparkles size={120} className="text-white" />
                        </div>

                        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-white/20 transition-colors">
                            <Sparkles size={32} className="text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 relative z-10 tracking-tight">
                            IA Mágica <span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-widest ml-2 align-middle">Novo 2.5</span>
                        </h3>
                        <p className="text-slate-400 leading-relaxed font-medium relative z-10">
                            Envie um PDF, Imagem ou Foto de um checklist físico. A IA irá ler, interpretar e estruturar tudo para você em segundos.
                        </p>

                        <div className="mt-8 flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                                <FileText size={14} /> PDF
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                                <Command size={14} /> DOCX
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                                <Upload size={14} /> IMAGEM
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
