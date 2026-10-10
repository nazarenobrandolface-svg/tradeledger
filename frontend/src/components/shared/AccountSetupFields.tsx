import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  clampLeverage,
  type AccountType
} from '@/types/trade';

const ACCOUNT_SIZE_PRESETS = [2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 200_000];

function formatAccountSize(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toLocaleString()}k` : `$${value.toLocaleString()}`;
}

interface AccountSetupFieldsProps {
  idPrefix: string;
  type: AccountType;
  onTypeChange: (type: AccountType) => void;
  /** Raw string so the number input stays editable ("" while typing). */
  size: string;
  onSizeChange: (size: string) => void;
  leverage: number;
  onLeverageChange: (leverage: number) => void;
}

export function AccountSetupFields({
  idPrefix,
  type,
  onTypeChange,
  size,
  onSizeChange,
  leverage,
  onLeverageChange
}: AccountSetupFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-type`}>Account Type</Label>
        <Select value={type} onValueChange={(value) => onTypeChange(value as AccountType)}>
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((accountType) => (
              <SelectItem key={accountType} value={accountType}>
                {ACCOUNT_TYPE_LABELS[accountType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-size`}>Account Size</Label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_SIZE_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={size === String(preset) ? 'default' : 'outline'}
              onClick={() => onSizeChange(String(preset))}
            >
              {formatAccountSize(preset)}
            </Button>
          ))}
        </div>
        <Input
          id={`${idPrefix}-size`}
          type="number"
          min={1}
          placeholder="Custom size"
          value={size}
          onChange={(e) => onSizeChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-leverage`}>Leverage</Label>
          <span className="text-sm font-medium tabular-nums">1:{leverage}</span>
        </div>
        <input
          id={`${idPrefix}-leverage`}
          type="range"
          min={MIN_LEVERAGE}
          max={MAX_LEVERAGE}
          step={1}
          value={leverage}
          onChange={(e) => onLeverageChange(clampLeverage(Number(e.target.value)))}
          className="w-full accent-primary"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">1:</span>
          <Input
            type="number"
            min={MIN_LEVERAGE}
            max={MAX_LEVERAGE}
            step={1}
            value={leverage}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) onLeverageChange(clampLeverage(parsed));
            }}
          />
        </div>
      </div>
    </>
  );
}
