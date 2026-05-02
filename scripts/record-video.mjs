#!/usr/bin/env node
/**
 * record-video.mjs
 *
 * Headless screen-record the Arapoint video composition into a silent MP4
 * using real-time CDP screencast. Puppeteer launches Chromium headed at a
 * fixed 1920x1080 viewport, opens the running Vite dev server, and uses
 * Chrome DevTools Protocol's Page.startScreencast to stream JPEG frames
 * straight into ffmpeg (mjpeg pipe -> libx264). Each frame is acked in a
 * `finally` block so a transient processing error never stalls Chromium's
 * screencast queue. Animations run on the browser's real Date.now() /
 * performance.now() / requestAnimationFrame; ffmpeg honors each frame's
 * wall-clock arrival timestamp via -use_wallclock_as_timestamps and the
 * fps=N filter pads the stream up to the requested output fps when raw
 * capture lags. Output duration ~= on-page animation playback duration.
 *
 * Usage:
 *   node scripts/record-video.mjs --out exports/raw/01-welcome-silent.mp4
 *
 * Optional:
 *   --url <url>         Dev server URL (default http://localhost:3001/)
 *   --max-seconds <n>   Hard cap on capture wall-clock duration (default 130)
 *   --width <px>        Capture width (default 1920)
 *   --height <px>       Capture height (default 1080)
 *   --fps <n>           Output fps -- ffmpeg pads up to this (default 30)
 *   --warmup-ms <n>     Wall-clock ms to wait after page load before
 *                       starting capture (default 1500)
 *
 * Exit conditions (whichever comes first):
 *   - The page calls window.stopRecording() (set by useVideoPlayer hook
 *     after the first complete pass through SCENE_DURATIONS).
 *   - --max-seconds wall-clock elapses.
 */

