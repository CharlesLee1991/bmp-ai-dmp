"use client";
import { useState } from "react";
import { FlaskConical, Users, AlertTriangle } from "lucide-react";

// P3 AI 오디언스 탐색 패널 (T-DMP-AI-EVOLUTION)
// 자연어 → SQL 생성(검토) → [승인]시에만 BQ 오디언스 테이블 생성 (HITL 게이트).
// 기존 "캠페인 타겟 찾기"(필터 추천)와 별개 — 자유 조건 SQL 기반.
export default function AiExplore() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  const call = async (payload: any) => {
    const res = await fetch("/api/ai-explore", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const create = async () => {
    setLoading(true); setErr(""); setR(null);
    try {
      const d = await call({ action: "create", query: text });
      if (d.error && !d.request_id) setErr(String(d.error));
      setR(d);
      // est_rows 자동채움: create 성공 시 preview(COUNT) 자동 체이닝 — 실패해도 무해(수동 버튼 유지)
      if (d.request_id && d.est_rows == null) {
        try { const p = await call({ action: "preview", request_id: d.request_id }); setR((prev: any) => ({ ...prev, est_rows: p.est_rows })); } catch { /* noop */ }
      }
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const act = async (action: "approve" | "reject") => {
    if (!r?.request_id) return;
    if (action === "approve" && !confirm("이 SQL을 실행해 오디언스 테이블을 생성합니다. 승인할까요?")) return;
    setActing(true);
    try {
      const d = await call({ action, request_id: r.request_id });
      setR({ ...r, ...d });
    } catch (e: any) { setErr(e.message); }
    finally { setActing(false); }
  };

  const statusColor: Record<string, string> = {
    pending: "var(--badge-warning-fg)", executed: "var(--badge-success-fg)", rejected: "var(--badge-danger-fg)", failed: "var(--badge-danger-fg)", approved: "var(--badge-info-fg)",
  };

  return (
    <div style={{ margin: "12px 28px 0", padding: 18, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--badge-sky-fg)" }}><FlaskConical size={14} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />AI 오디언스 탐색 (SQL · 승인게이트)</div>
        <div style={{ fontSize: 10, color: "var(--sub)" }}>피처스토어 533만 ADID · 승인 전 실행 없음</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--badge-sky-fg)", marginBottom: 10, lineHeight: 1.6 }}>
        ① 원하는 타겟을 문장으로 입력 → ② AI가 SQL로 변환 (검토용 표시) → ③ <b>인원 조회</b>로 규모 확인(선택) → ④ <b>승인</b>을 눌러야만 오디언스가 실제 생성됩니다 (30일 보관 · 거절 시 아무 일도 일어나지 않음)
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="예: 야간활동 70% 이상 30대 / A카테고리 반응예측 오디언스 중 여성 / 전환효율 높은 40대..."
          onKeyDown={e => { if (e.key === "Enter" && text.trim() && !loading) create(); }}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", background: "rgba(255,255,255,.85)" }} />
        <button disabled={!text.trim() || loading} onClick={create}
          style={{ padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer", background: "#0284c7", color: "#fff", border: "none", opacity: (!text.trim() || loading) ? .5 : 1, whiteSpace: "nowrap" }}>
          {loading ? "SQL 생성 중..." : "SQL 생성"}
        </button>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: "var(--badge-danger-fg)" }}><AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />{err}</div>}
      {r?.request_id && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: statusColor[r.status] || "var(--text)" }}>상태: {r.status}</span>
            {r.est_gb != null && <span style={{ color: "var(--sub)" }}>예상 스캔 {r.est_gb}GB</span>}
            {r.est_rows != null && <span style={{ color: "var(--badge-sky-fg)", fontWeight: 700 }}><Users size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />예상 {Number(r.est_rows).toLocaleString()}명</span>}
            {r.result_table && <span style={{ color: "var(--badge-success-fg)", fontWeight: 600 }}>→ dmp_data.{r.result_table}</span>}
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: "var(--text)", color: "var(--border)", fontSize: 11, overflowX: "auto", maxHeight: 180 }}>{r.generated_sql || "(SQL 없음)"}</pre>
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button disabled={acting} onClick={async () => {
                setActing(true);
                try { const d = await call({ action: "preview", request_id: r.request_id }); setR({ ...r, est_rows: d.est_rows }); }
                catch (e: any) { setErr(e.message); } finally { setActing(false); }
              }} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--card)", color: "var(--badge-sky-fg)", border: "1px solid var(--border)" }}>
                {acting ? "조회 중..." : <><Users size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />인원 조회</>}</button>
              <button disabled={acting} onClick={() => act("approve")}
                style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#059669", color: "#fff", border: "none" }}>
                {acting ? "실행 중..." : "✓ 승인 · 오디언스 생성"}</button>
              <button disabled={acting} onClick={() => act("reject")}
                style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--card)", color: "var(--badge-danger-fg)", border: "1px solid var(--border)" }}>✕ 거절</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
