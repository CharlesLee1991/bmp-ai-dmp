import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata: Metadata = {
  title: "DMP Audience Explorer — BizSpring",
  description: "DMP 오디언스 분석 대시보드 · 카드 이용자 · 대중교통 · 지역별 인구 피라미드",
  openGraph: {
    title: "DMP Audience Explorer",
    description: "BizSpring DMP 오디언스 분석 대시보드",
    type: "website",
  },
};

// 플래시 방지: 하이드레이션 전에 저장된 2영역 테마(사이드바/콘텐츠)를 <html>에 선반영 (geocare §0.1)
const themeInit = `(function(){try{var raw=localStorage.getItem('dmp-theme-v1');var s=raw?JSON.parse(raw):null;var sb=(s&&s.sidebar)||'dark',ct=(s&&s.content)||'light';var mq=window.matchMedia('(prefers-color-scheme: dark)').matches;var el=document.documentElement;if(ct==='dark'||(ct==='system'&&mq))el.classList.add('dark');el.classList.add((sb==='dark'||(sb==='system'&&mq))?'sidebar-dark':'sidebar-light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
