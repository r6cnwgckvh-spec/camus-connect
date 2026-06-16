import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, badRequest, serverError, success } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();

    const {
      name, phone, gender, dob, collegeId, collegeName, collegeCity, collegeState,
      course, branch, yearOfStudy, lookingFor, bio, profilePhotoUrl, compatibilityAnswers,
      username,
    } = body;

    if (!name || !gender || !dob || !course || !branch || !yearOfStudy || !lookingFor?.length) {
      return badRequest('All required fields must be filled');
    }

    if (username) {
      const clean = username.trim().toLowerCase();
      if (clean.length < 3) return badRequest('Username must be at least 3 characters');
      if (!/^[a-z0-9_]+$/.test(clean)) return badRequest('Username can only contain lowercase letters, numbers, and underscores');
      const existing = await prisma.user.findUnique({ where: { username: clean } });
      if (existing) return badRequest('Username is already taken');
    }

    let finalCollegeId = collegeId;

    if (collegeName && !collegeId) {
      if (collegeCity && collegeState) {
        const existing = await prisma.college.findFirst({
          where: {
            name: { equals: collegeName, mode: 'insensitive' },
            city: { equals: collegeCity, mode: 'insensitive' },
          },
        });
        if (existing) {
          finalCollegeId = existing.id;
        } else {
          const pending = await prisma.collegeSubmission.create({
            data: {
              userId: user.id,
              name: collegeName,
              city: collegeCity,
              state: collegeState,
              status: 'pending',
            },
          });
          finalCollegeId = null;
        }
      }
    }

    const updateData: Record<string, unknown> = {
      name,
      username: username?.trim().toLowerCase(),
      phone: phone || null,
      gender,
      dob: new Date(dob),
      course,
      branch,
      yearOfStudy,
      lookingFor,
      bio: bio || null,
      profilePhotoUrl: profilePhotoUrl || user.profilePhotoUrl,
      onboardingCompleted: true,
    };

    if (compatibilityAnswers) {
      updateData.compatibilityAnswers = compatibilityAnswers;
    }

    if (finalCollegeId) {
      updateData.collegeId = finalCollegeId;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
