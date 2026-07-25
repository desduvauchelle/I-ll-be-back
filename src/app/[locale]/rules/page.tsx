import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { localizedPath } from '@/lib/i18n-utils'
import { buildPageMetadata } from '@/lib/seo'

type Suit = '♠' | '♥' | '♦' | '♣'

function RuleCard({ rank, suit = '♠', back = false, offset = 0 }: { rank?: string; suit?: Suit; back?: boolean; offset?: number }) {
	return (
		<span className={`rule-card ${back ? 'is-back' : ''}`} style={{ '--rule-card-offset': `${offset * 13}px` } as CSSProperties} aria-hidden="true">
		{back ? <b>IBB</b> : <><strong>{rank}</strong><i>{suit}</i></>}
		</span>
	)
}

const referenceRules = [
	['PASSING IS LEGAL', 'Playing is never mandatory. You may pass voluntarily and rejoin when your next turn comes around.'],
	['DRAW, THEN DECIDE', 'Claim you cannot play and draw the active count—even if you could play. After drawing, play any legal response from your whole hand or pass.'],
	['WHEN IT COMES BACK', 'Once play returns to the last successful player, they may continue the sequence or clear the table and restart with any matching set.'],
	['RECYCLE THE PAST', 'If the draw pile runs out, keep all hands and the active set in place. Shuffle older table cards. If too few remain, draw only those available.'],
	['EMPTY HAND WINS', 'The instant you play your final card, you are out and safe. Continue until only one player still holds cards.'],
	['THE NEXT GAME', 'The loser gives the winner one highest-ranked card. The winner returns any card they choose, and the loser starts the next game.'],
]

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({ path: '/rules', locale, title: 'How to Play', description: "Learn I'll Be Back step by step with a visual guide to drawing, dealing, playing, and leveling up.", image: '/og.png' })
}

