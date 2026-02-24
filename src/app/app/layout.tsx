import { Inter, Cormorant_Garamond } from 'next/font/google'
import '../globals.css'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const cormorantGaramond = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    style: ['normal', 'italic'],
    variable: '--font-serif'
})

export const metadata: Metadata = {
    title: 'SousChef — Kitchen Assistant',
    description: 'Your hands-free kitchen assistant.',
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={`${inter.variable} ${cormorantGaramond.variable}`}>
            {children}
        </div>
    )
}
