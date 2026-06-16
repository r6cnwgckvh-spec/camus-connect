import nodemailer from 'nodemailer';
import { prisma } from './prisma';

function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

export async function sendEmailOtp(email: string): Promise<{ success: boolean }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const transporter = getTransporter();

  await prisma.otpCode.create({
    data: {
      email: email.toLowerCase(),
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  if (!transporter) {
    console.log(`[DEV EMAIL OTP] To: ${email}, Code: ${code}`);
    return { success: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CampusConnect" <noreply@campusconnect.app>',
      to: email,
      subject: 'Your CampusConnect OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #4f46e5; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">CampusConnect</h1>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Your one-time verification code is:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        </div>
      `,
    });
    console.log(`[EMAIL OTP] Sent to ${email}: ${code}`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL OTP] Failed:', error);
    return { success: false };
  }
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: {
      email: email.toLowerCase(),
      code: otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { used: true },
  });
  return true;
}
