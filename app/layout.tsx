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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(event) {
                  if (event.message === 'Script error.' || (event.filename && event.filename.indexOf('tradingview') !== -1)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return true;
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-600 dark:selection:text-amber-200 transition-colors duration-150">
        {/* Solution 1: Zero-Flicker Pure HTML/CSS Preloader */}
        <div id="app-splash-preloader" suppressHydrationWarning style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          backgroundColor: '#020617',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          direction: 'rtl',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(245, 158, 11, 0.25)',
            marginBottom: '20px',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            بوت(٢) مراقبة صعود العملات
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '24px' }}>
            الرصد اللحظي • حاسبة التعادل • قناص السكالبينج
          </div>
          <div style={{
            width: '240px',
            height: '5px',
            borderRadius: '999px',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            overflow: 'hidden',
            border: '1px solid rgba(51, 65, 85, 0.6)',
          }}>
            <div style={{
              width: '60%',
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #f59e0b, #10b981)',
            }} />
          </div>
        </div>

        <ThemeProvider>
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}




