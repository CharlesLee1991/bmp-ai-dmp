import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // 폐루프 콜드 쿼리(10.5억 스캔) 대비

// 매체별 광고 성과 프록시 — data-worker /dmp/media/* (T-DMP-ACTIVATION Track B)
// 원천: touchAd 일별통계(1.75억)×platform 마스터(105매체). 서버측 X-API-Key 부착.
const WORKER = process.env.DATA_WORKER_URL || "https://data-worker-production-84d4.up.railway.app";
const API_KEY = process.env.DMP_MCP_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const view = sp.get("view") || "performance"; // performance | daily | audiences | audience-ads
    const days = sp.get("days") || "30";
    let url = `${WORKER}/dmp/media/performance?days=${encodeURIComponent(days)}`;
    if (view === "daily") {
      url = `${WORKER}/dmp/media/daily?days=${encodeURIComponent(days)}`;
      const p = sp.get("platform_idx");
      if (p) url += `&platform_idx=${encodeURIComponent(p)}`;
    } else if (view === "audiences") {
      url = `${WORKER}/dmp/audiences`;
    } else if (view === "audience-ads") {
      const t = sp.get("audience_table");
      if (!t) return NextResponse.json({ error: "audience_table required" }, { status: 400 });
      url = `${WORKER}/dmp/audience/${encodeURIComponent(t)}/ad-performance?days=${encodeURIComponent(days)}`;
      const pf = sp.get("platform_idx");
      if (pf) url += `&platform_idx=${encodeURIComponent(pf)}`;
    }
    const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "proxy error" }, { status: 500 });
  }
}
