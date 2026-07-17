import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/* ══════════════════════════════════════════════════════════════════
   분류 라벨 오버라이드(강제지정분류) API — 시스템관리 > 분류 맵핑 관리.
   - GET    ?ns=industry        : 오버라이드 목록 (로그인 불필요 — 표시용)
   - POST   {ns, code, label}   : upsert (admin 전용). label 빈값 = 해제.
   - DELETE ?ns=industry        : 해당 ns 전체 초기화 (admin 전용)
   저장소: de_dmp_label_overrides (RLS: 읽기만 공개, 쓰기는 SECURITY DEFINER
   RPC dmp_label_override_upsert/clear 로만 — 마이그레이션 2026-07-17)
   ══════════════════════════════════════════════════════════════════ */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  const ns = req.nextUrl.searchParams.get("ns") || "industry";
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_label_overrides?ns=eq.${encodeURIComponent(ns)}&select=code,label,updated_by,updated_at`,
      { headers: HEADERS, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ success: false }, { status: res.status });
    return NextResponse.json({ success: true, data: await res.json() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ success: false, error: "admin only" }, { status: 403 });
  try {
    const { ns, code, label } = await req.json();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_label_override_upsert`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        p_ns: ns || "industry",
        p_code: String(code ?? ""),
        p_label: String(label ?? ""),
        p_updated_by: user.username,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ success: false, error: data }, { status: res.status });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ success: false, error: "admin only" }, { status: 403 });
  const ns = req.nextUrl.searchParams.get("ns") || "industry";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_label_override_clear`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ p_ns: ns }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ success: false, error: data }, { status: res.status });
    return NextResponse.json({ success: true, deleted: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
