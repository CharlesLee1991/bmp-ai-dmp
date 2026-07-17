import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// 페르소나(타겟 오디언스 정의 필터세트) 서버 저장 — de_dmp_personas
// 컨벤션: exports 라우트와 동일 (dmp_token 쿠키 인증 + anon key REST, RLS 활성 테이블)

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

// DB row(snake) ↔ 프론트 Persona(camel)
function rowToPersona(r: any) {
  return {
    id: r.id,
    name: r.name,
    color: r.color || "teal",
    filters: r.filters || {},
    filterSummary: r.filter_summary || "",
    lifestyle: r.lifestyle || "",
    estimated: r.estimated ?? undefined,
    createdAt: r.created_at,
  };
}

// GET: 목록 — 광고주는 본인 것만, 관리자는 전체 (exports와 동일 규칙)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const filter = user.role === "advertiser" ? `&user_id=eq.${user.id}` : "";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_personas?select=*&order=created_at.asc${filter}`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    const rows = await res.json();
    return NextResponse.json({ success: true, data: (rows || []).map(rowToPersona) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: 저장(업서트 by id)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const p = await req.json();
    if (!p?.id || !p?.name) return NextResponse.json({ success: false, error: "id/name required" }, { status: 400 });
    const row = {
      id: String(p.id),
      user_id: user.id,
      name: String(p.name).slice(0, 80),
      color: p.color || "teal",
      filters: p.filters || {},
      filter_summary: p.filterSummary || "",
      lifestyle: p.lifestyle || "",
      estimated: typeof p.estimated === "number" ? p.estimated : null,
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/de_dmp_personas?on_conflict=id`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(row),
    });
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ success: true, data: rowToPersona(data[0] || row) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE: ?id=ps_xxx — 광고주는 본인 것만 삭제 가능
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    const own = user.role === "advertiser" ? `&user_id=eq.${user.id}` : "";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/de_dmp_personas?id=eq.${encodeURIComponent(id)}${own}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
