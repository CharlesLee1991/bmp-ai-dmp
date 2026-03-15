import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dmp-bmp-ai-secret-key-2026");

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
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<DmpUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as any).user as DmpUser;
  } catch {
    return null;
  }
}
