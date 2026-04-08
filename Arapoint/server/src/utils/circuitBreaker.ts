import { logger } from './logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;  // failures before opening
  successThreshold?: number;  // successes in HALF_OPEN before closing
  resetTimeoutMs?: number;    // ms to wait before attempting HALF_OPEN
  requestTimeoutMs?: number;  // ms before individual request times out
  name: string;
}

export interface CircuitStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: string | null;
  nextRetryAt: string | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureAt: Date | null = null;
  private nextRetryAt: Date | null = null;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly requestTimeoutMs: number;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold  = opts.failureThreshold  ?? 5;
    this.successThreshold  = opts.successThreshold  ?? 2;
    this.resetTimeoutMs    = opts.resetTimeoutMs    ?? 60_000;
    this.requestTimeoutMs  = opts.requestTimeoutMs  ?? 30_000;
  }

  get isOpen(): boolean {
    return this.getEffectiveState() === 'OPEN';
  }

  private getEffectiveState(): CircuitState {
    if (this.state === 'OPEN' && this.nextRetryAt && Date.now() >= this.nextRetryAt.getTime()) {
      this.state = 'HALF_OPEN';
      this.successes = 0;
      logger.info(`CircuitBreaker[${this.name}] → HALF_OPEN (probing)`);
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const effectiveState = this.getEffectiveState();

    if (effectiveState === 'OPEN') {
      const openError = new Error(`Circuit breaker OPEN for "${this.name}". Retry after ${this.nextRetryAt?.toISOString()}`);
      (openError as any).circuitOpen = true;
      (openError as any).circuitName = this.name;
      throw openError;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const withTimeout = new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Request to "${this.name}" timed out after ${this.requestTimeoutMs}ms`)),
        this.requestTimeoutMs
      );
    });

    try {
      const result = await Promise.race([fn(), withTimeout]);
      if (timer) clearTimeout(timer);
      this.onSuccess();
      return result as T;
    } catch (err) {
      if (timer) clearTimeout(timer);
      this.onFailure(err as Error);
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        this.nextRetryAt = null;
        logger.info(`CircuitBreaker[${this.name}] → CLOSED (recovered)`);
      }
    }
  }

  private onFailure(err: Error): void {
    this.failures++;
    this.lastFailureAt = new Date();
    logger.warn(`CircuitBreaker[${this.name}] failure #${this.failures}: ${err.message}`);

    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextRetryAt = new Date(Date.now() + this.resetTimeoutMs);
      this.successes = 0;
      logger.error(`CircuitBreaker[${this.name}] → OPEN (retry after ${this.nextRetryAt.toISOString()})`);
    }
  }

  stats(): CircuitStats {
    const effectiveState = this.getEffectiveState();
    return {
      name:          this.name,
      state:         effectiveState,
      failures:      this.failures,
      successes:     this.successes,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
      nextRetryAt:   this.nextRetryAt?.toISOString()   ?? null,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureAt = null;
    this.nextRetryAt = null;
    logger.info(`CircuitBreaker[${this.name}] manually reset`);
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────
// Central registry so health checks and admin endpoints can inspect all breakers

const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker({ name, ...opts }));
  }
  return registry.get(name)!;
}

export function getAllCircuitStats(): CircuitStats[] {
  return Array.from(registry.values()).map(cb => cb.stats());
}

export function resetCircuit(name: string): boolean {
  const cb = registry.get(name);
  if (!cb) return false;
  cb.reset();
  return true;
}

// ── Pre-registered breakers for all external providers ────────────────────────

export const vtpassCircuit        = getCircuitBreaker('vtpass',         { requestTimeoutMs: 60_000, failureThreshold: 4 });
export const youverifyCircuit     = getCircuitBreaker('youverify',      { requestTimeoutMs: 30_000, failureThreshold: 3 });
export const premblyCircuit       = getCircuitBreaker('prembly',        { requestTimeoutMs: 30_000, failureThreshold: 3 });
export const paystackCircuit      = getCircuitBreaker('paystack',       { requestTimeoutMs: 20_000, failureThreshold: 5 });
export const payVesselCircuit     = getCircuitBreaker('payvessel',      { requestTimeoutMs: 20_000, failureThreshold: 5 });
export const paymentPointCircuit  = getCircuitBreaker('paymentpoint',   { requestTimeoutMs: 20_000, failureThreshold: 5 });
export const smtpCircuit          = getCircuitBreaker('smtp',           { requestTimeoutMs: 10_000, failureThreshold: 3, resetTimeoutMs: 120_000 });
