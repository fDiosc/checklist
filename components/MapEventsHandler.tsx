'use client';

import { useEffect } from 'react';
import { useMapEvents, useMap } from 'react-leaflet';

interface MapEventsHandlerProps {
    mode: 'view' | 'set_location' | 'draw_field';
    onMapClick: (lat: number, lng: number) => void;
    center: [number, number];
}

const MapEventsHandler: React.FC<MapEventsHandlerProps> = ({ mode, onMapClick, center }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            if (mode !== 'view') {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { duration: 1.5 });
        }
    }, [center, map]);

    // Fix for Marker icons on client-side
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet');
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    }, []);

    return null;
};

export default MapEventsHandler;
