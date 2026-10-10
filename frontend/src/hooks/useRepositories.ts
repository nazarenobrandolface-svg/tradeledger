import { useLiveQuery } from 'dexie-react-hooks';
import { repositories } from '@/repositories';

export function useAccounts() {
  return useLiveQuery(() => repositories.accounts.getAll(), []) ?? [];
}

export function useDefaultAccount() {
  return useLiveQuery(() => repositories.accounts.getDefault(), []);
}

export function useTradesWithExecutions(
  filters?: Parameters<typeof repositories.trades.getManyWithExecutions>[0]
) {
  return useLiveQuery(
    () => repositories.trades.getManyWithExecutions(filters),
    [JSON.stringify(filters ?? {})],
    undefined
  );
}

export function useOpenTrades() {
  return useLiveQuery(() => repositories.trades.getOpen(), []) ?? [];
}

export function useTradeList() {
  return useLiveQuery(() => repositories.trades.getAll(), []) ?? [];
}

export function useTags() {
  return useLiveQuery(() => repositories.tags.getAll(), []) ?? [];
}

export function useTradeTags() {
  return useLiveQuery(() => repositories.tags.getAllTradeTags(), []) ?? [];
}

export function useNotes() {
  return useLiveQuery(() => repositories.notes.getNotes(), []);
}

export function useNoteFolders() {
  return useLiveQuery(() => repositories.notes.getFolders(), []);
}

export function useNoteSearch(query: string, folderId: string | null) {
  return useLiveQuery(
    () => repositories.notes.searchNotes({ query, folderId }),
    [query, folderId],
    undefined
  );
}

export function useNotesForTrade(tradeId: string | undefined) {
  return useLiveQuery(
    () => (tradeId ? repositories.notes.getNotesForTrade(tradeId) : Promise.resolve([])),
    [tradeId],
    []
  );
}

export function useNotesForDate(date: string | undefined) {
  return useLiveQuery(
    () => (date ? repositories.notes.getNotesForDate(date) : Promise.resolve([])),
    [date],
    []
  );
}

export function useSettings() {
  return useLiveQuery(() => repositories.settings.get(), []);
}
