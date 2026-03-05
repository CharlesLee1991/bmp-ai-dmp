"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const P = {
  bg: "#0c0f1a", card: "#141827", border: "#1e2440",
  text: "#e8ecf4", sub: "#6b7a99", accent: "#00e5c3",
  glow: "rgba(0,229,195,0.12)", red: "#f74f4f"
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    // 1) 화이트리스트 확인
    const { data: access } = await supabase.rpc("dmp_check_access", { p_email: email });
    if (!access?.authorized) {
      setStatus("error");
      setError("접근 권한이 없습니다. 관리자에게 문의하세요.");
      return;
    }

    // 2) Magic link 전송
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setStatus("error");
      setError(authError.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: P.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        background: P.card, border: `1px solid ${P.border}`, borderRadius: 16,
        padding: "48px 40px", width: 400, maxWidth: "90vw"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.accent, letterSpacing: "-0.03em" }}>
            DMP Audience Explorer
          </div>
          <div style={{ fontSize: 12, color: P.sub, marginTop: 8 }}>BizSpring Data Management Platform</div>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <div style={{ color: P.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              메일을 확인하세요
            </div>
            <div style={{ color: P.sub, fontSize: 13, lineHeight: 1.6 }}>
              <strong style={{ color: P.accent }}>{email}</strong>로<br />
              로그인 링크를 전송했습니다.
            </div>
            <button
              onClick={() => { setStatus("idle"); setEmail(""); }}
              style={{
                marginTop: 24, padding: "10px 24px", borderRadius: 8, border: `1px solid ${P.border}`,
                background: "transparent", color: P.sub, cursor: "pointer", fontSize: 12
              }}
            >
              다른 이메일로 시도
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <label style={{ fontSize: 12, color: P.sub, fontWeight: 500, display: "block", marginBottom: 8 }}>
              업무 이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: `1px solid ${P.border}`, background: P.bg, color: P.text,
                fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
            {error && (
              <div style={{ color: P.red, fontSize: 12, marginTop: 8 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 8,
                border: "none", background: P.accent, color: P.bg,
                fontSize: 14, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer",
                opacity: status === "loading" ? 0.6 : 1, transition: "opacity .2s"
              }}
            >
              {status === "loading" ? "확인 중..." : "로그인 링크 받기"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: P.sub }}>
              승인된 이메일만 로그인할 수 있습니다
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
