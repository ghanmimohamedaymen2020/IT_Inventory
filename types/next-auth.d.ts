import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      companyId: string
      role: string
      company?: {
        id: string
        name: string
        code: string
      }
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    companyId: string
    role: string
  }
}
