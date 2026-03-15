import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihzttwgqahhzlrqozleh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmp_auth_login`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_username: username, p_password: password }),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }

    const data = await res.json();
    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error || "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken(data.user);
    const response = NextResponse.json({ success: true, user: data.user });
    response.cookies.set("dmp_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
