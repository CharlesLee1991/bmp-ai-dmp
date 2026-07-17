"use client";

/* ══════════════════════════════════════════════════════════════════
   강제지정분류(라벨 오버라이드) 저장소 — 시스템관리 화면 편집용.
   ✅ DB 영속: de_dmp_label_overrides (읽기 REST / 쓰기 SECURITY DEFINER RPC,
      app/api/label-overrides 경유 · admin JWT 필수) — 2026-07-17 전환.
   - 모듈 캐시 + useSyncExternalStore 로 SSR 안전 + 다중 컴포넌트 동기화.
   - 쓰기는 낙관적 반영 후 서버 실패 시 롤백(서버 재조회).
   ══════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore, useEffect } from "react";

export type OverrideMap = Record<string, Record<string, string>>; // { ns: { code: label } }

let _cache: OverrideMap = {};
const _loaded = new Set<string>();      // 서버 하이드레이션 완료된 ns
const _loading = new Set<string>();
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function setNs(ns: string, map: Record<string, string>) {
  _cache = { ..._cache, [ns]: map };
  emit();
}

async function hydrate(ns: string) {
  if (_loaded.has(ns) || _loading.has(ns)) return;
  _loading.add(ns);
  try {
    const res = await fetch(`/api/label-overrides?ns=${encodeURIComponent(ns)}`);
    const j = await res.json();
    if (j?.success) {
      const map: Record<string, string> = {};
      for (const r of j.data as { code: string; label: string }[]) map[r.code] = r.label;
      _loaded.add(ns);
      setNs(ns, map);
    }
  } catch { /* 다음 훅 마운트에서 재시도 */ }
  finally { _loading.delete(ns); }
}

/* 서버 실패 시 정합 복구: 강제 재조회 */
async function refetch(ns: string) {
  _loaded.delete(ns);
  await hydrate(ns);
}

export function getOverrides(ns: string): Record<string, string> {
  return _cache[ns] || EMPTY;
}

export function setOverride(ns: string, code: string, label: string) {
  const trimmed = label.trim();
  const nsMap = { ...(_cache[ns] || {}) };
  if (!trimmed) delete nsMap[code]; else nsMap[code] = trimmed;
  setNs(ns, nsMap); // 낙관적 반영
  fetch("/api/label-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ns, code, label: trimmed }),
  }).then((r) => { if (!r.ok) refetch(ns); }).catch(() => refetch(ns));
}

export function removeOverride(ns: string, code: string) {
  setOverride(ns, code, ""); // 빈 라벨 = 서버측 삭제
}

export function clearOverrides(ns: string) {
  setNs(ns, {});
  fetch(`/api/label-overrides?ns=${encodeURIComponent(ns)}`, { method: "DELETE" })
    .then((r) => { if (!r.ok) refetch(ns); }).catch(() => refetch(ns));
}

/* 외부 스토어 구독 (useSyncExternalStore용) */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getSnapshot(): OverrideMap { return _cache; }
export function getServerSnapshot(): OverrideMap { return EMPTY_ALL; }

/* React 훅 — 특정 namespace의 오버라이드 맵을 구독(서버 하이드레이션 포함). */
export function useOverrides(ns: string): Record<string, string> {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { hydrate(ns); }, [ns]);
  return all[ns] || EMPTY;
}
const EMPTY: Record<string, string> = {};
const EMPTY_ALL: OverrideMap = {};
