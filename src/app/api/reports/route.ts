import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { reportedUserId, reportedListingId, reason, description } = await req.json();

    if (!reportedUserId && !reportedListingId) {
      return badRequest('Please specify the user or listing to report');
    }

    if (!reason) return badRequest('Please select a reason for reporting');

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId: reportedUserId || null,
        reportedListingId: reportedListingId || null,
        reason,
        description: description || null,
      },
    });

    return success(report, 201);
  } catch (error) {
    return serverError(error);
  }
}
