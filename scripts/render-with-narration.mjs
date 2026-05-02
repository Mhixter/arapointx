#!/usr/bin/env node
/**
 * render-with-narration.mjs
 *
 * Take a silent MP4 produced by the Arapoint video stack and combine it with
 * a brand-voiced AI narration into a final MP4 with synchronized audio.
 *
 * Brand voice (locked, May 2026): OpenAI "shimmer" via gpt-4o-mini-tts.
 *   - Series consistency: Videos 1-10 all use this voice.
 *   - Earlier prototypes used ElevenLabs Matilda; that path is still selectable
 *     via --provider elevenlabs but is no longer the default because the
 *     series-wide quota was exhausted mid-series.
 *
 * Auth:
 *   - openai     : AI_INTEGRATIONS_OPENAI_API_KEY (Replit OpenAI integration)
 *                  AI_INTEGRATIONS_OPENAI_BASE_URL is honored if set.
 *   - elevenlabs : Replit ElevenLabs connector (no manual key needed).
 *
 * Usage:
 *   node scripts/render-with-narration.mjs \
 *     --script videos/scripts/04-civic.txt \
 *     --video  exports/raw/04-civic-silent-trimmed.mp4 \
 *     --out    videos/04-ipe-clearance-and-birth-attestation.mp4
 *
 * Optional flags:
 *   --provider <openai|elevenlabs>  Default: openai
 *   --voice    <name|id>            Override the brand voice (NOT recommended)
 *   --model    <id>                 Provider-specific model
 *                                   (default openai: gpt-4o-mini-tts)
 *                                   (default elevenlabs: eleven_multilingual_v2)
 *   --keep-temp                     Preserve the intermediate audio file
 *
 * Behavior:
 *   - If audio length <= video length: audio plays once and fades out near video end.
 *   - If audio length >  video length: video is extended by holding the last frame and
 *     fading to navy black; audio finishes naturally before the final fade-out.
 */

import { promises as fs } from 'node:fs';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Brand voice — locked. See file header for context.
const BRAND_PROVIDER = 'openai';
const OPENAI_BRAND_VOICE = 'shimmer';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini-tts';
const ELEVENLABS_BRAND_VOICE = 'XrExE9yKIg1WjnnlVkGX'; // Matilda — legacy fallback
const ELEVENLABS_DEFAULT_MODEL = 'eleven_multilingual_v2';

