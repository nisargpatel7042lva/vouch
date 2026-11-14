---
name: no-emojis-use-svg-icons
description: User requires proper SVG icon components everywhere in the UI — no emoji characters
metadata:
  type: feedback
---

No emojis anywhere in the website UI. Replace all emoji characters (📄, 🔐, ✅, ❌, 🏠, etc.) with proper inline SVG icon components.

**Why:** User explicitly said "no emojis to be used in the website i need u to use proper icons"

**How to apply:** Any time adding icons, visual indicators, or status markers to the UI, use SVG components from `app/components/icons.tsx`. Never use emoji characters or unicode symbols as visual decoration. PASS/FAIL verdicts use styled text with SVG check/X icons.
