import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

async function getAnthropicKey(): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (!SUPABASE_ANON_KEY) return "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_get_service_credential`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_service_name: "anthropic" }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return typeof data === "string" ? data : "";
}

export async function POST(req: NextRequest) {
  const ANTHROPIC_API_KEY = await getAnthropicKey();
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { filters, segmentPreview, categories, ageGender, regions, amountBuckets } = body;

    const prompt = `당신은 DMP(Data Management Platform) 광고 타겟팅 전문가입니다.
아래 오디언스 데이터를 분석하고, 광고주에게 제안할 효율 타겟 조합을 추천해주세요.

## 현재 선택된 필터
${filters || "없음 (전체 오디언스)"}

## 세그먼트 프리뷰
- 추정 오디언스: ${segmentPreview?.estimated || "N/A"}명
- 전체 대비: ${segmentPreview?.selectivity || "N/A"}%

## 업종 소분류 TOP 12
${categories || "데이터 없음"}

## 연령 × 성별 분포
${ageGender || "데이터 없음"}

## 지역별 이용자 TOP 10
${regions || "데이터 없음"}

## 결제 금액 구간 분포
${amountBuckets || "데이터 없음"}

---

아래 형식으로 응답해주세요. JSON으로만 응답하고, 다른 텍스트는 포함하지 마세요.

{
  "summary": "이 오디언스의 핵심 특성 요약 (2~3문장)",
  "insights": [
    "인사이트 1",
    "인사이트 2",
    "인사이트 3"
  ],
  "recommendations": [
    {
      "label": "추천안 A 제목",
      "description": "설명",
      "filters": "성별 + 연령 + 업종 등 구체적 조건",
      "estimated_audience": "추정 규모",
      "reason": "이 조합을 추천하는 이유"
    },
    {
      "label": "추천안 B 제목",
      "description": "설명",
      "filters": "구체적 조건",
      "estimated_audience": "추정 규모",
      "reason": "추천 이유"
    },
    {
      "label": "추천안 C 제목",
      "description": "설명",
      "filters": "구체적 조건",
      "estimated_audience": "추정 규모",
      "reason": "추천 이유"
    }
  ]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Claude API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON response
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json({ success: true, analysis: parsed });
    } catch {
      return NextResponse.json({ success: true, analysis: { summary: text, insights: [], recommendations: [] } });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
