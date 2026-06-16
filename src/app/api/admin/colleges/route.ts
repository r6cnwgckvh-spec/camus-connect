import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return unauthorized();

    const submissions = await prisma.collegeSubmission.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return success({ submissions });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return unauthorized();

    const { submissionId, action, collegeId } = await req.json();
    const submission = await prisma.collegeSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) return unauthorized();

    if (action === 'approve') {
      if (collegeId) {
        await prisma.user.updateMany({
          where: { collegeId: null, id: submission.userId },
          data: { collegeId },
        });
      } else {
        const college = await prisma.college.create({
          data: { name: submission.name, city: submission.city, state: submission.state },
        });
        await prisma.user.update({
          where: { id: submission.userId },
          data: { collegeId: college.id },
        });
      }
      await prisma.collegeSubmission.update({
        where: { id: submissionId },
        data: { status: 'approved', reviewedAt: new Date(), reviewedBy: admin.id },
      });
    } else if (action === 'reject') {
      await prisma.collegeSubmission.update({
        where: { id: submissionId },
        data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: admin.id },
      });
    }

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
