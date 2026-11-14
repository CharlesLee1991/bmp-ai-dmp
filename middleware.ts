import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/* 🔒 /api/* 로그인 강제 — 미들웨어 이전에는 19개 라우트가 dmp_token 검사 없이 열려 있었다
   (Claude 과금 · AI 오디언스 승인(BQ 실행) · ADID 업로드 · 세그먼트 조회를 외부인이 호출 가능).
   예외 = 로그인 전에 불려야 하는 /api/auth/* 뿐. 라우트 안의 기존 verifyToken 검사는 그대로 둔다. */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();
  const token = req.cookies.get("dmp_token")?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
