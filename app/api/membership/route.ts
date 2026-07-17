import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// 가맹점 코드(partner_cd) → 한글 업종명 해석용 정본 매핑.
// 정본: de_dmp_category_code(sub_code → subcategory). RPC는 코드만 반환하므로 여기서 라벨을 부착한다.
// 소규모(수백 행) 불변 테이블이라 인스턴스 수명 동안 1회만 조회 후 메모리 캐시.
let _partnerLabelCache: Record<string, string> | null = null;
async function getPartnerLabelMap(): Promise<Record<string, string>> {
  if (_partnerLabelCache) return _partnerLabelCache;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_category_code?select=sub_code,subcategory`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return {};
    const rows: { sub_code: number | string; subcategory: string }[] = await res.json();
    const map: Record<string, string> = {};
    for (const r of rows) map[String(r.sub_code)] = r.subcategory;
    _partnerLabelCache = map; // 성공 시에만 캐시(오류 시 다음 요청에서 재시도)
    return map;
  } catch {
    return {};
  }
}

// 강제지정분류(오버라이드) — 편집 가능 데이터라 캐시 없이 요청마다 조회(소규모 테이블). 실패 시 빈 맵.
async function getIndustryOverrides(): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_label_overrides?ns=eq.industry&select=code,label`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, cache: "no-store" }
    );
    if (!res.ok) return {};
    const rows: { code: string; label: string }[] = await res.json();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.code] = r.label;
    return map;
  } catch {
    return {};
  }
}

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

    // 가맹점 필터(partner_top)의 코드에 한글 업종 라벨 부착 → 화면에서 "4120" 대신 "전자상거래PG" 노출.
    // 우선순위: 강제지정분류(de_dmp_label_overrides) > DB 정본(de_dmp_category_code) > 코드.
    if (data && Array.isArray(data.partner_top)) {
      const [labelMap, overrides] = await Promise.all([getPartnerLabelMap(), getIndustryOverrides()]);
      data.partner_top = data.partner_top.map((p: any) => ({
        ...p,
        partner_name: overrides[String(p.partner_cd)] || labelMap[String(p.partner_cd)] || p.partner_name || p.partner_cd,
      }));
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
