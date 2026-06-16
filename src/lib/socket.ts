import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret') as { id: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || user.deactivated) return next(new Error('User not found or deactivated'));

      (socket as any).userId = decoded.id;
      (socket as any).userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName;

    console.log(`[Socket] User connected: ${userName} (${userId})`);
    socket.join(`user:${userId}`);
    io?.emit('user:online', { userId });

    socket.on('chat:join', (connectionId: string) => {
      socket.join(`chat:${connectionId}`);
    });

    socket.on('chat:leave', (connectionId: string) => {
      socket.leave(`chat:${connectionId}`);
    });

    socket.on('chat:message', async (data: { connectionId: string; content: string; tempId: string }) => {
      try {
        const connection = await prisma.connection.findUnique({ where: { id: data.connectionId } });
        if (!connection || connection.status !== 'accepted') {
          socket.emit('chat:error', { message: 'Cannot send message in this connection' });
          return;
        }
        if (connection.requesterId !== userId && connection.receiverId !== userId) {
          socket.emit('chat:error', { message: 'Not authorized' });
          return;
        }

        const blocked = await prisma.blockedUser.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: connection.requesterId === userId ? connection.receiverId : connection.requesterId },
              { blockerId: connection.requesterId === userId ? connection.receiverId : connection.requesterId, blockedId: userId },
            ],
          },
        });
        if (blocked) {
          socket.emit('chat:error', { message: 'Cannot send messages to this user' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            connectionId: data.connectionId,
            senderId: userId,
            content: data.content.replace(/[<>&"']/g, (c) => ({
              '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;',
            }[c] || c)),
          },
          include: {
            sender: { select: { id: true, name: true, profilePhotoUrl: true } },
          },
        });

        io?.to(`chat:${data.connectionId}`).emit('chat:message', {
          ...message,
          tempId: data.tempId,
        });

        const receiverId = connection.requesterId === userId ? connection.receiverId : connection.requesterId;
        const unreadCount = await prisma.message.count({
          where: { connectionId: data.connectionId, senderId: receiverId, readAt: null },
        });

        io?.to(`user:${receiverId}`).emit('chat:unread', {
          connectionId: data.connectionId,
          count: unreadCount,
          lastMessage: message,
        });
      } catch (error) {
        console.error('[Socket] Message error:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', (data: { connectionId: string; isTyping: boolean }) => {
      socket.to(`chat:${data.connectionId}`).emit('chat:typing', {
        connectionId: data.connectionId,
        userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('chat:markRead', async (data: { connectionId: string }) => {
      try {
        await prisma.message.updateMany({
          where: { connectionId: data.connectionId, senderId: { not: userId }, readAt: null },
          data: { readAt: new Date() },
        });
        io?.to(`chat:${data.connectionId}`).emit('chat:read', { connectionId: data.connectionId, readBy: userId });
      } catch (error) {
        console.error('[Socket] markRead error:', error);
      }
    });

    socket.on('connect_request:notification', (data: { receiverId: string; connectionId: string }) => {
      io?.to(`user:${data.receiverId}`).emit('notification:new', {
        type: 'connect_request',
        title: 'New Connection Request',
        body: `${userName} wants to connect with you`,
        data: { connectionId: data.connectionId },
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userName} (${userId})`);
      io?.emit('user:offline', { userId });
    });
  });

  return io;
}
