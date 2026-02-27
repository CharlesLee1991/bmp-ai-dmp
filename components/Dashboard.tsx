"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  PARTNER_MAP, AGE_LABEL, AGE_ORDER, SIDO_LIST,
  REGION_DATA, INDUSTRY_DATA, SEOUL_SGG, fmt,
  type RegionRow, type IndustryRow, type SggRow
} from "@/lib/data";

const P = {
  bg: "#0c0f1a", card: "#141827", border: "#1e2440",
  text: "#e8ecf4", sub: "#6b7a99",
  m: "#4f8ff7", f: "#f7a84f", accent: "#00e5c3",
  green: "#34d399", glow: "rgba(0,229,195,0.12)"
};

// ─── API fetcher ───
const fetcher = (url: string) => fetch(url).then(r => r.json());

function buildUrl(sido: string, sex: string, age: string) {
  const p = new URLSearchParams();
  if (sido !== "전체") p.set("sido", sido);
  if (sex !== "all") p.set("sex", sex);
  if (age !== "all") p.set("age", age);
  const qs = p.toString();
  return `/api/dashboard${qs ? "?" + qs : ""}`;
}

// ─── UI Components ───
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 400,
      cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`,
      transition: "all .2s",
      background: active ? P.glow : "transparent",
      color: active ? P.accent : P.sub
    }}>{label}</button>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: P.card, borderRadius: 10, padding: "14px 16px",
      border: `1px solid ${P.border}`, position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color || P.accent, borderRadius: "0 2px 2px 0" }} />
      <div style={{ fontSize: 10, color: P.sub, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || P.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: P.sub, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Static fallback helpers ───
function getStaticAgeSex(sido: string, sex: string, age: string) {
  let d = REGION_DATA;
  if (sido !== "전체") d = d.filter(r => r.s === sido);
  if (sex !== "all") d = d.filter(r => r.x === sex);
  if (age !== "all") d = d.filter(r => r.a === age);
  const map: Record<string, { a: string; M: number; F: number }> = {};
  d.forEach(r => {
    if (!map[r.a]) map[r.a] = { a: r.a, M: 0, F: 0 };
    if (r.x === "M") map[r.a].M += r.u;
    if (r.x === "F") map[r.a].F += r.u;
  });
  return AGE_ORDER.map(k => map[k] || { a: k, M: 0, F: 0 });
}

function getStaticRegion(sido: string, sex: string, age: string) {
  if (sido === "서울특별시") return SEOUL_SGG.map(r => ({ name: r.n, users: r.u }));
  let d = REGION_DATA;
  if (sex !== "all") d = d.filter(r => r.x === sex);
  if (age !== "all") d = d.filter(r => r.a === age);
  const map: Record<string, number> = {};
  d.forEach(r => { map[r.s] = (map[r.s] || 0) + r.u; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, users]) => ({ name, users }));
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [sido, setSido] = useState("전체");
  const [sex, setSex] = useState("all");
  const [age, setAge] = useState("all");

  const url = buildUrl(sido, sex, age);
  const { data: apiData, isLoading, error } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    keepPreviousData: true,
  });

  const isLive = apiData?.success === true;
  const api = apiData?.data;
  const meta = apiData?.meta;

  // ─── Transform API → chart data (or fallback to static) ───
  const ageChart = useMemo(() => {
    if (!isLive || !api?.age_sex) return getStaticAgeSex(sido, sex, age);
    const map: Record<string, { a: string; M: number; F: number }> = {};
    (api.age_sex as { a: string; x: string; u: number }[]).forEach(r => {
      if (!map[r.a]) map[r.a] = { a: r.a, M: 0, F: 0 };
      if (r.x === "M") map[r.a].M += r.u;
      if (r.x === "F") map[r.a].F += r.u;
    });
    return AGE_ORDER.map(k => map[k] || { a: k, M: 0, F: 0 });
  }, [isLive, api, sido, sex, age]);

  const industryData = useMemo(() => {
    if (!isLive || !api?.industry) return INDUSTRY_DATA;
    return (api.industry as { code: string; users: number }[]);
  }, [isLive, api]);

  const regionRank = useMemo(() => {
    if (!isLive || !api?.region) return getStaticRegion(sido, sex, age);
    return (api.region as { name: string; users: number }[]);
  }, [isLive, api, sido, sex, age]);

  // ─── Summary ───
  let mT = 0, fT = 0;
  if (isLive && api?.summary) {
    mT = api.summary.male || 0;
    fT = api.summary.female || 0;
  } else {
    ageChart.forEach(r => { mT += r.M; fT += r.F; });
  }
  const total = mT + fT;
  const pieData = [{ name: "남성", value: mT, c: P.m }, { name: "여성", value: fT, c: P.f }];
  const maxBar = Math.max(...ageChart.map(r => Math.max(r.M, r.F)), 1);
  const barData = ageChart.map(r => ({ name: AGE_LABEL[r.a] || r.a, 남성: r.M, 여성: r.F }));
  const topAge = ageChart.reduce((a, b) => (a.M + a.F) > (b.M + b.F) ? a : b, { M: 0, F: 0, a: "-" });

  const anyFilter = sido !== "전체" || sex !== "all" || age !== "all";
  const reset = () => { setSido("전체"); setSex("all"); setAge("all"); };

  const responseMs = meta?.response_ms;
  const industryFiltered = isLive && anyFilter;

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: P.bg, minHeight: "100vh", color: P.text }}>

      {/* ─── HEADER ─── */}
      <header style={{ padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #4f8ff7, #00e5c3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#0c0f1a"
          }}>D</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
              DMP Audience Explorer
            </h1>
            <p style={{ fontSize: 11, color: P.sub, margin: 0 }}>
              BizSpring · Supabase Cube · BQ 80억행 → 141만행
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoading && <span style={{ fontSize: 10, color: P.f, fontWeight: 600 }}>Loading...</span>}
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isLive ? P.green : error ? "#ef4444" : P.sub,
            boxShadow: isLive ? `0 0 8px ${P.green}` : "none"
          }} />
          <span style={{ fontSize: 11, color: P.sub }}>
            {isLive ? `LIVE · ${responseMs ?? "?"}ms` : error ? "Fallback" : "매일 04:00 갱신"}
          </span>
        </div>
      </header>

      {/* ─── FILTERS ─── */}
      <div style={{ padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", borderBottom: `1px solid ${P.border}` }}>
        <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", marginRight: 4 }}>시도</span>
        <select value={sido} onChange={e => setSido(e.target.value)} style={{
          padding: "6px 10px", borderRadius: 8, border: `1px solid ${P.border}`,
          fontSize: 12, background: P.card, color: P.text, cursor: "pointer",
          outline: "none", minWidth: 120
        }}>
          {SIDO_LIST.map(s => <option key={s}>{s}</option>)}
        </select>

        <span style={{ width: 1, height: 20, background: P.border, margin: "0 6px" }} />
        <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em" }}>성별</span>
        {[{ id: "all", l: "전체" }, { id: "M", l: "남성" }, { id: "F", l: "여성" }].map(o =>
          <Chip key={o.id} label={o.l} active={sex === o.id} onClick={() => setSex(o.id)} />
        )}

        <span style={{ width: 1, height: 20, background: P.border, margin: "0 6px" }} />
        <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em" }}>연령</span>
        {[{ id: "all", l: "전체" }, ...AGE_ORDER.map(a => ({ id: a, l: AGE_LABEL[a] }))].map(o =>
          <Chip key={o.id} label={o.l} active={age === o.id} onClick={() => setAge(o.id)} />
        )}

        {anyFilter && (
          <button onClick={reset} style={{
            marginLeft: 8, fontSize: 10, color: P.accent,
            background: "none", border: `1px solid ${P.accent}44`,
            borderRadius: 16, padding: "4px 14px", cursor: "pointer", fontWeight: 600
          }}>✕ 초기화</button>
        )}
      </div>

      {/* ─── STATS ─── */}
      <div style={{ padding: "16px 28px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="총 이용자" value={fmt(total)} sub="필터 적용 결과" />
        <Stat label="남녀 비율" value={total > 0 ? `${Math.round(mT / total * 100)}:${Math.round(fT / total * 100)}` : "-"} sub={`M ${fmt(mT)} · F ${fmt(fT)}`} color={P.m} />
        <Stat label="주력 연령대" value={AGE_LABEL[topAge.a] || "-"} sub={`${fmt(topAge.M + topAge.F)}명`} color={P.f} />
        <Stat label="응답 속도" value={responseMs ? `${responseMs}ms` : "< 50ms"} sub={isLive ? "Supabase RPC LIVE" : "Supabase RPC"} color={P.green} />
      </div>

      {/* ─── MAIN GRID ─── */}
      <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "260px 1fr 240px", gap: 16 }}>

        {/* LEFT: 업종 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            🏪 업종 소분류 TOP 12
          </h3>
          {industryData.map((it, i) => {
            const w = industryData[0] ? it.users / industryData[0].users * 100 : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <span style={{ fontSize: 10, color: P.sub, width: 76, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {PARTNER_MAP[it.code] || it.code}
                </span>
                <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,.03)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: `${w}%`, background: `linear-gradient(90deg, ${P.accent}88, ${P.accent}11)`, transition: "width .5s" }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.text, minWidth: 38, textAlign: "right" }}>{fmt(it.users)}</span>
              </div>
            );
          })}
          {!isLive && anyFilter && <p style={{ fontSize: 9, color: P.sub, marginTop: 10, textAlign: "center", fontStyle: "italic", opacity: .7 }}>* 업종 데이터는 필터 미적용 (Fallback 모드)</p>}
        </div>

        {/* CENTER: 차트 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>📊 성별 · 연령 분포</h3>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: P.m }} /> 남성
              </span>
              <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: P.f }} /> 여성
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {/* Donut */}
            <div style={{ width: 150, height: 150, flexShrink: 0, position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.c} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: P.sub, fontWeight: 600 }}>TOTAL</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: P.accent }}>{fmt(total)}</div>
              </div>
            </div>

            {/* Bar */}
            <div style={{ flex: 1, height: 185 }}>
              <ResponsiveContainer>
                <BarChart data={barData} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmt(Number(v))} width={44} />
                  <Tooltip
                    contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                    formatter={(v: any) => [fmt(Number(v)) + "명"]}
                  />
                  <Bar dataKey="남성" fill={P.m} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="여성" fill={P.f} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pyramid */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${P.border}`, paddingTop: 12 }}>
            <p style={{ fontSize: 11, color: P.sub, margin: "0 0 8px", fontWeight: 600 }}>인구 피라미드</p>
            {ageChart.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, height: 22 }}>
                <span style={{ fontSize: 10, color: P.sub, width: 36, textAlign: "right", flexShrink: 0 }}>{AGE_LABEL[row.a] || row.a}</span>
                <div style={{ display: "flex", flex: 1, gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
                    <div style={{
                      height: 18, background: `linear-gradient(270deg, ${P.m}, ${P.m}33)`, borderRadius: "4px 0 0 4px",
                      width: `${(row.M / maxBar) * 100}%`, minWidth: row.M > 0 ? 2 : 0, transition: "width .4s",
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4
                    }}>
                      {row.M > maxBar * .1 && <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{fmt(row.M)}</span>}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: 18, background: `linear-gradient(90deg, ${P.f}, ${P.f}33)`, borderRadius: "0 4px 4px 0",
                      width: `${(row.F / maxBar) * 100}%`, minWidth: row.F > 0 ? 2 : 0, transition: "width .4s",
                      display: "flex", alignItems: "center", paddingLeft: 4
                    }}>
                      {row.F > maxBar * .1 && <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{fmt(row.F)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Region */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}`, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            📍 {sido !== "전체" ? `${sido} 시군구별` : "지역별 이용자"}
          </h3>
          <div style={{ flex: 1, overflow: "auto" }}>
            {regionRank.slice(0, 25).map((r, i) => {
              const pct = regionRank[0] ? (r.users / regionRank[0].users * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    background: i < 3 ? P.accent : "rgba(255,255,255,.06)", color: i < 3 ? P.bg : P.sub
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: P.accent, flexShrink: 0 }}>{fmt(r.users)}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,.04)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: i < 3 ? P.accent : P.m, borderRadius: 2, width: `${pct}%`, transition: "width .4s", opacity: .65 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ textAlign: "center", padding: "14px 0 20px", fontSize: 10, color: "rgba(107,122,153,.5)", borderTop: `1px solid ${P.border}` }}>
        {isLive ? `LIVE · Supabase RPC ${responseMs}ms` : "Static Fallback"} · BizSpring DMP · 9큐브 · BQ FDW → Supabase
      </footer>
    </div>
  );
}
