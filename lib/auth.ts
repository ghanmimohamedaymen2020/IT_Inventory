import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

const providers: any[] = []

// Google OAuth si configuré
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  )
}

// Credentials temporaire pour développement
if (process.env.NODE_ENV === 'development') {
  providers.push(
    CredentialsProvider({
      name: "Email (Dev Mode)",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "votre@email.com" }
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== 'string') return null
        
        // Vérifier ou créer l'utilisateur
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true, admin: true }
        })

        if (!user) {
          // Créer compagnie par défaut
          let defaultCompany = await prisma.company.findFirst({
            where: { code: "DEFAULT" }
          })

          if (!defaultCompany) {
            defaultCompany = await prisma.company.create({
              data: {
                name: "Compagnie par défaut",
                code: "DEFAULT"
              }
            })
          }

          // Créer utilisateur
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              firstName: credentials.email.split('@')[0],
              lastName: "",
              companyId: defaultCompany.id,
              role: "super_admin",
            },
            include: { company: true, admin: true }
          })

          // Créer admin
          await prisma.admin.create({
            data: {
              userId: user.id,
              role: "super_admin",
              companyId: null
            }
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          companyId: user.companyId,
        }
      }
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
        session.user.email = token.email as string
        session.user.companyId = token.companyId as string
        session.user.role = token.role as string
        if (token.company) {
          session.user.company = token.company as any
        }
      }
      return session
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Récupérer l'utilisateur complet
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { company: true, admin: true }
        })

        if (dbUser) {
          token.sub = dbUser.id
          token.email = dbUser.email
          token.companyId = dbUser.companyId
          token.role = dbUser.role
          token.company = dbUser.company
        }
      }
      return token
    },
    async signIn({ user, account }) {
      if (!user.email) return false

      // Pour Google OAuth
      if (account?.provider === "google") {
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          let defaultCompany = await prisma.company.findFirst({
            where: { code: "DEFAULT" }
          })

          if (!defaultCompany) {
            defaultCompany = await prisma.company.create({
              data: {
                name: "Compagnie par défaut",
                code: "DEFAULT"
              }
            })
          }

          existingUser = await prisma.user.create({
            data: {
              email: user.email,
              firstName: user.name?.split(' ')[0] || "Utilisateur",
              lastName: user.name?.split(' ').slice(1).join(' ') || "",
              companyId: defaultCompany.id,
              role: "super_admin",
              googleAuthId: account.providerAccountId,
            }
          })

          await prisma.admin.create({
            data: {
              userId: existingUser.id,
              role: "super_admin",
              companyId: null
            }
          })
        } else if (!existingUser.googleAuthId) {
          await prisma.user.update({
            where: { email: user.email },
            data: { googleAuthId: account.providerAccountId },
          })
        }
      }

      return true
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: process.env.NEXTAUTH_SECRET,
})
