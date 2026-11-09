#!/usr/bin/env python3
"""Assemble the Second Chance demo video from recorded clips, ElevenLabs voiceover and cards.
Usage: python3 assemble.py <workdir> <out.mp4>
workdir has clips/*.mkv (record.mjs), vo/n*.mp3 (voiceover), cards/*.png (cards.mjs)."""
import json, os, subprocess, sys

W = sys.argv[1] if len(sys.argv) > 1 else "/workspace/second-chance/video/work"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/workspace/second-chance/video/second-chance-demo.mp4"
SEG = os.path.join(W, "segs"); os.makedirs(SEG, exist_ok=True)
FPS = 30
XF = 0.4  # crossfade between segments (no dip to black)

# name, source (clip or card), keep ranges (s), min length (s), voice file, voice offset, captions [(png, start, end)]
PLAN = [
  ("00-title", "card:title", None, 6.2, "n0-title", 0.3, []),
  ("01-store", "s1-store", [(0.0, 12.8)], 12.8, "n1-store", 0.3, [("cap-sandbox", 4.0, 12.6)]),
  ("02-cancel", "s2-cancel", [(1.0, 18.74), (22.0, 34.0), (37.0, 43.10), (43.41, 47.5)], 39.93, "n2-cancel", 0.3, [("cap-practice", 0.4, 7.0)]),
  ("03-paypal", "s3-paypal", [(0.0, 12.8), (36.3, 43.9)], 20.4, "n3-paypal", 0.3, [("cap-wait", 12.8, 16.8)]),
  ("04-outbox", "s4-outbox", [(0.6, 3.9), (7.4, 16.0), (17.5, 25.5)], 21.3, "n4-outbox", 0.3, []),
  ("05-overview", "s5-overview", [(0.5, 12.9)], 12.4, "n5-overview", 0.3, [("cap-sample", 3.5, 12.3)]),
  ("06-grids", "s6-grids", [(0.3, 9.6), (18.83, 26.3)], 16.8, "n6-grids", 0.2, [("cap-sample", 9.6, 16.7)]),
  ("07-studio", "s7-studio", [(0.5, 4.5), (6.5, 8.0), (11.5, 17.3), (24.85, 33.5)], 20.3, "n7-studio", 0.2, [("cap-aiwait", 11.3, 13.3), ("cap-sample", 13.8, 20.2)]),
  ("08-close", "card:closing", None, 10.5, "n8-close", 0.4, []),
]

def run(cmd):
    print(" ".join(cmd)[:300]); subprocess.run(cmd, check=True)

def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())

timeline = []; t = 0.0; seg_files = []
for name, src, keep, minlen, vo, vo_off, caps in PLAN:
    vo_path = os.path.join(W, "vo", vo + ".mp3"); vlen = dur(vo_path)
    out = os.path.join(SEG, name + ".mp4")
    if src.startswith("card:"):
        length = max(minlen, vo_off + vlen + 0.6) + (0 if name == PLAN[-1][0] else XF)
        png = os.path.join(W, "cards", src[5:] + ".png")
        fade = f"fade=t=in:st=0:d=0.6,fade=t=out:st={length-0.8:.2f}:d=0.8" if name == "08-close" else "fade=t=in:st=0:d=0.5"
        run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", png, "-t", f"{length:.3f}", "-vf", f"format=yuv420p,{fade}", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-r", str(FPS), out])
    else:
        clip = os.path.join(W, "clips", src + ".mkv")
        parts = []; fc = []
        for i, (a, b) in enumerate(keep):
            fc.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[p{i}]"); parts.append(f"[p{i}]")
        kept = sum(b - a for a, b in keep)
        length = max(minlen, kept, vo_off + vlen + 0.4) + XF
        fc.append(f"{''.join(parts)}concat=n={len(parts)}:v=1:a=0,fps={FPS},tpad=stop_mode=clone:stop_duration={max(0, length-kept)+0.5:.3f},trim=duration={length:.3f}[base]")
        inputs = ["-i", clip]; last = "base"
        for j, (cap, cs, ce) in enumerate(caps):
            inputs += ["-loop", "1", "-framerate", str(FPS), "-i", os.path.join(W, "cards", cap + ".png")]
            k = j + 1
            fc.append(f"[{k}:v]format=rgba,fade=t=in:st={cs}:d=0.3:alpha=1,fade=t=out:st={ce-0.3}:d=0.3:alpha=1[c{k}]")
            fc.append(f"[{last}][c{k}]overlay=0:0:enable='between(t,{cs},{ce})':shortest=0[o{k}]"); last = f"o{k}"
        fc.append(f"[{last}]format=yuv420p[v]")
        run(["ffmpeg", "-y", "-loglevel", "error"] + inputs + ["-filter_complex", ";".join(fc), "-map", "[v]", "-t", f"{length:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-r", str(FPS), out])
    timeline.append({"segment": name, "len": length, "start": round(t, 2), "end": round(t + length, 2), "voice": vo, "voice_start": round(t + vo_off, 2), "voice_len": round(vlen, 2)})
    seg_files.append(out); t += length - (0 if name == PLAN[-1][0] else XF)

# video: crossfade chain
video_only = os.path.join(SEG, "video.mp4")
ins = []; fc = []; prev = "0:v"; acc = 0.0
for i, f in enumerate(seg_files):
    ins += ["-i", f]
for i in range(1, len(seg_files)):
    acc += timeline[i - 1]["len"] - XF
    fc.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={XF}:offset={acc:.3f}[x{i}]"); prev = f"x{i}"
run(["ffmpeg", "-y", "-loglevel", "error"] + ins + ["-filter_complex", ";".join(fc), "-map", f"[{prev}]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-r", str(FPS), "-pix_fmt", "yuv420p", video_only])

# voiceover track
ins = []; fc = []
for i, seg in enumerate(timeline):
    ins += ["-i", os.path.join(W, "vo", seg["voice"] + ".mp3")]
    ms = int(seg["voice_start"] * 1000)
    fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{i}]")
fc.append("".join(f"[a{i}]" for i in range(len(timeline))) + f"amix=inputs={len(timeline)}:normalize=0,apad,atrim=duration={t:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
audio = os.path.join(SEG, "voice.m4a")
run(["ffmpeg", "-y", "-loglevel", "error"] + ins + ["-filter_complex", ";".join(fc), "-map", "[aout]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", audio])

run(["ffmpeg", "-y", "-loglevel", "error", "-i", video_only, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", "-shortest", OUT])
json.dump({"total": round(t, 2), "segments": timeline}, open(os.path.join(W, "timeline.json"), "w"), indent=2)
print(json.dumps({"total": round(t, 2), "segments": timeline}, indent=1))
