import type { Metadata } from 'next'
import { GameTable } from '@/components/game/GameTable'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({ path: '/play', locale, title: 'Play the Machine', description: "Play I'll Be Back against a bluffing computer opponent.", image: '/og.png' })
}

export default function PlayPage() {
	return <section className="play-page"><div className="site-container play-intro"><div><p className="eyebrow"><span /> LIVE TABLE / HUMAN VS. MACHINE</p><h1>DON&apos;T TRUST<br />THE DRAW.</h1></div><p>Select matching cards from your hand, then play them. The Machine knows the rules—and it knows how to lie.</p></div><div className="site-container"><GameTable /></div></section>
}
