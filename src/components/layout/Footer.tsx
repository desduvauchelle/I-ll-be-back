import Link from 'next/link'
import type { Dictionary } from '@/i18n'
import { localizedPath } from '@/lib/i18n-utils'

export function Footer({ locale }: { dict: Dictionary; locale: string }) {
	return (
		<footer className="site-footer">
			<div className="site-container footer-grid">
				<Link href={localizedPath('/', locale)} className="site-logo"><span>IBB</span><strong>I&apos;LL BE BACK</strong></Link>
				<p>A ZERO-TRUST SHEDDING GAME.<br />3 IS LOW. 2 IS HIGH. HONESTY IS OPTIONAL.</p>
				<nav><Link href={localizedPath('/rules', locale)}>RULES</Link><Link href={localizedPath('/play', locale)}>PLAY THE MACHINE</Link></nav>
			</div>
			<div className="site-container footer-bottom">
				<span>© {new Date().getFullYear()} I&apos;LL BE BACK</span>
				<nav className="footer-legal-links" aria-label="Legal">
					<Link href={localizedPath('/privacy', locale)}>PRIVACY</Link>
					<Link href={localizedPath('/legal', locale)}>TERMS</Link>
					<Link href={localizedPath('/cookies', locale)}>STORAGE</Link>
				</nav>
				<span>THE CARDS REMEMBER NOTHING. YOUR TRAINING CHOICE DOES.</span>
			</div>
		</footer>
	)
}
