import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { listingId } = await req.json();

    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: user.id, listingId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return success({ favorited: false });
    }

    await prisma.favorite.create({
      data: { userId: user.id, listingId },
    });

    return success({ favorited: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        listing: {
          include: {
            user: { select: { id: true, name: true, profilePhotoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success({ favorites: favorites.map(f => f.listing) });
  } catch (error) {
    return serverError(error);
  }
}
