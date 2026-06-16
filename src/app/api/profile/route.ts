import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const allowedFields = ['name', 'bio', 'gender', 'course', 'branch', 'yearOfStudy', 'lookingFor',
      'profilePhotoUrl', 'theme', 'phoneVisibility', 'profileVisible', 'mapPrecision', 'emailDigest',
      'compatibilityAnswers'];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.dob) updateData.dob = new Date(body.dob);

    if (body.collegeId) {
      const college = await prisma.college.findUnique({ where: { id: body.collegeId } });
      if (college) updateData.collegeId = body.collegeId;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true, name: true, email: true, phone: true, gender: true,
        profilePhotoUrl: true, bio: true, course: true, branch: true,
        yearOfStudy: true, lookingFor: true, theme: true,
        college: { select: { name: true, city: true, state: true } },
      },
    });

    return success(updated);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'deactivate') {
      await prisma.user.update({
        where: { id: user.id },
        data: { deactivated: true, deactivatedAt: new Date() },
      });
      return success({ success: true, message: 'Account deactivated' });
    }

    if (action === 'delete') {
      await prisma.message.deleteMany({ where: { senderId: user.id } });
      await prisma.message.deleteMany({ where: { connection: { requesterId: user.id } } });
      await prisma.message.deleteMany({ where: { connection: { receiverId: user.id } } });
      await prisma.connection.deleteMany({ where: { requesterId: user.id } });
      await prisma.connection.deleteMany({ where: { receiverId: user.id } });
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.report.deleteMany({ where: { reporterId: user.id } });
      await prisma.favorite.deleteMany({ where: { userId: user.id } });
      await prisma.savedSearch.deleteMany({ where: { userId: user.id } });
      await prisma.blockedUser.deleteMany({ where: { blockerId: user.id } });
      await prisma.blockedUser.deleteMany({ where: { blockedId: user.id } });
      await prisma.review.deleteMany({ where: { reviewerId: user.id } });
      await prisma.review.deleteMany({ where: { reviewedId: user.id } });
      await prisma.listing.deleteMany({ where: { userId: user.id } });
      await prisma.collegeSubmission.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      return success({ success: true, message: 'Account permanently deleted' });
    }

    return badRequest('Invalid action');
  } catch (error) {
    return serverError(error);
  }
}
