export const ACCOUNT_TYPES = ['live', 'propfirm', 'demo'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  live: 'Live',
  propfirm: 'Prop Firm',
  demo: 'Demo'
};

export const MIN_LEVERAGE = 30;
export const MAX_LEVERAGE = 200;

export function clampLeverage(value: number): number {
  return Math.min(MAX_LEVERAGE, Math.max(MIN_LEVERAGE, Math.round(value)));
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  startingBalance: number;
  /** Optional: records created before this field existed have none. */
  type?: AccountType;
  /** Broker leverage as a plain number (100 = 1:100). */
  leverage?: number;
  timezone: string;
  commissionPerTrade: number;
  commissionPerShare: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TradeSide = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export const TRADE_CATEGORIES = ['forex', 'indices', 'futures', 'stocks'] as const;
export type TradeCategory = (typeof TRADE_CATEGORIES)[number];

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  category: TradeCategory | null;
  side: TradeSide;
  status: TradeStatus;
  openedAt: number;
  closedAt: number | null;
  plannedEntry: number | null;
  plannedStop: number | null;
  plannedTarget: number | null;
  rating: number | null;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type ExecutionType = 'entry' | 'exit';

export interface Execution {
  id: string;
  tradeId: string;
  type: ExecutionType;
  price: number;
  quantity: number;
  fees: number;
  executedAt: number;
  note: string | null;
}

export interface TradeWithExecutions extends Trade {
  executions: Execution[];
}

export interface TradeFilters {
  accountId?: string;
  symbol?: string;
  side?: TradeSide;
  status?: TradeStatus;
  outcome?: TradeOutcome;
  tagIds?: string[];
  dateFrom?: number;
  dateTo?: number;
  minPnl?: number;
  maxPnl?: number;
}
