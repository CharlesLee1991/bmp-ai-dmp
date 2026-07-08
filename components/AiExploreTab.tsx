"use client";
import { useEffect, useState } from "react";

// AI 탐색 전용 탭 (T-DMP-AI-EVOLUTION) — AX 경험형 DMP 활용
// ① 예시 갤러리(클릭→입력) ② 탐색(SQL 검토·인원조회·승인게이트) ③ 요청 이력
// 카드탭 인라인 패널(AiExplore.tsx)과 병존 — 정리는 추후 검토(PO 결정)

const EXAMPLES: { group: string; icon: string; desc: string; items: string[] }[] = [
  {
    group: "행동 타겟팅", icon: "🕐", desc: "활동 시간·빈도·강도 기반",
    items: [
      "야간 활동 비율 70% 이상인 20~30대",
      "주말 위주로 활동하는 40대 남성",
      "최근 30일 포인트 사용 20회 이상인 헤비유저",
      "가입 1년 넘고 최근 일주일 내 활동한 충성 사용자",
    ],
  },
  {
    group: "전환·반응 (G6)", icon: "⚡", desc: "실제 전환 이력 기반 — 반응하는 사람",
    items: [
      "전환효율 15% 이상이고 최근 30일 내 전환한 사람",
      "A카테고리에서 전환한 이력이 있는 30대",
      "전환 카테고리가 3개 이상인 멀티 전환자",
      "90일 전환 5회 이상 + 야간 활동 60% 이상",
    ],
  },
  {
    group: "AI 모델 결합", icon: "🤖", desc: "룩어라이크·반응예측 오디언스와 교차",
    items: [
      "룩어라이크 쇼핑 오디언스 중 야간 활동 상위인 사람",
      "A카테고리 반응예측 오디언스 중 여성 30~40대",
      "룩어라이크 오디언스와 반응예측 오디언스에 모두 포함된 사람",
    ],
  },
  {
    group: "광고주 시나리오 (AX)", icon: "🎯", desc: "캠페인 상황을 그대로 문장으로",
    items: [
      "뷰티 신제품 캠페인: 쇼핑 비중 높은 2030 여성 중 최근 한 달 활동자",
      "금융앱 설치 캠페인: 카드 사용 잦고 여러 앱을 쓰는 30~50대",
      "야식 배달 프로모션: 야간 활동 80% 이상이고 주말에도 활발한 사람",
      "재구매 유도: 과거 A카테고리 전환자 중 최근 60일간 전환이 없는 사람",
    ],
  },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "승인 대기", color: "#b45309" },
  executed: { label: "생성됨", color: "#047857" },
  approved: { label: "실행 중", color: "#1d4ed8" },
  rejected: { label: "거절", color: "#94a3b8" },
  failed: { label: "실패", color: "#b91c1c" },
};

