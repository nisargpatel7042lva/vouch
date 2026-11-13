'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ProofRecord, AttestationSummary } from '@/lib/proofs/index'
import type { Disclosure } from '@/lib/claims/index'
import type { AttestationResult } from '@/lib/near/attest'
import AppNav from '@/app/components/AppNav'
import {
  CheckCircle, XCircle, ShieldCheck, AlertTriangle, Lock,
  Ban, Clock, HelpCircle, ChevronDown, ChevronUp,
  RefreshCw, ExternalLink, ArrowRight,
} from '@/app/components/icons'

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

const NEAR_AI_SIGNING_INFO = 'https://docs.near.ai'

const gc: React.CSSProperties = {
  background: 'rgba(252,249,243,.88)',
  backdropFilter: 'blur(20px) saturate(130%)',
  border: '1px solid rgba(255,255,255,.65)',
  boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
  borderRadius: 20,
}

function StatusPage({ icon, title, message, id }: { icon: React.ReactNode; title: string; message: string; id?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppNav page="verify" />
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '64px 24px 56px', position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div aria-hidden style={{ position:'absolute',inset:0,pointerEvents:'none', background:'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(20,72,232,.12) 0%, transparent 65%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, color: 'rgba(244,237,224,.35)' }}>
            {icon}
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 12 }}>
            {title}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(244,237,224,.55)', lineHeight: 1.6, marginBottom: id ? 16 : 32, maxWidth: 360, margin: id ? '0 auto 16px' : '0 auto 32px' }}>
            {message}
          </p>
          {id && (
            <p style={{ fontSize: 11, color: 'rgba(244,237,224,.3)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 32 }}>{id}</p>
          )}
          <Link href="/prove" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--blue)', color: '#fff',
            padding: '12px 24px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            boxShadow: '0 8px 24px -10px rgba(20,72,232,.5)',
          }}>
            Create a proof <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}

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
    setReVerifying(true); setReVerifyError(null)
    try {
      const res = await fetch(`/api/attest/live`)
      if (!res.ok) throw new Error(await res.text())
      setFreshAttestation(await res.json() as AttestationResult)
    } catch (e) {
      setReVerifyError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setReVerifying(false)
    }
  }

  if (status === 410 && (data as { reason?: string }).reason === 'revoked') {
    return <StatusPage
      icon={<Ban size={56} />}
      title="Proof Revoked"
      message="The person who created this proof has revoked it. No verdict is available."
      id={id}
    />
  }

  if (status === 410 && (data as { reason?: string }).reason === 'expired') {
    return <StatusPage
      icon={<Clock size={56} />}
      title="Proof Expired"
      message="This proof link has expired. Ask the sender to create a new one."
      id={id}
    />
  }

  if (status !== 200) {
    return <StatusPage
      icon={<HelpCircle size={56} />}
      title="Proof Not Found"
      message="This link is invalid or the proof no longer exists."
    />
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppNav page="verify" />

      {/* Verdict hero */}
      <div style={{
        background: proof.verdict ? 'linear-gradient(145deg,#0d1f0f,#0a1a0d)' : 'linear-gradient(145deg,#1a0c0c,#160a0a)',
        color: '#f4ede0', padding: '52px 24px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',inset:0,pointerEvents:'none',
          background: proof.verdict
            ? 'radial-gradient(ellipse 70% 90% at 25% 50%, rgba(10,158,114,.22) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 70% 90% at 25% 50%, rgba(220,38,38,.18) 0%, transparent 60%)',
        }} />
        <div aria-hidden style={{ position:'absolute',bottom:0,right:-40,width:300,height:300,pointerEvents:'none',
          background: proof.verdict
            ? 'radial-gradient(circle,rgba(10,158,114,.08) 0%,transparent 65%)'
            : 'radial-gradient(circle,rgba(220,38,38,.06) 0%,transparent 65%)',
        }} />
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div className="verdict-icon" style={{ color: proof.verdict ? '#4de6a8' : '#f87171', flexShrink: 0 }}>
              {proof.verdict ? <CheckCircle size={56} /> : <XCircle size={56} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'inline-block', marginBottom: 10,
                padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                background: proof.verdict ? 'rgba(10,158,114,.25)' : 'rgba(220,38,38,.25)',
                color: proof.verdict ? '#4de6a8' : '#f87171',
                border: `1px solid ${proof.verdict ? 'rgba(10,158,114,.4)' : 'rgba(220,38,38,.4)'}`,
              }}>
                {proof.verdict ? 'PASS' : 'FAIL'}
              </div>
              <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 10 }}>
                {proof.verdict ? 'Claim verified' : 'Claim not met'}
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(244,237,224,.65)', fontWeight: 400, lineHeight: 1.5, maxWidth: 440, marginBottom: 10 }}>
                {claimLabel(proof.claimType, proof.disclosure)}
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: 'rgba(244,237,224,.4)' }}>
                  Period: {proof.periodStart} → {proof.periodEnd}
                </span>
                <span style={{ fontSize: 12.5, color: 'rgba(244,237,224,.4)' }}>
                  Expires in {timeUntil(proof.expiresAt)}
                </span>
                <span style={{ fontSize: 12.5, color: 'rgba(244,237,224,.4)' }}>
                  Created {new Date(proof.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px' }} role="main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Claim details */}
          <section aria-label="Claim details" style={{ ...gc, padding: '22px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 16 }}>Claim details</p>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Claim type', value: proof.claimType.replace(/_/g, ' '), capitalize: true },
                { label: 'Verdict', value: proof.verdict ? 'PASS' : 'FAIL', verdictStyle: true },
                { label: 'Period covered', value: `${proof.periodStart} → ${proof.periodEnd}` },
                { label: 'Currency', value: proof.currency },
                { label: 'Threshold', value: claimLabel(proof.claimType, proof.disclosure) },
              ].map(({ label, value, capitalize, verdictStyle }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <dt style={{ fontSize: 13, color: 'var(--ink-2)', flexShrink: 0 }}>{label}</dt>
                  <dd style={{
                    fontSize: 13, fontWeight: 500, textAlign: 'right',
                    textTransform: capitalize ? 'capitalize' : undefined,
                    color: verdictStyle
                      ? (proof.verdict ? '#0a7855' : '#b91c1c')
                      : 'var(--ink)',
                    maxWidth: 300,
                  }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Integrity flags — only shown when present */}
          {proof.disclosure.integrityFlags && proof.disclosure.integrityFlags.length > 0 && (
            <section aria-label="Document integrity" style={{ ...gc, padding: '22px', borderLeft: '3px solid rgba(234,179,8,.5)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#92400e', marginBottom: 12 }}>
                Document integrity notes
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }} role="list">
                {proof.disclosure.integrityFlags.map((flag: string) => {
                  const labels: Record<string, string> = {
                    balance_discontinuity: 'Running balance did not reconcile at one or more points — data may have been partially altered',
                    date_order_violation: 'Transactions were not in strict date order — statement may have been re-sorted',
                    duplicate_rows: 'Exact duplicate rows detected — may indicate copy-paste or file corruption',
                    round_amount_bias: 'Over 80% of amounts are round numbers — possible manual entry rather than exported data',
                  }
                  return (
                    <li key={flag} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.45 }}>
                        {labels[flag] ?? flag.replace(/_/g, ' ')}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p style={{ fontSize: 11.5, color: '#92400e', marginTop: 10, lineHeight: 1.5 }}>
                These notes do not change the verdict — they are recorded so verifiers can make an informed decision.
              </p>
            </section>
          )}

          {/* Privacy guarantee */}
          <section aria-label="Privacy guarantee" style={{ ...gc, padding: '22px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 16 }}>What was not shared</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }} role="list">
              {[
                'The original bank statements or PDF files',
                'Individual transaction descriptions or amounts',
                'Account numbers or bank details',
                'Any balance other than pass/fail against the threshold',
                'The exact income, only whether it met the minimum',
              ].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ color: 'var(--blue)', flexShrink: 0, marginTop: 1 }}><Lock size={13} /></div>
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Attestation */}
          <section aria-label="Attestation" style={{ ...gc, overflow: 'hidden', padding: 0 }}>
            {/* Header */}
            <div style={{
              padding: '20px 22px',
              background: attestPassed ? 'rgba(10,158,114,.06)' : 'rgba(220,38,38,.04)',
              borderBottom: '1px solid rgba(255,255,255,.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: attestPassed ? 'rgba(10,158,114,.12)' : 'rgba(220,38,38,.1)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  color: attestPassed ? 'var(--green)' : '#dc2626',
                }}>
                  {attestPassed ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {attestPassed ? 'Computation verified by hardware' : 'Attestation check failed'}
                    </h2>
                    <div style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: attestPassed ? 'rgba(10,158,114,.12)' : 'rgba(220,38,38,.1)',
                      color: attestPassed ? '#0a7855' : '#b91c1c',
                      fontSize: 11, fontWeight: 600,
                    }}>{checksPassed}/{checksCount}</div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    This verdict was computed inside an{' '}
                    <strong style={{ color: 'var(--ink)' }}>Intel TDX Trusted Execution Environment</strong>{' '}
                    hosted by NEAR AI Cloud. The chip signs the result — even Vouch&apos;s own servers
                    cannot access its memory or change its output.
                  </p>
                </div>
              </div>
            </div>

            {/* Re-verify */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(20,16,11,.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={handleReVerify}
                  disabled={reVerifying}
                  aria-busy={reVerifying}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 16px',
                    background: reVerifying ? 'rgba(20,72,232,.35)' : 'var(--blue)',
                    color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background .2s',
                  }}
                >
                  <RefreshCw size={12} />
                  {reVerifying ? 'Verifying…' : 'Re-verify (fresh nonce)'}
                </button>
                <a
                  href={NEAR_AI_SIGNING_INFO}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 16px',
                    border: '1px solid rgba(20,16,11,.1)', borderRadius: 10,
                    fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                    transition: 'border-color .2s, color .2s',
                  }}
                >
                  <ExternalLink size={12} /> Verify on NEAR
                </a>
              </div>
              {reVerifyError && (
                <p role="alert" style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>{reVerifyError}</p>
              )}
              {freshAttestation && !reVerifying && (
                <p role="status" style={{ fontSize: 13, color: 'var(--green)', marginTop: 10 }}>
                  Fresh attestation confirmed — {freshAttestation.checks.filter(c => c.passed).length}/{freshAttestation.checks.length} checks passed.
                </p>
              )}
            </div>

            {/* Technical details accordion */}
            <button
              onClick={() => setShowTechDetails(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 22px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'inherit',
                transition: 'color .2s',
              }}
              aria-expanded={showTechDetails}
              aria-controls="tech-details"
            >
              <span>Technical attestation details</span>
              {showTechDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showTechDetails && (
              <div id="tech-details" style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <dl style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'TEE signing address', value: signingAddress || '—', mono: true },
                    { label: 'Nonce (truncated)', value: `${nonce.slice(0, 16)}…`, mono: true },
                    { label: 'Timestamp', value: new Date(timestamp).toLocaleString(), mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                      <dt style={{ color: 'var(--ink-2)', flexShrink: 0 }}>{label}</dt>
                      <dd style={{
                        fontFamily: mono ? 'monospace' : 'inherit',
                        fontSize: mono ? 11 : 13,
                        color: 'var(--ink)', textAlign: 'right', wordBreak: 'break-all',
                      }}>{value}</dd>
                    </div>
                  ))}
                </dl>

                {displayedChecks.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 10 }}>
                      Attestation checks
                    </p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }} role="list" aria-label="Attestation checks">
                      {displayedChecks.map((c) => (
                        <li key={c.name} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: c.passed ? 'var(--green)' : '#dc2626', fontWeight: 700, flexShrink: 0 }} aria-hidden>
                            {c.passed ? '✓' : '✗'}
                          </span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--ink-2)', fontSize: 11 }}>{c.name}</span>
                          {c.detail && <span style={{ color: 'var(--ink-2)', opacity: .6 }}>{c.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-2)' }}>
            Proof ID: <span style={{ fontFamily: 'monospace' }}>{id}</span>
          </p>
        </div>
      </main>
    </div>
  )
}
