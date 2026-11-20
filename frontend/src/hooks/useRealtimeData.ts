import { useEffect } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

type RealtimeRow = Record<string, unknown> & { id?: string | number };

interface UseRealtimeDataOptions<T extends RealtimeRow> {
  table: string;
  queryKey: QueryKey;
  filter?: string;
  enabled?: boolean;
  updateCache?: boolean;
}

let supabaseClient: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  supabaseClient = url && anonKey
    ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
  return supabaseClient;
}

export function useRealtimeData<T extends RealtimeRow>({
  table,
  queryKey,
  filter,
  enabled = true,
  updateCache = true,
}: UseRealtimeDataOptions<T>): void {
  const queryClient = useQueryClient();
  const queryKeyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel(`realtime-${table}-${queryKeyHash}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          queryClient.setQueryData<T[]>(queryKey, (current = []) => {
            if (!updateCache) return current;
            const next = [...current];
            const newRow = payload.new as T;
            const oldRow = payload.old as T;
            const rowId = newRow?.id ?? oldRow?.id;
            const rowIndex = rowId === undefined
              ? -1
              : next.findIndex(row => row.id === rowId);

            if (payload.eventType === 'DELETE') {
              return rowIndex >= 0 ? next.filter((_, index) => index !== rowIndex) : next;
            }
            if (rowIndex >= 0) {
              next[rowIndex] = { ...next[rowIndex], ...newRow };
            } else {
              next.unshift(newRow);
            }
            return next;
          });
          if (!updateCache) {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, filter, queryClient, queryKeyHash, table, updateCache]);
}
