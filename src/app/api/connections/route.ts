import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, badRequest, serverError, success } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type') || 'all';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (type === 'received') {
      where.receiverId = user.id;
    } else if (type === 'sent') {
      where.requesterId = user.id;
    } else {
      where.OR = [
        { requesterId: user.id },
        { receiverId: user.id },
      ];
    }

    const connections = await prisma.connection.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, profilePhotoUrl: true, collegeId: true, course: true, yearOfStudy: true },
        },
        receiver: {
          select: { id: true, name: true, profilePhotoUrl: true, collegeId: true, course: true, yearOfStudy: true },
        },
      },
    });

    return success({ connections });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { receiverId, message } = await req.json();

    if (!receiverId) return badRequest('Receiver ID is required');
    if (receiverId === user.id) return badRequest('Cannot send request to yourself');

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: user.id, receiverId },
          { requesterId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (existing) {
      return badRequest('A connection request already exists with this user');
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: user.id,
        receiverId,
        message: message || null,
      },
      include: {
        requester: { select: { id: true, name: true, profilePhotoUrl: true } },
        receiver: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'connect_request',
        title: 'New Connection Request',
        body: `${user.name} wants to connect with you`,
        data: { connectionId: connection.id, requesterId: user.id },
      },
    });

    return success(connection, 201);
  } catch (error) {
    return serverError(error);
  }
}
