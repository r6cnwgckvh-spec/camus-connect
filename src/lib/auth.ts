import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existingUser) {
          if (existingUser.deactivated) return false;
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { googleId: account.providerAccountId, lastActive: new Date() },
          });
          return true;
        }
        await prisma.user.create({
          data: {
            googleId: account.providerAccountId,
            name: user.name!,
            email: user.email!,
            profilePhotoUrl: user.image,
            role: user.email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
          },
        });
        return true;
      }
      return true;
    },
    async session({ session, token }) {
      if (!session.user) return session as any;
      session.user.id = token.sub!;
      const dbUser = await prisma.user.findFirst({
        where: { OR: [{ id: token.sub! }, { googleId: token.sub! }] },
        select: { id: true, onboardingCompleted: true, role: true, name: true, email: true, profilePhotoUrl: true },
      });
      if (!dbUser) return null as any;
      session.user.id = dbUser.id;
      session.user.onboardingCompleted = dbUser.onboardingCompleted;
      session.user.role = dbUser.role;
      session.user.name = dbUser.name;
      session.user.email = dbUser.email;
      session.user.image = dbUser.profilePhotoUrl;
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
          select: { id: true, onboardingCompleted: true, role: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
