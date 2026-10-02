import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ThemeProvider } from '@/context/ThemeContext';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'حاسبة الفروقات السعرية',
  description: 'حاسبة يدوية دقيقة لحساب أسعار التعادل وصافي الربح والخسارة لفروقات أسعار العملات مع دعم الوضع العائم والـ PWA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'الفروقات السعرية',
  },
  openGraph: {
    title: 'حاسبة الفروقات السعرية',
    description: 'حاسبة يدوية دقيقة لحساب أسعار التعادل وصافي الربح والخسارة لفروقات أسعار العملات مع دعم الوضع العائم والـ PWA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'حاسبة الفروقات السعرية',
    description: 'حاسبة يدوية دقيقة لحساب أسعار التعادل وصافي الربح والخسارة لفروقات أسعار العملات مع دعم الوضع العائم والـ PWA',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-600 dark:selection:text-amber-200 transition-colors duration-150">
        <ThemeProvider>
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}




