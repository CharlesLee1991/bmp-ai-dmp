"use client";

/* ══════════════════════════════════════════════════════════════════
   DMP 좌측 사이드바 — geocare(AppSidebar) 패턴 이식 (인라인스타일+토큰)
   - 콘텐츠와 독립된 --sidebar-* 토큰 사용(2영역 테마).
   - 선택 하이라이트 = geocare식 bg-sidebar-accent 채움(좌측바 아님).
   - 접힘(아이콘 전용) 토글 · localStorage "dmp-sidebar-collapsed".
   ══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from "react";
import { P, SB } from "@/lib/theme";
import {
  CreditCard, TrainFront, Bus, Ticket, FlaskConical, ClipboardList,
  BarChart3, TrendingUp, Landmark, ShoppingCart, Settings2,
  ChevronLeft, ChevronRight, LogOut, type LucideIcon,
} from "lucide-react";
import type { DmpUser } from "@/lib/auth";

export type TabId =
  | "card" | "subway" | "bus" | "membership" | "aiexplore"
  | "exports" | "media" | "spending" | "cards" | "shopping"
  | "sysmap";

export const TABS: { id: TabId; label: string; icon: LucideIcon; roles: string[]; group?: string }[] = [
  { id: "card", label: "카드", icon: CreditCard, roles: ["admin", "advertiser"] },
  { id: "subway", label: "지하철", icon: TrainFront, roles: ["admin", "advertiser"] },
  { id: "bus", label: "버스", icon: Bus, roles: ["admin", "advertiser"] },
  { id: "membership", label: "멤버십", icon: Ticket, roles: ["admin", "advertiser"] },
  { id: "aiexplore", label: "AI 탐색", icon: FlaskConical, roles: ["admin", "advertiser"] },
  { id: "exports", label: "전송 이력", icon: ClipboardList, roles: ["admin", "advertiser"] },
  { id: "media", label: "매체 성과", icon: BarChart3, roles: ["admin"] },
  { id: "spending", label: "소비 트렌드", icon: TrendingUp, roles: ["admin"] },
  { id: "cards", label: "카드사 비교", icon: Landmark, roles: ["admin"] },
  { id: "shopping", label: "쇼핑상품", icon: ShoppingCart, roles: ["admin"] },
  { id: "sysmap", label: "분류 맵핑 관리", icon: Settings2, roles: ["admin"], group: "시스템관리" },
];

const DEFAULT_GROUP = "메뉴";

export const TAB_LABEL: Record<TabId, string> = TABS.reduce(
  (a, t) => ((a[t.id] = t.label), a), {} as Record<TabId, string>,
);

const EXPANDED = 232;
const COLLAPSED = 62;
const STORAGE_KEY = "dmp-sidebar-collapsed";

export function DmpSidebar({
  tab, onSelect, user, onLogout,
}: {
  tab: TabId;
  onSelect: (id: TabId) => void;
  user: DmpUser;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "1"); } catch {}
  }, []);
  const toggle = () => setCollapsed(c => {
    const n = !c;
    try { localStorage.setItem(STORAGE_KEY, n ? "1" : "0"); } catch {}
    return n;
  });

  const isAdmin = user.role === "admin";
  const items = TABS.filter(t => t.roles.includes(user.role));
  // 그룹 순서 유지하며 묶기 (group 미지정 = "메뉴")
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup: Record<string, typeof items> = {};
    for (const it of items) {
      const g = it.group || DEFAULT_GROUP;
      if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
      byGroup[g].push(it);
    }
    return order.map(group => ({ group, list: byGroup[group] }));
  }, [items]);
  const w = collapsed ? COLLAPSED : EXPANDED;

  return (
    <aside
      style={{
        width: w, minWidth: w, flexShrink: 0,
        position: "sticky", top: 0, alignSelf: "flex-start",
        height: "100vh", display: "flex", flexDirection: "column",
        background: SB.bg, borderRight: `1px solid ${SB.border}`, color: SB.fg,
        transition: "width .16s ease, min-width .16s ease", zIndex: 40,
      }}
    >
      {/* ── 로고 영역 ── */}
      <div style={{
        height: 60, display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "0" : "0 14px",
        borderBottom: `1px solid ${SB.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, var(--male), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#fff", boxShadow: P.shadowSoft,
          }}>D</div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: SB.fg, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>DMP Explorer</span>
              <span style={{ fontSize: 9.5, color: SB.fgDim, whiteSpace: "nowrap" }}>BizSpring · Audience</span>
            </div>
          )}
        </div>
      </div>

      {/* 접기/펼치기 — 로고 우측에 튀어나온 switch pill (슬라이딩 노브) */}
      <button
        onClick={toggle}
        title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        style={{
          position: "absolute", top: 19, right: -17, zIndex: 46,
          width: 44, height: 22, padding: 0, borderRadius: 999, cursor: "pointer",
          background: collapsed ? SB.accent : "var(--accent)",
          border: `1px solid ${collapsed ? SB.border : "var(--accent-strong)"}`,
          boxShadow: P.shadowMd, transition: "background .16s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: collapsed ? 2 : 23, width: 16, height: 16,
          borderRadius: "50%", background: "#fff", boxShadow: P.shadowSoft,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: collapsed ? SB.fgDim : "var(--accent)", transition: "left .16s",
        }}>
          {collapsed ? <ChevronRight size={11} strokeWidth={2.6} /> : <ChevronLeft size={11} strokeWidth={2.6} />}
        </span>
      </button>

      {/* ── 메뉴 (그룹별) ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "6px 8px" : "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {groups.map(({ group, list }, gi) => (
          <div key={group} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {!collapsed ? (
              <div style={{ fontSize: 9.5, fontWeight: 700, color: SB.fgDim, letterSpacing: ".08em", padding: gi === 0 ? "6px 8px 4px" : "12px 8px 4px" }}>{group}</div>
            ) : gi > 0 ? (
              <div style={{ height: 1, background: SB.border, margin: "7px 6px" }} />
            ) : null}
            {list.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  title={collapsed ? label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    justifyContent: collapsed ? "center" : "flex-start",
                    width: "100%", padding: collapsed ? "9px 0" : "8px 11px",
                    borderRadius: 9, cursor: "pointer", border: "none", textAlign: "left",
                    fontSize: 13, fontWeight: active ? 600 : 500, whiteSpace: "nowrap",
                    background: active ? SB.accent : "transparent",
                    color: active ? SB.accentFg : SB.fg,
                    transition: "background .13s, color .13s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = SB.hover; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={17} strokeWidth={active ? 2.3 : 1.9} style={{ flexShrink: 0 }} />
                  {!collapsed && label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── 계정 푸터 ── */}
      <div style={{ borderTop: `1px solid ${SB.border}`, padding: collapsed ? "8px" : "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isAdmin ? "linear-gradient(135deg, var(--male), var(--accent))" : SB.accent,
            fontSize: 12, fontWeight: 700, color: isAdmin ? "#fff" : SB.fg,
          }}>{user.display_name[0]}</div>
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SB.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.display_name}</div>
                <div style={{ fontSize: 9.5, color: SB.fgDim }}>{isAdmin ? "관리자" : "광고주"}</div>
              </div>
              <button onClick={onLogout} title="로그아웃" style={iconBtn()}>
                <LogOut size={15} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button onClick={onLogout} title="로그아웃" style={{ ...iconBtn(), margin: "8px auto 0", width: 30, height: 30 }}>
            <LogOut size={15} strokeWidth={2} />
          </button>
        )}
      </div>
    </aside>
  );
}

function iconBtn(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 8, cursor: "pointer",
    background: "transparent", border: `1px solid ${SB.border}`, color: SB.fgDim,
    flexShrink: 0,
  };
}
