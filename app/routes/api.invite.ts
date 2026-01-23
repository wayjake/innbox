import type { Route } from './+types/api.invite';
import { requireUser, isInboxOwner } from '../lib/auth.server';
import {
  createInvitation,
  sendInvitationEmail,
  getInboxMembers,
  getPendingInvitations,
  removeMember,
  cancelInvitation,
} from '../lib/invitations.server';
import { db } from '../lib/db.server';
import { inboxes } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 🎟️ Invitation API
 *
 * POST /api/invite - Send an invitation
 * GET /api/invite?inboxId=xxx - Get members and pending invitations
 * DELETE /api/invite - Remove a member or cancel an invitation
 *
 * Only inbox owners can manage invitations.
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const url = new URL(request.url);
  const inboxId = url.searchParams.get('inboxId');

  if (!inboxId) {
    return Response.json({ error: 'Missing inboxId' }, { status: 400 });
  }

  // Check if user owns this inbox
  const isOwner = await isInboxOwner(user.id, inboxId);
  if (!isOwner) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get members and pending invitations
  const [members, pending] = await Promise.all([
    getInboxMembers(inboxId),
    getPendingInvitations(inboxId),
  ]);

  return Response.json({
    members,
    pendingInvitations: pending.map((inv) => ({
      id: inv.id,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    })),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  if (request.method === 'POST') {
    return handleSendInvitation(request, user);
  }

  if (request.method === 'DELETE') {
    return handleRemove(request, user);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

async function handleSendInvitation(request: Request, user: { id: string; email: string }) {
  const data = await request.json();
  const { inboxId, email } = data;

  if (!inboxId || !email) {
    return Response.json({ error: 'Missing inboxId or email' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Check if user owns this inbox
  const isOwner = await isInboxOwner(user.id, inboxId);
  if (!isOwner) {
    return Response.json({ error: 'Only inbox owners can send invitations' }, { status: 403 });
  }

  // Get inbox details for the email
  const inbox = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.id, inboxId))
    .get();

  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  // Create invitation
  const result = await createInvitation(inboxId, email, user.id);
  if (!result.success || !result.token) {
    return Response.json({ error: result.error || 'Failed to create invitation' }, { status: 400 });
  }

  // Send invitation email
  const emailResult = await sendInvitationEmail(
    email,
    result.token,
    inbox.name || inbox.localPart,
    user.email
  );

  if (!emailResult.success) {
    // Log but don't fail - token is still valid
    console.error('Failed to send invitation email:', emailResult.error);
    return Response.json({
      success: true,
      warning: 'Invitation created but email failed to send',
    });
  }

  return Response.json({ success: true });
}

async function handleRemove(request: Request, user: { id: string; email: string }) {
  const data = await request.json();
  const { inboxId, userId, invitationId } = data;

  if (!inboxId) {
    return Response.json({ error: 'Missing inboxId' }, { status: 400 });
  }

  // Check if user owns this inbox
  const isOwner = await isInboxOwner(user.id, inboxId);
  if (!isOwner) {
    return Response.json({ error: 'Only inbox owners can manage members' }, { status: 403 });
  }

  if (userId) {
    // Remove a member
    const success = await removeMember(inboxId, userId);
    if (!success) {
      return Response.json({ error: 'Cannot remove inbox owner' }, { status: 400 });
    }
    return Response.json({ success: true });
  }

  if (invitationId) {
    // Cancel a pending invitation
    await cancelInvitation(invitationId);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Missing userId or invitationId' }, { status: 400 });
}
