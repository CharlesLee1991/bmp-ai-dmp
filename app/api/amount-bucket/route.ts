import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sex = searchParams.get("sex") || undefined;
  const age_group = searchParams.get("age") || undefined;
  const os = searchParams.get("os") || undefined;
  const region = searchParams.get("region") || undefined;

  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_amount_distribution`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_sex: sex || null,
      p_age_group: age_group || null,
      p_os: os || null,
      p_region: region || null,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
