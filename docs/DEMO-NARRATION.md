# Demo narration — final (recorded Nov 9, 2026 ET)

Final voiceover for the 2:40 demo video (`video/second-chance-demo.mp4`, kept out of git). Recorded on the hosted app https://second-chance-k12-4d00.vercel.app (deploy `dpl_5xaUDpdM34ypDv4PcyxYZm8DiwK3`, commit `76dbe15`) in a headed Chromium under Xvfb at 1920×1080. Voice: ElevenLabs **"Jim F – Warm, Confident, Conversational"** (`eleven_v4`), generated one segment at a time so each segment could be timed to its screen recording.

Rules this script follows: it says only what is on screen; "sandbox", "practice member" and "sample data" are said wherever they apply; no saved-revenue claims, no inbox-delivery claims, no PayPal mutation that the recording did not show. If you re-record, the live offer and analyst answer can differ, so re-check lines marked ⚠︎ against the new take.

| # | Video time | Screen | Narration |
|---|---|---|---|
| 0 | 0:00–0:06 | Title card | Second Chance is an AI retention agent for merchants who bill through PayPal Subscriptions. |
| 1 | 0:06–0:19 | `/store` → pricing with PayPal buttons (caption: PayPal sandbox · no real money) | Our demo shop, Brightside Yoga, sells memberships with PayPal's subscribe buttons, running in the PayPal sandbox, so no real money moves. Now, a member who wants to leave. |
| 2 | 0:19–0:59 | `/store/account` → Maya Chen → Cancel membership → Taking a break → hover "Cancel without an offer" → See my options → offer → decision panel → accept (caption: practice member) | Maya Chen is a practice member, so anyone can try this without a PayPal login, and nothing is charged. She picks Cancel membership, then Taking a break. She can still cancel without an offer. No traps. Second Chance asks Qwen, running on Nebius AI Studio, for one offer, and Maya gets a three-month pause. ⚠︎ The demo panel shows why: her signals, the model's reasoning, and the guardrails every offer must pass. On a real subscription, this calls PayPal's suspend API. Maya accepts, and her membership is paused until February seventh. ⚠︎ |
| 3 | 0:59–1:19 | `/dashboard/demo` Case 1 **Via PayPal** → (≈20 s wait cut, captioned) → `/dashboard/events` | Cases one, three and four start from PayPal webhooks. In the demo console, I send a Payment failed event through PayPal's sandbox webhook simulator. About twenty seconds later, it lands: signature verified, and Second Chance has already written a recovery message with a seven-day grace period. |
| 4 | 1:19–1:40 | `/dashboard/outbox`, scrolled through all four messages | The outbox holds every message. The recovery note for that failed payment: case one. Maya's pause confirmation. A win-back for a member who cancelled inside PayPal: case four. And a come-back offer after a suspension: case three. Simulator addresses stay outbox-only; real members get email. |
| 5 | 1:40–1:53 | `/dashboard` (caption: includes SAMPLE data) | The merchant overview is built with AG Grid and AG Charts. Most of the history here is labelled sample data, a synthetic book of business, alongside the live sandbox events. |
| 6 | 1:53–2:10 | `/dashboard/subscribers` → expand John Doe (master/detail) → `/dashboard/offers` pivot + integrated chart (caption: SAMPLE data) | In Subscribers, I can open a member to see their PayPal event timeline, the offer the AI wrote, and their plan. On Offers and revenue, a pivot of trigger by offer, linked to an integrated chart, shows which offers work for which churn signal. |
| 7 | 2:10–2:30 | `/dashboard/studio` Sankey → Build · Ask AI → "Who should I call today?" starter (AI wait cut, captioned) → answer | The Studio is built on AG Studio, with a custom save-flow Sankey. I'll ask the AI analyst, also Qwen on Nebius, who to call today. It calls two tools, ranks the at-risk members, and says to prioritize John's payment recovery. ⚠︎ The save rates it quotes come from the sample history. |
| 8 | 2:30–2:40 | Closing card with the hosted URL | Second Chance turns PayPal subscription events into one honest offer, applied through PayPal's own APIs. Try it at the link on screen. |

## What was on screen in this take (for fact-checking)

- Maya's offer: "Take a breath, Maya", pause 3 months, $0 for 3 months; panel: Signals "taking break · member 14 months · Brightside Pro at $29", picked by **Qwen3-30B-A3B on Nebius AI Studio**, guardrails "price ≥ 40% of list, discounts ≤ 6 months, pauses ≤ 3 months, only cancel-page offer types", real-subscription call `POST /v1/billing/subscriptions/{id}/suspend`. Result: "Enjoy the break — paused until February 7."
- Events: Payment failed (John Doe, PayPal simulator payload) **Signature verified** → "recovery message sent, grace until 2026-11-16"; the suspended/cancelled rows (Jordan Rivera) were fired Via PayPal off-camera before recording.
- Outbox: four messages, all "Outbox only" (simulator / practice placeholder addresses): payment recovery (John), pause confirmation (Maya), win-back (Jordan, cancelled in PayPal), come-back (Jordan, suspended).
- Studio answer (Qwen): tools `list_at_risk_members` and `retention_playbook`; top at-risk members John Doe, Jordan Rivera, Liam Walsh; "Prioritize John's recovery offer now". Its save-rate percentages come from the SAMPLE history.

## Edits and captions

- Waits trimmed on camera and captioned: the ~20 s PayPal webhook delivery wait ("Waited ~20 s off-camera for PayPal's signed webhook") and the Studio analyst wait ("AI wait trimmed"). The offer AI (~3 s) is trimmed to ~1 s of its "Finding the best option" state.
- On-screen captions also mark "PayPal sandbox · no real money", "Practice member · no PayPal call, no real charge" and "Includes SAMPLE data: a labelled synthetic history".
- No background music. No checkout was performed; the PayPal Smart Buttons render in the headed browser and are only hovered.

Rebuild: see `tools/demo-video/README.md`.
