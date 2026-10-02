import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

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
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-200">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}


