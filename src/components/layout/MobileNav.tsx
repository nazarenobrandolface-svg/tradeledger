import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  BarChart3,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/trades', label: 'Trades', icon: ArrowLeftRight },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'More', icon: MoreHorizontal }
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background md:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
