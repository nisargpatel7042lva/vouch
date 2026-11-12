import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

async function createTestProof(expiryHours = 168): Promise<{ id: string; revokeToken: string }> {
  const csvPath = path.join(process.cwd(), 'fixtures', 'salaried.csv')
  const csvBuffer = fs.readFileSync(csvPath)

  const form = new FormData()
  form.append('file', new Blob([csvBuffer], { type: 'text/csv' }), 'salaried.csv')
  form.append('claimType', 'income_floor')
  form.append('params', JSON.stringify({ minMonthlyAmount: 3000, months: 3, currency: 'USD' }))
  form.append('expiryHours', String(expiryHours))

  const res = await fetch(`${BASE}/api/proofs`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`createTestProof failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<{ id: string; revokeToken: string }>
}

test.describe('verifier page – valid proof', () => {
  test('shows verdict card, all three panels, and attestation data', async ({ page }) => {
    test.setTimeout(60_000)
    const { id } = await createTestProof()
    await page.goto(`${BASE}/v/${id}`)

    // Verdict card
    await expect(page.getByRole('region', { name: 'Verdict' })).toBeVisible()
    await expect(page.getByText(/Claim Verified|Claim Not Met/)).toBeVisible()
    await expect(page.getByText(/Monthly income at least/i).first()).toBeVisible()

    // "Claim details" panel
    const claimDetails = page.getByRole('region', { name: 'Claim details' })
    await expect(claimDetails).toBeVisible()
    await expect(claimDetails.getByText('Verdict')).toBeVisible()

    // "Privacy guarantee" panel
    await expect(page.getByRole('region', { name: 'Privacy guarantee' })).toBeVisible()
    await expect(page.getByText(/bank statements/i)).toBeVisible()

    // Attestation panel
    await expect(page.getByRole('region', { name: 'Attestation' })).toBeVisible()
    await expect(page.getByText(/verified by hardware|check failed/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /verify independently/i })).toBeVisible()
  })

  test('re-verify button runs a fresh attestation and shows new nonce', async ({ page }) => {
    test.setTimeout(90_000)
    const { id } = await createTestProof()
    await page.goto(`${BASE}/v/${id}`)

    await page.getByRole('button', { name: /re-verify/i }).click()
    await expect(page.getByText(/Fresh attestation confirmed/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/checks passed/i)).toBeVisible()
  })

  test('page contains no raw fixture amounts or descriptions in HTML', async ({ page }) => {
    test.setTimeout(60_000)
    const { id } = await createTestProof()
    await page.goto(`${BASE}/v/${id}`)

    const html = await page.content()
    const forbidden = ['Acme Corp Ltd', 'Sunrise Apartments', 'FreshMart', '4237', '97531']
    for (const f of forbidden) {
      expect(html, `Raw data "${f}" found in page HTML`).not.toContain(f)
    }
  })

  test('saves screenshot to artifacts/', async ({ page }) => {
    test.setTimeout(60_000)
    const { id } = await createTestProof()
    await page.goto(`${BASE}/v/${id}`)
    await page.waitForLoadState('domcontentloaded')

    fs.mkdirSync('artifacts', { recursive: true })
    await page.screenshot({ path: 'artifacts/verifier-valid.png', fullPage: true })
    expect(fs.existsSync('artifacts/verifier-valid.png')).toBe(true)
  })
})

test.describe('verifier page – expired proof', () => {
  test('shows expired state with no verdict', async ({ page }) => {
    test.setTimeout(60_000)
    const { id } = await createTestProof()

    // Directly manipulate the DB to expire this proof
    const { getDb } = await import('../../lib/proofs/db')
    const db = getDb()
    db.prepare("UPDATE proofs SET expiresAt = datetime('now', '-1 hour') WHERE id = ?").run(id)

    await page.goto(`${BASE}/v/${id}`)
    await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible()
    await expect(page.getByText(/expired/i).first()).toBeVisible()
    // Must not show verdict
    await expect(page.getByText(/Claim Verified|Claim Not Met/)).not.toBeVisible()

    await page.screenshot({ path: 'artifacts/verifier-expired.png', fullPage: true })
  })
})

test.describe('verifier page – revoked proof', () => {
  test('shows revoked state with no verdict', async ({ page }) => {
    const { id, revokeToken } = await createTestProof()

    await fetch(`${BASE}/api/proofs/${id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revokeToken }),
    })

    await page.goto(`${BASE}/v/${id}`)
    await expect(page.getByText(/revoked/i).first()).toBeVisible()
    await expect(page.getByText(/Claim Verified|Claim Not Met/)).not.toBeVisible()

    await page.screenshot({ path: 'artifacts/verifier-revoked.png', fullPage: true })
  })
})

test.describe('accessibility', () => {
  test('valid proof page has no serious/critical accessibility violations', async ({ page }) => {
    test.setTimeout(60_000)
    const { id } = await createTestProof()
    await page.goto(`${BASE}/v/${id}`)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    )
    expect(serious, `Accessibility violations: ${JSON.stringify(serious.map(v => v.id))}`)
      .toHaveLength(0)
  })
})
