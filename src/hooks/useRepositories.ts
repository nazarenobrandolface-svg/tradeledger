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

export function useTags() {
  return useLiveQuery(() => repositories.tags.getAll(), []) ?? [];
}

export function usePlaybooks() {
  return useLiveQuery(() => repositories.playbooks.getAll(), []) ?? [];
}

export function useNotes() {
  return useLiveQuery(() => repositories.notes.getNotes(), []) ?? [];
}

export function useSettings() {
  return useLiveQuery(() => repositories.settings.get(), []);
}
