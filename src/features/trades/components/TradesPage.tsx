import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTradesWithExecutions,
  useTags,
  useDefaultAccount
} from '@/hooks/useRepositories';
import { useFilterStore } from '@/stores/filterStore';
import { calcNetPnl, calcTradeOutcome, calcRMultiple, calcTotalQuantity, calcAvgEntryPrice, calcAvgExitPrice } from '@/lib/metrics';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { TagBadge } from '@/components/shared/TagBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { repositories } from '@/repositories';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const PAGE_SIZE = 25;

export function TradesPage() {
  const navigate = useNavigate();
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined
  });
  const tags = useTags();
  const account = useDefaultAccount();

  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('closedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const filtered = useMemo(() => {
    if (!trades) return [];
    let list = [...trades];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.symbol.toLowerCase().includes(s));
    }
    if (sideFilter !== 'all') list = list.filter((t) => t.side === sideFilter);
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (outcomeFilter !== 'all') {
      list = list.filter((t) => calcTradeOutcome(t.executions) === outcomeFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'closedAt') cmp = (a.closedAt ?? 0) - (b.closedAt ?? 0);
      else if (sortField === 'openedAt') cmp = a.openedAt - b.openedAt;
      else if (sortField === 'symbol') cmp = a.symbol.localeCompare(b.symbol);
      else if (sortField === 'pnl')
        cmp = calcNetPnl(a.executions, a.side) - calcNetPnl(b.executions, b.side);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [trades, search, sideFilter, statusFilter, outcomeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const currency = account?.currency ?? 'USD';

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((t) => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    setConfirmingBulkDelete(true);
  };

  const runBulkDelete = async () => {
    setConfirmingBulkDelete(false);
    await repositories.trades.bulkDelete(Array.from(selected));
    setSelected(new Set());
  };

  const handleBulkTag = async (tagId: string) => {
    for (const tradeId of selected) {
      await repositories.tags.addTagToTrade(tradeId, tagId);
    }
    setSelected(new Set());
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="cursor-pointer select-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => toggleSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSort(field);
        }
      }}
      tabIndex={0}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
      </span>
    </TableHead>
  );

  if (!trades) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>;
  }

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<ArrowLeftRight className="h-12 w-12" />}
        title="No trades yet"
        description="Start by adding your first trade or importing data."
        action={{ label: 'Add Trade', onClick: () => navigate('/trades/new') }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-[200px]"
        />
        <Select value={sideFilter} onValueChange={(v) => { setSideFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} trades
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-primary/5 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select onValueChange={(v) => handleBulkTag(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Bulk tag" />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={paged.length > 0 && selected.size === paged.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortHeader field="closedAt">Closed</SortHeader>
                <SortHeader field="symbol">Symbol</SortHeader>
                <TableHead>Side</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <SortHeader field="pnl">Net P&L</SortHeader>
                <TableHead>R</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    No trades match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((trade) => {
                  const pnl = calcNetPnl(trade.executions, trade.side);
                  const outcome = calcTradeOutcome(trade.executions);
                  const r = calcRMultiple(trade, trade.executions);
                  const qty = calcTotalQuantity(trade.executions);
                  const entry = calcAvgEntryPrice(trade.executions);
                  const exit = calcAvgExitPrice(trade.executions);

                  return (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(trade.id)}
                          onCheckedChange={() => toggleSelect(trade.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {trade.closedAt ? format(trade.closedAt, 'MMM d, HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="font-semibold">{trade.symbol}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${trade.side === 'long' ? 'text-profit' : 'text-loss'}`}
                        >
                          {trade.side === 'long' ? 'LONG' : 'SHORT'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            outcome === 'win'
                              ? 'bg-profit/10 text-profit'
                              : outcome === 'loss'
                                ? 'bg-loss/10 text-loss'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {trade.status === 'open' ? 'Open' : outcome}
                        </span>
                      </TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell>${entry.toFixed(2)}</TableCell>
                      <TableCell>{exit > 0 ? `$${exit.toFixed(2)}` : '—'}</TableCell>
                      <TableCell>
                        <PnLDisplay value={pnl} currency={currency} size="sm" />
                      </TableCell>
                      <TableCell>
                        {r !== null ? (
                          <span className={r >= 0 ? 'text-profit' : 'text-loss'}>
                            {r.toFixed(2)}R
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tags
                            .filter((tag) => {
                              return trade.id && tag.id;
                            })
                            .slice(0, 1)
                            .map((tag) => (
                              <TagBadge key={tag.id} tag={tag} />
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingBulkDelete}
        title={`Delete ${selected.size} trade${selected.size === 1 ? '' : 's'}?`}
        description="The selected trades and their executions will be removed. This cannot be undone."
        confirmLabel={`Delete ${selected.size} trade${selected.size === 1 ? '' : 's'}`}
        destructive
        onConfirm={() => void runBulkDelete()}
        onCancel={() => setConfirmingBulkDelete(false)}
      />
    </div>
  );
}
