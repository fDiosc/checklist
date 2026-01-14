import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('latitude');
    const lng = searchParams.get('longitude');

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
    }

    try {
        // Fetch configs from DB
        const authKeyConfig = await db.systemConfig.findUnique({ where: { key: 'CAR_API_KEY' } });
        const coopIdConfig = await db.systemConfig.findUnique({ where: { key: 'CAR_COOPERATIVE_ID' } });

        if (!authKeyConfig || !coopIdConfig) {
            console.error('Missing CAR API configuration');
            return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
        }

        const apiUrl = `https://api.merx.tech/api/v1/integration/car/getCarsByLatLong?latitude=${lat}&longitude=${lng}&cooperative-id=${coopIdConfig.value}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': authKeyConfig.value,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('CAR API Error:', await response.text());
            return NextResponse.json({ error: 'Failed to fetch CAR data' }, { status: response.status });
        }

        const data = await response.json();

        // Parse WKB geom if present
        if (Array.isArray(data)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const wkx = require('wkx');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((item: any) => {
                if (item.geom) {
                    try {
                        const buffer = Buffer.from(item.geom, 'hex');
                        const geometry = wkx.Geometry.parse(buffer);
                        item.geoJson = geometry.toGeoJSON();
                    } catch (e) {
                        console.error('Error parsing geometry:', e);
                    }
                }
            });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('PROXY CAR API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
