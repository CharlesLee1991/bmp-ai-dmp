"use client";
/*
  정제 2D 시각화 — 런컴 DMP 매체 성과 탭 (업무형)
  recharts 기반, 앱 라이트 팔레트 정합. 회전·발광·3D 왜곡 없음.
  BizViz 코스믹(임팩트 컷)과 대비되는 데일리 운영 대시보드 톤.
*/
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";

export type MediaRow = {
  platform_name: string; platform_idx: number;
  impressions: number; clicks: number; conversions: number;
  ad_spend: number; ctr_pct: number;
};
export type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

// 앱 라이트 팔레트 정합 (MediaPerformanceTab P와 동일 계열)
const P = { bg: "#fff", border: "#e5e9f0", sub: "#7b8794", text: "#1f2933", accent: "#0967d2", good: "#0ca678" };
// 시리즈 컬러 (앱 톤 — 채도 낮은 실무 팔레트)
const SERIES = ["#0967d2", "#0ca678", "#7b61ff", "#e8a838", "#e0567a", "#3aa0c4"];

const fmt = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : n.toLocaleString();
const won = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : `${(n / 1e4).toFixed(0)}만원`;
const short = (s: string, n = 10) => s.length > n ? s.slice(0, n) + "…" : s;

const panel: React.CSSProperties = { border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden", background: P.bg };
const head: React.CSSProperties = { padding: "12px 16px", fontSize: 13, fontWeight: 700, color: P.text, borderBottom: `1px solid ${P.border}` };
const sub: React.CSSProperties = { color: P.sub, fontWeight: 400, fontSize: 11, marginLeft: 8 };

function TT({ active, payload, label, fmtVal }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${P.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
      {label != null && <div style={{ fontWeight: 700, color: P.text, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || P.text }}>{p.name}: <b>{fmtVal ? fmtVal(p.value) : p.value.toLocaleString()}</b></div>
      ))}
    </div>
  );
}

export default function CleanMediaCharts({ rows, daily }: { rows: MediaRow[]; daily: DailyRow[] }) {
  // ① 가로 막대 랭킹 — 매체별 노출 TOP8 (정확 비교)
  const barData = [...rows].filter(r => r.impressions > 0).sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8).map(r => ({ name: short(r.platform_name, 12), full: r.platform_name, 노출: r.impressions }));

  // ② 도넛 — 전환 점유 TOP6
  const pieRows = [...rows].filter(r => r.conversions > 0).sort((a, b) => b.conversions - a.conversions).slice(0, 6);
  const pieData = pieRows.map((r, i) => ({ name: short(r.platform_name, 8), full: r.platform_name, value: r.conversions, fill: SERIES[i % SERIES.length] }));

  // ③ 라인 — 일별 노출·전환 추이
  const lineData = daily.map(d => ({ date: d.date.slice(5), 노출: d.impressions, 전환: d.conversions }));

  // ④ 버블 — 광고비 × 전환율 (크기=노출) — 효율 진단
  const bubbleData = [...rows].filter(r => r.impressions > 0).slice(0, 30).map(r => ({
    x: r.ad_spend, y: r.impressions > 0 ? (r.conversions / r.impressions) * 100 : 0,
    z: r.impressions, name: r.platform_name,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 상단: 버블(효율 진단, 전폭) */}
      <div style={panel}>
        <div style={head}>🫧 매체 효율 진단<span style={sub}>x = 광고비 · y = 전환율(%) · 크기 = 노출 · 우상단일수록 고효율</span></div>
        <div style={{ height: 300, padding: "12px 16px 4px" }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 24, bottom: 20, left: 8 }}>
              <CartesianGrid stroke="rgba(0,0,0,.06)" />
              <XAxis type="number" dataKey="x" name="광고비" tickFormatter={won} tick={{ fontSize: 10, fill: P.sub }} axisLine={false} tickLine={false}
                label={{ value: "광고비 →", position: "insideBottomRight", offset: -4, fontSize: 10, fill: P.sub }} />
              <YAxis type="number" dataKey="y" name="전환율" unit="%" tick={{ fontSize: 10, fill: P.sub }} axisLine={false} tickLine={false} width={44}
                label={{ value: "전환율 ↑", position: "insideTopLeft", fontSize: 10, fill: P.sub }} />
              <ZAxis type="number" dataKey="z" range={[40, 800]} name="노출" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null; const d = payload[0].payload;
                return <div style={{ background: "#fff", border: `1px solid ${P.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
                  <div style={{ fontWeight: 700, color: P.text }}>{d.name}</div>
                  <div style={{ color: P.sub }}>광고비 {won(d.x)} · 전환율 {d.y.toFixed(2)}% · 노출 {fmt(d.z)}</div>
                </div>;
              }} />
              <Scatter data={bubbleData} fill={P.accent} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3열: 랭킹 · 도넛 · 라인 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* ① 가로 막대 랭킹 */}
        <div style={panel}>
          <div style={head}>📊 매체별 노출 TOP8</div>
          <div style={{ height: 320, padding: "12px 12px 4px" }}>
            <ResponsiveContainer>
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.06)" />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: P.text }} axisLine={false} tickLine={false} width={84} />
                <Tooltip content={<TT fmtVal={fmt} />} cursor={{ fill: "rgba(9,103,210,.05)" }} />
                <Bar dataKey="노출" fill={P.accent} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="노출" position="right" formatter={fmt} style={{ fontSize: 10, fill: P.sub }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ② 도넛 */}
        <div style={panel}>
          <div style={head}>🍩 전환 점유</div>
          <div style={{ height: 320, padding: "12px 12px 4px", position: "relative" }}>
            {pieData.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="46%" innerRadius={52} outerRadius={82} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} paddingAngle={1}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<TT fmtVal={(v: number) => v.toLocaleString() + "명"} />} />
                  <Legend verticalAlign="bottom" height={64} iconType="circle" iconSize={8}
                    formatter={(v: string) => <span style={{ fontSize: 11, color: P.text }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty msg="전환 데이터 없음" />}
          </div>
        </div>

        {/* ③ 라인 추이 */}
        <div style={panel}>
          <div style={head}>📈 일별 노출·전환 추이</div>
          <div style={{ height: 320, padding: "12px 12px 4px" }}>
            {lineData.length >= 2 ? (
              <ResponsiveContainer>
                <LineChart data={lineData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis yAxisId="l" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={fmt} width={44} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9, fill: P.good }} axisLine={false} tickLine={false} tickFormatter={fmt} width={44} />
                  <Tooltip content={<TT fmtVal={fmt} />} />
                  <Legend verticalAlign="top" height={24} iconType="plainline" iconSize={14}
                    formatter={(v: string) => <span style={{ fontSize: 11, color: P.text }}>{v}</span>} />
                  <Line yAxisId="l" type="monotone" dataKey="노출" stroke={P.accent} strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="전환" stroke={P.good} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty msg="추이 데이터 부족" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: P.sub, fontSize: 13 }}>{msg}</div>;
}
