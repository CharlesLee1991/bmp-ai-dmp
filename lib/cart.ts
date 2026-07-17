"use client";

/* ══════════════════════════════════════════════════════════════════
   오디언스 카트 (장바구니) 스토어 — P1
   - 조각(CartItem) = 독립 추출 단위. 담을 때 EF 전송용 평탄 filters를 동결 저장
     (페르소나 7속성 축소 스키마 손실 방지 · 담은 시점 정의 고정).
   - 서버 영속: de_dmp_audience_carts (/api/carts) — personas 동기화 패턴.
   - 활성 카트는 사용자당 1개(id "ct_u{userId}"), 저장 묶음은 status='saved'.
   - 결합 v1 = 합집합 고정. 송출은 경로 A(조각별 EF 호출, "#n/N" 접미사) — CartDrawer.
   ══════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore, useEffect } from "react";

export interface CartItem {
  id: string;                       // ci_xxx
  type: "filter" | "persona" | "ai_table";
  label: string;                    // 사람이 읽는 이름
  summary: string;                  // 필터 요약(한글)
  sourceTab: string;                // 담은 화면
  filters: Record<string, string>;  // EF 전송용 평탄 스키마 (동결) — ai_table은 {}
  personaId?: string;
  bqTable?: string;                 // type=ai_table: BQ 오디언스 테이블명(EF bq_audience_table)
  estimated?: number | null;
  dropped?: string[];               // 송출 시 미적용되는 조건(정직 표기: 금액·카드사 등)
  addedAt: string;
}

export interface BundleMeta {
  label?: string | null;   // 분류 라벨 (그룹핑 기준)
  tags?: string[];         // 속성 태그 (≤10, 필터 기준)
  memo?: string | null;    // 메모
}

export interface CartRow extends BundleMeta {
  id: string;
  name: string | null;
  status: "cart" | "saved" | "submitted";
  items: CartItem[];
  user_id?: number;
  user_name?: string | null;
  last_sent_at?: string | null;
  send_count?: number;
  updated_at?: string;
}

export const MAX_TAGS = 10;
/* 태그 정규화: 공백 trim · 빈값/중복 제거 · 최대 10개 · 각 20자 */
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const t of tags) {
    const v = String(t).trim().slice(0, 20);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

interface CartState {
  cart: CartItem[];        // 활성 카트 조각
  saved: CartRow[];        // 저장 묶음(+송출 기록)
  loaded: boolean;
  userId: number | null;
}

let S: CartState = { cart: [], saved: [], loaded: false, userId: null };
const listeners = new Set<() => void>();
function emit() { S = { ...S }; listeners.forEach(l => l()); }

const activeId = () => `ct_u${S.userId}`;
export const newItemId = () => "ci_" + Math.random().toString(36).slice(2, 9);

/* ── 서버 동기화 ── */
async function persistActive() {
  if (S.userId == null) return;
  try {
    await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeId(), status: "cart", items: S.cart }),
    });
  } catch {}
}

let hydrating = false;
export async function hydrateCart(userId: number) {
  if (S.loaded && S.userId === userId) return;
  if (hydrating) return;
  hydrating = true;
  S.userId = userId;
  try {
    const res = await fetch("/api/carts", { cache: "no-store" });
    const d = await res.json();
    if (d?.success && Array.isArray(d.data)) {
      const rows: CartRow[] = d.data;
      const active = rows.find(r => r.status === "cart");
      S.cart = active?.items || [];
      S.saved = rows.filter(r => r.status !== "cart");
      S.loaded = true;
      emit();
    }
  } catch {}
  finally { hydrating = false; }
}

/* ── 액션 (낙관적 반영 + write-through) ── */
export function addToCart(item: Omit<CartItem, "id" | "addedAt">) {
  const full: CartItem = { ...item, id: newItemId(), addedAt: new Date().toISOString() };
  S.cart = [...S.cart, full];
  emit();
  void persistActive();
  return full;
}

export function removeFromCart(itemId: string) {
  S.cart = S.cart.filter(i => i.id !== itemId);
  emit();
  void persistActive();
}

