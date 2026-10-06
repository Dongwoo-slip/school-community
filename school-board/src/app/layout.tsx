import "./globals.css";
import VisitTracker from "@/components/VisitTracker";
import PopupNotice from "@/components/PopupNotice";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata = {
  title: "Square | 청주고등학교 커뮤니티",
  description: "청주고등학교 학생들을 위한 커뮤니티 Square",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=6", type: "image/x-icon", sizes: "any" },
      { url: "/favicon.svg?v=6", type: "image/svg+xml" },
      { url: "/icon-192.png?v=6", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png?v=6", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico?v=6", type: "image/x-icon" }],
    apple: [
      { url: "/apple-touch-icon.png?v=6", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const adsenseClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-title" content="Square" />
        <meta name="theme-color" content="#202020" />
        {adsenseClientId ? <meta name="google-adsense-account" content={adsenseClientId} /> : null}
        {adsenseClientId ? (
          <Script
            id="google-adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className={`${notoSansKr.variable} ${inter.variable} antialiased min-h-dvh`}>
        <VisitTracker />
        <PopupNotice />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
