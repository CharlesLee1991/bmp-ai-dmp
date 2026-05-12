import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }
  try {
    const sido = req.nextUrl.searchParams.get("sido");
    const sigoongu = req.nextUrl.searchParams.get("sigoongu");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_options_eupmeuandong`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_sido: sido, p_sigoongu: sigoongu }),
    });
    if (!res.ok) return NextResponse.json({ success: false }, { status: res.status });
    const rows = await res.json();
    return NextResponse.json(
      { success: true, data: rows },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
