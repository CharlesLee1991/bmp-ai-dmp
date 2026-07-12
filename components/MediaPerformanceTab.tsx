"use client";
import { useEffect, useMemo, useState } from "react";

// 📊 매체 성과 탭 (T-DMP-ACTIVATION Track B)
// 매체(platform 105종)별 노출/클릭/전환/광고비 + 전체 일별 추이.
// 데이터: /api/media (→ data-worker /dmp/media/*, touchAd 일별통계 원천)

type MediaRow = {
  platform_name: string; platform_idx: number;
  impressions: number; clicks: number; conversions: number;
  ad_spend: number; ctr_pct: number;
};
type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

const P = { bg: "#fff", border: "#e5e9f0", sub: "#7b8794", text: "#1f2933", accent: "#0967d2", good: "#0ca678" };

const fmt = (n: number) => n >= 100000000 ? `${(n / 100000000).toFixed(1)}억` : n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();
const won = (n: number) => n >= 100000000 ? `${(n / 100000000).toFixed(2)}억원` : `${(n / 10000).toFixed(0)}만원`;

export default function MediaPerformanceTab() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>📊 매체별 광고 성과</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 14, cursor: "pointer", border: `1px solid ${days === d ? P.accent : P.border}`, background: days === d ? P.accent : "#fff", color: days === d ? "#fff" : P.sub }}>{d}일</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: P.sub }}>원천: touchAd 광고 일별통계 × 매체 마스터 (실시간 누적)</div>
        {loading && <div style={{ fontSize: 12, color: P.accent }}>로딩…</div>}
      </div>
      {err && <div style={{ color: "#d64545", fontSize: 13 }}>오류: {err}</div>}

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

      {/* 일별 추이 (미니 바차트) */}
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

      {/* 매체 순위 테이블 */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#f7f9fc", color: P.sub, textAlign: "right" }}>
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
                style={{ borderTop: `1px solid ${P.border}`, cursor: "pointer", background: sel === r.platform_idx ? "#eef5fd" : "#fff" }}>
                <td style={{ padding: "8px 14px", fontWeight: 600, color: P.text }}>{r.platform_name}</td>
                <td style={{ padding: "8px 14px" }}>
                  <div style={{ height: 8, background: "#eef1f5", borderRadius: 4 }}>
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
  );
}
