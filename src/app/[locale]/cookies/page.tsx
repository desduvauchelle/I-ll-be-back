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
				<h1>ONE THING<br />REMEMBERED.</h1>
				<p>The game uses one device-local preference so returning players do not have to dismiss the same onboarding again.</p>
				<small>LAST UPDATED / JULY 25, 2026</small>
			</header>

			<div className="legal-shell site-container">
				<aside className="legal-index storage-readout" aria-label="Storage summary">
					<span>LOCAL STORAGE</span>
					<strong>1 KEY</strong>
					<p>FUNCTIONAL ONLY<br />NO ANALYTICS<br />NO ADVERTISING</p>
				</aside>
				<article className="legal-copy">
					<section><span>01</span><div><h2>THE SAVED PREFERENCE</h2><div className="storage-key"><code>ill-be-back:onboarding:v1</code><b>VALUE / complete</b></div><p>This key is created after you choose “I know the rules,” skip or exit training, or complete the guided experience. It tells the game to open directly at the table on later visits from the same browser.</p></div></section>
					<section><span>02</span><div><h2>HOW LONG IT LASTS</h2><p>The preference remains until you clear this site&apos;s data in your browser, use a browser mode that removes storage automatically, or the game changes the storage key. It is specific to the browser and device where you made the choice.</p></div></section>
					<section><span>03</span><div><h2>COOKIES + TRACKERS</h2><p>The game code does not currently set analytics or advertising cookies. The hosting or access service may use strictly necessary technology to deliver, secure, or control access to this private site. Those technologies are managed by that service rather than by the card game.</p></div></section>
					<section><span>04</span><div><h2>CONTROL YOUR CHOICE</h2><p>Use your browser&apos;s privacy or site-data settings to remove stored data for this site. After the key is removed, the onboarding question returns on your next visit. You can also replay the tutorial without clearing anything by selecting “Replay Training” in Turn Control.</p><Link className="legal-link" href={localizedPath('/play', locale)}>RETURN TO THE TABLE <b>→</b></Link></div></section>
					<section><span>05</span><div><h2>FUTURE CHANGES</h2><p>If optional analytics, marketing technology, or additional persistent storage is introduced, this notice will be updated and any required choices will be presented before that technology is used.</p></div></section>
				</article>
			</div>
		</section>
	)
}
