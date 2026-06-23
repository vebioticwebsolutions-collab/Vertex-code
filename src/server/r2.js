// Server-only: Cloudflare R2 upload (S3-compatible) for worker outputs (PDF/Excel).
// Lazy singleton client. Returns the public URL built from R2_PUBLIC_BASE_URL,
// which is what gets written to jobs.result_url and polled by the tool.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let _client;

function client() {
  if (!_client) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 is not configured (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).');
    }
    _client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
  }
  return _client;
}

export async function uploadToR2(key, body, contentType) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2_BUCKET is not set.');
  await client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('R2_PUBLIC_BASE_URL is not set (needed to build result_url).');
  return `${base}/${key}`;
}
