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
  type: "filter" | "persona";
  label: string;                    // 사람이 읽는 이름
  summary: string;                  // 필터 요약(한글)
  sourceTab: string;                // 담은 화면
  filters: Record<string, string>;  // EF 전송용 평탄 스키마 (동결)
  personaId?: string;
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
