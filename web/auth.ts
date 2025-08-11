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
    id: string
    email: string
    role: "admin" | "user" | "viewer"
    name?: string | null
  }
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "database" as const,
    maxAge: 12 * 60 * 60 // 12 hours
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: credentials.username },
              { email: credentials.username }
            ]
          }
        })
        
        if (!user || !user.isActive) return null
        
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null
        
        return {
          id: user.id.toString(),
          email: user.email || user.username,
          name: user.fullName,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: parseInt(user.id) }
        })
        
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role
          session.user.email = dbUser.email || dbUser.username
          session.user.name = dbUser.fullName
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  trustHost: true
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)