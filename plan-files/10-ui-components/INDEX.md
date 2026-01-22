# 10 - UI Components

React components using Tailwind CSS.

## Files

| File | Description |
|------|-------------|
| `COMPONENTS.md` | Component overview with code |
| `ui/button.tsx` | Button component |
| `ui/input.tsx` | Input component |
| `ui/card.tsx` | Card component |
| `email/email-list-item.tsx` | Email list item |
| `email/compose-email.tsx` | Compose modal |
| `trial/trial-banner.tsx` | Trial status banner |
| `layout/sidebar.tsx` | App sidebar |

## Directory Structure

```
app/components/
├── ui/          # Base design system
├── email/       # Email-specific
├── domain/      # Domain management
├── trial/       # Trial system
└── layout/      # Layout components
```

## Rules

- Use inline Tailwind only
- Use `cn()` for conditional classes
- All transitions 200ms ease-out

## Next

→ `../11-routes/` for route implementations
