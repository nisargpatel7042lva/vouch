'use client'

import { useState, useRef, useCallback } from 'react'
import type { AuditReport, AnomalyFlag } from '@/lib/audit/index'
import AppNav from '@/app/components/AppNav'
import {
  UploadCloud, FileText, CheckCircle, XCircle, ShieldCheck,
  AlertTriangle, Info, TrendingUp, Lock, EyeOff, Zap,
  X, ArrowRight, ChevronDown, ChevronUp, LisLoader,
} from '@/app/components/icons'

type Step = 'upload' | 'processing' | 'result' | 'error'

const LABEL_META: Record<string, { color: string; name: string; icon: React.ReactNode }> = {
  income:        { color: '#0a7855', name: 'Income',         icon: <TrendingUp size={14} /> },
  expense:       { color: '#b91c1c', name: 'Expenses',       icon: <XCircle size={14} /> },
  self_transfer: { color: 'var(--blue)', name: 'Self-transfers', icon: <ArrowRight size={14} /> },
  refund:        { color: 'var(--amber)', name: 'Refunds',   icon: <ArrowRight size={14} /> },
  other:         { color: 'var(--ink-2)', name: 'Other',     icon: <Info size={14} /> },
}

const SEVERITY_META: Record<AnomalyFlag['severity'], {
  bg: React.CSSProperties;
  badgeStyle: React.CSSProperties;
  icon: React.ReactNode;
}> = {
  warn: {
    bg: { background: 'rgba(200,144,13,.05)', border: '1px solid rgba(200,144,13,.2)', borderRadius: 14, padding: '14px 16px' },
    badgeStyle: { background: 'rgba(200,144,13,.1)', color: '#7a5500', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600 },
    icon: <AlertTriangle size={16} />,
  },
  info: {
    bg: { background: 'rgba(20,72,232,.04)', border: '1px solid rgba(20,72,232,.14)', borderRadius: 14, padding: '14px 16px' },
    badgeStyle: { background: 'rgba(20,72,232,.08)', color: '#1a3ea8', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600 },
    icon: <Info size={16} />,
  },
}

const PROGRESS_MSGS = [
  'Reading your statement…',
  'Classifying transactions with NEAR AI TEE…',
  'Detecting anomalies…',
  'Fetching attestation…',
  'Building your report…',
]

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const gc: React.CSSProperties = {
  background: 'rgba(252,249,243,.88)',
  backdropFilter: 'blur(20px) saturate(130%)',
  border: '1px solid rgba(255,255,255,.65)',
  boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
  borderRadius: 20,
}

