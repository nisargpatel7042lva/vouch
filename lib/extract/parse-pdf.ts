/**
 * PDF-specific transaction parser.
 * Bank statement PDFs yield plain text with no delimiters — this uses
 * date + amount pattern matching to reconstruct transaction rows.
 * P1: pure in-memory, no I/O.
 */
import type { RawRow } from './parse-csv'
import { normaliseDate } from './parse-csv'

// Matches most common date formats found in bank statement PDFs
const DATE_RE =
  /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}[ -][A-Za-z]{3}[ -]\d{4})\b/

// Matches currency-prefixed or plain decimal amounts, including negatives and Unicode symbols
const AMOUNT_RE = /(?:^|[\s,(])(-?(?:[A-Z]{0,3}|[£€₹$¥₩])\s*[\d,]+\.?\d{0,2})(?=[\s,)$€£₹¥₩]|$)/g

// Matches a whole line that is likely a header or section title
const SKIP_RE =
  /^(date|transaction|description|debit|credit|balance|details|narration|particulars|ref|value|posting|opening|closing|statement|period|page|account|branch|customer|ifsc|sr\.|s\.no)/i

function extractAmounts(line: string): number[] {
  const results: number[] = []
  AMOUNT_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = AMOUNT_RE.exec(line)) !== null) {
    // Strip everything except digits, decimal point, minus sign
    const raw = m[1].replace(/[£€₹$¥₩,\s]/g, '').replace(/[^0-9.-]/g, '')
    const v = parseFloat(raw)
    if (!isNaN(v) && Math.abs(v) >= 0.01) results.push(v)
  }
  return results
}

function descriptionFrom(line: string, dateStr: string): string {
  // Remove the date, all numbers, currency symbols, and common noise
  return line
    .replace(DATE_RE, '')
    .replace(/(?:^|[\s,(])-?(?:[A-Z]{0,3}|[£€₹$¥₩])\s*[\d,]+\.?\d{0,2}(?=[\s,)$£€₹¥₩]|$)/g, ' ')
    .replace(/[£€₹$¥₩()/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    || `Transaction on ${dateStr}`
}

function detectCurrency(text: string): string {
  if (/\bINR\b|₹|Rs\.?/i.test(text)) return 'INR'
  if (/\bEUR\b|€/.test(text)) return 'EUR'
  if (/\bGBP\b|£/.test(text)) return 'GBP'
  if (/\bAUD\b|A\$/.test(text)) return 'AUD'
  if (/\bCAD\b|C\$/.test(text)) return 'CAD'
  if (/\bJPY\b|¥/.test(text)) return 'JPY'
  if (/\bAED\b/.test(text)) return 'AED'
  if (/\bSGD\b|S\$/.test(text)) return 'SGD'
  return 'USD'
}

export function parsePdfLines(text: string): RawRow[] {
  const currency = detectCurrency(text)
  const rows: RawRow[] = []

  // Some PDFs emit one field per line — reassemble multi-line transactions
  // by joining lines that don't start with a date into the previous one
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const lines: string[] = []
  for (const l of rawLines) {
    if (DATE_RE.test(l)) {
      lines.push(l)
    } else if (lines.length > 0 && !SKIP_RE.test(l)) {
      // Continuation — append to previous line
      lines[lines.length - 1] += ' ' + l
    }
  }

  for (const line of lines) {
    if (SKIP_RE.test(line)) continue

    const dateMatch = line.match(DATE_RE)
    if (!dateMatch) continue

    const isoDate = normaliseDate(dateMatch[1])
    if (!isoDate) continue

    const amounts = extractAmounts(line)
    if (amounts.length === 0) continue

    const description = descriptionFrom(line, dateMatch[1])

    // Amount heuristic:
    // 1 number  → transaction amount
    // 2 numbers → transaction amount + running balance
    // 3 numbers → debit + credit + balance (one of debit/credit will be 0)
    let amount: number
    let balanceAfter: number | undefined

    if (amounts.length === 1) {
      amount = amounts[0]
    } else if (amounts.length === 2) {
      amount = amounts[0]
      balanceAfter = amounts[1]
    } else {
      // 3+ numbers: treat last as balance, check if second-to-last vs third-to-last
      // For debit/credit columns: one will be 0 or absent
      const debit = amounts[amounts.length - 3]
      const credit = amounts[amounts.length - 2]
      balanceAfter = amounts[amounts.length - 1]
      // Debit is an outflow (negative), credit is inflow (positive)
      if (debit > 0 && credit === 0) {
        amount = -debit
      } else if (credit > 0 && debit === 0) {
        amount = credit
      } else {
        // Can't determine — use net
        amount = credit - debit
      }
    }

    rows.push({
      date: isoDate,
      description,
      amount,
      currency,
      ...(balanceAfter !== undefined ? { balanceAfter } : {}),
    })
  }

  return rows
}
