import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY)
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });

  const body = await req.json();
  const { partner_cd, hour, dow, amt_bucket, sex, age } = body;

  const rpcBody: Record<string, string> = {};
  if (partner_cd) rpcBody.p_partner_cd = partner_cd;
  if (hour)       rpcBody.p_hour       = hour;
  if (dow)        rpcBody.p_dow        = dow;
  if (amt_bucket) rpcBody.p_amt_bucket = amt_bucket;
  if (sex)        rpcBody.p_sex        = sex;
  if (age)        rpcBody.p_age        = age;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_membership_dashboard`, {
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
