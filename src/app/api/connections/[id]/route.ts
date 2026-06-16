import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, notFound, badRequest, serverError, success } from '@/lib/api-utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const connection = await prisma.connection.findUnique({ where: { id: params.id } });
    if (!connection) return notFound('Connection not found');

    if (connection.receiverId !== user.id && connection.requesterId !== user.id) {
      return unauthorized();
    }

    const { status } = await req.json();

    if (status === 'accepted') {
      if (connection.receiverId !== user.id) return badRequest('Only the recipient can accept requests');
      const updated = await prisma.connection.update({
        where: { id: params.id },
        data: { status: 'accepted', updatedAt: new Date() },
        include: {
          requester: { select: { id: true, name: true, profilePhotoUrl: true } },
          receiver: { select: { id: true, name: true, profilePhotoUrl: true } },
        },
      });

      await prisma.notification.create({
        data: {
          userId: connection.requesterId,
          type: 'connect_accepted',
          title: 'Connection Accepted',
          body: `${user.name} accepted your connection request`,
          data: { connectionId: connection.id },
        },
      });

      return success(updated);
    }

    if (status === 'declined') {
      if (connection.receiverId !== user.id) return badRequest('Only the recipient can decline requests');
      const updated = await prisma.connection.update({
        where: { id: params.id },
        data: { status: 'declined', updatedAt: new Date() },
      });
      return success(updated);
    }

    return badRequest('Invalid status');
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const connection = await prisma.connection.findUnique({ where: { id: params.id } });
    if (!connection) return notFound('Connection not found');
    if (connection.requesterId !== user.id && connection.receiverId !== user.id) {
      return unauthorized();
    }

    await prisma.message.deleteMany({ where: { connectionId: params.id } });
    await prisma.connection.delete({ where: { id: params.id } });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
