'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ProofRecord, AttestationSummary } from '@/lib/proofs/index'
import type { Disclosure } from '@/lib/claims/index'
import type { AttestationResult } from '@/lib/near/attest'

interface VerifierProps {
  id: string
  initialData: Record<string, unknown>
  initialStatus: number
}

type ProofData = Omit<ProofRecord, 'disclosure' | 'attestationSummary'> & {
  disclosure: Disclosure
  attestationSummary: AttestationSummary
}

function claimLabel(claimType: string, disclosure: Disclosure): string {
  if (claimType === 'income_floor') {
    const p = disclosure.params as { minMonthlyAmount: number; months: number; currency: string }
    return `Monthly income at least ${p.currency} ${p.minMonthlyAmount.toLocaleString()} for ${p.months} month${p.months !== 1 ? 's' : ''}`
  }
  if (claimType === 'balance_floor') {
    const p = disclosure.params as { minBalance: number; windowDays: number; currency: string }
    return `Account balance never below ${p.currency} ${p.minBalance.toLocaleString()} over ${p.windowDays} days`
  }
  if (claimType === 'runway_floor') {
    const p = disclosure.params as { minMonths: number; windowDays: number; currency: string }
    return `Financial runway at least ${p.minMonths} months (${p.windowDays}-day window)`
  }
  return claimType
}

function timeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  return `${hours}h ${Math.floor((diff % 3_600_000) / 60_000)}m`
}

const NEAR_AI_SIGNING_INFO = 'https://docs.near.ai/docs/attestation'

