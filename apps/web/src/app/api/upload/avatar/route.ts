import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const uid  = form.get('uid')  as string | null;

    if (!file || !uid) {
      return NextResponse.json({ error: 'file and uid are required' }, { status: 400 });
    }

    // File size guard — 5 MB max
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 });
    }

    // Convert File → Buffer → base64 data URI
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Use uid + timestamp as public_id so each upload produces a new unique URL.
    // This prevents the browser / CDN from serving a cached old avatar.
    const result = await cloudinary.uploader.upload(dataUri, {
      folder:         'ehr-avatars',
      public_id:      `${uid}_${Date.now()}`,
      overwrite:      false,
      transformation: [
        { width: 256, height: 256, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('[/api/upload/avatar]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
