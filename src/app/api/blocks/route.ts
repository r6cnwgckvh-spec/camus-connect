import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest, notFound } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { blockedId } = await req.json();
    if (!blockedId) return badRequest('User ID required');
    if (blockedId === user.id) return badRequest('Cannot block yourself');

    const targetUser = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!targetUser) return notFound('User not found');

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      update: {},
      create: { blockerId: user.id, blockedId },
    });

    await prisma.connection.deleteMany({
      where: {
        OR: [
          { requesterId: user.id, receiverId: blockedId },
          { requesterId: blockedId, receiverId: user.id },
        ],
      },
    });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const blockedId = searchParams.get('userId');

    if (!blockedId) return badRequest('User ID required');

    await prisma.blockedUser.deleteMany({
      where: { blockerId: user.id, blockedId },
    });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: user.id },
      include: {
        blocked: {
          select: { id: true, name: true, profilePhotoUrl: true },
        },
      },
    });

    return success({ blockedUsers: blocked.map(b => b.blocked) });
  } catch (error) {
    return serverError(error);
  }
}
