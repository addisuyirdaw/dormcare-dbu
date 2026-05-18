import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe auth config — no database/Node.js imports.
 * Used by middleware (Edge Runtime). Providers are added in auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dormcare-dbu-super-secret-key-1234567890',
  trustHost: true,
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.dormBlockId = (user as any).dormBlockId;
        token.studentId = (user as any).studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).dormBlockId = token.dormBlockId;
        (session.user as any).studentId = token.studentId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
