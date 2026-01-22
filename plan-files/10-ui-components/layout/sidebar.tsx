// app/components/layout/sidebar.tsx
import { Link, NavLink } from 'react-router';
import { Inbox, Settings, Shield, Plus } from 'lucide-react';
import { cn } from '~/lib/utils';

interface SidebarProps {
  appName: string;
  inboxes: Array<{ 
    id: string; 
    address: string; 
    unreadCount: number;
  }>;
  isAdmin: boolean;
}

export function Sidebar({ appName, inboxes, isAdmin }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-forest flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <h1 className="text-xl font-serif font-bold text-white">
          {appName}
        </h1>
      </div>
      
      {/* Inbox List */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
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
            <Inbox className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{inbox.address}</span>
            {inbox.unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-sage-500 text-white rounded-full">
                {inbox.unreadCount}
              </span>
            )}
          </NavLink>
        ))}
        
        <Link
          to="/inbox/new"
          className={cn(
            'flex items-center gap-3 px-4 py-2 text-sage-300 rounded-md',
            'hover:text-white hover:bg-white/10 transition-colors duration-200'
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">New Inbox</span>
        </Link>
      </nav>
      
      {/* Bottom Navigation */}
      <div className="p-2 border-t border-white/10 space-y-1">
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
          <span className="text-sm">Settings</span>
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
            <span className="text-sm">Admin</span>
          </NavLink>
        )}
      </div>
    </div>
  );
}
