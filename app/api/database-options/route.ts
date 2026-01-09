import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let source = searchParams.get('source');

    if (!source) {
        return NextResponse.json({ error: 'Source is required' }, { status: 400 });
    }

    // Aliases for backward compatibility
    if (source === 'fertilizers') source = 'fertilizers_soil';
    if (source === 'desiccation') source = 'desiccation_pre_planting';

    try {
        const options = await db.databaseOption.findMany({
            where: { source },
            orderBy: { label: 'asc' }
        });
        return NextResponse.json(options);
    } catch (error) {
        console.error('Error fetching database options:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
