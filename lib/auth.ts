import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
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

        const email = credentials.email.toLowerCase().trim()

        // Helper: check if an email is authorized (AuthorizedEmail table may not exist)
        async function isEmailAuthorized(emailToCheck: string) {
          try {
            // If the AuthorizedEmail model exists in Prisma schema
            // this will work; otherwise it will throw and we fall back
            const auth = await (prisma as any).authorizedEmail.findUnique({ where: { email: emailToCheck } })
            return auth && auth.isActive
          } catch (err) {
            // model not present or other DB error — deny by default
            return false
          }
        }

        // Bootstrap: if there are no admins yet, allow first user to become super_admin
        const anyAdmin = await prisma.admin.findFirst()

        let user = await prisma.user.findUnique({ where: { email }, include: { company: true, admin: true } })

        if (!anyAdmin) {
          // First-time setup: create a super_admin user
          let defaultCompany = await prisma.company.findFirst({ where: { code: 'DEFAULT' } })
          if (!defaultCompany) {
            defaultCompany = await prisma.company.create({ data: { name: 'Compagnie par défaut', code: 'DEFAULT' } })
          }
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                firstName: email.split('@')[0],
                lastName: '',
                companyId: defaultCompany.id,
                role: 'super_admin',
              },
              include: { company: true, admin: true }
            })
            await prisma.admin.create({ data: { userId: user.id, role: 'super_admin', companyId: null } })
          }
          return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), role: user.role, companyId: user.companyId }
        }

        // Otherwise only allow if user exists and is admin/super_admin OR email is in AuthorizedEmail
        const emailAuthorized = await isEmailAuthorized(email)

        if (!user) {
          // if email authorized, we can optionally create a user record (viewer role)
          if (emailAuthorized) {
            let defaultCompany = await prisma.company.findFirst({ where: { code: 'DEFAULT' } })
            if (!defaultCompany) defaultCompany = await prisma.company.create({ data: { name: 'Compagnie par défaut', code: 'DEFAULT' } })
            user = await prisma.user.create({ data: { email, firstName: email.split('@')[0], lastName: '', companyId: defaultCompany.id }, include: { company: true } })
          } else {
            return null
          }
        }

        // allow if existing user has admin role or email is authorized
        if (user.role === 'admin' || user.role === 'super_admin' || emailAuthorized) {
          return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), role: user.role, companyId: user.companyId }
        }

        return null
      }
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

      // Helper: check AuthorizedEmail table if present
      async function isEmailAuthorized(emailToCheck: string) {
        try {
          const auth = await (prisma as any).authorizedEmail.findUnique({ where: { email: emailToCheck } })
          return auth && auth.isActive
        } catch (err) {
          return false
        }
      }

      const email = user.email.toLowerCase()
      const emailAuthorized = await isEmailAuthorized(email)
      const anyAdmin = await prisma.admin.findFirst()

      // Pour Google OAuth
      if (account?.provider === "google") {
        let existingUser = await prisma.user.findUnique({ where: { email } })

        if (!existingUser) {
          if (!anyAdmin) {
            // Bootstrap: create first super_admin
            let defaultCompany = await prisma.company.findFirst({ where: { code: "DEFAULT" } })
            if (!defaultCompany) {
              defaultCompany = await prisma.company.create({ data: { name: "Compagnie par défaut", code: "DEFAULT" } })
            }

            existingUser = await prisma.user.create({
              data: {
                email,
                firstName: user.name?.split(' ')[0] || "Utilisateur",
                lastName: user.name?.split(' ').slice(1).join(' ') || "",
                companyId: defaultCompany.id,
                role: "super_admin",
                googleAuthId: account.providerAccountId,
              }
            })

            await prisma.admin.create({ data: { userId: existingUser.id, role: "super_admin", companyId: null } })
            return true
          }

          // If not bootstrap, allow creation only if email is authorized
          if (emailAuthorized) {
            let defaultCompany = await prisma.company.findFirst({ where: { code: "DEFAULT" } })
            if (!defaultCompany) {
              defaultCompany = await prisma.company.create({ data: { name: "Compagnie par défaut", code: "DEFAULT" } })
            }

            existingUser = await prisma.user.create({
              data: {
                email,
                firstName: user.name?.split(' ')[0] || "Utilisateur",
                lastName: user.name?.split(' ').slice(1).join(' ') || "",
                companyId: defaultCompany.id,
                role: "user",
                googleAuthId: account.providerAccountId,
              }
            })

            return true
          }

          return false
        }

        // existing user exists: allow if admin role or authorized email
        if (existingUser.role === 'admin' || existingUser.role === 'super_admin' || emailAuthorized) {
          if (!existingUser.googleAuthId) {
            await prisma.user.update({ where: { email }, data: { googleAuthId: account.providerAccountId } })
          }
          return true
        }

        return false
      }

      // For other providers/providers-less flows, allow sign-in only if email is authorized or user is admin
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser && (existingUser.role === 'admin' || existingUser.role === 'super_admin')) return true
      if (emailAuthorized) return true
      return false
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
