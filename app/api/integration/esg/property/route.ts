import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { propertyMapId, carCode } = await request.json();

        if (!carCode) {
            return NextResponse.json({ error: 'CAR Code is required' }, { status: 400 });
        }

        // Get API Token
        const systemConfig = await db.systemConfig.findUnique({
            where: { key: 'CAR_API_TOKEN' }
        });

        if (!systemConfig?.value) {
            console.error('Missing CAR_API_TOKEN in system_config');
            return NextResponse.json({ error: 'System Configuration Error: CAR_API_TOKEN is missing.' }, { status: 500 });
        }

        // Call External API
        const response = await fetch(`https://api.merx.tech/api/v1/integration/esg/cars/${carCode}:resume`, {
            method: 'GET',
            headers: {
                'Authorization': systemConfig.value,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ESG Property API Error:', response.status, errorText);
            return NextResponse.json({
                error: 'External API Error',
                details: errorText,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();

        // Save to Database
        if (propertyMapId) {
            if (propertyMapId.startsWith('resp-')) {
                // It's a map from a Checklist Response
                const responseId = propertyMapId.replace('resp-', '');
                const responseRecord = await db.response.findUnique({
                    where: { id: responseId }
                });

                if (responseRecord && responseRecord.answer) {
                    try {
                        const currentAnswer = JSON.parse(responseRecord.answer);
                        const updatedAnswer = {
                            ...currentAnswer,
                            carEsgStatus: data.esg_status,
                            carEsgData: data,
                            carEsgLastCheck: new Date()
                        };

                        await db.response.update({
                            where: { id: responseId },
                            data: {
                                answer: JSON.stringify(updatedAnswer)
                            }
                        });
                    } catch (e) {
                        console.error('Failed to parse/update response answer for ESG', e);
                    }
                }
            } else {
                // It's a standard PropertyMap
                await db.propertyMap.update({
                    where: { id: propertyMapId },
                    data: {
                        carEsgStatus: data.esg_status, // "CONFORME" | "NAO_CONFORME"
                        carEsgData: data,
                        carEsgLastCheck: new Date()
                    }
                });
            }
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in ESG Property API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
