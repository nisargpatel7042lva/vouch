import { describe, it, expect } from 'vitest'
import { ExtractionError } from '../../lib/extract/index'
import { parseCsv } from '../../lib/extract/parse-csv'

describe('ExtractionError', () => {
  it('is an instance of Error', () => {
    const err = new ExtractionError('test', 'PARSE_ERROR')
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('PARSE_ERROR')
    expect(err.message).toBe('test')
    expect(err.name).toBe('ExtractionError')
  })

  it('has correct code for each error type', () => {
    const codes = ['UNSUPPORTED_TYPE', 'FILE_TOO_LARGE', 'EMPTY_FILE', 'PARSE_ERROR', 'MULTI_CURRENCY'] as const
    for (const code of codes) {
      const err = new ExtractionError('msg', code)
      expect(err.code).toBe(code)
    }
  })
})

describe('malformed file handling', () => {
  it('parseCsv returns empty for completely empty string', () => {
    expect(parseCsv('')).toHaveLength(0)
  })

  it('parseCsv returns empty for whitespace-only content', () => {
    expect(parseCsv('   \n  \n  ')).toHaveLength(0)
  })

  it('parseCsv handles a file with only header row', () => {
    expect(parseCsv('Date,Description,Amount,Currency\n')).toHaveLength(0)
  })

  it('parseCsv does not throw on random binary-ish content that happens to have commas', () => {
    expect(() => parseCsv('a,b,c\n1,2,3')).not.toThrow()
  })
})
