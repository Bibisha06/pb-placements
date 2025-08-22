import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import AuthListener from "@/components/auth/auth-listener";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Point Blank | Student Developer Community',
  description: 'A talent portal for the Point Blank student developer community',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-QP3414742W"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QP3414742W');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} overflow-x-clip w-full max-w-[100vw] min-w-0`}>
        <Providers>
          <AuthListener />
          <div className="flex min-h-screen flex-col w-full max-w-[100vw] min-w-0 overflow-x-clip">
            <Navbar />
            <main className="flex-1 w-full max-w-[100vw] min-w-0 overflow-x-clip">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}