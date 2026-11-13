'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import {
  ShieldCheck, UploadCloud, FileText, CheckCircle, XCircle,
  ArrowRight, Copy, Check, X, TrendingUp, CreditCard, CalendarRange, LisLoader,
} from '@/app/components/icons'

type ClaimType = 'income_floor' | 'balance_floor' | 'runway_floor'
type Step = 'upload' | 'claim' | 'processing' | 'result' | 'error'

interface IncomeParams { minMonthlyAmount: number; months: number; currency: string }
interface BalanceParams { minBalance: number; windowDays: number; currency: string }
interface RunwayParams { minMonths: number; windowDays: number; currency: string }
type ClaimParams = IncomeParams | BalanceParams | RunwayParams

interface ProofResult { id: string; verdict: boolean; revokeToken: string; periodStart?: string; periodEnd?: string; expiresAt?: string }
interface SavedProof { id: string; claimType: ClaimType; verdict: boolean; revokeToken: string; createdAt: string; periodStart?: string; periodEnd?: string }

const STORAGE_KEY = 'vouch_my_proofs'

function loadSaved(): SavedProof[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedProof[] } catch { return [] }
}
function persist(proof: SavedProof) {
  if (typeof window === 'undefined') return
  const all = loadSaved(); all.unshift(proof)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 20)))
}

const CLAIM_LABELS: Record<ClaimType, string> = {
  income_floor: 'Monthly Income Floor',
  balance_floor: 'Account Balance Floor',
  runway_floor: 'Financial Runway',
}

const PROGRESS_MSGS = [
  'Extracting transactions…',
  'Classifying cash flows…',
  'Running claim checks…',
  'Requesting NEAR AI attestation…',
  'Finalising proof…',
]

/* ── Shared styles ── */
const gc: React.CSSProperties = {
  background: 'rgba(252,249,243,.88)',
  backdropFilter: 'blur(20px) saturate(130%)',
  border: '1px solid rgba(255,255,255,.65)',
  boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
  borderRadius: 20,
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(240,235,224,.7)',
  border: '1px solid rgba(20,16,11,.1)', borderRadius: 10,
  padding: '10px 14px', fontSize: 14, color: 'var(--ink)',
  outline: 'none', fontFamily: 'inherit',
}

