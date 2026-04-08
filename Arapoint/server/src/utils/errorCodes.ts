/**
 * Machine-readable error codes for the Arapoint API.
 * Clients should use these strings (not HTTP status codes) to handle errors programmatically.
 */
export const ErrorCodes = {
  // ── Authentication & Authorization ─────────────────────────────────────────
  INVALID_CREDENTIALS:       'INVALID_CREDENTIALS',
  UNAUTHORIZED:              'UNAUTHORIZED',
  TOKEN_EXPIRED:             'TOKEN_EXPIRED',
  TOKEN_INVALID:             'TOKEN_INVALID',
  FORBIDDEN:                 'FORBIDDEN',
  INVALID_API_KEY:           'INVALID_API_KEY',
  ACCOUNT_INACTIVE:          'ACCOUNT_INACTIVE',
  ACCOUNT_SUSPENDED:         'ACCOUNT_SUSPENDED',
  EMAIL_NOT_VERIFIED:        'EMAIL_NOT_VERIFIED',
  IP_NOT_ALLOWED:            'IP_NOT_ALLOWED',

  // ── Validation ─────────────────────────────────────────────────────────────
  VALIDATION_ERROR:          'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD:    'MISSING_REQUIRED_FIELD',
  INVALID_PHONE_NUMBER:      'INVALID_PHONE_NUMBER',
  INVALID_AMOUNT:            'INVALID_AMOUNT',
  INVALID_REFERENCE:         'INVALID_REFERENCE',

  // ── Wallet & Payments ──────────────────────────────────────────────────────
  INSUFFICIENT_BALANCE:      'INSUFFICIENT_BALANCE',
  DUPLICATE_PAYMENT:         'DUPLICATE_PAYMENT',
  PAYMENT_FAILED:            'PAYMENT_FAILED',
  WALLET_NOT_FOUND:          'WALLET_NOT_FOUND',
  REFUND_FAILED:             'REFUND_FAILED',

  // ── VTU & Services ────────────────────────────────────────────────────────
  PROVIDER_ERROR:            'PROVIDER_ERROR',
  SERVICE_UNAVAILABLE:       'SERVICE_UNAVAILABLE',
  INVALID_NETWORK:           'INVALID_NETWORK',
  INVALID_METER_NUMBER:      'INVALID_METER_NUMBER',
  INVALID_SMARTCARD_NUMBER:  'INVALID_SMARTCARD_NUMBER',
  INVALID_PLAN:              'INVALID_PLAN',
  TRANSACTION_FAILED:        'TRANSACTION_FAILED',
  ALREADY_PROCESSED:         'ALREADY_PROCESSED',

  // ── Identity & Verification ───────────────────────────────────────────────
  VERIFICATION_FAILED:       'VERIFICATION_FAILED',
  NIN_NOT_FOUND:             'NIN_NOT_FOUND',
  BVN_NOT_FOUND:             'BVN_NOT_FOUND',
  KYC_REQUIRED:              'KYC_REQUIRED',
  KYC_PENDING:               'KYC_PENDING',

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  RATE_LIMIT_EXCEEDED:       'RATE_LIMIT_EXCEEDED',
  BURST_LIMIT_EXCEEDED:      'BURST_LIMIT_EXCEEDED',

  // ── General ───────────────────────────────────────────────────────────────
  NOT_FOUND:                 'NOT_FOUND',
  CONFLICT:                  'CONFLICT',
  INTERNAL_ERROR:            'INTERNAL_ERROR',
  WEBHOOK_NOT_CONFIGURED:    'WEBHOOK_NOT_CONFIGURED',
  IDEMPOTENT_REPLAY:         'IDEMPOTENT_REPLAY',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
