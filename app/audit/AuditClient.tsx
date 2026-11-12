'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { AuditReport, AnomalyFlag } from '@/lib/audit/index'

type Step = 'upload' | 'processing' | 'result' | 'error'

const LABEL_META: Record<string, { icon: string; color: string; name: string }> = {
  income:        { icon: '↑', color: 'text-green-700', name: 'Income' },
  expense:       { icon: '↓', color: 'text-red-600',   name: 'Expenses' },
  self_transfer: { icon: '⇄', color: 'text-blue-600',  name: 'Self-transfers' },
  refund:        { icon: '↩', color: 'text-amber-600', name: 'Refunds' },
  other:         { icon: '·', color: 'text-gray-500',  name: 'Other' },
}

const SEVERITY_META: Record<AnomalyFlag['severity'], { bg: string; badge: string; icon: string }> = {
  warn: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800', icon: '⚠' },
  info: { bg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-800',   icon: 'ℹ' },
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
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.')
      setStep('error')
      return
    }
    if (!f.name.match(/\.(csv|pdf)$/i)) {
      setError(`Unsupported file type ".${f.name.split('.').pop()}". Upload a CSV or PDF.`)
      setStep('error')
      return
    }
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-statement.csv')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv' })
      const f = new File([blob], 'sample-statement.csv', { type: 'text/csv' })
      setFile(f)
    } catch {
      setError('Could not load sample data.')
      setStep('error')
    }
  }

  const runAudit = async () => {
    if (!file) return
    setStep('processing')
    setProgressIdx(0)
    progressTimer.current = setInterval(() => {
      setProgressIdx(i => Math.min(i + 1, PROGRESS_MSGS.length - 1))
    }, 2800)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/audit', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const data = await res.json() as AuditReport
      clearInterval(progressTimer.current!)
      setReport(data)
      setStep('result')
    } catch (e) {
      clearInterval(progressTimer.current!)
      setError(e instanceof Error ? e.message : 'Unexpected error')
      setStep('error')
    }
  }

  const reset = () => {
    setStep('upload')
    setFile(null)
    setReport(null)
    setError(null)
    setProgressIdx(0)
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6" role="status" aria-label="Processing" />
          <p className="text-lg font-semibold text-gray-900 mb-1">{PROGRESS_MSGS[progressIdx]}</p>
          <p className="text-sm text-gray-500">Analysis runs inside a hardware TEE — takes 15–30 s</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis failed</h1>
          <p className="text-gray-600 mb-6" role="alert">{error}</p>
          <button onClick={reset} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">Try again</button>
        </div>
      </div>
    )
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (step === 'result' && report) {
    const r = report
    const attestPassed = r.attestation.allPassed
    const checksPassed = r.attestation.checks.filter(c => c.passed).length
    const checksTotal = r.attestation.checks.length

    return (
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Crumb + zero-storage badge */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-700">Vouch</Link>
              <span className="mx-2">›</span>
              <Link href="/audit" className="hover:text-gray-700">Expense Audit</Link>
              <span className="mx-2">›</span>
              <span>Report</span>
            </div>
            <span className="text-xs bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full">
              🔒 Zero server storage
            </span>
          </div>

          {/* Summary card */}
          <section aria-label="Summary" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Expense Audit Report</h1>
            <p className="text-sm text-gray-500 mb-5">{r.periodStart} → {r.periodEnd} · {r.transactionCount} transactions · {r.currency}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Total in</p>
                <p className="text-lg font-bold text-green-700">{fmt(r.totalInflow, r.currency)}</p>
              </div>
              <div className="text-center bg-red-50 rounded-xl p-4">
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mb-1">Total out</p>
                <p className="text-lg font-bold text-red-700">{fmt(r.totalOutflow, r.currency)}</p>
              </div>
              <div className={`text-center rounded-xl p-4 ${r.netFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${r.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net</p>
                <p className={`text-lg font-bold ${r.netFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {r.netFlow >= 0 ? '+' : '-'}{fmt(r.netFlow, r.currency)}
                </p>
              </div>
            </div>
          </section>

          {/* Category breakdown */}
          <section aria-label="Spending by category" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Spending by category</h2>
            <ul className="space-y-3" role="list">
              {r.categories.map(cat => {
                const meta = LABEL_META[cat.label] ?? { icon: '·', color: 'text-gray-500', name: cat.label }
                const pct = r.totalOutflow > 0 && cat.netFlow < 0
                  ? Math.round((cat.total / (r.totalInflow + r.totalOutflow)) * 100)
                  : null
                return (
                  <li key={cat.label} className="flex items-center gap-3">
                    <span className={`font-bold text-lg w-6 text-center ${meta.color}`} aria-hidden>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-gray-800">{meta.name}</span>
                        <span className={`text-sm font-semibold ${meta.color}`}>
                          {cat.netFlow >= 0 ? '+' : ''}{fmt(cat.netFlow, r.currency)}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-current rounded-full opacity-40"
                            style={{ width: `${Math.min(pct, 100)}%`, color: 'currentColor' }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Anomalies */}
          {r.anomalies.length > 0 && (
            <section aria-label="Anomalies detected" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Anomalies detected
                <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{r.anomalies.length}</span>
              </h2>
              <ul className="space-y-3" role="list">
                {r.anomalies.map((a, i) => {
                  const s = SEVERITY_META[a.severity]
                  return (
                    <li key={i} className={`border rounded-xl p-4 ${s.bg}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0" aria-hidden>{s.icon}</span>
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${s.badge}`}>
                            {a.severity === 'warn' ? 'Warning' : 'Note'}
                          </span>
                          <p className="text-sm text-gray-800 mt-1">{a.message}</p>
                          {a.txDate && (
                            <p className="text-xs text-gray-500 mt-1">
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
          )}

          {r.anomalies.length === 0 && (
            <section className="bg-green-50 rounded-2xl border border-green-200 p-5 text-sm text-green-800 flex gap-3">
              <span className="text-xl" aria-hidden>✅</span>
              <div>
                <p className="font-semibold mb-0.5">No anomalies detected</p>
                <p className="text-green-700">Transactions look consistent — no unusual patterns found.</p>
              </div>
            </section>
          )}

          {/* TEE Attestation */}
          <section aria-label="TEE Attestation" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`p-5 ${attestPassed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0">{attestPassed ? '🛡️' : '⚠️'}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-gray-900">
                      {attestPassed ? 'Analysis verified by hardware TEE' : 'Attestation check failed'}
                    </h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${attestPassed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {checksPassed}/{checksTotal}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    This analysis ran inside an <strong>Intel TDX Trusted Execution Environment</strong> on
                    NEAR AI Cloud. The hardware chip signs the result — Vouch&apos;s servers cannot see
                    your transactions or change the output.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowTechAttest(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none"
                aria-expanded={showTechAttest}
              >
                <span className="font-medium">Technical details</span>
                <span aria-hidden>{showTechAttest ? '▲' : '▼'}</span>
              </button>
              {showTechAttest && (
                <div className="px-5 pb-5 space-y-3">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 shrink-0">Signing address</dt>
                      <dd className="font-mono text-xs text-gray-700 break-all text-right">{r.attestation.signingAddress}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Nonce</dt>
                      <dd className="font-mono text-xs text-gray-700">{r.attestation.nonce.slice(0, 16)}…</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Timestamp</dt>
                      <dd className="text-xs text-gray-700">{new Date(r.attestation.timestamp).toLocaleString()}</dd>
                    </div>
                  </dl>
                  <ul className="space-y-1 text-xs" role="list">
                    {r.attestation.checks.map(c => (
                      <li key={c.name} className="flex gap-2 items-center">
                        <span className={c.passed ? 'text-green-600' : 'text-red-500'}>{c.passed ? '✓' : '✗'}</span>
                        <span className="font-mono text-gray-600">{c.name}</span>
                        {c.detail && <span className="text-gray-400">{c.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Zero-storage notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Nothing was stored</p>
            <p className="text-blue-700 text-xs">
              Your statement was processed entirely in memory. No transaction data, amounts, or descriptions
              were written to any database. This report exists only in your browser — once you close this
              page, it is gone. The only persistent record is the TEE attestation nonce tied to this session.
            </p>
          </div>

          <div className="text-center pb-4">
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Audit another statement
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            <Link href="/" className="hover:text-gray-700">Vouch</Link>
            <span className="mx-2">›</span>
            <span>Expense Audit</span>
          </div>
          <Link href="/prove" className="text-blue-600 hover:text-blue-700 font-medium">
            Create shareable proof →
          </Link>
        </div>

        <header>
          <h1 className="text-3xl font-bold text-gray-900">Private Expense Audit</h1>
          <p className="mt-2 text-gray-600 leading-relaxed">
            Upload a bank statement. NEAR AI Cloud&apos;s TEE categorizes your spending and flags
            anything unusual — entirely in hardware-sealed memory.
            <strong className="text-gray-900"> Nothing is stored.</strong>
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3 text-xs text-center text-gray-600">
          {[
            ['🔐', 'Hardware TEE', 'Intel TDX isolates the analysis'],
            ['🚫', 'Zero storage', 'No data written after the response'],
            ['🔎', 'Independently verifiable', 'TEE attestation receipt included'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="font-semibold text-gray-800 mb-0.5">{title}</p>
              <p className="text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        <section aria-label="File upload" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Upload your statement</h2>
            <button
              onClick={loadSample}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try sample data
            </button>
          </div>

          {file ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-gray-500 hover:text-gray-700">Remove</button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-4 ${
                isDragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-medium text-gray-700">Drop your bank statement here</p>
              <p className="text-xs text-gray-500 mt-1">CSV or PDF · max 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
            </div>
          )}

          <button
            onClick={runAudit}
            disabled={!file}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {file ? 'Run Private Audit' : 'Select a file first'}
          </button>
        </section>
      </div>
    </main>
  )
}
