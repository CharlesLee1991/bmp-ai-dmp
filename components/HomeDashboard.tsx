"use client";

/* ══════════════════════════════════════════════════════════════════
   대시보드(홈) — 운영 상태 오버뷰 + 사용자 흐름 가이드 + 시작하기.
   정본: docs/USER-FLOW.md 를 화면으로 시각화. 흐름/화면 변경 시 함께 갱신.
   ══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { P, cardStyle, badge } from "@/lib/theme";
import { fmt } from "@/lib/data";
import type { DmpUser } from "@/lib/auth";
import type { TabId } from "./DmpSidebar";
import {
  UserCog, FlaskConical, ShoppingCart, Boxes, Send, ClipboardList,
  Sparkles, ArrowRight, Users, Rocket, Activity, Database, Wand2,
  SlidersHorizontal, Ticket, TrainFront, CreditCard, ChevronRight,
} from "lucide-react";

const fetchJson = async (url: string, init?: RequestInit) => {
  try { const r = await fetch(url, init); return await r.json(); } catch { return null; }
};

interface Stats { personas: number; targets: number; submitted: number; aiAudiences: number; exports: number; loaded: boolean; }

export default function HomeDashboard({ user, onNavigate }: { user: DmpUser; onNavigate: (t: TabId) => void }) {
  const [s, setS] = useState<Stats>({ personas: 0, targets: 0, submitted: 0, aiAudiences: 0, exports: 0, loaded: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [personas, carts, ai, exports] = await Promise.all([
        fetchJson("/api/personas"),
        fetchJson("/api/carts"),
        fetchJson("/api/ai-explore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) }),
        fetchJson("/api/exports"),
      ]);
      if (!alive) return;
      const cartRows = (carts?.success ? carts.data : []) as any[];
      const saved = cartRows.filter(r => r.status === "saved" || r.status === "submitted");
      setS({
        personas: personas?.success ? personas.data.length : 0,
        targets: saved.length,
        submitted: cartRows.filter(r => r.status === "submitted").length,
        aiAudiences: (ai?.requests || []).filter((h: any) => h.result_table).length,
        exports: (exports?.success ? (exports.data?.length ?? 0) : (Array.isArray(exports) ? exports.length : 0)),
        loaded: true,
      });
    })();
    return () => { alive = false; };
  }, []);

  const hour = 12; // 서버시각 신뢰 금지(정본) — 인사말은 시간 무관 고정
  const greet = "환영합니다";

  return (
    <div style={{ padding: "26px 30px 48px", background: P.bg, minHeight: 600, maxWidth: 1180, margin: "0 auto" }}>

      {/* ── 히어로 + 시작하기 ── */}
      <section style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 22, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, color-mix(in srgb, var(--male) 10%, transparent), color-mix(in srgb, var(--accent) 7%, transparent))", pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: P.accent, textTransform: "uppercase", marginBottom: 8 }}>
            <Sparkles size={13} strokeWidth={2.4} /> DMP Audience Explorer
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: P.text, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            {greet}, {user.display_name} 님
          </h1>
          <p style={{ margin: "8px 0 20px", fontSize: 13.5, color: P.sub, lineHeight: 1.6, maxWidth: 640 }}>
            카드·교통·멤버십·쇼핑 행동 데이터로 <b style={{ color: P.text }}>타겟 오디언스를 정의·생성</b>하고 런컴 지면으로 <b style={{ color: P.text }}>송출</b>합니다.
            아래 두 가지 방법 중 하나로 시작하세요.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StartButton
              icon={UserCog} title="페르소나로 시작하기" desc="조건을 골라 정의 → 담기 → 송출"
              primary onClick={() => onNavigate("persona")}
            />
            <StartButton
              icon={FlaskConical} title="퀵 AI 오디언스로 시작하기" desc="문장 한 번으로 AI가 바로 생성"
              onClick={() => onNavigate("aiexplore")}
            />
          </div>
        </div>
      </section>

      {/* ── 운영 상태 오버뷰 ── */}
      <div style={{ fontSize: 12, fontWeight: 800, color: P.sub, letterSpacing: ".04em", margin: "0 2px 10px" }}>
        <Activity size={13} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />운영 현황
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 26 }}>
        <StatTile icon={UserCog} tone="violet" label="저장된 페르소나" value={s.personas} unit="개" onClick={() => onNavigate("persona")} loaded={s.loaded} />
        <StatTile icon={Boxes} tone="teal" label="생성된 오디언스" value={s.targets + s.aiAudiences} unit="개" sub={`카트 ${s.targets} · AI ${s.aiAudiences}`} onClick={() => onNavigate("targets")} loaded={s.loaded} />
        <StatTile icon={Send} tone="success" label="송출 완료 타겟" value={s.submitted} unit="개" onClick={() => onNavigate("targets")} loaded={s.loaded} />
        <StatTile icon={ClipboardList} tone="sky" label="전송 이력" value={s.exports} unit="건" onClick={() => onNavigate("exports")} loaded={s.loaded} />
      </div>

      {/* ── 사용자 흐름 가이드 ── */}
      <div style={{ fontSize: 12, fontWeight: 800, color: P.sub, letterSpacing: ".04em", margin: "0 2px 10px" }}>
        <Wand2 size={13} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />이렇게 사용하세요 — 오디언스 정의부터 송출까지
      </div>

      {/* 흐름 1 — 정의형 */}
      <FlowRow
        badgeText="흐름 1 · 정의형" tone="violet"
        desc="페르소나·필터로 골라 담아 확정"
        steps={[
          { icon: UserCog, label: "페르소나 정의", tab: "persona" },
          { icon: SlidersHorizontal, label: "오디언스 탐색", tab: "card" },
          { icon: ShoppingCart, label: "카트에 담기", tab: "card" },
          { icon: Boxes, label: "타겟 확정·정리", tab: "targets" },
          { icon: Rocket, label: "송출", tab: "targets" },
        ]}
        onNavigate={onNavigate}
      />

      {/* 흐름 2 — 생성형 */}
      <FlowRow
        badgeText="흐름 2 · 생성형" tone="sky"
        desc="자연어 한 번으로 AI가 바로 생성"
        steps={[
          { icon: FlaskConical, label: "퀵 AI 오디언스", tab: "aiexplore" },
          { icon: Boxes, label: "생성된 오디언스", tab: "targets" },
          { icon: Rocket, label: "송출", tab: "targets" },
        ]}
        onNavigate={onNavigate}
      />

      {/* ── 바로가기 ── */}
      <div style={{ fontSize: 12, fontWeight: 800, color: P.sub, letterSpacing: ".04em", margin: "24px 2px 10px" }}>
        <Database size={13} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />데이터 소스 바로가기
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {[
          { icon: CreditCard, label: "카드 소비", tab: "card" as TabId },
          { icon: TrainFront, label: "교통 이동", tab: "subway" as TabId },
          { icon: Ticket, label: "멤버십", tab: "membership" as TabId },
          { icon: ShoppingCart, label: "쇼핑", tab: "shopping" as TabId },
        ].map(q => (
          <button key={q.tab} onClick={() => onNavigate(q.tab)} style={quickCard()}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.background = P.glow; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.card; }}>
            <q.icon size={16} strokeWidth={2} style={{ color: P.accent }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: P.text }}>{q.label}</span>
            <ChevronRight size={13} strokeWidth={2.2} style={{ marginLeft: "auto", color: P.sub2 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 시작하기 버튼 ── */
function StartButton({ icon: Icon, title, desc, primary, onClick }: { icon: any; title: string; desc: string; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderRadius: 12, cursor: "pointer",
        minWidth: 280, textAlign: "left", transition: "transform .12s, box-shadow .12s",
        background: primary ? "linear-gradient(135deg, var(--male), var(--accent))" : P.card,
        color: primary ? "#fff" : P.text,
        border: primary ? "none" : `1px solid ${P.borderStrong}`,
        boxShadow: primary ? P.shadowMd : "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = P.shadowLg; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = primary ? P.shadowMd : "none"; }}>
      <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, background: primary ? "rgba(255,255,255,.18)" : P.glow, color: primary ? "#fff" : P.accent }}>
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, marginTop: 2, opacity: primary ? .92 : .7 }}>{desc}</span>
      </span>
      <ArrowRight size={18} strokeWidth={2.4} style={{ marginLeft: "auto", flexShrink: 0, opacity: .9 }} />
    </button>
  );
}

