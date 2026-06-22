import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY)
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });

  const body = await req.json();
  const { cat, on_off, sido, sex, age, station_id } = body;

  const rpcBody: Record<string, string> = {};
  if (cat)        rpcBody.p_cat        = cat;
  if (on_off)     rpcBody.p_on_off     = on_off;
  if (sido)       rpcBody.p_sido       = sido;
  if (sex)        rpcBody.p_sex        = sex;
  if (age)        rpcBody.p_age        = age;
  if (station_id) rpcBody.p_station_id = station_id;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_transit_dashboard`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(rpcBody),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ success: false, error: data }, { status: res.status });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
