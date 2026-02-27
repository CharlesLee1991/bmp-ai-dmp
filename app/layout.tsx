import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMP Audience Explorer — BizSpring",
  description: "DMP 오디언스 분석 대시보드 · 카드 이용자 · 대중교통 · 지역별 인구 피라미드",
  openGraph: {
    title: "DMP Audience Explorer",
    description: "BizSpring DMP 오디언스 분석 대시보드",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
