#!/bin/bash
# Script pour mettre à jour la configuration d'authentification dans le conteneur

echo "Mise à jour de la configuration NextAuth.js..."

# Créer un fichier auth.js temporaire avec la nouvelle configuration
cat > /tmp/auth-fix.js << 'EOF'
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = parseInt(token.id);
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
})
EOF

echo "Configuration mise à jour créée dans /tmp/auth-fix.js"