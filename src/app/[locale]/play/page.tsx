import type { Metadata } from 'next'
import { GameTable } from '@/components/game/GameTable'
import { localizedPath } from '@/lib/i18n-utils'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({ path: '/play', locale, title: 'Play the Machine', description: "Play I'll Be Back against a bluffing computer opponent.", image: '/og.png' })
}

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params

	return (
		<section className="play-page">
			<div className="play-table-shell"><GameTable homeHref={localizedPath('/', locale)} rulesHref={localizedPath('/rules', locale)} /></div>
		</section>
	)
}
