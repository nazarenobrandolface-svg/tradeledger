import { useEffect, useState } from 'react';
import { repositories } from '@/repositories';
import type { Execution, TradeWithExecutions } from '@/types/trade';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CloseTradeDialogProps {
  trade: TradeWithExecutions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function remainingQuantity(executions: Execution[]): number {
  const entries = executions
    .filter((e) => e.type === 'entry')
    .reduce((sum, e) => sum + e.quantity, 0);
  const exits = executions
    .filter((e) => e.type === 'exit')
    .reduce((sum, e) => sum + e.quantity, 0);
  return entries - exits;
}

export function CloseTradeDialog({ trade, open, onOpenChange }: CloseTradeDialogProps) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fees, setFees] = useState('0');
  const [executedAt, setExecutedAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const remaining = trade ? remainingQuantity(trade.executions) : 0;

  useEffect(() => {
    if (open && trade) {
      setPrice('');
      setQuantity(remaining > 0 ? String(remaining) : '');
      setFees('0');
      setExecutedAt(new Date().toISOString().slice(0, 16));
      setErrors({});
      setSaving(false);
    }
  }, [open, trade, remaining]);

  const handleSubmit = async () => {
    if (!trade || saving) return;

    const parsedPrice = parseFloat(price);
    const parsedQty = parseFloat(quantity);
    const parsedFees = parseFloat(fees || '0');

    const errs: Record<string, string> = {};
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      errs.price = 'Enter a valid exit price';
    }
    if (!quantity || isNaN(parsedQty) || parsedQty <= 0) {
      errs.quantity = 'Enter a valid quantity';
    } else if (parsedQty > remaining) {
      errs.quantity = `Only ${remaining} remaining`;
    }
    if (isNaN(parsedFees) || parsedFees < 0) {
      errs.fees = 'Fees cannot be negative';
    }
    if (!executedAt || isNaN(new Date(executedAt).getTime())) {
      errs.executedAt = 'Enter a valid date and time';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const closedAt = new Date(executedAt).getTime();
      await repositories.executions.create({
        tradeId: trade.id,
        type: 'exit',
        price: parsedPrice,
        quantity: parsedQty,
        fees: parsedFees,
        executedAt: closedAt,
        note: null
      });
      await repositories.trades.update(trade.id, { status: 'closed', closedAt });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close {trade?.symbol} trade</DialogTitle>
          <DialogDescription>
            Record the exit that flattens this position ({remaining} remaining).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="close-price">Exit Price *</Label>
            <Input
              id="close-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoFocus
            />
            {errors.price && <p className="text-xs text-loss">{errors.price}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-qty">Quantity *</Label>
            <Input
              id="close-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {errors.quantity && <p className="text-xs text-loss">{errors.quantity}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-fees">Fees</Label>
            <Input
              id="close-fees"
              type="number"
              step="0.01"
              min="0"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
            {errors.fees && <p className="text-xs text-loss">{errors.fees}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-time">Date &amp; Time *</Label>
            <Input
              id="close-time"
              type="datetime-local"
              value={executedAt}
              onChange={(e) => setExecutedAt(e.target.value)}
            />
            {errors.executedAt && <p className="text-xs text-loss">{errors.executedAt}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Closing…' : 'Close Trade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
