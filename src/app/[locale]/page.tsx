import type { Metadata } from 'next'
import Link from 'next/link'
import { localizedPath } from '@/lib/i18n-utils'
import { buildPageMetadata } from '@/lib/seo'

function HeroCard({ rank, suit, className = '' }: { rank: string; suit: string; className?: string }) {
	return <span className={`hero-playing-card ${className}`} aria-hidden="true"><b>{rank}</b><i>{suit}</i><strong>{suit}</strong></span>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({
		path: '',
		locale,
		title: "I'll Be Back",
		description: 'A zero-trust shedding card game where every draw might be a bluff.',
		brand: false,
		image: '/og.png',
	})
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return (
		<>
			<section className="home-hero">
				<div className="hero-grid-bg" />
				<div className="site-container home-hero-grid">
					<div className="home-hero-copy">
						<p className="eyebrow"><span /> ZERO-TRUST CARD PROTOCOL</p>
						<h1>I&apos;LL<br />BE <em className="landing-blood-accent">BACK.</em></h1>
						<p className="hero-lede">Beat the rank. Build the count. Bluff the draw. A fast shedding game where “I can&apos;t play” never means what you think it means.</p>
						<div className="hero-actions">
							<Link href={localizedPath('/play', locale)} className="site-button site-button-light">PLAY THE MACHINE <span>→</span></Link>
							<Link href={localizedPath('/rules', locale)} className="site-button site-button-ghost">READ THE RULES</Link>
						</div>
						<div className="hero-meta"><div><strong>2–6</strong><span>PLAYERS</span></div><div><strong>8</strong><span>CARDS EACH</span></div><div><strong>0</strong><span>TRUST REQUIRED</span></div></div>
					</div>
					<div className="hero-visual">
						<div className="hero-card-scene" role="img" aria-label="Matching threes level up the table from one card to a pair">
							<div className="hero-scene-grid" aria-hidden="true" />
							<div className="hero-card-side hero-card-side-left"><HeroCard rank="3" suit="♣" /><HeroCard rank="3" suit="♥" className="hero-card-raised" /></div>
							<div className="hero-card-message">
								<small>ADD THE SAME RANK</small>
								<strong>I&apos;LL BE<br />BACK.</strong>
								<div><span>1 × 3</span><b>→</b><span>2 × 3</span></div>
								<p>LEVEL UP THE COUNT.</p>
							</div>
							<div className="hero-card-side hero-card-side-right"><HeroCard rank="4" suit="♠" /><HeroCard rank="4" suit="♦" className="hero-card-raised" /></div>
							<div className="hero-mini-deck" aria-hidden="true"><span>IBB</span></div>
						</div>
						<p>ONE DECK / ZERO TRUST / SAY IT WHEN THE COUNT GOES UP</p>
					</div>
				</div>
			</section>
			<div className="rank-marquee" aria-label="Card ranking from low to high"><span>LOW</span><b>3</b><i>·</i><b>4</b><i>·</i><b>5</b><i>·</i><b>6</b><i>·</i><b>7</b><i>·</i><b>8</b><i>·</i><b>9</b><i>·</i><b>10</b><i>·</i><b>J</b><i>·</i><b>Q</b><i>·</i><b>K</b><i>·</i><b>A</b><i>·</i><b>2</b><span>HIGH</span></div>
			<section className="protocol-section">
				<div className="site-container">
					<div className="section-heading split-heading"><div><p className="eyebrow dark"><span /> CORE LOOP</p><h2>OUTRANK.<br />OUTCOUNT.<br /><em>OUTBLUFF.</em></h2></div><p>The rules look simple from across the table. Then somebody draws three cards, smiles, and plays the triple they had all along.</p></div>
					<div className="protocol-grid">
						<article><span>01</span><div className="protocol-icon">3 → 7</div><h3>BEAT THE RANK</h3><p>A higher rank must match the exact number of cards in play.</p></article>
						<article><span>02</span><div className="protocol-icon">7 + 7</div><h3>BUILD THE COUNT</h3><p>Add the active rank to turn singles into pairs, triples, and beyond.</p></article>
						<article className="protocol-feature"><span>03</span><div className="protocol-icon">? + 3</div><h3>DRAW. THEN RETURN.</h3><p>Claim you cannot play. Draw the count. Then reveal any legal response from your whole hand—or disappear until the sequence comes back.</p></article>
					</div>
				</div>
			</section>
			<section className="bluff-section">
				<div className="site-container bluff-grid">
					<div className="bluff-quote"><span>“</span><blockquote>I CAN&apos;T<br />PLAY.</blockquote><small>— A PERSON WHO CAN ABSOLUTELY PLAY</small></div>
					<div className="bluff-copy"><p className="eyebrow"><span /> THE ZERO-TRUST RULE</p><h2>HONESTY IS<br />NOT A MECHANIC.</h2><p>You never reveal your hand. You never prove you were stuck. Drawing can be a penalty, a bluff, or the setup for an immediate comeback.</p><Link href={localizedPath('/play', locale)} className="text-link">TEST YOUR POKER FACE <span>→</span></Link></div>
				</div>
			</section>
			<section className="final-cta"><div className="site-container final-cta-inner"><div><p className="eyebrow dark"><span /> HUMAN VS. MACHINE</p><h2>THINK YOU CAN<br />GET OUT FIRST?</h2></div><Link href={localizedPath('/play', locale)} className="site-button site-button-dark">ENTER THE TABLE <span>→</span></Link></div></section>
		</>
	)
}
