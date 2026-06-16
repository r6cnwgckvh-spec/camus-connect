import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return unauthorized();

    const [totalUsers, totalListings, pendingColleges, pendingReports] = await Promise.all([
      prisma.user.count({ where: { deactivated: false } }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.collegeSubmission.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'pending' } }),
    ]);

    const signupsByDay = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
    });

    const colleges = await prisma.college.findMany({
      orderBy: { users: { _count: 'desc' } },
      take: 10,
      include: { _count: { select: { users: true } } },
    });

    return success({
      stats: { totalUsers, totalListings, pendingColleges, pendingReports },
      signupsByDay,
      topColleges: colleges,
    });
  } catch (error) {
    return serverError(error);
  }
}
