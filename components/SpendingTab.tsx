"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { fmt } from "@/lib/data";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096",
  accent: "#0d9488", green: "#10b981",
  glow: "rgba(13,148,136,0.08)"
};

const COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#eab308", "#60a5fa", "#f43f5e", "#6366f1", "#14b8a6", "#d946ef", "#ca8a04"];

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmtAmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "조";
  if (n >= 1e8) return (n / 1e8).toFixed(0) + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(0) + "만";
  return n.toLocaleString();
}

interface Props {
  sido: string;
  sex: string;
  age: string;
}

export default function SpendingTab({ sido, sex, age }: Props) {
  const p = new URLSearchParams();
  if (sido !== "전체") p.set("sido", sido);
  if (sex !== "all") p.set("sex", sex);
  if (age !== "all") p.set("age", age);
  const qs = p.toString();
  const url = `/api/spending${qs ? "?" + qs : ""}`;

  const { data: apiData, isLoading, error } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    keepPreviousData: true,
  });

  const isLive = apiData?.success === true;
  const api = apiData?.data;
  const meta = apiData?.meta;

  // Transform data
  const majorData = useMemo(() => {
    if (!isLive || !api?.major) return [];
    return api.major as { name: string; total_txn: number; total_users: number; total_amt: number }[];
  }, [isLive, api]);

  const subcategoryData = useMemo(() => {
    if (!isLive || !api?.subcategory) return [];
    return api.subcategory as { major_category: string; middle_category: string; subcategory: string; code: string; total_txn: number; total_users: number; total_amt: number }[];
  }, [isLive, api]);

  const trendData = useMemo((): { rows: Record<string, any>[]; categories: string[] } => {
    if (!isLive || !api?.trend) return { rows: [], categories: [] };
    const raw = api.trend as { ym: string; major_category: string; txn_count: number; total_amt: number }[];
    const map: Record<string, Record<string, any>> = {};
    const cats = new Set<string>();
    raw.forEach(r => {
      if (!map[r.ym]) map[r.ym] = {};
      map[r.ym]["ym_label"] = r.ym;
      map[r.ym][r.major_category] = r.txn_count;
      cats.add(r.major_category);
    });
    return { rows: Object.values(map), categories: Array.from(cats) };
  }, [isLive, api]);

  const summary = api?.summary || { total_txn: 0, total_users: 0, total_amt: 0 };

  // Pie data for major categories
  const pieData = majorData.slice(0, 8).map((d, i) => ({
    name: d.name, value: d.total_txn, fill: COLORS[i % COLORS.length]
  }));

  if (isLoading && !apiData) {
    return (
      <div style={{ padding: "60px 28px", textAlign: "center", color: P.sub }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 13 }}>소비 트렌드 데이터 로딩 중...</div>
      </div>
    );
  }

  if (error || (!isLive && !isLoading)) {
    return (
      <div style={{ padding: "60px 28px", textAlign: "center", color: "#ef4444" }}>
        <div style={{ fontSize: 13 }}>데이터 로드 실패</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ padding: "16px 28px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="총 결제 건수" value={fmt(summary.total_txn)} sub="카드 승인 기준" color={P.accent} />
        <StatCard label="총 결제 금액" value={fmtAmt(summary.total_amt)} sub="원" color="#4f8ff7" />
        <StatCard label="고유 이용자" value={fmt(summary.total_users)} sub="ads_id 기준" color="#f7a84f" />
        <StatCard label="응답 속도" value={meta?.response_ms ? `${meta.response_ms}ms` : "-"} sub="Supabase RPC" color={P.green} />
      </div>

      {/* Main Grid */}
      <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT: 대분류 도넛 + 바 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            🏷️ 대분류별 소비 비중
          </h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {/* Donut */}
            <div style={{ width: 160, height: 160, flexShrink: 0, position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                    formatter={(v: any) => [fmt(Number(v)) + "건"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: P.sub }}>총건수</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: P.accent }}>{fmt(summary.total_txn)}</div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ flex: 1 }}>
              {majorData.slice(0, 8).map((d, i) => {
                const pct = summary.total_txn > 0 ? (d.total_txn / summary.total_txn * 100).toFixed(1) : "0";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 10, color: P.sub, fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: 월별 트렌드 라인차트 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            📈 월별 소비 트렌드 (대분류 Top 5)
          </h3>
          {trendData.rows && trendData.rows.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={trendData.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                  <XAxis dataKey="ym_label" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmt(Number(v))} width={50} />
                  <Tooltip
                    contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                    formatter={(v: any) => [fmt(Number(v)) + "건"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {trendData.categories.map((cat: string, i: number) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>트렌드 데이터 없음</div>
          )}
        </div>
      </div>

      {/* Full Width: 소분류 TOP 20 */}
      <div style={{ padding: "0 28px 28px" }}>
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            🏪 소분류 TOP 20 — 결제 건수
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {subcategoryData.map((item, i) => {
              const maxTxn = subcategoryData[0]?.total_txn || 1;
              const pct = (item.total_txn / maxTxn) * 100;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    background: i < 3 ? P.accent : "rgba(0,0,0,.06)", color: i < 3 ? "#fff" : P.sub
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.subcategory}
                        <span style={{ fontSize: 9, color: P.sub, marginLeft: 4 }}>{item.major_category}</span>
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: P.accent, flexShrink: 0, marginLeft: 8 }}>
                        {fmt(item.total_txn)}건
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "rgba(0,0,0,.04)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: COLORS[i % COLORS.length], borderRadius: 2, width: `${pct}%`, transition: "width .4s", opacity: .65 }} />
                      </div>
                      <span style={{ fontSize: 9, color: P.sub, flexShrink: 0 }}>{fmtAmt(item.total_amt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
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
