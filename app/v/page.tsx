'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import { Search, ArrowRight, ShieldCheck } from '@/app/components/icons'

export default function VerifyPage() {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function extractId(raw: string): string | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    // Handle full URLs like https://vouch.app/v/abc123
    try {
      const url = new URL(trimmed)
      const parts = url.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('v')
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
    } catch {
      // not a URL — treat as plain ID
    }
    // Plain ID — no slashes
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = extractId(input)
    if (!id) {
      setError('Enter a valid proof ID or proof URL.')
      inputRef.current?.focus()
      return
    }
    router.push(`/v/${id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppNav page="verify" />

      {/* Header */}
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '56px 24px 52px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',top:0,right:0,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.18) 0%,transparent 65%)' }} />
        <div aria-hidden style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.12) 0%,transparent 65%)' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(10,158,114,.15)', border: '1px solid rgba(10,158,114,.3)',
            fontSize: 11.5, fontWeight: 500, color: '#4de6a8', letterSpacing: '.03em',
          }}>
            <ShieldCheck size={12} />
            TEE-verified proofs
          </div>
          <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 14 }}>
            Verify a proof
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(244,237,224,.55)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            Enter a proof ID or paste the full link to see the verified result.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px 80px' }}>
        <div style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(252,249,243,.88)',
          backdropFilter: 'blur(20px) saturate(130%)',
          border: '1px solid rgba(255,255,255,.65)',
          boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
          borderRadius: 20, padding: '28px 28px',
        }}>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="proof-input" style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              Proof ID or link
            </label>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)', pointerEvents: 'none' }}>
                <Search size={15} />
              </div>
              <input
                ref={inputRef}
                id="proof-input"
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError('') }}
                placeholder="e.g. abc123 or https://…/v/abc123"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', background: 'rgba(240,235,224,.7)',
                  border: `1px solid ${error ? 'rgba(220,38,38,.4)' : 'rgba(20,16,11,.1)'}`,
                  borderRadius: 10, padding: '11px 14px 11px 40px',
                  fontSize: 14, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color .2s',
                }}
              />
            </div>
            {error && (
              <p style={{ fontSize: 12.5, color: '#dc2626', marginBottom: 10 }}>{error}</p>
            )}
            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '13px',
                background: 'var(--ink)', color: '#f4ede0',
                borderRadius: 999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
                transition: 'box-shadow .3s',
              }}
            >
              Look up proof <ArrowRight size={13} />
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
            Proof links look like <span style={{ fontFamily: 'monospace', background: 'rgba(20,16,11,.05)', padding: '1px 6px', borderRadius: 4 }}>vouch.app/v/abc123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
