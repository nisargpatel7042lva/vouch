/**
 * Phase 2 CLI: npm run claim -- <file> <claimType> <paramsJSON>
 * Example:
 *   npm run claim -- fixtures/salaried.csv income_floor '{"minMonthlyAmount":3000,"months":3,"currency":"USD"}'
 */
import path from 'path'
import fs from 'fs'
import { extractFromBuffer } from '../lib/extract/index'
import { computeClaim, ClaimType, ClaimParams } from '../lib/claims/index'

async function main() {
  const [, , filePath, claimType, paramsJson] = process.argv

  if (!filePath || !claimType || !paramsJson) {
    console.error('Usage: npm run claim -- <file> <claimType> <paramsJSON>')
    console.error('  claimTypes: income_floor, balance_floor, runway_floor')
    console.error('  Examples:')
    console.error('    income_floor: {"minMonthlyAmount":3000,"months":3,"currency":"USD"}')
    console.error('    balance_floor: {"minBalance":5000,"windowDays":90,"currency":"USD"}')
    console.error('    runway_floor: {"minMonths":6,"windowDays":90,"currency":"USD"}')
    process.exit(1)
  }

  let params: ClaimParams
  try {
    params = JSON.parse(paramsJson) as ClaimParams
  } catch {
    console.error('Error: params must be valid JSON')
    process.exit(1)
  }

  const absPath = path.resolve(filePath)
  const buffer = fs.readFileSync(absPath)
  const filename = path.basename(absPath)

  console.log(`\nExtracting transactions from ${filename}...`)
  const extraction = await extractFromBuffer(buffer, filename)
  console.log(`  ${extraction.transactions.length} transactions (${extraction.periodStart} → ${extraction.periodEnd})`)

  console.log(`\nComputing claim: ${claimType}`)
  console.log(`  Params: ${paramsJson}`)

  const disclosure = computeClaim(extraction.transactions, claimType as ClaimType, params)

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Verdict: ${disclosure.verdict ? 'PASS ✓' : 'FAIL ✗'}`)
  console.log(`Claim:   ${claimType}`)
  console.log(`Period:  ${disclosure.periodStart} → ${disclosure.periodEnd}`)
  console.log(`Currency: ${disclosure.currency}`)
  if (disclosure.integrityFlags.length > 0) {
    console.log(`Flags:   ${disclosure.integrityFlags.join(', ')}`)
  }
  console.log(`${'='.repeat(50)}\n`)
}

main().catch((err: unknown) => {
  console.error('claim failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
