import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, badRequest, serverError, success, notFound, forbidden } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const listingType = searchParams.get('listingType');
    const roomType = searchParams.get('roomType');
    const minRent = searchParams.get('minRent');
    const maxRent = searchParams.get('maxRent');
    const preferredGender = searchParams.get('preferredGender');
    const collegeId = searchParams.get('collegeId');
    const userId = searchParams.get('userId');
    const swLat = searchParams.get('swLat');
    const swLng = searchParams.get('swLng');
    const neLat = searchParams.get('neLat');
    const neLng = searchParams.get('neLng');

    const where: Record<string, unknown> = { status: 'active' };

    if (listingType) where.listingType = listingType;
    if (roomType) where.roomType = roomType;
    if (preferredGender) where.preferredGender = preferredGender;
    if (collegeId) where.collegeId = collegeId;
    if (userId) where.userId = userId;

    if (minRent || maxRent) {
      const rentFilter: Record<string, number> = {};
      if (minRent) rentFilter.gte = parseFloat(minRent);
      if (maxRent) rentFilter.lte = parseFloat(maxRent);
      where.rentMin = rentFilter;
    }

    if (swLat && swLng && neLat && neLng) {
      where.lat = { gte: parseFloat(swLat), lte: parseFloat(neLat) };
      where.lng = { gte: parseFloat(swLng), lte: parseFloat(neLng) };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, profilePhotoUrl: true, collegeId: true, course: true, yearOfStudy: true, verifiedBadge: true },
          },
          college: { select: { name: true, city: true, state: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return success({ listings, total, page, limit });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const {
      listingType, lat, lng, address, rentMin, rentMax, moveInDate,
      roomType, amenities, photos, preferredGender, description,
    } = body;

    if (!listingType || lat === undefined || lng === undefined || !address) {
      return badRequest('Listing type, location (lat/lng/address) are required');
    }

    if (rentMin && rentMax && rentMin > rentMax) {
      return badRequest('Minimum rent cannot exceed maximum rent');
    }

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        collegeId: user.collegeId,
        listingType,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address,
        rentMin: rentMin ? parseFloat(rentMin) : null,
        rentMax: rentMax ? parseFloat(rentMax) : null,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        roomType: roomType || null,
        amenities: amenities || [],
        photos: photos || [],
        preferredGender: preferredGender || null,
        description: description || null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: {
        user: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    });

    return success(listing, 201);
  } catch (error) {
    return serverError(error);
  }
}
