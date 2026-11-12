import { describe, it, expect } from 'vitest'
import { parseCsv, normaliseDate } from '../../lib/extract/parse-csv'

describe('parseCsv', () => {
  it('parses a minimal CSV', () => {
    const csv = `Date,Description,Amount,Currency
2026-07-01,Salary,4200.00,USD
2026-07-05,Rent,-1200.00,USD`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].date).toBe('2026-07-01')
    expect(rows[0].amount).toBe(4200)
    expect(rows[1].amount).toBe(-1200)
  })

  it('handles debit/credit columns', () => {
    const csv = `Date,Description,Debit,Credit,Currency
2026-07-01,Salary,,4200.00,USD
2026-07-05,Rent,1200.00,,USD`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBe(4200)
    expect(rows[1].amount).toBe(-1200)
  })

  it('returns empty array for header-only CSV', () => {
    const rows = parseCsv('Date,Description,Amount,Currency')
    expect(rows).toHaveLength(0)
  })

  it('skips rows with missing date or description', () => {
    const csv = `Date,Description,Amount,Currency
,Salary,4200.00,USD
2026-07-05,,1200.00,USD
2026-07-10,Valid,100.00,USD`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].description).toBe('Valid')
  })

  it('defaults currency to USD when not in CSV', () => {
    const csv = `Date,Description,Amount
2026-07-01,Salary,4200.00`
    const rows = parseCsv(csv)
    expect(rows[0].currency).toBe('USD')
  })

  it('handles quoted fields with commas', () => {
    const csv = `Date,Description,Amount,Currency
2026-07-01,"Acme Corp, Inc",4200.00,USD`
    const rows = parseCsv(csv)
    expect(rows[0].description).toBe('Acme Corp, Inc')
  })

  it('handles parenthesised negative amounts', () => {
    const csv = `Date,Description,Amount,Currency
2026-07-01,Rent,(1200.00),USD`
    const rows = parseCsv(csv)
    expect(rows[0].amount).toBe(-1200)
  })
})

describe('normaliseDate', () => {
  it('passes ISO dates through', () => {
    expect(normaliseDate('2026-07-15')).toBe('2026-07-15')
  })

  it('converts MM/DD/YYYY', () => {
    expect(normaliseDate('07/15/2026')).toBe('2026-07-15')
  })

  it('converts DD/MM/YYYY when day > 12', () => {
    expect(normaliseDate('15/07/2026')).toBe('2026-07-15')
  })

  it('converts DD-Mon-YYYY', () => {
    expect(normaliseDate('15-Jul-2026')).toBe('2026-07-15')
  })

  it('returns null for unparseable input', () => {
    expect(normaliseDate('not-a-date')).toBeNull()
  })
})
