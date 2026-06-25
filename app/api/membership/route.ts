import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY)
    return NextResponse.json({ success: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });

  const body = await req.json();
  const { partner_cd, hour, dow, amt_bucket, sex, age, app_group } = body;

  // ── 적립앱 분기: de_dmp_cube_membership_platform ──
  if (app_group !== undefined) {
    try {
      const qs = app_group
        ? `?app_group=eq.${encodeURIComponent(app_group)}&select=app_group,sex,age_group,ads_id_count`
        : "?select=app_group,sex,age_group,ads_id_count";
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/de_dmp_cube_membership_platform${qs}`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      const rows: { app_group: string; sex: string; age_group: string; ads_id_count: number }[] =
        await pRes.json();

      const byApp: Record<string, number> = {};
      const bySexAge: Record<string, Record<string, number>> = {};
      let total = 0;
      for (const r of rows) {
        const cnt = Number(r.ads_id_count);
        byApp[r.app_group] = (byApp[r.app_group] || 0) + cnt;
        if (!bySexAge[r.age_group]) bySexAge[r.age_group] = {};
        bySexAge[r.age_group][r.sex] = (bySexAge[r.age_group][r.sex] || 0) + cnt;
        total += cnt;
      }
      const app_list = Object.entries(byApp)
        .map(([name, cnt]) => ({ name, cnt }))
        .sort((a, b) => b.cnt - a.cnt);
      const age_gender = Object.entries(bySexAge)
        .map(([a, v]) => ({ age: a, M: v.M || 0, F: v.F || 0 }))
        .sort((a, b) => a.age.localeCompare(b.age));

      return NextResponse.json({
        success: true,
        data: { type: "platform", total_audience: total, app_list, age_gender },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  // ── 기존 멤버십 대시보드 RPC ──
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
