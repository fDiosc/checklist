
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User,
  MapPin,
  List,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { ProducerData } from '../types';
import { useNavigate } from 'react-router-dom';

const ProducerList: React.FC = () => {
  const [producers, setProducers] = useState<ProducerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducer, setExpandedProducer] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedProducers = localStorage.getItem('merx_producers');
    if (storedProducers) {
      try {
        setProducers(JSON.parse(storedProducers));
      } catch (e) {
        console.error("Failed to parse producers");
      }
    }
  }, []);

  const filteredProducers = producers.filter(p => 
    p.identifier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (identifier: string) => {
    if (expandedProducer === identifier) {
      setExpandedProducer(null);
    } else {
      setExpandedProducer(identifier);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Produtores Cadastrados</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie os produtores que interagiram com a plataforma e veja seus históricos.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por CPF ou Email..." 
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredProducers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchTerm ? `Nenhum produtor encontrado para "${searchTerm}"` : "Nenhum produtor cadastrado ainda."}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
             {filteredProducers.map((producer, idx) => (
                <div key={idx} className="transition-colors hover:bg-gray-50">
                   <div 
                      className="p-6 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(producer.identifier)}
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                            <User size={20} />
                         </div>
                         <div>
                            <h3 className="font-bold text-gray-900">{producer.name || producer.identifier}</h3>
                            <p className="text-xs text-gray-500">{producer.identifier}</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            <MapPin size={14} />
                            <span>{producer.savedMaps?.length || 0} Mapas</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            <List size={14} />
                            <span>{producer.checklists?.length || 0} Checklists</span>
                         </div>
                         <button className="text-gray-400">
                            {expandedProducer === producer.identifier ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                         </button>
                      </div>
                   </div>

                   {expandedProducer === producer.identifier && (
                      <div className="px-6 pb-6 pt-0 bg-gray-50/50 border-t border-gray-100 animate-fade-in">
                         <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Checklists List */}
                            <div>
                               <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Checklists Respondidos</h4>
                               {(!producer.checklists || producer.checklists.length === 0) ? (
                                  <p className="text-sm text-gray-400 italic">Nenhum checklist registrado.</p>
                               ) : (
                                  <div className="space-y-2">
                                     {producer.checklists.map((check, cIdx) => (
                                        <div key={cIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center group">
                                           <div>
                                              <p className="font-bold text-gray-800 text-sm">{check.name}</p>
                                              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                                                 <Calendar size={10} />
                                                 <span>Última interação: {check.lastInteraction}</span>
                                              </div>
                                           </div>
                                           <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(`/checklists/${check.id}`);
                                              }}
                                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                              title="Ver Checklist"
                                           >
                                              <ExternalLink size={16} />
                                           </button>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>

                            {/* Maps Info (Simplified) */}
                            <div>
                               <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Propriedades Mapeadas</h4>
                               {(!producer.savedMaps || producer.savedMaps.length === 0) ? (
                                  <p className="text-sm text-gray-400 italic">Nenhum mapa desenhado.</p>
                               ) : (
                                  <div className="space-y-2">
                                     {producer.savedMaps.map((map, mIdx) => (
                                        <div key={mIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                           <div className="flex items-center gap-2 mb-2">
                                              <MapPin size={14} className="text-indigo-500" />
                                              <span className="text-xs font-bold text-gray-700">
                                                 Sede: {map.propertyLocation ? `${map.propertyLocation.lat.toFixed(4)}, ${map.propertyLocation.lng.toFixed(4)}` : 'Não definida'}
                                              </span>
                                           </div>
                                           <div className="text-xs text-gray-500 pl-6">
                                              {map.fields.length} talhões cadastrados
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProducerList;
