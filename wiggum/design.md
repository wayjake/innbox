# Design System

```
    ╭───────────────────────────────────────╮
    │  🎨 DESIGN LANGUAGE                   │
    ╰───────────────────────────────────────╯
```

> Full details: [plan-files/02-design/DESIGN-SYSTEM.md](../plan-files/02-design/DESIGN-SYSTEM.md)

## Philosophy

**Minimalist. Fast. Functional.**

Get in, see emails, get out.

## Colors

| Token | Light | Dark |
|-------|-------|------|
| Background | white | gray-950 |
| Surface | gray-50 | gray-900 |
| Primary | indigo-600 | indigo-500 |
| Muted | gray-500 | gray-400 |

## Core Components

### Base
- `Button` — primary, secondary, ghost
- `Input` — with label, error states
- `Card` — surface containers

### Email
- `EmailList` — inbox list
- `EmailListItem` — sender, subject, preview, time
- `EmailDetail` — full email view

### Layout
- `Sidebar` — inbox navigation
- `AppShell` — sidebar + content

## Component Source

[plan-files/10-ui-components/](../plan-files/10-ui-components/)

---

*Less is more. Especially with email.*
