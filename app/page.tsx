"use client";

import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";
import type { DmpUser } from "@/lib/auth";

export default function Home() {
  const [user, setUser] = useState<DmpUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.user); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f5f7fa", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Pretendard', sans-serif", color: "#718096", fontSize: 13
      }}>로딩 중...</div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
