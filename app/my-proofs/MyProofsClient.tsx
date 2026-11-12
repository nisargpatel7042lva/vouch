'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

function RevokeModal({
  proof,
  onClose,
  onRevoked,
}: {
  proof: SavedProof
  onClose: () => void
  onRevoked: (id: string) => void
}) {
  const [state, setState] = useState<RevokeState>('confirming')
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`/api/proofs/${proof.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeToken: proof.revokeToken }),
      })
      const body = await res.json() as { revoked?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? `Error ${res.status}`)
        setState('error')
        return
      }
      setState('success')
      onRevoked(proof.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setState('error')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Revoke proof"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {state === 'success' ? (
          <div className="text-center">
            <div className="text-5xl mb-4" aria-hidden>✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Proof revoked</h2>
            <p className="text-gray-600 text-sm mb-6">
              The link is now invalid. Anyone who visits it will see a &quot;Proof Revoked&quot; message.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Revoke this proof?</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently invalidate the shareable link. Anyone who visits it will see a
              &quot;Proof Revoked&quot; page. This cannot be undone.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 font-mono break-all mb-5">
              {proof.id}
            </div>

            {state === 'error' && error && (
              <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={state === 'loading'}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={state === 'loading'}
                aria-busy={state === 'loading'}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors"
              >
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
      // ignore
    }
    setLoaded(true)
  }, [])

  const handleRevoked = (id: string) => {
    setRevokedIds(prev => new Set([...prev, id]))
  }

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}/v/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback: select text
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      {revoking && (
        <RevokeModal
          proof={revoking}
          onClose={() => setRevoking(null)}
          onRevoked={(id) => {
            handleRevoked(id)
            setRevoking(null)
          }}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Nav crumb */}
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700 transition-colors">Vouch</Link>
          <span className="mx-2">›</span>
          <span>My proofs</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Proofs</h1>
          <Link
            href="/prove"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New proof
          </Link>
        </div>

        {!loaded ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">Loading…</p>
          </div>
        ) : proofs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="text-5xl mb-4" aria-hidden>📋</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No proofs yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Proofs you create are saved here so you can share or revoke them later.
            </p>
            <Link
              href="/prove"
              className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create your first proof
            </Link>
          </div>
        ) : (
          <ul className="space-y-4" role="list">
            {proofs.map((p) => {
              const isRevoked = revokedIds.has(p.id)
              return (
                <li
                  key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm p-5 ${
                    isRevoked ? 'border-red-200 opacity-60' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-bold text-sm ${p.verdict ? 'text-green-700' : 'text-red-600'}`}>
                          {p.verdict ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="text-gray-400 text-xs">·</span>
                        <span className="text-sm text-gray-700">{claimTypeLabel(p.claimType)}</span>
                        {isRevoked && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Revoked</span>
                        )}
                      </div>
                      {(p.periodStart || p.periodEnd) && (
                        <p className="text-xs text-gray-500 mb-2">
                          {p.periodStart} → {p.periodEnd}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 font-mono truncate max-w-xs">{p.id}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyLink(p.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 transition-colors"
                    >
                      {copied === p.id ? '✓ Copied' : 'Copy link'}
                    </button>
                    <a
                      href={`${baseUrl}/v/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 transition-colors"
                    >
                      Open ↗
                    </a>
                    {!isRevoked && (
                      <button
                        onClick={() => setRevoking(p)}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 hover:border-red-400 rounded-lg text-red-600 hover:text-red-700 transition-colors ml-auto"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Your revoke tokens are stored here</p>
          <p className="text-amber-700 text-xs">
            Proof data is saved in your browser only. If you clear localStorage or switch browsers,
            you will not be able to revoke proofs from this page. Keep your revoke tokens from the
            proof creation step as a backup.
          </p>
        </div>
      </div>
    </main>
  )
}
