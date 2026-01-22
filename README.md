# 📬 innbox

Get up and running to receive emails in seconds.

```
┌────────────────────────────────────────┐
│                                        │
│   your-name@innbox.dev                 │
│                                        │
│   → Instant email receiving            │
│   → Zero configuration                 │
│   → Built for developers               │
│                                        │
└────────────────────────────────────────┘
```

## What is innbox?

innbox is a lightweight service for quickly spinning up email addresses. Perfect for:

- Testing email flows in development
- Temporary inboxes for signups
- Webhook testing and debugging
- Anything that needs an inbox, fast

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Visit `http://localhost:5173` and you're in business.

### Production Build

```bash
bun run build
bun run start
```

## Tech Stack

- **React Router v7** — Full-stack React framework
- **Bun** — Fast JavaScript runtime & package manager
- **Tailwind CSS** — Utility-first styling
- **TypeScript** — Type safety throughout

## Deployment

### Docker

```bash
docker build -t innbox .
docker run -p 3000:3000 innbox
```

Works with any container platform: Fly.io, Railway, Cloud Run, etc.

### DIY

Deploy the `build/` directory to any Node.js host:

```
build/
├── client/    # Static assets
└── server/    # Server-side code
```

## License

MIT

---

*Less inbox, more innbox.*
