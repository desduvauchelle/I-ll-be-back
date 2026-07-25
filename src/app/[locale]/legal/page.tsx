import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { localizedPath } from '@/lib/i18n-utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	return buildPageMetadata({
		path: '/legal',
		locale,
		title: 'Terms of Use',
		description: "Basic terms for playing I'll Be Back on this website.",
	})
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params

	return (
		<section className="legal-page">
			<header className="legal-hero site-container">
				<p className="eyebrow"><span /> SYSTEM FILE / TERMS</p>
				<h1>TABLE<br />PROTOCOL.</h1>
				<p>By using this private preview, you agree to play fair enough for the software to function—even when the rules let you bluff.</p>
				<small>LAST UPDATED / JULY 25, 2026</small>
			</header>

			<div className="legal-shell site-container">
				<aside className="legal-index" aria-label="Terms summary">
					<span>PLAY MODE</span>
					<strong>CASUAL</strong>
					<p>NO WAGERS<br />NO PRIZES<br />NO PURCHASE REQUIRED</p>
				</aside>
				<article className="legal-copy">
					<section><span>01</span><div><h2>ENTERTAINMENT ONLY</h2><p>I&apos;ll Be Back is a casual card game. This website does not offer gambling, cash prizes, real-money competition, or financial products. You are responsible for using the site lawfully and appropriately.</p></div></section>
					<section><span>02</span><div><h2>USING THE SITE</h2><p>You may use the site for personal, non-commercial play. Do not interfere with its operation, attempt to bypass access controls, introduce malicious code, or use automated systems in a way that disrupts play for others.</p></div></section>
					<section><span>03</span><div><h2>RULES + AVAILABILITY</h2><p>The published game rules control this digital version. The rules, computer strategy, features, and availability may be corrected, changed, suspended, or withdrawn as the game evolves. A match in progress may be lost when a page is refreshed or closed.</p><Link className="legal-link" href={localizedPath('/rules', locale)}>READ THE RULES <b>→</b></Link></div></section>
					<section><span>04</span><div><h2>OWNERSHIP</h2><p>The I&apos;ll Be Back name, original game rules presentation, visual identity, site copy, and software are protected by applicable intellectual-property laws. Standard playing-card ranks and suits are not claimed as exclusive property.</p></div></section>
					<section><span>05</span><div><h2>NO WARRANTY</h2><p>The private preview is provided “as is” and “as available,” without warranties to the extent permitted by law. The operator is not responsible for lost game progress, interruptions, device issues, or indirect losses resulting from use of the preview.</p></div></section>
					<section><span>06</span><div><h2>CHANGES + QUESTIONS</h2><p>Continued use after updated terms are posted means you accept the revised terms. For questions, contact the site operator through the channel that provided you access to this private preview.</p></div></section>
				</article>
			</div>
		</section>
	)
}
