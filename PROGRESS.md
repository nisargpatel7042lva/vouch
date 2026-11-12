# Vouch – Build Progress

Hackathon: NEAR Hackathon · Deadline: 14 Nov 2026, 23:59 UTC

## Phase Status

| Phase | Description | Status | Date |
|-------|-------------|--------|------|
| 0 | Foundation + live attestation spike | PASSED | 2026-11-12 |
| 1 | Statement ingestion and extraction | PASSED | 2026-11-12 |
| 2 | Deterministic claim engine | IN PROGRESS | 2026-11-12 |
| 3 | Proof records and links | PENDING | |
| 4 | Verifier page | PENDING | |
| 5 | Prover flow | PENDING | |
| 6 | Hardening and red team | PENDING | |
| 7 | NEAR payment layer (stretch) | PENDING | |
| 8 | Submission readiness | PENDING | |

## Decisions

- **2026-11-11** Full TDX quote verification via dcap-qvl (C++ native bindings) is out of scope for the hackathon time box. We implement all structural checks the HTTP API exposes: nonce echo, signing address presence, intel_quote presence, event_log presence, report_data presence, signing_algo match, and app_compose presence. Full DCAP quote cryptographic verification is roadmap. Noted in README and attest.ts.
- **2026-11-11** Default TEE model: `zai-org/GLM-5.1-FP8` per NEAR AI Cloud verification example.
- **2026-11-11** Using OpenAI SDK (openai npm package) pointed at NEAR AI Cloud base URL per quickstart docs.
- **2026-11-11** Tailwind v3 chosen over v4 to avoid config churn during time-boxed hackathon.

## Failure Log

(empty)

## Cut List

(empty)
