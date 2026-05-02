# Arapoint Marketing Videos

Final delivered videos live in this directory. Each file is a complete, voiced MP4 ready to download or upload to a hosting platform.

## Files

The 10 videos are produced one per task. Final filenames follow this convention:

- `01-welcome-to-arapoint.mp4`
- `02-nin-verification-and-slips.mp4`
- `03-bvn-retrieval-and-modification.mp4`
- `04-ipe-clearance-and-birth-attestation.mp4`
- `05-education-verification.mp4`
- `06-wallet-and-payments.mp4`
- `07-become-an-agent.mp4`
- `08-developer-api-overview.mp4`
- `09-webhooks-and-events.mp4`
- `10-production-best-practices.mp4`

Narration scripts live in `videos/scripts/<filename>.txt`.

### Narration length vs runtime

Each task brief targets ~270-300 words; the **binding constraint is the
final voiced MP4 runtime (110-120 s)**. Matilda speaks at roughly
115-120 wpm, so word counts may land lower than the brief suggests in
order to stay inside the runtime cap. When a script is materially shorter
than the brief, that is by design — we re-time the script after the first
ElevenLabs render rather than padding silence into the audio.

## Voice (locked)

All videos use **ElevenLabs** via the Replit ElevenLabs connector.
- **Voice:** Matilda — "Knowledgable, Professional" (American female, mature, informative/educational).
- **Voice ID:** `XrExE9yKIg1WjnnlVkGX`
- **Model:** `eleven_multilingual_v2`

This is a brand consistency requirement — do not change the voice between videos. Matilda was chosen as the closest match to the original "Shimmer — clear, professional, polished" brief and is locked into `scripts/render-with-narration.mjs` as the default; the `--voice-id` override exists only for emergencies.

## How to render a video (per video task)

The Arapoint video stack at `src/components/video/` holds **one** video composition at a time. Each video task replaces it, exports a silent MP4 from the preview pane, then uses the narration pipeline to produce the final voiced MP4.

### 1. Build the video composition

Replace `src/components/video/VideoTemplate.tsx` and the scene files for the target video. Keep the total of `SCENE_DURATIONS` <= 120,000 ms (the 2-minute cap).

### 2. Validate frame integrity & motion

```bash
bash scripts/validate-recording.sh    # if present in the video-js skill
```

### 3. Capture the silent MP4

Start the video workflow (`Arapoint Video Ad`), open the preview, and click the **Export** button injected by the video stack. The silent MP4 is saved into the project's exports directory (`exports/` or wherever the recorder writes it).

### 4. Write the narration script

Save the narration text into `videos/scripts/<NN>-<slug>.txt`. Aim for ~270-300 words for a ~110-120 second video. Plain text only — no SSML, no markdown.

### 5. Render the final voiced MP4

```bash
node scripts/render-with-narration.mjs \
  --script videos/scripts/01-welcome.txt \
  --video  exports/raw/<your-export>.mp4 \
  --out    videos/01-welcome-to-arapoint.mp4
```

The script will:

1. Call ElevenLabs TTS (Matilda voice, `eleven_multilingual_v2` model) via the Replit connector to generate narration audio.
2. Probe audio + video durations.
3. If audio is longer than video, hold the last frame and fade to black so the narration finishes cleanly.
4. Mux audio + video with a 1.2s audio fade-out at the end and ship the final MP4.

The result lands in `videos/<NN>-<slug>.mp4`, ready to deliver.

## Brand kit (locked)

- **Colors:** navy `#0F2346`, deep-blue `#1C3A6B`, green `#6DB33F`, gold `#D4A24C`, light `#F5F7FA`, dark `#0A1628`.
- **Fonts:** Plus Jakarta Sans (display), Inter (body), JetBrains Mono (developer code).
- **Logo:** `public/logos/arapoint-logo.png` — official Arapoint solution logo.
- **Footer URL:** `arapoint.com.ng`
- **Support email:** `support@arapoint.com.ng`
- **Reusable footer:** `<BrandFooter />` from `src/components/video/BrandFooter.tsx`.

## Environment

- **ElevenLabs** is connected via the Replit ElevenLabs connector — authentication is injected automatically by `@replit/connectors-sdk`. No API key needs to be in `.env`.
- `ffmpeg` and `ffprobe` are available on the host.
