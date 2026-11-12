import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

test.describe('landing page', () => {
  test('shows headline and Create a Proof link', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.getByRole('heading', { name: /Share the proof/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Create a Proof/i })).toBeVisible()
    await expect(page.getByText(/NEAR AI Cloud/i).first()).toBeVisible()
  })

  test('Create a Proof navigates to /prove', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('link', { name: /Create a Proof/i }).click()
    await expect(page).toHaveURL(/\/prove/)
    await expect(page.getByRole('heading', { name: /Create a proof/i })).toBeVisible()
  })
})

test.describe('prover page – file validation', () => {
  test('shows error for unsupported file type', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    const input = page.locator('input[type="file"]')
    await input.setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByRole('heading', { name: /Something went wrong/i })).toBeVisible()
    await expect(page.getByText(/Unsupported file type/i)).toBeVisible()
  })

  test('shows error for oversized file', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'a')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles({
      name: 'huge.csv',
      mimeType: 'text/csv',
      buffer: bigBuffer,
    })
    await expect(page.getByRole('heading', { name: /Something went wrong/i })).toBeVisible()
    await expect(page.getByText(/too large/i)).toBeVisible()
  })

  test('try again button resets to upload state', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    const input = page.locator('input[type="file"]')
    await input.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
    await expect(page.getByRole('heading', { name: /Something went wrong/i })).toBeVisible()
    await page.getByRole('button', { name: /Try again/i }).click()
    await expect(page.getByLabel('Drop zone for bank statement file')).toBeVisible()
  })
})

test.describe('prover page – sample data flow', () => {
  test('try sample data pre-loads file and advances to claim step', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    await page.getByRole('button', { name: /Try sample data/i }).click()
    await expect(page.getByText('sample-statement.csv')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Monthly Income Floor/i })).toBeChecked()
  })

  test('full happy path: sample data → claim → result', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto(`${BASE}/prove`)
    await page.getByRole('button', { name: /Try sample data/i }).click()
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /Generate Proof/i }).click()

    // Wait for processing state then result
    await expect(page.getByRole('region', { name: /Proof result/i })).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/Claim Verified|Claim Not Met/i)).toBeVisible()
    await expect(page.getByRole('region', { name: /Share link/i })).toBeVisible()
    await expect(page.getByRole('region', { name: /Revoke token/i })).toBeVisible()
    await expect(page.getByLabel('Proof share link')).not.toBeEmpty()

    fs.mkdirSync('artifacts', { recursive: true })
    await page.screenshot({ path: 'artifacts/prover-result.png', fullPage: true })
  })
})

test.describe('prover page – manual upload flow', () => {
  test('upload CSV → continue → claim picker visible', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    const csvPath = path.join(process.cwd(), 'fixtures', 'salaried.csv')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles(csvPath)
    await expect(page.getByText('salaried.csv')).toBeVisible()
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible()
  })

  test('full journey: upload → income_floor → result → share link opens verifier', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto(`${BASE}/prove`)
    const csvPath = path.join(process.cwd(), 'fixtures', 'salaried.csv')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles(csvPath)
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible()

    // income_floor already selected by default; verify
    await expect(page.getByRole('radio', { name: /Monthly Income Floor/i })).toBeChecked()
    await page.getByRole('button', { name: /Generate Proof/i }).click()

    await expect(page.getByRole('region', { name: /Proof result/i })).toBeVisible({ timeout: 90_000 })

    // Copy link and navigate to it
    const linkInput = page.getByLabel('Proof share link')
    const shareLink = await linkInput.inputValue()
    expect(shareLink).toMatch(/\/v\/[0-9a-f]{32}$/)

    await page.goto(shareLink)
    await expect(page.getByRole('region', { name: 'Verdict' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Claim Verified|Claim Not Met/i)).toBeVisible()

    fs.mkdirSync('artifacts', { recursive: true })
    await page.screenshot({ path: 'artifacts/prover-journey.png', fullPage: true })
  })
})

test.describe('prover page – my proofs panel', () => {
  test('my proofs list appears after creating a proof', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto(`${BASE}/prove`)
    await page.getByRole('button', { name: /Try sample data/i }).click()
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Generate Proof/i }).click()
    await expect(page.getByRole('region', { name: /Proof result/i })).toBeVisible({ timeout: 90_000 })

    // My proofs appears on result page
    await expect(page.getByRole('region', { name: /My proofs/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View', exact: true }).first()).toBeVisible()
  })
})

test.describe('prover screenshots', () => {
  test('capture upload and claim steps', async ({ page }) => {
    await page.goto(`${BASE}/prove`)
    fs.mkdirSync('artifacts', { recursive: true })
    await page.screenshot({ path: 'artifacts/prover-upload.png', fullPage: true })

    const csvPath = path.join(process.cwd(), 'fixtures', 'salaried.csv')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles(csvPath)
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByRole('region', { name: /Claim configuration/i })).toBeVisible()
    await page.screenshot({ path: 'artifacts/prover-claim.png', fullPage: true })
    expect(fs.existsSync('artifacts/prover-upload.png')).toBe(true)
    expect(fs.existsSync('artifacts/prover-claim.png')).toBe(true)
  })
})
