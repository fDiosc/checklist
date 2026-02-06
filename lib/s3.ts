import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_BUCKET = process.env.S3_BUCKET || 'pocs-merxlabs';
const S3_REGION = process.env.S3_REGION || 'us-east-1';

export const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: !!process.env.S3_ENDPOINT, // Needed for non-AWS S3-compatible services
});

/**
 * Builds a structured S3 key for checklist files.
 * Structure: checklist/{workspaceId}/{subworkspaceId|_root}/{checklistId}/{itemId}/{fieldId}/{timestamp}_{filename}
 */
export function buildS3Key(params: {
    workspaceId: string;
    subworkspaceId?: string | null;
    checklistId: string;
    itemId: string;
    fieldId?: string;
    filename: string;
}): string {
    const { workspaceId, subworkspaceId, checklistId, itemId, fieldId, filename } = params;
    const subWs = subworkspaceId || '_root';
    const field = fieldId || 'default';
    const timestamp = Date.now();
    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `checklist/${workspaceId}/${subWs}/${checklistId}/${itemId}/${field}/${timestamp}_${sanitizedFilename}`;
}

/**
 * Upload a file buffer to S3.
 * Returns the S3 key for the uploaded file.
 */
export async function uploadToS3(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
}): Promise<string> {
    const { key, body, contentType } = params;

    await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));

    return key;
}

/**
 * Generate a pre-signed URL for reading (GET) an S3 object.
 * Default expiry: 1 hour.
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for uploading (PUT) an S3 object.
 * Default expiry: 15 minutes.
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 900): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    }));
}

/**
 * Checks whether a string looks like an S3 key (not a URL).
 */
export function isS3Key(value: string): boolean {
    return value.startsWith('checklist/') && !value.startsWith('http');
}