// ---------- arg parsing ----------
function parseArgs(argv) {
  const out = { provider: BRAND_PROVIDER, keepTemp: false };
  const valueFlags = new Set(['--script', '--video', '--out', '--voice', '--voice-id', '--model', '--provider']);
  const boolFlags = new Set(['--keep-temp', '-h', '--help']);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (valueFlags.has(a)) {
      const v = argv[i + 1];
      if (v == null || v.startsWith('--')) {
        throw new Error(`Flag ${a} requires a value`);
      }
      i++;
      if (a === '--script') out.script = v;
      else if (a === '--video') out.video = v;
      else if (a === '--out') out.out = v;
      else if (a === '--voice' || a === '--voice-id') out.voice = v;
      else if (a === '--model') out.model = v;
      else if (a === '--provider') out.provider = v.toLowerCase();
    } else if (boolFlags.has(a)) {
      if (a === '--keep-temp') out.keepTemp = true;
      else if (a === '-h' || a === '--help') out.help = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  // Resolve provider-specific defaults after parse so explicit overrides win.
  if (out.provider === 'openai') {
    out.voice = out.voice || OPENAI_BRAND_VOICE;
    out.model = out.model || OPENAI_DEFAULT_MODEL;
  } else if (out.provider === 'elevenlabs') {
    out.voice = out.voice || ELEVENLABS_BRAND_VOICE;
    out.model = out.model || ELEVENLABS_DEFAULT_MODEL;
  } else if (!out.help) {
    throw new Error(`Unknown provider: ${out.provider} (expected openai or elevenlabs)`);
  }
  return out;
}

function printUsageAndExit(code = 0) {
  console.log(`
Arapoint narration renderer

Required:
  --script <textfile>   Plain-text narration script (the words to speak)
  --video  <mp4>        Silent MP4 produced by the video stack
  --out    <mp4>        Output path (e.g. videos/04-ipe-clearance-and-birth-attestation.mp4)

Optional:
  --provider <name>     openai (default) | elevenlabs
  --voice <id>          Override brand voice
                        (openai default: ${OPENAI_BRAND_VOICE})
                        (elevenlabs default: ${ELEVENLABS_BRAND_VOICE} -- Matilda)
  --model <id>          (openai default: ${OPENAI_DEFAULT_MODEL})
                        (elevenlabs default: ${ELEVENLABS_DEFAULT_MODEL})
  --keep-temp           Preserve the intermediate audio file
  -h, --help            Show this help
`);
  process.exit(code);
}

// ---------- subprocess helpers ----------
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: opts.stdio || ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    if (p.stdout) p.stdout.on('data', (d) => (stdout += d.toString()));
    if (p.stderr) p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}\n${stderr || stdout}`));
    });
  });
}

async function probeDurationSeconds(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const v = parseFloat(stdout.trim());
  if (!Number.isFinite(v)) throw new Error(`ffprobe could not read duration of ${file}`);
  return v;
}

// ---------- TTS providers ----------
async function synthesizeOpenAI({ scriptText, voice, model, outPath }) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_INTEGRATIONS_OPENAI_API_KEY is not set. Use the Replit OpenAI integration.');
  }
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;

  // Use the openai SDK that's already a project dependency.
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey, baseURL });

  console.log(`[tts] provider=openai voice=${voice} model=${model} chars=${scriptText.length}`);

  const speech = await client.audio.speech.create({
    model,
    voice,
    input: scriptText,
    response_format: 'mp3',
  });

  const arrayBuf = await speech.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  await fs.writeFile(outPath, buf);
  console.log(`[tts] wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function synthesizeElevenLabs({ scriptText, voice, model, outPath }) {
  const { ReplitConnectors } = await import('@replit/connectors-sdk');
  const connectors = new ReplitConnectors();

  console.log(`[tts] provider=elevenlabs voice=${voice} model=${model} chars=${scriptText.length}`);

  const response = await connectors.proxy(
    'elevenlabs',
    `/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: scriptText,
        model_id: model,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${err.slice(0, 500)}`);
  }

  const arrayBuf = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  await fs.writeFile(outPath, buf);
  console.log(`[tts] wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.script || !args.video || !args.out) {
    printUsageAndExit(args.help ? 0 : 1);
  }

  const scriptPath = path.resolve(args.script);
  const videoPath = path.resolve(args.video);
  const outPath = path.resolve(args.out);

  if (!existsSync(scriptPath)) throw new Error(`Script not found: ${scriptPath}`);
  if (!existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);

  const scriptText = (await fs.readFile(scriptPath, 'utf8')).trim();
  if (!scriptText) throw new Error(`Script file is empty: ${scriptPath}`);

  mkdirSync(path.dirname(outPath), { recursive: true });

  // 1. Synthesize narration to a temp mp3
  const tmpDir = path.join(os.tmpdir(), `arapoint-narration-${randomUUID()}`);
  mkdirSync(tmpDir, { recursive: true });
  const audioPath = path.join(tmpDir, 'narration.mp3');

  try {
    if (args.provider === 'openai') {
      await synthesizeOpenAI({
        scriptText,
        voice: args.voice,
        model: args.model,
        outPath: audioPath,
      });
    } else {
      await synthesizeElevenLabs({
        scriptText,
        voice: args.voice,
        model: args.model,
        outPath: audioPath,
      });
    }

    // 2. Probe durations
    const videoDur = await probeDurationSeconds(videoPath);
    const audioDur = await probeDurationSeconds(audioPath);
    console.log(`[probe] video=${videoDur.toFixed(2)}s  audio=${audioDur.toFixed(2)}s`);

    // 3. Mux with ffmpeg.
    //    If audio is longer than video, extend the video by holding the last frame
    //    (tpad) so the narration can finish; audio fades out gracefully near its end.
    //    If audio is shorter, use video as-is and fade audio out shortly before its end.
    const padTail = audioDur > videoDur ? Math.ceil((audioDur - videoDur) + 1.5) : 0;
    const finalDuration = Math.max(videoDur, audioDur) + (padTail > 0 ? 0.5 : 0);

    const audioFadeOutDur = Math.min(1.2, audioDur);
    const audioFadeOutStart = Math.max(0, audioDur - audioFadeOutDur);

    const videoFilter = padTail > 0
      ? `tpad=stop_mode=clone:stop_duration=${padTail},fade=t=out:st=${(finalDuration - 1.0).toFixed(2)}:d=1.0`
      : `null`;
    const audioFilter = `afade=t=out:st=${audioFadeOutStart.toFixed(2)}:d=${audioFadeOutDur.toFixed(2)}`;

    // Set explicit output duration so the file always reflects max(video, audio).
    const ffArgs = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-filter_complex',
      `[0:v]${videoFilter}[v];[1:a]${audioFilter}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-ac', '2',
      '-t', finalDuration.toFixed(3),
      '-movflags', '+faststart',
      outPath,
    ];

    console.log(`[ffmpeg] muxing -> ${outPath}`);
    await run('ffmpeg', ffArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
    const stat = await fs.stat(outPath);
    console.log(`[done] ${outPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  } finally {
    if (!args.keepTemp) {
      try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
    } else {
      console.log(`[keep-temp] preserved ${tmpDir}`);
    }
  }
}

main().catch((err) => {
  console.error('[render-with-narration] FAILED:', err.message);
  process.exit(1);
});
