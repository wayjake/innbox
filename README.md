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

**O'Saasy License Agreement**

Copyright © 2025, innbox contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. No licensee or downstream recipient may use the Software (including any modified or derivative versions) to directly compete with the original Licensor by offering it to third parties as a hosted, managed, or Software-as-a-Service (SaaS) product or cloud service where the primary value of the service is the functionality of the Software itself.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*Learn more at [osaasy.dev](https://osaasy.dev)*

---

*Less inbox, more innbox.*
