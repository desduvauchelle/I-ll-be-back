'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavLink { href: string; label: string }

export function MobileMenu({ links }: { links: NavLink[] }) {
	const [menuOpen, setMenuOpen] = useState(false)
	return <><button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}><span /><span /></button>{menuOpen && <div className="mobile-menu-panel"><nav className="site-container">{links.map((link) => <Link key={link.href} href={link.href} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>{link.label}</Link>)}</nav></div>}</>
}

