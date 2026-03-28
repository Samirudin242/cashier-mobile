import Constants from 'expo-constants';

/**
 * Optional: set EXPO_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL (and optional EXPO_PUBLIC_GOOGLE_SHEETS_SECRET)
 * in a root .env file, or add googleSheetsWebhookUrl / googleSheetsSecret under expo.extra in app.json.
 */
function getExtra(): Record<string, unknown> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
}

export function getGoogleSheetsWebhookUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const ex = getExtra().googleSheetsWebhookUrl;
  if (typeof ex === 'string' && ex.trim()) return ex.trim();
  return '';
}

export function getGoogleSheetsSecret(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_SHEETS_SECRET;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const ex = getExtra().googleSheetsSecret;
  if (typeof ex === 'string' && ex.trim()) return ex.trim();
  return '';
}

export function isGoogleSheetsConfigured(): boolean {
  return getGoogleSheetsWebhookUrl().length > 0;
}
