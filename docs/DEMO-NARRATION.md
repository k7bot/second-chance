# Demo narration script — target 2:50

Draft prepared Sunday, Nov 8, 2026 (ET) to match `DEMO-OUTLINE.md`. Say only what is on screen. Where the live offer or analyst reply is unknown, read the placeholder in brackets instead of inventing one. Do not claim saved-revenue numbers, inbox delivery, or a PayPal mutation that this pass did not show. Record in a normal browser (PayPal buttons can paint blank in headless capture). This script does not include setup, recording, publishing, or submission.

Base: https://second-chance-k12-4d00.vercel.app

## 0:00–0:12 — Store (`/store`)

This is Second Chance, an AI retention agent for merchants who bill through PayPal Subscriptions.

The demo shop is Brightside Yoga. These are sandbox subscribe buttons, not real charges. We will skip checkout and go straight to saving a member who wants to leave.

## 0:12–0:50 — Cancel flow (`/store/account` as Maya Chen)

Here is Maya Chen, a 14-month practice member. Practice mode lets judges try the save flow without a PayPal login, and it does not change a real sandbox subscription.

Maya chooses Cancel membership, then Taking a break.

Second Chance comes back with one offer, not a stack of popups. [Read the offer title, duration, and price shown on screen.]

This demo panel shows what the model decided and why. [Read the engine or model, the reason, and the short rationale on screen. If the panel is missing, say so and keep going.]

She can accept it, or she can Cancel without an offer, so this never traps her. [Point to Cancel without an offer. Do not click it. If you accept during a planned recording, describe only the result that actually appears, and do not call a practice accept a PayPal transaction.]

## 0:50–1:10 — Demo console, case 1 (`/dashboard/demo`, then `/dashboard/events`)

The other three cases start from real PayPal webhook events.

In the demo console I fire a signed sandbox Payment failed event, through PayPal, not as a real failed charge.

[Wait off-camera for the webhook if needed. Then on `/dashboard/events`:] Here is the event and its signature status. [Say the status shown, such as verified. If this row was only a local Replay, say that. Do not call a Replay a fresh signed PayPal round trip.]

## 1:10–1:35 — Outbox (`/dashboard/outbox`)

The outbox is the message log.

This is the payment-recovery note from that failed payment, case 1. [Read a short line from the actual message.]

This is the come-back note after a suspension, case 3.

And this is the win-back note after someone cancels inside PayPal, case 4, with its approve link.

[Mention the delivery status on screen. "Sent" means the email provider accepted it, not that we checked an inbox. Do not claim a recovery, reactivation, or new subscription happened just because a message exists.]

Case 2 was Maya's cancel flow a moment ago.

## 1:35–1:50 — Overview (`/dashboard`)

This is the merchant overview: saves, offers, and who needs attention.

[If sample history is visible, say it is labelled synthetic sample data, not live Brightside revenue. Do not read invented totals.]

## 1:50–2:10 — Subscribers and offers (`/dashboard/subscribers`, then `/dashboard/offers`)

On Subscribers I can open a member and see their PayPal event timeline and offer history. [Open one row and name what is actually in the detail.]

[Show one grouping or saved view if it is already there.]

On Offers and revenue, a pivot of trigger by offer shows which saves match which churn signal. [Describe the chart or measures that are visible. Do not add percentages that are not on screen.]

## 2:10–2:40 — Studio (`/dashboard/studio`)

Studio is the same book of business, with a Save-flow Sankey so you can see where people go after each offer.

I will ask the AI analyst: Who should I call today?

[When the answer arrives, read the actual recommendation and any tool-backed names on screen. If the analyst is unavailable or resting, say that. Do not present rules output as a live model reply.]

## 2:40–2:50 — Close

Second Chance watches PayPal subscription events, writes one honest offer, and applies it through PayPal's own APIs.

You can try it at second-chance-k12-4d00.vercel.app. Thank you.

## Recording notes

- Aim to finish by 2:50 so there are about 10 seconds of margin under the 3-minute limit.
- If a step fails, say what failed and move on. Do not patch it with a claim the screen does not support.
- Setup such as resetting practice members or loading sample history is listed in `DEMO-OUTLINE.md` and needs approval before anyone clicks those controls.
