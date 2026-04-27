import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const segments = body.segments || [];
    const shopCategory: string | undefined = body.shop_category;

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_segment_preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_cube: "audience",
        p_segments: segments,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();

    // Apply shopping category filter ratio
    if (shopCategory && data?.success && data?.data) {
      const shopRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_shop_audience_count`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_shop_category: shopCategory }),
      });
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        const matched = shopData?.matched || 0;
        const total = shopData?.total || 1;
        const shopRatio = matched / total;
        data.data.estimated_audience = Math.round(data.data.estimated_audience * shopRatio);
        data.data.selectivity = data.data.total_audience > 0
          ? Math.round((data.data.estimated_audience / data.data.total_audience) * 1000000) / 1000000
          : 0;
        data.data.shop_filter = { matched, total, ratio: Math.round(shopRatio * 10000) / 10000 };
      }
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
