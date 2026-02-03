import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import NotificationsBell from '@/components/ui/notifications-bell'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IT Inventory Management",
  description: "Système de gestion de parc informatique",
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}> 
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header>
              <div className="fixed top-4 right-4 z-50">
                <NotificationsBell />
              </div>
            </Header>
            <main className="flex-1 p-6">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
