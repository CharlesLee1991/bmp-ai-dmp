import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// P3 AI 오디언스 탐색 프록시 — data-worker /dmp/segment/explore (T-DMP-AI-EVOLUTION)
// 기존 /api/campaign-target(필터 추천)과 별개 기능: 자연어→SQL→승인게이트→BQ 오디언스 생성.
const WORKER = process.env.DATA_WORKER_URL || "https://data-worker-production-84d4.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // action: create(기본) | approve | reject | status
    const { action = "create", query, request_id } = body;
    let url = `${WORKER}/dmp/segment/explore`;
    let init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
    if (action === "create") {
      if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
      init.body = JSON.stringify({ query });
    } else if (action === "approve" || action === "reject" || action === "preview") {
      if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });
      url += `/${encodeURIComponent(request_id)}/${action}`;
    } else if (action === "list") {
      init = { method: "GET" };
    } else if (action === "status") {
      if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });
      url += `/${encodeURIComponent(request_id)}`;
      init = { method: "GET" };
    } else {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
    const res = await fetch(url, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "proxy error" }, { status: 500 });
  }
}
