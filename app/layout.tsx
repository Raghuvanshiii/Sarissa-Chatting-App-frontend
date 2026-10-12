import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sarissa — Real-Time Messaging',
  description: 'Sarissa — Where conversations become connections.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Patrick+Hand+SC&family=Caveat:wght@400..700&family=Pacifico&family=Courgette&family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Quicksand:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var token = sessionStorage.getItem('chat_token') || localStorage.getItem('chat_token');
                if (!token) {
                  document.documentElement.classList.remove('dark');
                  return;
                }
                var saved = localStorage.getItem('chat_theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] h-[100dvh] w-full flex flex-col font-handwriting bg-[#FFF5F7] text-[#2D151D] selection:bg-[#FCE7EC] selection:text-[#9F2241] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

