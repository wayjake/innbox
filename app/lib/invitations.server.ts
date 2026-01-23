import { db } from './db.server';
import { invitationTokens, inboxMembers, inboxes, users } from '../../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sendEmail } from './brevo.server';
import { hashPassword } from './auth.server';

/**
 * 🎟️ Invitation System
 *
 * Where inbox admins become talent scouts, handing out
 * golden tickets to the email chocolate factory.
 *
 * Token lifecycle:
 * 1. Admin invites email → token created (7-day expiry)
 * 2. Email sent with magic link
 * 3. Invitee clicks link → sets password → becomes member
 * 4. Token marked as accepted (one-time use)
 */

const INVITATION_DURATION_DAYS = 7;

// ============================================
// TOKEN GENERATION & HASHING
// ============================================

function generateInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// INVITATION CREATION
// ============================================

interface CreateInvitationResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function createInvitation(
  inboxId: string,
  email: string,
  invitedBy: string
): Promise<CreateInvitationResult> {
  // Check if user already exists with this email
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (existingUser) {
    // Check if they're already a member of this inbox
    const existingMembership = await db
      .select()
      .from(inboxMembers)
      .where(
        and(
          eq(inboxMembers.inboxId, inboxId),
          eq(inboxMembers.userId, existingUser.id)
        )
      )
      .get();

    if (existingMembership) {
      return { success: false, error: 'User is already a member of this inbox' };
    }
  }

  // Check for pending invitation to this email for this inbox
  const pendingInvite = await db
    .select()
    .from(invitationTokens)
    .where(
      and(
        eq(invitationTokens.inboxId, inboxId),
        eq(invitationTokens.email, email.toLowerCase()),
        isNull(invitationTokens.acceptedAt),
        gt(invitationTokens.expiresAt, new Date().toISOString())
      )
    )
    .get();

  if (pendingInvite) {
    return { success: false, error: 'An invitation is already pending for this email' };
  }

  // Create the invitation
  const token = generateInvitationToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + INVITATION_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.insert(invitationTokens).values({
    inboxId,
    email: email.toLowerCase(),
    invitedBy,
    tokenHash,
    expiresAt,
  });

  return { success: true, token };
}

// ============================================
// INVITATION VALIDATION
// ============================================

interface ValidateInvitationResult {
  valid: boolean;
  invitation?: {
    id: string;
    email: string;
    inboxId: string;
    inboxName: string;
    inboxLocalPart: string;
  };
  error?: string;
}

export async function validateInvitationToken(token: string): Promise<ValidateInvitationResult> {
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const result = await db
    .select({
      invitation: invitationTokens,
      inbox: inboxes,
    })
    .from(invitationTokens)
    .innerJoin(inboxes, eq(invitationTokens.inboxId, inboxes.id))
    .where(
      and(
        eq(invitationTokens.tokenHash, tokenHash),
        gt(invitationTokens.expiresAt, now),
        isNull(invitationTokens.acceptedAt)
      )
    )
    .get();

  if (!result) {
    return { valid: false, error: 'Invalid or expired invitation' };
  }

  return {
    valid: true,
    invitation: {
      id: result.invitation.id,
      email: result.invitation.email,
      inboxId: result.inbox.id,
      inboxName: result.inbox.name || result.inbox.localPart,
      inboxLocalPart: result.inbox.localPart,
    },
  };
}

// ============================================
// INVITATION ACCEPTANCE
// ============================================

