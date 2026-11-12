/**
 * Phase 1 gate: live extraction accuracy on all three fixtures.
 * Prints per-fixture scores and exits non-zero if any threshold is missed.
 */
import path from 'path'
import fs from 'fs'
import { extractFromBuffer } from '../lib/extract/index'
import type { Transaction } from '../lib/extract/schema'

interface GroundTruth {
  description: string
  transactions: Array<{ date: string; amount: number; currency: string; label: string }>
}

function score(extracted: Transaction[], truth: GroundTruth['transactions']) {
  const n = Math.min(extracted.length, truth.length)
  let dateAmt = 0
  let label = 0
  for (let i = 0; i < n; i++) {
    if (extracted[i].date === truth[i].date && Math.abs(extracted[i].amount - truth[i].amount) < 0.01) dateAmt++
    if (extracted[i].label === truth[i].label) label++
  }
  return { dateAmtPct: n ? dateAmt / n : 0, labelPct: n ? label / n : 0, n }
}

async function main() {
  const fixtures = ['salaried', 'freelancer', 'crypto']
  let failed = false

  console.log('\n=== Phase 1 Extraction Accuracy Report ===\n')

  for (const name of fixtures) {
    const csv = fs.readFileSync(path.join('fixtures', `${name}.csv`))
    const truth: GroundTruth = JSON.parse(fs.readFileSync(path.join('fixtures', `${name}.ground-truth.json`), 'utf-8'))

    process.stdout.write(`  ${name.padEnd(12)}`)
    const result = await extractFromBuffer(csv, `${name}.csv`)
    const s = score(result.transactions, truth.transactions)

    const dateOk = s.dateAmtPct >= 0.95
    const labelOk = s.labelPct >= 0.90

    console.log(
      `  date+amt: ${(s.dateAmtPct * 100).toFixed(1)}% ${dateOk ? '✓' : '✗ BELOW 95%'}` +
      `  label: ${(s.labelPct * 100).toFixed(1)}% ${labelOk ? '✓' : '✗ BELOW 90%'}` +
      `  (${s.n} rows)`
    )

    if (!dateOk || !labelOk) failed = true
  }

  console.log('')
  if (failed) {
    console.error('One or more fixtures failed accuracy thresholds.')
    process.exit(1)
  }
  console.log('All fixtures passed accuracy thresholds.')
}

main().catch((err: unknown) => {
  console.error('check-accuracy failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
