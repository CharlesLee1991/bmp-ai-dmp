import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// 오디언스 카트/묶음 서버 저장 — de_dmp_audience_carts
// 컨벤션: personas 라우트와 동일 (dmp_token 쿠키 인증 + anon key REST, RLS 활성 테이블)
// 접근: 활성 카트(cart)=본인만 · 저장/송출 묶음(saved/submitted)=admin 전체·advertiser 본인.

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

// GET: admin → 본인 활성카트 + 전체 저장/송출 묶음 / advertiser → 본인 것만
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const filter = user.role === "admin"
      ? `or=(user_id.eq.${user.id},status.in.(saved,submitted))`
      : `user_id=eq.${user.id}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?select=*&${filter}&order=updated_at.desc`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true, data: await res.json() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

async function fetchRow(id: string): Promise<any | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?id=eq.${encodeURIComponent(id)}&select=user_id,user_name`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

// POST: 업서트 (id 기준). 생성자(user_id/user_name)는 최초 저장 시 확정, 이후 보존.
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const c = await req.json();
    if (!c?.id || typeof c.id !== "string") {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }
    // 기존 행이면 소유자 보존 + 권한 확인(소유자 또는 admin만 수정)
    const existing = await fetchRow(c.id);
    let ownerId = user.id, ownerName = user.display_name;
    if (existing) {
      if (existing.user_id !== user.id && user.role !== "admin") {
        return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
      }
      ownerId = existing.user_id;
      ownerName = existing.user_name || ownerName;
    }
    const tags = Array.isArray(c.tags)
      ? Array.from(new Set(c.tags.map((t: any) => String(t).trim().slice(0, 20)).filter(Boolean))).slice(0, 10)
      : [];
    const row = {
      id: c.id,
      user_id: ownerId,
      user_name: ownerName,
      name: c.name ? String(c.name).slice(0, 80) : null,
      status: ["cart", "saved", "submitted"].includes(c.status) ? c.status : "cart",
      items: Array.isArray(c.items) ? c.items.slice(0, 20) : [],
      combine: "union",
      label: c.label ? String(c.label).slice(0, 40) : null,
      tags,
      memo: c.memo ? String(c.memo).slice(0, 500) : null,
      ...(c.last_sent_at !== undefined ? { last_sent_at: c.last_sent_at } : {}),
      ...(typeof c.send_count === "number" ? { send_count: c.send_count } : {}),
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

// DELETE: ?id= — admin은 전체, advertiser는 본인 소유만
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  try {
    const scope = user.role === "admin" ? "" : `&user_id=eq.${user.id}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_audience_carts?id=eq.${encodeURIComponent(id)}${scope}`,
      { method: "DELETE", headers: headers() },
    );
    if (!res.ok) return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
