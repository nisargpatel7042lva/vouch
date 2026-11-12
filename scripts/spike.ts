/**
 * Phase 0 spike: proves NEAR AI Cloud connectivity + live attestation verification.
 * Run: npm run spike  (requires NEAR_AI_API_KEY in .env)
 */
import { createClient, listModels, selectTeeModel } from '../lib/near/client'
import { generateNonce, fetchAndVerifyAttestation } from '../lib/near/attest'

async function main() {
  console.log('=== NEAR AI Cloud Attestation Spike ===\n')

  // 1. Create client and discover a TEE-hosted model
  const client = createClient()
  console.log('Listing models from NEAR AI Cloud...')
  const models = await listModels(client)
  const modelId = selectTeeModel(models)
  console.log(`Selected TEE model: ${modelId}\n`)

  // 2. Send one completion (proves API connectivity)
  console.log('Sending completion...')
  const completion = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: 'user', content: 'Reply with one word only: verified' }],
    max_tokens: 10,
  })
  const reply = completion.choices[0]?.message?.content ?? '(empty)'
  console.log(`Model reply: ${reply}\n`)

  // 3. Fetch and verify attestation with a fresh nonce
  const nonce = generateNonce()
  console.log(`Nonce: ${nonce}\n`)
  console.log('Fetching attestation report from NEAR AI Cloud...')

  // Gateway attestation (no model param) — proves the TEE gateway is genuine.
  // Model-specific attestation (with provider=near) is used in Phase 1+ per workflow.
  const result = await fetchAndVerifyAttestation(nonce)

  // 4. Print each check
  console.log('\nAttestation checks:')
  for (const check of result.checks) {
    const status = check.passed ? 'PASS' : 'FAIL'
    console.log(`  [${status}] ${check.name}: ${check.detail}`)
  }

  console.log(`\nSummary: ${result.summary}`)
  console.log(`Signing address: ${result.signingAddress}`)
  console.log(`Timestamp: ${result.timestamp}`)
  console.log(`Model: ${modelId}`)

  if (!result.allPassed) {
    console.error('\nOne or more attestation checks FAILED')
    process.exit(1)
  }

  console.log('\nAll attestation checks PASSED')
}

main().catch((err: unknown) => {
  console.error('Spike failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
