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

export interface CartRow {
  id: string;
  name: string | null;
  status: "cart" | "saved" | "submitted";
  items: CartItem[];
  updated_at?: string;
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
export async function saveBundle(name: string): Promise<boolean> {
  if (!S.cart.length) return false;
  const row: CartRow = { id: "ct_" + Math.random().toString(36).slice(2, 9), name: name.trim().slice(0, 80), status: "saved", items: S.cart };
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
export async function markSubmitted(name: string, items: CartItem[]) {
  const row: CartRow = { id: "ct_" + Math.random().toString(36).slice(2, 9), name, status: "submitted", items };
  S.saved = [row, ...S.saved];
  clearCart();
  try {
    await fetch("/api/carts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
  } catch {}
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
