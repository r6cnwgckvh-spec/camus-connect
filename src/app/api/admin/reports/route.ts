import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return unauthorized();

    const reports = await prisma.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, name: true } },
        listing: { select: { id: true, description: true, listingType: true } },
      },
    });

    return success({ reports });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return unauthorized();

    const { reportId, action } = await req.json();
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return unauthorized();

    if (action === 'resolve') {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedById: admin.id },
      });
    } else if (action === 'dismiss') {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'dismissed', resolvedAt: new Date(), resolvedById: admin.id },
      });
    } else if (action === 'ban') {
      if (report.reportedUserId) {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: { deactivated: true, deactivatedAt: new Date() },
        });
      }
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedById: admin.id, actionTaken: 'banned' },
      });
    }

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
