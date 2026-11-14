/**
 * NEAR AI Cloud attestation fetch and verification.
 *
 * Implements structural attestation checks against the HTTP API response.
 * Full DCAP/TDX quote cryptographic verification (dcap-qvl) is roadmap —
 * it requires native C++ bindings outside a hackathon time box.
 * Checks performed are documented in PROGRESS.md under Decisions.
 */

export interface AttestationCheck {
  name: string
  passed: boolean
  detail: string
}

export interface AttestationResult {
  checks: AttestationCheck[]
  allPassed: boolean
  nonce: string
  signingAddress: string
  timestamp: string
  summary: string
}

export interface GatewayAttestation {
  request_nonce: string
  signing_address: string
  intel_quote: string
  event_log: unknown
  report_data: string
  signing_algo: string
  tls_cert_fingerprint?: string
  info?: {
    tcb_info?: {
      app_compose?: string
    }
  }
}

export interface RawAttestationReport {
  gateway_attestation: GatewayAttestation
  model_attestations?: unknown[]
}

function chk(name: string, passed: boolean, detail: string): AttestationCheck {
  return { name, passed, detail }
}

/**
 * Verifies a raw attestation report against the nonce we sent.
 * Pure function — usable in unit tests with constructed bad inputs.
 */
export function verifyReport(report: unknown, nonce: string): AttestationResult {
  const checks: AttestationCheck[] = []
  const r = report as Record<string, unknown> | null

  // Check 1: gateway_attestation object exists
  const ga = r?.gateway_attestation as GatewayAttestation | undefined
  checks.push(chk('gateway_present', !!ga, ga ? 'gateway_attestation found' : 'gateway_attestation missing from response'))

  if (!ga) {
    return finalize(checks, nonce, '')
  }

  // Check 2: Nonce echo — prevents replay of a captured report
  const nonceMatch = ga.request_nonce === nonce
  checks.push(chk('nonce_echo', nonceMatch,
    nonceMatch
      ? `nonce echoed correctly: ${nonce.slice(0, 8)}…`
      : `nonce mismatch — expected ${nonce.slice(0, 8)}… got ${String(ga.request_nonce).slice(0, 8)}…`
  ))

  // Check 3: Signing address is present (TEE identity)
  const addrOk = typeof ga.signing_address === 'string' && ga.signing_address.length > 0
  checks.push(chk('signing_address_present', addrOk,
    addrOk ? `address: ${ga.signing_address.slice(0, 12)}…` : 'signing_address is empty or missing'
  ))

  // Check 4: Intel TDX quote present (cryptographic hardware measurement)
  const quoteOk = typeof ga.intel_quote === 'string' && ga.intel_quote.length > 0
  checks.push(chk('intel_quote_present', quoteOk,
    quoteOk ? `intel_quote bytes: ${ga.intel_quote.length}` : 'intel_quote is empty or missing'
  ))

  // Check 5: Event log present (RTMR3 replay material)
  const logOk = ga.event_log !== undefined && ga.event_log !== null
  checks.push(chk('event_log_present', logOk, logOk ? 'event_log found' : 'event_log missing'))

  // Check 6: Report data present (binds signing key to hardware)
  const rdOk = typeof ga.report_data === 'string' && ga.report_data.length > 0
  checks.push(chk('report_data_present', rdOk,
    rdOk ? `report_data length: ${ga.report_data.length}` : 'report_data is empty or missing'
  ))

  // Check 7: Signing algorithm matches what we requested
  const algoOk = ga.signing_algo === 'ecdsa'
  checks.push(chk('signing_algo_match', algoOk,
    algoOk ? 'signing_algo: ecdsa' : `expected ecdsa, got ${String(ga.signing_algo)}`
  ))

  // Check 8: App compose present (Docker config hash material for MRCONFIGID binding)
  const appCompose = ga.info?.tcb_info?.app_compose
  const composeOk = typeof appCompose === 'string' && appCompose.length > 0
  checks.push(chk('app_compose_present', composeOk,
    composeOk ? `app_compose length: ${appCompose.length}` : 'info.tcb_info.app_compose missing'
  ))

  // Check 9: Intel TDX quote binary structure — version must be 4, TEE type must be TDX (0x81)
  let quoteStructOk = false
  let quoteStructDetail = 'could not decode intel_quote as base64'
  if (quoteOk) {
    try {
      const buf = Buffer.from(ga.intel_quote, 'base64')
      const version = buf.readUInt16LE(0)        // bytes 0–1: quote version
      const teeTypeByte = buf.readUInt8(4)        // bytes 4–7: TEE type; 0x81 = TDX
      const minSize = buf.length > 500
      quoteStructOk = version === 4 && teeTypeByte === 0x81 && minSize
      quoteStructDetail = quoteStructOk
        ? `TDX quote v${version}, tee_type=0x${teeTypeByte.toString(16)}, ${buf.length} bytes`
        : `unexpected format: v=${version} tee=0x${teeTypeByte.toString(16)} len=${buf.length}`
    } catch {
      quoteStructDetail = 'base64 decode failed'
    }
  }
  checks.push(chk('intel_quote_tdx_structure', quoteStructOk, quoteStructDetail))

  // Check 10: report_data is 64-byte hex (binds the ECDSA signing key to the hardware measurement)
  const rdHex = ga.report_data
  const rdFormatOk = typeof rdHex === 'string' && /^[0-9a-fA-F]{128}$/.test(rdHex)
  checks.push(chk('report_data_64_bytes', rdFormatOk,
    rdFormatOk
      ? `report_data: ${rdHex.slice(0, 16)}…${rdHex.slice(-8)} (64 bytes)`
      : `report_data format invalid (got ${typeof rdHex === 'string' ? rdHex.length : 'non-string'} chars, expected 128 hex)`
  ))

  return finalize(checks, nonce, addrOk ? ga.signing_address : '')
}

function finalize(checks: AttestationCheck[], nonce: string, signingAddress: string): AttestationResult {
  const allPassed = checks.every((c) => c.passed)
  const passed = checks.filter((c) => c.passed).length
  return {
    checks,
    allPassed,
    nonce,
    signingAddress,
    timestamp: new Date().toISOString(),
    summary: `${passed}/${checks.length} checks passed`,
  }
}

/**
 * Generates a fresh 64-char hex nonce (32 random bytes).
 * Compatible with both Node.js crypto and Web Crypto API.
 */
export function generateNonce(): string {
  let bytes: Uint8Array
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto') as typeof import('crypto')
    const buf = randomBytes(32)
    bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Fetches a fresh attestation report from NEAR AI Cloud and verifies it.
 */
export async function fetchAndVerifyAttestation(
  nonce: string,
  model?: string
): Promise<AttestationResult> {
  const apiKey = process.env.NEAR_AI_API_KEY
  if (!apiKey) throw new Error('NEAR_AI_API_KEY is not set')

  const baseURL = process.env.NEAR_AI_BASE_URL ?? 'https://cloud-api.near.ai/v1'
  const url = new URL(`${baseURL}/attestation/report`)
  url.searchParams.set('signing_algo', 'ecdsa')
  url.searchParams.set('nonce', nonce)
  if (model) {
    url.searchParams.set('model', model)
    url.searchParams.set('provider', 'near')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  }
  // x-no-aliasing is only needed for model-specific attestation (prevents alias redirect)
  if (model) headers['x-no-aliasing'] = 'true'

  const response = await fetch(url.toString(), { headers })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Attestation fetch failed: ${response.status} ${response.statusText}\n${body}`)
  }

  const report: unknown = await response.json()
  return verifyReport(report, nonce)
}
