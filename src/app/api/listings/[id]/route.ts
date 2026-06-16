import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, notFound, forbidden, serverError, success } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, profilePhotoUrl: true, collegeId: true, course: true, yearOfStudy: true, verifiedBadge: true, bio: true },
        },
        college: { select: { name: true, city: true, state: true } },
        _count: { select: { favorites: true } },
      },
    });

    if (!listing) return notFound('Listing not found');

    return success(listing);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const listing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!listing) return notFound('Listing not found');
    if (listing.userId !== user.id) return forbidden();

    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['listingType', 'lat', 'lng', 'address', 'rentMin', 'rentMax', 'moveInDate', 'roomType', 'amenities', 'photos', 'preferredGender', 'description', 'status'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.status === 'inactive') {
      updateData.filledAt = new Date();
    }

    const updated = await prisma.listing.update({
      where: { id: params.id },
      data: updateData,
    });

    return success(updated);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const listing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!listing) return notFound('Listing not found');
    if (listing.userId !== user.id) return forbidden();

    await prisma.listing.delete({ where: { id: params.id } });

    return success({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
