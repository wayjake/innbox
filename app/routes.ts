import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),

  // Authenticated app routes
  layout("routes/_app.tsx", [
    route("inbox", "routes/_app.inbox._index.tsx"),
    route("inbox/new", "routes/_app.inbox.new.tsx"),
    layout("routes/_app.inbox.$inboxId.tsx", [
      route("inbox/:inboxId", "routes/_app.inbox.$inboxId._index.tsx"),
      route("inbox/:inboxId/:emailId", "routes/_app.inbox.$inboxId.$emailId.tsx"),
    ]),
  ]),

  // API routes
  route("api/webhook/email", "routes/api.webhook.email.ts"),
  route("api/email/send", "routes/api.email.send.ts"),

  route(".well-known/*", "routes/well-known.tsx"),
] satisfies RouteConfig;
