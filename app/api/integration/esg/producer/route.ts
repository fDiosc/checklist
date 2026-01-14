import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { producerId, cpf } = await request.json();

        if (!cpf) {
            return NextResponse.json({ error: 'CPF is required' }, { status: 400 });
        }

        // Get API Token
        const systemConfig = await db.systemConfig.findUnique({
            where: { key: 'CAR_API_TOKEN' }
        });

        if (!systemConfig?.value) {
            return NextResponse.json({ error: 'API Configuration missing' }, { status: 500 });
        }

        // Clean CPF
        const cleanCpf = cpf.replace(/\D/g, '');

        // Call External API
        const response = await fetch(`https://api.merx.tech/api/v1/integration/esg/social-identities/${cleanCpf}:resume`, {
            method: 'GET',
            headers: {
                'Authorization': systemConfig.value,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ESG API Error:', errorText);
            return NextResponse.json({ error: 'Failed to fetch ESG data', details: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Save to Database if producerId is provided
        if (producerId) {
            await db.producer.update({
                where: { id: producerId },
                data: {
                    esgStatus: data.esg_status, // "CONFORME" | "NAO_CONFORME"
                    esgData: data,
                    esgLastCheck: new Date()
                }
            });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in ESG Producer API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
