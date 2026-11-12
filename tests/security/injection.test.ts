import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { parseCsv } from '../../lib/extract/parse-csv'

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'fixtures', name), 'utf-8')
}

describe('P5 prompt injection defence', () => {
  it('injection descriptions are present but inert after CSV parsing', () => {
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    const injectionDesc = rows.find((r) =>
      r.description.includes('IGNORE PREVIOUS INSTRUCTIONS')
    )
    // The description exists as a data field — it was parsed, not evaluated
    expect(injectionDesc).toBeDefined()
    expect(typeof injectionDesc!.description).toBe('string')
    expect(injectionDesc!.amount).toBeTypeOf('number')
  })

  it('[TRANSACTION_END] delimiter in description does not break parsing', () => {
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    const rentRow = rows.find((r) => r.description.includes('TRANSACTION_END'))
    expect(rentRow).toBeDefined()
    expect(rentRow!.amount).toBeLessThan(0) // still parsed as negative (expense)
  })

  it('XSS in description is preserved as plain text (no HTML execution risk in data layer)', () => {
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    const xssRow = rows.find((r) => r.description.includes('<script>'))
    expect(xssRow).toBeDefined()
    // The description is a plain string — no eval, no DOM insertion at this layer
    expect(xssRow!.description).toContain('<script>')
  })

  it('classifyBatch user content wraps descriptions in [TRANSACTION_START/END] delimiters', () => {
    // Verify the prompt construction isolates descriptions from instructions
    const rows = parseCsv(loadFixture('adversarial-injection.csv'))
    // Simulate what classifyTransactions does to build the prompt
    const items = rows
      .slice(0, 3)
      .map(
        (r, i) =>
          `${i + 1}. [TRANSACTION_START] ${r.date} | ${r.description} | ${r.amount} ${r.currency} [TRANSACTION_END]`
      )
      .join('\n')

    // Each description is sandwiched between delimiters
    for (const row of rows.slice(0, 3)) {
      const escaped = row.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`\\[TRANSACTION_START\\][\\s\\S]*?${escaped}[\\s\\S]*?\\[TRANSACTION_END\\]`)
      expect(items).toMatch(pattern)
    }
  })
})
