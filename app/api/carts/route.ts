import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// 오디언스 카트/묶음 서버 저장 — de_dmp_audience_carts
// 컨벤션: personas 라우트와 동일 (dmp_token 쿠키 인증 + anon key REST, RLS 활성 테이블)

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  return token ? await verifyToken(token) : null;
}

// GET: 본인 카트/묶음 목록 (활성 카트 + 저장 묶음 + 송출 기록)
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?select=*&user_id=eq.${user.id}&order=updated_at.desc`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true, data: await res.json() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: 업서트 (id 기준). user_id는 항상 JWT에서 — 타인 카트 조작 차단.
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const c = await req.json();
    if (!c?.id || typeof c.id !== "string") {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }
    const row = {
      id: c.id,
      user_id: user.id,
      name: c.name ? String(c.name).slice(0, 80) : null,
      status: ["cart", "saved", "submitted"].includes(c.status) ? c.status : "cart",
      items: Array.isArray(c.items) ? c.items.slice(0, 20) : [],
      combine: "union",
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?on_conflict=id`,
      { method: "POST", headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(row) },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true, data: (await res.json())[0] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE: ?id= — 본인 소유만
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.id}`,
      { method: "DELETE", headers: headers() },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
