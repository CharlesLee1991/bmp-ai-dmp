"use client";

/* ══════════════════════════════════════════════════════════════════
   2영역 독립 테마 (사이드바 / 콘텐츠) — geocare(ThemeContext) 패턴 이식
   - 콘텐츠 테마 = <html>.dark 토글 (콘텐츠 토큰 + body 포털)
   - 사이드바 테마 = <html>.sidebar-dark / .sidebar-light (--sidebar-* 만 교체, 독립)
   - 지속성: localStorage "dmp-theme-v1" ({sidebar, content}). 기본 = 메뉴(다크)/콘텐츠(라이트)
   ══════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor, SunMoon, PanelLeft, LayoutPanelTop } from "lucide-react";
import { P } from "./theme";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeRegion = "sidebar" | "content";
export interface ThemeState { sidebar: ThemeMode; content: ThemeMode; }

const STORAGE_KEY = "dmp-theme-v1";
const DEFAULT_THEME: ThemeState = { sidebar: "dark", content: "light" };

function readStored(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const p = JSON.parse(raw);
    const ok = (m: unknown): m is ThemeMode => m === "light" || m === "dark" || m === "system";
    return { sidebar: ok(p?.sidebar) ? p.sidebar : DEFAULT_THEME.sidebar, content: ok(p?.content) ? p.content : DEFAULT_THEME.content };
  } catch { return DEFAULT_THEME; }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
function resolve(m: ThemeMode): "light" | "dark" {
  return m === "system" ? (systemPrefersDark() ? "dark" : "light") : m;
}
function applyToDom(s: ThemeState) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("dark", resolve(s.content) === "dark");
  html.classList.toggle("sidebar-dark", resolve(s.sidebar) === "dark");
  html.classList.toggle("sidebar-light", resolve(s.sidebar) === "light");
}

interface ThemeCtx extends ThemeState {
  resolvedSidebar: "light" | "dark";
  resolvedContent: "light" | "dark";
  setRegion: (r: ThemeRegion, m: ThemeMode) => void;
  setAll: (m: ThemeMode) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);
export const useAppTheme = (): ThemeCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppTheme must be used within ThemeProvider");
  return c;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 클라이언트 초기값 = 저장값(lazy). 테마는 <html> 클래스(이펙트)로만 적용 → 하이드레이션 불일치 없음.
  const [state, setState] = useState<ThemeState>(() => (typeof window === "undefined" ? DEFAULT_THEME : readStored()));
  const [, tick] = useState(0);

  useLayoutEffect(() => { applyToDom(state); }, [state]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);

  // system 모드 추종
  useEffect(() => {
    if (state.sidebar !== "system" && state.content !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => { applyToDom(state); tick(t => t + 1); };
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, [state]);

  const setRegion = useCallback((r: ThemeRegion, m: ThemeMode) => setState(prev => ({ ...prev, [r]: m })), []);
  const setAll = useCallback((m: ThemeMode) => setState({ sidebar: m, content: m }), []);

  return (
    <Ctx.Provider value={{ ...state, resolvedSidebar: resolve(state.sidebar), resolvedContent: resolve(state.content), setRegion, setAll }}>
      {children}
    </Ctx.Provider>
  );
}

/* ── 우상단 테마 미니팝업 — 전체 일괄 / 메뉴(사이드바) / 콘텐츠 (geocare §11.4) ── */
const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "라이트", Icon: Sun },
  { mode: "dark", label: "다크", Icon: Moon },
  { mode: "system", label: "시스템", Icon: Monitor },
];

function ModeSegment({ value, onChange }: { value: ThemeMode | null; onChange: (m: ThemeMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, borderRadius: 8, background: P.bgElevated, padding: 3 }}>
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = value === mode;
        return (
          <button key={mode} onClick={(e) => { e.preventDefault(); onChange(mode); }} style={{
            flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
            padding: "6px 4px", borderRadius: 6, cursor: "pointer", border: "none",
            fontSize: 10.5, fontWeight: active ? 700 : 500,
            background: active ? P.card : "transparent",
            color: active ? P.accent : P.sub,
            boxShadow: active ? P.shadowSoft : "none", transition: "all .13s",
          }}>
            <Icon size={13} strokeWidth={2} />{label}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeMenu() {
  const { sidebar, content, setRegion, setAll } = useAppTheme();
  const [open, setOpen] = useState(false);
  const bulk = sidebar === content ? sidebar : null;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.("[data-theme-menu]")) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const labelRow = (Icon: typeof Sun, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: P.sub2, letterSpacing: ".04em", padding: "0 2px 6px" }}>
      <Icon size={12} strokeWidth={2} />{text}
    </div>
  );

  return (
    <div data-theme-menu style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)} title="테마 설정" style={{
        height: 30, padding: "0 12px", borderRadius: 999, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600,
        background: "transparent", border: `1px solid ${P.border}`, color: P.sub,
      }}>
        <SunMoon size={15} strokeWidth={2} />테마
      </button>
      {open && (
        <div className="dmp-pop" style={{
          position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 200,
          width: 250, padding: 12, background: P.card, border: `1px solid ${P.border}`,
          borderRadius: 12, boxShadow: P.shadowLg, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div>
            {labelRow(SunMoon, "전체 일괄")}
            <ModeSegment value={bulk} onChange={setAll} />
          </div>
          <div style={{ height: 1, background: P.border, margin: "-2px 0" }} />
          <div>
            {labelRow(PanelLeft, "메뉴 (사이드바)")}
            <ModeSegment value={sidebar} onChange={(m) => setRegion("sidebar", m)} />
          </div>
          <div>
            {labelRow(LayoutPanelTop, "콘텐츠")}
            <ModeSegment value={content} onChange={(m) => setRegion("content", m)} />
          </div>
        </div>
      )}
    </div>
  );
}
