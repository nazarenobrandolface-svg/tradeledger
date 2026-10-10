import { useLocation } from 'react-router-dom';
import { Plus, Moon, Sun, Monitor, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketClock } from './MarketClock';
import { useAppStore } from '@/stores/appStore';
import { useFilterStore } from '@/stores/filterStore';
import { useAccounts } from '@/hooks/useRepositories';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/journal': 'Daily Journal',
  '/trades': 'Trades',
  '/reports': 'Reports',
  '/notebook': 'Notebook',
  '/import': 'Import Trades',
  '/settings': 'Settings'
};

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const { dateFrom, dateTo, setDateRange, accountId, setAccountId } = useFilterStore();
  const accounts = useAccounts();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  const title =
    pageTitles[location.pathname] ??
    (location.pathname.startsWith('/trades/') ? 'Trade Detail' : 'TradeLedger');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur md:h-16 md:flex-nowrap md:px-6 md:py-0">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-sm">
              {format(dateFrom, 'MMM d')} — {format(dateTo, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={new Date(dateFrom)}
              selected={{ from: new Date(dateFrom), to: new Date(dateTo) }}
              onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                if (range?.from && range?.to) {
                  setDateRange(range.from.getTime(), range.to.getTime());
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={accountId ?? 'all'}
          onValueChange={(v) => setAccountId(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-9 w-[130px] text-sm md:w-[160px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          <ThemeIcon className="h-5 w-5" />
        </Button>

        {isSupabaseConfigured && session && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}

        <Button size="sm" className="hidden h-9 gap-2 md:inline-flex" onClick={() => navigate('/trades/new')}>
          <Plus className="h-4 w-4" />
          Add Trade
        </Button>

        <MarketClock />
      </div>
    </header>
  );
}
