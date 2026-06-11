import { AppProvider } from '@/app/provider';

import '@/styles/globals.css';

export const metadata = {
  title: 'LedgerLocal',
  description: 'Local-first personal finance cleanup.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
