# Technical demo outline — target 2:50

_Prepared Nov 7, 2026 ET. Rehearsed Nov 9, 2026 ET on https://second-chance-k12-4d00.vercel.app (headless Playwright 1280×800). Screenshots: `shots/rehearsal/`. _

Base: https://second-chance-k12-4d00.vercel.app

## Recording sequence (170 seconds)

| Time | Route / action | Evidence to capture | Rehearsal (Nov 9) |
|---|---|---|---|
| 0:00–0:12 | `/store` | Brightside Yoga plans and PayPal subscription buttons in a **normal browser**. PayPal sandbox, not real money. Do not spend recording time on checkout. | Pass (~9s cold). Plans clear. PayPal button iframes present but **paint blank in headless** (known); record this beat in a real browser. |
| 0:12–0:50 | `/store/account` → **Maya Chen** → Cancel membership → **Taking a break** → **See my options** | Show the actual offer plus demo-only **Demo · what Second Chance decided** (engine/model, signals, rationale). Practice mode: no PayPal call for DEMO members. Do not promise a specific offer. Briefly show **Cancel without an offer** without triggering it. If accepting, show only the real result. | Pass. Offer AI ~3.4s (not slow). Maya got a 2-month pause; decision panel named Qwen3-30B-A3B on Nebius; accept → “Enjoy the break / paused until …”. **Fold issue at 1280×800:** “See my options”, “Cancel without an offer”, and the decision panel all sit **below the fold** — scroll or use a taller window before talking to them. |
| 0:50–1:10 | `/dashboard/demo` → Case 1 **Payment failed** → **Via PayPal**; then `/dashboard/events` | One signed sandbox simulator round trip and its real signature status. Not a real failed charge. Wait off-camera for delivery. Do not call local **Replay** a fresh signed round trip. | Pass. Via PayPal returned ok; events showed **Signature verified** for live simulator traffic (incl. cancelled / suspended / created). Allow ~15–20s off-camera for webhook lag. |
| 1:10–1:35 | `/dashboard/outbox` | Show prepared messages for cases 1, 3 and 4 (recovery, come-back, win-back). Case 2 is the Maya flow. Show actual copy/status only. | Partial. After prep, outbox clearly showed Maya confirmation + Jordan win-back; recovery/come-back were not clearly framed in the first viewport. **Before recording, verify all three case messages are present and scroll as needed.** Do not claim inbox delivery; “Outbox only” is correct for placeholders. |
| 1:35–1:50 | `/dashboard` | Retention overview as shown. Label sample history as synthetic; no invented metrics. | Pass. Overview renders with sample-backed figures. Say aloud that SAMPLE history is synthetic demo data. |
| 1:50–2:10 | `/dashboard/subscribers` → `/dashboard/offers` | Member master/detail + trigger × offer pivot / integrated chart. | Pass for offers pivot/chart. **Master/detail expand did not open in headless rehearsal** — practice the expand click in a real browser before recording; if it fails, stay on the grid + pivot rather than forcing it. |
| 2:10–2:40 | `/dashboard/studio` → **Build · Ask AI** → “Who should I call today?” | Sankey + live analyst answer. Do not invent the answer. | **Was failing Nov 9 rehearsal** (`api_error: Unable to process request…` when Nebius tried to emit a tool call). Fixed the same day by bridging Studio tool requests through Nebius Chat Completions. Re-verify once on the new deploy before recording. |
| 2:40–2:50 | `/dashboard/events` or final dashboard | Close on PayPal event evidence + demo URL. Keep ~10s margin. | Pass. |

**Realistic on-camera time if waits are trimmed off-camera:** about **2:30–2:50**. Cold navigations alone can eat ~30–40s; keep tabs pre-warmed. Offer AI was ~3s; Studio AI did not complete.

## Setup checklist (for recording)

Rehearsal already exercised reset/seed/history/simulator/practice cancel with approval. Hosted app was **reset + seeded + sample history reloaded** again after rehearsal so practice members are clean. **Cases 1/3/4 outbox rows were cleared by that reset** — re-prep them before recording:

1. Normal browser (PayPal buttons). Prefer height ≥1000px or be ready to scroll on cancel + decision panel.
2. Confirm Maya/Leo/Ava exist and Maya is ACTIVE (`POST /api/demo/seed` / **Reset practice members** if needed).
3. Keep sample history loaded for grids/Studio (`POST /api/demo/history`) and say it is synthetic.
4. Fire **Via PayPal** for `PAYMENT.FAILED`, `SUSPENDED`, `CANCELLED`; wait for webhook lag; confirm **Signature verified** on Events and the three messages on Outbox. Use **Replay** only if a signed delivery was already shown and you need a fresh local row — label it honestly.
5. Do **not** use real-subscription Suspend/Cancel controls or send “Email this to me” unless separately approved.
6. Re-test Studio “Who should I call today?” on the post-fix deploy immediately before recording.
7. Hosted `LLM_DAILY_LIMIT` is 300/day (code default 1500). Offer path worked in rehearsal; don’t burn the cap on retries.

## Grounding and submission constraints

- `app/src/app/api/demo/seed/route.ts`: Maya/Leo/Ava practice members.
- `app/src/lib/offers/types.ts`: “Taking a break” / `taking_break`.
- `app/src/app/store/account/cancel/flow.tsx`: **See my options**, cancel-without-offer, decision panel.
- `app/src/app/dashboard/demo/page.tsx`: cases, Via PayPal vs Replay, seed/history/reset.
- `README.md` + [official rules](https://paypalaihackathon.devpost.com/rules): public YouTube ≤3 min target, public licensed repo, functional demo. Deadline Nov 12, 2026, 3 PM ET (target noon). Judging Dec 1–15 ET.
- No narration script, fabricated metrics, publishing or submission in this file.

## Recorded take — Nov 9, 2026 ET

Final video: `video/second-chance-demo.mp4` (gitignored), **2:41** (v2), 1920×1080 H.264/AAC, ElevenLabs voiceover. Final script and per-segment timestamps: `DEMO-NARRATION.md`. Tooling: `tools/demo-video/`.

How the rehearsal issues were handled:

- **Fold at 1280×800:** recorded at 1600×900 CSS (1.2× → 1920×1080), with eased scrolling to "See my options", "Cancel without an offer" and the decision panel.
- **PayPal buttons blank in headless:** recorded in a *headed* Chromium under Xvfb; the Smart Buttons render and are hovered only (no checkout on screen).
- **Cases 1/3/4 in the Outbox:** Suspended and Cancelled were fired Via PayPal before recording; Case 1 was fired Via PayPal on camera; all four messages (recovery, Maya's confirmation, win-back, come-back) are shown.
- **Master/detail:** expanded fine in the headed browser (John Doe row: PayPal event timeline, offer history, member card).
- **Sidebar badge:** not mentioned in the narration.
- **Sample data:** said in narration on Overview and Studio, plus an on-screen caption on Overview, Offers and Studio.
- **Studio:** prompt typed on screen ("Who should I call today?") to match the narration; editor side panels collapsed so the KPIs are not truncated.
- **Transitions:** 0.4 s crossfades between segments, no dips to black.
- **Waits:** the ~20 s webhook wait and the Studio AI wait are cut and captioned as such; the offer AI took ~3 s and is shown for ~1 s.
- Demo data was reset + seeded + sample history reloaded after recording.
