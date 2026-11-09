# Demo video tooling

Rebuilds `video/second-chance-demo.mp4` (gitignored) from the hosted app.

1. `node tools/demo-video/cards.mjs video/work/cards` — title/closing cards and caption overlays (PNG).
2. `xvfb-run -a -s "-screen 0 1920x1080x24 -nocursor" node tools/demo-video/record.mjs video/work/clips` — headed Chromium (1600×900 CSS at 1.2× = 1920×1080), ffmpeg `x11grab` per segment, a drawn cursor and click ripple, and `marks.json` with the waits to trim. **Setup it runs:** `POST /api/demo/reset`, `/seed`, `/history`, then Via PayPal `SUSPENDED` and `CANCELLED` simulator events. On camera: practice member Maya's cancel flow (accepts the offer) and Case 1 Via PayPal. It never touches real sandbox subscriptions or sends email.
3. Voiceover: one ElevenLabs speech generation per segment (text in `docs/DEMO-NARRATION.md`), saved as `video/work/vo/n0-title.mp3` … `n8-close.mp3`.
4. `python3 tools/demo-video/assemble.py video/work video/second-chance-demo.mp4` — cuts the keep ranges in `PLAN` (edit them against a new `marks.json`), overlays captions, places each voice segment, loudnorm to −16 LUFS, H.264/AAC 1080p30.
5. Afterwards reset the demo: `POST /api/demo/reset`, `/seed`, `/history`.

The live offer and analyst answer change between takes, so re-check the narration and the keep ranges after re-recording.