export default function AiExploreTab() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const call = async (payload: any) => {
    const res = await fetch("/api/ai-explore", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return res.json();
  };

  const loadHistory = async () => {
    setHistLoading(true);
    try { const d = await call({ action: "list" }); setHistory(d.requests || []); }
    catch { /* noop */ }
    finally { setHistLoading(false); }
  };
  useEffect(() => { loadHistory(); }, []);

  const create = async (q?: string) => {
    const query = (q ?? text).trim();
    if (!query) return;
    setLoading(true); setErr(""); setR(null);
    try {
      const d = await call({ action: "create", query });
      if (d.error && !d.request_id) setErr(String(d.error));
      setR(d);
      // est_rows 자동채움: create 성공 시 preview(COUNT) 자동 체이닝 — 실패해도 무해(수동 버튼 유지)
      if (d.request_id && d.est_rows == null) {
        try { const p = await call({ action: "preview", request_id: d.request_id }); setR((prev: any) => ({ ...prev, ...p })); } catch { /* noop */ }
      }
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); loadHistory(); }
  };

  const act = async (action: "approve" | "reject" | "preview", id?: string) => {
    const request_id = id || r?.request_id;
    if (!request_id) return;
    if (action === "approve" && !confirm("이 SQL을 실행해 오디언스 테이블을 생성합니다. 승인할까요?")) return;
    setActing(true);
    try {
      const d = await call({ action, request_id });
      if (!id || (r && r.request_id === request_id)) setR((prev: any) => ({ ...prev, ...d }));
    } catch (e: any) { setErr(e.message); }
    finally { setActing(false); loadHistory(); }
  };

  const fmtRows = (n: any) => n == null ? "—" : Number(n).toLocaleString() + "명";

  return (
    <div style={{ padding: "20px 28px" }}>
      {/* 헤드라인 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0c4a6e" }}>🧪 AI 오디언스 탐색</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
          문장으로 타겟을 설명하면 AI가 SQL로 변환합니다 · 피처스토어 533만 ADID · <b>승인 전에는 아무것도 실행되지 않습니다</b>
        </div>
      </div>

      {/* ① 예시 갤러리 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 18 }}>
        {EXAMPLES.map(g => (
          <div key={g.group} style={{ padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{g.icon} {g.group}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>{g.desc}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.items.map(it => (
                <button key={it} onClick={() => { setText(it); create(it); }}
                  style={{ textAlign: "left", padding: "7px 10px", borderRadius: 8, border: "1px solid #e0f2fe", background: "#f0f9ff", fontSize: 11.5, color: "#075985", cursor: "pointer", lineHeight: 1.4 }}>
                  {it}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ② 탐색 입력 + 결과 */}
      <div style={{ padding: 18, borderRadius: 12, background: "linear-gradient(135deg, #ecfeff, #e0f2fe)", border: "1px solid #0ea5e933", marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#0369a1", marginBottom: 10, lineHeight: 1.6 }}>
          ① 문장 입력(또는 위 예시 클릭) → ② AI가 SQL로 변환 → ③ <b>인원 조회</b>로 규모 확인(선택) → ④ <b>승인</b> 시에만 오디언스 생성 (30일 보관)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={text} onChange={e => setText(e.target.value)}
            placeholder="예: 뷰티 신제품 캠페인에 맞는 2030 여성 활동자..."
            onKeyDown={e => { if (e.key === "Enter" && text.trim() && !loading) create(); }}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #7dd3fc", fontSize: 13, outline: "none", background: "rgba(255,255,255,.85)" }} />
          <button disabled={!text.trim() || loading} onClick={() => create()}
            style={{ padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer", background: "#0284c7", color: "#fff", border: "none", opacity: (!text.trim() || loading) ? .5 : 1, whiteSpace: "nowrap" }}>
            {loading ? "SQL 생성 중..." : "SQL 생성"}
          </button>
        </div>
        {err && <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>⚠️ {err}</div>}
        {r?.request_id && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: STATUS_META[r.status]?.color || "#334155" }}>상태: {STATUS_META[r.status]?.label || r.status}</span>
              {r.est_gb != null && <span style={{ color: "#64748b" }}>예상 스캔 {r.est_gb}GB</span>}
              {r.est_rows != null && <span style={{ color: "#0369a1", fontWeight: 700 }}>👥 예상 {fmtRows(r.est_rows)}</span>}
              {r.result_table && <span style={{ color: "#047857", fontWeight: 600 }}>→ dmp_data.{r.result_table}</span>}
            </div>
            <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: "#0f172a", color: "#e2e8f0", fontSize: 11, overflowX: "auto", maxHeight: 180 }}>{r.generated_sql || "(SQL 없음)"}</pre>
            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button disabled={acting} onClick={() => act("preview")}
                  style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#0369a1", border: "1px solid #7dd3fc" }}>
                  {acting ? "조회 중..." : "👥 인원 조회"}</button>
                <button disabled={acting} onClick={() => act("approve")}
                  style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#059669", color: "#fff", border: "none" }}>
                  {acting ? "실행 중..." : "✓ 승인 · 오디언스 생성"}</button>
                <button disabled={acting} onClick={() => act("reject")}
                  style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#b91c1c", border: "1px solid #fca5a5" }}>✕ 거절</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ③ 요청 이력 */}
      <div style={{ padding: 18, borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📋 탐색 이력 <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>최근 {history.length}건 · 생성된 오디언스는 30일 보관</span></div>
          <button onClick={loadHistory} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>{histLoading ? "..." : "↻ 새로고침"}</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>요청 문장</th>
                <th style={{ padding: "6px 8px" }}>상태</th>
                <th style={{ padding: "6px 8px" }}>예상 인원</th>
                <th style={{ padding: "6px 8px" }}>오디언스 테이블</th>
                <th style={{ padding: "6px 8px" }}>시각</th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "7px 8px", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.query_text}>{h.query_text}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 700, color: STATUS_META[h.status]?.color || "#334155" }}>{STATUS_META[h.status]?.label || h.status}</td>
                  <td style={{ padding: "7px 8px" }}>{fmtRows(h.est_rows)}</td>
                  <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: 11, color: "#047857" }}>{h.result_table || "—"}</td>
                  <td style={{ padding: "7px 8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{(h.created_at || "").slice(5, 16).replace("T", " ")}</td>
                  <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>
                    {h.status === "pending" && (
                      <>
                        <button disabled={acting} onClick={() => act("approve", h.id)} style={{ fontSize: 11, padding: "4px 10px", marginRight: 4, borderRadius: 6, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontWeight: 700 }}>승인</button>
                        <button disabled={acting} onClick={() => act("reject", h.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>거절</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && !histLoading && (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>아직 탐색 이력이 없습니다 — 위 예시를 눌러 시작해보세요</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
