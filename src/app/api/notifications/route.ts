import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, read: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return success({ notifications, unreadCount });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
