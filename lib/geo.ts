import { GeoPoint } from '../types/checklist';

/**
 * Calculates the area of a polygon in hectares using the Shoelace formula
 * adapted for geographical coordinates (approximate for small areas).
 * 
 * Supports both GeoPoint[] array and GeoJSON Polygon/MultiPolygon geometries.
 */
export function calculateAreaInHectares(input: GeoPoint[] | GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
    let points: GeoPoint[];

    // Check if input is a GeoJSON geometry
    if ('type' in input && (input.type === 'Polygon' || input.type === 'MultiPolygon')) {
        points = convertGeoJSONToPoints(input);
    } else if (Array.isArray(input)) {
        points = input as GeoPoint[];
    } else {
        return 0;
    }

    if (points.length < 3) return 0;

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

    return hectares;
}

/**
 * Converts GeoJSON Polygon or MultiPolygon to GeoPoint[] array
 */
function convertGeoJSONToPoints(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoPoint[] {
    if (geometry.type === 'Polygon') {
        // Use the outer ring (first array of coordinates)
        return geometry.coordinates[0].map(coord => ({
            lat: coord[1],
            lng: coord[0]
        }));
    } else if (geometry.type === 'MultiPolygon') {
        // For MultiPolygon, calculate total from all polygons
        // For now, just use the first polygon's outer ring
        // (a more complete implementation would sum all polygon areas)
        if (geometry.coordinates.length > 0 && geometry.coordinates[0].length > 0) {
            return geometry.coordinates[0][0].map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));
        }
    }
    return [];
}

