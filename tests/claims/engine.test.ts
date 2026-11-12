import { describe, it, expect } from 'vitest'
import {
  claimIncomeFloor,
  claimBalanceFloor,
  claimRunwayFloor,
  computeClaim,
  disclosureIsClean,
  ClaimError,
} from '../../lib/claims/index'
import type { Transaction } from '../../lib/extract/schema'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeTxns(overrides: Partial<Transaction>[] = []): Transaction[] {
  return overrides.map((o) => ({
    date: '2026-07-01',
    description: 'Salary',
    amount: 1000,
    currency: 'USD',
    label: 'income' as const,
    ...o,
  }))
}

function months3Income(monthlyAmount: number): Transaction[] {
  return [
    { date: '2026-07-15', description: 'Salary', amount: monthlyAmount, currency: 'USD', label: 'income' as const },
    { date: '2026-08-15', description: 'Salary', amount: monthlyAmount, currency: 'USD', label: 'income' as const },
    { date: '2026-09-15', description: 'Salary', amount: monthlyAmount, currency: 'USD', label: 'income' as const },
  ]
}

// ─── income_floor ─────────────────────────────────────────────────────────────

describe('claimIncomeFloor', () => {
  it('returns true when income meets floor every month', () => {
    const txns = months3Income(3000)
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    expect(result.verdict).toBe(true)
    expect(result.claimType).toBe('income_floor')
  })

  it('equal boundary passes (>= means equal passes)', () => {
    const txns = months3Income(3000)
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    expect(result.verdict).toBe(true)
  })

  it('returns false when income is just below floor', () => {
    const txns = months3Income(2999.99)
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('returns false when one month fails', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary', amount: 3000, currency: 'USD', label: 'income' },
      { date: '2026-08-15', description: 'Salary', amount: 1500, currency: 'USD', label: 'income' }, // below
      { date: '2026-09-15', description: 'Salary', amount: 3000, currency: 'USD', label: 'income' },
    ]
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('excludes self_transfer from income', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary', amount: 2000, currency: 'USD', label: 'income' },
      { date: '2026-07-20', description: 'Transfer In', amount: 5000, currency: 'USD', label: 'self_transfer' },
    ]
    // 2000 < 3000, self_transfer should not count
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 1, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('excludes refunds from income', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary', amount: 2000, currency: 'USD', label: 'income' },
      { date: '2026-07-20', description: 'Amazon Refund', amount: 5000, currency: 'USD', label: 'refund' },
    ]
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 1, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('handles zero transactions', () => {
    const result = claimIncomeFloor([], { minMonthlyAmount: 3000, months: 3, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('partial months: uses available months when fewer than requested', () => {
    const txns = months3Income(3000) // 3 months available
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 6, currency: 'USD' })
    // Only 3 months in data, verdict based on those 3
    expect(result.verdict).toBe(true) // 3000 >= 3000 for all 3 available months
  })

  it('handles negative balances gracefully', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary', amount: 3000, currency: 'USD', label: 'income', balanceAfter: -100 },
    ]
    const result = claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 1, currency: 'USD' })
    expect(result.verdict).toBe(true) // income still 3000
  })

  it('rejects multi-currency input', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary USD', amount: 3000, currency: 'USD', label: 'income' },
      { date: '2026-07-16', description: 'Salary EUR', amount: 3000, currency: 'EUR', label: 'income' },
    ]
    expect(() =>
      claimIncomeFloor(txns, { minMonthlyAmount: 3000, months: 1, currency: 'USD' })
    ).toThrow(ClaimError)
  })
})

// ─── balance_floor ────────────────────────────────────────────────────────────

