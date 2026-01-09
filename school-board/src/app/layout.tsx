import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import VisitTracker from "@/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Board",
  description: "학교 커뮤니티",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="w-full overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh w-full overflow-x-hidden bg-gradient-to-b from-[#071521] via-[#0B2A3A] to-[#071521] text-slate-100`}
      >
        {/* ✅ 오늘 방문자수 집계용 (하루 1번 호출) */}
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
