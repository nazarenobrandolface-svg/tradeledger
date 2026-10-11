import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Globe,
  MoreHorizontal,
  BarChart3,
  Library,
  Newspaper,
  Upload,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/trades', label: 'Trades', icon: ArrowLeftRight },
  { to: '/sessions', label: 'Sessions', icon: Globe }
];

const moreItems = [
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notebook', label: 'Notebook', icon: Library },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const moreRoutes = moreItems.map((i) => i.to);

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const moreActive = moreRoutes.some(
    (to) => location.pathname === to || location.pathname.startsWith(`${to}/`)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background md:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 px-1 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.label}</span>
        </NavLink>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More pages"
            aria-current={moreActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 px-1 py-1 text-xs font-medium transition-colors',
              moreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2 min-w-[10rem]">
          <DropdownMenuLabel>More</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {moreItems.map((item) => (
            <DropdownMenuItem
              key={item.to}
              onSelect={() => navigate(item.to)}
              className={cn(
                'gap-2',
                (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) &&
                  'bg-accent font-medium'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
