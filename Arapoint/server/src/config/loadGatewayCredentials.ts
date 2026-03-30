import { db } from './database';
import { adminSettings } from '../db/schema';

const ENV_MAPPING: Record<string, string> = {
  paystack_secret_key: 'PAYSTACK_SECRET_KEY',
  paystack_public_key: 'PAYSTACK_PUBLIC_KEY',
  palmpay_app_id: 'PALMPAY_APP_ID',
  palmpay_private_key: 'PALMPAY_PRIVATE_KEY',
  palmpay_public_key: 'PALMPAY_PUBLIC_KEY',
  payvessel_api_key: 'PAYVESSEL_API_KEY',
  payvessel_secret_key: 'PAYVESSEL_SECRET_KEY',
  payvessel_business_id: 'PAYVESSEL_BUSINESS_ID',
  paymentpoint_api_key: 'PAYMENTPOINT_API_KEY',
  paymentpoint_secret_key: 'PAYMENTPOINT_SECRET_KEY',
  paymentpoint_merchant_id: 'PAYMENTPOINT_MERCHANT_ID',
  vtpass_api_key: 'VTPASS_API_KEY',
  vtpass_secret_key: 'VTPASS_SECRET_KEY',
  vtpass_public_key: 'VTPASS_PUBLIC_KEY',
  vtpass_sandbox: 'VTPASS_SANDBOX',
  youverify_api_key: 'YOUVERIFY_API_KEY',
  youverify_sandbox: 'YOUVERIFY_SANDBOX',
  prembly_secret_key: 'PREMBLY_SECRET_KEY',
  prembly_public_key: 'PREMBLY_PUBLIC_KEY',
};

export async function loadGatewayCredentials(): Promise<void> {
  const settingsList = await db.select().from(adminSettings);
  console.log(`[GatewayCredentials] Found ${settingsList.length} admin setting(s) in database`);
  let loaded = 0;

  for (const setting of settingsList) {
    const envKey = ENV_MAPPING[setting.settingKey];
    if (envKey && setting.settingValue) {
      process.env[envKey] = setting.settingValue;
      loaded++;
    }
  }

  console.log(`[GatewayCredentials] Loaded ${loaded} credential(s) into environment`);
}
