import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const months = searchParams.get("months") || "6";
  const ymFrom = searchParams.get("ym_from") || undefined;
  const ymTo = searchParams.get("ym_to") || undefined;

  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });
  }

  try {
    const body: Record<string, any> = { p_months: parseInt(months) };
    if (ymFrom) body.p_ym_from = ymFrom;
    if (ymTo) body.p_ym_to = ymTo;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_card_comparison`, {
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
