import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

const trustHost =
  process.env.AUTH_TRUST_HOST === 'true' ||
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'development'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(process.env.DEV_USER_EMAIL
      ? [
          Credentials({
            credentials: { bypass: {} },
            async authorize() {
              const email = process.env.DEV_USER_EMAIL!
              let user = await prisma.user.findUnique({ where: { email } })
              if (!user) {
                user = await prisma.user.create({
                  data: { email, name: 'Dev User' },
                })
              }
              return user
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
