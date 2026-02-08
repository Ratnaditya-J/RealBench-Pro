import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RealBench Pro - AI Evaluation Platform',
  description: 'Continuous, contamination-resistant evaluation platform for AI models with advanced safety detection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 min-h-screen antialiased`}>
        <ToastProvider>
          <Navigation />
          <main className="pt-16">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}
