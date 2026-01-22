// app/components/trial/trial-banner.tsx
import { Link } from 'react-router';
import { AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '~/lib/utils';

interface TrialBannerProps {
  visibleRemaining: number;
  captureRemaining: number;
  hiddenEmailCount: number;
}

export function TrialBanner({ 
  visibleRemaining, 
  captureRemaining, 
  hiddenEmailCount 
}: TrialBannerProps) {
  const isLowOnVisible = visibleRemaining <= 50;
  const isLowOnCapture = captureRemaining <= 500;
  
  return (
    <div className={cn(
      'px-4 py-2 flex items-center justify-between text-sm',
      isLowOnCapture 
        ? 'bg-amber-50 border-b border-amber-200' 
        : 'bg-sage-50 border-b border-sage-100'
    )}>
      <div className="flex items-center gap-2">
        {isLowOnVisible ? (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        ) : (
          <Sparkles className="w-4 h-4 text-sage-500" />
        )}
        <span className={cn(
          isLowOnCapture ? 'text-amber-700' : 'text-sage-600'
        )}>
          {visibleRemaining > 0 ? (
            <>
              <strong>{visibleRemaining}</strong> visible emails remaining
              {hiddenEmailCount > 0 && (
                <span className="text-sage-400 ml-2">
                  ({hiddenEmailCount} captured, hidden until upgrade)
                </span>
              )}
            </>
          ) : (
            <>
              <strong>{captureRemaining}</strong> emails until account limit
              <span className="text-sage-400 ml-2">
                ({hiddenEmailCount} emails waiting for you)
              </span>
            </>
          )}
        </span>
      </div>
      <Link
        to="/upgrade"
        className={cn(
          'px-3 py-1 rounded-md font-medium transition-colors duration-200',
          'bg-sage-500 text-white hover:bg-sage-600'
        )}
      >
        Upgrade
      </Link>
    </div>
  );
}