/* ── 통계 타일 ── */
function StatTile({ icon: Icon, tone, label, value, unit, sub, onClick, loaded }: { icon: any; tone: string; label: string; value: number; unit: string; sub?: string; onClick: () => void; loaded: boolean }) {
  return (
    <button onClick={onClick} style={{ ...cardStyle, padding: "15px 16px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, transition: "border-color .12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", background: `var(--badge-${tone}-bg)`, color: `var(--badge-${tone}-fg)` }}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <ArrowRight size={14} strokeWidth={2} style={{ color: P.sub2 }} />
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: P.sub, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: P.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {loaded ? fmt(value) : "—"}<span style={{ fontSize: 12, fontWeight: 600, color: P.sub, marginLeft: 3 }}>{unit}</span>
        </div>
        {sub && <div style={{ fontSize: 10, color: P.sub2, marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

/* ── 흐름 행 ── */
function FlowRow({ badgeText, tone, desc, steps, onNavigate }: { badgeText: string; tone: string; desc: string; steps: { icon: any; label: string; tab: TabId }[]; onNavigate: (t: TabId) => void }) {
  return (
    <div style={{ ...cardStyle, padding: "15px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ ...badge(tone as any), fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>{badgeText}</span>
        <span style={{ fontSize: 12, color: P.sub }}>{desc}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {steps.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => onNavigate(st.tab)} title={`${st.label}(으)로 이동`}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 10, cursor: "pointer", border: `1px solid ${P.border}`, background: P.bg, color: P.text, transition: "all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.background = P.glow; e.currentTarget.style.color = P.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.bg; e.currentTarget.style.color = P.text; }}>
              <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", background: P.glow, color: P.accent, flexShrink: 0 }}>
                <st.icon size={13} strokeWidth={2.2} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{st.label}</span>
            </button>
            {i < steps.length - 1 && <ArrowRight size={15} strokeWidth={2.2} style={{ color: P.sub2, flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function quickCard(): React.CSSProperties {
  return { display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, transition: "all .12s", textAlign: "left" };
}
