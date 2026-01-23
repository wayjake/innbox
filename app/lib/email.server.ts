/**
 * 📤 Email Sending - Provider Abstraction Layer
 *
 * Supports multiple email providers with database-configurable switching.
 * Currently supported: Brevo, SMTP2GO
 *
 *    ┌─────────────────────────────────────────────┐
 *    │  sendEmail()                                │
 *    │      ↓                                      │
 *    │  getSmtpConfig()                            │
 *    │      ├── Check database settings            │
 *    │      └── Fall back to env vars              │
 *    │      ↓                                      │
 *    │  Route to provider                          │
 *    │      ├── smtp2go → sendViaSmtp2go()        │
 *    │      └── brevo   → sendViaBrevo()          │
 *    └─────────────────────────────────────────────┘
 */

import { db } from './db.server';
import { settings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sendViaSmtp2go } from './smtp2go.server';

// ============================================
// TYPES
// ============================================

interface SendEmailOptions {
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  cc?: Array<{
    email: string;
    name?: string;
  }>;
  bcc?: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  replyTo?: {
    email: string;
    name?: string;
  };
  headers?: Record<string, string>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type SmtpProvider = 'brevo' | 'smtp2go';

interface SmtpConfig {
  provider: SmtpProvider;
  apiKey: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get SMTP configuration from database settings or environment variables
 *
 * Priority:
 * 1. Database settings (smtp_provider + smtp_api_key)
 * 2. Environment variables (SMTP2GO_API_KEY or BREVO_API_KEY)
 */
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  // First, check database settings
  const [providerSetting, apiKeySetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'smtp_provider')).get(),
    db.select().from(settings).where(eq(settings.key, 'smtp_api_key')).get(),
  ]);

  if (providerSetting?.value && apiKeySetting?.value) {
    return {
      provider: providerSetting.value as SmtpProvider,
      apiKey: apiKeySetting.value,
    };
  }

  // Fall back to environment variables
  if (process.env.SMTP2GO_API_KEY) {
    return {
      provider: 'smtp2go',
      apiKey: process.env.SMTP2GO_API_KEY,
    };
  }

  if (process.env.BREVO_API_KEY) {
    return {
      provider: 'brevo',
      apiKey: process.env.BREVO_API_KEY,
    };
  }

  return null;
}

// ============================================
// BREVO IMPLEMENTATION
// ============================================

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendViaBrevo(
  options: SendEmailOptions,
  apiKey: string
): Promise<SendEmailResult> {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: options.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        textContent: options.textContent,
        htmlContent: options.htmlContent,
        replyTo: options.replyTo,
        headers: options.headers,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Brevo API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Send an email using the configured provider
 *
 * Automatically routes to the correct provider based on
 * database settings or environment variables.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = await getSmtpConfig();

  if (!config) {
    console.error('No SMTP provider configured');
    return { success: false, error: 'Email sending not configured' };
  }

  if (config.provider === 'smtp2go') {
    return sendViaSmtp2go(options, config.apiKey);
  }

  return sendViaBrevo(options, config.apiKey);
}

// ============================================
// SETTINGS HELPERS
// ============================================

/**
 * Get current SMTP settings for display (masks API key)
 */
export async function getSmtpSettings(): Promise<{
  provider: SmtpProvider | null;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  source: 'database' | 'env' | 'none';
}> {
  // Check database first
  const [providerSetting, apiKeySetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'smtp_provider')).get(),
    db.select().from(settings).where(eq(settings.key, 'smtp_api_key')).get(),
  ]);

  if (providerSetting?.value && apiKeySetting?.value) {
    const key = apiKeySetting.value;
    return {
      provider: providerSetting.value as SmtpProvider,
      hasApiKey: true,
      apiKeyPreview: key.length > 8 ? `...${key.slice(-4)}` : '****',
      source: 'database',
    };
  }

  // Check env vars
  if (process.env.SMTP2GO_API_KEY) {
    const key = process.env.SMTP2GO_API_KEY;
    return {
      provider: 'smtp2go',
      hasApiKey: true,
      apiKeyPreview: key.length > 8 ? `...${key.slice(-4)}` : '****',
      source: 'env',
    };
  }

  if (process.env.BREVO_API_KEY) {
    const key = process.env.BREVO_API_KEY;
    return {
      provider: 'brevo',
      hasApiKey: true,
      apiKeyPreview: key.length > 8 ? `...${key.slice(-4)}` : '****',
      source: 'env',
    };
  }

  return {
    provider: null,
    hasApiKey: false,
    apiKeyPreview: null,
    source: 'none',
  };
}

/**
 * Update SMTP settings in database
 */
export async function updateSmtpSettings(
  provider: SmtpProvider,
  apiKey: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Upsert provider setting
  await db
    .insert(settings)
    .values({
      key: 'smtp_provider',
      value: provider,
      updatedAt: now,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: provider,
        updatedAt: now,
        updatedBy: userId,
      },
    });

  // Upsert API key setting
  await db
    .insert(settings)
    .values({
      key: 'smtp_api_key',
      value: apiKey,
      updatedAt: now,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: apiKey,
        updatedAt: now,
        updatedBy: userId,
      },
    });
}

/**
 * Test SMTP connection by sending a test email
 */
export async function testSmtpConnection(
  provider: SmtpProvider,
  apiKey: string,
  testEmail: string
): Promise<SendEmailResult> {
  const systemEmail = process.env.SYSTEM_EMAIL_ADDRESS || 'hello@innbox.dev';
  const systemName = process.env.SYSTEM_EMAIL_NAME || 'innbox';

  const options: SendEmailOptions = {
    from: { email: systemEmail, name: systemName },
    to: [{ email: testEmail }],
    subject: 'innbox SMTP Test',
    textContent: `This is a test email from innbox to verify your ${provider} configuration is working correctly.`,
    htmlContent: `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; padding: 20px;">
  <h2>SMTP Test Successful!</h2>
  <p>Your <strong>${provider}</strong> configuration is working correctly.</p>
  <p style="color: #666; font-size: 14px;">- innbox</p>
</body>
</html>
    `.trim(),
  };

  if (provider === 'smtp2go') {
    return sendViaSmtp2go(options, apiKey);
  }

  return sendViaBrevo(options, apiKey);
}
