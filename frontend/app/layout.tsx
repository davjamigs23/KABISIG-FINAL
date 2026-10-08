import type { Metadata } from 'next';
import '../src/index.css';
import SupabaseCookieCleanup from '../src/components/SupabaseCookieCleanup';
import GlobalFormBehavior from '../src/components/GlobalFormBehavior';

export const metadata: Metadata = {
  title: 'Kabisig SK Information System',
  description: 'Frontend portal for Sangguniang Kabataan councils in Naga City.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SupabaseCookieCleanup />
        <GlobalFormBehavior />
        {children}
      </body>
    </html>
  );
}