export default async function RulesPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return (
		<section className="rules-page">
			<header className="site-container rules-hero rules-hero-clear">
				<div>
					<p className="eyebrow"><span /> HOW TO PLAY</p>
					<h1>EMPTY YOUR<br />HAND.</h1>
				</div>
				<div className="rules-hero-summary">
					<strong>THE WHOLE GAME IN ONE SENTENCE</strong>
					<p>Add matching cards at the same rank to grow the required count—or play exactly that count at a higher rank. Whenever you grow the count, say “I&apos;ll be back.” First player with no cards wins.</p>
					<div className="rules-rank-key"><small>LOW</small><b>3</b><span>→</span><b>4 · 5 · 6 · 7 · 8 · 9 · 10 · J · Q · K · A</b><span>→</span><b>2</b><small>HIGH</small></div>
				</div>
			</header>

			<section className="rules-walkthrough" aria-labelledby="start-title">
				<div className="site-container rules-section-heading"><span>01</span><div><small>SETUP / LEFT TO RIGHT</small><h2 id="start-title">START THE GAME.</h2></div></div>
				<div className="rules-step-viewport">
					<ol className="site-container rules-step-track">
						<li>
							<div className="rule-visual rule-draw-visual"><div><RuleCard rank="Q" suit="♥" /></div><div><RuleCard rank="8" suit="♣" /></div><div><RuleCard rank="Q" suit="♦" /></div></div>
							<small>STEP 1</small><h3>DRAW FOR STARTER</h3><p>Everyone draws one random card. The highest rank starts.</p>
						</li>
						<li>
							<div className="rule-visual rule-versus"><RuleCard rank="Q" suit="♥" /><b>=</b><RuleCard rank="Q" suit="♦" /></div>
							<small>IF THE TOP CARDS TIE</small><h3>DRAW AGAIN</h3><p>Only a clear high card wins. Keep redrawing ties, then shuffle all starter cards back into the deck.</p>
						</li>
						<li>
							<div className="rule-visual rule-deal-visual">{Array.from({ length: 8 }, (_, index) => <RuleCard key={index} back offset={index} />)}<b>× 8</b></div>
							<small>STEP 2</small><h3>DEAL EIGHT EACH</h3><p>Remove the jokers. Suits do not matter. Eight cards is the standard starting hand.</p>
						</li>
						<li>
							<div className="rule-visual rule-card-group"><RuleCard rank="6" suit="♣" /><RuleCard rank="6" suit="♥" /><RuleCard rank="6" suit="♠" /></div>
							<small>STEP 3</small><h3>START WITH ANY SET</h3><p>The starter may open with any rank and any number of matching cards: one, a pair, a triple, or four of a kind.</p>
						</li>
					</ol>
				</div>
			</section>

			<section className="rules-turn-section" aria-labelledby="turn-title">
				<div className="site-container rules-section-heading"><span>02</span><div><small>THE CORE LOOP</small><h2 id="turn-title">TAKE A TURN.</h2></div></div>
				<div className="site-container turn-path">
					<article className="turn-path-start">
						<div className="turn-path-label"><span>ON THE TABLE</span><b>1 × 3</b></div>
						<div className="rule-visual"><RuleCard rank="3" suit="♠" /></div>
						<h3>READ TWO THINGS</h3><p>The table tells you the required <b>count</b> and the current <b>rank</b>. Here, it is one 3.</p>
					</article>
					<div className="turn-branch" aria-hidden="true"><span>YOUR TWO LEGAL PLAYS</span></div>
					<article className="turn-option is-level">
						<div className="turn-path-label"><span>OPTION A / SAME RANK</span><b>LEVEL UP</b></div>
						<div className="rule-equation"><RuleCard rank="3" suit="♠" /><b>+</b><RuleCard rank="3" suit="♥" /><b>=</b><span className="rule-count-badge">2 × 3</span></div>
						<h3>ADD THE SAME RANK</h3><p>Add one or more 3s. Each card increases the required count. As you level it up, say <b>“I&apos;ll be back.”</b> The next player must now answer a pair.</p>
					</article>
					<article className="turn-option is-beat">
						<div className="turn-path-label"><span>OPTION B / HIGHER RANK</span><b>BEAT IT</b></div>
						<div className="rule-equation"><span className="rule-count-badge">2 × 3</span><b>→</b><div className="rule-card-group compact"><RuleCard rank="5" suit="♦" /><RuleCard rank="5" suit="♣" /></div></div>
						<h3>MATCH THE COUNT, GO HIGHER</h3><p>To change rank, play exactly the required count at any higher rank. A pair of 5s beats a pair of 3s.</p>
					</article>
					<article className="turn-option is-next-level">
						<div className="turn-path-label"><span>THEN IT CAN GROW AGAIN</span><b>3 × 5</b></div>
						<div className="rule-equation"><div className="rule-card-group compact"><RuleCard rank="5" suit="♦" /><RuleCard rank="5" suit="♣" /></div><b>+</b><RuleCard rank="5" suit="♥" /></div>
						<h3>SAME RANK ADDS TO THE COUNT</h3><p>Add another 5, say <b>“I&apos;ll be back,”</b> and the challenge becomes three 5s. The next higher-rank response must contain exactly three matching cards.</p>
					</article>
				</div>
			</section>

			<section className="rules-decision-section">
				<div className="site-container rules-section-heading"><span>03</span><div><small>WHEN YOU DO NOT PLAY</small><h2>DRAW OR PASS.</h2></div></div>
				<div className="site-container rules-decision-grid">
					<article><div className="rule-visual rule-draw-stack"><RuleCard back /><RuleCard back offset={1} /><RuleCard back offset={2} /><b>DRAW THE COUNT</b></div><h3>CLAIM YOU CAN&apos;T PLAY</h3><p>Draw as many cards as the active count. You are allowed to say this even if you already have a legal play.</p></article>
					<span className="rules-decision-arrow">→</span>
					<article><div className="rule-visual rule-choice"><b>PLAY</b><i>OR</i><b>PASS</b></div><h3>CHECK YOUR WHOLE HAND</h3><p>After the draw, immediately make any legal play—including the new cards—or pass and wait for your next turn.</p></article>
				</div>
			</section>

			<section className="site-container rules-reference">
				<div className="rules-section-heading"><span>04</span><div><small>KEEP THESE CLOSE</small><h2>THE REST OF THE RULES.</h2></div></div>
				<div className="rules-reference-grid">{referenceRules.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
			</section>

			<div className="site-container rules-cta"><h2>THREE IS LOW.<br />TWO IS HIGH.<br />EMPTY YOUR HAND.</h2><Link href={localizedPath('/play', locale)} className="site-button site-button-light">PLAY THE MACHINE <span>→</span></Link></div>
		</section>
	)
}