interface AcceptInvitationResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function acceptInvitation(
  token: string,
  password: string,
  name?: string
): Promise<AcceptInvitationResult> {
  const validation = await validateInvitationToken(token);
  if (!validation.valid || !validation.invitation) {
    return { success: false, error: validation.error || 'Invalid invitation' };
  }

  const { invitation } = validation;

  // Check if user already exists (edge case: registered between invite and accept)
  let existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, invitation.email))
    .get();

  let userId: string;

  if (existingUser) {
    // User already exists - just add them as a member
    userId = existingUser.id;
  } else {
    // Create new user with userType='member'
    const passwordHash = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email: invitation.email,
        passwordHash,
        name,
        userType: 'member',
      })
      .returning();
    userId = newUser.id;
  }

  // Add user to inbox as member
  await db.insert(inboxMembers).values({
    inboxId: invitation.inboxId,
    userId,
    role: 'member',
  });

  // Mark invitation as accepted
  await db
    .update(invitationTokens)
    .set({ acceptedAt: new Date().toISOString() })
    .where(eq(invitationTokens.id, invitation.id));

  return { success: true, userId };
}

// ============================================
// INVITATION EMAIL
// ============================================

interface SendInvitationEmailResult {
  success: boolean;
  error?: string;
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  inboxName: string,
  inviterEmail: string
): Promise<SendInvitationEmailResult> {
  const baseUrl = process.env.APP_URL || 'http://localhost:5173';
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const systemEmail = process.env.SYSTEM_EMAIL_ADDRESS || 'hello@innbox.dev';
  const systemName = process.env.SYSTEM_EMAIL_NAME || 'innbox';

  const result = await sendEmail({
    from: {
      email: systemEmail,
      name: systemName,
    },
    to: [{ email }],
    subject: `You've been invited to ${inboxName}@innbox.dev`,
    textContent: `
You've been invited!

${inviterEmail} has invited you to access the inbox "${inboxName}@innbox.dev" on innbox.

Click the link below to set up your account and start receiving emails:

${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

— The innbox team
    `.trim(),
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 24px; font-size: 24px; color: #111827;">You've been invited! 🎉</h1>

    <p style="margin: 0 0 16px; color: #374151;">
      <strong>${inviterEmail}</strong> has invited you to access the inbox:
    </p>

    <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px; text-align: center;">
      <code style="font-size: 18px; color: #111827;">${inboxName}@innbox.dev</code>
    </div>

    <p style="margin: 0 0 24px; color: #374151;">
      Click the button below to set up your account and start receiving emails:
    </p>

    <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Accept Invitation
    </a>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>

  <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af;">
    — The innbox team
  </p>
</body>
</html>
    `.trim(),
  });

  return {
    success: result.success,
    error: result.error,
  };
}

// ============================================
// INBOX MEMBER QUERIES
// ============================================

export async function getInboxMembers(inboxId: string) {
  const members = await db
    .select({
      member: inboxMembers,
      user: users,
    })
    .from(inboxMembers)
    .innerJoin(users, eq(inboxMembers.userId, users.id))
    .where(eq(inboxMembers.inboxId, inboxId));

  return members.map(({ member, user }) => ({
    id: member.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: member.role,
    createdAt: member.createdAt,
  }));
}

export async function getPendingInvitations(inboxId: string) {
  const now = new Date().toISOString();

  return await db
    .select()
    .from(invitationTokens)
    .where(
      and(
        eq(invitationTokens.inboxId, inboxId),
        isNull(invitationTokens.acceptedAt),
        gt(invitationTokens.expiresAt, now)
      )
    );
}

export async function removeMember(inboxId: string, userId: string): Promise<boolean> {
  // Don't allow removing the owner
  const membership = await db
    .select()
    .from(inboxMembers)
    .where(
      and(
        eq(inboxMembers.inboxId, inboxId),
        eq(inboxMembers.userId, userId)
      )
    )
    .get();

  if (!membership || membership.role === 'owner') {
    return false;
  }

  await db
    .delete(inboxMembers)
    .where(
      and(
        eq(inboxMembers.inboxId, inboxId),
        eq(inboxMembers.userId, userId)
      )
    );

  return true;
}

export async function cancelInvitation(invitationId: string): Promise<boolean> {
  const result = await db
    .delete(invitationTokens)
    .where(eq(invitationTokens.id, invitationId));

  return true;
}