export function clearCart() {
  S.cart = [];
  emit();
  void persistActive();
}

/* 묶음 저장 — 활성 카트 사본을 saved 행으로 (카트는 유지) */
export async function saveBundle(name: string, meta: BundleMeta = {}): Promise<boolean> {
  if (!S.cart.length) return false;
  const row: CartRow = {
    id: "ct_" + Math.random().toString(36).slice(2, 9), name: name.trim().slice(0, 80), status: "saved", items: S.cart,
    label: meta.label?.trim().slice(0, 40) || null, tags: normalizeTags(meta.tags), memo: meta.memo?.slice(0, 500) || null,
  };
  S.saved = [row, ...S.saved];
  emit();
  try {
    const res = await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
    return (await res.json())?.success === true;
  } catch { return false; }
}

/* 송출 완료 기록 — submitted 행 생성 + 활성 카트 비움 */
export async function markSubmitted(name: string, items: CartItem[], meta: BundleMeta = {}) {
  const row: CartRow = {
    id: "ct_" + Math.random().toString(36).slice(2, 9), name, status: "submitted", items,
    label: meta.label?.trim().slice(0, 40) || null, tags: normalizeTags(meta.tags), memo: meta.memo?.slice(0, 500) || null,
  };
  S.saved = [row, ...S.saved];
  clearCart();
  try {
    await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
  } catch {}
}

/* 메타(라벨·태그·메모) 수정 — 저장/송출 묶음 편집 */
export async function updateBundleMeta(id: string, meta: BundleMeta & { name?: string }) {
  const row = S.saved.find(r => r.id === id);
  if (!row) return;
  if (meta.name !== undefined) row.name = meta.name.trim().slice(0, 80) || row.name;
  if (meta.label !== undefined) row.label = meta.label?.trim().slice(0, 40) || null;
  if (meta.tags !== undefined) row.tags = normalizeTags(meta.tags);
  if (meta.memo !== undefined) row.memo = meta.memo?.slice(0, 500) || null;
  S.saved = [...S.saved];
  emit();
  try {
    await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
  } catch {}
}

/* 송출 기록 — 허브에서 저장 묶음 송출 성공 시 last_sent_at·send_count 갱신(상태는 유지=재사용) */
export async function markBundleSent(id: string) {
  const row = S.saved.find(r => r.id === id);
  if (!row) return;
  row.last_sent_at = new Date().toISOString();
  row.send_count = (row.send_count || 0) + 1;
  S.saved = [...S.saved];
  emit();
  try {
    await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
  } catch {}
}

/* 저장된 모든 라벨(그룹핑 자동완성용) */
export function allLabels(): string[] {
  return Array.from(new Set(S.saved.map(r => r.label).filter(Boolean) as string[])).sort();
}
export function allTags(): string[] {
  const s = new Set<string>();
  S.saved.forEach(r => (r.tags || []).forEach(t => s.add(t)));
  return Array.from(s).sort();
}

