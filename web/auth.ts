import NextAuth, { DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string | number
      email?: string | null
      name?: string | null
      role: "admin" | "user" | "viewer"
      language: string
    } & DefaultSession["user"]
  }

  interface User {
    role: "admin" | "user" | "viewer"
    language: string
  }
}


declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: "admin" | "user" | "viewer"
    language: string
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
          role: user.role,
          language: user.language
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.language = user.language;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "user" | "viewer";
        session.user.language = token.language as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
})