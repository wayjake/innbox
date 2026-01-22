# innbox Project Memory

```
    ╭──────────────────────────────────────╮
    │  📬 innbox                           │
    │                                      │
    │  The inbox that gets out of the way  │
    ╰──────────────────────────────────────╯
```

## Project Overview

innbox is a minimalist email receiving service. The goal is to let users spin up disposable inboxes instantly—no signup, no friction, just `your-name@innbox.dev` and you're good to go.

## Tech Stack

- **React Router v7** — framework mode with file-based routing
- **Bun** — runtime and package manager
- **Tailwind CSS** — utility-first styles
- **TypeScript** — because types are friends

## Project Structure

```
app/
├── routes.ts          # route configuration (index, layout, route, prefix)
├── root.tsx           # app shell and error boundary
├── app.css            # tailwind imports and theme
└── routes/
    └── home.tsx       # landing page
```

## Development Commands

```bash
bun run dev      # start dev server at localhost:5173
bun run build    # production build
bun run start    # run production server
```

## Coding Conventions

### React Router v7
- Follow modern React Router v7 framework patterns
- Routes live in `app/routes/` and are configured in `app/routes.ts`
- Use `+types/*` imports for auto-generated route types (created by `bun run dev`)
- Prefer `useLoaderData<typeof loader>()` for inferred types

### Styling
- Tailwind first, inline styles only when necessary
- Use the `cn()` helper from utils for conditional classes (when we add it)
- Dark mode support via `dark:` variants

### Comments
- Keep comments story-driven and engaging
- Use ASCII art and emoji to make code exploration fun
- Preserve existing notes for future developers

### Components
- Create reusable primitives (Button, Input, etc.) when patterns emerge
- Fight for consistency—if a component should be used somewhere, use it

## Git Preferences

- No Claude watermarks or Co-Authored-By lines in commits
- Keep commit messages concise and meaningful

## Future Features

Ideas for where this could go:

- [ ] Inbox creation and routing
- [ ] Real-time email display with SSE/WebSockets
- [ ] Email forwarding rules
- [ ] API for programmatic inbox access
- [ ] Temporary inbox expiration

---

*The adventure continues...*
