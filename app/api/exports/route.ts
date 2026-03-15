import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

// POST: 전송 이력 저장
export async function POST(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const row = {
      user_id: user.id,
      segment_name: body.segment_name || "Untitled",
      filters: body.filters || {},
      audience_count: body.audience_count || 0,
      env: body.env || "dev",
      runcomm_target_id: body.runcomm_target_id || null,
      status: body.status || "success",
      memo: body.memo || null,
      response_data: body.response_data || {},
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/de_dmp_export_history`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data[0] || data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// GET: 전송 이력 목록
export async function GET(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_export_list`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        p_user_id: user.role === "advertiser" ? user.id : null,
        p_limit: 100,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
