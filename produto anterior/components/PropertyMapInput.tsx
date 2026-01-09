
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap, useMapInstance } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Trash2, 
  Navigation, 
  Plus, 
  Pentagon, 
  Upload, 
  Save,
  Check,
  Search,
  Crosshair,
  Loader2,
  Map
} from 'lucide-react';
import { PropertyMapData, GeoPoint, PropertyField } from '../types';

// Fix Leaflet icons
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapInputProps {
  value: string; // JSON stringified PropertyMapData
  onChange?: (val: string) => void;
  readOnly?: boolean;
}

// Interface para resultados de busca
interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

// Componente auxiliar para capturar cliques no mapa
const MapEvents = ({ mode, onMapClick }: { mode: 'view' | 'set_location' | 'draw_field', onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click(e) {
      if (mode !== 'view') {
        onMapClick(e);
      }
    },
  });
  return null;
};

// Componente para centralizar o mapa dinamicamente
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

// Componente para ajustar o zoom automaticamente para mostrar todos os itens (Talhões e Sede)
const AutoFitBounds = ({ data, shouldFit }: { data: PropertyMapData, shouldFit: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!shouldFit) return;
    
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Adiciona sede aos limites
    if (data.propertyLocation) {
      bounds.extend([data.propertyLocation.lat, data.propertyLocation.lng]);
      hasPoints = true;
    }

    // Adiciona todos os pontos dos talhões aos limites
    data.fields.forEach(field => {
      field.points.forEach(point => {
        bounds.extend([point.lat, point.lng]);
        hasPoints = true;
      });
    });

    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [data, shouldFit, map]);

  return null;
};

