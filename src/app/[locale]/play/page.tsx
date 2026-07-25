import type { Metadata } from 'next'
import Link from 'next/link'
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
			<nav className="play-utility-bar" aria-label="Game navigation">
				<Link className="play-utility-home" href={localizedPath('/', locale)} aria-label="Leave the table and return home">
					<span aria-hidden="true">←</span>
					<b>LEAVE TABLE</b>
				</Link>
				<span className="play-utility-title"><i aria-hidden="true" /> I&apos;LL BE BACK / LIVE TABLE</span>
				<Link className="play-utility-rules" href={localizedPath('/rules', locale)}>RULES <span aria-hidden="true">↗</span></Link>
			</nav>
			<div className="play-table-shell"><GameTable /></div>
		</section>
	)
}