export default function AuditClient() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const [showTechAttest, setShowTechAttest] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFileSelect = useCallback((f: File) => {
    if (f.size > 10 * 1024 * 1024) { setError('File too large. Maximum size is 10 MB.'); setStep('error'); return }
    if (!f.name.match(/\.(csv|pdf)$/i)) { setError(`Unsupported file type ".${f.name.split('.').pop()}". Upload a CSV or PDF.`); setStep('error'); return }
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-statement.csv')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv' })
      setFile(new File([blob], 'sample-statement.csv', { type: 'text/csv' }))
    } catch { setError('Could not load sample data.'); setStep('error') }
  }

  const runAudit = async () => {
    if (!file) return
    setStep('processing'); setProgressIdx(0)
    progressTimer.current = setInterval(() => setProgressIdx(i => Math.min(i + 1, PROGRESS_MSGS.length - 1)), 2800)
    try {
      const form = new FormData(); form.append('file', file)
      const res = await fetch('/api/audit', { method: 'POST', body: form })
      if (!res.ok) { const body = await res.json() as { error?: string }; throw new Error(body.error ?? `Error ${res.status}`) }
      const data = await res.json() as AuditReport
      clearInterval(progressTimer.current!)
      setReport(data); setStep('result')
    } catch (e) { clearInterval(progressTimer.current!); setError(e instanceof Error ? e.message : 'Unexpected error'); setStep('error') }
  }

  const reset = () => { setStep('upload'); setFile(null); setReport(null); setError(null); setProgressIdx(0) }

  /* ── Processing ── */
  if (step === 'processing') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b08', display: 'flex', flexDirection: 'column' }}>
        <AppNav page="audit" />
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
        <AppNav page="audit" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ ...gc, maxWidth: 440, width: '100%', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ color: '#dc2626', display: 'flex', justifyContent: 'center', marginBottom: 16 }}><XCircle size={40} /></div>
            <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 8 }}>Analysis failed</h1>
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
  if (step === 'result' && report) {
    const r = report
    const attestPassed = r.attestation.allPassed
    const checksPassed = r.attestation.checks.filter(c => c.passed).length
    const checksTotal = r.attestation.checks.length

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AppNav page="audit" />

        {/* Results hero */}
        <div style={{
          background: 'var(--ink)', color: '#f4ede0',
          padding: '48px 24px 44px', position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden style={{ position:'absolute',top:0,right:0,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.18) 0%,transparent 65%)' }} />
          <div aria-hidden style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.12) 0%,transparent 65%)' }} />
          <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(10,158,114,.15)', border: '1px solid rgba(10,158,114,.3)',
              fontSize: 11.5, fontWeight: 500, color: '#4de6a8', letterSpacing: '.03em',
            }}>
              <ShieldCheck size={12} />
              Audit complete · Zero data stored
            </div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: .95, marginBottom: 10 }}>
              Expense Audit Report
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(244,237,224,.55)', marginBottom: 24 }}>
              {r.periodStart} → {r.periodEnd} · {r.transactionCount} transactions · {r.currency}
            </p>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 480 }}>
              {[
                { label: 'Total in', value: fmt(r.totalInflow, r.currency), color: '#4de6a8', bg: 'rgba(10,158,114,.12)', border: 'rgba(10,158,114,.25)' },
                { label: 'Total out', value: fmt(r.totalOutflow, r.currency), color: '#f87171', bg: 'rgba(220,38,38,.1)', border: 'rgba(220,38,38,.2)' },
                {
                  label: 'Net',
                  value: (r.netFlow >= 0 ? '+' : '-') + fmt(r.netFlow, r.currency),
                  color: r.netFlow >= 0 ? '#7dd3fc' : '#fbbf24',
                  bg: r.netFlow >= 0 ? 'rgba(20,72,232,.12)' : 'rgba(200,144,13,.12)',
                  border: r.netFlow >= 0 ? 'rgba(20,72,232,.25)' : 'rgba(200,144,13,.25)',
                },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} style={{
                  textAlign: 'center', borderRadius: 14, padding: '14px 10px',
                  background: bg, border: `1px solid ${border}`,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(244,237,224,.5)', marginBottom: 5 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color, letterSpacing: '-.02em' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Category breakdown */}
            <section aria-label="Spending by category" style={{ ...gc, padding: '22px' }}>
              <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', marginBottom: 18, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Spending by category</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }} role="list">
                {r.categories.map(cat => {
                  const meta = LABEL_META[cat.label] ?? { icon: <Info size={14} />, color: 'var(--ink-2)', name: cat.label }
                  const pct = r.totalOutflow > 0 && cat.netFlow < 0
                    ? Math.round((cat.total / (r.totalInflow + r.totalOutflow)) * 100)
                    : null
                  return (
                    <li key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(20,16,11,.05)', display: 'grid', placeItems: 'center', flexShrink: 0, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{meta.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>
                            {cat.netFlow >= 0 ? '+' : ''}{fmt(cat.netFlow, r.currency)}
                          </span>
                        </div>
                        {pct !== null && (
                          <div style={{ height: 4, background: 'rgba(20,16,11,.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: meta.color, borderRadius: 99, width: `${Math.min(pct, 100)}%`, opacity: .55 }} />
                          </div>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Anomalies */}
            {r.anomalies.length > 0 ? (
              <section aria-label="Anomalies detected" style={{ ...gc, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>Anomalies detected</h2>
                  <div style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(200,144,13,.12)', color: '#7a5500',
                    fontSize: 11, fontWeight: 600,
                  }}>{r.anomalies.length}</div>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }} role="list">
                  {r.anomalies.map((a, i) => {
                    const s = SEVERITY_META[a.severity]
                    return (
                      <li key={i} style={s.bg}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ color: a.severity === 'warn' ? 'var(--amber)' : 'var(--blue)', flexShrink: 0, marginTop: 1 }}>{s.icon}</div>
                          <div>
                            <span style={s.badgeStyle}>{a.severity === 'warn' ? 'Warning' : 'Note'}</span>
                            <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 6, lineHeight: 1.5 }}>{a.message}</p>
                            {a.txDate && (
                              <p style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4 }}>
                                {a.txDate}{a.txDescription ? ` · ${a.txDescription.slice(0, 60)}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : (
              <section style={{
                ...gc,
                padding: '18px 20px',
                background: 'rgba(10,158,114,.06)',
                border: '1px solid rgba(10,158,114,.2)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }}><CheckCircle size={18} /></div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0a6644', marginBottom: 3 }}>No anomalies detected</p>
                  <p style={{ fontSize: 13, color: '#0a7855' }}>Transactions look consistent — no unusual patterns found.</p>
                </div>
              </section>
            )}

            {/* TEE Attestation */}
            <section aria-label="TEE Attestation" style={{ ...gc, overflow: 'hidden', padding: 0 }}>
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
                        {attestPassed ? 'Analysis verified by hardware TEE' : 'Attestation check failed'}
                      </h2>
                      <div style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: attestPassed ? 'rgba(10,158,114,.12)' : 'rgba(220,38,38,.1)',
                        color: attestPassed ? '#0a7855' : '#b91c1c',
                        fontSize: 11, fontWeight: 600,
                      }}>{checksPassed}/{checksTotal}</div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                      This analysis ran inside an <strong style={{ color: 'var(--ink)' }}>Intel TDX Trusted Execution Environment</strong> on
                      NEAR AI Cloud. The hardware chip signs the result — Vouch&apos;s servers cannot see
                      your transactions or change the output.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowTechAttest(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 22px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'inherit',
                  transition: 'color .2s',
                }}
                aria-expanded={showTechAttest}
              >
                <span>Technical details</span>
                {showTechAttest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showTechAttest && (
                <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <dl style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Signing address', value: r.attestation.signingAddress, mono: true },
                      { label: 'Nonce', value: `${r.attestation.nonce.slice(0, 16)}…`, mono: true },
                      { label: 'Timestamp', value: new Date(r.attestation.timestamp).toLocaleString(), mono: false },
                    ].map(({ label, value, mono }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                        <dt style={{ color: 'var(--ink-2)', flexShrink: 0 }}>{label}</dt>
                        <dd style={{ fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 11 : 13, color: 'var(--ink)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }} role="list">
                    {r.attestation.checks.map(c => (
                      <li key={c.name} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: c.passed ? 'var(--green)' : '#dc2626', fontWeight: 700, flexShrink: 0 }}>{c.passed ? '✓' : '✗'}</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--ink-2)', fontSize: 11 }}>{c.name}</span>
                        {c.detail && <span style={{ color: 'var(--ink-2)', opacity: .7 }}>{c.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Zero-storage notice */}
            <div style={{
              ...gc,
              padding: '16px 18px',
              background: 'rgba(20,72,232,.04)',
              border: '1px solid rgba(20,72,232,.14)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ color: 'var(--blue)', flexShrink: 0, marginTop: 1 }}><EyeOff size={16} /></div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Nothing was stored</p>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                  Your statement was processed entirely in memory. No transaction data, amounts, or descriptions
                  were written to any database. This report exists only in your browser.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <button onClick={reset} style={{ fontSize: 13, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Audit another statement
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  /* ── Upload ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppNav page="audit" />

      {/* Page header — dark */}
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '44px 24px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',top:0,right:0,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(200,144,13,.15) 0%,transparent 65%)' }} />
        <div aria-hidden style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.12) 0%,transparent 65%)' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
            Private Expense Audit
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(244,237,224,.55)', maxWidth: 420, lineHeight: 1.55, marginBottom: 28 }}>
            Upload a bank statement. NEAR AI Cloud&apos;s TEE categorizes your spending and flags
            anything unusual — entirely in hardware-sealed memory.{' '}
            <span style={{ color: 'rgba(244,237,224,.8)', fontWeight: 500 }}>Nothing is stored.</span>
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { icon: <Zap size={13} />, label: 'Hardware TEE', color: 'rgba(20,72,232,.8)', bg: 'rgba(20,72,232,.1)', border: 'rgba(20,72,232,.2)' },
              { icon: <EyeOff size={13} />, label: 'Zero storage', color: '#4de6a8', bg: 'rgba(10,158,114,.1)', border: 'rgba(10,158,114,.2)' },
              { icon: <ShieldCheck size={13} />, label: 'TEE attestation', color: 'rgba(244,237,224,.7)', bg: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)' },
            ].map(({ icon, label, color, bg, border }) => (
              <div key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: bg, border: `1px solid ${border}`,
                fontSize: 12, fontWeight: 500, color,
              }}>
                {icon}{label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Upload card */}
        <section aria-label="File upload" style={{ ...gc, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {file ? 'Statement ready' : 'Upload your statement'}
            </p>
            <button onClick={loadSample} style={{ fontSize: 12.5, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Try sample data
            </button>
          </div>

          {file ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(10,158,114,.06)', border: '1px solid rgba(10,158,114,.2)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,158,114,.12)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{file.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{(file.size / 1024).toFixed(1)} KB · Ready to audit</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <div
              role="button" tabIndex={0} aria-label="Drop zone"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              style={{
                border: `2px dashed ${isDragging ? 'var(--blue)' : 'rgba(20,16,11,.12)'}`,
                borderRadius: 14, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                background: isDragging ? 'rgba(20,72,232,.03)' : 'rgba(20,16,11,.015)',
                transition: 'border-color .2s, background .2s', marginBottom: 14,
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

          <button
            onClick={runAudit}
            disabled={!file}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px',
              background: file ? 'var(--blue)' : 'rgba(20,16,11,.08)',
              color: file ? '#fff' : 'var(--ink-2)',
              borderRadius: 999, fontSize: 14, fontWeight: 500, border: 'none',
              cursor: file ? 'pointer' : 'not-allowed',
              boxShadow: file ? '0 8px 24px -10px rgba(20,72,232,.5)' : 'none',
              transition: 'background .2s, color .2s, box-shadow .3s',
            }}
          >
            {file ? <>Run private audit <ArrowRight size={13} /></> : 'Select a file first'}
          </button>
        </section>

        {/* What we check */}
        <section style={{ ...gc, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 14 }}>What the audit covers</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: <TrendingUp size={14} />, iconC: '#0a7855', text: 'Income vs. expenses breakdown' },
              { icon: <AlertTriangle size={14} />, iconC: 'var(--amber)', text: 'Unusual transaction flags' },
              { icon: <ShieldCheck size={14} />, iconC: 'var(--blue)', text: 'Self-transfer identification' },
              { icon: <Lock size={14} />, iconC: 'var(--ink-2)', text: 'Zero-knowledge — no data stored' },
            ].map(({ icon, iconC, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ color: iconC, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
