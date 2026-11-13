/**
 * SQLite proof store. Persists only the proof record per P2:
 * id, claim, verdict, disclosure, createdAt, expiresAt, revokedAt, revokeTokenHash.
 * Never stores document content, transactions, or raw amounts.
 */
import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

let _db: Database.Database | null = null
let _dbPath: string | null = null

export function getDb(): Database.Database {
  // Vercel serverless: cwd is read-only; /tmp is the only writable partition
  const defaultPath = process.env.VERCEL
    ? '/tmp/vouch.db'
    : path.join(process.cwd(), 'vouch.db')
  const dbPath = process.env.VOUCH_DB_PATH ?? defaultPath
  // Re-open if path changed (test isolation)
  if (_db && _dbPath !== dbPath) {
    _db.close()
    _db = null
  }
  if (!_db) {
    _dbPath = dbPath
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY,
      claimType TEXT NOT NULL,
      verdict INTEGER NOT NULL,
      disclosureJson TEXT NOT NULL,
      attestationSummary TEXT NOT NULL,
      currency TEXT NOT NULL,
      periodStart TEXT NOT NULL,
      periodEnd TEXT NOT NULL,
      expiryHours INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      revokedAt TEXT,
      revokeTokenHash TEXT NOT NULL
    )
  `)
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function closeDb(): void {
  _db?.close()
  _db = null
}
