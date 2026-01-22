# Routes

All routes using React Router v7 file-based routing.

## Route Structure

```
app/routes/
├── _index.tsx                    # Landing / redirect
├── _auth.tsx                     # Auth layout (login/register)
├── _auth.login.tsx
├── _auth.register.tsx
├── _app.tsx                      # Authenticated app layout
├── _app.inbox.tsx                # Inbox list
├── _app.inbox.$inboxId.tsx       # Single inbox view
├── _app.inbox.$inboxId.$emailId.tsx  # Email detail
├── _app.inbox.$inboxId.sent.tsx  # Sent emails
├── _app.inbox.new.tsx            # Create new inbox
├── _app.settings.tsx             # User settings
├── _app.upgrade.tsx              # Upgrade/billing
├── _app.admin.tsx                # Admin layout
├── _app.admin.domains.tsx        # Domain management
├── _app.admin.domains.$domainId.tsx  # Single domain
├── api.webhook.email.ts          # Email webhook
├── api.email.send.ts             # Send email
├── api.domains.verify.ts         # Domain verification
├── api.push.subscribe.ts         # Push subscription
├── api.cron.cleanup.ts           # Trial cleanup
└── api.uploadthing.ts            # UploadThing handler
```

## Layout Routes

### _auth.tsx (Auth Layout)

```tsx
import { Outlet, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { getUser } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (user) {
    return redirect('/inbox');
  }
  return null;
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <Outlet />
      </div>
    </div>
  );
}
```

### _app.tsx (App Layout)

```tsx
import { Outlet, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { requireUser } from '~/lib/auth.server';
import { getTrialStatus } from '~/lib/trial.server';
import { AppShell } from '~/components/layout/app-shell';
import { db } from '~/db/client';
import { inboxes, emails } from '~/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  
  // Get user's inboxes with unread counts
  const userInboxes = await db
    .select({
      id: inboxes.id,
      address: inboxes.address,
    })
    .from(inboxes)
    .where(eq(inboxes.userId, user.id))
    .all();

  // Get unread counts per inbox
  const inboxesWithCounts = await Promise.all(
    userInboxes.map(async (inbox) => {
      const [result] = await db
        .select({ count: count() })
        .from(emails)
        .where(
          and(
            eq(emails.inboxId, inbox.id),
            eq(emails.isRead, false),
            eq(emails.isVisible, true)
          )
        );
      return { ...inbox, unreadCount: result.count };
    })
  );

  const trialStatus = await getTrialStatus(user.id);

  return {
    user,
    inboxes: inboxesWithCounts,
    trialStatus,
  };
}

export default function AppLayout() {
  const { user, inboxes, trialStatus } = useLoaderData<typeof loader>();
  
  return (
    <AppShell
      inboxes={inboxes}
      isAdmin={user.isAdmin}
      trialStatus={trialStatus}
    />
  );
}
```

## Page Routes

### Login

```tsx
// _auth.login.tsx
import { Form, useActionData, Link } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { login, createSession } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Heading } from '~/components/ui/heading';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const user = await login(email, password);
  if (!user) {
    return { error: 'Invalid email or password' };
  }

  return createSession(user.id, '/inbox');
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="space-y-6">
      <Heading level={1}>Sign In</Heading>
      
      <Form method="post" className="space-y-4">
        {actionData?.error && (
          <p className="text-red-500 text-sm">{actionData.error}</p>
        )}
        
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        
        <Button type="submit" className="w-full">Sign In</Button>
      </Form>
      
      <p className="text-center text-sage-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-sage-700 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

### Inbox View

```tsx
// _app.inbox.$inboxId.tsx
import { useLoaderData, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { db } from '~/db/client';
import { emails, inboxes } from '~/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireUser } from '~/lib/auth.server';
import { EmailList } from '~/components/email/email-list';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const { inboxId } = params;

  // Verify user owns this inbox
  const inbox = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId!), eq(inboxes.userId, user.id)))
    .get();

  if (!inbox) {
    throw new Response('Not found', { status: 404 });
  }

  // Get emails (visible only for trial users)
  const conditions = [eq(emails.inboxId, inboxId!)];
  if (user.accountStatus === 'trial') {
    conditions.push(eq(emails.isVisible, true));
  }

  const emailList = await db
    .select()
    .from(emails)
    .where(and(...conditions))
    .orderBy(desc(emails.receivedAt))
    .limit(50)
    .all();

  return { inbox, emails: emailList };
}

export default function InboxPage() {
  const { inbox, emails } = useLoaderData<typeof loader>();

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b border-sage-100 flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold text-sage-800">
          {inbox.address}
        </h1>
        <div className="flex gap-2">
          <Link
            to={`/inbox/${inbox.id}/sent`}
            className="text-sage-500 hover:text-sage-700"
          >
            Sent
          </Link>
        </div>
      </header>
      
      <EmailList emails={emails} inboxId={inbox.id} />
    </div>
  );
}
```

### Email Detail

```tsx
// _app.inbox.$inboxId.$emailId.tsx
import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { db } from '~/db/client';
import { emails, attachments, inboxes } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '~/lib/auth.server';
import { EmailDetail } from '~/components/email/email-detail';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const { inboxId, emailId } = params;

  // Verify ownership chain
  const inbox = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId!), eq(inboxes.userId, user.id)))
    .get();

  if (!inbox) {
    throw new Response('Not found', { status: 404 });
  }

  const email = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, emailId!), eq(emails.inboxId, inboxId!)))
    .get();

  if (!email) {
    throw new Response('Not found', { status: 404 });
  }

  // Mark as read
  if (!email.isRead) {
    await db
      .update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, emailId!));
  }

  // Get attachments
  const emailAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.emailId, emailId!))
    .all();

  return { email, attachments: emailAttachments, inbox };
}

export default function EmailDetailPage() {
  const { email, attachments, inbox } = useLoaderData<typeof loader>();

  return (
    <EmailDetail
      email={email}
      attachments={attachments}
      inbox={inbox}
    />
  );
}
```

## API Routes

### Domain Verification

```tsx
// api.domains.verify.ts
// See ../04-dns-domains/DNS-SETUP.md
```

### Email Webhook

```tsx
// api.webhook.email.ts
// See ../06-webhook/WEBHOOK.md
```

### Send Email

```tsx
// api.email.send.ts
// See ../07-outbound-email/BREVO.md
```

### Push Subscribe

```tsx
// api.push.subscribe.ts
// See ../09-pwa-push/PWA.md
```

### Cron Cleanup

```tsx
// api.cron.cleanup.ts
// See ../08-trial-system/TRIAL.md
```
