# Innbox Design System

Design identity: **"Sage Trust"** — Professional, calming, trustworthy.

## Color Palette

```css
/* Primary - Sage Green */
--sage-50:  #F8FAF9;
--sage-100: #E8F0EC;
--sage-200: #C5D9CD;
--sage-300: #A2C2AE;
--sage-400: #7FAB8F;
--sage-500: #5B7F6D;  /* Primary */
--sage-600: #4A6659;
--sage-700: #394D44;
--sage-800: #28342F;
--sage-900: #171B1A;

/* Accent - Forest Green */
--forest: #2D4F3E;

/* Background */
--cream: #F8F9F6;

/* Semantic */
--error: #D64545;
--success: #2D7D46;
--warning: #E6A23C;
```

## Typography

```css
/* Headings - Libre Baskerville (serif) */
font-family: 'Libre Baskerville', Georgia, serif;

/* Body - Inter (sans-serif) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Font Scale

| Element | Size | Weight | Font |
|---------|------|--------|------|
| h1 | 2rem (32px) | 700 | Libre Baskerville |
| h2 | 1.5rem (24px) | 700 | Libre Baskerville |
| h3 | 1.25rem (20px) | 600 | Libre Baskerville |
| h4 | 1rem (16px) | 600 | Libre Baskerville |
| body | 1rem (16px) | 400 | Inter |
| small | 0.875rem (14px) | 400 | Inter |
| tiny | 0.75rem (12px) | 400 | Inter |

## Spacing & Sizing

```css
/* Base unit: 4px */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */

/* Border radius - subtle, not pill-shaped */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

## Transitions

All interactive elements use consistent timing:

```css
transition: all 200ms ease-out;
```

## Component Specifications

### Button

```tsx
// Primary
className="px-4 py-2 bg-sage-500 text-white rounded-md 
           hover:bg-sage-600 transition-colors duration-200
           disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary  
className="px-4 py-2 border border-sage-200 text-sage-700 rounded-md
           hover:bg-sage-50 transition-colors duration-200"

// Ghost
className="px-4 py-2 text-sage-500 rounded-md
           hover:bg-sage-100 transition-colors duration-200"
```

### Input

```tsx
className="w-full px-3 py-2 border border-sage-200 rounded-md
           text-sage-700 placeholder:text-sage-300
           focus:outline-none focus:ring-2 focus:ring-sage-500/20 
           focus:border-sage-500 transition-all duration-200"
```

### Card

```tsx
className="bg-white rounded-lg border border-sage-100 
           shadow-sm overflow-hidden"
```

### Badge

```tsx
// Default
className="inline-flex items-center px-2 py-0.5 rounded text-xs
           font-medium bg-sage-100 text-sage-700"

// Success
className="bg-green-100 text-green-700"

// Warning  
className="bg-amber-100 text-amber-700"

// Error
className="bg-red-100 text-red-700"
```

## Email List Item States

```tsx
// Unread - left border accent
className="border-l-4 border-l-sage-500 bg-white"

// Read
className="border-l-4 border-l-transparent bg-white"

// Hover
className="hover:bg-sage-50"

// Selected
className="bg-sage-100"
```

## Sidebar

```tsx
// Container
className="w-64 h-screen bg-forest flex flex-col"

// Nav item
className="flex items-center gap-3 px-4 py-2 text-sage-200
           hover:bg-white/10 rounded-md transition-colors duration-200"

// Active nav item
className="bg-white/10 text-white"

// Unread badge
className="ml-auto px-2 py-0.5 text-xs bg-sage-500 text-white rounded-full"
```

## Loading States

```tsx
// Skeleton
className="animate-pulse bg-sage-100 rounded"

// Spinner (use lucide-react Loader2)
<Loader2 className="w-5 h-5 animate-spin text-sage-500" />
```

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-sage-400">
  <Icon className="w-12 h-12 mb-4 opacity-50" />
  <p>No items yet</p>
</div>
```

## Form Layout

```tsx
<div className="space-y-4">
  <div className="space-y-1.5">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" />
  </div>
  {/* More fields */}
</div>
```

## Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F8FAF9',
          100: '#E8F0EC',
          200: '#C5D9CD',
          300: '#A2C2AE',
          400: '#7FAB8F',
          500: '#5B7F6D',
          600: '#4A6659',
          700: '#394D44',
          800: '#28342F',
          900: '#171B1A',
        },
        forest: '#2D4F3E',
        cream: '#F8F9F6',
      },
      fontFamily: {
        serif: ['Libre Baskerville', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

## CSS Base (app.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-cream text-sage-700 font-sans antialiased;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-serif;
}
```

## Utility Function

```ts
// app/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Important Rules

1. **No separate CSS files** — Use inline Tailwind only
2. **No @apply in components** — Only in app.css base styles
3. **All transitions 200ms** — Consistent timing
4. **Border radius 6-8px** — Never pill-shaped
5. **Use cn() for conditional classes** — Merge properly
