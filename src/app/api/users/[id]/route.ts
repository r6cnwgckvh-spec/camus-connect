import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, notFound } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const profileUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, profilePhotoUrl: true, gender: true,
        collegeId: true, course: true, branch: true, yearOfStudy: true,
        lookingFor: true, bio: true, verifiedBadge: true, lastActive: true,
        compatibilityAnswers: true, phoneVisibility: true,
        college: { select: { name: true, city: true, state: true } },
        _count: { select: { reviewsReceived: true } },
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, name: true, profilePhotoUrl: true } },
          },
        },
      },
    });

    if (!profileUser) return notFound('User not found');

    let phone: string | null = null;
    if (profileUser.phoneVisibility === 'everyone') {
      const fullUser = await prisma.user.findUnique({ where: { id: params.id }, select: { phone: true } });
      phone = fullUser?.phone || null;
    } else if (profileUser.phoneVisibility === 'connections') {
      const connection = await prisma.connection.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: user.id, receiverId: params.id },
            { requesterId: params.id, receiverId: user.id },
          ],
        },
      });
      if (connection) {
        const fullUser = await prisma.user.findUnique({ where: { id: params.id }, select: { phone: true } });
        phone = fullUser?.phone || null;
      }
    }

    const avgRating = await prisma.review.aggregate({
      where: { reviewedId: params.id },
      _avg: { rating: true },
    });

    return success({ ...profileUser, phone, avgRating: avgRating._avg.rating });
  } catch (error) {
    return serverError(error);
  }
}
