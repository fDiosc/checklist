import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl, isS3Key } from '@/lib/s3';

export async function GET(request: NextRequest) {
    try {
        const key = request.nextUrl.searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
        }

        if (!isS3Key(key)) {
            return NextResponse.json({ error: 'Invalid S3 key' }, { status: 400 });
        }

        const url = await getPresignedUrl(key);

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Presigned URL error:', error);
        return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }
}
