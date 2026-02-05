'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileCheck, AlertCircle, Loader2, X } from 'lucide-react';
import { calculateAreaInHectares } from '@/lib/geo';

interface GeoFileUploadProps {
  onUpload: (geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon, areaHa: number) => void;
  onError: (message: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  hasData?: boolean;
}

type UploadStatus = 'idle' | 'processing' | 'success' | 'error';

export default function GeoFileUpload({
  onUpload,
  onError,
  onClear,
  disabled = false,
  hasData = false
}: GeoFileUploadProps) {
  const t = useTranslations();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseKml = async (content: string): Promise<GeoJSON.FeatureCollection> => {
    // Dynamic import to reduce bundle size
    const { kml } = await import('@tmcw/togeojson');
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(content, 'text/xml');
    return kml(kmlDoc) as GeoJSON.FeatureCollection;
  };

  const parseGeoJson = (content: string): GeoJSON.FeatureCollection => {
    const parsed = JSON.parse(content);
    
    // Handle both FeatureCollection and single Feature/Geometry
    if (parsed.type === 'FeatureCollection') {
      return parsed;
    } else if (parsed.type === 'Feature') {
      return { type: 'FeatureCollection', features: [parsed] };
    } else if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: parsed }]
      };
    }
    
    throw new Error('Invalid GeoJSON structure');
  };

  const extractPolygon = (fc: GeoJSON.FeatureCollection): GeoJSON.Polygon | GeoJSON.MultiPolygon | null => {
    for (const feature of fc.features) {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        return feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
      }
    }
    return null;
  };

  const processFile = useCallback(async (file: File) => {
    setStatus('processing');
    setFileName(file.name);

    try {
      const content = await file.text();
      const extension = file.name.toLowerCase().split('.').pop();
      
      let featureCollection: GeoJSON.FeatureCollection;
      
      if (extension === 'kml') {
        featureCollection = await parseKml(content);
      } else if (extension === 'json' || extension === 'geojson') {
        featureCollection = parseGeoJson(content);
      } else {
        throw new Error(t('propertyMap.upload.invalidFormat'));
      }

      const geometry = extractPolygon(featureCollection);
      
      if (!geometry) {
        throw new Error(t('propertyMap.upload.noPolygonFound'));
      }

      // Calculate area
      const areaHa = calculateAreaInHectares(geometry);
      
      if (areaHa <= 0) {
        throw new Error(t('propertyMap.upload.invalidGeometry'));
      }

      setStatus('success');
      onUpload(geometry, areaHa);
      
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : t('propertyMap.upload.processingError');
      onError(message);
    }
  }, [onUpload, onError, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (['kml', 'json', 'geojson'].includes(extension || '')) {
        processFile(file);
      } else {
        onError(t('propertyMap.upload.invalidFormat'));
      }
    }
  }, [processFile, onError, t]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClear = () => {
    setStatus('idle');
    setFileName(null);
    onClear?.();
  };

  if (hasData && status === 'success') {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">{t('propertyMap.upload.fileImported')}</p>
            <p className="text-xs text-emerald-600">{fileName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-2 text-emerald-600 hover:text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
        ${dragOver ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        ${status === 'error' ? 'border-red-300 bg-red-50' : ''}
      `}
    >
      <input
        type="file"
        accept=".kml,.json,.geojson"
        onChange={handleFileChange}
        disabled={disabled || status === 'processing'}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {status === 'processing' ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-bold text-slate-600">{t('propertyMap.upload.processing')}</p>
          <p className="text-xs text-slate-400">{fileName}</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-bold text-red-600">{t('propertyMap.upload.error')}</p>
          <p className="text-xs text-slate-500">{t('propertyMap.upload.tryAgain')}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Upload className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">{t('propertyMap.upload.dragDrop')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('propertyMap.upload.acceptedFormats')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
