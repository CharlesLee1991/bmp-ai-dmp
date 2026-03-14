import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function GET() {
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/de_dmp_category_code?select=major_category,middle_category,subcategory,sub_code&order=major_category,middle_category,sub_code`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return NextResponse.json({ success: false }, { status: res.status });
    const rows = await res.json();

    // Build hierarchy
    const majorMap: Record<string, { middle: Record<string, string[]>; codes: string[] }> = {};
    for (const r of rows) {
      if (!majorMap[r.major_category]) majorMap[r.major_category] = { middle: {}, codes: [] };
      majorMap[r.major_category].codes.push(String(r.sub_code));
      if (!majorMap[r.major_category].middle[r.middle_category]) {
        majorMap[r.major_category].middle[r.middle_category] = [];
      }
      majorMap[r.major_category].middle[r.middle_category].push(String(r.sub_code));
    }

    const hierarchy = Object.entries(majorMap)
      .map(([major, v]) => ({
        major,
        codeCount: v.codes.length,
        middles: Object.entries(v.middle).map(([mid, codes]) => ({
          middle: mid,
          codeCount: codes.length,
        })),
      }))
      .sort((a, b) => b.codeCount - a.codeCount);

    return NextResponse.json(
      { success: true, data: hierarchy },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
