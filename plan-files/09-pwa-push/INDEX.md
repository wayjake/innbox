# 09 - PWA & Push Notifications

Installable PWA with push notifications for iOS.

## Files

| File | Description |
|------|-------------|
| `PWA.md` | Manifest, service worker, VAPID setup, push API |

## Setup

```bash
# Generate VAPID keys
bunx web-push generate-vapid-keys
```

## Files to Create

- `public/manifest.json`
- `public/sw.js`
- `app/lib/push.server.ts`
- `app/lib/push.client.ts`

## iOS Requirements

- Safari required for installation
- iOS 16.4+ for push notifications

## Next

→ `../10-ui-components/` for components
