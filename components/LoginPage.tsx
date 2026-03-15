"use client";

import { useState } from "react";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096", accent: "#0d9488",
};

export default function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) { setError("아이디와 비밀번호를 입력하세요"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError("아이디 또는 비밀번호가 올바르지 않습니다");
      }
    } catch {
      setError("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: P.card, borderRadius: 16, padding: 40, border: `1px solid ${P.border}`,
        width: 380, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,.06)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #3b82f6, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff"
          }}>D</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: P.text, letterSpacing: "-0.03em" }}>
            DMP Audience Explorer
          </h1>
          <p style={{ fontSize: 12, color: P.sub, margin: 0 }}>BizSpring · 로그인</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: P.sub, fontWeight: 600, display: "block", marginBottom: 6 }}>아이디</label>
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="username"
            autoFocus
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${P.border}`, background: P.bg, color: P.text,
              fontSize: 14, outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: P.sub, fontWeight: 600, display: "block", marginBottom: 6 }}>비밀번호</label>
          <input
            type="password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${P.border}`, background: P.bg, color: P.text,
              fontSize: 14, outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 12, color: "#dc2626"
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: loading ? "default" : "pointer", border: "none",
            background: loading ? P.border : "linear-gradient(135deg, #3b82f6, #0d9488)",
            color: "#fff", letterSpacing: "-0.02em", transition: "all .2s"
          }}
        >{loading ? "로그인 중..." : "로그인"}</button>
      </div>
    </div>
  );
}
