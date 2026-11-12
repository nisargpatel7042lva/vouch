/**
 * P1 privacy invariant test.
 * Verifies that fixture descriptions and amounts never appear in:
 * - filesystem writes (spy on fs.writeFile, fs.appendFile, fs.writeFileSync)
 * - console.log / console.error output
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

// Sentinel strings from the salaried fixture that must not leak
const SENTINELS = [
  'Acme Corp Ltd',
  'Sunrise Apartments',
  'FreshMart',
  '4200',
  'BlockBuilders Inc',
  'Metropolitan Apartments',
  'Coinbase',
  'Designr Co',
  'Innovatech',
]

describe('P1 privacy invariant', () => {
  const writtenContent: string[] = []
  const loggedContent: string[] = []

  beforeEach(() => {
    writtenContent.length = 0
    loggedContent.length = 0

    vi.spyOn(fs, 'writeFile').mockImplementation((...args) => {
      const content = String(args[1] ?? '')
      writtenContent.push(content)
      const cb = args[args.length - 1]
      if (typeof cb === 'function') cb(null)
    })
    vi.spyOn(fs, 'writeFileSync').mockImplementation((_p, data) => {
      writtenContent.push(String(data))
    })
    vi.spyOn(fs, 'appendFile').mockImplementation((...args) => {
      const content = String(args[1] ?? '')
      writtenContent.push(content)
      const cb = args[args.length - 1]
      if (typeof cb === 'function') cb(null)
    })
    vi.spyOn(fs, 'appendFileSync').mockImplementation((_p, data) => {
      writtenContent.push(String(data))
    })
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      loggedContent.push(args.map(String).join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      loggedContent.push(args.map(String).join(' '))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parseCsv does not write fixture sentinels to disk or logs', async () => {
    const fixtureContent = fs.readFileSync(
      path.join(process.cwd(), 'fixtures', 'salaried.csv'),
      'utf-8'
    )

    // Run the CSV parser (pure function, no I/O expected)
    const { parseCsv } = await import('../../lib/extract/parse-csv')
    parseCsv(fixtureContent)

    const allWritten = writtenContent.join('\n')
    const allLogged = loggedContent.join('\n')

    for (const sentinel of SENTINELS) {
      expect(allWritten, `sentinel "${sentinel}" found in disk writes`).not.toContain(sentinel)
      expect(allLogged, `sentinel "${sentinel}" found in logs`).not.toContain(sentinel)
    }
  })

  it('schema validation does not log transaction details', async () => {
    const { Transaction } = await import('../../lib/extract/schema')

    Transaction.safeParse({
      date: '2026-07-01',
      description: 'Acme Corp Ltd Salary Payment 4200',
      amount: 4200.00,
      currency: 'USD',
      label: 'income',
    })

    const allLogged = loggedContent.join('\n')
    expect(allLogged).not.toContain('Acme Corp Ltd')
    expect(allLogged).not.toContain('4200')
  })
})
