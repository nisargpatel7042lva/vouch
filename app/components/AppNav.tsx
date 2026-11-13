'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { VouchMark, ArrowRight } from './icons'

type Page = 'prove' | 'audit' | 'my-proofs' | 'verify' | 'about'

interface AppNavProps {
  page?: Page
}

const NAV_LINKS: Array<{ href: string; label: string; page: Page }> = [
  { href: '/prove',     label: 'Create proof', page: 'prove'     },
  { href: '/audit',     label: 'Expense audit', page: 'audit'    },
  { href: '/my-proofs', label: 'My proofs',     page: 'my-proofs'},
]

export default function AppNav({ page }: AppNavProps) {
  useEffect(() => {
    const nav = document.getElementById('app-nav')
    if (!nav) return
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      id="app-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        transition: 'background .35s, box-shadow .35s',
      }}
      className="[&.scrolled]:bg-[rgba(240,235,224,.92)] [&.scrolled]:backdrop-blur-xl [&.scrolled]:shadow-[0_1px_0_var(--border)]"
    >
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontWeight: 500,
            fontSize: 17,
            letterSpacing: '-.03em',
            color: 'var(--ink)',
            flexShrink: 0,
            marginRight: 16,
          }}
        >
          <VouchMark size={28} />
          Vouch
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 2 }}
          className="hidden sm:flex">
          {NAV_LINKS.map(({ href, label, page: p }) => (
            <Link
              key={p}
              href={href}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: page === p ? 500 : 400,
                color: page === p ? 'var(--ink)' : 'var(--ink-2)',
                background: page === p ? 'rgba(20,16,11,.06)' : 'transparent',
                transition: 'background .25s, color .25s',
                whiteSpace: 'nowrap',
              }}
              className={page !== p ? 'hover:bg-black/[.04] hover:!text-[var(--ink)]' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/v"
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 500,
              color: page === 'verify' ? 'var(--ink)' : 'var(--ink-2)',
              border: '1px solid var(--border)',
              transition: 'border-color .25s, color .25s',
              whiteSpace: 'nowrap',
            }}
            className="hidden sm:block hover:border-[rgba(20,16,11,.22)] hover:!text-[var(--ink)]"
          >
            Verify proof
          </Link>
          <Link
            href="/prove"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              borderRadius: 999,
              background: 'var(--ink)',
              color: '#f4ede0',
              fontSize: 13.5,
              fontWeight: 500,
              transition: 'transform .3s var(--ease), box-shadow .3s var(--ease)',
              whiteSpace: 'nowrap',
            }}
            className="hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(20,16,11,.55)]"
          >
            Create proof
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </header>
  )
}
