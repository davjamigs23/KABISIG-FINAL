'use client';

import { useEffect } from 'react';

export default function SupabaseCookieCleanup() {
  useEffect(() => {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0]?.trim();
      if (!name) return;

      const isSupabase = name.startsWith('sb-');
      const isHuge = cookie.length > 4000;
      if (!isSupabase && !isHuge) return;

      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
    });
  }, []);

  return null;
}
