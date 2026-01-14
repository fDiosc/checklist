'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { PropertyMapData, GeoPoint, PropertyField } from '@/types/checklist';
import { calculateAreaInHectares } from '@/lib/geo';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });

import MapEventsHandler from './MapEventsHandler';

// No top-level Leaflet import to avoid SSR issues
let vertexIcon: any = null;
if (typeof window !== 'undefined') {
    const L = require('leaflet');
    vertexIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#4f46e5; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);'></div>",
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

interface PropertyMapInputProps {
    value: string;
    onChange?: (val: string) => void;
    readOnly?: boolean;
    mapId?: string;
    hideEsg?: boolean;
}

interface SearchResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
}

const PropertyMapInput: React.FC<PropertyMapInputProps> = ({ value, onChange, readOnly = false, mapId, hideEsg = false }) => {
    const [mapData, setMapData] = useState<PropertyMapData>({ fields: [] });
    const [mode, setMode] = useState<'view' | 'set_location' | 'draw_field'>('view');
    const [currentPolygon, setCurrentPolygon] = useState<GeoPoint[]>([]);
    const [currentFieldName, setCurrentFieldName] = useState('');
    const [center, setCenter] = useState<[number, number]>([-15.7942, -47.8822]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [carPolygon, setCarPolygon] = useState<GeoPoint[]>([]);
    const [isLoadingCAR, setIsLoadingCAR] = useState(false);
    const [isInfoExpanded, setIsInfoExpanded] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        try {
            if (value) {
                const parsed = JSON.parse(value);
                setMapData(parsed);
                if (parsed.propertyLocation) {
                    setCenter([parsed.propertyLocation.lat, parsed.propertyLocation.lng]);
                }

                // Load CAR data if exists
                if (parsed.carData?.geoJson) {
                    const car = parsed.carData;
                    let points: GeoPoint[] = [];

                    if (car.geoJson.type === 'Polygon') {
                        const ring = car.geoJson.coordinates[0];
                        points = ring.map((p: any) => ({ lat: p[1], lng: p[0] }));
                    } else if (car.geoJson.type === 'MultiPolygon') {
                        const polygon = car.geoJson.coordinates[0];
                        const ring = polygon[0];
                        points = ring.map((p: any) => ({ lat: p[1], lng: p[0] }));
                    }
                    setCarPolygon(points);
                }
            }
        } catch (e) {
            console.error("Error parsing map data", e);
        }
    }, [value]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.length > 2) fetchSuggestions();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);



    const fetchSuggestions = async () => {
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
            setSuggestions(await response.json());
            setShowSuggestions(true);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLocateUser = () => {
        if (!navigator.geolocation) return alert("GPS not supported");
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCenter([pos.coords.latitude, pos.coords.longitude]);
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true }
        );
    };

    const saveToProducerHistory = (data: PropertyMapData) => {
        const identifier = localStorage.getItem('merx_producer_identifier');
        if (!identifier) return;

        const allProducers = JSON.parse(localStorage.getItem('merx_producers') || '[]');
        let pIdx = allProducers.findIndex((p: any) => p.identifier === identifier);

        if (pIdx === -1) {
            allProducers.push({ identifier, savedMaps: [data], checklists: [] });
        } else {
            allProducers[pIdx].savedMaps = [...(allProducers[pIdx].savedMaps || []), data];
        }
        localStorage.setItem('merx_producers', JSON.stringify(allProducers));
    };

    const fetchReverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const address = data.address;
            const city = address.city || address.town || address.village || address.municipality || address.suburb || '';
            const state = address.state || '';
            return { city, state };
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            return { city: '', state: '' };
        }
    };

    const fetchCAR = async (lat: number, lng: number) => {
        setIsLoadingCAR(true);
        try {
            const response = await fetch(`/api/integration/car?latitude=${lat}&longitude=${lng}`);
            if (!response.ok) throw new Error('Falha ao buscar CAR');

            const data = await response.json();

            if (data && data.length > 0) {
                const car = data[0];
                const newData: PropertyMapData = {
                    ...mapData,
                    propertyLocation: { lat, lng },
                    carCode: car.cod_imovel,
                    carData: car
                };

                // Preserve city/state if they exist or fetch them
                if (!newData.city) {
                    const geoInfo = await fetchReverseGeocode(lat, lng);
                    newData.city = geoInfo.city;
                    newData.state = geoInfo.state;
                }

                setMapData(newData);
                onChange?.(JSON.stringify(newData));
                saveToProducerHistory(newData);

                // Handle GeoJSON for polygon rendering
                if (car.geoJson) {
                    // GeoJSON geometry could be Polygon or MultiPolygon.
                    // Leaflet expects [lat, lng] arrays. GeoJSON uses [lng, lat].
                    // We need to swap coordinates.

                    let points: GeoPoint[] = [];

                    if (car.geoJson.type === 'Polygon') {
                        // car.geoJson.coordinates is Array of Rings. First ring is outer.
                        // Ring is Array of Positions [lng, lat]
                        const ring = car.geoJson.coordinates[0];
                        points = ring.map((p: any) => ({ lat: p[1], lng: p[0] }));
                    } else if (car.geoJson.type === 'MultiPolygon') {
                        // Take the first polygon's outer ring for simplicity or join them?
                        // For visualization, let's take the first polygon.
                        const polygon = car.geoJson.coordinates[0];
                        const ring = polygon[0];
                        points = ring.map((p: any) => ({ lat: p[1], lng: p[0] }));
                    }

                    setCarPolygon(points);
                }
            }
        } catch (error) {
            console.error("CAR Fetch Error", error);
            alert("Erro ao buscar dados do CAR. Verifique se a localização está correta.");
        } finally {
            setIsLoadingCAR(false);
        }
    };

    const [isLoadingEsg, setIsLoadingEsg] = useState(false);

    const handleAnalyzeEsg = async () => {
        if (!mapData.carCode) return;
        setIsLoadingEsg(true);
        try {
            const response = await fetch('/api/integration/esg/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyMapId: mapId,
                    carCode: mapData.carCode
                })
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();

            setMapData(prev => ({
                ...prev,
                carEsgStatus: data.esg_status,
                carEsgData: data
            }));

        } catch (error) {
            console.error("ESG Analysis Error", error);
            alert("Erro na análise socioambiental.");
        } finally {
            setIsLoadingEsg(false);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        if (readOnly) return;
        if (mode === 'set_location') {
            // New logic: Fetch CAR when setting location
            await fetchCAR(lat, lng);
            setMode('view');
        } else if (mode === 'draw_field') {
            setCurrentPolygon([...currentPolygon, { lat, lng }]);
        }
    };

    const handleSaveField = async () => {
        if (!currentFieldName || currentPolygon.length < 3) return;
        const area = calculateAreaInHectares(currentPolygon);

        let city = mapData.city;
        let state = mapData.state;

        // Auto-detect city/state from field if not yet set
        if (!city && currentPolygon.length > 0) {
            const geoInfo = await fetchReverseGeocode(currentPolygon[0].lat, currentPolygon[0].lng);
            city = geoInfo.city;
            state = geoInfo.state;
        }

        const newField: PropertyField = {
            id: Date.now().toString(),
            name: currentFieldName,
            points: currentPolygon,
            area: `${area} ha`
        };

        const newData = {
            ...mapData,
            fields: [...mapData.fields, newField],
            city,
            state
        };
        setMapData(newData);
        onChange?.(JSON.stringify(newData));
        saveToProducerHistory(newData);
        setCurrentPolygon([]);
        setCurrentFieldName('');
        setMode('view');
    };

    if (!isMounted) return <div className="h-[500px] bg-gray-100 rounded-3xl animate-pulse flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest">Carregando Mapa...</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            {!readOnly && (
                <div className="bg-white p-4 rounded-[2rem] border border-gray-100 flex flex-col gap-4 shadow-xl shadow-gray-100 relative z-[500]">
                    <div className="flex flex-col gap-2 relative">
                        <div className="w-full relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar endereço ou fazenda..."
                                className="w-full pl-12 pr-4 py-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                </svg>
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[1000] animate-slide-up">
                                    {suggestions.map((item) => (
                                        <div
                                            key={item.place_id}
                                            onClick={async () => {
                                                const lat = parseFloat(item.lat);
                                                const lon = parseFloat(item.lon);
                                                setCenter([lat, lon]);
                                                setShowSuggestions(false);
                                                // If we are in "set_location" mode, we could also trigger the click logic
                                                if (mode === 'set_location') {
                                                    await fetchCAR(lat, lon);
                                                    setMode('view');
                                                }
                                            }}
                                            className="px-6 py-4 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-start gap-4 transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-xs font-bold text-gray-600 line-clamp-1">{item.display_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={handleLocateUser} className="w-full md:w-auto px-8 py-5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-3">
                            {isLocating ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            <span className="text-xs font-black uppercase tracking-widest">{isLocating ? 'Localizando...' : 'Minha Localização'}</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        {mode === 'view' ? (
                            <>
                                <button
                                    onClick={() => setMode('draw_field')}
                                    disabled={!mapData.propertyLocation || !mapData.carCode}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 bg-white border-2 border-dashed rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all
                                        ${(!mapData.propertyLocation || !mapData.carCode)
                                            ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-500'
                                        }`}
                                    title={(!mapData.propertyLocation || !mapData.carCode) ? "Defina a Sede e o CAR primeiro" : "Desenhar Talhão"}
                                >
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M12 2l9 6.75V17.5L12 22l-9-4.5V8.75L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Desenhar Talhão
                                </button>
                                <button onClick={() => setMode('set_location')} className="flex-1 flex items-center justify-center gap-3 py-4 bg-white border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:border-emerald-500 hover:text-emerald-500 transition-all">
                                    {isLoadingCAR ? (
                                        <svg className="w-4 h-4 animate-spin text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : (
                                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    {isLoadingCAR ? 'Buscando CAR...' : (mapData.propertyLocation ? 'Alterar Sede' : 'Marcar Sede')}
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-between px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-fade-in">
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                    {mode === 'set_location' ? 'Toque na Sede' : 'Toque os vértices'}
                                </span>
                                <button onClick={() => setMode('view')} className="text-emerald-400 hover:text-red-500">
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {mode === 'draw_field' && (
                            <div className="flex gap-2 animate-slide-up items-center">
                                <input type="text" placeholder="Nome" value={currentFieldName} onChange={(e) => setCurrentFieldName(e.target.value)} className="w-32 px-4 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/10" />
                                <button
                                    onClick={() => { setCurrentPolygon([]); setCurrentFieldName(''); }}
                                    className="p-4 text-red-400 hover:text-red-500 transition-colors"
                                    title="Limpar desenho"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button onClick={handleSaveField} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-emerald-100">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`h-[500px] w-full relative rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl z-0 group ${readOnly && mapData.carCode ? 'mb-4' : ''}`}>
                <MapContainer
                    center={center}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    <MapEventsHandler mode={mode} onMapClick={handleMapClick} center={center} />

                    {mapData.propertyLocation && <Marker position={[mapData.propertyLocation.lat, mapData.propertyLocation.lng]} />}
                    {mapData.fields.map((field: PropertyField) => (
                        <Polygon
                            key={field.id}
                            positions={field.points.map((p: GeoPoint) => [p.lat, p.lng])}
                            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.3, weight: 3 }}
                        />
                    ))}
                    {carPolygon && carPolygon.length > 0 && (
                        <Polygon
                            positions={carPolygon.map((p: GeoPoint) => [p.lat, p.lng])}
                            pathOptions={{ color: 'white', fillColor: 'transparent', fillOpacity: 0, weight: 2 }}
                        />
                    )}
                    {currentPolygon.length > 0 && (
                        <Polygon
                            positions={currentPolygon.map((p: GeoPoint) => [p.lat, p.lng])}
                            pathOptions={{ color: 'white', dashArray: '10, 10', fillColor: 'white', fillOpacity: 0.1 }}
                        />
                    )}
                    {currentPolygon.map((p, idx) => (
                        <Marker key={`vertex-${idx}`} position={[p.lat, p.lng]} icon={vertexIcon} />
                    ))}
                </MapContainer>

                <div className={`absolute top-6 right-6 bg-white/90 backdrop-blur-md transition-all duration-300 ease-in-out shadow-2xl z-[400] border border-white overflow-hidden ${isInfoExpanded ? 'p-6 rounded-[2rem] min-w-[200px]' : 'p-3 rounded-2xl w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-white'}`}>
                    {isInfoExpanded ? (
                        <div className="animate-fade-in relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsInfoExpanded(false); }}
                                className="absolute -top-1 -right-1 p-2 text-gray-300 hover:text-gray-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 pr-6">Propriedade</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <svg className={`w-3.5 h-3.5 ${mapData.propertyLocation ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Sede</span>
                                            {mapData.carCode && (
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{mapData.carCode}</span>
                                                    {(mapData.carData?.num_area || mapData.carData?.area_ha) && (
                                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">
                                                            Área CAR: {Number(mapData.carData?.num_area || mapData.carData?.area_ha).toLocaleString('pt-BR')} ha
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!readOnly && mapData.propertyLocation && (
                                        <button onClick={() => { setMapData({ ...mapData, propertyLocation: undefined, city: undefined, state: undefined, carCode: undefined, carData: undefined }); onChange?.(JSON.stringify({ ...mapData, propertyLocation: undefined, city: undefined, state: undefined, carCode: undefined, carData: undefined })); }} className="text-gray-300 hover:text-red-500 transition-colors pointer-events-auto">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {mapData.city && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 animate-fade-in">
                                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M3 21h18M3 10a9 9 0 1118 0v11H3V10z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">{mapData.city}</span>
                                            <span className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest opacity-70">{mapData.state}</span>
                                        </div>
                                    </div>
                                )}
                                {mapData.fields.map((field: PropertyField) => (
                                    <div key={field.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M12 2l9 6.75V17.5L12 22l-9-4.5V8.75L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-[10px] font-black font-bold text-gray-700 uppercase tracking-widest truncate">{field.name}</span>
                                                {field.area && <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">{field.area}</span>}
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <button onClick={() => { const nd = { ...mapData, fields: mapData.fields.filter(f => f.id !== field.id) }; setMapData(nd); onChange?.(JSON.stringify(nd)); }} className="text-gray-300 hover:text-red-500 transition-colors pointer-events-auto">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsInfoExpanded(true)} className="w-full h-full flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {readOnly && mapData.carCode && !hideEsg && (
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-gray-50 animate-fade-in relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Análise Socioambiental</h3>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conformidade e Monitoramento</span>
                                </div>
                            </div>

                            {!mapData.carEsgStatus && (
                                <button
                                    onClick={handleAnalyzeEsg}
                                    disabled={isLoadingEsg}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingEsg ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                    {isLoadingEsg ? 'Analisando...' : 'Executar Análise'}
                                </button>
                            )}
                        </div>

                        {mapData.carEsgStatus && (
                            <div className="animate-slide-up">
                                <div className={`flex items-center gap-4 p-4 rounded-2xl border ${mapData.carEsgStatus === 'CONFORME' || mapData.carEsgStatus === 'LIBERADO' || mapData.carEsgStatus === 'OK'
                                    ? 'bg-emerald-50 border-emerald-100'
                                    : 'bg-red-50 border-red-100'
                                    }`}>
                                    <div className={`w-3 h-3 rounded-full shadow-sm ring-4 ring-white ${mapData.carEsgStatus === 'CONFORME' || mapData.carEsgStatus === 'LIBERADO' || mapData.carEsgStatus === 'OK'
                                        ? 'bg-emerald-500'
                                        : 'bg-red-500'
                                        }`} />
                                    <div className="flex flex-col flex-1">
                                        <span className={`text-xs font-black uppercase tracking-widest ${mapData.carEsgStatus === 'CONFORME' || mapData.carEsgStatus === 'LIBERADO' || mapData.carEsgStatus === 'OK'
                                            ? 'text-emerald-700'
                                            : 'text-red-700'
                                            }`}>
                                            {mapData.carEsgStatus === 'CONFORME' || mapData.carEsgStatus === 'LIBERADO' || mapData.carEsgStatus === 'OK' ? 'Situação Regular' : 'Irregularidades Encontradas'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${mapData.carEsgStatus === 'CONFORME' || mapData.carEsgStatus === 'LIBERADO' || mapData.carEsgStatus === 'OK'
                                            ? 'text-emerald-600'
                                            : 'text-red-600'
                                            }`}>
                                            Última verificação: Hoje
                                        </span>
                                    </div>
                                    <button onClick={handleAnalyzeEsg} disabled={isLoadingEsg} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Reanalisar">
                                        <svg className={`w-5 h-5 ${isLoadingEsg ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>

                                {mapData.carEsgData && (
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {Object.entries(mapData.carEsgData).map(([key, value]) => {
                                            if (key.startsWith('qtd_') && typeof value === 'number') {
                                                const label = key.replace('qtd_', '').replace(/_/g, ' ');
                                                const isIssue = value > 0;
                                                return (
                                                    <div key={key} className={`p-3 rounded-xl border ${isIssue ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} flex flex-col gap-1`}>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate" title={label}>{label}</span>
                                                        <span className={`text-xl font-black ${isIssue ? 'text-red-500' : 'text-gray-700'}`}>{value}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyMapInput;
