import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title");
  const days = searchParams.get("days") || "30";

  if (!title) {
    return NextResponse.json({ success: false, error: "title required" }, { status: 400 });
  }
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_shopping_product_detail`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_title: title, p_days: parseInt(days) }),
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
