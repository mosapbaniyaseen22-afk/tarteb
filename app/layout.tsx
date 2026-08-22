import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cairo, Amiri } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });
const amiri = Amiri({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-amiri' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: 'لبيب | منصة طلاب التوجيهي',
  description: 'منصة تعليمية متكاملة لطلاب التوجيهي في الأردن - شرح، تلخيصات، دوسيات، امتحانات، تنظيم وقت، ومساعد ذكي',
  applicationName: 'لبيب',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: 'لبيب',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/labib-logo.jpeg',
    apple: '/labib-logo.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${amiri.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-center" dir="rtl" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
