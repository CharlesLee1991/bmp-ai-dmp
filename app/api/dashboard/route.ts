import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  // 1) 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2) 화이트리스트 확인
  const { data: access } = await supabase.rpc("dmp_check_access", { p_email: user.email });
  if (!access?.authorized) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }

  // 3) 대시보드 데이터 조회
  const { searchParams } = req.nextUrl;
  const sido = searchParams.get("sido") || undefined;
  const sex = searchParams.get("sex") || undefined;
  const age_group = searchParams.get("age") || undefined;

  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing config" }, { status: 500 });
  }

  try {
    const body: Record<string, string> = {};
    if (sido) body.p_sido = sido;
    if (sex) body.p_sex = sex;
    if (age_group) body.p_age_group = age_group;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_dashboard_data`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
