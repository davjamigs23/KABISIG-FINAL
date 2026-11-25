import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import kabisigApi from '../lib/api';

export type TenantRealtimeTable = 'program' | 'budget' | 'expense' | 'documents' | 'announcement' | 'feedback';

const FINANCIAL_TABLES: TenantRealtimeTable[] = ['program', 'budget', 'expense'];

export function useTenantFinancialRealtime(
  tenantId: string | undefined,
  onChange: (tables: readonly TenantRealtimeTable[]) => void,
  tables: readonly TenantRealtimeTable[] = FINANCIAL_TABLES,
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const tablesKey = tables.join(',');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const accessToken = kabisigApi.getToken();
    if (!tenantId || !url || !anonKey || !accessToken) return;

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    client.realtime.setAuth(accessToken);

    let refreshTimer: number | undefined;
    const changedTables = new Set<TenantRealtimeTable>();
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
    channel.subscribe();

    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, [tablesKey, tenantId]);
}
