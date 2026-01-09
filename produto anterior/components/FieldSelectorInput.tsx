
import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { PropertyMapData, PropertyField } from '../types';

interface FieldSelectorInputProps {
  producerIdentifier: string;
  value: string[]; // Array of selected Field IDs
  onChange: (val: string[]) => void;
  readOnly?: boolean;
}

const FieldSelectorInput: React.FC<FieldSelectorInputProps> = ({ producerIdentifier, value = [], onChange, readOnly = false }) => {
  // Carregar dados dos produtores do localStorage
  const getProducerFields = (): PropertyField[] => {
    if (!producerIdentifier) return [];
    
    try {
      const allProducers = JSON.parse(localStorage.getItem('merx_producers') || '[]');
      const producer = allProducers.find((p: any) => p.identifier === producerIdentifier);
      
      if (!producer || !producer.savedMaps) return [];
      
      // Extrair todos os talhões de todos os mapas salvos
      return producer.savedMaps.flatMap((map: PropertyMapData) => map.fields);
    } catch (e) {
      console.error("Erro ao carregar dados do produtor", e);
      return [];
    }
  };

  const fields = getProducerFields();

  const toggleField = (fieldId: string) => {
    if (readOnly) return;
    
    if (value.includes(fieldId)) {
      onChange(value.filter(id => id !== fieldId));
    } else {
      onChange([...value, fieldId]);
    }
  };

  if (!producerIdentifier) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
        <div>
           <h4 className="font-bold text-yellow-800 text-sm">Identificação Necessária</h4>
           <p className="text-xs text-yellow-700 mt-1">Para carregar seus talhões, você precisa se identificar no início do formulário.</p>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
         <p className="font-bold text-gray-500 text-sm">Nenhum talhão encontrado para o CPF/Email informado.</p>
         <p className="text-xs text-gray-400 mt-1">Certifique-se de ter preenchido o Cadastro de Propriedade anteriormente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
       <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
         {readOnly ? 'Talhões Selecionados' : 'Selecione os talhões para este checklist:'}
       </p>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(field => {
             const isSelected = value.includes(field.id);
             
             // Em readonly, mostrar apenas os selecionados
             if (readOnly && !isSelected) return null;

             return (
               <div 
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                     isSelected 
                       ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                       : 'bg-white border-gray-100 hover:border-emerald-200'
                  }`}
               >
                  <div className="flex flex-col">
                     <span className={`font-bold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}>
                        {field.name}
                     </span>
                     {field.area && <span className="text-xs text-gray-400">{field.area} ha</span>}
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                     isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-gray-300'
                  }`}>
                     {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );
};

export default FieldSelectorInput;
