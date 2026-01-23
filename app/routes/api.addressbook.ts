import type { Route } from './+types/api.addressbook';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { addressBook } from '../../db/schema';
import { eq, like, or, desc, and } from 'drizzle-orm';

/**
 * 📖 Address Book API
 *
 * Your contacts, sorted by how much you love emailing them.
 * Frequently-used addresses bubble up to the top like
 * old friends at a party.
 *
 * GET /api/addressbook?q=search_term
 *   - Returns contacts matching the search (email or name)
 *   - Or top 10 most-used if no search term
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim();

  let contacts;

  if (query) {
    // Search by email or name (case-insensitive via LIKE)
    const searchTerm = `%${query}%`;
    contacts = await db
      .select({
        email: addressBook.email,
        name: addressBook.name,
        timesUsed: addressBook.timesUsed,
      })
      .from(addressBook)
      .where(
        and(
          eq(addressBook.userId, user.id),
          or(
            like(addressBook.email, searchTerm),
            like(addressBook.name, searchTerm)
          )
        )
      )
      .orderBy(desc(addressBook.timesUsed), desc(addressBook.lastUsedAt))
      .limit(10);
  } else {
    // Return top 10 most-used contacts
    contacts = await db
      .select({
        email: addressBook.email,
        name: addressBook.name,
        timesUsed: addressBook.timesUsed,
      })
      .from(addressBook)
      .where(eq(addressBook.userId, user.id))
      .orderBy(desc(addressBook.timesUsed), desc(addressBook.lastUsedAt))
      .limit(10);
  }

  return Response.json({ contacts });
}
