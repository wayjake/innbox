import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("accept-invite", "routes/accept-invite.tsx"),

  // Admin routes
  route("admin/settings", "routes/admin.settings.tsx"),

  // Authenticated app routes
  layout("routes/_app.tsx", [
    route("inbox", "routes/_app.inbox._index.tsx"),
    route("inbox/new", "routes/_app.inbox.new.tsx"),
    layout("routes/_app.inbox.$inboxId.tsx", [
      route("inbox/:inboxId", "routes/_app.inbox.$inboxId._index.tsx"),
      route("inbox/:inboxId/settings", "routes/_app.inbox.$inboxId.settings.tsx"),
      route("inbox/:inboxId/thread/:threadId", "routes/_app.inbox.$inboxId.thread.$threadId.tsx"),
      route("inbox/:inboxId/:emailId", "routes/_app.inbox.$inboxId.$emailId.tsx"),
    ]),
  ]),

  // API routes
  route("api/webhook/email", "routes/api.webhook.email.ts"),
  route("api/email/send", "routes/api.email.send.ts"),
  route("api/addressbook", "routes/api.addressbook.ts"),
  route("api/invite", "routes/api.invite.ts"),

  route(".well-known/*", "routes/well-known.tsx"),
] satisfies RouteConfig;
