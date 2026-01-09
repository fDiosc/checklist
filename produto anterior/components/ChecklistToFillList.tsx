import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronRight,
  ClipboardPen,
  FileText,
  Calendar
} from 'lucide-react';
import { ChecklistTemplate } from '../types';

const ChecklistToFillList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('merx_templates');
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (e) {
        setTemplates([]);
      }
    }
  }, []);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Preencher Checklist</h1>
        <p className="text-gray-500 text-sm mt-1">Selecione um template abaixo para iniciar o preenchimento manual de documentos.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar checklist..." 
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div 
            key={template.id}
            onClick={() => navigate(`/fill/${template.id}`)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ClipboardPen size={64} className="text-emerald-500 transform rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <FileText size={20} />
              </div>
              
              <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-700">{template.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{template.folder}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
                 <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{template.createdAt}</span>
                 </div>
                 <div className="ml-auto flex items-center gap-1 text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    Preencher <ChevronRight size={14} />
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum checklist encontrado.
        </div>
      )}
    </div>
  );
};

export default ChecklistToFillList;