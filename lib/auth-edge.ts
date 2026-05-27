import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-compatible auth config — no Prisma adapter.
// Used only in proxy.ts to verify JWT session cookies.
const trustHost =
  process.env.AUTH_TRUST_HOST === 'true' ||
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'development'

export const { auth } = NextAuth({
  trustHost,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: '/login' },
})
