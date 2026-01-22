# 11 - Routes

React Router v7 file-based routing.

## Files

| File | Description |
|------|-------------|
| `ROUTES.md` | All route implementations |

## Route Structure

```
app/routes/
├── _auth.tsx              # Auth layout
├── _auth.login.tsx
├── _auth.register.tsx
├── _app.tsx               # App layout (authenticated)
├── _app.inbox.tsx
├── _app.inbox.$inboxId.tsx
├── _app.inbox.$inboxId.$emailId.tsx
├── _app.inbox.$inboxId.sent.tsx
├── _app.inbox.new.tsx
├── _app.settings.tsx
├── _app.upgrade.tsx
├── _app.admin.tsx
├── _app.admin.domains.tsx
├── api.webhook.email.ts
├── api.email.send.ts
├── api.domains.verify.ts
├── api.push.subscribe.ts
├── api.cron.cleanup.ts
└── api.uploadthing.ts
```

## Next

→ `../12-deployment/` for deployment