export async function deleteBundle(id: string) {
  S.saved = S.saved.filter(r => r.id !== id);
  emit();
  try { await fetch(`/api/carts?id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch {}
}

/* 저장 묶음 → 활성 카트로 불러오기 (교체) */
export function loadBundle(id: string) {
  const row = S.saved.find(r => r.id === id);
  if (!row) return;
  S.cart = row.items.map(i => ({ ...i, id: newItemId() }));
  emit();
  void persistActive();
}

/* 묶음 복제 — 같은 조각/메타로 새 saved 행 생성 (이름 " (복제)") */
export async function duplicateBundle(id: string): Promise<boolean> {
  const src = S.saved.find(r => r.id === id);
  if (!src) return false;
  const row: CartRow = {
    id: "ct_" + Math.random().toString(36).slice(2, 9),
    name: ((src.name || "무제") + " (복제)").slice(0, 80),
    status: "saved",
    items: src.items.map(i => ({ ...i, id: newItemId() })),
    label: src.label ?? null, tags: [...(src.tags || [])], memo: src.memo ?? null,
  };
  S.saved = [row, ...S.saved];
  emit();
  try {
    const res = await fetch("/api/carts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
    return (await res.json())?.success === true;
  } catch { return false; }
}

/* 여러 묶음 병합 — 조각 합집합(라벨·id 중복 제거)으로 새 saved 행 생성 */
export async function mergeBundles(ids: string[], name: string, meta: BundleMeta = {}): Promise<boolean> {
  const rows = S.saved.filter(r => ids.includes(r.id));
  if (rows.length < 2) return false;
  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const r of rows) {
    for (const it of r.items) {
      const key = it.type === "ai_table" ? `bq:${it.bqTable}` : `${it.type}:${JSON.stringify(it.filters)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...it, id: newItemId() });
    }
  }
  const mergedTags = Array.from(new Set(rows.flatMap(r => r.tags || [])));
  const row: CartRow = {
    id: "ct_" + Math.random().toString(36).slice(2, 9),
    name: name.trim().slice(0, 80) || "병합 타겟",
    status: "saved",
    items: items.slice(0, 20),
    label: meta.label?.trim().slice(0, 40) || rows[0].label || null,
    tags: normalizeTags(meta.tags?.length ? meta.tags : mergedTags),
    memo: meta.memo?.slice(0, 500) || `병합: ${rows.map(r => r.name).join(" + ")}`,
  };
  S.saved = [row, ...S.saved];
  emit();
  try {
    const res = await fetch("/api/carts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
    return (await res.json())?.success === true;
  } catch { return false; }
}

/* ── 공용 런컴 송출 (드로어·허브 공용) — 조각별 EF 호출 ── */
const DMP_EXPORT_FN_URL = "https://ihzttwgqahhzlrqozleh.supabase.co/functions/v1/dmp-target-export";
const SUPA_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export type SubmitResult = { label: string; ok: boolean; count?: number; error?: string };

export async function runcommSubmit(
  items: CartItem[], name: string, env: "dev" | "prod",
  onProgress?: (done: number, total: number, results: SubmitResult[]) => void,
): Promise<SubmitResult[]> {
  const results: SubmitResult[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const segName = items.length === 1 ? name : `${name} #${i + 1}/${items.length}`;
    const payload = it.type === "ai_table" && it.bqTable
      ? { segment_name: segName, bq_audience_table: it.bqTable, env }
      : { segment_name: segName, filters: it.filters, env };
    try {
      const resp = await fetch(DMP_EXPORT_FN_URL, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_ANON_KEY}` },
        body: JSON.stringify(payload),
      });
      const r = await resp.json();
      const ok = !!r?.success;
      results.push({ label: it.label, ok, count: r?.data?.ads_id_count, error: ok ? undefined : (r?.error || `HTTP ${resp.status}`) });
      if (ok) {
        try {
          await fetch("/api/exports", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              segment_name: segName, filters: it.type === "ai_table" ? { bq_audience_table: it.bqTable || "" } : it.filters,
              audience_count: r?.data?.ads_id_count || 0, env: r?.data?.env || env,
              runcomm_target_id: r?.data?.runcomm_target_id || null,
              status: "success", memo: `카트 묶음: ${name} (${it.label})`, response_data: r,
            }),
          });
        } catch {}
      }
    } catch (e: any) {
      results.push({ label: it.label, ok: false, error: e.message });
    }
    onProgress?.(i + 1, items.length, [...results]);
  }
  return results;
}

/* ── 구독 훅 ── */
function getSnapshot() { return S; }
const SERVER_SNAPSHOT: CartState = { cart: [], saved: [], loaded: false, userId: null };
function getServerSnapshot() { return SERVER_SNAPSHOT; }
export function subscribeCart(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

export function useCart(userId?: number): CartState {
  const state = useSyncExternalStore(subscribeCart, getSnapshot, getServerSnapshot);
  useEffect(() => { if (userId != null) void hydrateCart(userId); }, [userId]);
  return state;
}
