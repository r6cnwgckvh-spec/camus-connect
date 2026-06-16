import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, unauthorized, badRequest, serverError, success } from '@/lib/api-utils';
import { sendEmailOtp, verifyOtp } from '@/lib/otp';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return badRequest('Please enter a valid email address');
    }

    const result = await sendEmailOtp(email);

    if (!result.success) {
      return badRequest('Failed to send OTP. Please try again.');
    }

    return success({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return badRequest('Email and OTP are required');
    }

    if (!(await verifyOtp(email, otp))) {
      return badRequest('Incorrect OTP, please try again');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });

    return success({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return serverError(error);
  }
}
