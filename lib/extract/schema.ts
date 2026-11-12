import { z } from 'zod'

export const TransactionLabel = z.enum([
  'income',
  'expense',
  'self_transfer',
  'refund',
  'other',
])
export type TransactionLabel = z.infer<typeof TransactionLabel>

export const Transaction = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  description: z.string().min(1),
  amount: z.number(),
  currency: z.string().length(3),
  balanceAfter: z.number().optional(),
  label: TransactionLabel,
})
export type Transaction = z.infer<typeof Transaction>

export const ExtractionResult = z.object({
  transactions: z.array(Transaction),
  currency: z.string().length(3),
  periodStart: z.string(),
  periodEnd: z.string(),
  source: z.enum(['csv', 'pdf']),
})
export type ExtractionResult = z.infer<typeof ExtractionResult>

export const ALLOWED_MIME_TYPES = ['text/csv', 'application/pdf', 'text/plain']
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
