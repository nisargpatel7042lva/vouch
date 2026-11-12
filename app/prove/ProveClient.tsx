'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type ClaimType = 'income_floor' | 'balance_floor' | 'runway_floor'
type Step = 'upload' | 'claim' | 'processing' | 'result' | 'error'

interface IncomeParams { minMonthlyAmount: number; months: number; currency: string }
interface BalanceParams { minBalance: number; windowDays: number; currency: string }
interface RunwayParams { minMonths: number; windowDays: number; currency: string }
type ClaimParams = IncomeParams | BalanceParams | RunwayParams

interface ProofResult {
  id: string
  verdict: boolean
  revokeToken: string
  periodStart?: string
  periodEnd?: string
}

interface SavedProof {
  id: string
  claimType: ClaimType
  verdict: boolean
  revokeToken: string
  createdAt: string
  periodStart?: string
  periodEnd?: string
}

const STORAGE_KEY = 'vouch_my_proofs'

function loadSavedProofs(): SavedProof[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedProof[]
  } catch {
    return []
  }
}

function persistProof(proof: SavedProof) {
  if (typeof window === 'undefined') return
  const proofs = loadSavedProofs()
  proofs.unshift(proof)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs.slice(0, 20)))
}

const CLAIM_LABELS: Record<ClaimType, string> = {
  income_floor: 'Monthly Income Floor',
  balance_floor: 'Account Balance Floor',
  runway_floor: 'Financial Runway',
}

const CLAIM_DESCRIPTIONS: Record<ClaimType, string> = {
  income_floor: 'Prove your monthly income meets a minimum threshold',
  balance_floor: 'Prove your account balance stayed above a floor',
  runway_floor: 'Prove you have N months of financial runway',
}

const PROGRESS_MESSAGES = [
  'Extracting transactions…',
  'Classifying cash flows…',
  'Running claim checks…',
  'Requesting NEAR AI attestation…',
  'Finalising proof…',
]

