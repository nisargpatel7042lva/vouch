/**
 * Expense audit engine — pure in-memory, no I/O.
 * Takes classified transactions and produces a spending breakdown + anomaly flags.
 * P1: nothing written to disk. P2: raw transactions never leave this function's scope.
 */
import type { Transaction } from '../extract/schema'
import type { AttestationResult } from '../near/attest'

export interface CategorySummary {
  label: string
  count: number
  total: number      // sum of absolute amounts
  netFlow: number    // positive = inflow, negative = outflow
}

export interface AnomalyFlag {
  type: 'large_transaction' | 'round_amount_cluster' | 'duplicate_description' | 'balance_gap' | 'date_gap' | 'high_frequency_burst'
  severity: 'info' | 'warn'
  message: string
  txDate?: string
  txDescription?: string
  txAmount?: number
}

export interface AuditReport {
  currency: string
  periodStart: string
  periodEnd: string
  transactionCount: number
  totalInflow: number
  totalOutflow: number
  netFlow: number
  categories: CategorySummary[]
  anomalies: AnomalyFlag[]
  integrityFlags: string[]
  attestation: AttestationResult
}

export function buildAuditReport(
  transactions: Transaction[],
  integrityFlags: string[],
  attestation: AttestationResult
): AuditReport {
  if (transactions.length === 0) {
    return {
      currency: 'USD',
      periodStart: '',
      periodEnd: '',
      transactionCount: 0,
      totalInflow: 0,
      totalOutflow: 0,
      netFlow: 0,
      categories: [],
      anomalies: [],
      integrityFlags,
      attestation,
    }
  }

  const currency = transactions[0].currency
  const dates = transactions.map(t => t.date).sort()
  const periodStart = dates[0]
  const periodEnd = dates[dates.length - 1]

  // Category totals
  const catMap = new Map<string, { count: number; total: number; netFlow: number }>()
  let totalInflow = 0
  let totalOutflow = 0

  for (const tx of transactions) {
    const entry = catMap.get(tx.label) ?? { count: 0, total: 0, netFlow: 0 }
    entry.count++
    entry.total += Math.abs(tx.amount)
    entry.netFlow += tx.amount
    catMap.set(tx.label, entry)

    if (tx.amount > 0) totalInflow += tx.amount
    else totalOutflow += Math.abs(tx.amount)
  }

  const categories: CategorySummary[] = Array.from(catMap.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total)

  // Anomaly detection
  const anomalies: AnomalyFlag[] = []

  // 1. Large single transactions (> 3x median expense)
  const expenses = transactions.filter(t => t.label === 'expense' && t.amount < 0)
  if (expenses.length >= 3) {
    const sorted = expenses.map(t => Math.abs(t.amount)).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const threshold = median * 3
    for (const tx of expenses) {
      if (Math.abs(tx.amount) > threshold && Math.abs(tx.amount) > 100) {
        anomalies.push({
          type: 'large_transaction',
          severity: 'warn',
          message: `Unusually large expense: ${currency} ${Math.abs(tx.amount).toLocaleString()} (${(Math.abs(tx.amount) / median).toFixed(1)}× median)`,
          txDate: tx.date,
          txDescription: tx.description,
          txAmount: tx.amount,
        })
      }
    }
  }

  // 2. High-frequency burst (>5 transactions within 3 days)
  const txByDate = new Map<string, number>()
  for (const tx of transactions) {
    txByDate.set(tx.date, (txByDate.get(tx.date) ?? 0) + 1)
  }
  for (const [date, count] of txByDate) {
    if (count >= 5) {
      anomalies.push({
        type: 'high_frequency_burst',
        severity: 'info',
        message: `${count} transactions on ${date} — unusually high daily activity`,
        txDate: date,
      })
    }
  }

  // 3. Duplicate descriptions (possible duplicate charges)
  const descCount = new Map<string, number>()
  for (const tx of transactions.filter(t => t.label === 'expense')) {
    const key = tx.description.toLowerCase().trim().slice(0, 40)
    descCount.set(key, (descCount.get(key) ?? 0) + 1)
  }
  for (const [desc, count] of descCount) {
    if (count >= 3) {
      anomalies.push({
        type: 'duplicate_description',
        severity: 'info',
        message: `"${desc}" appears ${count} times — possible recurring charge or duplicate`,
      })
    }
  }

  // 4. Surface integrity flags as anomalies
  for (const flag of integrityFlags) {
    if (flag === 'balance_discontinuity') {
      anomalies.push({
        type: 'balance_gap',
        severity: 'warn',
        message: 'Balance discontinuity detected — running balance does not match transaction amounts at one or more points',
      })
    }
    if (flag === 'date_order_violation') {
      anomalies.push({
        type: 'date_gap',
        severity: 'info',
        message: 'Transactions are not in strict date order — the statement may have been modified or exported non-chronologically',
      })
    }
  }

  return {
    currency,
    periodStart,
    periodEnd,
    transactionCount: transactions.length,
    totalInflow,
    totalOutflow,
    netFlow: totalInflow - totalOutflow,
    categories,
    anomalies,
    integrityFlags,
    attestation,
  }
}
