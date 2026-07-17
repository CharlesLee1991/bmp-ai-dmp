"use client";

/* ══════════════════════════════════════════════════════════════════
   대시보드(홈) — 가이드 영역 + 운영 현황 데이터 영역(2분할).
   정본: docs/USER-FLOW.md 시각화. 흐름/화면 변경 시 함께 갱신.
   가로폭은 다른 화면과 동일(전체폭, padding 28px).
   ══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { P, cardStyle, badge } from "@/lib/theme";
import { fmt, PARTNER_MAP } from "@/lib/data";
import type { DmpUser } from "@/lib/auth";
import type { TabId } from "./DmpSidebar";
import {
  UserCog, FlaskConical, ShoppingCart, Boxes, Send, ClipboardList,
  Sparkles, ArrowRight, Rocket, Activity, Database, Wand2, Compass,
  SlidersHorizontal, Ticket, TrainFront, CreditCard, ChevronRight,
  MapPin, Package, Users, Clock, Bot,
} from "lucide-react";

const fetchJson = async (url: string, init?: RequestInit) => {
  try { const r = await fetch(url, init); return await r.json(); } catch { return null; }
};

interface Row { name: string; users?: number; code?: string }
interface ExpRow { segment_name: string; audience_count: number; env: string; created_at: string; user_name?: string }
interface TgtRow { name: string; label?: string | null; status: string; updated_at?: string; user_name?: string; ai?: boolean }

interface State {
  personas: number; targets: number; submitted: number; aiAudiences: number; exports: number;
  total: number; male: number; female: number;
  regionTop: Row[]; industryTop: Row[];
  recentExports: ExpRow[]; recentTargets: TgtRow[];
  loaded: boolean;
}
const EMPTY: State = { personas: 0, targets: 0, submitted: 0, aiAudiences: 0, exports: 0, total: 0, male: 0, female: 0, regionTop: [], industryTop: [], recentExports: [], recentTargets: [], loaded: false };

export default function HomeDashboard({ user, onNavigate }: { user: DmpUser; onNavigate: (t: TabId) => void }) {
  const [s, setS] = useState<State>(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [personas, carts, ai, exports, dash] = await Promise.all([
        fetchJson("/api/personas"),
        fetchJson("/api/carts"),
        fetchJson("/api/ai-explore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) }),
        fetchJson("/api/exports"),
        fetchJson("/api/dashboard"),
      ]);
      if (!alive) return;
      const cartRows = (carts?.success ? carts.data : []) as any[];
      const saved = cartRows.filter(r => r.status === "saved" || r.status === "submitted");
      const aiRows = (ai?.requests || []).filter((h: any) => h.result_table);
      const expRows = (exports?.success ? exports.data : []) as any[];
      const d = dash?.success ? dash.data : dash?.data || {};
      const sum = d?.summary || {};
      const recentTargets: TgtRow[] = [
        ...saved.map(r => ({ name: r.name || "(이름 없음)", label: r.label, status: r.status, updated_at: r.updated_at, user_name: r.user_name })),
        ...aiRows.map((h: any) => ({ name: h.query_text || h.result_table, status: "생성됨", updated_at: h.created_at, user_name: h.created_by || "AI 생성", ai: true })),
      ].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 6);

      setS({
        personas: personas?.success ? personas.data.length : 0,
        targets: saved.length,
        submitted: cartRows.filter(r => r.status === "submitted").length,
        aiAudiences: aiRows.length,
        exports: Array.isArray(expRows) ? expRows.length : 0,
        total: Number(sum.total || 0), male: Number(sum.male || 0), female: Number(sum.female || 0),
        regionTop: (d?.region || []).slice(0, 5),
        industryTop: (d?.industry || []).slice(0, 5),
        recentExports: (Array.isArray(expRows) ? expRows : []).slice(0, 6),
        recentTargets,
        loaded: true,
      });
    })();
    return () => { alive = false; };
  }, []);

  const mPct = s.total ? Math.round(s.male / (s.male + s.female) * 100) : 0;

  return (
    <div style={{ padding: "22px 28px 48px", background: P.bg, minHeight: 600 }}>

      {/* ═══════════ ① 가이드 영역 ═══════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: P.accent, textTransform: "uppercase", margin: "0 2px 10px" }}>
        <Compass size={13} strokeWidth={2.4} /> 시작하기 · 가이드
      </div>
      <div style={{ borderRadius: 16, border: `1px solid ${P.border}`, background: "linear-gradient(180deg, var(--card-2), var(--card))", padding: 20, marginBottom: 26 }}>
        {/* 히어로 + 시작 버튼 */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: P.accent, marginBottom: 7 }}>
              <Sparkles size={13} strokeWidth={2.4} /> DMP AUDIENCE EXPLORER
            </div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: P.text, letterSpacing: "-0.02em", lineHeight: 1.25 }}>환영합니다, {user.display_name} 님</h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: P.sub, lineHeight: 1.6, maxWidth: 560 }}>
              카드·교통·멤버십·쇼핑 행동 데이터로 <b style={{ color: P.text }}>타겟 오디언스를 정의·생성</b>하고 런컴 지면으로 <b style={{ color: P.text }}>송출</b>합니다. 아래 두 방법 중 하나로 시작하세요.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 300 }}>
            <StartButton icon={UserCog} title="페르소나로 시작하기" desc="조건을 골라 정의 → 담기 → 송출" primary onClick={() => onNavigate("persona")} />
            <StartButton icon={FlaskConical} title="퀵 AI 오디언스로 시작하기" desc="문장 한 번으로 AI가 바로 생성" onClick={() => onNavigate("aiexplore")} />
          </div>
        </div>

        {/* 흐름 가이드 */}
        <FlowRow badgeText="흐름 1 · 정의형" tone="violet" desc="페르소나·필터로 골라 담아 확정"
          steps={[
            { icon: UserCog, label: "페르소나 정의", tab: "persona" },
            { icon: SlidersHorizontal, label: "오디언스 탐색", tab: "card" },
            { icon: ShoppingCart, label: "카트에 담기", tab: "card" },
            { icon: Boxes, label: "타겟 확정·정리", tab: "targets" },
            { icon: Rocket, label: "송출", tab: "targets" },
          ]} onNavigate={onNavigate} />
        <FlowRow badgeText="흐름 2 · 생성형" tone="sky" desc="자연어 한 번으로 AI가 바로 생성"
          steps={[
            { icon: FlaskConical, label: "퀵 AI 오디언스", tab: "aiexplore" },
            { icon: Boxes, label: "생성된 오디언스", tab: "targets" },
            { icon: Rocket, label: "송출", tab: "targets" },
          ]} onNavigate={onNavigate} last />
      </div>

      {/* ═══════════ ② 운영 현황 데이터 영역 ═══════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: P.text, textTransform: "uppercase", margin: "0 2px 10px", paddingTop: 4, borderTop: `1px solid ${P.border}` }}>
        <Activity size={13} strokeWidth={2.4} style={{ color: P.accent }} /> 운영 현황 · 데이터
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: P.sub2, textTransform: "none", letterSpacing: 0 }}>{s.loaded ? "실시간" : "로딩 중…"}</span>
      </div>

      {/* 내 작업 KPI */}
      <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, margin: "10px 2px 8px" }}>내 작업 현황</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatTile icon={UserCog} tone="violet" label="저장된 페르소나" value={s.personas} unit="개" onClick={() => onNavigate("persona")} loaded={s.loaded} />
        <StatTile icon={Boxes} tone="teal" label="생성된 오디언스" value={s.targets + s.aiAudiences} unit="개" sub={`카트 ${s.targets} · AI ${s.aiAudiences}`} onClick={() => onNavigate("targets")} loaded={s.loaded} />
        <StatTile icon={Send} tone="success" label="송출 완료 타겟" value={s.submitted} unit="개" onClick={() => onNavigate("targets")} loaded={s.loaded} />
        <StatTile icon={ClipboardList} tone="sky" label="전송 이력" value={s.exports} unit="건" onClick={() => onNavigate("exports")} loaded={s.loaded} />
      </div>

      {/* 데이터 스냅샷 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, margin: "0 2px 8px" }}>전체 데이터 스냅샷</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1.1fr) minmax(220px, 1.1fr)", gap: 12, marginBottom: 20 }}>
        {/* 총 모수 + 남녀 */}
        <div style={{ ...cardStyle, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: P.sub, marginBottom: 10 }}><Users size={14} strokeWidth={2.2} style={{ color: P.accent }} />전체 오디언스 모수</div>
          <div style={{ fontSize: 27, fontWeight: 900, color: P.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.loaded ? fmt(s.total) : "—"}<span style={{ fontSize: 13, fontWeight: 600, color: P.sub, marginLeft: 3 }}>명</span></div>
          {s.loaded && s.total > 0 && (
            <>
              <div style={{ display: "flex", height: 8, borderRadius: 5, overflow: "hidden", marginTop: 12, background: P.bgElevated }}>
                <div style={{ width: `${mPct}%`, background: "var(--male)" }} />
                <div style={{ width: `${100 - mPct}%`, background: "var(--female)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginTop: 5 }}>
                <span style={{ color: "var(--male)", fontWeight: 700 }}>남 {mPct}% · {fmt(s.male)}</span>
                <span style={{ color: "var(--female)", fontWeight: 700 }}>여 {100 - mPct}% · {fmt(s.female)}</span>
              </div>
            </>
          )}
        </div>
        {/* 지역 TOP */}
        <MiniBars title="지역 TOP 5" icon={MapPin} rows={s.regionTop.map(r => ({ label: r.name.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/도$/, ""), value: r.users || 0 }))} color="var(--series-1)" loaded={s.loaded} onClick={() => onNavigate("card")} />
        {/* 업종 TOP */}
        <MiniBars title="업종 TOP 5" icon={Package} rows={s.industryTop.map(r => ({ label: (PARTNER_MAP as any)[r.code || ""] || r.code || "-", value: r.users || 0 }))} color="var(--series-2)" loaded={s.loaded} onClick={() => onNavigate("card")} />
      </div>

      {/* 최근 활동 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, margin: "0 2px 8px" }}>최근 활동</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {/* 최근 생성된 오디언스 */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <PanelHead icon={Boxes} title="최근 생성된 오디언스" onMore={() => onNavigate("targets")} />
          <div style={{ padding: "4px 6px 8px" }}>
            {!s.loaded && <Empty text="로딩 중…" />}
            {s.loaded && s.recentTargets.length === 0 && <Empty text="아직 생성된 오디언스가 없습니다" />}
            {s.recentTargets.map((t, i) => (
              <div key={i} style={rowStyle()}>
                <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", background: t.ai ? "var(--badge-sky-bg)" : "var(--badge-teal-bg)", color: t.ai ? "var(--badge-sky-fg)" : "var(--badge-teal-fg)", flexShrink: 0 }}>
                  {t.ai ? <Bot size={13} strokeWidth={2.2} /> : <SlidersHorizontal size={13} strokeWidth={2.2} />}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: P.sub2, display: "flex", gap: 6 }}>
                    {t.label && <span style={{ ...badge("violet"), padding: "0 6px", borderRadius: 5, fontWeight: 700 }}>{t.label}</span>}
                    <span>{t.status === "submitted" ? "송출됨" : t.status === "생성됨" ? "AI 생성" : "저장됨"}</span>
                    <span>· {t.user_name || "—"}</span>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: P.sub2, flexShrink: 0 }}>{(t.updated_at || "").slice(5, 10)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 최근 전송 이력 */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <PanelHead icon={ClipboardList} title="최근 전송 이력" onMore={() => onNavigate("exports")} />
          <div style={{ padding: "4px 6px 8px" }}>
            {!s.loaded && <Empty text="로딩 중…" />}
            {s.loaded && s.recentExports.length === 0 && <Empty text="아직 전송 이력이 없습니다" />}
            {s.recentExports.map((e, i) => (
              <div key={i} style={rowStyle()}>
                <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", background: "var(--badge-success-bg)", color: "var(--badge-success-fg)", flexShrink: 0 }}><Send size={12} strokeWidth={2.2} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.segment_name}</div>
                  <div style={{ fontSize: 10, color: P.sub2, display: "flex", gap: 6 }}>
                    <span style={{ ...badge(e.env === "prod" ? "danger" : "info"), padding: "0 6px", borderRadius: 5, fontWeight: 700 }}>{e.env === "prod" ? "상용" : "개발"}</span>
                    <span>{fmt(e.audience_count || 0)}명</span>
                    {e.user_name && <span>· {e.user_name}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: P.sub2, flexShrink: 0 }}>{(e.created_at || "").slice(5, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 데이터 소스 바로가기 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, margin: "22px 2px 8px" }}><Database size={12} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 5, color: P.accent }} />데이터 소스 바로가기</div>
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

/* ── 서브 컴포넌트 ── */
function StartButton({ icon: Icon, title, desc, primary, onClick }: { icon: any; title: string; desc: string; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "transform .12s, box-shadow .12s", background: primary ? "linear-gradient(135deg, var(--male), var(--accent))" : P.card, color: primary ? "#fff" : P.text, border: primary ? "none" : `1px solid ${P.borderStrong}`, boxShadow: primary ? P.shadowMd : "none" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = P.shadowLg; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = primary ? P.shadowMd : "none"; }}>
      <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, background: primary ? "rgba(255,255,255,.18)" : P.glow, color: primary ? "#fff" : P.accent }}><Icon size={19} strokeWidth={2.2} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>{title}</span>
        <span style={{ display: "block", fontSize: 11, marginTop: 2, opacity: primary ? .92 : .7 }}>{desc}</span>
      </span>
      <ArrowRight size={17} strokeWidth={2.4} style={{ flexShrink: 0, opacity: .9 }} />
    </button>
  );
}

