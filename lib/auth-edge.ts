import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-compatible auth config — no Prisma adapter.
// Used only in proxy.ts to verify JWT session cookies.
export const { auth } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: '/login' },
})
