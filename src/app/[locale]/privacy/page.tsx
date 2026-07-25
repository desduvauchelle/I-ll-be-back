import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { localizedPath } from '@/lib/i18n-utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({
		path: '/privacy',
		locale,
		title: 'Privacy Policy',
		description: "How I'll Be Back handles browser storage and player information.",
	})
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params

	return (
		<section className="legal-page">
			<header className="legal-hero site-container">
				<p className="eyebrow"><span /> SYSTEM FILE / PRIVACY</p>
				<h1>PRIVACY<br />PROTOCOL.</h1>
				<p>This private preview keeps the game deliberately light on data. The cards remember nothing; your browser remembers only whether you dismissed or completed training.</p>
				<small>LAST UPDATED / JULY 25, 2026</small>
			</header>

			<div className="legal-shell site-container">
				<aside className="legal-index" aria-label="Policy summary">
					<span>DATA STATUS</span>
					<strong>MINIMAL</strong>
					<p>NO ACCOUNT<br />NO AD TRACKING<br />NO SAVED MATCH HISTORY</p>
				</aside>
				<article className="legal-copy">
					<section><span>01</span><div><h2>WHAT THE GAME STORES</h2><p>The game stores one preference in your browser&apos;s local storage: <code>ill-be-back:onboarding:v1</code>. Its value records that you completed or skipped the onboarding so the prompt does not return on your next visit from the same browser.</p></div></section>
					<section><span>02</span><div><h2>WHAT THE GAME DOES NOT SAVE</h2><p>No account is required. Your hand, the Machine&apos;s hand, score, turn history, and current match exist only while the game is open and are not written to local storage. The current version does not use advertising or analytics trackers and does not sell personal information.</p></div></section>
					<section><span>03</span><div><h2>ROUTINE HOSTING DATA</h2><p>The hosting service may process routine technical information needed to deliver and secure the site, such as an IP address, browser details, request time, and access or error logs. That processing is controlled by the hosting provider and may change independently of the game code.</p></div></section>
					<section><span>04</span><div><h2>YOUR CONTROLS</h2><p>You can replay training at any time from the game&apos;s Turn Control panel. You can remove the saved choice through your browser&apos;s site-data controls; the onboarding prompt will appear again the next time you visit.</p><Link className="legal-link" href={localizedPath('/cookies', locale)}>READ THE STORAGE FILE <b>→</b></Link></div></section>
					<section><span>05</span><div><h2>CHANGES + CONTACT</h2><p>If accounts, forms, analytics, advertising, or other data features are added, this policy will be updated before those features are used. For questions about this private preview, contact the site operator through the channel that provided you access.</p></div></section>
				</article>
			</div>
		</section>
	)
}
