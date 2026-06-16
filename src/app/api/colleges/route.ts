import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, badRequest, serverError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    if (!q || q.length < 2) {
      return success({ colleges: [], total: 0, page, limit });
    }

    const count = await prisma.college.count();

    if (count === 0) {
      try {
        const response = await fetch('http://universities.hipolabs.com/search?country=India');
        const data = await response.json();

        const seen = new Map<string, any>();
        for (const item of data) {
          const key = item.name;
          if (!seen.has(key)) {
            seen.set(key, item);
          } else if (!seen.get(key)['state-province'] && item['state-province']) {
            seen.set(key, item);
          }
        }

        for (const item of seen.values()) {
          await prisma.college.upsert({
            where: {
              name_city_state: {
                name: item.name,
                city: '',
                state: item['state-province'] || '',
              },
            },
            update: {},
            create: {
              name: item.name,
              city: '',
              state: item['state-province'] || '',
              type: 'Other',
              affiliation: 'Other',
            },
          });
        }
      } catch {
        // External API unavailable — proceed with empty DB
      }
    }

    const where = {
      pending: false,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [colleges, total] = await Promise.all([
      prisma.college.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          type: true,
          affiliation: true,
          lat: true,
          lng: true,
        },
      }),
      prisma.college.count({ where }),
    ]);

    return success({ colleges, total, page, limit });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, city, state, type, affiliation } = body;

    if (!name || !city || !state) {
      return badRequest('Name, city, and state are required');
    }

    const existing = await prisma.college.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        city: { equals: city, mode: 'insensitive' },
        state: { equals: state, mode: 'insensitive' },
      },
    });

    if (existing) {
      return success(existing);
    }

    const college = await prisma.college.create({
      data: { name, city, state, type: type || 'Other', affiliation: affiliation || 'Other' },
    });

    return success(college, 201);
  } catch (error) {
    return serverError(error);
  }
}
