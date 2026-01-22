# PWA & Push Notifications

Innbox is installable as a PWA on iOS and supports push notifications.

## PWA Manifest

```json
// public/manifest.json
{
  "name": "Innbox",
  "short_name": "Innbox",
  "description": "Your email, simplified",
  "start_url": "/inbox",
  "display": "standalone",
  "background_color": "#F8F9F6",
  "theme_color": "#2D4F3E",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'innbox-v1';
const urlsToCache = [
  '/',
  '/inbox',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'New email received',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.emailId || 'email',
    renotify: true,
    data: {
      emailId: data.emailId,
      inboxId: data.inboxId,
      url: data.url || `/inbox/${data.inboxId}/${data.emailId}`,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Email', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/inbox';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes('/inbox') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// Fetch (network first, fallback to cache)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

## VAPID Keys

Generate keys for Web Push:

```bash
bunx web-push generate-vapid-keys
```

Add to `.env`:
```env
VAPID_PUBLIC_KEY=BLqX...
VAPID_PRIVATE_KEY=xyz...
VAPID_CONTACT_EMAIL=admin@innbox.dev
```

## Push Server Library

```typescript
// app/lib/push.server.ts
import webPush from 'web-push';
import { db } from '~/db/client';
import { users } from '~/db/schema';
import { eq } from 'drizzle-orm';

// Configure web-push
webPush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    emailId?: string;
    inboxId?: string;
    url?: string;
  };
}

export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  const user = await db
    .select({ pushSubscription: users.pushSubscription })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user?.pushSubscription) {
    return;
  }

  try {
    const subscription = JSON.parse(user.pushSubscription);
    
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        emailId: payload.data?.emailId,
        inboxId: payload.data?.inboxId,
        url: payload.data?.url,
      })
    );
  } catch (error: any) {
    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      await db
        .update(users)
        .set({ pushSubscription: null })
        .where(eq(users.id, userId));
    } else {
      console.error('Push notification failed:', error);
    }
  }
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  await db
    .update(users)
    .set({ pushSubscription: JSON.stringify(subscription) })
    .where(eq(users.id, userId));
}
```

## Push Client Library

```typescript
// app/lib/push.client.ts

export async function registerPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Check permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return false;
    }

    // Get VAPID public key from server or env
    const vapidPublicKey = window.ENV?.VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key not found');
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

## Subscribe Endpoint

```typescript
// app/routes/api.push.subscribe.ts
import type { ActionFunctionArgs } from 'react-router';
import { requireUser } from '~/lib/auth.server';
import { savePushSubscription } from '~/lib/push.server';

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const subscription = await request.json();

  await savePushSubscription(user.id, subscription);

  return Response.json({ success: true });
}
```

## Register in App

```typescript
// In _app.tsx or root layout
import { useEffect } from 'react';
import { registerPushNotifications } from '~/lib/push.client';

export default function AppLayout() {
  useEffect(() => {
    // Register push notifications on first load
    registerPushNotifications();
  }, []);

  return (
    // ...
  );
}
```

## Root Layout HTML

Include manifest and service worker registration:

```typescript
// app/root.tsx
export default function App() {
  return (
    <html>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2D4F3E" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <Outlet />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify({
              VAPID_PUBLIC_KEY: '${process.env.VAPID_PUBLIC_KEY}',
            })}`,
          }}
        />
      </body>
    </html>
  );
}
```

## iOS PWA Notes

- Must use Safari to install PWA ("Add to Home Screen")
- Push notifications require iOS 16.4+
- Badge count not supported
- Test thoroughly on actual devices
