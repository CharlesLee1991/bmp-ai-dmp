import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/* 런컴 송출 프록시 — EF dmp-target-export를 브라우저가 직접 부르지 않도록 서버에서 중계.
   로그인(dmp_token) 검증 후 서버 전용 X-API-Key를 붙여 전달. 요청·응답 본문은 그대로 통과. */
export const maxDuration = 300;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const EF_URL = `${SUPABASE_URL}/functions/v1/dmp-target-export`;

export async function POST(req: NextRequest) {
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.DMP_MCP_API_KEY || "";
  if (!apiKey) return NextResponse.json({ success: false, error: "DMP_MCP_API_KEY 미설정" }, { status: 500 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: "invalid JSON" }, { status: 400 }); }
  // CSV 다운로드 = ADID 파일 반출 → admin만. 누가 받았는지는 EF가 Storage 객체 경로에 남긴다(requested_by).
  if (body?.mode === "download") {
    if (user.role !== "admin") return NextResponse.json({ success: false, error: "CSV 다운로드는 관리자 계정만 가능합니다" }, { status: 403 });
    body.requested_by = user.id;
  } else {
    delete body.requested_by;
  }

  try {
    const res = await fetch(EF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 });
  }
}
