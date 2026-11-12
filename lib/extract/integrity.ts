import type { RawRow } from './parse-csv'

export type IntegrityFlag =
  | 'balance_discontinuity'
  | 'date_order_violation'
  | 'duplicate_rows'
  | 'round_amount_bias'

/**
 * Runs heuristic checks on raw parsed rows.
 * Flags are informational — they never alter the verdict, only annotate the disclosure.
 * No external calls; all deterministic arithmetic.
 */
export function checkIntegrity(rows: RawRow[]): IntegrityFlag[] {
  const flags: IntegrityFlag[] = []

  if (rows.length === 0) return flags

  if (hasDateOrderViolation(rows)) flags.push('date_order_violation')
  if (hasDuplicateRows(rows)) flags.push('duplicate_rows')
  if (hasBalanceDiscontinuity(rows)) flags.push('balance_discontinuity')
  if (hasRoundAmountBias(rows)) flags.push('round_amount_bias')

  return flags
}

function hasDateOrderViolation(rows: RawRow[]): boolean {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].date < rows[i - 1].date) return true
  }
  return false
}

function hasDuplicateRows(rows: RawRow[]): boolean {
  const seen = new Set<string>()
  for (const r of rows) {
    const key = `${r.date}|${r.description}|${r.amount}|${r.currency}`
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

function hasBalanceDiscontinuity(rows: RawRow[]): boolean {
  const withBalance = rows.filter((r) => r.balanceAfter !== undefined)
  if (withBalance.length < 2) return false

  for (let i = 1; i < withBalance.length; i++) {
    const prev = withBalance[i - 1].balanceAfter!
    const curr = withBalance[i].balanceAfter!
    const expected = prev + withBalance[i].amount
    if (Math.abs(curr - expected) > 0.02) return true
  }
  return false
}

function hasRoundAmountBias(rows: RawRow[]): boolean {
  if (rows.length < 5) return false
  const roundCount = rows.filter((r) => {
    const abs = Math.abs(r.amount)
    return abs > 0 && abs % 100 === 0
  }).length
  return roundCount / rows.length > 0.8
}