export default function VerifierClient({ id, initialData, initialStatus }: VerifierProps) {
  const [status] = useState(initialStatus)
  const [data] = useState(initialData)
  const [reVerifying, setReVerifying] = useState(false)
  const [freshAttestation, setFreshAttestation] = useState<AttestationResult | null>(null)
  const [reVerifyError, setReVerifyError] = useState<string | null>(null)
  const [showTechDetails, setShowTechDetails] = useState(false)

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const handleReVerify = async () => {
    setReVerifying(true)
    setReVerifyError(null)
    try {
      const res = await fetch(`/api/attest/live`)
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json() as AttestationResult
      setFreshAttestation(result)
    } catch (e) {
      setReVerifyError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setReVerifying(false)
    }
  }

  if (status === 410 && (data as { reason?: string }).reason === 'revoked') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Revoked</h1>
          <p className="text-gray-600">The person who created this proof has revoked it. No verdict is available.</p>
          <p className="mt-4 text-xs text-gray-500 font-mono break-all">{id}</p>
        </div>
      </main>
    )
  }

  if (status === 410 && (data as { reason?: string }).reason === 'expired') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Expired</h1>
          <p className="text-gray-600">This proof link has expired. Ask the sender to create a new one.</p>
          <p className="mt-4 text-xs text-gray-500 font-mono break-all">{id}</p>
        </div>
      </main>
    )
  }

  if (status !== 200) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>❓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Not Found</h1>
          <p className="text-gray-600">This link is invalid or the proof no longer exists.</p>
        </div>
      </main>
    )
  }

  const proof = data as ProofData
  const attestPassed = freshAttestation?.allPassed ?? proof.attestationSummary.allPassed
  const signingAddress = freshAttestation?.signingAddress ?? proof.attestationSummary.signingAddress
  const nonce = freshAttestation?.nonce ?? proof.attestationSummary.nonce
  const timestamp = freshAttestation?.timestamp ?? proof.attestationSummary.timestamp
  const checksPassed = freshAttestation
    ? freshAttestation.checks.filter(c => c.passed).length
    : proof.attestationSummary.checksPassed
  const checksCount = freshAttestation
    ? freshAttestation.checks.length
    : proof.attestationSummary.checksCount

  const displayedChecks: Array<{ name: string; passed: boolean; detail?: string }> =
    freshAttestation
      ? freshAttestation.checks
      : proof.attestationSummary.checksCount > 0
        ? Array.from({ length: proof.attestationSummary.checksCount }, (_, i) => ({
            name: `check_${i + 1}`,
            passed: i < proof.attestationSummary.checksPassed,
            detail: '',
          }))
        : []

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4" role="main">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Nav crumb */}
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700 transition-colors">Vouch</Link>
          <span className="mx-2">›</span>
          <span>Verify proof</span>
        </div>

        {/* Verdict card */}
        <section
          aria-label="Verdict"
          className={`rounded-2xl shadow-sm border-2 p-8 text-center ${
            proof.verdict
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <div className="text-6xl mb-3" aria-hidden>{proof.verdict ? '✅' : '❌'}</div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            {proof.verdict ? 'Claim Verified' : 'Claim Not Met'}
          </h1>
          <p className="text-lg text-gray-700 font-medium">
            {claimLabel(proof.claimType, proof.disclosure)}
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Period: {proof.periodStart} → {proof.periodEnd} · Currency: {proof.currency}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Expires in {timeUntil(proof.expiresAt)} · Created {new Date(proof.createdAt).toLocaleDateString()}
          </p>
        </section>

        {/* What you learned */}
        <section aria-label="Claim details" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Claim type</dt>
              <dd className="font-medium text-gray-900 capitalize">{proof.claimType.replace(/_/g, ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Verdict</dt>
              <dd className={`font-bold ${proof.verdict ? 'text-green-700' : 'text-red-700'}`}>
                {proof.verdict ? 'PASS' : 'FAIL'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Period covered</dt>
              <dd className="font-medium text-gray-900">{proof.periodStart} → {proof.periodEnd}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Currency</dt>
              <dd className="font-medium text-gray-900">{proof.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Threshold</dt>
              <dd className="font-medium text-gray-900 text-right max-w-xs">{claimLabel(proof.claimType, proof.disclosure)}</dd>
            </div>
          </dl>
        </section>

        {/* What they did NOT see */}
        <section aria-label="Privacy guarantee" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Privacy guarantee</h2>
          <ul className="space-y-2 text-sm text-gray-700" role="list">
            {[
              'The original bank statements or PDF files',
              'Individual transaction descriptions or amounts',
              'Account numbers or bank details',
              'Any balance other than pass/fail against the threshold',
              'The exact income, only whether it met the minimum',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-500 shrink-0" aria-hidden>🔒</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Attestation panel — plain-English first */}
        <section aria-label="Attestation" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Plain-English header */}
          <div className={`p-6 ${attestPassed ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0" aria-hidden>{attestPassed ? '🛡️' : '⚠️'}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-gray-900">
                    {attestPassed ? 'Computation verified by hardware' : 'Attestation check failed'}
                  </h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    attestPassed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {attestPassed ? `${checksPassed}/${checksCount} ✓` : `${checksPassed}/${checksCount}`}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  This verdict was computed inside an <strong>Intel TDX Trusted Execution Environment</strong> hosted
                  by NEAR AI Cloud. The TEE is a sealed compartment in the processor chip — even Vouch&apos;s own
                  servers cannot access its memory or change its output. The chip signs the result with a
                  private key that never leaves the hardware.
                </p>
              </div>
            </div>
          </div>

          {/* Re-verify + independent check */}
          <div className="p-6 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleReVerify}
                disabled={reVerifying}
                aria-busy={reVerifying}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {reVerifying ? 'Verifying…' : 'Re-verify (fresh nonce)'}
              </button>
              <a
                href={NEAR_AI_SIGNING_INFO}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg text-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Verify independently on NEAR ↗
              </a>
            </div>

            {reVerifyError && (
              <p role="alert" className="text-sm text-red-600">{reVerifyError}</p>
            )}

            {freshAttestation && !reVerifying && (
              <p role="status" className="text-sm text-green-700">
                Fresh attestation confirmed — {freshAttestation.checks.filter(c => c.passed).length}/{freshAttestation.checks.length} checks passed.
              </p>
            )}
          </div>

          {/* Collapsible technical details */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => setShowTechDetails(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-inset focus:ring-2 focus:ring-gray-300"
              aria-expanded={showTechDetails}
              aria-controls="tech-details"
            >
              <span className="font-medium">Technical attestation details</span>
              <span aria-hidden>{showTechDetails ? '▲' : '▼'}</span>
            </button>

            {showTechDetails && (
              <div id="tech-details" className="px-6 pb-6 space-y-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-gray-500 shrink-0">TEE signing address</dt>
                    <dd className="font-mono text-xs text-gray-700 break-all sm:text-right">{signingAddress || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nonce (truncated)</dt>
                    <dd className="font-mono text-xs text-gray-700">{nonce.slice(0, 16)}…</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Timestamp</dt>
                    <dd className="text-gray-700 text-xs">{new Date(timestamp).toLocaleString()}</dd>
                  </div>
                </dl>

                {displayedChecks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attestation checks</p>
                    <ul className="space-y-1 text-xs" role="list" aria-label="Attestation checks">
                      {displayedChecks.map((c) => (
                        <li key={c.name} className="flex gap-2 items-center">
                          <span className={c.passed ? 'text-green-600' : 'text-red-500'} aria-hidden>
                            {c.passed ? '✓' : '✗'}
                          </span>
                          <span className="font-mono text-gray-600">{c.name}</span>
                          {c.detail && <span className="text-gray-400">{c.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-gray-500 pb-4">
          Proof ID: <span className="font-mono">{id}</span>
        </p>
      </div>
    </main>
  )
}
