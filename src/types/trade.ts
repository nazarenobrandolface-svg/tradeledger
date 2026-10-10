export interface Account {
  id: string;
  name: string;
  currency: string;
  startingBalance: number;
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

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  openedAt: number;
  closedAt: number | null;
  plannedEntry: number | null;
  plannedStop: number | null;
  plannedTarget: number | null;
  playbookId: string | null;
  rating: number | null;
  notes: string;
  ruleChecklist: Record<string, boolean>;
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
  playbookId?: string;
  tagIds?: string[];
  dateFrom?: number;
  dateTo?: number;
  minPnl?: number;
  maxPnl?: number;
}
