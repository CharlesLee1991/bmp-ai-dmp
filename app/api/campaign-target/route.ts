import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

async function getAnthropicKey(): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/de_admin_credentials?service_name=eq.anthropic&is_active=eq.true&select=api_key_encrypted&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data?.[0]?.api_key_encrypted || "";
}

async function getSegmentCount(segments: any[]): Promise<number> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_segment_preview`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_cube: "audience", p_segments: segments }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.data?.estimated_audience || 0;
  } catch { return 0; }
}

export async function POST(req: NextRequest) {
  const ANTHROPIC_API_KEY = await getAnthropicKey();
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "Missing API key" }, { status: 500 });
  }

  try {
    const { campaign } = await req.json();
    if (!campaign) {
      return NextResponse.json({ success: false, error: "campaign description required" }, { status: 400 });
    }

    // Step 1: Claude generates filter combinations
    const prompt = `당신은 DMP 타겟팅 전문가입니다. 광고 캠페인 설명을 받고, 최적의 오디언스 세그먼트 조합을 추천합니다.

## 사용 가능한 세그먼트 필터

| 필터 | seg_key | 사용 가능한 값 |
|------|---------|--------------|
| 성별 | gender | M, F |
| 연령대 | age | 10s, 20s, 30s, 40s, 50s, 60s_plus |
| 지역 | region | 서울특별시, 경기도, 부산광역시, 인천광역시, 대구광역시, 대전광역시, 경상남도, 경상북도, 충청남도, 전라남도, 강원도, 충청북도, 광주광역시, 전라북도, 세종특별자치시, 제주특별자치도, 울산광역시 |
| 업종 | major_category | 식생활, 유통, 서비스, 교육, 의료/미용, 레포츠/문화/취미, 자동차, 내구재, 주거생활, 여행, 의생활 |
| 금액구간 | amount | under_5k, 5k_10k, 10k_30k, 30k_50k, 50k_100k, 100k_300k, over_300k |
| 카드사 | card_company | KB, NH, BC, SH, LOCA, NHPAY, OCB, SKT, SYRUP |
| 통신사 | telecom | K(KT), T(SKT), U(LG U+) |

## 캠페인 설명
${campaign}

## 지시사항
이 캠페인에 맞는 타겟 오디언스 조합을 3개 추천하세요.
각 조합은 위 세그먼트 필터의 **정확한 값만** 사용해야 합니다. 값을 수정하거나 축약하지 마세요. 예를 들어 "의료"가 아니라 "의료/미용"을 사용하세요.
각 추천안은 서로 다른 타겟 특성을 가져야 합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이:

{
  "campaign_analysis": "캠페인 목표 분석 (2문장)",
  "recommendations": [
    {
      "label": "추천안 이름",
      "description": "왜 이 타겟이 적합한지",
      "segments": [
        {"seg": "gender", "value": "M"},
        {"seg": "age", "value": ["40s", "50s"]},
        {"seg": "amount", "value": "over_300k"}
      ],
      "filter_summary": "남성 · 40~50대 · 30만원 이상"
    },
    ...
  ]
}`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!claudeRes.ok) {
      return NextResponse.json({ success: false, error: `Claude API error` }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try { parsed = JSON.parse(clean); } catch {
      return NextResponse.json({ success: false, error: "Failed to parse AI response" }, { status: 500 });
    }

    // Step 2: Get real segment counts for each recommendation
    const results = [];
    for (const rec of parsed.recommendations || []) {
      const count = await getSegmentCount(rec.segments || []);
      results.push({
        ...rec,
        estimated_audience: count,
      });
    }

    return NextResponse.json({
      success: true,
      campaign,
      analysis: parsed.campaign_analysis,
      recommendations: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
