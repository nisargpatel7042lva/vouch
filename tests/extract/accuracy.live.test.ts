/**
 * Live extraction accuracy test.
 * Requires NEAR_AI_API_KEY. Skipped automatically if key is absent.
 * Gate thresholds: 95% date+amount accuracy, 90% label accuracy.
 */
import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { extractFromBuffer } from '../../lib/extract/index'
import type { Transaction } from '../../lib/extract/schema'

const hasKey = !!process.env.NEAR_AI_API_KEY

interface GroundTruth {
  transactions: Array<{
    date: string
    description: string
    amount: number
    currency: string
    label: string
  }>
}

function loadFixture(name: string): { csv: Buffer; truth: GroundTruth } {
  const csvPath = path.join(process.cwd(), 'fixtures', `${name}.csv`)
  const jsonPath = path.join(process.cwd(), 'fixtures', `${name}.ground-truth.json`)
  return {
    csv: fs.readFileSync(csvPath),
    truth: JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as GroundTruth,
  }
}

function scoreAccuracy(
  extracted: Transaction[],
  truth: GroundTruth['transactions']
): { dateAmt: number; label: number; total: number } {
  // Match by index (CSV rows come out in order)
  const matchable = Math.min(extracted.length, truth.length)
  let correctDateAmt = 0
  let correctLabel = 0

  for (let i = 0; i < matchable; i++) {
    const e = extracted[i]
    const t = truth[i]
    if (e.date === t.date && Math.abs(e.amount - t.amount) < 0.01) {
      correctDateAmt++
    }
    if (e.label === t.label) {
      correctLabel++
    }
  }

  return {
    dateAmt: matchable > 0 ? correctDateAmt / matchable : 0,
    label: matchable > 0 ? correctLabel / matchable : 0,
    total: matchable,
  }
}

describe.skipIf(!hasKey)('live extraction accuracy', () => {
  const fixtures = ['salaried', 'freelancer', 'crypto']

  for (const fixtureName of fixtures) {
    it(`${fixtureName}: ≥95% date+amount, ≥90% label accuracy`, async () => {
      const { csv, truth } = loadFixture(fixtureName)
      const result = await extractFromBuffer(csv, `${fixtureName}.csv`)

      expect(result.transactions.length).toBeGreaterThan(0)

      const scores = scoreAccuracy(result.transactions, truth.transactions)

      console.log(
        `[${fixtureName}] date+amt: ${(scores.dateAmt * 100).toFixed(1)}%  ` +
        `label: ${(scores.label * 100).toFixed(1)}%  ` +
        `(${scores.total} rows matched)`
      )

      expect(
        scores.dateAmt,
        `${fixtureName} date+amount accuracy ${(scores.dateAmt * 100).toFixed(1)}% < 95%`
      ).toBeGreaterThanOrEqual(0.95)

      expect(
        scores.label,
        `${fixtureName} label accuracy ${(scores.label * 100).toFixed(1)}% < 90%`
      ).toBeGreaterThanOrEqual(0.90)
    }, 120_000)
  }
})
