import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, badRequest, serverError, success } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));

    if (!connectionId) return badRequest('Connection ID is required');

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) return badRequest('Connection not found');
    if (connection.requesterId !== user.id && connection.receiverId !== user.id) {
      return unauthorized();
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { connectionId },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { sentAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, profilePhotoUrl: true } },
        },
      }),
      prisma.message.count({ where: { connectionId } }),
    ]);

    await prisma.message.updateMany({
      where: { connectionId, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    });

    return success({ messages: messages.reverse(), total, page, limit });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { connectionId, content } = await req.json();

    if (!connectionId || !content?.trim()) return badRequest('Connection ID and content are required');

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.status !== 'accepted') return badRequest('Cannot send messages in this connection');
    if (connection.requesterId !== user.id && connection.receiverId !== user.id) return unauthorized();

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: connection.requesterId === user.id ? connection.receiverId : connection.requesterId },
          { blockerId: connection.requesterId === user.id ? connection.receiverId : connection.requesterId, blockedId: user.id },
        ],
      },
    });
    if (blocked) return badRequest('Cannot send messages to this user');

    const message = await prisma.message.create({
      data: {
        connectionId,
        senderId: user.id,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    });

    const receiverId = connection.requesterId === user.id ? connection.receiverId : connection.requesterId;
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'new_message',
        title: 'New Message',
        body: `${user.name}: ${content.slice(0, 100)}`,
        data: { connectionId, messageId: message.id },
      },
    });

    return success(message, 201);
  } catch (error) {
    return serverError(error);
  }
}