import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {
    url: 'http://localhost:3001/',
    maxSeconds: 130,
    width: 1920,
    height: 1080,
    fps: 30,
    warmupMs: 1500,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const need = (k) => {
      const v = argv[++i];
      if (v == null || v.startsWith('--')) throw new Error(`Flag ${k} requires a value`);
      return v;
    };
    if (a === '--out') out.out = need(a);
    else if (a === '--url') out.url = need(a);
    else if (a === '--max-seconds') out.maxSeconds = parseFloat(need(a));
    else if (a === '--width') out.width = parseInt(need(a), 10);
    else if (a === '--height') out.height = parseInt(need(a), 10);
    else if (a === '--fps') out.fps = parseInt(need(a), 10);
    else if (a === '--warmup-ms') out.warmupMs = parseInt(need(a), 10);
    else if (a === '-h' || a === '--help') out.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

function findChromiumExecutable() {
  if (process.env.CHROMIUM_BIN && existsSync(process.env.CHROMIUM_BIN)) {
    return process.env.CHROMIUM_BIN;
  }
  for (const c of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try {
      const p = execSync(`which ${c}`, { encoding: 'utf8' }).trim();
      if (p) return p;
    } catch {}
  }
  return undefined; // let puppeteer use its bundled chromium
}

async function waitForPageReady(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ready = await page.evaluate(() => {
        return Boolean(document.querySelector('[data-video-root], video, canvas, [class*="absolute"]'))
          && document.body.children.length > 0
          && document.fonts && document.fonts.status === 'loaded';
      });
      if (ready) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.out) {
    console.log(`
Arapoint silent-MP4 recorder

Required:
  --out <mp4>          Output silent MP4 path

Optional:
  --url <url>          Default: http://localhost:3001/
  --max-seconds <n>    Default: 130
  --width <px>         Default: 1920
  --height <px>        Default: 1080
  --fps <n>            Default: 30
  --warmup-ms <n>      Default: 1500
`);
    process.exit(args.help ? 0 : 1);
  }

  const outPath = path.resolve(args.out);
  mkdirSync(path.dirname(outPath), { recursive: true });

  const exe = findChromiumExecutable();
  console.log(`[record] chromium=${exe || '(puppeteer bundled)'}`);
  console.log(`[record] url=${args.url}  out=${outPath}`);
  console.log(`[record] viewport=${args.width}x${args.height}  fps=${args.fps}  maxSeconds=${args.maxSeconds}`);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu-sandbox',
      '--use-gl=swiftshader',
      '--disable-web-security',
      '--font-render-hinting=none',
      `--window-size=${args.width},${args.height}`,
    ],
    defaultViewport: { width: args.width, height: args.height, deviceScaleFactor: 1 },
    protocolTimeout: 600_000,
  });

  let captured = 0;
  let stoppedByPage = false;
  let ffmpeg;
  let exitCode = 1;

  try {
    const page = await browser.newPage();

    // Surface page console errors for debugging.
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning') console.log(`[page-${t}]`, msg.text());
    });
    page.on('pageerror', (err) => console.log('[page-error]', err.message));

    // Install our hooks BEFORE any page script runs. Wrap any pre-existing
    // window.startRecording / stopRecording so the React hook still works.
    await page.evaluateOnNewDocument(() => {
      const w = /** @type {any} */ (window);
      w.__videoStarted = false;
      w.__videoStopped = false;
      const realStart = w.startRecording;
      const realStop = w.stopRecording;
      w.startRecording = () => { w.__videoStarted = true; try { realStart && realStart(); } catch {} };
      w.stopRecording  = () => { w.__videoStopped = true; try { realStop  && realStop();  } catch {} };
    });

    console.log('[record] navigating...');
    await page.goto(args.url, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('[record] navigation complete, waiting for ready...');
    const ready = await waitForPageReady(page);
    console.log(`[record] page ready=${ready}, warmup ${args.warmupMs}ms...`);
    // Wall-clock warmup (fonts settle, video-bg buffers, React mounts).
    await new Promise((r) => setTimeout(r, args.warmupMs));
    console.log('[record] warmup complete, beginning capture loop');

    // Push-based capture via CDP screencast (real-time, NOT virtual-time).
    // Chromium streams JPEG frames as fast as the compositor produces them;
    // we ack each frame to keep the queue moving and write the bytes
    // straight to ffmpeg. Animations run on the browser's real clock and
    // ffmpeg honors each frame's wall-clock arrival timestamp via
    // -use_wallclock_as_timestamps so playback timing tracks the on-page
    // animation timing even if capture stutters. The fps=N filter pads the
    // stream up to the requested output fps when raw capture lags.
    const cdp = await page.target().createCDPSession();
    const maxFrames = Math.ceil(args.maxSeconds * args.fps);
    const startWall = Date.now();
    const maxWallMs = args.maxSeconds * 1000;

    ffmpeg = spawn('ffmpeg', [
      '-y',
      '-use_wallclock_as_timestamps', '1',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-i', 'pipe:0',
      '-vf', `fps=${args.fps}`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outPath,
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let ffStderr = '';
    ffmpeg.stderr.on('data', (d) => { ffStderr += d.toString(); });
    ffmpeg.stdout.on('data', () => {});
    ffmpeg.stdin.on('error', (e) => { console.log('[ffmpeg.stdin error]', e.code || e.message); });

    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else { console.error(ffStderr.split('\n').slice(-30).join('\n')); reject(new Error(`ffmpeg exited ${code}`)); }
      });
      ffmpeg.on('error', reject);
    });

    let captureDone = false;
    const captureFinished = new Promise((resolve) => {
      cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
        // Always ACK -- if we skip the ack on early-stop or processing error
        // Chromium's screencast queue stalls and the next frames never arrive.
        try {
          if (!captureDone) {
            const buf = Buffer.from(data, 'base64');
            const ok = ffmpeg.stdin.write(buf);
            if (!ok) await new Promise((r) => ffmpeg.stdin.once('drain', r));
            captured++;
            if (captured % args.fps === 0) {
              const wallSec = ((Date.now() - startWall) / 1000).toFixed(1);
              process.stdout.write(`\r[record] frame ${captured}/${maxFrames}  wall=${wallSec}s   `);
            }
          }
        } catch (e) {
          console.log('[screencast frame error]', e.message);
        } finally {
          try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
        }
      });

      const stopChecker = setInterval(async () => {
        try {
          const stopped = await page.evaluate(() => /** @type {any} */ (window).__videoStopped === true);
          const wallElapsed = Date.now() - startWall;
          if (stopped || wallElapsed >= maxWallMs) {
            stoppedByPage = stopped;
            captureDone = true;
            clearInterval(stopChecker);
            resolve();
          }
        } catch {}
      }, 250);
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 85,
      everyNthFrame: 1,
      maxWidth: args.width,
      maxHeight: args.height,
    });

    await captureFinished;
    try { await cdp.send('Page.stopScreencast'); } catch {}
    process.stdout.write('\n');

    ffmpeg.stdin.end();
    await ffmpegDone;

    const sz = statSync(outPath).size;
    console.log(`[record] frames=${captured}  stoppedByPage=${stoppedByPage}  size=${(sz / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[done] ${outPath}`);
    exitCode = 0;
  } catch (err) {
    console.error('[record-video] FAILED:', err.message);
    if (ffmpeg) try { ffmpeg.kill('SIGKILL'); } catch {}
  } finally {
    try { await browser.close(); } catch {}
    process.exit(exitCode);
  }
}

main();
