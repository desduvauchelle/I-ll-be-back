import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { localizedPath } from '@/lib/i18n-utils'
import { buildPageMetadata } from '@/lib/seo'

const rules = [
	['01', 'LOAD THE DECK', 'Use a standard 52-card deck with no jokers. Suits do not matter. Deal eight cards each. With one deck, play with two to six people.'],
	['02', 'OPEN THE TABLE', 'For game one, everyone draws high; tied leaders redraw. The winner starts with any same-rank set: single, pair, triple, or four of a kind.'],
	['03', 'BEAT IT OR BUILD IT', 'Play exactly the active count at a higher rank, or add any number of the active rank to increase the count. Three is low. Two is high.'],
	['04', 'BLUFF THE DRAW', 'You may claim you cannot play even when you can. Draw cards equal to the active count, then play any legal response from your whole hand—or decline.'],
	['05', 'WHEN IT COMES BACK', 'If everyone declines and play returns to the last successful player, that player may continue or clear the table and restart with any same-rank set.'],
	['06', 'RECYCLE THE PAST', 'When the draw pile empties, preserve every hand and the current active set. Shuffle all older played cards. If too few cards exist, draw only what is available.'],
	['07', 'GET OUT', 'Empty your hand to leave the game. Continue until one player remains. First out wins; the final player holding cards loses.'],
	['08', 'THE NEXT GAME', 'The loser gives the winner one highest-ranked card. The winner returns any card—even the same one. The previous loser starts.'],
]

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({ path: '/rules', locale, title: 'Rules of Engagement', description: "The complete rules for I'll Be Back, the zero-trust shedding game.", image: '/og.png' })
}

export default async function RulesPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return <section className="rules-page"><div className="site-container rules-hero"><div><p className="eyebrow"><span /> RULES OF ENGAGEMENT</p><h1>THE FIELD<br />MANUAL.</h1><p>Everything you need to survive the table. Trust nothing except the count.</p></div><div className="rules-poster"><Image src="/ill-be-back-rules-poster.png" alt="I'll Be Back rules poster" fill sizes="(max-width: 800px) 100vw, 45vw" /></div></div><div className="rank-marquee compact"><span>LOW</span><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b><b>10</b><b>J</b><b>Q</b><b>K</b><b>A</b><b>2</b><span>HIGH</span></div><div className="site-container rules-grid">{rules.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}</div><div className="site-container rules-example"><div><small>EXAMPLE SEQUENCE</small><strong>3</strong><i>→ MATCH</i><strong>3 + 3</strong><i>→ BEAT</i><strong>4 + 4 + 4</strong></div><p>A single 3 is matched by another 3, creating a pair. One more 3 makes triples. The next higher play must contain exactly three matching cards.</p></div><div className="site-container rules-cta"><h2>RULES LOADED.<br />NOW BREAK THEIR TRUST.</h2><Link href={localizedPath('/play', locale)} className="site-button site-button-light">PLAY THE MACHINE <span>→</span></Link></div></section>
}
