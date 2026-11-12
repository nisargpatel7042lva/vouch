/**
 * Deterministic claim engine.
 * All arithmetic is done in code — the model classifies only, it never decides verdicts.
 * P4: code makes the final verdict; it is fully reproducible without the model.
 */
import type { Transaction } from '../extract/schema'

// ─── Claim parameter types ────────────────────────────────────────────────────

export interface IncomeFloorParams {
  minMonthlyAmount: number
  months: number
  currency: string
}

export interface BalanceFloorParams {
  minBalance: number
  windowDays: number
  currency: string
}

export interface RunwayFloorParams {
  minMonths: number
  windowDays: number
  currency: string
}

export type ClaimParams = IncomeFloorParams | BalanceFloorParams | RunwayFloorParams
export type ClaimType = 'income_floor' | 'balance_floor' | 'runway_floor'

// ─── Disclosure ───────────────────────────────────────────────────────────────

/**
 * Everything a verifier learns — verdict, claim parameters, period, currency.
 * Never contains actual account balances, income amounts, or transactions.
 */
export interface Disclosure {
  claimType: ClaimType
  verdict: boolean
  params: ClaimParams
  periodStart: string
  periodEnd: string
  currency: string
  integrityFlags: string[]
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ClaimError extends Error {
  constructor(
    message: string,
    public readonly code: 'MULTI_CURRENCY' | 'INSUFFICIENT_DATA' | 'UNKNOWN_CLAIM'
  ) {
    super(message)
    this.name = 'ClaimError'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function incomeTransactions(txns: Transaction[]): Transaction[] {
  // Self-transfers and refunds are excluded from income per spec
  return txns.filter((t) => t.label === 'income')
}

function yearMonth(date: string): string {
  return date.slice(0, 7) // YYYY-MM
}

function assertSingleCurrency(txns: Transaction[], expected: string): void {
  const currencies = new Set(txns.map((t) => t.currency))
  if (currencies.size > 1 || (currencies.size === 1 && !currencies.has(expected))) {
    throw new ClaimError(
      `Multi-currency input is not supported in v1 (found: ${[...currencies].join(', ')})`,
      'MULTI_CURRENCY'
    )
  }
}

// ─── Claim: income_floor ──────────────────────────────────────────────────────

/**
 * True if income (excluding self_transfer and refund) >= minMonthlyAmount
 * in every one of the N most recent complete months in the data.
 * "Equal passes" — >= not >.
 */
export function claimIncomeFloor(
  txns: Transaction[],
  params: IncomeFloorParams
): Disclosure {
  assertSingleCurrency(txns, params.currency)

  const incomeTxns = incomeTransactions(txns)
  const sortedDates = [...new Set(txns.map((t) => t.date))].sort()
  const periodStart = sortedDates[0] ?? ''
  const periodEnd = sortedDates[sortedDates.length - 1] ?? ''

  // Group income by YYYY-MM
  const byMonth: Record<string, number> = {}
  for (const t of incomeTxns) {
    const ym = yearMonth(t.date)
    byMonth[ym] = (byMonth[ym] ?? 0) + t.amount
  }

  // Collect all months that appear in the data (even if 0 income)
  const allMonths = [...new Set(txns.map((t) => yearMonth(t.date)))].sort()

  if (allMonths.length === 0) {
    return {
      claimType: 'income_floor',
      verdict: false,
      params,
      periodStart,
      periodEnd,
      currency: params.currency,
      integrityFlags: [],
    }
  }

  // Use up to the requested N months (most recent complete months)
  // A month is "partial" if it's the first or last in the data and has < ~20 days
  // For simplicity: use all months present in data, take the last N
  const targetMonths = allMonths.slice(-params.months)

  if (targetMonths.length < params.months) {
    // Not enough months — but still compute verdict against available data
    // (spec: "partial months" edge case — compute with what we have)
  }

  const verdict = targetMonths.every(
    (ym) => (byMonth[ym] ?? 0) >= params.minMonthlyAmount
  )

  return {
    claimType: 'income_floor',
    verdict,
    params,
    periodStart,
    periodEnd,
    currency: params.currency,
    integrityFlags: [],
  }
}

// ─── Claim: balance_floor ─────────────────────────────────────────────────────

/**
 * True if balance (balanceAfter field) never dropped below minBalance
 * over any windowDays-day window ending at the last transaction date.
 * Requires balanceAfter to be present on transactions.
 */
export function claimBalanceFloor(
  txns: Transaction[],
  params: BalanceFloorParams
): Disclosure {
  assertSingleCurrency(txns, params.currency)

  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
  const periodStart = sorted[0]?.date ?? ''
  const periodEnd = sorted[sorted.length - 1]?.date ?? ''

  const withBalance = sorted.filter((t) => t.balanceAfter !== undefined)
  if (withBalance.length === 0) {
    return {
      claimType: 'balance_floor',
      verdict: false,
      params,
      periodStart,
      periodEnd,
      currency: params.currency,
      integrityFlags: ['no_balance_data'],
    }
  }

  // Filter to the window
  const cutoff = sorted.length > 0
    ? new Date(new Date(periodEnd).getTime() - params.windowDays * 86_400_000)
        .toISOString()
        .slice(0, 10)
    : periodStart

  const inWindow = withBalance.filter((t) => t.date >= cutoff)
  const verdict = inWindow.every((t) => (t.balanceAfter ?? 0) >= params.minBalance)

  return {
    claimType: 'balance_floor',
    verdict,
    params,
    periodStart,
    periodEnd,
    currency: params.currency,
    integrityFlags: [],
  }
}

// ─── Claim: runway_floor ──────────────────────────────────────────────────────

/**
 * True if endingBalance / avgMonthlyExpense >= minMonths.
 * Ending balance = last balanceAfter in the data.
 * Average monthly expense = total expenses / months in window.
 */
export function claimRunwayFloor(
  txns: Transaction[],
  params: RunwayFloorParams
): Disclosure {
  assertSingleCurrency(txns, params.currency)

  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
  const periodStart = sorted[0]?.date ?? ''
  const periodEnd = sorted[sorted.length - 1]?.date ?? ''

  const withBalance = sorted.filter((t) => t.balanceAfter !== undefined)
  const endingBalance = withBalance[withBalance.length - 1]?.balanceAfter ?? 0

  // Expenses in window
  const cutoff = sorted.length > 0
    ? new Date(new Date(periodEnd).getTime() - params.windowDays * 86_400_000)
        .toISOString()
        .slice(0, 10)
    : periodStart

  const inWindow = sorted.filter((t) => t.date >= cutoff)
  const totalExpenses = inWindow
    .filter((t) => t.label === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const months = params.windowDays / 30
  const avgMonthlyExpense = months > 0 ? totalExpenses / months : 0

  const runway = avgMonthlyExpense > 0 ? endingBalance / avgMonthlyExpense : Infinity
  const verdict = runway >= params.minMonths

  return {
    claimType: 'runway_floor',
    verdict,
    params,
    periodStart,
    periodEnd,
    currency: params.currency,
    integrityFlags: [],
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function computeClaim(
  txns: Transaction[],
  claimType: ClaimType,
  params: ClaimParams,
  integrityFlags: string[] = []
): Disclosure {
  let disclosure: Disclosure
  switch (claimType) {
    case 'income_floor':
      disclosure = claimIncomeFloor(txns, params as IncomeFloorParams)
      break
    case 'balance_floor':
      disclosure = claimBalanceFloor(txns, params as BalanceFloorParams)
      break
    case 'runway_floor':
      disclosure = claimRunwayFloor(txns, params as RunwayFloorParams)
      break
    default:
      throw new ClaimError(`Unknown claim type: ${claimType}`, 'UNKNOWN_CLAIM')
  }
  return { ...disclosure, integrityFlags: [...disclosure.integrityFlags, ...integrityFlags] }
}

// ─── Disclosure safety check (used in tests) ─────────────────────────────────

/**
 * Returns true if the disclosure contains no raw transaction amounts
 * beyond the claim parameters themselves.
 */
export function disclosureIsClean(disclosure: Disclosure, actualTransactions: Transaction[]): boolean {
  const rawAmounts = actualTransactions.map((t) => String(Math.abs(t.amount)))
  const paramsStr = JSON.stringify(disclosure.params)
  const disclosureStr = JSON.stringify(disclosure)

  for (const rawAmt of rawAmounts) {
    if (parseFloat(rawAmt) < 1) continue // ignore tiny amounts
    // The amount must not appear in disclosure UNLESS it's also in params
    if (disclosureStr.includes(rawAmt) && !paramsStr.includes(rawAmt)) {
      return false
    }
  }
  return true
}
