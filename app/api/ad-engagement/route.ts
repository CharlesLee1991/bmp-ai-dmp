import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET() {
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_ad_engagement`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