export default function ProveClient() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [claimType, setClaimType] = useState<ClaimType>('income_floor')
  const [params, setParams] = useState<ClaimParams>({ minMonthlyAmount: 3000, months: 3, currency: 'USD' })
  const [expiryHours, setExpiryHours] = useState(168)
  const [progressIdx, setProgressIdx] = useState(0)
  const [result, setResult] = useState<ProofResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [myProofs, setMyProofs] = useState<SavedProof[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setMyProofs(loadSaved()) }, [])

  const handleFileSelect = useCallback((f: File) => {
    if (f.size > 10 * 1024 * 1024) { setError('File too large. Max 10 MB.'); setStep('error'); return }
    if (!f.name.match(/\.(csv|pdf)$/i)) { setError(`Unsupported type ".${f.name.split('.').pop()}". Use CSV or PDF.`); setStep('error'); return }
    setFile(f); setError(null); setStep('upload')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-statement.csv')
      const blob = new Blob([await res.text()], { type: 'text/csv' })
      setFile(new File([blob], 'sample-statement.csv', { type: 'text/csv' }))
      setClaimType('income_floor')
      setParams({ minMonthlyAmount: 3000, months: 3, currency: 'USD' })
      setStep('claim')
    } catch { setError('Could not load sample data.'); setStep('error') }
  }

  const handleClaimChange = (ct: ClaimType) => {
    setClaimType(ct)
    if (ct === 'income_floor') setParams({ minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    else if (ct === 'balance_floor') setParams({ minBalance: 1000, windowDays: 30, currency: 'USD' })
    else setParams({ minMonths: 3, windowDays: 90, currency: 'USD' })
  }

  const handleSubmit = async () => {
    if (!file) return
    setStep('processing'); setProgressIdx(0)
    progressTimer.current = setInterval(() => setProgressIdx(i => Math.min(i + 1, PROGRESS_MSGS.length - 1)), 2500)
    try {
      const form = new FormData()
      form.append('file', file); form.append('claimType', claimType)
      form.append('params', JSON.stringify(params)); form.append('expiryHours', String(expiryHours))
      const res = await fetch('/api/proofs', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text() || `Server error ${res.status}`)
      const data = await res.json() as ProofResult
      clearInterval(progressTimer.current!)
      const saved: SavedProof = { id: data.id, claimType, verdict: data.verdict, revokeToken: data.revokeToken, createdAt: new Date().toISOString(), periodStart: data.periodStart, periodEnd: data.periodEnd }
      persist(saved); setMyProofs(loadSaved()); setResult(data); setStep('result')
    } catch (e) {
      clearInterval(progressTimer.current!); setError(e instanceof Error ? e.message : 'An unexpected error occurred.'); setStep('error')
    }
  }

  const shareLink = result && typeof window !== 'undefined' ? `${window.location.origin}/v/${result.id}` : ''

  const copyLink = async () => {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => { setStep('upload'); setFile(null); setResult(null); setError(null); setCopied(false) }

  /* ── Processing ── */
  if (step === 'processing') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b08', display: 'flex', flexDirection: 'column' }}>
        <AppNav page="prove" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32 }}>
          <LisLoader size={88} color="rgba(244,237,224,0.85)" />

          <div style={{ textAlign: 'center', maxWidth: 320 }}>
            <p style={{ fontSize: 18, fontWeight: 400, color: '#f4ede0', letterSpacing: '-.02em', marginBottom: 8 }}>
              {PROGRESS_MSGS[progressIdx]}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(244,237,224,.45)' }}>Running inside a hardware-sealed TEE</p>
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            {PROGRESS_MSGS.map((_, i) => (
              <div key={i} style={{
                width: i <= progressIdx ? 20 : 6, height: 6, borderRadius: 99,
                background: i <= progressIdx ? 'var(--blue)' : 'rgba(244,237,224,.12)',
                transition: 'width .4s var(--ease), background .4s',
              }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (step === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <AppNav page="prove" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ ...gc, maxWidth: 440, width: '100%', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ color: '#dc2626', display: 'flex', justifyContent: 'center', marginBottom: 16 }}><XCircle size={40} /></div>
            <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 28 }} role="alert">{error}</p>
            <button onClick={reset} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--ink)', color: '#f4ede0',
              padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer',
            }}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Result ── */
  if (step === 'result' && result) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AppNav page="prove" />

        {/* Verdict hero */}
        <div style={{
          background: result.verdict ? 'linear-gradient(145deg,#0d1f0f,#0a1a0d)' : 'linear-gradient(145deg,#1a0c0c,#160a0a)',
          color: '#f4ede0', padding: '52px 24px 48px', position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden style={{ position:'absolute',inset:0,pointerEvents:'none',
            background: result.verdict
              ? 'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(10,158,114,.2) 0%, transparent 60%)'
              : 'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(220,38,38,.15) 0%, transparent 60%)',
          }} />
          <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div className="verdict-icon" style={{ color: result.verdict ? '#4de6a8' : '#f87171', flexShrink: 0 }}>
                {result.verdict ? <CheckCircle size={52} /> : <XCircle size={52} />}
              </div>
              <div>
                <div style={{
                  display: 'inline-block', marginBottom: 8,
                  padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                  background: result.verdict ? 'rgba(10,158,114,.25)' : 'rgba(220,38,38,.25)',
                  color: result.verdict ? '#4de6a8' : '#f87171',
                  border: `1px solid ${result.verdict ? 'rgba(10,158,114,.4)' : 'rgba(220,38,38,.4)'}`,
                }}>
                  {result.verdict ? 'PASS' : 'FAIL'}
                </div>
                <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {result.verdict ? 'Claim verified' : 'Claim not met'}
                </h1>
                <p style={{ marginTop: 8, fontSize: 15, color: 'rgba(244,237,224,.6)', fontWeight: 400 }}>
                  {CLAIM_LABELS[claimType]}
                  {result.periodStart && ` · ${result.periodStart} → ${result.periodEnd}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Share link */}
          <section aria-label="Share link" style={{ ...gc, padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 12 }}>Share this proof</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={shareLink} aria-label="Proof share link" style={{
                ...inp, flex: 1, fontSize: 11.5, fontFamily: 'monospace', color: 'var(--ink-2)',
                background: 'rgba(20,16,11,.03)',
              }} />
              <button onClick={copyLink} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: copied ? 'var(--green)' : 'var(--ink)', color: '#f4ede0',
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .3s',
              }}>
                {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy link</>}
              </button>
            </div>
            {result.expiresAt && (
              <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>
                Link expires <strong style={{ color: 'var(--ink)' }}>{new Date(result.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </p>
            )}
          </section>

          {/* Revoke token */}
          <section aria-label="Revoke token" style={{
            ...gc, padding: '20px 22px',
            background: 'rgba(255,250,235,.9)',
            border: '1px solid rgba(200,144,13,.22)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7a5500', marginBottom: 6 }}>Save your revoke token</p>
            <p style={{ fontSize: 12.5, color: '#8a6500', marginBottom: 12, lineHeight: 1.5 }}>
              Shown once. Store it safely — you need it to revoke this proof link.
            </p>
            <code style={{
              display: 'block', background: 'rgba(255,255,255,.65)', border: '1px solid rgba(200,144,13,.2)',
              borderRadius: 10, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace',
              color: 'var(--ink)', wordBreak: 'break-all',
            }}>
              {result.revokeToken}
            </code>
          </section>

          {/* My proofs */}
          {myProofs.length > 0 && (
            <section aria-label="My proofs" style={{ ...gc, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 13.5, fontWeight: 500 }}>My proofs</p>
                <Link href="/my-proofs" style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <ArrowRight size={10} />
                </Link>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="list">
                {myProofs.slice(0, 4).map((p, i) => (
                  <li key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0', gap: 12,
                    borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                        background: p.verdict ? 'rgba(10,158,114,.1)' : 'rgba(220,38,38,.08)',
                        color: p.verdict ? '#0a7855' : '#b91c1c',
                      }}>
                        {p.verdict ? <Check size={9} /> : <X size={9} />}
                        {p.verdict ? 'PASS' : 'FAIL'}
                      </div>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {CLAIM_LABELS[p.claimType as ClaimType]}
                      </span>
                    </div>
                    <a href={`/v/${p.id}`} style={{ fontSize: 12, color: 'var(--blue)', flexShrink: 0 }}>View</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div style={{ textAlign: 'center', paddingTop: 4 }}>
            <button onClick={reset} style={{ fontSize: 13, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Create another proof
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Upload / Claim form ── */
  const stepNum = step === 'claim' ? 2 : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppNav page="prove" />

      {/* Page header — dark */}
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '44px 24px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',top:0,right:0,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.18) 0%,transparent 65%)' }} />
        <div aria-hidden style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.12) 0%,transparent 65%)' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(10,158,114,.15)', border: '1px solid rgba(10,158,114,.3)',
            fontSize: 11.5, fontWeight: 500, color: '#4de6a8', letterSpacing: '.03em',
          }}>
            <ShieldCheck size={12} />
            NEAR AI · TEE Verified
          </div>

          <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 12 }}>
            Create a proof
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(244,237,224,.55)', maxWidth: 400, lineHeight: 1.55 }}>
            Upload a bank statement. We verify your claim inside a hardware-sealed enclave
            and give you a shareable link.
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 28 }}>
            {[
              { n: 1, label: 'Upload' },
              { n: 2, label: 'Configure' },
              { n: 3, label: 'Generate' },
            ].map(({ n, label }, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{ width: 24, height: 1, background: n <= stepNum ? 'rgba(20,72,232,.6)' : 'rgba(244,237,224,.15)', margin: '0 2px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: n < stepNum ? 'var(--blue)' : n === stepNum ? 'rgba(20,72,232,.9)' : 'rgba(244,237,224,.1)',
                    border: n === stepNum ? '1px solid rgba(20,72,232,.8)' : '1px solid rgba(244,237,224,.12)',
                    fontSize: 10, fontWeight: 700, color: n <= stepNum ? '#fff' : 'rgba(244,237,224,.4)',
                    flexShrink: 0,
                  }}>
                    {n < stepNum ? <Check size={10} /> : n}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: n === stepNum ? 500 : 400, color: n === stepNum ? '#f4ede0' : 'rgba(244,237,224,.4)' }}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form content */}
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Upload card */}
        <section aria-label="File upload" style={{ ...gc, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {file ? 'Statement ready' : 'Upload statement'}
            </p>
            <button onClick={loadSample} style={{ fontSize: 12.5, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Try sample data
            </button>
          </div>

          {file ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(10,158,114,.06)', border: '1px solid rgba(10,158,114,.2)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,158,114,.12)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{file.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{(file.size / 1024).toFixed(1)} KB · Ready to verify</p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setStep('upload') }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <div
              role="button" tabIndex={0} aria-label="Drop zone for bank statement"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              style={{
                border: `2px dashed ${isDragging ? 'var(--blue)' : 'rgba(20,16,11,.12)'}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                background: isDragging ? 'rgba(20,72,232,.03)' : 'rgba(20,16,11,.015)',
                transition: 'border-color .2s, background .2s',
              }}
            >
              <div style={{ color: isDragging ? 'var(--blue)' : 'var(--ink-2)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <UploadCloud size={28} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>Drop your bank statement here</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>CSV or PDF · max 10 MB</p>
              <input ref={fileInputRef} type="file" accept=".csv,.pdf" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
            </div>
          )}

          {file && step === 'upload' && (
            <button onClick={() => setStep('claim')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 14, width: '100%', padding: '13px',
              background: 'var(--ink)', color: '#f4ede0',
              borderRadius: 999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              transition: 'box-shadow .3s',
            }}>
              Continue <ArrowRight size={13} />
            </button>
          )}
        </section>

        {/* Claim config */}
        {step === 'claim' && (
          <section aria-label="Claim configuration" style={{ ...gc, padding: '22px' }}>
            <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>Choose your claim</p>

            <fieldset style={{ border: 'none', margin: 0, padding: 0, marginBottom: 20 }}>
              <legend className="sr-only">Claim type</legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { ct: 'income_floor' as ClaimType, icon: <TrendingUp size={16} />, iconC: 'var(--green)', iconBg: 'rgba(10,158,114,.1)', label: 'Monthly Income Floor', desc: 'Prove income meets a minimum' },
                  { ct: 'balance_floor' as ClaimType, icon: <CreditCard size={16} />, iconC: 'var(--blue)', iconBg: 'rgba(20,72,232,.1)', label: 'Account Balance Floor', desc: 'Prove balance stayed above a threshold' },
                  { ct: 'runway_floor' as ClaimType, icon: <CalendarRange size={16} />, iconC: 'var(--amber)', iconBg: 'rgba(200,144,13,.1)', label: 'Financial Runway', desc: 'Prove N months of runway' },
                ]).map(({ ct, icon, iconC, iconBg, label, desc }) => (
                  <label key={ct} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    border: `1.5px solid ${claimType === ct ? 'rgba(20,72,232,.35)' : 'rgba(20,16,11,.08)'}`,
                    borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                    background: claimType === ct ? 'rgba(20,72,232,.04)' : 'transparent',
                    transition: 'border-color .2s, background .2s',
                  }}>
                    <input type="radio" name="claimType" value={ct} checked={claimType === ct} onChange={() => handleClaimChange(ct)} style={{ display: 'none' }} />
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0, color: iconC }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{desc}</p>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${claimType === ct ? 'var(--blue)' : 'rgba(20,16,11,.2)'}`,
                      background: claimType === ct ? 'var(--blue)' : 'transparent',
                      display: 'grid', placeItems: 'center', transition: 'all .2s',
                    }}>
                      {claimType === ct && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Params */}
            <div style={{ padding: '16px 0', borderTop: '1px solid rgba(20,16,11,.06)', borderBottom: '1px solid rgba(20,16,11,.06)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 14 }}>Set thresholds</p>
              {claimType === 'income_floor' && <IncomeForm params={params as IncomeParams} onChange={p => setParams(p)} inp={inp} />}
              {claimType === 'balance_floor' && <BalanceForm params={params as BalanceParams} onChange={p => setParams(p)} inp={inp} />}
              {claimType === 'runway_floor' && <RunwayForm params={params as RunwayParams} onChange={p => setParams(p)} inp={inp} />}
            </div>

            {/* Expiry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <label htmlFor="expiry" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', flexShrink: 0 }}>Link expires in</label>
              <select id="expiry" value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))}
                style={{ ...inp, width: 'auto', cursor: 'pointer', flex: 1 }}>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            <button onClick={handleSubmit} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px',
              background: 'var(--blue)', color: '#fff',
              borderRadius: 999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 24px -10px rgba(20,72,232,.5)',
              transition: 'box-shadow .3s',
            }}>
              Generate proof <ArrowRight size={13} />
            </button>
          </section>
        )}

        {/* My proofs sidebar */}
        {myProofs.length > 0 && step === 'upload' && (
          <section aria-label="Recent proofs" style={{ ...gc, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>Recent proofs</p>
              <Link href="/my-proofs" style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <ArrowRight size={10} />
              </Link>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="list">
              {myProofs.slice(0, 3).map((p, i) => (
                <li key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(20,16,11,.06)' : undefined, gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                      background: p.verdict ? 'rgba(10,158,114,.1)' : 'rgba(220,38,38,.08)',
                      color: p.verdict ? '#0a7855' : '#b91c1c', flexShrink: 0,
                    }}>{p.verdict ? 'PASS' : 'FAIL'}</div>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {CLAIM_LABELS[p.claimType as ClaimType]}
                    </span>
                  </div>
                  <a href={`/v/${p.id}`} style={{ fontSize: 12, color: 'var(--blue)', flexShrink: 0 }}>View</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function IncomeForm({ params, onChange, inp }: { params: IncomeParams; onChange: (p: IncomeParams) => void; inp: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Min monthly income</span>
        <input type="number" min={0} value={params.minMonthlyAmount} onChange={e => onChange({ ...params, minMonthlyAmount: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Months to check</span>
        <input type="number" min={1} max={24} value={params.months} onChange={e => onChange({ ...params, months: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Currency</span>
        <select value={params.currency} onChange={e => onChange({ ...params, currency: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
          <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
        </select>
      </label>
    </div>
  )
}

function BalanceForm({ params, onChange, inp }: { params: BalanceParams; onChange: (p: BalanceParams) => void; inp: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Minimum balance</span>
        <input type="number" min={0} value={params.minBalance} onChange={e => onChange({ ...params, minBalance: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Window (days)</span>
        <input type="number" min={1} value={params.windowDays} onChange={e => onChange({ ...params, windowDays: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Currency</span>
        <select value={params.currency} onChange={e => onChange({ ...params, currency: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
          <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
        </select>
      </label>
    </div>
  )
}

function RunwayForm({ params, onChange, inp }: { params: RunwayParams; onChange: (p: RunwayParams) => void; inp: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Min runway (months)</span>
        <input type="number" min={1} value={params.minMonths} onChange={e => onChange({ ...params, minMonths: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Window (days)</span>
        <input type="number" min={1} value={params.windowDays} onChange={e => onChange({ ...params, windowDays: Number(e.target.value) })} style={inp} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Currency</span>
        <select value={params.currency} onChange={e => onChange({ ...params, currency: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
          <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
        </select>
      </label>
    </div>
  )
}
