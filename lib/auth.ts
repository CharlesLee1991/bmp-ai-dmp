import { SignJWT, jwtVerify } from "jose";

/* 🔒 폴백 없음 — JWT_SECRET 미설정 시 서명·검증 모두 실패 (빌드 시점 throw 방지 위해 lazy) */
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET 미설정 — 토큰 서명/검증 불가 (Vercel env 등록 필요)");
  return new TextEncoder().encode(s);
}

export interface DmpUser {
  id: number;
  username: string;
  role: "admin" | "advertiser";
  display_name: string;
}

export async function signToken(user: DmpUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<DmpUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload as any).user as DmpUser;
  } catch {
    return null;
  }
}
