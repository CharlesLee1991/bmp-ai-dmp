"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Repeat } from "lucide-react";

// 코드분할: 무거운 시각화 모듈은 선택 시에만 로드
const CleanMediaCharts = dynamic(() => import("./CleanMediaCharts"), { ssr: false });
// 3D 탐색기 — 기존 gl3d(ECharts-GL) + BizViz(three.js) 병합, 탭 기반 3-축 탐색 + 전체창
const Media3DExplorer = dynamic(() => import("./Media3DExplorer"), { ssr: false });

// 📊 매체 성과 탭 (T-DMP-ACTIVATION Track B)
// 매체(platform 105종)별 노출/클릭/전환/광고비 + 전체 일별 추이.
// 데이터: /api/media (→ data-worker /dmp/media/*, touchAd 일별통계 원천)

type MediaRow = {
  platform_name: string; platform_idx: number;
  impressions: number; clicks: number; conversions: number;
  ad_spend: number; ctr_pct: number;
};
type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

type AudienceAdRow = {
  title: string; platform_name: string; company_idx: number;
  aud_converters: number; conv_events: number; points: number;
};

const P = { bg: "var(--card)", border: "var(--border)", sub: "var(--sub)", text: "var(--text)", accent: "var(--accent)", good: "var(--success)" };

const fmt = (n: number) => n >= 100000000 ? `${(n / 100000000).toFixed(1)}억` : n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();
const won = (n: number) => n >= 100000000 ? `${(n / 100000000).toFixed(2)}억원` : `${(n / 10000).toFixed(0)}만원`;

