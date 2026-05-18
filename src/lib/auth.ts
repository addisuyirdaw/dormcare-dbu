import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compareSync } from 'bcryptjs';
import { resolveUniversityUser } from './university-auth';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'University ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!identifier?.trim() || !password) return null;

        const user = await resolveUniversityUser(identifier);
        if (!user) return null;

        const valid = compareSync(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dormBlockId: user.dormBlockId,
          studentId: user.studentId,
        };
      },
    }),
  ],
});
