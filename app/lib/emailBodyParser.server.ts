/**
 * 🪄 Email Body Parser
 *
 * "Separating the wheat from the chaff, the fresh reply from
 *  the endless scroll of 'On Monday, Bob wrote:' chains..."
 *
 *   ┌────────────────────────────────────────────┐
 *   │  Fresh content ✨                          │
 *   │  "Sounds good, let's do it!"               │
 *   ├────────────────────────────────────────────┤
 *   │  ~~~ quoted content hidden ~~~             │
 *   │  > On Mon, Alice wrote:                    │
 *   │  > > On Sun, Bob wrote:                    │
 *   │  > > > On Sat, Carol wrote: (turtles all   │
 *   │  > > > the way down...)                    │
 *   └────────────────────────────────────────────┘
 *
 * The goal: show only what's new in each message.
 */

/**
 * Strips quoted content from plain text email bodies.
 *
 * Handles common patterns:
 * - Lines starting with ">" (traditional quotes)
 * - "On [date], [person] wrote:" headers
 * - Outlook-style "From: ... Sent: ... To: ..." blocks
 * - "---------- Forwarded message ----------"
 * - Various email client dividers
 */
export function stripQuotedText(text: string | null): string {
  if (!text) return '';

  const lines = text.split('\n');
  const cleanLines: string[] = [];
  let inQuoteBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if we're hitting a quote block start
    if (isQuoteBlockStart(trimmed, lines, i)) {
      inQuoteBlock = true;
      continue;
    }

    // Skip lines that are clearly quotes
    if (inQuoteBlock || isQuotedLine(line)) {
      continue;
    }

    cleanLines.push(line);
  }

  // Trim trailing whitespace/empty lines
  let result = cleanLines.join('\n');

  // Remove trailing signature markers and whitespace
  result = result.replace(/\n--\s*\n.*$/s, '\n').trimEnd();

  return result || text; // Fallback to original if we stripped everything
}

/**
 * Checks if a line starts a quoted block
 */
function isQuoteBlockStart(
  trimmed: string,
  allLines: string[],
  index: number
): boolean {
  // "On [date], [name] wrote:" pattern (Gmail, etc.)
  // Matches: "On Mon, Jan 1, 2025 at 10:00 AM Alice <alice@example.com> wrote:"
  if (/^On .+ wrote:$/i.test(trimmed)) {
    return true;
  }

  // "---------- Forwarded message ----------"
  if (/-{5,}\s*Forwarded message\s*-{5,}/i.test(trimmed)) {
    return true;
  }

  // "---------- Original Message ----------"
  if (/-{5,}\s*Original Message\s*-{5,}/i.test(trimmed)) {
    return true;
  }

  // Outlook-style: check for "From:" followed by "Sent:" and "To:" in next lines
  if (/^From:/.test(trimmed)) {
    const nextLines = allLines.slice(index + 1, index + 4).map((l) => l.trim());
    const hasSent = nextLines.some((l) => /^Sent:/.test(l));
    const hasTo = nextLines.some((l) => /^To:/.test(l));
    if (hasSent && hasTo) {
      return true;
    }
  }

  // Underscore dividers (often 10+ chars)
  if (/^_{10,}$/.test(trimmed)) {
    return true;
  }

  // Apple Mail style: "Begin forwarded message:"
  if (/^Begin forwarded message:$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Checks if a single line is quoted content
 */
function isQuotedLine(line: string): boolean {
  const trimmed = line.trim();

  // Traditional quote marker: starts with >
  if (/^>/.test(trimmed)) {
    return true;
  }

  // Outlook reply headers we might have missed
  if (/^(From|Sent|To|Subject):\s+/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Strips quoted content from HTML email bodies.
 *
 * Removes:
 * - <blockquote> elements
 * - Gmail's .gmail_quote divs
 * - Outlook's various quote containers
 * - Thunderbird's .moz-cite-prefix
 */
export function stripQuotedHtml(html: string | null): string {
  if (!html) return '';

  // We'll use regex since we're server-side (no DOM by default)
  // This is a "good enough" approach - email HTML is notoriously messy
  let clean = html;

  // Remove <blockquote> elements (standard quote)
  clean = clean.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');

  // Remove Gmail quote divs
  clean = clean.replace(
    /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove Gmail extra containers
  clean = clean.replace(
    /<div[^>]*class="[^"]*gmail_extra[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove Outlook quote divs (#divRplyFwdMsg)
  clean = clean.replace(
    /<div[^>]*id="divRplyFwdMsg"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove Thunderbird quote prefix
  clean = clean.replace(
    /<div[^>]*class="[^"]*moz-cite-prefix[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove Apple Mail forwarded message blocks
  clean = clean.replace(
    /<div[^>]*class="[^"]*AppleOriginalContents[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove "On X wrote:" paragraphs
  clean = clean.replace(/<p[^>]*>\s*On [^<]+ wrote:\s*<\/p>/gi, '');
  clean = clean.replace(/<div[^>]*>\s*On [^<]+ wrote:\s*<\/div>/gi, '');

  // Remove horizontal rules that often precede quotes
  // (only if they appear to be quote dividers)
  clean = clean.replace(/<hr[^>]*>\s*(<blockquote|<div class="gmail)/gi, '');

  // Clean up empty paragraphs and divs left behind
  clean = clean.replace(/<p[^>]*>\s*<\/p>/gi, '');
  clean = clean.replace(/<div[^>]*>\s*<\/div>/gi, '');

  // Remove multiple consecutive <br> tags (often left from quote removal)
  clean = clean.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

  return clean.trim() || html; // Fallback to original if we stripped everything
}

/**
 * Gets a preview snippet from an email body (for collapsed view)
 * Returns the first meaningful line of content
 */
export function getPreviewSnippet(
  text: string | null,
  maxLength: number = 80
): string {
  if (!text) return '';

  // Strip quoted content first
  const clean = stripQuotedText(text);

  // Get first non-empty line
  const lines = clean.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 3) {
      // Skip very short lines
      if (trimmed.length <= maxLength) {
        return trimmed;
      }
      return trimmed.slice(0, maxLength - 3) + '...';
    }
  }

  return '(no preview)';
}
