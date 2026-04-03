import crypto from 'crypto';
import { logger } from '../utils/logger';

const PAYSTACK_BASE = 'https://api.paystack.co';

function getSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');
  return key;
}

async function paystackRequest(method: string, path: string, body?: object): Promise<any> {
  const secret = getSecret();
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack error: ${res.status}`);
  }
  return json.data;
}

// ─── Initialize a transaction ─────────────────────────────────────────────────
export async function initializeTransaction(opts: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: object;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  return await paystackRequest('POST', '/transaction/initialize', {
    email: opts.email,
    amount: opts.amountKobo,
    reference: opts.reference,
    callback_url: opts.callbackUrl,
    metadata: opts.metadata || {},
  });
}

// ─── Verify a transaction ─────────────────────────────────────────────────────
export async function verifyTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  reference: string;
  paid_at: string;
  customer: { email: string };
}> {
  return await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
}

// ─── Verify Paystack webhook signature (HMAC-SHA512) ─────────────────────────
export function verifyWebhookSignature(body: string, signature: string): boolean {
  try {
    const secret = getSecret();
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    return hash === signature;
  } catch {
    return false;
  }
}
