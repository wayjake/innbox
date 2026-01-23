import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import type { Route } from './+types/_app.inbox.$inboxId.settings';
import { requireUser, isInboxOwner } from '../lib/auth.server';
import { getInboxMembers, getPendingInvitations } from '../lib/invitations.server';
import { db } from '../lib/db.server';
import { inboxes } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Settings - Member Management
 *
 * Where inbox owners hold the keys to the kingdom...
 * and decide who gets to peek at the mail.
 *
 *   "With great power comes great invite responsibility"
 *                                    - Uncle Ben's Inbox
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const { inboxId } = params;

  // Get inbox
  const inbox = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.id, inboxId))
    .get();

  if (!inbox) {
    throw new Response('Inbox not found', { status: 404 });
  }

  // Check ownership
  const isOwner = await isInboxOwner(user.id, inboxId);
  if (!isOwner) {
    throw new Response('Only inbox owners can access settings', { status: 403 });
  }

  // Get members and pending invitations
  const [members, pending] = await Promise.all([
    getInboxMembers(inboxId),
    getPendingInvitations(inboxId),
  ]);

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  return {
    inbox,
    members,
    pendingInvitations: pending,
    appDomain,
    currentUserId: user.id,
  };
}

export default function InboxSettings({ loaderData }: Route.ComponentProps) {
  const { inbox, members, pendingInvitations, appDomain, currentUserId } = loaderData;
  const params = useParams();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [memberList, setMemberList] = useState(members);
  const [pendingList, setPendingList] = useState(pendingInvitations);

  // Reset success message after a delay
  useEffect(() => {
    if (inviteSuccess) {
      const timer = setTimeout(() => setInviteSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [inviteSuccess]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inboxId: params.inboxId,
          email: inviteEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setInviteError(result.error || 'Failed to send invitation');
        return;
      }

      // Refresh pending list
      const membersResponse = await fetch(`/api/invite?inboxId=${params.inboxId}`);
      const membersData = await membersResponse.json();
      setPendingList(membersData.pendingInvitations || []);

      setInviteEmail('');
      setInviteSuccess(true);
    } catch (error) {
      setInviteError('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch('/api/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inboxId: params.inboxId,
          userId,
        }),
      });

      if (response.ok) {
        setMemberList(memberList.filter((m) => m.userId !== userId));
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch('/api/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inboxId: params.inboxId,
          invitationId,
        }),
      });

      if (response.ok) {
        setPendingList(pendingList.filter((inv) => inv.id !== invitationId));
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <Link
            to={`/inbox/${params.inboxId}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to inbox
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            Inbox Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {inbox.localPart}@{appDomain}
          </p>
        </div>

        {/* Invite Form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Invite someone
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Invite'
                  )}
                </button>
              </div>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Invitation sent successfully!
              </p>
            )}
          </form>
        </div>

        {/* Pending Invitations */}
        {pendingList.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending invitations
            </h2>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {pendingList.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 dark:text-white">{inv.email}</p>
                    <p className="text-sm text-gray-500">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Members ({memberList.length})
          </h2>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {memberList.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                    {(member.name || member.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      {member.name || member.email}
                      {member.userId === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500">(you)</span>
                      )}
                    </p>
                    {member.name && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      member.role === 'owner'
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {member.role}
                  </span>
                  {member.role !== 'owner' && member.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
