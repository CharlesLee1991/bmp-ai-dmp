"use client";

/* ══════════════════════════════════════════════════════════════════
   강제지정분류(라벨 오버라이드) 로컬 저장소 — 시스템관리 화면 편집용.
   ⚠️ 현 단계: 브라우저 localStorage 영속(기기/브라우저 한정, 서버 미반영).
      DB 영속(정본)은 쓰기 RPC/권한 신설 + PO 승인 후 이 인터페이스를
      그대로 유지한 채 백엔드만 교체 예정(어댑터 지점).
   - namespace 별 code→라벨 맵. (예: "industry" = 업종 소분류 강제라벨)
   - useSyncExternalStore 로 SSR 안전 + 다중 컴포넌트 동기화.
   ══════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dmp-label-overrides-v1";
export type OverrideMap = Record<string, Record<string, string>>; // { ns: { code: label } }

let _cache: OverrideMap | null = null;
const listeners = new Set<() => void>();

function read(): OverrideMap {
  if (_cache) return _cache;
  if (typeof window === "undefined") { _cache = {}; return _cache; }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch { _cache = {}; }
  return _cache!;
}

function write(next: OverrideMap) {
  _cache = next;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  listeners.forEach(l => l());
}

export function getOverrides(ns: string): Record<string, string> {
  return read()[ns] || {};
}

export function setOverride(ns: string, code: string, label: string) {
  const cur = read();
  const nsMap = { ...(cur[ns] || {}) };
  const trimmed = label.trim();
  if (!trimmed) delete nsMap[code]; else nsMap[code] = trimmed;
  write({ ...cur, [ns]: nsMap });
}

export function removeOverride(ns: string, code: string) {
  const cur = read();
  if (!cur[ns]) return;
  const nsMap = { ...cur[ns] };
  delete nsMap[code];
  write({ ...cur, [ns]: nsMap });
}

export function clearOverrides(ns: string) {
  const cur = read();
  write({ ...cur, [ns]: {} });
}

/* 외부 스토어 구독 (useSyncExternalStore용) */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getSnapshot(): OverrideMap { return read(); }
export function getServerSnapshot(): OverrideMap { return {}; }

/* React 훅 — 특정 namespace의 오버라이드 맵을 구독. */
export function useOverrides(ns: string): Record<string, string> {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return all[ns] || EMPTY;
}
const EMPTY: Record<string, string> = {};
