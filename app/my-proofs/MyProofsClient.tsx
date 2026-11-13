'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import {
  ClipboardList, CheckCircle, Check, X,
  Copy, ExternalLink, Trash, Plus, AlertTriangle, ArrowRight,
} from '@/app/components/icons'

const STORAGE_KEY = 'vouch_my_proofs'

interface SavedProof {
  id: string
  claimType: string
  verdict: boolean
  revokeToken: string
  createdAt?: string
  periodStart?: string
  periodEnd?: string
}

type RevokeState = 'idle' | 'confirming' | 'loading' | 'success' | 'error'

function claimTypeLabel(ct: string): string {
  if (ct === 'income_floor') return 'Income floor'
  if (ct === 'balance_floor') return 'Balance floor'
  if (ct === 'runway_floor') return 'Financial runway'
  return ct
}

const gc: React.CSSProperties = {
  background: 'rgba(252,249,243,.88)',
  backdropFilter: 'blur(20px) saturate(130%)',
  border: '1px solid rgba(255,255,255,.65)',
  boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
  borderRadius: 20,
}

function RevokeModal({ proof, onClose, onRevoked }: {
  proof: SavedProof
  onClose: () => void
  onRevoked: (id: string) => void
}) {
  const [state, setState] = useState<RevokeState>('confirming')
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    setState('loading'); setError(null)
    try {
      const res = await fetch(`/api/proofs/${proof.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeToken: proof.revokeToken }),
      })
      const body = await res.json() as { revoked?: boolean; error?: string }
      if (!res.ok) { setError(body.error ?? `Error ${res.status}`); setState('error'); return }
      setState('success'); onRevoked(proof.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error'); setState('error')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,16,11,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 24,
        backdropFilter: 'blur(8px)',
      }}
      role="dialog" aria-modal="true" aria-label="Revoke proof"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ ...gc, maxWidth: 420, width: '100%', padding: '32px 28px' }}>
        {state === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--green)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 8 }}>Proof revoked</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 24 }}>
              The link is now invalid. Anyone who visits it will see a &quot;Proof Revoked&quot; message.
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: '12px', background: 'var(--ink)', color: '#f4ede0',
              borderRadius: 999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,.08)', display: 'grid', placeItems: 'center', flexShrink: 0, color: '#dc2626' }}>
                <Trash size={16} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-.02em' }}>Revoke this proof?</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
              This will permanently invalidate the shareable link. Anyone who visits it will see a
              &quot;Proof Revoked&quot; page. This cannot be undone.
            </p>
            <div style={{
              background: 'rgba(20,16,11,.03)', borderRadius: 10, padding: '10px 14px',
              fontSize: 11, color: 'var(--ink-2)', fontFamily: 'monospace',
              wordBreak: 'break-all', marginBottom: 20,
            }}>
              {proof.id}
            </div>

            {state === 'error' && error && (
              <p role="alert" style={{ fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} disabled={state === 'loading'} style={{
                flex: 1, padding: '11px', border: '1px solid rgba(20,16,11,.12)', color: 'var(--ink)',
                borderRadius: 999, fontSize: 13, fontWeight: 500, background: 'none', cursor: 'pointer',
                opacity: state === 'loading' ? .5 : 1, transition: 'opacity .2s',
              }}>Cancel</button>
              <button onClick={handleRevoke} disabled={state === 'loading'} aria-busy={state === 'loading'} style={{
                flex: 1, padding: '11px',
                background: state === 'loading' ? 'rgba(220,38,38,.4)' : '#dc2626',
                color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                transition: 'background .2s',
              }}>
                {state === 'loading' ? 'Revoking…' : 'Yes, revoke it'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MyProofsClient() {
  const [proofs, setProofs] = useState<SavedProof[]>([])
  const [loaded, setLoaded] = useState(false)
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set())
  const [revoking, setRevoking] = useState<SavedProof | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedProof[]
        setProofs(Array.isArray(parsed) ? parsed : [])
      }
    } catch {
      // localStorage unavailable
    }
    setLoaded(true)
  }, [])

  const handleRevoked = (id: string) => setRevokedIds(prev => new Set([...prev, id]))

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}/v/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // clipboard API unavailable
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const activeCount = proofs.length - revokedIds.size

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {revoking && (
        <RevokeModal
          proof={revoking}
          onClose={() => setRevoking(null)}
          onRevoked={(id) => { handleRevoked(id); setRevoking(null) }}
        />
      )}

      <AppNav page="my-proofs" />

      {/* Dark header */}
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '44px 24px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',top:0,right:0,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.18) 0%,transparent 65%)' }} />
        <div aria-hidden style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.1) 0%,transparent 65%)' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
                padding: '5px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                fontSize: 11.5, fontWeight: 500, color: 'rgba(244,237,224,.7)', letterSpacing: '.03em',
              }}>
                <ClipboardList size={12} />
                Browser-local · Never uploaded
              </div>
              <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 10 }}>
                My Proofs
              </h1>
              {loaded && proofs.length > 0 && (
                <p style={{ fontSize: 14, color: 'rgba(244,237,224,.5)' }}>
                  {activeCount} active · {revokedIds.size} revoked
                </p>
              )}
              {loaded && proofs.length === 0 && (
                <p style={{ fontSize: 14, color: 'rgba(244,237,224,.5)' }}>
                  No proofs yet — create your first one below.
                </p>
              )}
            </div>
            <Link href="/prove" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
              marginTop: 4,
              background: 'var(--blue)', color: '#fff',
              padding: '11px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              boxShadow: '0 8px 24px -10px rgba(20,72,232,.5)',
              whiteSpace: 'nowrap',
            }}>
              <Plus size={12} /> New proof
            </Link>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {!loaded ? (
            <div style={{ ...gc, padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Loading…</p>
            </div>
          ) : proofs.length === 0 ? (
            <div style={{ ...gc, padding: '56px 32px', textAlign: 'center' }}>
              <div style={{ color: 'var(--ink-2)', display: 'flex', justifyContent: 'center', marginBottom: 18, opacity: .3 }}>
                <ClipboardList size={52} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 8 }}>No proofs yet</h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 300, margin: '0 auto 28px', lineHeight: 1.6 }}>
                Proofs you create are saved here so you can share or revoke them later.
              </p>
              <Link href="/prove" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--ink)', color: '#f4ede0',
                padding: '11px 22px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              }}>
                Create your first proof <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }} role="list">
              {proofs.map((p) => {
                const isRevoked = revokedIds.has(p.id)
                return (
                  <li key={p.id} style={{
                    ...gc,
                    padding: '18px 20px',
                    opacity: isRevoked ? .55 : 1,
                    transition: 'opacity .3s',
                    border: isRevoked ? '1px solid rgba(220,38,38,.2)' : '1px solid rgba(255,255,255,.65)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: p.verdict ? 'rgba(10,158,114,.1)' : 'rgba(220,38,38,.08)',
                            color: p.verdict ? '#0a7855' : '#b91c1c',
                          }}>
                            {p.verdict ? <Check size={10} /> : <X size={10} />}
                            {p.verdict ? 'PASS' : 'FAIL'}
                          </div>
                          <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{claimTypeLabel(p.claimType)}</span>
                          {isRevoked && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 999,
                              background: 'rgba(220,38,38,.08)', color: '#b91c1c',
                              fontSize: 11, fontWeight: 500,
                            }}>Revoked</div>
                          )}
                        </div>
                        {(p.periodStart || p.periodEnd) && (
                          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>
                            {p.periodStart} → {p.periodEnd}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--ink-2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {p.id}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => handleCopyLink(p.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 10,
                          border: '1px solid rgba(20,16,11,.1)', background: 'rgba(20,16,11,.03)',
                          fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                          cursor: 'pointer', transition: 'border-color .2s, color .2s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {copied === p.id ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy link</>}
                      </button>
                      <a
                        href={`${baseUrl}/v/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 10,
                          border: '1px solid rgba(20,16,11,.1)', background: 'rgba(20,16,11,.03)',
                          fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                          transition: 'border-color .2s, color .2s',
                        }}
                      >
                        <ExternalLink size={11} /> Open
                      </a>
                      {!isRevoked && (
                        <button
                          onClick={() => setRevoking(p)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 10,
                            border: '1px solid rgba(220,38,38,.22)', background: 'rgba(220,38,38,.03)',
                            fontSize: 12, fontWeight: 500, color: '#b91c1c',
                            cursor: 'pointer', marginLeft: 'auto', fontFamily: 'inherit',
                          }}
                        >
                          <Trash size={11} /> Revoke
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Notice */}
          <div style={{
            ...gc,
            padding: '16px 18px',
            background: 'rgba(200,144,13,.05)',
            border: '1px solid rgba(200,144,13,.2)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}><AlertTriangle size={15} /></div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7a5500', marginBottom: 3 }}>Revoke tokens stored locally</p>
              <p style={{ fontSize: 12, color: '#8a6500', lineHeight: 1.5 }}>
                Proof data is saved in your browser only. Clearing localStorage or switching browsers
                will remove your ability to revoke from here. Keep your revoke tokens from the proof
                creation step as a backup.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
