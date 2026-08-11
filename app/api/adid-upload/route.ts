import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// A-3: 대용량 업로드(≈10만건)는 실측 50초 소요 → 기본 한계 초과 방지
export const maxDuration = 300;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_ANON_KEY) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 500 });
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal,resolution=ignore-duplicates",  // T-ADID-UPLOAD-BUG: ON CONFLICT DO NOTHING
  };

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
    }

    const text = await file.text();
    // Parse: one ADID per line, or comma-separated
    const raw = text.replace(/,/g, "\n").split("\n")
      .map(l => l.trim())
      .filter(l => l.length >= 8 && /^[a-fA-F0-9\-]+$/.test(l));
    const adids = Array.from(new Set(raw)); // client-side deduplicate

    if (adids.length === 0) {
      return NextResponse.json({ success: false, error: "No valid ADIDs found" }, { status: 400 });
    }

    // Generate session ID
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Batch upsert — ON CONFLICT (session_id, ads_id) DO NOTHING (server-side deduplicate)
    // A-3: 순차 → 제한 병렬(동시 5). 실측 11.5만건 51초 → 함수 한계 근접 문제 완화.
    const batchSize = 2000;
    const CONCURRENCY = 5;
    const chunks: string[][] = [];
    for (let i = 0; i < adids.length; i += batchSize) chunks.push(adids.slice(i, i + batchSize));

    const insertChunk = async (chunk: string[]) => {
      const insertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/de_dmp_uploaded_audience?on_conflict=session_id,ads_id`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(chunk.map(ads_id => ({ session_id: sessionId, ads_id }))),
        }
      );
      if (!insertRes.ok) throw new Error(`Insert failed: ${await insertRes.text()}`);
    };

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      await Promise.all(chunks.slice(i, i + CONCURRENCY).map(insertChunk));
    }

    // Match (DISTINCT 기반 집계로 수정된 RPC)
    const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_match_uploaded_ads`, {
      method: "POST",
      headers: { ...headers, Prefer: "" },
      body: JSON.stringify({ p_session_id: sessionId }),
    });

    if (!matchRes.ok) {
      const err = await matchRes.text();
      return NextResponse.json({ success: false, error: `Match failed: ${err}` }, { status: 500 });
    }

    const matchData = await matchRes.json();

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      total_uploaded: matchData.total_uploaded,
      matched: matchData.matched,
      match_rate: matchData.match_rate,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
