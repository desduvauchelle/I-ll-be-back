import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { GrowthEngineProvider } from '@growth-engine/sdk-client'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { SITE_URL } from '@/lib/sitemap-shared'
import './globals.css'

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "I'll Be Back",
		template: "%s | I'll Be Back",
	},
	description: 'A zero-trust shedding card game where every draw might be a bluff.',
	openGraph: {
		title: "I'll Be Back",
		description: 'A zero-trust shedding card game where every draw might be a bluff.',
		images: ['/og.png'],
	},
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const headersList = await headers()
	const locale = headersList.get('x-locale') || 'en'
	return (
		<html lang={locale} data-theme="dark">
			<body className="min-h-screen flex flex-col ibb-site">
				<GoogleAnalytics />
				<GrowthEngineProvider>{children}</GrowthEngineProvider>
			</body>
		</html>
	)
}
