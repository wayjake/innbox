// app/components/email/email-list-item.tsx
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { Star, Paperclip } from 'lucide-react';
import { cn } from '~/lib/utils';

interface Email {
  id: string;
  fromAddress: string;
  fromName?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  hasAttachments?: boolean;
}

interface EmailListItemProps {
  email: Email;
  inboxId: string;
  isSelected?: boolean;
}

export function EmailListItem({ email, inboxId, isSelected }: EmailListItemProps) {
  const displayName = email.fromName || email.fromAddress;
  const preview = email.bodyText?.slice(0, 100) || '';
  
  return (
    <Link
      to={`/inbox/${inboxId}/${email.id}`}
      className={cn(
        'block p-4 border-l-4 transition-colors duration-200',
        'hover:bg-sage-50',
        email.isRead 
          ? 'border-l-transparent bg-white' 
          : 'border-l-sage-500 bg-white',
        isSelected && 'bg-sage-100'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              'text-sm truncate',
              email.isRead ? 'text-sage-600' : 'font-semibold text-sage-800'
            )}>
              {displayName}
            </p>
            {email.isStarred && (
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
            {email.hasAttachments && (
              <Paperclip className="w-4 h-4 text-sage-400 flex-shrink-0" />
            )}
          </div>
          <p className={cn(
            'text-sm truncate',
            email.isRead ? 'text-sage-500' : 'text-sage-700'
          )}>
            {email.subject || '(No subject)'}
          </p>
          <p className="text-sm text-sage-400 truncate">
            {preview}
          </p>
        </div>
        <span className="text-xs text-sage-400 whitespace-nowrap flex-shrink-0">
          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}