describe('claimBalanceFloor', () => {
  it('passes when all balances are above floor', () => {
    const txns = makeTxns([
      { date: '2026-07-01', balanceAfter: 5000 },
      { date: '2026-07-15', balanceAfter: 6000 },
      { date: '2026-08-01', balanceAfter: 4500 },
    ])
    const result = claimBalanceFloor(txns, { minBalance: 4000, windowDays: 90, currency: 'USD' })
    expect(result.verdict).toBe(true)
  })

  it('fails when any balance drops below floor', () => {
    const txns = makeTxns([
      { date: '2026-07-01', balanceAfter: 5000 },
      { date: '2026-07-15', balanceAfter: 1500 }, // below 4000
      { date: '2026-08-01', balanceAfter: 5000 },
    ])
    const result = claimBalanceFloor(txns, { minBalance: 4000, windowDays: 90, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })

  it('equal boundary passes', () => {
    const txns = makeTxns([
      { date: '2026-07-01', balanceAfter: 4000 },
    ])
    const result = claimBalanceFloor(txns, { minBalance: 4000, windowDays: 90, currency: 'USD' })
    expect(result.verdict).toBe(true)
  })

  it('flags no_balance_data when no balanceAfter present', () => {
    const txns = months3Income(3000)
    const result = claimBalanceFloor(txns, { minBalance: 4000, windowDays: 90, currency: 'USD' })
    expect(result.verdict).toBe(false)
    expect(result.integrityFlags).toContain('no_balance_data')
  })
})

// ─── runway_floor ─────────────────────────────────────────────────────────────

describe('claimRunwayFloor', () => {
  it('passes when ending balance / avg expense >= minMonths', () => {
    const txns: Transaction[] = [
      { date: '2026-07-01', description: 'Salary', amount: 5000, currency: 'USD', label: 'income', balanceAfter: 10000 },
      { date: '2026-07-15', description: 'Rent', amount: -1000, currency: 'USD', label: 'expense', balanceAfter: 9000 },
      { date: '2026-08-15', description: 'Rent', amount: -1000, currency: 'USD', label: 'expense', balanceAfter: 8000 },
    ]
    // avg expense = 2000/60days * 30 = 1000/month; balance = 8000; runway = 8
    const result = claimRunwayFloor(txns, { minMonths: 6, windowDays: 60, currency: 'USD' })
    expect(result.verdict).toBe(true)
  })

  it('fails when runway < minMonths', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Expense', amount: -4000, currency: 'USD', label: 'expense', balanceAfter: 1000 },
    ]
    const result = claimRunwayFloor(txns, { minMonths: 6, windowDays: 90, currency: 'USD' })
    expect(result.verdict).toBe(false)
  })
})

// ─── Property test: self_transfers never change income verdict ────────────────

describe('property: adding self_transfers never changes income verdict', () => {
  it('adding any number of self_transfers does not change income_floor verdict', () => {
    const baseTxns = months3Income(2500) // fails: 2500 < 3000
    const params = { minMonthlyAmount: 3000, months: 3, currency: 'USD' }

    const baseVerdict = claimIncomeFloor(baseTxns, params).verdict

    // Add large self_transfers
    const withTransfers: Transaction[] = [
      ...baseTxns,
      { date: '2026-07-20', description: 'Transfer In', amount: 50000, currency: 'USD', label: 'self_transfer' },
      { date: '2026-08-20', description: 'Transfer In', amount: 50000, currency: 'USD', label: 'self_transfer' },
      { date: '2026-09-20', description: 'Transfer In', amount: 50000, currency: 'USD', label: 'self_transfer' },
    ]
    const transferVerdict = claimIncomeFloor(withTransfers, params).verdict

    expect(transferVerdict).toBe(baseVerdict) // must be the same
  })

  it('self_transfers cannot turn a failing claim into passing', () => {
    const baseTxns = months3Income(1000) // fails: 1000 < 3000
    const params = { minMonthlyAmount: 3000, months: 3, currency: 'USD' }

    const withTransfers: Transaction[] = [
      ...baseTxns,
      ...Array.from({ length: 100 }, (_, i) => ({
        date: `2026-0${(i % 3) + 7}-01`,
        description: 'Self Transfer',
        amount: 100000,
        currency: 'USD' as const,
        label: 'self_transfer' as const,
      })),
    ]
    const result = claimIncomeFloor(withTransfers, params)
    expect(result.verdict).toBe(false) // still fails
  })
})

// ─── Disclosure safety ────────────────────────────────────────────────────────

describe('disclosure does not contain raw transaction amounts', () => {
  it('income_floor disclosure contains only claim params, not raw transactions', () => {
    const txns: Transaction[] = [
      { date: '2026-07-15', description: 'Salary', amount: 4237.89, currency: 'USD', label: 'income' },
      { date: '2026-08-15', description: 'Salary', amount: 4312.44, currency: 'USD', label: 'income' },
    ]
    const params = { minMonthlyAmount: 4000, months: 2, currency: 'USD' }
    const disclosure = claimIncomeFloor(txns, params)

    expect(disclosureIsClean(disclosure, txns)).toBe(true)
    // Verify specific amounts don't appear in disclosure
    const str = JSON.stringify(disclosure)
    expect(str).not.toContain('4237')
    expect(str).not.toContain('4312')
  })

  it('balance_floor disclosure does not leak actual balances', () => {
    const txns = makeTxns([
      { date: '2026-07-01', balanceAfter: 97531.42, amount: 100 },
    ])
    const params = { minBalance: 50000, windowDays: 90, currency: 'USD' }
    const disclosure = claimBalanceFloor(txns, params)
    expect(JSON.stringify(disclosure)).not.toContain('97531')
  })
})

// ─── computeClaim dispatcher ──────────────────────────────────────────────────

describe('computeClaim dispatcher', () => {
  it('dispatches income_floor', () => {
    const result = computeClaim(months3Income(3000), 'income_floor', {
      minMonthlyAmount: 3000, months: 3, currency: 'USD',
    })
    expect(result.claimType).toBe('income_floor')
  })

  it('throws for unknown claim type', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      computeClaim([], 'invalid_claim' as any, {} as any)
    ).toThrow(ClaimError)
  })
})
