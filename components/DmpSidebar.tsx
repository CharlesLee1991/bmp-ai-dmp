"use client";

/* ══════════════════════════════════════════════════════════════════
   DMP 좌측 사이드바 — geocare(AppSidebar) 패턴 이식 (인라인스타일+토큰)
   - 콘텐츠와 독립된 --sidebar-* 토큰 사용(2영역 테마).
   - 선택 하이라이트 = geocare식 bg-sidebar-accent 채움(좌측바 아님).
   - 접힘(아이콘 전용) 토글 · localStorage "dmp-sidebar-collapsed".
   ══════════════════════════════════════════════════════════════════ */

import { P, SB } from "@/lib/theme";
import {
  CreditCard, TrainFront, Bus, Ticket, FlaskConical, ClipboardList,
  BarChart3, TrendingUp, Landmark, ShoppingCart, Settings2, UserCog, Boxes,
  LayoutDashboard, Compass, LogOut, type LucideIcon,
} from "lucide-react";
import type { DmpUser } from "@/lib/auth";

export type TabId =
  | "home" | "card" | "subway" | "bus" | "membership" | "aiexplore" | "persona"
  | "targets" | "exports" | "media" | "spending" | "cards" | "shopping"
  | "sysmap";

export type MenuGroup = "home" | "define" | "explore" | "extract" | "insight" | "system";

// 메뉴 그룹 — 대시보드(개요) → 오디언스 추출 업무 흐름 순:
// 1 타겟 정의(페르소나) → 2 오디언스 탐색(데이터소스별) → 3 추출·전송(생성+이력)
// → 4 성과·인사이트(폐루프+시장) / 시스템 관리(흐름 밖 운영)
export const GROUP_ORDER: MenuGroup[] = ["home", "define", "explore", "extract", "insight", "system"];
export const GROUP_LABEL: Record<MenuGroup, string> = {
  home: "개요",
  define: "1 · 타겟 정의",
  explore: "2 · 오디언스 탐색",
  extract: "3 · 추출 · 전송",
  insight: "4 · 성과 · 인사이트",
  system: "시스템 관리",
};

export const TABS: { id: TabId; label: string; icon: LucideIcon; roles: string[]; group: MenuGroup }[] = [
  // 개요 — 운영 상태·가이드·시작하기
  { id: "home", label: "대시보드", icon: LayoutDashboard, roles: ["admin", "advertiser"], group: "home" },
  // 1 · 타겟 정의 — 흐름의 시작: 누구를 노릴지
  { id: "persona", label: "페르소나", icon: UserCog, roles: ["admin", "advertiser"], group: "define" },
  // 2 · 오디언스 탐색 — 데이터소스별 브라우징·필터 정제
  { id: "card", label: "카드", icon: CreditCard, roles: ["admin", "advertiser"], group: "explore" },
  { id: "subway", label: "지하철", icon: TrainFront, roles: ["admin", "advertiser"], group: "explore" },
  { id: "bus", label: "버스", icon: Bus, roles: ["admin", "advertiser"], group: "explore" },
  { id: "membership", label: "멤버십", icon: Ticket, roles: ["admin", "advertiser"], group: "explore" },
  // 3 · 추출 · 전송 — 퀵 AI 생성(승인 게이트) → 생성된 오디언스(허브) → 전송 이력
  { id: "aiexplore", label: "퀵 AI 오디언스", icon: FlaskConical, roles: ["admin", "advertiser"], group: "extract" },
  { id: "targets", label: "생성된 오디언스", icon: Boxes, roles: ["admin", "advertiser"], group: "extract" },
  { id: "exports", label: "전송 이력", icon: ClipboardList, roles: ["admin", "advertiser"], group: "extract" },
  // 4 · 성과 · 인사이트 — 폐루프 성과 + 시장 인사이트
  { id: "media", label: "매체 성과", icon: BarChart3, roles: ["admin"], group: "insight" },
  { id: "spending", label: "소비 트렌드", icon: TrendingUp, roles: ["admin"], group: "insight" },
  { id: "cards", label: "카드사 비교", icon: Landmark, roles: ["admin"], group: "insight" },
  { id: "shopping", label: "쇼핑상품", icon: ShoppingCart, roles: ["admin"], group: "insight" },
  // 시스템 관리 — 업무 흐름 밖 운영
  { id: "sysmap", label: "분류 맵핑 관리", icon: Settings2, roles: ["admin"], group: "system" },
];

export const TAB_LABEL: Record<TabId, string> = TABS.reduce(
  (a, t) => ((a[t.id] = t.label), a), {} as Record<TabId, string>,
);

const EXPANDED = 232;
const COLLAPSED = 62;
const STORAGE_KEY = "dmp-sidebar-collapsed";

export function DmpSidebar({
  tab, onSelect, user, onLogout, collapsed,
}: {
  tab: TabId;
  onSelect: (id: TabId) => void;
  user: DmpUser;
  onLogout: () => void;
  collapsed: boolean;   // 상단바 토글이 제어(controlled)
}) {
  const isAdmin = user.role === "admin";
  const items = TABS.filter(t => t.roles.includes(user.role));
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
            color: "#fff", boxShadow: P.shadowSoft,
          }}><Compass size={22} strokeWidth={2.4} /></div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: SB.fg, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>DMP Explorer</span>
              <span style={{ fontSize: 9.5, color: SB.fgDim, whiteSpace: "nowrap" }}>BizSpring · Target Audience Manager</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 메뉴 (그룹화) ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "6px 8px" : "8px 10px", display: "flex", flexDirection: "column", gap: collapsed ? 3 : 2 }}>
        {GROUP_ORDER.map((g, gi) => {
          const groupItems = items.filter(t => t.group === g);
          if (!groupItems.length) return null;
          return (
            <div key={g} style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: gi > 0 ? (collapsed ? 4 : 5) : 0 }}>
              {collapsed
                ? (gi > 0 && <div style={{ height: 1, background: SB.border, margin: "2px 8px 4px" }} />)
                : <div style={{ fontSize: 9.5, fontWeight: 700, color: SB.fgDim, letterSpacing: ".07em", padding: "4px 10px 3px" }}>{GROUP_LABEL[g]}</div>
              }
              {groupItems.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(id)}
                    title={collapsed ? label : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 11,
                      justifyContent: collapsed ? "center" : "flex-start",
                      width: "100%", padding: collapsed ? "5px 0" : "5px 11px",
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
          );
        })}
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
