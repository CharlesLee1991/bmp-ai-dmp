"use client";

import { useState } from "react";
import { P } from "@/lib/theme";
import { ThemeMenu } from "@/lib/ThemeContext";
import { LogIn, Lock, User as UserIcon, Compass } from "lucide-react";

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

  const inputWrap: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center" };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px 11px 38px", borderRadius: 10,
    border: `1px solid ${P.border}`, background: P.bg, color: P.text,
    fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s",
  };

  return (
    <div style={{
      position: "relative", minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* 프리미엄 앰비언트 배경 */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 50% at 50% 0%, var(--accent-glow), transparent 70%), radial-gradient(50% 40% at 100% 100%, var(--accent-2-glow), transparent 70%)" }} />

      {/* 우상단 테마 토글 */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}><ThemeMenu /></div>

      <div className="dmp-pop" style={{
        position: "relative", zIndex: 1,
        background: P.card, borderRadius: 18, padding: 40, border: `1px solid ${P.border}`,
        width: 400, maxWidth: "90vw", boxShadow: P.shadowLg,
      }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--male), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: P.shadowMd,
          }}><Compass size={38} strokeWidth={2.4} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: P.text, letterSpacing: "-0.03em" }}>
            DMP Audience Explorer
          </h1>
          <p style={{ fontSize: 12, color: P.sub, margin: 0 }}>BizSpring · 오디언스 분석 콘솔</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: P.sub, fontWeight: 600, display: "block", marginBottom: 6 }}>아이디</label>
          <div style={inputWrap}>
            <UserIcon size={16} strokeWidth={2} style={{ position: "absolute", left: 13, color: P.sub2 }} />
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="username"
              autoFocus
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, color: P.sub, fontWeight: 600, display: "block", marginBottom: 6 }}>비밀번호</label>
          <div style={inputWrap}>
            <Lock size={16} strokeWidth={2} style={{ position: "absolute", left: 13, color: P.sub2 }} />
            <input
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 16,
            background: "color-mix(in srgb, var(--danger) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--danger) 32%, transparent)",
            fontSize: 12, color: "var(--danger-strong)", fontWeight: 500,
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: loading ? "default" : "pointer", border: "none",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: loading ? P.border : "linear-gradient(135deg, var(--male), var(--accent))",
            color: loading ? P.sub : "#fff", letterSpacing: "-0.02em", transition: "all .2s",
            boxShadow: loading ? "none" : P.shadowSoft,
          }}
        >{loading ? "로그인 중..." : <><LogIn size={16} strokeWidth={2.2} /> 로그인</>}</button>
      </div>
    </div>
  );
}
