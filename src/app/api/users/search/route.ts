import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim().toLowerCase();
    if (!username || username.length < 1) return badRequest('Username is required');

    const found = await prisma.user.findFirst({
      where: {
        username: { contains: username, mode: 'insensitive' },
        id: { not: user.id },
        deactivated: false,
      },
      select: {
        id: true, name: true, username: true, profilePhotoUrl: true,
        course: true, branch: true, yearOfStudy: true, college: { select: { name: true } },
      },
    });

    return success({ user: found || null });
  } catch (error) {
    return serverError(error);
  }
}
