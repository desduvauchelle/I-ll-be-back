import Link from 'next/link'
import type { Dictionary } from '@/i18n'
import { localizedPath } from '@/lib/i18n-utils'
import { MobileMenu } from './MobileMenu'

export function Header({ locale }: { dict: Dictionary; locale: string }) {
	const links = [
		{ href: localizedPath('/', locale), label: 'HOME' },
		{ href: localizedPath('/rules', locale), label: 'RULES' },
		{ href: localizedPath('/play', locale), label: 'PLAY' },
	]
	return (
		<header className="site-header">
			<div className="site-container site-nav">
				<Link href={localizedPath('/', locale)} className="site-logo"><span>IBB</span><strong>I&apos;LL BE BACK</strong></Link>
				<nav className="desktop-nav">{links.map((link) => <Link key={link.href} href={link.href} className={link.label === 'PLAY' ? 'nav-play' : ''}>{link.label}</Link>)}</nav>
				<MobileMenu links={links} />
			</div>
		</header>
	)
}

