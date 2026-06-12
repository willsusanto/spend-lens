import { AppProvider } from '@/app/provider';

import '@/styles/globals.css';

const themeScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem('ledger-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme ?? (prefersDark ? 'dark' : 'light');

    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {
    document.documentElement.classList.remove('dark');
  }
})();
`;

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
