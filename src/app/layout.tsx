import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Debug server-side environment variables
console.log('🌍 Server-side env check:', {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <meta name="application-name" content="Foco" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Foco" />
        <meta name="description" content="Streamline your project management with AI-powered insights, real-time collaboration, and intuitive workflows." />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0052CC" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0052CC" />

        <link rel="apple-touch-icon" href="/icons/manifest-icon-192.maskable.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/manifest-icon-192.maskable.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/manifest-icon-512.maskable.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/manifest-icon-192.maskable.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0052CC" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
