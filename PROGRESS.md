# Vouch – Build Progress

Hackathon: NEAR Hackathon · Deadline: 14 Nov 2026, 23:59 UTC

## Phase Status

| Phase | Description | Status | Date |
|-------|-------------|--------|------|
| 0 | Foundation + live attestation spike | PASSED | 2026-11-12 |
| 1 | Statement ingestion and extraction | PASSED | 2026-11-12 |
| 2 | Deterministic claim engine | PASSED | 2026-11-12 |
| 3 | Proof records and links | PASSED | 2026-11-12 |
| 4 | Verifier page | PASSED | 2026-11-12 |
| 5 | Prover flow | PASSED | 2026-11-12 |
| 6 | Hardening and red team | PASSED | 2026-11-12 |
| 7 | NEAR payment layer (stretch) | SKIPPED | |
| 8 | Submission readiness | PASSED | 2026-11-12 |

## Decisions

- **2026-11-11** Full TDX quote verification via dcap-qvl (C++ native bindings) is out of scope for the hackathon time box. We implement all structural checks the HTTP API exposes: nonce echo, signing address presence, intel_quote presence, event_log presence, report_data presence, signing_algo match, and app_compose presence. Full DCAP quote cryptographic verification is roadmap. Noted in README and attest.ts.
- **2026-11-11** Default TEE model: `z-ai/glm-5.3-flash` per NEAR AI Cloud verification example.
- **2026-11-11** Using OpenAI SDK (openai npm package) pointed at NEAR AI Cloud base URL per quickstart docs.
- **2026-11-11** Tailwind v3 chosen over v4 to avoid config churn during time-boxed hackathon.
- **2026-11-12** Phase 7 (NEAR payment layer) skipped — insufficient time and credits to implement fully. Architecture supports future addition behind a feature flag.

## Failure Log

(empty)

## Cut List

- Phase 7: NEAR payment layer (stretch goal)
- Full DCAP cryptographic quote verification (roadmap)
- Multi-currency statement support (v2)
