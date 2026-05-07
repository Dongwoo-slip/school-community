import "./globals.css";
import VisitTracker from "@/components/VisitTracker";

export const metadata = {
  title: "Square | 청주고등학교 커뮤니티",
  description: "청주고등학교 학생들을 위한 커뮤니티 Square",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-dvh">
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
