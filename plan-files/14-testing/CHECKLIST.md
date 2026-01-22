# Testing Checklist

Comprehensive testing checklist for Innbox.

---

## Domain Management

- [ ] Admin can add a new domain
- [ ] DNS verification record is displayed correctly
- [ ] Domain verification succeeds with correct TXT record
- [ ] Domain verification fails without TXT record
- [ ] Can enable/disable domains
- [ ] Disabled domains reject incoming email
- [ ] Domain list shows inbox count per domain
- [ ] Non-admin cannot access domain management

---

## Email Flow (Inbound)

- [ ] DNS MX records resolve correctly to Cloudflare
- [ ] Cloudflare Email Worker receives test email
- [ ] Worker successfully POSTs to webhook
- [ ] Webhook rejects email for unauthorized domain (403)
- [ ] Webhook rejects email for disabled domain (403)
- [ ] Webhook accepts email for verified+active domain (200)
- [ ] Email record created in database
- [ ] `isVisible` set correctly based on trial status
- [ ] Attachments upload to UploadThing successfully
- [ ] Raw .eml file uploaded to UploadThing

---

## Email Sending (Outbound)

- [ ] Brevo API key configured and working
- [ ] Domain verified in Brevo (SPF, DKIM records)
- [ ] Compose modal opens from inbox view
- [ ] Can send new email to external recipient
- [ ] Can reply to received email
- [ ] Reply includes In-Reply-To header
- [ ] Sent email stored in sent_emails table
- [ ] Sent emails list displays correctly
- [ ] Deactivated users cannot send emails
- [ ] Email arrives in recipient's inbox

---

## Inbox Management

- [ ] Can create inbox on any verified domain
- [ ] Cannot create inbox on unverified domain
- [ ] Cannot create duplicate local_part on same domain
- [ ] Inbox list shows unread count
- [ ] Email list loads with correct pagination
- [ ] Email detail displays HTML safely (sanitized)
- [ ] Mark as read updates in real-time
- [ ] Star/unstar works
- [ ] Archive works

---

## Authentication & Authorization

- [ ] Can register new user
- [ ] Password hashed correctly (not plaintext)
- [ ] Can login with correct credentials
- [ ] Login fails with wrong password
- [ ] Non-admin cannot access /admin routes
- [ ] Admin can access /admin/domains
- [ ] Session persists across page refresh
- [ ] Logout clears session
- [ ] Protected routes redirect to login

---

## Trial System

### Email Limits

- [ ] New user starts with `accountStatus='trial'`
- [ ] `visibleEmailCount` starts at 0
- [ ] `totalEmailCount` starts at 0
- [ ] First 300 emails are visible (`isVisible=true`)
- [ ] Emails 301+ are captured but hidden (`isVisible=false`)
- [ ] Trial users only see visible emails in queries
- [ ] Push notifications only sent for visible emails
- [ ] Account deactivates at 3,300 emails
- [ ] Deactivated account inboxes stop receiving

### Trial UI

- [ ] Trial banner shows correct usage counts
- [ ] Usage meter shows visible limit progress
- [ ] Usage meter shows capture limit progress
- [ ] Upgrade modal shows hidden email count
- [ ] Upgrade CTA is visible and clickable

### Upgrade Flow

- [ ] Upgrade makes all hidden emails visible
- [ ] Account status changes to 'active'
- [ ] Inboxes reactivated after upgrade
- [ ] No limits apply after upgrade

### Cleanup

- [ ] Cron job runs daily (check Vercel logs)
- [ ] Deactivated accounts purged after 30 days
- [ ] Files deleted from UploadThing
- [ ] User data completely removed

---

## PWA & Notifications

### PWA

- [ ] manifest.json loads correctly
- [ ] Service worker registers
- [ ] PWA installs on iOS Safari ("Add to Home Screen")
- [ ] App launches in standalone mode
- [ ] Theme color matches Forest Green (#2D4F3E)
- [ ] Icons display correctly

### Push Notifications

- [ ] Permission prompt appears
- [ ] Subscription saved to user record
- [ ] Push notification received on new email
- [ ] Notification shows sender and subject
- [ ] Clicking notification opens correct email
- [ ] No notification for hidden (trial) emails

---

## Design System

- [ ] All transitions are 200ms with ease-out
- [ ] Colors match Sage Trust palette exactly
- [ ] Typography uses Libre Baskerville (headings) and Inter (body)
- [ ] Border radius is 6-8px (never pill-shaped)
- [ ] Buttons have correct hover states
- [ ] Inputs show focus rings
- [ ] Empty states have icons and helpful text
- [ ] Error states are red with clear messages
- [ ] Loading states show spinners or skeletons

---

## Mobile / Responsive

- [ ] Sidebar collapses on mobile
- [ ] Email list is scrollable
- [ ] Email detail is readable
- [ ] Touch targets are 44px minimum
- [ ] No horizontal scroll on mobile
- [ ] Compose modal works on mobile

---

## Performance

- [ ] Initial page load < 3s
- [ ] Email list pagination works
- [ ] No memory leaks on long sessions
- [ ] Large attachments handled gracefully
- [ ] Concurrent requests don't break

---

## Security

- [ ] WEBHOOK_SECRET is secure (32+ chars)
- [ ] SESSION_SECRET is secure (32+ chars)
- [ ] CRON_SECRET is secure (32+ chars)
- [ ] Webhook signature verified on every request
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (HTML sanitized)
- [ ] CSRF protection on forms
- [ ] Secrets not exposed in client code

---

## Error Handling

- [ ] 404 page for unknown routes
- [ ] Error boundary catches React errors
- [ ] API errors return proper status codes
- [ ] User-friendly error messages
- [ ] Errors logged for debugging

---

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] iOS Safari (16.4+ for push)
- [ ] Android Chrome

---

## Quick Smoke Test

Run through these in order after any major change:

1. [ ] Open app → login page loads
2. [ ] Register new user → redirects to inbox
3. [ ] Create inbox → success
4. [ ] Send test email to inbox → email appears
5. [ ] Open email → detail view works
6. [ ] Reply to email → sends successfully
7. [ ] Check sent folder → sent email visible
8. [ ] Logout → redirects to login