export default function MediaPerformanceTab() {
  const [viz, setViz] = useState<"current" | "clean" | "explore3d">("current");  // 시각화 토글 (현재 / 정제 2D / 3D 탐색기)
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 폐루프: 오디언스 × 광고소재 성과
  const [audiences, setAudiences] = useState<{ table: string; rows: number }[]>([]);
  const [creativeIdx, setCreativeIdx] = useState<Set<number>>(new Set());
  const [audSel, setAudSel] = useState("");
  const [adRows, setAdRows] = useState<AudienceAdRow[]>([]);
  const [adLoading, setAdLoading] = useState(false);

  useEffect(() => {
    fetch("/api/media?view=audiences").then(r => r.json())
      .then(d => setAudiences(d.audiences || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/media?view=creative-platforms&days=${days}`).then(r => r.json())
      .then(d => setCreativeIdx(new Set<number>(d.platform_idx || []))).catch(() => {});
  }, [days]);

  const [adErr, setAdErr] = useState("");

  useEffect(() => {
    setAdRows([]); setAdErr("");  // 선택 변경 즉시 이전 결과 제거
    if (!audSel) return;
    let alive = true;
    setAdLoading(true);
    fetch(`/api/media?view=audience-ads&audience_table=${encodeURIComponent(audSel)}&days=${days}${sel != null ? `&platform_idx=${sel}` : ""}`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (d.error || d.detail) setAdErr(String(d.error || d.detail));
        else setAdRows(d.rows || []);
      })
      .catch(e => alive && setAdErr(String(e)))
      .finally(() => alive && setAdLoading(false));
    return () => { alive = false; };
  }, [audSel, days, sel]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr("");
    Promise.all([
      fetch(`/api/media?view=performance&days=${days}`).then(r => r.json()),
      fetch(`/api/media?view=daily&days=${days}${sel != null ? `&platform_idx=${sel}` : ""}`).then(r => r.json()),
    ]).then(([p, d]) => {
      if (!alive) return;
      if (p.error || d.error) { setErr(p.error || d.error); return; }
      setRows(p.rows || []); setDaily(d.rows || []);
    }).catch(e => alive && setErr(String(e))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days, sel]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    imp: a.imp + r.impressions, conv: a.conv + r.conversions, spend: a.spend + r.ad_spend,
  }), { imp: 0, conv: 0, spend: 0 }), [rows]);

  const maxImp = Math.max(1, ...rows.map(r => r.impressions));
  const maxDaily = Math.max(1, ...daily.map(r => r.impressions));
  const selName = sel != null ? rows.find(r => r.platform_idx === sel)?.platform_name : null;

  return (
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 헤더 + 기간 */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}><BarChart3 size={16} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />매체별 광고 성과</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 14, cursor: "pointer", border: `1px solid ${days === d ? P.accent : P.border}`, background: days === d ? P.accent : "var(--card)", color: days === d ? "var(--card)" : P.sub }}>{d}일</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: P.sub }}>원천: touchAd 광고 일별통계 × 매체 마스터 (실시간 누적)</div>
        {loading && <div style={{ fontSize: 12, color: P.accent }}>로딩…</div>}
        {/* 시각화 버전 토글 */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: P.sub }}>시각화</span>
          <div style={{ display: "flex", border: `1px solid ${P.border}`, borderRadius: 16, overflow: "hidden" }}>
            {([["current", "현재"], ["clean", "정제 2D"], ["explore3d", "3D 탐색"]] as const).map(([v, lab]) => (
              <button key={v} onClick={() => setViz(v)} style={{ padding: "4px 12px", fontSize: 12, cursor: "pointer", border: "none", background: viz === v ? P.accent : "var(--card)", color: viz === v ? "var(--card)" : P.sub, fontWeight: viz === v ? 700 : 400 }}>{lab}</button>
            ))}
          </div>
        </div>
      </div>
      {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>오류: {err}</div>}

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "총 노출", val: fmt(totals.imp) },
          { label: "총 전환", val: fmt(totals.conv) },
          { label: "총 광고비", val: won(totals.spend) },
          { label: "활성 매체", val: `${rows.filter(r => r.impressions > 0).length}개` },
        ].map(k => (
          <div key={k.label} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: P.sub }}>{k.label} ({days}일)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: P.text, marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* 시각화: 현재 = 미니 바차트 / 정제 2D = recharts / 3D 탐색 = 탭 기반 3-축 탐색기 */}
      {viz === "explore3d" ? (
        <Media3DExplorer rows={rows} days={days} onDays={setDays} />
      ) : viz === "clean" ? (
        <CleanMediaCharts rows={rows} daily={daily} />
      ) : (
        <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 10 }}>
            일별 노출 추이 {selName ? `— ${selName}` : "— 전체"} {sel != null && <button onClick={() => setSel(null)} style={{ marginLeft: 8, fontSize: 11, color: P.accent, border: "none", background: "transparent", cursor: "pointer" }}>전체 보기 ✕</button>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
            {daily.map(d => (
              <div key={d.date} title={`${d.date}: 노출 ${d.impressions.toLocaleString()} / 전환 ${d.conversions.toLocaleString()}`}
                style={{ flex: 1, height: `${Math.max(2, (d.impressions / maxDaily) * 100)}%`, background: P.accent, opacity: 0.75, borderRadius: "2px 2px 0 0" }} />
            ))}
          </div>
        </div>
      )}

      {/* 좌: 매체 순위 / 우: 폐루프 (좌우 분할) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
      {/* 매체 순위 테이블 */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: P.sub, textAlign: "right" }}>
              <th style={{ padding: "9px 14px", textAlign: "left" }}>매체</th>
              <th style={{ padding: "9px 14px", textAlign: "left", width: "22%" }}>노출 비중</th>
              <th style={{ padding: "9px 14px" }}>노출</th>
              <th style={{ padding: "9px 14px" }}>클릭</th>
              <th style={{ padding: "9px 14px" }}>전환</th>
              <th style={{ padding: "9px 14px" }}>광고비</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.impressions > 0).map(r => (
              <tr key={r.platform_idx} onClick={() => setSel(r.platform_idx)}
                style={{ borderTop: `1px solid ${P.border}`, cursor: "pointer", background: sel === r.platform_idx ? "var(--badge-info-bg)" : "var(--card)" }}>
                <td style={{ padding: "8px 14px", fontWeight: 600, color: P.text }}>
                  {r.platform_name}
                  {creativeIdx.has(r.platform_idx) && <span title="소재 반응 데이터 있음 — 클릭 시 우측 폐루프에 이 매체의 반응 소재 표시" style={{ marginLeft: 6 }}><Repeat size={12} style={{ verticalAlign: "-2px", color: "var(--accent)" }} /></span>}
                </td>
                <td style={{ padding: "8px 14px" }}>
                  <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 4 }}>
                    <div style={{ height: 8, width: `${(r.impressions / maxImp) * 100}%`, background: P.good, borderRadius: 4 }} />
                  </div>
                </td>
                <td style={{ padding: "8px 14px", textAlign: "right" }}>{fmt(r.impressions)}</td>
                <td style={{ padding: "8px 14px", textAlign: "right" }}>{fmt(r.clicks)}</td>
                <td style={{ padding: "8px 14px", textAlign: "right", color: P.good, fontWeight: 600 }}>{fmt(r.conversions)}</td>
                <td style={{ padding: "8px 14px", textAlign: "right" }}>{won(r.ad_spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: P.sub }}>행 클릭 시 해당 매체의 일별 추이로 전환됩니다.</div>
        </div>
        <div style={{ minWidth: 0, position: "sticky", top: 12 }}>
      {/* ─── 폐루프: 오디언스 × 광고소재 성과 ─── */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: 16, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}><Repeat size={14} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--accent)" }} />오디언스 반응 소재 (폐루프)</div>
          <select value={audSel} onChange={e => setAudSel(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, color: P.text, background: "var(--card)" }}>
            <option value="">오디언스 선택…</option>
            {audiences.map(a => (
              <option key={a.table} value={a.table}>{a.table} ({a.rows.toLocaleString()}명)</option>
            ))}
          </select>
          {adLoading && <div style={{ fontSize: 12, color: P.accent }}>조회 중… (첫 조회는 최대 1~2분)</div>}
          {adErr && <div style={{ fontSize: 12, color: "var(--danger)" }}>오류: {adErr}</div>}
          <div style={{ fontSize: 11, color: P.sub }}>
            선택한 오디언스가 최근 {days}일 실제 전환한 광고소재 TOP
            {sel != null && selName && <span style={{ marginLeft: 6, color: P.accent, fontWeight: 700 }}>· 매체 필터: {selName}</span>}
          </div>
        </div>
        {audSel && !adLoading && adRows.length === 0 && (
          <div style={{ fontSize: 12.5, color: P.sub, padding: "8px 0" }}>
            {sel != null ? "이 매체에서는 해당 오디언스의 소재 전환 데이터가 없습니다. (좌측 다른 매체를 선택하거나 '전체 보기'로 해제)" : "해당 기간 전환 데이터가 없습니다."}
          </div>
        )}
        {adRows.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: P.sub, textAlign: "right" }}>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>광고 소재 · 매체</th>
                <th style={{ padding: "8px 12px" }}>전환자</th>
              </tr>
            </thead>
            <tbody>
              {adRows.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                  <td style={{ padding: "7px 12px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: P.sub, marginTop: 1 }}>{r.platform_name} · 전환 {r.conv_events.toLocaleString()}</div>
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", color: P.good, fontWeight: 700, whiteSpace: "nowrap" }}>{r.aud_converters.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </div>
      </div>

    </div>
  );
}
