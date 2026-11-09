# Demo narration — final (v2, recorded Nov 9, 2026 ET)

Final voiceover for the 2:41 demo video (v2; v1 kept locally as `second-chance-demo-v1.mp4`) (`video/second-chance-demo.mp4`, kept out of git). Recorded on the hosted app https://second-chance-k12-4d00.vercel.app (deploy `dpl_5xaUDpdM34ypDv4PcyxYZm8DiwK3`, commit `76dbe15`) in a headed Chromium under Xvfb at 1920×1080. Voice: ElevenLabs **"Jim F – Warm, Confident, Conversational"** (`eleven_v4`), generated one segment at a time so each segment could be timed to its screen recording.

Rules this script follows: it says only what is on screen; "sandbox", "practice member" and "sample data" are said wherever they apply; no saved-revenue claims, no inbox-delivery claims, no PayPal mutation that the recording did not show. If you re-record, the live offer and analyst answer can differ, so re-check lines marked ⚠︎ against the new take.

| # | Video time | Screen | Narration |
|---|---|---|---|
| 0 | 0:00–0:07 | Title card | Second Chance is an AI retention agent for merchants who bill through PayPal Subscriptions. |
| 1 | 0:07–0:20 | `/store` → pricing with PayPal buttons (caption: PayPal sandbox · no real money) | Our demo shop, Brightside Yoga, sells memberships with PayPal's subscribe buttons, running in the PayPal sandbox, so no real money moves. Now, a member who wants to leave. |
| 2 | 0:19–1:00 | `/store/account` → Maya Chen → Cancel membership → Taking a break → hover "Cancel without an offer" → See my options → offer → decision panel → accept (caption: practice member) | Maya Chen is a practice member, so anyone can try this without a PayPal login, and nothing is charged. She picks Cancel membership, then Taking a break. She can still cancel without an offer. No traps. Second Chance asks Qwen, running on Nebius AI Studio, for one offer, and Maya gets a three-month pause. ⚠︎ The demo panel shows why: her signals, the model's reasoning, and the guardrails every offer must pass. On a real subscription, this calls PayPal's suspend API. Maya accepts, and her membership is paused until February seventh. ⚠︎ |
| 3 | 0:59–1:20 | `/dashboard/demo` Case 1 **Via PayPal** → (≈20 s wait cut, captioned) → `/dashboard/events` | Cases one, three and four start from PayPal webhooks. In the demo console, I send a Payment failed event through PayPal's sandbox webhook simulator. About twenty seconds later, it lands: signature verified, and Second Chance has already written a recovery message with a seven-day grace period. |
| 4 | 1:20–1:41 | `/dashboard/outbox`, scrolled through all four messages | The outbox holds every message. The recovery note for that failed payment: case one. Maya's pause confirmation. A win-back for a member who cancelled inside PayPal: case four. And a come-back offer after a suspension: case three. Simulator addresses stay outbox-only; real members get email. |
| 5 | 1:41–1:54 | `/dashboard` (caption: includes SAMPLE data) | The merchant overview is built with AG Grid and AG Charts. Most of the history here is labelled sample data, a synthetic book of business, alongside the live sandbox events. |
| 6 | 1:54–2:11 | `/dashboard/subscribers` → expand John Doe (master/detail) → `/dashboard/offers` pivot + integrated chart (caption: SAMPLE data) | In Subscribers, I can open a member to see their PayPal event timeline, the offer the AI wrote, and their plan. On Offers and revenue, a pivot of trigger by offer, linked to an integrated chart, shows which offers work for which churn signal. |
| 7 | 2:11–2:31 | `/dashboard/studio` Sankey → Build · Ask AI → editor side panels collapsed → **types "Who should I call today?"** (AI wait cut, captioned) → full answer | The Studio is built on AG Studio, with a custom save-flow Sankey. I'll ask the AI analyst, also Qwen on Nebius: who should I call today? It checks the at-risk members with a tool, then says to call John first about his failed payment, and Jordan next, with the win-back offer. ⚠︎ |
| 8 | 2:31–2:41 | Closing card with the hosted URL | Second Chance turns PayPal subscription events into one honest offer, applied through PayPal's own APIs. Try it at the link on screen. |

## What was on screen in this take (for fact-checking)

- Maya's offer: "Take a breath, Maya", pause 3 months, $0 for 3 months; panel: Signals "taking break · member 14 months · Brightside Pro at $29", picked by **Qwen3-30B-A3B on Nebius AI Studio**, guardrails "price ≥ 40% of list, discounts ≤ 6 months, pauses ≤ 3 months, only cancel-page offer types", real-subscription call `POST /v1/billing/subscriptions/{id}/suspend`. Result: "Enjoy the break — paused until February 7."
- Events: Payment failed (John Doe, PayPal simulator payload) **Signature verified** → "recovery message sent, grace until 2026-11-16"; the suspended/cancelled rows (Jordan Rivera) were fired Via PayPal off-camera before recording.
- Outbox: four messages, all "Outbox only" (simulator / practice placeholder addresses): payment recovery (John), pause confirmation (Maya), win-back (Jordan, cancelled in PayPal), come-back (Jordan, suspended).
- Studio (v2): prompt typed on screen is exactly "Who should I call today?". Answer (Qwen): tool `list_at_risk_members`; "You should call John Doe and Jordan Rivera today"; John ($500/month, simulator payload) payment failed → Payment recovery; Jordan cancelled in PayPal → Win-back; "Call John first"; Liam Walsh lower urgency. KPIs show their values (MRR saved $1,400) because the Data/Compose/Filters panels are collapsed before asking.

## Edits and captions

- Waits trimmed on camera and captioned: the ~20 s PayPal webhook delivery wait ("Waited ~20 s off-camera for PayPal's signed webhook") and the Studio analyst wait ("AI wait trimmed"). The offer AI (~3 s) is trimmed to ~1 s of its "Finding the best option" state.
- On-screen captions also mark "PayPal sandbox · no real money", "Practice member · no PayPal call, no real charge" and "Includes SAMPLE data: a labelled synthetic history".
- Segments join with 0.4 s crossfades (v1 had short dips to black at each cut); only the very start and end fade from/to black.
- The cursor is parked off the copy on Maya's result screen.
- No background music. No checkout was performed; the PayPal Smart Buttons render in the headed browser and are only hovered.

Rebuild: see `tools/demo-video/README.md`.

## v2 changes (Nov 9, 2026 ET)

- Studio re-recorded: the prompt is typed and matches the narration; the voiceover line for segment 7 was regenerated (same voice) to match the new answer; KPI boxes no longer truncate to "…".
- All segments re-recorded in one pass after a fresh reset/seed so the data stays consistent; Maya got the same offer (3-month pause, until February 7), so segments 0–6 and 8 reuse the v1 voiceover.
- Reported "missing period" after "February 7": checked at full resolution and in source (`app/src/lib/retention.ts`, used by both the result screen and the confirmation email). The copy already reads "…paused until February 7. No charges until then."; the cursor sitting on the line in v1 made it look wrong at preview size. No app change was needed.
