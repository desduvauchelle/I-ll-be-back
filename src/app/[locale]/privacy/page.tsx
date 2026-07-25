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
				<p>The public game keeps data deliberately local. Your browser remembers training and the current table so you can return without creating an account.</p>
				<small>LAST UPDATED / JULY 25, 2026</small>
			</header>

			<div className="legal-shell site-container">
				<aside className="legal-index" aria-label="Policy summary">
					<span>DATA STATUS</span>
					<strong>MINIMAL</strong>
					<p>NO ACCOUNT<br />NO AD TRACKING<br />DEVICE-LOCAL SAVE</p>
				</aside>
				<article className="legal-copy">
					<section><span>01</span><div><h2>WHAT THE GAME STORES</h2><p>The browser stores <code>ill-be-back:onboarding:v1</code> for your training choice and <code>ill-be-back:game:v1</code> for the resumable table. The table record includes both hands, draw and recycle piles, active cards, turn state, game number, win totals, and the recent action log.</p></div></section>
					<section><span>02</span><div><h2>WHAT THE GAME DOES NOT SAVE</h2><p>No account is required, and the saved game is not uploaded to a game-owned player database. The current version does not use advertising or analytics trackers, build a cross-device match history, or sell personal information.</p></div></section>
					<section><span>03</span><div><h2>ROUTINE HOSTING DATA</h2><p>The hosting service may process routine technical information needed to deliver and secure the site, such as an IP address, browser details, request time, and access or error logs. That processing is controlled by the hosting provider and may change independently of the game code.</p></div></section>
					<section><span>04</span><div><h2>YOUR CONTROLS</h2><p>You can replay training from Turn Control. Clearing this site&apos;s browser data removes both the saved table and training choice, so the next visit begins fresh.</p><Link className="legal-link" href={localizedPath('/cookies', locale)}>READ THE STORAGE FILE <b>→</b></Link></div></section>
					<section><span>05</span><div><h2>CHANGES + CONTACT</h2><p>If accounts, forms, analytics, advertising, or other data features are added, this policy will be updated before those features are used. For questions, contact the site operator through the channel that shared this game.</p></div></section>
				</article>
			</div>
		</section>
	)
}
