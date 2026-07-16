"use client";

/* ══════════════════════════════════════════════════════════════════
   공통 카드형 툴팁 (Radix Tooltip 기반) — 앱 전역 기본 툴팁 표준.
   - 기존 native `title=""` 호버 툴팁을 이 컴포넌트로 통일.
   - 카드 톤(cardStyle)·라이트/다크 자동(토큰) · 화살표 포함.
   - content 는 문자열(줄바꿈 \n 지원) 또는 ReactNode.
   - recharts 차트 내부 데이터 툴팁은 성격이 달라 대상 아님(tooltipStyle 유지).
   ══════════════════════════════════════════════════════════════════ */

import * as RTooltip from "@radix-ui/react-tooltip";
import { P } from "@/lib/theme";
import type { ReactNode } from "react";

export function Tip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 150,
  maxWidth = 280,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  maxWidth?: number;
}) {
  if (content == null || content === "") return <>{children}</>;
  return (
    <RTooltip.Provider delayDuration={delay} skipDelayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={8}
            style={{
              maxWidth,
              background: P.card,
              border: `1px solid ${P.border}`,
              borderRadius: 10,
              boxShadow: P.shadowLg,
              color: P.text,
              fontSize: 11.5,
              lineHeight: 1.5,
              padding: "9px 11px",
              zIndex: 9999,
              whiteSpace: "pre-line", // 문자열 \n 을 줄바꿈으로
              userSelect: "none",
            }}
          >
            {content}
            <RTooltip.Arrow width={11} height={6} style={{ fill: P.card }} />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

/* 강제지정분류(하드코딩 오버라이드) 라벨 전용 카드 툴팁 본문.
   시스템관리·업종차트에서 재사용. 코드번호·DB라벨·강제라벨을 모두 노출. */
export function ForcedLabelTipBody({
  code, dbLabel, forcedLabel,
}: { code: string; dbLabel?: string; forcedLabel?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: ".02em",
          padding: "2px 6px", borderRadius: 5,
          background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)",
        }}>강제지정분류</span>
        <span style={{ fontSize: 10, color: P.sub }}>코드 {code}</span>
      </div>
      <TipRow k="DB상 라벨" v={dbLabel || "— (DB 미등록)"} dim={!dbLabel} />
      <TipRow k="강제 라벨" v={forcedLabel || "—"} accent />
    </div>
  );
}

function TipRow({ k, v, dim, accent }: { k: string; v: string; dim?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
      <span style={{ color: P.sub, minWidth: 56 }}>{k}</span>
      <span style={{ color: accent ? P.accent : dim ? P.sub2 : P.text, fontWeight: accent ? 700 : 500 }}>{v}</span>
    </div>
  );
}
