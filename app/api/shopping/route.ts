import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const days = searchParams.get("days") || "7";
  const gender = searchParams.get("gender") || null;
  const ageGroup = searchParams.get("age_group") || null;
  const limit = searchParams.get("limit") || "100";
  const dateFrom = searchParams.get("from") || null;
  const dateTo = searchParams.get("to") || null;

  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });
  }

  try {
    const body: Record<string, any> = {
      p_days: parseInt(days),
      p_limit: parseInt(limit),
    };
    if (gender) body.p_gender = gender;
    if (ageGroup) body.p_age_group = ageGroup;
    if (dateFrom) body.p_date_from = dateFrom;
    if (dateTo) body.p_date_to = dateTo;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_shopping_products`, {
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
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
