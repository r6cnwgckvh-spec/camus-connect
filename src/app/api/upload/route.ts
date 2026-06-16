import { NextRequest } from 'next/server';
import { getCurrentUser, unauthorized, badRequest, success, serverError } from '@/lib/api-utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return badRequest('No file provided');

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return badRequest('File size exceeds 5MB limit');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return badRequest('Only JPG, PNG, and WebP files are allowed');

    const ext = file.type.split('/')[1];
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/${filename}`;

    return success({ url, filename }, 201);
  } catch (error) {
    return serverError(error);
  }
}
