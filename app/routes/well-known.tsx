/*
 * 🤫 The quiet bouncer
 *
 * Chrome DevTools keeps knocking on this door looking for
 * something we don't have. Instead of making a scene in
 * the logs, we just politely show them out.
 */
export function loader() {
  throw new Response(null, { status: 404 });
}
