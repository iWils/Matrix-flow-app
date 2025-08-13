import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
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
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: "admin" | "user" | "viewer"
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Nécessaire pour Docker et les environnements de production
  session: {
    strategy: "jwt", // Utiliser JWT pour les credentials
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
              { username: credentials.username as string },
              { email: credentials.username as string }
            ]
          }
        })
        
        if (!user || !user.isActive) return null
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = parseInt(token.id as string);
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
})