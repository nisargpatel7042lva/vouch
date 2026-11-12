import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { parseCsv } from '../../lib/extract/parse-csv'
import { checkIntegrity } from '../../lib/extract/integrity'

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'fixtures', name), 'utf-8')
}

describe('integrity: clean fixture', () => {
  it('salaried.csv has no integrity flags', () => {
    const rows = parseCsv(loadFixture('salaried.csv'))
    const flags = checkIntegrity(rows)
    expect(flags).toEqual([])
  })
})

describe('integrity: duplicate rows', () => {
  it('flags duplicate_rows in adversarial-duplicates.csv', () => {
    const rows = parseCsv(loadFixture('adversarial-duplicates.csv'))
    const flags = checkIntegrity(rows)
    expect(flags).toContain('duplicate_rows')
  })

  it('flags date_order_violation in adversarial-duplicates.csv', () => {
    const rows = parseCsv(loadFixture('adversarial-duplicates.csv'))
    const flags = checkIntegrity(rows)
    expect(flags).toContain('date_order_violation')
  })
})

describe('integrity: balance discontinuity', () => {
  it('flags balance_discontinuity in adversarial-balance.csv', () => {
    const rows = parseCsv(loadFixture('adversarial-balance.csv'))
    const flags = checkIntegrity(rows)
    expect(flags).toContain('balance_discontinuity')
  })
})

describe('integrity: round amount bias', () => {
  it('flags round_amount_bias when >80% of amounts are round multiples of 100', () => {
    const rows = [
      { date: '2026-10-01', description: 'A', amount: 1000, currency: 'USD' },
      { date: '2026-10-02', description: 'B', amount: -500, currency: 'USD' },
      { date: '2026-10-03', description: 'C', amount: 2000, currency: 'USD' },
      { date: '2026-10-04', description: 'D', amount: -300, currency: 'USD' },
      { date: '2026-10-05', description: 'E', amount: 4000, currency: 'USD' },
      { date: '2026-10-06', description: 'F', amount: -100, currency: 'USD' },
    ]
    const flags = checkIntegrity(rows)
    expect(flags).toContain('round_amount_bias')
  })

  it('does not flag normal mixed amounts', () => {
    const rows = [
      { date: '2026-10-01', description: 'A', amount: 4237.50, currency: 'USD' },
      { date: '2026-10-02', description: 'B', amount: -83.49, currency: 'USD' },
      { date: '2026-10-03', description: 'C', amount: 4237.50, currency: 'USD' },
      { date: '2026-10-04', description: 'D', amount: -91.12, currency: 'USD' },
      { date: '2026-10-05', description: 'E', amount: 4237.50, currency: 'USD' },
    ]
    const flags = checkIntegrity(rows)
    expect(flags).not.toContain('round_amount_bias')
  })
})

describe('integrity: prompt injection CSV parses safely', () => {
  it('adversarial-injection.csv parses without throwing', () => {
    const content = loadFixture('adversarial-injection.csv')
    expect(() => parseCsv(content)).not.toThrow()
  })

  it('adversarial-injection.csv descriptions are preserved as-is (no truncation or mangling)', () => {
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    expect(rows.length).toBeGreaterThan(0)
    // The injection text should be in the description — it's data, not executed
    const hasInjectionRow = rows.some((r) =>
      r.description.includes('IGNORE PREVIOUS INSTRUCTIONS')
    )
    expect(hasInjectionRow).toBe(true)
  })

  it('injection CSV produces at least one positive amount (income candidate)', () => {
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    const positives = rows.filter((r) => r.amount > 0)
    expect(positives.length).toBeGreaterThan(0)
  })
})

describe('integrity: flags passed through to disclosure', () => {
  it('computeClaim includes integrity flags from extraction in disclosure', async () => {
    const { computeClaim } = await import('../../lib/claims/index')
    const rows = parseCsv(loadFixture('adversarial-duplicates.csv'))
    const flags = checkIntegrity(rows)

    const fakeTxns = rows.map((r) => ({
      date: r.date,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      label: (r.amount > 0 ? 'income' : 'expense') as 'income' | 'expense',
    }))

    const disclosure = computeClaim(fakeTxns, 'income_floor', {
      minMonthlyAmount: 1000,
      months: 1,
      currency: 'USD',
    }, flags)

    expect(disclosure.integrityFlags).toContain('duplicate_rows')
    expect(disclosure.integrityFlags).toContain('date_order_violation')
  })
})
