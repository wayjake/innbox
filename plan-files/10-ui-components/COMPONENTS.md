# UI Components

All components use inline Tailwind CSS via the `cn()` utility.
No separate CSS files or @apply directives in components.

## Directory Structure

```
app/components/
├── ui/              # Base design system components
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── heading.tsx
│   ├── switch.tsx
│   ├── select.tsx
│   └── progress.tsx
│
├── email/           # Email-specific components
│   ├── email-list.tsx
│   ├── email-list-item.tsx
│   ├── email-detail.tsx
│   ├── compose-email.tsx
│   └── sent-list.tsx
│
├── domain/          # Domain management components
│   ├── domain-list.tsx
│   ├── domain-list-item.tsx
│   └── add-domain-dialog.tsx
│
├── trial/           # Trial system components
│   ├── trial-banner.tsx
│   ├── usage-meter.tsx
│   └── upgrade-modal.tsx
│
└── layout/          # Layout components
    ├── app-shell.tsx
    └── sidebar.tsx
```

## Base UI Components

### Button

```tsx
// app/components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary' && 'bg-sage-500 text-white hover:bg-sage-600',
          variant === 'secondary' && 'border border-sage-200 text-sage-700 hover:bg-sage-50',
          variant === 'ghost' && 'text-sage-500 hover:bg-sage-100',
          variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2',
          size === 'lg' && 'px-6 py-3 text-lg',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

### Input

```tsx
// app/components/ui/input.tsx
import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 border border-sage-200 rounded-md',
          'text-sage-700 placeholder:text-sage-300',
          'focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500',
          'transition-all duration-200',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
```

### Card

```tsx
// app/components/ui/card.tsx
import { cn } from '~/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-sage-100 shadow-sm overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('p-4 border-b border-sage-100', className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-4', className)} {...props} />;
}
```

### Badge

```tsx
// app/components/ui/badge.tsx
import { cn } from '~/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-sage-100 text-sage-700',
        variant === 'success' && 'bg-green-100 text-green-700',
        variant === 'warning' && 'bg-amber-100 text-amber-700',
        variant === 'error' && 'bg-red-100 text-red-700',
        className
      )}
      {...props}
    />
  );
}
```

### Heading

```tsx
// app/components/ui/heading.tsx
import { cn } from '~/lib/utils';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
}

export function Heading({ level = 2, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  
  return (
    <Tag
      className={cn(
        'font-serif font-bold text-sage-800',
        level === 1 && 'text-3xl',
        level === 2 && 'text-2xl',
        level === 3 && 'text-xl',
        level === 4 && 'text-lg',
        className
      )}
      {...props}
    />
  );
}
```

### Progress

```tsx
// app/components/ui/progress.tsx
import { cn } from '~/lib/utils';

interface ProgressProps {
  value: number;
  max: number;
  className?: string;
  variant?: 'default' | 'warning' | 'danger';
}

export function Progress({ value, max, className, variant = 'default' }: ProgressProps) {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div className={cn('h-2 bg-sage-100 rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full transition-all duration-300',
          variant === 'default' && 'bg-sage-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger' && 'bg-red-500'
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
```

## Layout Components

### Sidebar

```tsx
// app/components/layout/sidebar.tsx
import { Link, NavLink } from 'react-router';
import { Inbox, Settings, Shield, Plus } from 'lucide-react';
import { cn } from '~/lib/utils';

interface SidebarProps {
  inboxes: Array<{ id: string; address: string; unreadCount: number }>;
  isAdmin: boolean;
}

export function Sidebar({ inboxes, isAdmin }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-forest flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-serif font-bold text-white">Innbox</h1>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {inboxes.map((inbox) => (
          <NavLink
            key={inbox.id}
            to={`/inbox/${inbox.id}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sage-200 rounded-md',
                'hover:bg-white/10 transition-colors duration-200',
                isActive && 'bg-white/10 text-white'
              )
            }
          >
            <Inbox className="w-5 h-5" />
            <span className="flex-1 truncate">{inbox.address}</span>
            {inbox.unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-sage-500 text-white rounded-full">
                {inbox.unreadCount}
              </span>
            )}
          </NavLink>
        ))}
        
        <Link
          to="/inbox/new"
          className="flex items-center gap-3 px-4 py-2 text-sage-300 hover:text-white hover:bg-white/10 rounded-md transition-colors duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>New Inbox</span>
        </Link>
      </nav>
      
      <div className="p-2 border-t border-white/10">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2 text-sage-200 rounded-md',
              'hover:bg-white/10 transition-colors duration-200',
              isActive && 'bg-white/10 text-white'
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
        
        {isAdmin && (
          <NavLink
            to="/admin/domains"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sage-200 rounded-md',
                'hover:bg-white/10 transition-colors duration-200',
                isActive && 'bg-white/10 text-white'
              )
            }
          >
            <Shield className="w-5 h-5" />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </div>
  );
}
```

### App Shell

```tsx
// app/components/layout/app-shell.tsx
import { Outlet } from 'react-router';
import { Sidebar } from './sidebar';
import { TrialBanner } from '../trial/trial-banner';

interface AppShellProps {
  inboxes: Array<{ id: string; address: string; unreadCount: number }>;
  isAdmin: boolean;
  trialStatus: {
    accountStatus: string;
    visibleRemaining: number;
    captureRemaining: number;
    hiddenEmailCount: number;
  };
}

export function AppShell({ inboxes, isAdmin, trialStatus }: AppShellProps) {
  return (
    <div className="flex h-screen bg-cream">
      <Sidebar inboxes={inboxes} isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {trialStatus.accountStatus === 'trial' && (
          <TrialBanner
            visibleRemaining={trialStatus.visibleRemaining}
            captureRemaining={trialStatus.captureRemaining}
            hiddenEmailCount={trialStatus.hiddenEmailCount}
          />
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

## Full Component Files

For complete implementations of all components, see the individual files in the `10-ui-components` directory:

- `ui/` — Base components
- `email/` — Email list, detail, compose
- `domain/` — Domain management
- `trial/` — Trial banner, meter, modal
- `layout/` — App shell, sidebar
