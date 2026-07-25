import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { localizedPath } from '@/lib/i18n-utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({
		path: '/cookies',
		locale,
		title: 'Cookies & Local Storage',
		description: "The browser storage used by I'll Be Back and how to control it.",
	})
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params

	return (
		<section className="legal-page">
			<header className="legal-hero site-container">
				<p className="eyebrow"><span /> SYSTEM FILE / STORAGE</p>
				<h1>THE TABLE<br />REMEMBERS.</h1>
				<p>The game uses two device-local records to remember onboarding and resume your current series after a reload or later visit.</p>
				<small>LAST UPDATED / JULY 25, 2026</small>
			</header>

			<div className="legal-shell site-container">
				<aside className="legal-index storage-readout" aria-label="Storage summary">
					<span>LOCAL STORAGE</span>
					<strong>2 KEYS</strong>
					<p>FUNCTIONAL ONLY<br />NO ANALYTICS<br />NO ADVERTISING</p>
				</aside>
				<article className="legal-copy">
					<section><span>01</span><div><h2>WHAT IS SAVED</h2><div className="storage-key"><code>ill-be-back:onboarding:v1</code><b>TRAINING CHOICE</b></div><div className="storage-key"><code>ill-be-back:game:v1</code><b>CURRENT TABLE</b></div><p>The onboarding key remembers whether you completed or skipped training. The game key stores the current hands, piles, active challenge, turn, game number, score, and recent action log so the same table can resume.</p></div></section>
					<section><span>02</span><div><h2>HOW LONG IT LASTS</h2><p>Both records remain until you clear this site&apos;s data, use a browser mode that removes storage automatically, or the game changes its storage format. They are specific to the browser and device where you played.</p></div></section>
					<section><span>03</span><div><h2>COOKIES + TRACKERS</h2><p>The game code does not currently set analytics or advertising cookies. The hosting service may use strictly necessary technology to deliver and secure the public site. Those technologies are managed by that service rather than by the card game.</p></div></section>
					<section><span>04</span><div><h2>CONTROL YOUR DATA</h2><p>Use your browser&apos;s privacy or site-data settings to remove these records. Removing them starts a fresh game and returns the onboarding question on your next visit. You can replay the tutorial without clearing storage by selecting “Replay Training” in Turn Control.</p><Link className="legal-link" href={localizedPath('/play', locale)}>RETURN TO THE TABLE <b>→</b></Link></div></section>
					<section><span>05</span><div><h2>FUTURE CHANGES</h2><p>If optional analytics, marketing technology, or additional persistent storage is introduced, this notice will be updated and any required choices will be presented before that technology is used.</p></div></section>
				</article>
			</div>
		</section>
	)
}
