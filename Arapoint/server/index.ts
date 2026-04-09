import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedPricing } from "./src/db/seed-pricing";
import { seedAdmin } from "./src/db/seed-admin";
import { loadGatewayCredentials } from "./src/config/loadGatewayCredentials";
import { rpaBot } from "./src/rpa/bot";
import { cacheService } from "./src/services/cacheService";

// ── Process-level crash guards ─────────────────────────────────────────────────
// Prevents a single unhandled error from taking down the entire server process.
process.on('uncaughtException', (err: Error) => {
  console.error('[Process] Uncaught exception (server stays up):', err.message, err.stack);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[Process] Unhandled promise rejection (server stays up):', reason);
});

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── Subdomain → path redirect ──────────────────────────────────────────────────
// developer.arapoint.com.ng/anything  →  arapoint.com.ng/developer/anything
// This lets the single-page app handle all developer portal routes normally.
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host === 'developer.arapoint.com.ng' || host.startsWith('developer.arapoint.com.ng:')) {
    const subPath = req.path === '/' ? '' : req.path;
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `https://arapoint.com.ng/developer${subPath}${qs}`);
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Compress all responses except already-compressed media
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
}));

// Keep-alive endpoint — prevents Replit container from sleeping under low traffic
app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await seedPricing().catch(err => console.log('Pricing seed skipped:', err.message));
  await seedAdmin().catch(err => console.log('Admin seed skipped:', err.message));
  await loadGatewayCredentials().catch(err => console.log('Gateway credentials load skipped:', err.message));
  await cacheService.ensureInit().catch(err => console.log('Cache service init skipped:', err.message));
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    // Log the error but do NOT re-throw — re-throwing after a response is sent
    // triggers an uncaughtException that can crash the process under load.
    console.error(`[Express] ${status} error on ${_req.method} ${_req.path}:`, err.message);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // In production the RPA Worker is not a separate process, so start the bot inline.
      // Defer by 60 s so Chromium browser pool initialisation does not compete with
      // cold-start web traffic — browser launch can take 30 s+ per instance.
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_EMBEDDED_RPA === 'true') {
        const rpaDelay = parseInt(process.env.RPA_START_DELAY_MS || '60000', 10);
        setTimeout(() => {
          rpaBot.start().catch((err: Error) => {
            console.error('[RPA Bot] Failed to start:', err.message);
          });
        }, rpaDelay);
        log(`RPA bot will start in ${rpaDelay / 1000}s (after server warm-up)`);
      }

      // Recover any unified requests that got stuck before the finalizer was deployed
      setTimeout(() => {
        import('./src/services/unifiedFinalizer').then(({ recoverStuckUnifiedRequests }) => {
          recoverStuckUnifiedRequests().catch((e: any) =>
            console.error('[Unified Recovery] failed:', e.message),
          );
        }).catch(() => {});
      }, 5000);

      // Self-ping every 3 minutes via the public URL to keep Autoscale from sleeping
      if (process.env.NODE_ENV === 'production') {
        const siteUrl = (process.env.SITE_URL || 'https://arapoint.com.ng').replace(/\/$/, '');
        const pingUrl = `${siteUrl}/api/ping`;
        const doPing = () => {
          import('https').then(({ default: https }) => {
            https.get(pingUrl, (r) => r.resume()).on('error', () => {});
          }).catch(() => {});
        };
        setInterval(doPing, 3 * 60 * 1000);
      }
    },
  );
})();
