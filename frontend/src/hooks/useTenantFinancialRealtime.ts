import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import kabisigApi from '../lib/api';

export type TenantRealtimeTable = 'program' | 'budget' | 'expense' | 'documents' | 'announcement' | 'feedback';

const FINANCIAL_TABLES: TenantRealtimeTable[] = ['program', 'budget', 'expense'];

export function useTenantFinancialRealtime(
  tenantIdOrIds: string | readonly string[] | undefined,
  onChange: (tables: readonly TenantRealtimeTable[]) => void,
  tables: readonly TenantRealtimeTable[] = FINANCIAL_TABLES,
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const tablesKey = tables.join(',');
  const tenantIdsKey = (typeof tenantIdOrIds === 'string'
    ? [tenantIdOrIds]
    : tenantIdOrIds || [])
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const accessToken = kabisigApi.getToken();
    const tenantIds = tenantIdsKey.split(',').filter(Boolean);
    if (tenantIds.length === 0 || !url || !anonKey || !accessToken) return;

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    client.realtime.setAuth(accessToken);

    let refreshTimer: number | undefined;
    const changedTables = new Set<TenantRealtimeTable>();
    const channels = tenantIds.map(tenantId => {
      const channel = client.channel(`tenant-${tenantId}-${tablesKey}`);
      for (const table of tablesKey.split(',') as TenantRealtimeTable[]) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` },
          () => {
            changedTables.add(table);
            if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
            refreshTimer = window.setTimeout(() => {
              const tablesToRefresh = Array.from(changedTables);
              changedTables.clear();
              onChangeRef.current(tablesToRefresh);
            }, 150);
          },
        );
      }
      channel.subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Tenant Realtime subscription failed (${tenantId}):`, error || status);
        }
      });
      return channel;
    });

    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      channels.forEach(channel => void client.removeChannel(channel));
    };
  }, [tablesKey, tenantIdsKey]);
}
