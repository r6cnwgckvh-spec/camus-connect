import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, serverError, badRequest } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('q')?.trim().toLowerCase();
    if (!username || username.length < 3) return badRequest('Username must be at least 3 characters');
    const exists = await prisma.user.findUnique({ where: { username } });
    return success({ available: !exists });
  } catch (error) {
    return serverError(error);
  }
}
