/**
 * Parses a CSV bank statement into raw row objects.
 * No disk I/O — works entirely in memory per P1.
 */

export interface RawRow {
  date: string
  description: string
  amount: number
  currency: string
  balanceAfter?: number
}

// Normalise common header aliases
const DATE_KEYS = ['date', 'transaction date', 'trans date', 'posting date', 'value date']
const DESC_KEYS = ['description', 'narrative', 'details', 'memo', 'payee', 'transaction']
const AMOUNT_KEYS = ['amount', 'debit/credit', 'value', 'transaction amount']
const DEBIT_KEYS = ['debit', 'withdrawal', 'dr']
const CREDIT_KEYS = ['credit', 'deposit', 'cr']
const BALANCE_KEYS = ['balance', 'running balance', 'balance after', 'closing balance']
const CURRENCY_KEYS = ['currency', 'ccy']

function findKey(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(h.toLowerCase().trim()))
}

export function parseCsv(content: string): RawRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0])
  const normalised = headers.map((h) => h.toLowerCase().trim())

  const dateKey = findKey(normalised, DATE_KEYS)
  const descKey = findKey(normalised, DESC_KEYS)
  const amountKey = findKey(normalised, AMOUNT_KEYS)
  const debitKey = findKey(normalised, DEBIT_KEYS)
  const creditKey = findKey(normalised, CREDIT_KEYS)
  const balanceKey = findKey(normalised, BALANCE_KEYS)
  const currencyKey = findKey(normalised, CURRENCY_KEYS)

  if (!dateKey || !descKey) {
    return [] // caller (extractFromBuffer) will raise PARSE_ERROR on empty result
  }

  const rows: RawRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const get = (key: string | undefined) =>
      key ? (cells[normalised.indexOf(key)] ?? '').trim() : ''

    const rawDate = get(dateKey)
    const rawDesc = get(descKey)
    if (!rawDate || !rawDesc) continue

    const isoDate = normaliseDate(rawDate)
    if (!isoDate) continue

    let amount: number

    if (amountKey) {
      amount = parseAmount(get(amountKey))
    } else if (debitKey && creditKey) {
      const debit = parseAmount(get(debitKey))
      const credit = parseAmount(get(creditKey))
      // debits are negative outflows, credits are positive inflows
      amount = credit - debit
    } else {
      continue
    }

    const balanceRaw = balanceKey ? get(balanceKey) : undefined
    const currency = currencyKey ? get(currencyKey) || 'USD' : 'USD'

    rows.push({
      date: isoDate,
      description: rawDesc,
      amount,
      currency,
      balanceAfter: balanceRaw ? parseAmount(balanceRaw) : undefined,
    })
  }

  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  // Normalise em-dash (U+2212) and en-dash to hyphen-minus before stripping
  const normalised = raw.replace(/[−–]/g, '-')
  // Remove currency symbols, commas, parens (accounting negatives)
  const clean = normalised.replace(/[^0-9.\-+]/g, '')
  const hasParens = raw.includes('(') && raw.includes(')')
  const val = parseFloat(clean) || 0
  return hasParens ? -Math.abs(val) : val
}

export function normaliseDate(raw: string): string | null {
  // Handles: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-Mon-YYYY, Mon DD YYYY
  raw = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // MM/DD/YYYY or DD/MM/YYYY
  const slashParts = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashParts) {
    const [, a, b, year] = slashParts
    // Heuristic: if first part > 12, it's DD/MM/YYYY
    const [month, day] =
      parseInt(a) > 12 ? [b, a] : [a, b]
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // DD-Mon-YYYY or Mon-DD-YYYY
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const textDate = raw.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/)
  if (textDate) {
    const [, day, mon, year] = textDate
    const month = monthNames[mon.toLowerCase()]
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`
  }

  // Try native Date parse as last resort
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return null
}
