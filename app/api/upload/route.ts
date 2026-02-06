import { NextRequest, NextResponse } from 'next/server';
import { buildS3Key, uploadToS3 } from '@/lib/s3';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const workspaceId = formData.get('workspaceId') as string | null;
        const subworkspaceId = formData.get('subworkspaceId') as string | null;
        const checklistId = formData.get('checklistId') as string | null;
        const itemId = formData.get('itemId') as string | null;
        const fieldId = formData.get('fieldId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!workspaceId || !checklistId || !itemId) {
            return NextResponse.json({ error: 'Missing required metadata (workspaceId, checklistId, itemId)' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
        }

        // Build S3 key
        const key = buildS3Key({
            workspaceId,
            subworkspaceId,
            checklistId,
            itemId,
            fieldId: fieldId || undefined,
            filename: file.name,
        });

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const s3Key = await uploadToS3({
            key,
            body: buffer,
            contentType: file.type,
        });

        return NextResponse.json({
            key: s3Key,
            filename: file.name,
            size: file.size,
            contentType: file.type,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
