import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { useAccounts } from '@/hooks/useRepositories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Upload, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const CSV_FIELDS = [
  { value: 'symbol', label: 'Symbol' },
  { value: 'side', label: 'Side (Long/Short)' },
  { value: 'openDate', label: 'Open Date' },
  { value: 'closeDate', label: 'Close Date' },
  { value: 'entryPrice', label: 'Entry Price' },
  { value: 'exitPrice', label: 'Exit Price' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'fees', label: 'Fees' },
  { value: 'ignore', label: 'Ignore' }
];

type Step = 'upload' | 'map' | 'preview' | 'done';

export function ImportPage() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const templates = useLiveQuery(() => repositories.importTemplates.getAll(), []) ?? [];

  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [imported, setImported] = useState(0);
  const [importError, setImportError] = useState('');

  const handleFile = useCallback(
    (f: File) => {
      Papa.parse<Record<string, string>>(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const meta = results.meta as { fields?: string[] };
          setHeaders(meta.fields ?? []);
          setRows(results.data);
          const autoMap: Record<string, string> = {};
          for (const field of CSV_FIELDS) {
            if (field.value === 'ignore') continue;
            const found = meta.fields?.find(
              (h) => h.toLowerCase().replace(/[^a-z]/g, '') === field.value.toLowerCase()
            );
            if (found) autoMap[field.value] = found;
          }
          setMapping(autoMap);
          setStep('map');
        }
      });
    },
    []
  );

  const handleImport = async () => {
    if (!accountId) {
      setImportError('Please select an account before importing.');
      return;
    }
    setImportError('');

    let count = 0;
    for (const row of rows) {
      const symbol = row[mapping.symbol ?? '']?.trim();
      if (!symbol) continue;

      const sideStr = (row[mapping.side ?? ''] ?? 'long').toLowerCase();
      const side = sideStr.includes('s') ? 'short' as const : 'long' as const;
      const qty = parseFloat(row[mapping.quantity ?? ''] ?? '1') || 1;
      const entryPrice = parseFloat(row[mapping.entryPrice ?? ''] ?? '0') || 0;
      const exitPrice = parseFloat(row[mapping.exitPrice ?? ''] ?? '0') || 0;
      const fees = parseFloat(row[mapping.fees ?? ''] ?? '0') || 0;
      const openDate = parseDate(row[mapping.openDate ?? '']);
      const closeDate = parseDate(row[mapping.closeDate ?? '']);

      if (entryPrice <= 0) continue;

      const tradeId = generateId();
      const isClosed = exitPrice > 0 && closeDate !== null;

      await repositories.trades.create({
        id: tradeId,
        accountId,
        symbol: symbol.toUpperCase(),
        category: null,
        side,
        status: isClosed ? 'closed' : 'open',
        openedAt: openDate ?? Date.now(),
        closedAt: isClosed ? closeDate : null,
        plannedEntry: null,
        plannedStop: null,
        plannedTarget: null,
        rating: null,
        notes: ''
      });

      await repositories.executions.create({
        tradeId,
        type: 'entry',
        price: entryPrice,
        quantity: qty,
        fees: fees / 2,
        executedAt: openDate ?? Date.now(),
        note: null
      });

      if (isClosed) {
        await repositories.executions.create({
          tradeId,
          type: 'exit',
          price: exitPrice,
          quantity: qty,
          fees: fees / 2,
          executedAt: closeDate!,
          note: null
        });
      }

      count++;
    }

    setImported(count);
    setStep('done');
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    await repositories.importTemplates.create({
      name: templateName.trim(),
      broker: 'Custom',
      columnMapping: mapping,
      hasHeader: true,
      delimiter: ','
    });
    setTemplateName('');
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (t) setMapping(t.columnMapping);
  };

  function parseDate(s: string | undefined): number | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step === 'upload' ? 'font-semibold text-foreground' : ''}>1. Upload</span>
        <ArrowRight className="h-3 w-3" />
        <span className={step === 'map' ? 'font-semibold text-foreground' : ''}>2. Map Columns</span>
        <ArrowRight className="h-3 w-3" />
        <span className={step === 'preview' ? 'font-semibold text-foreground' : ''}>3. Preview</span>
        <ArrowRight className="h-3 w-3" />
        <span className={step === 'done' ? 'font-semibold text-foreground' : ''}>4. Done</span>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline" className="mt-4" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleFile(f);
                };
                input.click();
              }}>
                Browse Files
              </Button>
            </div>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Load Saved Template</Label>
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {CSV_FIELDS.filter((f) => f.value !== 'ignore').map((field) => (
              <div key={field.value} className="grid grid-cols-[200px_1fr] items-center gap-4">
                <Label>{field.label}</Label>
                <Select
                  value={mapping[field.value] ?? 'ignore'}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [field.value]: v === 'ignore' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">— Ignore —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="flex items-end gap-2 border-t pt-4">
              <div className="flex-1 space-y-2">
                <Label>Save as template</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                />
              </div>
              <Button variant="outline" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                Save Template
              </Button>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('preview')}>
                Preview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({rows.length} rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row[mapping.symbol ?? ''] ?? '—'}</TableCell>
                      <TableCell>{row[mapping.side ?? ''] ?? '—'}</TableCell>
                      <TableCell>{row[mapping.entryPrice ?? ''] ?? '—'}</TableCell>
                      <TableCell>{row[mapping.exitPrice ?? ''] ?? '—'}</TableCell>
                      <TableCell>{row[mapping.quantity ?? ''] ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importError && (
              <p role="alert" className="text-sm text-loss">
                {importError}
              </p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('map')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleImport}>
                <Check className="h-4 w-4" />
                Import {rows.length} Trades
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-profit/10">
              <Check className="h-8 w-8 text-profit" />
            </div>
            <h2 className="text-xl font-semibold">Import Complete!</h2>
            <p className="mt-2 text-muted-foreground">
              Successfully imported {imported} trades.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate('/trades')}>View Trades</Button>
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }}>
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
