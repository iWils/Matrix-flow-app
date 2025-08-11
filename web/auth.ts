
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: number
      email: string
      role: "admin" | "user" | "viewer"
      name?: string | null
    }
  }
  interface User {
    id: number
    email: string
    role: "admin" | "user" | "viewer"
    fullName?: string | null
  }
}

export const authConfig = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const user = await prisma.user.findFirst({ where: { OR: [{ username: credentials.username as string }, { email: credentials.username as string }] } })
        if (!user) return null
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok || !user.isActive) return null
        return { id: String(user.id), email: user.email, role: user.role, name: user.fullName }
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({ 
          where: { id: parseInt(user.id) } 
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.email = dbUser.email || ""
          session.user.role = dbUser.role
          session.user.name = dbUser.fullName
        }
      }
      return session
    },
  },
  // Do NOT expose personal fields; keep defaults
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies Parameters<typeof NextAuth>[0]

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
