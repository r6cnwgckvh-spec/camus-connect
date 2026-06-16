import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, success, serverError, badRequest } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const where: Record<string, unknown> = { id: { not: user.id }, deactivated: false };

    if (user.collegeId) {
      where.OR = [
        { collegeId: user.collegeId },
        { college: { city: user.college?.city } },
      ];
    }

    return success({ users: [] });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search')?.trim();
    const collegeId = searchParams.get('collegeId');
    const city = searchParams.get('city');
    const course = searchParams.get('course');
    const yearOfStudy = searchParams.get('yearOfStudy');
    const gender = searchParams.get('gender');
    const lookingFor = searchParams.get('lookingFor');

    const where: Record<string, unknown> = {
      id: { not: user.id },
      deactivated: false,
      profileVisible: true,
      onboardingCompleted: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { college: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (collegeId) where.collegeId = collegeId;
    if (course) where.course = course;
    if (yearOfStudy) where.yearOfStudy = yearOfStudy;
    if (gender) where.gender = gender;
    if (lookingFor) where.lookingFor = { has: lookingFor };

    if (city && !collegeId) {
      where.college = { city: { contains: city, mode: 'insensitive' } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [
          { collegeId: user.collegeId ? 'asc' : undefined as any },
          { lastActive: 'desc' },
        ].filter(Boolean),
        select: {
          id: true, name: true, profilePhotoUrl: true, gender: true,
          collegeId: true, course: true, branch: true, yearOfStudy: true,
          lookingFor: true, bio: true, verifiedBadge: true, lastActive: true,
          compatibilityAnswers: true,
          college: { select: { name: true, city: true, state: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const usersWithScore = users.map(u => ({
      ...u,
      compatibilityScore: calculateCompatibility(user.compatibilityAnswers, u.compatibilityAnswers),
    }));

    if (user.collegeId) {
      usersWithScore.sort((a, b) => {
        const aSameCollege = a.collegeId === user.collegeId ? 1 : 0;
        const bSameCollege = b.collegeId === user.collegeId ? 1 : 0;
        if (aSameCollege !== bSameCollege) return bSameCollege - aSameCollege;
        return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
      });
    }

    return success({ users: usersWithScore, total, page, limit });
  } catch (error) {
    return serverError(error);
  }
}

function calculateCompatibility(answers1: Record<string, string> | null, answers2: Record<string, string> | null): number | null {
  if (!answers1 || !answers2) return null;
  const keys = Object.keys(answers1);
  if (keys.length === 0) return null;
  let matches = 0;
  for (const key of keys) {
    if (answers1[key] === answers2[key]) matches++;
  }
  return Math.round((matches / keys.length) * 100);
}