const PropertyMapInput: React.FC<PropertyMapInputProps> = ({ value, onChange, readOnly = false }) => {
  const [mapData, setMapData] = useState<PropertyMapData>({ fields: [] });
  const [mode, setMode] = useState<'view' | 'set_location' | 'draw_field'>('view');
  
  // Estado para desenho de talhão
  const [currentPolygon, setCurrentPolygon] = useState<GeoPoint[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');
  
  // Controle de Visualização e Busca
  const [center, setCenter] = useState<[number, number]>([-15.7942, -47.8822]); // Brasil Default
  
  // Autocomplete States
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [shouldAutoFit, setShouldAutoFit] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Parse inicial dos dados
  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        setMapData(parsed);
        
        // Se houver dados e estiver abrindo (especialmente readOnly), ajusta o zoom
        if (parsed.fields.length > 0 || parsed.propertyLocation) {
           setShouldAutoFit(true);
        } else {
           // Se não tem dados, tenta pegar geolocalização inicial apenas se não for readonly
           if (!readOnly && navigator.geolocation) {
              handleLocateUser(true); // silent mode
           }
        }
      } else {
         if (!readOnly && navigator.geolocation) {
            handleLocateUser(true); // silent mode
         }
      }
    } catch (e) {
      console.error("Erro ao parsear dados do mapa", e);
    }
  }, [value]);

  // Lógica de Debounce para Autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length > 2) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchSuggestions = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setCenter([lat, lon]);
    setSearchQuery(item.display_name.split(',')[0]); // Mostra apenas o nome principal
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleLocateUser = (silent = false) => {
     if (!navigator.geolocation) {
       if (!silent) alert("Seu navegador não suporta geolocalização.");
       return;
     }

     setIsLocating(true);

     navigator.geolocation.getCurrentPosition(
        (pos) => {
           setCenter([pos.coords.latitude, pos.coords.longitude]);
           setIsLocating(false);
        }, 
        (err) => {
           console.error("Erro GPS", err);
           setIsLocating(false);
           if (!silent) {
             let msg = "Erro ao obter localização.";
             if (err.code === 1) msg = "Permissão de localização negada. Verifique as configurações do navegador.";
             else if (err.code === 2) msg = "Sinal de GPS indisponível.";
             else if (err.code === 3) msg = "Tempo limite esgotado ao tentar obter localização.";
             alert(msg);
           }
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000, // 10 segundos timeout
          maximumAge: 0   // Não usar cache
        }
     );
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;

    if (mode === 'set_location') {
      const newData = { ...mapData, propertyLocation: { lat, lng } };
      setMapData(newData);
      if (onChange) onChange(JSON.stringify(newData));
      setMode('view');
    } else if (mode === 'draw_field') {
      setCurrentPolygon([...currentPolygon, { lat, lng }]);
    }
  };

  const handleSaveField = () => {
    if (!currentFieldName) return alert("Dê um nome ao talhão.");
    if (currentPolygon.length < 3) return alert("Um talhão precisa de pelo menos 3 pontos.");

    const newField: PropertyField = {
      id: Date.now().toString(),
      name: currentFieldName,
      points: currentPolygon
    };

    const newData = { ...mapData, fields: [...mapData.fields, newField] };
    setMapData(newData);
    if (onChange) onChange(JSON.stringify(newData));

    // Reset drawing state
    setCurrentPolygon([]);
    setCurrentFieldName('');
    setMode('view');
  };

  const handleCancelDraw = () => {
    setCurrentPolygon([]);
    setCurrentFieldName('');
    setMode('view');
  };

  const removeField = (id: string) => {
    const newData = { ...mapData, fields: mapData.fields.filter(f => f.id !== id) };
    setMapData(newData);
    if (onChange) onChange(JSON.stringify(newData));
  };

  const removeLocation = () => {
    const newData = { ...mapData, propertyLocation: undefined };
    setMapData(newData);
    if (onChange) onChange(JSON.stringify(newData));
  };

  return (
    <div className="space-y-4">
      {/* Controles Superiores: Busca e Ações */}
      {!readOnly && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col gap-4 shadow-sm relative z-[500]">
          
          {/* Barra de Busca com Autocomplete e GPS */}
          <div className="flex flex-col md:flex-row gap-2 relative">
             <div className="flex-1 relative w-full">
                <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                   // Delay blur to allow clicking on list items
                   onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                   placeholder="Pesquisar endereço, cidade ou fazenda..."
                   className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                {isSearching && <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />}

                {/* Dropdown de Sugestões */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[1000]">
                    {suggestions.map((item) => (
                      <div 
                        key={item.place_id}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors"
                      >
                         <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                         <span className="text-sm text-gray-700 leading-tight">{item.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
             
             <button 
                onClick={() => handleLocateUser(false)}
                disabled={isLocating}
                className="px-4 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                title="Minha Localização"
             >
                {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
                <span className="text-xs font-bold uppercase">{isLocating ? 'Buscando...' : 'Meu Local'}</span>
             </button>
          </div>

          <div className="hidden md:block h-px bg-gray-100 w-full"></div>

          {/* Botões de Ação do Mapa */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
               <button 
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-100 transition-colors border border-gray-200"
                  onClick={() => alert("Simulação: Importar KML/Shapefile")}
               >
                  <Upload size={16} /> <span className="md:hidden">Importar</span> KML
               </button>
               
               {mode === 'view' ? (
                  <>
                     <button 
                        onClick={() => setMode('draw_field')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm"
                     >
                        <Pentagon size={16} /> Desenhar Talhão
                     </button>
                     <button 
                        onClick={() => setMode('set_location')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm"
                     >
                        <MapPin size={16} /> Marcar Sede
                     </button>
                  </>
               ) : (
                  <div className="flex items-center justify-between gap-2 bg-emerald-50 px-4 py-3 md:py-2 rounded-xl border border-emerald-100 animate-fade-in flex-1">
                     <span className="text-xs font-bold text-emerald-700 uppercase">
                        {mode === 'set_location' ? 'Toque no mapa para marcar' : 'Toque para desenhar'}
                     </span>
                     {mode === 'draw_field' && (
                       <button onClick={handleCancelDraw} className="text-gray-400 hover:text-red-500 ml-2 px-2"><Trash2 size={16} /></button>
                     )}
                  </div>
               )}
            </div>

            {mode === 'draw_field' && (
              <div className="flex items-center gap-2 w-full md:w-auto animate-fade-in mt-2 md:mt-0">
                 <input 
                    type="text" 
                    placeholder="Nome do Talhão (Ex: Talhão 01)"
                    value={currentFieldName}
                    onChange={(e) => setCurrentFieldName(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-500 bg-gray-50 w-full md:w-auto"
                 />
                 <button 
                    onClick={handleSaveField}
                    disabled={currentPolygon.length < 3 || !currentFieldName}
                    className="bg-emerald-500 text-white px-4 py-3 rounded-xl hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-200 flex-shrink-0"
                 >
                    <Check size={20} />
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="h-[60vh] md:h-[500px] w-full relative rounded-3xl overflow-hidden border-4 border-white shadow-xl z-0">
        <MapContainer center={center} zoom={13} scrollWheelZoom={false}>
          {/* Camada de Satélite (Esri World Imagery) */}
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {/* Camada de Labels */}
          <TileLayer 
             url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
             opacity={0.6}
          />
          
          <MapUpdater center={center} />
          <AutoFitBounds data={mapData} shouldFit={shouldAutoFit} />
          {!readOnly && <MapEvents mode={mode} onMapClick={handleMapClick} />}

          {/* Renderizar Sede */}
          {mapData.propertyLocation && (
            <Marker position={[mapData.propertyLocation.lat, mapData.propertyLocation.lng]}>
               {/* Popup info could go here */}
            </Marker>
          )}

          {/* Renderizar Talhões Salvos */}
          {mapData.fields.map(field => (
            <Polygon 
               key={field.id}
               positions={field.points.map(p => [p.lat, p.lng])}
               pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.2, weight: 2 }}
            />
          ))}

          {/* Renderizar Talhão sendo desenhado */}
          {currentPolygon.length > 0 && (
             <Polygon 
                positions={currentPolygon.map(p => [p.lat, p.lng])}
                pathOptions={{ color: 'white', dashArray: '5, 10', fillColor: 'white', fillOpacity: 0.1 }}
             />
          )}

          {/* Renderizar Pontos do desenho atual para feedback visual */}
          {currentPolygon.map((p, idx) => (
             <Marker key={idx} position={[p.lat, p.lng]} opacity={0.6}></Marker>
          ))}

        </MapContainer>

        {/* Legenda Flutuante */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg z-[400] max-w-[200px]">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Legenda</h4>
           <div className="space-y-2">
              <div className="flex items-center gap-2">
                 <MapPin size={14} className="text-blue-500" />
                 <span className="text-xs font-bold text-gray-700">Sede {mapData.propertyLocation ? '(Definida)' : '(N/A)'}</span>
                 {!readOnly && mapData.propertyLocation && (
                    <button onClick={removeLocation} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                 )}
              </div>
              {mapData.fields.length > 0 && (
                 <div className="pt-2 border-t border-gray-200 max-h-40 overflow-y-auto">
                    {mapData.fields.map(field => (
                       <div key={field.id} className="flex items-center gap-2 mb-1">
                          <Pentagon size={14} className="text-yellow-500" />
                          <span className="text-xs font-medium text-gray-600 truncate">{field.name}</span>
                          {!readOnly && (
                             <button onClick={() => removeField(field.id)} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                          )}
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
        
        {/* Controle ReadOnly de Zoom (botão flutuante para re-centrar) */}
        {readOnly && (mapData.fields.length > 0 || mapData.propertyLocation) && (
           <div className="absolute bottom-4 right-4 z-[400]">
              <button 
                 onClick={() => setShouldAutoFit(true)} // Retrigger fit
                 className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-emerald-500 transition-colors"
                 title="Centralizar na Propriedade"
              >
                 <Crosshair size={20} />
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMapInput;