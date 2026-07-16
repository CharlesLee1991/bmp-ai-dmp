"use client";

/* ══════════════════════════════════════════════════════════════════
   DMP 좌측 사이드바 — geocare(AppSidebar) 패턴 이식 (인라인스타일+토큰 번역)
   로고 상단 → 세로 메뉴(아이콘+라벨, active=accent) → 하단 계정 푸터.
   접힘(아이콘 전용) 토글 · localStorage "dmp-sidebar-collapsed".
   ══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { P } from "@/lib/theme";
import {
  CreditCard, TrainFront, Bus, Ticket, FlaskConical, ClipboardList,
  BarChart3, TrendingUp, Landmark, ShoppingCart,
  PanelLeftClose, PanelLeftOpen, LogOut, type LucideIcon,
} from "lucide-react";
import type { DmpUser } from "@/lib/auth";

export type TabId =
  | "card" | "subway" | "bus" | "membership" | "aiexplore"
  | "exports" | "media" | "spending" | "cards" | "shopping";

export const TABS: { id: TabId; label: string; icon: LucideIcon; roles: string[] }[] = [
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
];

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
  const w = collapsed ? COLLAPSED : EXPANDED;

  return (
    <aside
      style={{
        width: w, minWidth: w, flexShrink: 0,
        position: "sticky", top: 0, alignSelf: "flex-start",
        height: "100vh", display: "flex", flexDirection: "column",
        background: P.chrome, borderRight: `1px solid ${P.border}`,
        transition: "width .16s ease, min-width .16s ease", zIndex: 40,
      }}
    >
      {/* ── 로고 영역 (h-14 대응) ── */}
      <div style={{
        height: 60, display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "0" : "0 12px 0 14px",
        borderBottom: `1px solid ${P.border}`,
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
              <span style={{ fontSize: 14, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>DMP Explorer</span>
              <span style={{ fontSize: 9.5, color: P.sub2, whiteSpace: "nowrap" }}>BizSpring · Audience</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={toggle} title="사이드바 접기" style={iconBtn()}>
            <PanelLeftClose size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 접힘 상태 펼치기 버튼 */}
      {collapsed && (
        <button onClick={toggle} title="사이드바 펼치기" style={{ ...iconBtn(), margin: "8px auto 2px", width: 34, height: 34 }}>
          <PanelLeftOpen size={17} strokeWidth={2} />
        </button>
      )}

      {/* ── 메뉴 ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "6px 8px" : "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {!collapsed && (
          <div style={{ fontSize: 9.5, fontWeight: 700, color: P.sub2, letterSpacing: ".08em", padding: "6px 8px 4px" }}>메뉴</div>
        )}
        {items.map(({ id, label, icon: Icon }) => {
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
                fontSize: 13, fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
                background: active ? P.glow : "transparent",
                color: active ? P.accent : P.sub,
                boxShadow: active ? `inset 2px 0 0 var(--accent)` : "none",
                transition: "background .13s, color .13s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = P.bgElevated; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 1.9} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </button>
          );
        })}
      </nav>

      {/* ── 계정 푸터 (드롭업 대신 인라인) ── */}
      <div style={{ borderTop: `1px solid ${P.border}`, padding: collapsed ? "8px" : "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isAdmin ? "linear-gradient(135deg, var(--male), var(--accent))" : P.border,
            fontSize: 12, fontWeight: 700, color: isAdmin ? "#fff" : P.sub,
          }}>{user.display_name[0]}</div>
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.display_name}</div>
                <div style={{ fontSize: 9.5, color: P.sub }}>{isAdmin ? "관리자" : "광고주"}</div>
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
    background: "transparent", border: `1px solid ${P.border}`, color: P.sub,
    flexShrink: 0,
  };
}
