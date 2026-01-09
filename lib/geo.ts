import { GeoPoint } from '../types/checklist';

/**
 * Calculates the area of a polygon in hectares using the Shoelace formula
 * adapted for geographical coordinates (approximate for small areas).
 */
export function calculateAreaInHectares(points: GeoPoint[]): string {
    if (points.length < 3) return '0.00';

    const radius = 6378137; // Earth's radius in meters
    let area = 0;

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const lat1 = (p1.lat * Math.PI) / 180;
        const lon1 = (p1.lng * Math.PI) / 180;
        const lat2 = (p2.lat * Math.PI) / 180;
        const lon2 = (p2.lng * Math.PI) / 180;

        area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = (area * radius * radius) / 2;
    const hectares = Math.abs(area) / 10000;

    return hectares.toFixed(2);
}
