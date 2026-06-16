import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      onboardingCompleted: boolean;
      role: string;
    };
  }

  interface User {
    onboardingCompleted: boolean;
    role: string;
    googleId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    onboardingCompleted: boolean;
    role: string;
  }
}
