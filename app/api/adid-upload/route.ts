import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    Prefer: "return=minimal",
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
    const adids = Array.from(new Set(raw)); // deduplicate

    if (adids.length === 0) {
      return NextResponse.json({ success: false, error: "No valid ADIDs found" }, { status: 400 });
    }

    // Generate session ID
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Batch insert (max 1000 per request)
    const batchSize = 1000;
    for (let i = 0; i < adids.length; i += batchSize) {
      const batch = adids.slice(i, i + batchSize).map(ads_id => ({
        session_id: sessionId,
        ads_id,
      }));

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/de_dmp_uploaded_audience`, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });
      if (!insertRes.ok) {
        const err = await insertRes.text();
        return NextResponse.json({ success: false, error: `Insert failed: ${err}` }, { status: 500 });
      }
    }

    // Match
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
