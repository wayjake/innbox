/**
 * 📤 SMTP2GO Email Sending
 *
 * Alternative email provider with a clean API.
 * Get your API key at: https://app.smtp2go.com/settings/api_keys/
 *
 *    ╔══════════════════════════════════════╗
 *    ║  Provider #2 in our email toolkit    ║
 *    ║  Same goal, different postman        ║
 *    ╚══════════════════════════════════════╝
 */

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';

interface Recipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  from: Recipient;
  to: Recipient[];
  cc?: Recipient[];
  bcc?: Recipient[];
  subject: string;
  textContent?: string;
  htmlContent?: string;
  replyTo?: Recipient;
  headers?: Record<string, string>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format a recipient for SMTP2GO's expected format
 * SMTP2GO wants: "Name <email>" or just "email"
 */
function formatRecipient(recipient: Recipient): string {
  if (recipient.name) {
    return `${recipient.name} <${recipient.email}>`;
  }
  return recipient.email;
}

/**
 * Send email via SMTP2GO
 *
 * API docs: https://apidoc.smtp2go.com/documentation/#/POST/email/send
 */
export async function sendViaSmtp2go(
  options: SendEmailOptions,
  apiKey: string
): Promise<SendEmailResult> {
  try {
    // Build custom headers array for SMTP2GO format
    const customHeaders: Array<{ header: string; value: string }> = [];
    if (options.headers) {
      for (const [header, value] of Object.entries(options.headers)) {
        customHeaders.push({ header, value });
      }
    }

    const body: Record<string, unknown> = {
      api_key: apiKey,
      sender: formatRecipient(options.from),
      to: options.to.map(formatRecipient),
      subject: options.subject,
    };

    if (options.cc?.length) {
      body.cc = options.cc.map(formatRecipient);
    }

    if (options.bcc?.length) {
      body.bcc = options.bcc.map(formatRecipient);
    }

    if (options.textContent) {
      body.text_body = options.textContent;
    }

    if (options.htmlContent) {
      body.html_body = options.htmlContent;
    }

    if (customHeaders.length > 0) {
      body.custom_headers = customHeaders;
    }

    const response = await fetch(SMTP2GO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    // SMTP2GO returns { data: { succeeded: 1, failed: 0, ... } } on success
    if (result.data?.succeeded > 0) {
      return {
        success: true,
        messageId: result.data?.email_id,
      };
    }

    // Error case
    console.error('SMTP2GO API error:', result);
    return {
      success: false,
      error: result.data?.error || 'Failed to send email via SMTP2GO',
    };
  } catch (error) {
    console.error('Failed to send email via SMTP2GO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
