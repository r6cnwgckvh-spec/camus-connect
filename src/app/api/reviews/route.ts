import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { reviewedId, rating, comment } = await req.json();

    if (!reviewedId || !rating || rating < 1 || rating > 5) {
      return badRequest('Valid rating (1-5) is required');
    }
    if (reviewedId === user.id) return badRequest('Cannot review yourself');

    const existing = await prisma.review.findUnique({
      where: { reviewerId_reviewedId: { reviewerId: user.id, reviewedId } },
    });
    if (existing) return badRequest('You have already reviewed this user');

    const review = await prisma.review.create({
      data: { reviewerId: user.id, reviewedId, rating, comment },
      include: {
        reviewer: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    });

    return success(review, 201);
  } catch (error) {
    return serverError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return badRequest('User ID required');

    const reviews = await prisma.review.findMany({
      where: { reviewedId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    });

    const avg = await prisma.review.aggregate({
      where: { reviewedId: userId },
      _avg: { rating: true },
      _count: true,
    });

    return success({ reviews, avgRating: avg._avg.rating, totalReviews: avg._count });
  } catch (error) {
    return serverError(error);
  }
}
