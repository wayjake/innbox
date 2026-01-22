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
