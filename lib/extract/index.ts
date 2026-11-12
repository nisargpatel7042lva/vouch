/**
 * Statement ingestion entry point.
 * P1: accepts Buffer/string in memory only — nothing written to disk or logged.
 */
import { parseCsv } from './parse-csv'
import { classifyTransactions } from './classify'
import { checkIntegrity } from './integrity'
import { ExtractionResult, MAX_FILE_SIZE_BYTES } from './schema'

export type { ExtractionResult, Transaction } from './schema'

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE' | 'PARSE_ERROR' | 'MULTI_CURRENCY'
  ) {
    super(message)
    this.name = 'ExtractionError'
  }
}

export async function extractFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  if (buffer.length === 0) {
    throw new ExtractionError('File is empty', 'EMPTY_FILE')
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ExtractionError(
      `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
      'FILE_TOO_LARGE'
    )
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  let textContent: string

  if (ext === 'csv' || ext === 'txt') {
    textContent = buffer.toString('utf-8')
  } else if (ext === 'pdf') {
    textContent = await extractPdfText(buffer)
  } else {
    throw new ExtractionError(
      `Unsupported file type ".${ext}". Please upload CSV or PDF bank statements.`,
      'UNSUPPORTED_TYPE'
    )
  }

  if (!textContent.trim()) {
    throw new ExtractionError('File appears to be empty or unreadable', 'EMPTY_FILE')
  }

  const rawRows = parseCsv(textContent)

  if (rawRows.length === 0) {
    throw new ExtractionError(
      'No transactions found. Check that the file is a valid bank statement.',
      'PARSE_ERROR'
    )
  }

  // Reject multi-currency (v1 limitation)
  const currencies = new Set(rawRows.map((r) => r.currency))
  if (currencies.size > 1) {
    throw new ExtractionError(
      `Multi-currency statements are not supported in v1 (found: ${[...currencies].join(', ')})`,
      'MULTI_CURRENCY'
    )
  }

  const integrityFlags = checkIntegrity(rawRows)
  const transactions = await classifyTransactions(rawRows)
  const currency = transactions[0]?.currency ?? 'USD'

  const dates = transactions.map((t) => t.date).sort()
  const periodStart = dates[0] ?? ''
  const periodEnd = dates[dates.length - 1] ?? ''

  return ExtractionResult.parse({
    transactions,
    currency,
    periodStart,
    periodEnd,
    source: ext === 'pdf' ? 'pdf' : 'csv',
    integrityFlags,
  })
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Use lib path directly — pdf-parse index.js runs a self-test on require() that
    // looks for ./test/data/05-versions-space.pdf and fails in production environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    return data.text
  } catch (err) {
    throw new ExtractionError(
      `Could not read PDF: ${err instanceof Error ? err.message : 'unknown error'}`,
      'PARSE_ERROR'
    )
  }
}

export function summariseExtraction(result: ExtractionResult): string {
  const byLabel: Record<string, number> = {}
  for (const t of result.transactions) {
    byLabel[t.label] = (byLabel[t.label] ?? 0) + 1
  }
  const labelSummary = Object.entries(byLabel)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
  return `${result.transactions.length} txns (${labelSummary}) ${result.periodStart} → ${result.periodEnd} [${result.currency}]`
}