function StatTile({ icon: Icon, tone, label, value, unit, sub, onClick, loaded }: { icon: any; tone: string; label: string; value: number; unit: string; sub?: string; onClick: () => void; loaded: boolean }) {
  return (
    <button onClick={onClick} style={{ ...cardStyle, padding: "14px 15px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 7, transition: "border-color .12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", background: `var(--badge-${tone}-bg)`, color: `var(--badge-${tone}-fg)` }}><Icon size={15} strokeWidth={2.2} /></span>
        <ArrowRight size={13} strokeWidth={2} style={{ color: P.sub2 }} />
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: P.sub, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 21, fontWeight: 900, color: P.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{loaded ? fmt(value) : "—"}<span style={{ fontSize: 11.5, fontWeight: 600, color: P.sub, marginLeft: 3 }}>{unit}</span></div>
        {sub && <div style={{ fontSize: 9.5, color: P.sub2, marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

function MiniBars({ title, icon: Icon, rows, color, loaded, onClick }: { title: string; icon: any; rows: { label: string; value: number }[]; color: string; loaded: boolean; onClick: () => void }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <button onClick={onClick} style={{ ...cardStyle, padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "border-color .12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: P.sub, marginBottom: 10 }}><Icon size={14} strokeWidth={2.2} style={{ color: P.accent }} />{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {!loaded && <div style={{ fontSize: 11, color: P.sub2 }}>로딩 중…</div>}
        {loaded && rows.length === 0 && <div style={{ fontSize: 11, color: P.sub2 }}>데이터 없음</div>}
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10.5, color: i < 3 ? P.accent : P.sub, fontWeight: 700, width: 12 }}>{i + 1}</span>
            <span style={{ fontSize: 11, color: P.text, width: 70, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.label}>{r.label}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: P.bgElevated, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(r.value / max) * 100}%`, background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 10, color: P.sub, fontVariantNumeric: "tabular-nums", width: 44, textAlign: "right" }}>{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function FlowRow({ badgeText, tone, desc, steps, onNavigate, last }: { badgeText: string; tone: string; desc: string; steps: { icon: any; label: string; tab: TabId }[]; onNavigate: (t: TabId) => void; last?: boolean }) {
  return (
    <div style={{ ...cardStyle, padding: "13px 16px", marginBottom: last ? 0 : 10, background: P.card }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11, flexWrap: "wrap" }}>
        <span style={{ ...badge(tone as any), fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>{badgeText}</span>
        <span style={{ fontSize: 12, color: P.sub }}>{desc}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {steps.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => onNavigate(st.tab)} title={`${st.label}(으)로 이동`}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${P.border}`, background: P.bg, color: P.text, transition: "all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.background = P.glow; e.currentTarget.style.color = P.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.bg; e.currentTarget.style.color = P.text; }}>
              <span style={{ display: "inline-flex", width: 21, height: 21, borderRadius: 6, alignItems: "center", justifyContent: "center", background: P.glow, color: P.accent, flexShrink: 0 }}><st.icon size={12} strokeWidth={2.2} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{st.label}</span>
            </button>
            {i < steps.length - 1 && <ArrowRight size={14} strokeWidth={2.2} style={{ color: P.sub2, flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHead({ icon: Icon, title, onMore }: { icon: any; title: string; onMore: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderBottom: `1px solid ${P.border}` }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: P.text, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon size={14} strokeWidth={2.2} style={{ color: P.accent }} />{title}</span>
      <button onClick={onMore} style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: P.accent, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>전체 <ChevronRight size={12} strokeWidth={2.4} /></button>
    </div>
  );
}
function Empty({ text }: { text: string }) { return <div style={{ fontSize: 11.5, color: P.sub2, textAlign: "center", padding: "20px 0" }}>{text}</div>; }
function rowStyle(): React.CSSProperties { return { display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", borderRadius: 8 }; }
function quickCard(): React.CSSProperties { return { display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, transition: "all .12s", textAlign: "left" }; }
