import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

const BLOCKED_WORDS = ['spam', 'scam', 'xxx', 'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'porn', 'slut', 'whore', 'bastard'];

function moderateContent(content: string): { flagged: boolean; reason: string | null } {
  const lower = content.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { flagged: true, reason: `Inappropriate content detected: "${word}"` };
    }
  }
  if (content.length > 1000) {
    return { flagged: true, reason: 'Message too long (max 1000 characters)' };
  }
  return { flagged: false, reason: null };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const messages = await prisma.globalMessage.findMany({
      where: { moderated: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { id: true, name: true, username: true, profilePhotoUrl: true } },
      },
    });

    const total = await prisma.globalMessage.count({ where: { moderated: false } });

    return success({ messages: messages.reverse(), total, page, limit });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!user.username) return badRequest('Please set a username before chatting');

    const { content } = await req.json();
    if (!content || !content.trim()) return badRequest('Message is required');
    if (content.length > 1000) return badRequest('Message too long (max 1000 characters)');

    const { flagged, reason } = moderateContent(content);

    const msg = await prisma.globalMessage.create({
      data: {
        userId: user.id,
        content: content.trim(),
        flagged,
        flagReason: reason,
      },
      include: {
        user: { select: { id: true, name: true, username: true, profilePhotoUrl: true } },
      },
    });

    return success(msg);
  } catch (error) {
    return serverError(error);
  }
}
