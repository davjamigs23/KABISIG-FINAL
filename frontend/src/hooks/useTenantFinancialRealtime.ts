import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import kabisigApi from '../lib/api';

export function useTenantFinancialRealtime(tenantId: string | undefined, onChange: () => void): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    const channel = client.channel('custom-all-channel');
    for (const table of ['program', 'budget', 'expense']) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` },
        () => {
          if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => onChangeRef.current(), 150);
        },
      );
    }
    channel.subscribe();

    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, [tenantId]);
}
