"use client";

/* ══════════════════════════════════════════════════════════════════
   테마 시스템 (CL UI/UX 표준 §0.1 · §11.4 이식)
   - 모드: light / dark / system (3택)
   - <html>.dark 토글 + localStorage "dmp-theme-v1"
   - DMP는 사이드바가 없는 상단탭 구조 → 단일 통합 테마.
     (토큰은 2영역 확장 가능 구조: globals.css 에 --chrome-* 분리 보유)
   ══════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor, SunMoon } from "lucide-react";
import { P } from "./theme";

export type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "dmp-theme-v1";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({ mode: "system", resolved: "light", setMode: () => {} });
export const useTheme = () => useContext(Ctx);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function applyToDom(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // 초기 로드: localStorage → DOM 동기화
  useEffect(() => {
    let initial: ThemeMode = "system";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark" || saved === "system") initial = saved;
    } catch {}
    setModeState(initial);
    applyToDom(initial);
    setResolved(initial === "dark" || (initial === "system" && systemPrefersDark()) ? "dark" : "light");
  }, []);

  // system 모드일 때 OS 테마 변화 추종
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => { applyToDom("system"); setResolved(systemPrefersDark() ? "dark" : "light"); };
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
    applyToDom(m);
    setResolved(m === "dark" || (m === "system" && systemPrefersDark()) ? "dark" : "light");
  }, []);

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}

/* ── 우상단 테마 미니팝업 (표준 §11.4 공통 세그먼트) ── */
export function ThemeMenu() {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest?.("[data-theme-menu]")) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const opts: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: "라이트", Icon: Sun },
    { id: "dark", label: "다크", Icon: Moon },
    { id: "system", label: "시스템", Icon: Monitor },
  ];

  return (
    <div data-theme-menu style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="테마 변경"
        style={{
          height: 30, padding: "0 12px", borderRadius: 999, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600,
          background: "transparent", border: `1px solid ${P.border}`, color: P.sub,
        }}
      >
        <SunMoon size={15} strokeWidth={2} />
        테마
      </button>
      {open && (
        <div
          className="dmp-pop"
          style={{
            position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 200,
            width: 232, padding: 10, background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 12, boxShadow: P.shadowLg,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub2, letterSpacing: ".06em", marginBottom: 8, paddingLeft: 2 }}>
            테마 모드
          </div>
          <div style={{ display: "flex", gap: 3, borderRadius: 9, background: P.bgElevated, padding: 3 }}>
            {opts.map(({ id, label, Icon }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  style={{
                    flex: 1, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "8px 4px", borderRadius: 7, cursor: "pointer", border: "none",
                    fontSize: 10.5, fontWeight: active ? 700 : 500,
                    background: active ? P.card : "transparent",
                    color: active ? P.accent : P.sub,
                    boxShadow: active ? P.shadowSoft : "none",
                    transition: "all .14s",
                  }}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
