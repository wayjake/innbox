import { db } from './db.server';
import { users, sessions, passwordResetTokens, inboxMembers, inboxes } from '../../db/schema';
import { eq, and, gt, isNull, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * 🔐 Authentication utilities
 *
 * Simple session-based auth. No magic, no complexity.
 * Passwords hashed with bcrypt (pure JS, works everywhere).
 */

const SESSION_COOKIE = 'innbox_session';
const SESSION_DURATION_DAYS = 30;

// ============================================
// PASSWORD HASHING
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function getSessionFromCookie(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((c) => {
      const [key, ...val] = c.split('=');
      return [key, val.join('=')];
    })
  );

  return cookies[SESSION_COOKIE] || null;
}

export async function getUser(request: Request) {
  const sessionId = await getSessionFromCookie(request);
  if (!sessionId) return null;

  const now = new Date().toISOString();

  const result = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  if (!result) return null;

  return result.user;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    });
  }
  return user;
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// ============================================
// COOKIE HELPERS
// ============================================

export function createSessionCookie(sessionId: string): string {
  const expires = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function createLogoutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ============================================
// USER OPERATIONS
// ============================================

export async function createUser(email: string, password: string, name?: string) {
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
    })
    .returning();

  return user;
}

export async function getUserByEmail(email: string) {
  return await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();
}

// ============================================
// PASSWORD RESET
// ============================================

const RESET_TOKEN_DURATION_HOURS = 1;

function generateResetToken(): string {
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

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateResetToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const result = await db
    .select({
      token: passwordResetTokens,
      user: users,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .get();

  return result;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const result = await validatePasswordResetToken(token);
  if (!result) return false;

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, result.user.id));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(passwordResetTokens.id, result.token.id));

  return true;
}

// ============================================
// INBOX ACCESS CONTROL
// ============================================
// 🚪 The velvet rope of inbox access
// Either you're on the list (inboxMembers) or you own the place

/**
 * Check if a user can access a specific inbox.
 * Access granted if user is:
 * 1. The inbox owner (legacy: inboxes.userId match), OR
 * 2. A member via inboxMembers table (new system)
 */
export async function canAccessInbox(userId: string, inboxId: string): Promise<boolean> {
  // Check membership first (includes owners added via migration)
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

  if (membership) return true;

  // Fallback: check legacy ownership (inboxes.userId)
  // This handles edge cases during migration
  const inbox = await db
    .select()
    .from(inboxes)
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.userId, userId)
      )
    )
    .get();

  return !!inbox;
}

/**
 * Check if user is the owner of an inbox (not just a member)
 */
export async function isInboxOwner(userId: string, inboxId: string): Promise<boolean> {
  const membership = await db
    .select()
    .from(inboxMembers)
    .where(
      and(
        eq(inboxMembers.inboxId, inboxId),
        eq(inboxMembers.userId, userId),
        eq(inboxMembers.role, 'owner')
      )
    )
    .get();

  return !!membership;
}

/**
 * Get all inboxes a user can access (owned or member)
 */
export async function getUserAccessibleInboxes(userId: string) {
  // Get all inboxes where user is a member
  const memberInboxes = await db
    .select({
      inbox: inboxes,
      membership: inboxMembers,
    })
    .from(inboxMembers)
    .innerJoin(inboxes, eq(inboxMembers.inboxId, inboxes.id))
    .where(eq(inboxMembers.userId, userId));

  return memberInboxes.map(({ inbox, membership }) => ({
    ...inbox,
    role: membership.role,
  }));
}
