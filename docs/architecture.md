# Vouch – Architecture

## Overview

Vouch is a Next.js 15 application with two main user flows:

1. **Prover flow** (`/prove`) — upload → classify → claim → attest → proof link
2. **Verifier flow** (`/v/:id`) — visit link → see verdict + attestation

All sensitive computation happens server-side. No raw financial data is ever sent to the client or stored.

## Data flow

```
Prover's browser
    │
    │  POST /api/proofs
    │  multipart: file + claimType + params + expiryHours
    ▼
Next.js Route Handler (app/api/proofs/route.ts)
    │
    ├─ Rate limit check (in-memory, 10 req/min per IP)
    │
    ├─ File buffer read into memory (never to disk — P1)
    │
    ├─ lib/extract/index.ts
    │   ├─ parseCsv / extractPdfText → RawRow[]
    │   ├─ checkIntegrity(rawRows) → IntegrityFlag[]
    │   └─ classifyTransactions(rawRows) → Transaction[]
    │          └─ NEAR AI Cloud API call
    │             model: z-ai/glm-5.3-flash (TEE-hosted)
    │
    ├─ lib/claims/index.ts
    │   └─ computeClaim(txns, claimType, params, flags) → Disclosure
    │          (deterministic arithmetic — no AI involvement — P4)
    │
    ├─ lib/near/attest.ts
    │   └─ fetchAndVerifyAttestation(nonce) → AttestationResult
    │          └─ GET cloud-api.near.ai/v1/attestation/report
    │
    └─ lib/proofs/index.ts
        └─ createProof(disclosure, attestation, expiryHours)
               └─ SQLite INSERT (verdict, params, attestation summary — P2)
               └─ returns {proof.id, revokeToken} — token shown once, stored as SHA-256 hash
    │
    └─ Response: {id, verdict, revokeToken}

Prover's browser
    │  Receives id + revokeToken
    │  Displays shareable link: /v/:id
    │  Saves {id, claimType, verdict, revokeToken} to localStorage
    ▼
Verifier's browser
    │  GET /v/:id
    ▼
Next.js Server Component (app/v/[id]/page.tsx)
    │  GET /api/proofs/:id → {verdict, claimType, params, attestationSummary, ...}
    └─ Renders VerifierClient (client component)
           Displays: verdict, claim label, period, attestation data
           "Re-verify" button → GET /api/attest/live (fresh nonce)
```

## Privacy invariants in the data flow

| Point | Invariant | Mechanism |
|---|---|---|
| File upload | P1 — no raw data to disk | `buffer = await file.arrayBuffer()`, never `fs.write` |
| Classification | P5 — model cannot follow injected instructions | Descriptions wrapped in `[TRANSACTION_START/END]` delimiters; system prompt says "Only classify" |
| Claim computation | P4 — model never decides verdict | `computeClaim` is pure arithmetic; model only returns labels |
| Proof storage | P2 — no raw amounts stored | Only verdict, claim params, attestation summary in DB |
| Verifier page | P2 — no raw data returned | `/api/proofs/:id` returns only the stored disclosure fields |

## Module responsibilities

### `lib/near/client.ts`
Creates an OpenAI-compatible client pointed at NEAR AI Cloud. Selects a TEE-hosted model by checking org prefixes (`z-ai/`, `zai-org/`, `near-ai/`, etc.).

### `lib/near/attest.ts`
- `generateNonce()` — 32 crypto random bytes → 64-char hex
- `verifyReport(report, nonce)` — 8 named structural checks (presence of quote, nonce echo, signing address, etc.)
- `fetchAndVerifyAttestation(nonce, model?)` — fetches from NEAR AI gateway, runs all 8 checks

### `lib/extract/parse-csv.ts`
Parses CSV bank statements with flexible header aliases, quoted fields, debit/credit columns, parenthetical negatives. Returns `RawRow[]` — no classification.

### `lib/extract/integrity.ts`
Stateless integrity checks on `RawRow[]`:
- `balance_discontinuity` — `balanceAfter[i] - balanceAfter[i-1] ≠ amount[i]`
- `date_order_violation` — dates not in non-decreasing order
- `duplicate_rows` — exact duplicate `date+description+amount+currency`
- `round_amount_bias` — >80% of amounts are multiples of 100

### `lib/extract/classify.ts`
Sends batches of 50 transactions to NEAR AI Cloud for label classification. Uses P5-delimited content, 2 retry attempts, positional array response format, Zod validation of each label.

### `lib/claims/index.ts`
Three deterministic claim computers:
- **income_floor**: sum income by month, check each of last N months ≥ threshold
- **balance_floor**: check all `balanceAfter` in window ≥ minimum
- **runway_floor**: `endingBalance / avgMonthlyExpense ≥ minMonths`

Returns `Disclosure` — the structured fact a verifier can read.

### `lib/proofs/db.ts`
SQLite with WAL mode. Lazy path evaluation (reads env at call time for test isolation). Stores:
- `id` (32-char hex UUID)
- `claimType`, `verdict`, `currency`, `periodStart`, `periodEnd`
- `disclosureJson` — full Disclosure (params, flags, period)
- `attestationSummary` — subset of attestation result (no raw quote)
- `revokeTokenHash` — SHA-256 of the token; plaintext never stored

### `lib/proofs/rate-limit.ts`
In-memory per-IP sliding window: 10 requests per 60-second window. Resets on server restart — no persistence.

## Security headers

Served on all routes via `next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Content-Security-Policy: default-src 'self'; frame-src 'none'; object-src 'none'`

## Attestation verification

The NEAR AI Cloud gateway endpoint is:
```
GET https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=<64-hex>
```

Vouch performs 8 named checks:
1. `gateway_present` — `gateway_attestation` object exists
2. `nonce_echo` — `request_nonce` matches the nonce sent
3. `signing_address_present` — non-empty `signing_address`
4. `intel_quote_present` — non-empty `intel_quote`
5. `event_log_present` — non-empty `event_log`
6. `report_data_present` — non-empty `report_data`
7. `signing_algo_match` — `signing_algo === 'ecdsa'`
8. `app_compose_present` — `info.tcb_info.app_compose` exists

Full DCAP cryptographic quote verification is roadmap. The [NEAR AI Cloud verification example](https://docs.near.ai) uses `dcap-qvl` (C++ bindings); this is out of scope for the hackathon time box.

## Database schema

```sql
CREATE TABLE proofs (
  id               TEXT PRIMARY KEY,
  claimType        TEXT NOT NULL,
  verdict          INTEGER NOT NULL,     -- 0 or 1
  disclosureJson   TEXT NOT NULL,        -- JSON Disclosure (params, flags, period)
  attestationSummary TEXT NOT NULL,      -- JSON subset (signingAddress, nonce, etc.)
  currency         TEXT NOT NULL,
  periodStart      TEXT NOT NULL,
  periodEnd        TEXT NOT NULL,
  expiryHours      INTEGER NOT NULL,
  createdAt        TEXT NOT NULL,
  expiresAt        TEXT NOT NULL,
  revokedAt        TEXT,
  revokeTokenHash  TEXT NOT NULL
);
```
