import { describe, it, expect } from 'vitest'
import { Transaction, TransactionLabel, ExtractionResult } from '../../lib/extract/schema'

describe('Transaction schema', () => {
  it('accepts a valid transaction', () => {
    const result = Transaction.safeParse({
      date: '2026-07-01',
      description: 'Salary',
      amount: 4200.00,
      currency: 'USD',
      label: 'income',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional balanceAfter', () => {
    const result = Transaction.safeParse({
      date: '2026-07-01',
      description: 'Salary',
      amount: 4200.00,
      currency: 'USD',
      balanceAfter: 10000,
      label: 'income',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = Transaction.safeParse({
      date: '01/07/2026',
      description: 'Salary',
      amount: 4200.00,
      currency: 'USD',
      label: 'income',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid label', () => {
    const result = Transaction.safeParse({
      date: '2026-07-01',
      description: 'Salary',
      amount: 4200.00,
      currency: 'USD',
      label: 'paycheck',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing description', () => {
    const result = Transaction.safeParse({
      date: '2026-07-01',
      description: '',
      amount: 4200.00,
      currency: 'USD',
      label: 'income',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid labels', () => {
    const labels = ['income', 'expense', 'self_transfer', 'refund', 'other'] as const
    for (const label of labels) {
      const result = TransactionLabel.safeParse(label)
      expect(result.success).toBe(true)
    }
  })
})

describe('ExtractionResult schema', () => {
  it('accepts a valid result', () => {
    const result = ExtractionResult.safeParse({
      transactions: [
        { date: '2026-07-01', description: 'Salary', amount: 4200, currency: 'USD', label: 'income' },
      ],
      currency: 'USD',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      source: 'csv',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid source type', () => {
    const result = ExtractionResult.safeParse({
      transactions: [],
      currency: 'USD',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      source: 'xlsx',
    })
    expect(result.success).toBe(false)
  })
})
