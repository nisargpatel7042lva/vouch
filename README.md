# Vouch

**Share the proof, not the document.**

Vouch lets you prove financial facts — income, account balance, financial runway — to landlords, lenders, or DAOs without revealing your bank statements.

Built for the [NEAR Hackathon](https://near.org) using NEAR AI Cloud's Trusted Execution Environment (TEE).

---

## What it does

1. **Prover uploads** a bank statement (CSV or PDF).
2. **Vouch extracts and classifies** transactions entirely in memory — no raw data is ever written to disk or stored.
3. **Prover picks a claim** (e.g., "monthly income ≥ $3,000 for 3 months") and threshold.
4. **NEAR AI Cloud TEE** attests the computation — a cryptographic proof that the analysis ran inside a Trusted Execution Environment.
5. **Prover gets a shareable link** — the verifier sees only the verdict (PASS/FAIL), the claim threshold, and the attestation. No amounts, no account numbers, no transaction descriptions.

## Privacy model

| What verifiers see | What verifiers never see |
|---|---|
| Verdict (PASS/FAIL) | Bank statements or PDFs |
| Claim type and threshold | Individual transaction amounts |
| Period covered | Account numbers or bank details |
| NEAR AI attestation | Exact income or balance figures |
| Integrity flags | Any balance other than pass/fail |

The five privacy invariants:
- **P1**: No raw document data is ever written to disk or logged
- **P2**: Only verdict, claim parameters, and attestation summary are stored
- **P3**: All model calls go to NEAR AI Cloud only
- **P4**: Code performs arithmetic and determines verdicts; the AI model classifies transaction types only
- **P5**: Document content is untrusted — instructions embedded in documents are never followed

## Stack

- **Next.js 15** (App Router) + TypeScript
- **NEAR AI Cloud** (`cloud-api.near.ai`) — TEE-hosted model for transaction classification and gateway attestation
- **SQLite** (better-sqlite3) — stores only proof records (no raw data)
- **Tailwind CSS v3**
- **Vitest** (unit tests) + **Playwright** (e2e tests)

## Quick start

```bash
# 1. Install
npm install

# 2. Set your NEAR AI API key
cp .env.example .env
# Edit .env and set NEAR_AI_API_KEY=your_key_here

# 3. Run
npm run dev

# 4. Open http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEAR_AI_API_KEY` | Yes | NEAR AI Cloud API key |
| `VOUCH_DB_PATH` | No | SQLite database path (default: `vouch.db`) |
| `NEXT_PUBLIC_BASE_URL` | No | Public URL for server-side proof fetching |

## Project structure

```
app/
  page.tsx               Landing page
  prove/                 /prove route (prover flow)
  v/[id]/               /v/:id route (verifier page)
  api/
    proofs/              POST /api/proofs, GET/PATCH per-proof
    attest/live/         GET /api/attest/live (fresh attestation)
lib/
  near/                  NEAR AI Cloud client and attestation verification
  extract/               Statement parsing, classification, integrity checks
  claims/                Deterministic claim engine (income, balance, runway)
  proofs/                Proof record storage and rate limiting
fixtures/                Sample and adversarial test fixtures
tests/
  claims/                Claim engine unit tests
  extract/               Extraction + privacy unit tests
  near/                  Attestation verification unit tests
  proofs/                Proof storage unit tests
  security/              Integrity and injection tests
  e2e/                   Playwright end-to-end tests
docs/
  red-team.md            Security analysis (7 attack scenarios)
```

## Running tests

```bash
# Unit tests
npm test

# Live unit tests (requires NEAR_AI_API_KEY)
npm run test:live

# End-to-end tests (requires running dev server)
npm run dev &
npx playwright test
```

## Attestation

Every proof record includes an attestation from the NEAR AI Cloud TEE gateway:

```
GET https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=<64-hex>
```

The response includes:
- **signing_address** — the TEE's ECDSA signing address
- **nonce** — echoed back to prove freshness
- **intel_quote** — Intel TDX attestation quote
- **event_log** — TEE event log
- **app_compose** — the composition hash of the running model

Vouch verifies 8 structural checks. Full DCAP quote cryptographic verification is roadmap; see `lib/near/attest.ts` for details.

## Security

See [docs/red-team.md](docs/red-team.md) for a full red-team analysis covering:
- Prompt injection via transaction descriptions
- Fabricated bank statements
- Balance-stuffing attacks
- API parameter tampering
- Rate limiting / resource exhaustion
- Revoke token security
- XSS prevention

## Limitations (v1)

- **Single currency** — multi-currency statements are not supported
- **Document authenticity** — Vouch proves "the document says X", not "X is true". For guaranteed authenticity, verifiers should request notarised statements.
- **Full DCAP verification** — cryptographic verification of Intel TDX quotes is out of scope for the hackathon

## License

MIT