export default function ProveClient() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [claimType, setClaimType] = useState<ClaimType>('income_floor')
  const [params, setParams] = useState<ClaimParams>({
    minMonthlyAmount: 3000,
    months: 3,
    currency: 'USD',
  })
  const [expiryHours, setExpiryHours] = useState(168)
  const [progressIdx, setProgressIdx] = useState(0)
  const [result, setResult] = useState<ProofResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [myProofs, setMyProofs] = useState<SavedProof[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMyProofs(loadSavedProofs())
  }, [])

  const handleFileSelect = useCallback((f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.')
      setStep('error')
      return
    }
    if (!f.name.match(/\.(csv|pdf)$/i)) {
      setError(`Unsupported file type "${f.name.split('.').pop()}". Please upload a CSV or PDF.`)
      setStep('error')
      return
    }
    setFile(f)
    setError(null)
    setStep('upload')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFileSelect(f)
    },
    [handleFileSelect],
  )

  const loadSampleData = async () => {
    try {
      const res = await fetch('/sample-statement.csv')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv' })
      const f = new File([blob], 'sample-statement.csv', { type: 'text/csv' })
      setFile(f)
      setClaimType('income_floor')
      setParams({ minMonthlyAmount: 3000, months: 3, currency: 'USD' })
      setStep('claim')
    } catch {
      setError('Could not load sample data.')
      setStep('error')
    }
  }

  const handleClaimTypeChange = (ct: ClaimType) => {
    setClaimType(ct)
    if (ct === 'income_floor') setParams({ minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    else if (ct === 'balance_floor') setParams({ minBalance: 1000, windowDays: 30, currency: 'USD' })
    else setParams({ minMonths: 3, windowDays: 90, currency: 'USD' })
  }

  const handleSubmit = async () => {
    if (!file) return
    setStep('processing')
    setProgressIdx(0)
    progressTimer.current = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1))
    }, 2500)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('claimType', claimType)
      form.append('params', JSON.stringify(params))
      form.append('expiryHours', String(expiryHours))

      const res = await fetch('/api/proofs', { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error ${res.status}`)
      }
      const data = (await res.json()) as ProofResult
      clearInterval(progressTimer.current!)

      const saved: SavedProof = {
        id: data.id,
        claimType,
        verdict: data.verdict,
        revokeToken: data.revokeToken,
        createdAt: new Date().toISOString(),
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      }
      persistProof(saved)
      setMyProofs(loadSavedProofs())
      setResult(data)
      setStep('result')
    } catch (e) {
      clearInterval(progressTimer.current!)
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      setStep('error')
    }
  }

  const shareLink =
    result && typeof window !== 'undefined'
      ? `${window.location.origin}/v/${result.id}`
      : ''

  const copyLink = async () => {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setStep('upload')
    setFile(null)
    setResult(null)
    setError(null)
    setCopied(false)
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div
            className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"
            role="status"
            aria-label="Processing"
          />
          <p className="text-lg font-semibold text-gray-900 mb-1">{PROGRESS_MESSAGES[progressIdx]}</p>
          <p className="text-sm text-gray-500">This takes about 15–30 seconds</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4" aria-hidden>❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6" role="alert">{error}</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <section
            aria-label="Proof result"
            className={`rounded-2xl shadow-sm border-2 p-8 text-center ${
              result.verdict ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
            }`}
          >
            <div className="text-6xl mb-3" aria-hidden>{result.verdict ? '✅' : '❌'}</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {result.verdict ? 'Claim Verified' : 'Claim Not Met'}
            </h1>
            <p className="text-gray-700 font-medium">{CLAIM_LABELS[claimType]}</p>
          </section>

          <section aria-label="Share link" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Share this proof</h2>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareLink}
                aria-label="Proof share link"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </section>

          <section
            aria-label="Revoke token"
            className="bg-amber-50 rounded-2xl border border-amber-200 p-6"
          >
            <h2 className="text-base font-semibold text-amber-900 mb-1">Save your revoke token</h2>
            <p className="text-sm text-amber-800 mb-3">
              This is shown once. Keep it safe — you need it to revoke this proof link.
            </p>
            <code className="block bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 break-all">
              {result.revokeToken}
            </code>
          </section>

          {myProofs.length > 0 && (
            <section aria-label="My proofs" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My proofs</h2>
              <ul className="divide-y divide-gray-100" role="list">
                {myProofs.slice(0, 5).map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span
                        className={`text-xs font-bold ${p.verdict ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {p.verdict ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{CLAIM_LABELS[p.claimType]}</span>
                    </div>
                    <a href={`/v/${p.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex justify-center gap-6 text-sm">
            <Link href="/my-proofs" className="text-blue-600 hover:text-blue-700 font-medium">
              View all my proofs →
            </Link>
            <button onClick={reset} className="text-gray-500 hover:text-gray-700 underline">
              Create another proof
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-sm text-gray-500 flex justify-between items-center">
          <div>
            <Link href="/" className="hover:text-gray-700 transition-colors">Vouch</Link>
            <span className="mx-2">›</span>
            <span>Create proof</span>
          </div>
          <Link href="/my-proofs" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            My proofs →
          </Link>
        </div>
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create a proof</h1>
          <p className="mt-2 text-gray-600">Upload a bank statement and choose what to prove.</p>
        </header>

        {/* File upload — always visible */}
        <section aria-label="File upload" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">1. Upload your statement</h2>
            <button
              onClick={loadSampleData}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try sample data
            </button>
          </div>

          {file ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>📄</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setStep('upload') }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone for bank statement file"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <div className="text-4xl mb-3" aria-hidden>📂</div>
              <p className="text-sm font-medium text-gray-700">Drop your bank statement here</p>
              <p className="text-xs text-gray-500 mt-1">CSV or PDF · max 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
            </div>
          )}

          {file && step === 'upload' && (
            <button
              onClick={() => setStep('claim')}
              className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          )}
        </section>

        {/* Claim picker */}
        {step === 'claim' && (
          <section aria-label="Claim configuration" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">2. Choose your claim</h2>

            <fieldset className="space-y-3 mb-6">
              <legend className="sr-only">Claim type</legend>
              {(['income_floor', 'balance_floor', 'runway_floor'] as ClaimType[]).map((ct) => (
                <label
                  key={ct}
                  className={`flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                    claimType === ct
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="claimType"
                    value={ct}
                    checked={claimType === ct}
                    onChange={() => handleClaimTypeChange(ct)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{CLAIM_LABELS[ct]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{CLAIM_DESCRIPTIONS[ct]}</p>
                  </div>
                </label>
              ))}
            </fieldset>

            <div className="border-t border-gray-100 pt-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">3. Set thresholds</h3>
              {claimType === 'income_floor' && (
                <IncomeParamsForm
                  params={params as IncomeParams}
                  onChange={(p) => setParams(p)}
                />
              )}
              {claimType === 'balance_floor' && (
                <BalanceParamsForm
                  params={params as BalanceParams}
                  onChange={(p) => setParams(p)}
                />
              )}
              {claimType === 'runway_floor' && (
                <RunwayParamsForm
                  params={params as RunwayParams}
                  onChange={(p) => setParams(p)}
                />
              )}
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 block mb-2" htmlFor="expiry">
                Link expires in
              </label>
              <select
                id="expiry"
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Generate Proof
            </button>
          </section>
        )}

        {/* My proofs */}
        {myProofs.length > 0 && (
          <section aria-label="My proofs" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">My proofs</h2>
            <ul className="divide-y divide-gray-100" role="list">
              {myProofs.slice(0, 5).map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span
                      className={`text-xs font-bold ${p.verdict ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {p.verdict ? '✓ PASS' : '✗ FAIL'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{CLAIM_LABELS[p.claimType]}</span>
                  </div>
                  <a href={`/v/${p.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                    View
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function IncomeParamsForm({
  params,
  onChange,
}: {
  params: IncomeParams
  onChange: (p: IncomeParams) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Min monthly income</span>
        <input
          type="number"
          min={0}
          value={params.minMonthlyAmount}
          onChange={(e) => onChange({ ...params, minMonthlyAmount: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Months to check</span>
        <input
          type="number"
          min={1}
          max={24}
          value={params.months}
          onChange={(e) => onChange({ ...params, months: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Currency</span>
        <select
          value={params.currency}
          onChange={(e) => onChange({ ...params, currency: e.target.value })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
          <option>INR</option>
        </select>
      </label>
    </div>
  )
}

function BalanceParamsForm({
  params,
  onChange,
}: {
  params: BalanceParams
  onChange: (p: BalanceParams) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Minimum balance</span>
        <input
          type="number"
          min={0}
          value={params.minBalance}
          onChange={(e) => onChange({ ...params, minBalance: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Window (days)</span>
        <input
          type="number"
          min={1}
          value={params.windowDays}
          onChange={(e) => onChange({ ...params, windowDays: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Currency</span>
        <select
          value={params.currency}
          onChange={(e) => onChange({ ...params, currency: e.target.value })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
          <option>INR</option>
        </select>
      </label>
    </div>
  )
}

function RunwayParamsForm({
  params,
  onChange,
}: {
  params: RunwayParams
  onChange: (p: RunwayParams) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Min runway (months)</span>
        <input
          type="number"
          min={1}
          value={params.minMonths}
          onChange={(e) => onChange({ ...params, minMonths: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Window (days)</span>
        <input
          type="number"
          min={1}
          value={params.windowDays}
          onChange={(e) => onChange({ ...params, windowDays: Number(e.target.value) })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600 font-medium">Currency</span>
        <select
          value={params.currency}
          onChange={(e) => onChange({ ...params, currency: e.target.value })}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
          <option>INR</option>
        </select>
      </label>
    </div>
  )
}
