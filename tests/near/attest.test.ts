import { describe, it, expect } from 'vitest'
import { verifyReport, generateNonce } from '../../lib/near/attest'

// Build a structurally valid TDX quote (v4, tee_type=0x81, 600 bytes)
function makeTdxQuoteB64(): string {
  const buf = Buffer.alloc(600, 0)
  buf.writeUInt16LE(4, 0)   // version = 4
  buf.writeUInt16LE(2, 2)   // att_key_type = ECDSA-256
  buf.writeUInt8(0x81, 4)   // tee_type = TDX (0x81000000 LE)
  return buf.toString('base64')
}

function makeValidReport(nonce: string) {
  return {
    gateway_attestation: {
      request_nonce: nonce,
      signing_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      intel_quote: makeTdxQuoteB64(),
      event_log: [{ type: 'EV_EFI_VARIABLE_DRIVER_CONFIG', data: 'abc123' }],
      report_data: 'deadbeef'.repeat(16), // 128 hex chars = 64 bytes
      signing_algo: 'ecdsa',
      info: {
        tcb_info: {
          app_compose:
            'version: "3"\nservices:\n  model:\n    image: near-ai/model-tee:v1.0\n',
        },
      },
    },
    model_attestations: [],
  }
}

describe('verifyReport – positive', () => {
  it('passes all checks for a valid report', () => {
    const nonce = generateNonce()
    const result = verifyReport(makeValidReport(nonce), nonce)
    expect(result.allPassed).toBe(true)
    expect(result.checks.every((c) => c.passed)).toBe(true)
    expect(result.nonce).toBe(nonce)
    expect(result.checks.length).toBeGreaterThanOrEqual(8)
  })
})

describe('verifyReport – wrong nonce', () => {
  it('rejects when the echoed nonce differs from what was sent', () => {
    const sentNonce = generateNonce()
    const differentNonce = generateNonce()
    // Report echoes sentNonce but we verify against differentNonce
    const result = verifyReport(makeValidReport(sentNonce), differentNonce)
    const nonceCheck = result.checks.find((c) => c.name === 'nonce_echo')
    expect(nonceCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects when report nonce is empty string', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    report.gateway_attestation.request_nonce = ''
    const result = verifyReport(report, nonce)
    const nonceCheck = result.checks.find((c) => c.name === 'nonce_echo')
    expect(nonceCheck?.passed).toBe(false)
  })
})

describe('verifyReport – malformed report', () => {
  it('rejects null input', () => {
    const result = verifyReport(null, generateNonce())
    expect(result.allPassed).toBe(false)
    const gatewayCheck = result.checks.find((c) => c.name === 'gateway_present')
    expect(gatewayCheck?.passed).toBe(false)
  })

  it('rejects empty object (missing gateway_attestation)', () => {
    const result = verifyReport({}, generateNonce())
    expect(result.allPassed).toBe(false)
    const gatewayCheck = result.checks.find((c) => c.name === 'gateway_present')
    expect(gatewayCheck?.passed).toBe(false)
  })

  it('rejects when gateway_attestation is not an object', () => {
    const result = verifyReport({ gateway_attestation: 'invalid' }, generateNonce())
    // gateway_present passes (truthy string), but downstream checks fail
    expect(result.allPassed).toBe(false)
  })
})

describe('verifyReport – tampered signature or measurement', () => {
  it('rejects empty intel_quote (tampered/removed TDX measurement)', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    report.gateway_attestation.intel_quote = ''
    const result = verifyReport(report, nonce)
    const quoteCheck = result.checks.find((c) => c.name === 'intel_quote_present')
    expect(quoteCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects empty signing_address (tampered TEE identity)', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    report.gateway_attestation.signing_address = ''
    const result = verifyReport(report, nonce)
    const addrCheck = result.checks.find((c) => c.name === 'signing_address_present')
    expect(addrCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects wrong signing_algo (tampered algorithm field)', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    ;(report.gateway_attestation as Record<string, unknown>).signing_algo = 'rsa'
    const result = verifyReport(report, nonce)
    const algoCheck = result.checks.find((c) => c.name === 'signing_algo_match')
    expect(algoCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects missing app_compose (config measurement tampered away)', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    delete (report.gateway_attestation as Record<string, unknown>).info
    const result = verifyReport(report, nonce)
    const composeCheck = result.checks.find((c) => c.name === 'app_compose_present')
    expect(composeCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects missing event_log', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    ;(report.gateway_attestation as Record<string, unknown>).event_log = null
    const result = verifyReport(report, nonce)
    const logCheck = result.checks.find((c) => c.name === 'event_log_present')
    expect(logCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('rejects missing report_data', () => {
    const nonce = generateNonce()
    const report = makeValidReport(nonce)
    report.gateway_attestation.report_data = ''
    const result = verifyReport(report, nonce)
    const rdCheck = result.checks.find((c) => c.name === 'report_data_present')
    expect(rdCheck?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })
})

describe('generateNonce', () => {
  it('generates 64-character lowercase hex strings', () => {
    const nonce = generateNonce()
    expect(nonce).toHaveLength(64)
    expect(nonce).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique nonces on each call', () => {
    const nonces = Array.from({ length: 10 }, generateNonce)
    const unique = new Set(nonces)
    expect(unique.size).toBe(10)
  })
})
