"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { fmt } from "@/lib/data";

const P = {
  bg: "#0c0f1a", card: "#141827", border: "#1e2440",
  text: "#e8ecf4", sub: "#6b7a99",
  accent: "#00e5c3", green: "#34d399",
};

const CARD_COLORS: Record<string, string> = {
  KB: "#FFB800",
  NH: "#00A651",
  NHPAY: "#34C759",
  LOCA: "#AF52DE",
  GETO: "#FF6B6B",
};

const CARD_LABELS: Record<string, string> = {
  KB: "KB카드",
  NH: "NH카드",
  NHPAY: "NH페이",
  LOCA: "디지로카",
  GETO: "GETO",
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmtAmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "조";
  if (n >= 1e8) return (n / 1e8).toFixed(0) + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(0) + "만";
  return n.toLocaleString();
}

export default function CardComparisonTab() {
  const [months, setMonths] = useState(6);

  const url = `/api/cards?months=${months}`;
  const { data: apiData, isLoading, error } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    keepPreviousData: true,
  });

  const isLive = apiData?.success === true;
  const api = apiData?.data;
  const meta = apiData?.meta;
  const summary = api?.summary || { total_txn: 0, total_amt: 0, total_users: 0, card_count: 0, month_range: "" };

  const bySource = useMemo(() => {
    if (!isLive || !api?.by_source) return [];
    return api.by_source as { card_source: string; total_txn: number; total_users: number; total_amt: number; avg_per_txn: number }[];
  }, [isLive, api]);

  const monthlyData = useMemo(() => {
    if (!isLive || !api?.monthly) return [];
    const raw = api.monthly as { card_source: string; ym: string; txn_count: number; total_amt: number; unique_users: number }[];
    const map: Record<string, Record<string, any>> = {};
    raw.forEach(r => {
      if (!map[r.ym]) map[r.ym] = { ym: r.ym };
      map[r.ym][r.card_source] = r.txn_count;
      map[r.ym][r.card_source + "_amt"] = r.total_amt;
    });
    return Object.values(map).sort((a, b) => (a.ym as string).localeCompare(b.ym as string));
  }, [isLive, api]);

  const topCategories = useMemo(() => {
    if (!isLive || !api?.top_categories) return [];
    return api.top_categories as { card_source: string; partner_cd: string; major_category: string; subcategory: string; total_txn: number; total_amt: number; rn: number }[];
  }, [isLive, api]);

  const cardSources = bySource.map(s => s.card_source);

  // Pie data
  const pieData = bySource.map(s => ({
    name: CARD_LABELS[s.card_source] || s.card_source,
    value: s.total_txn,
    fill: CARD_COLORS[s.card_source] || "#888"
  }));

  const hasData = bySource.length > 0;

  if (isLoading && !apiData) {
    return (
      <div style={{ padding: "60px 28px", textAlign: "center", color: P.sub }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>💳</div>
        <div style={{ fontSize: 13 }}>카드사 비교 데이터 로딩 중...</div>
      </div>
    );
  }

  if (!hasData && !isLoading) {
    return (
      <div style={{ padding: "60px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 8 }}>카드사별 비교 리포트</div>
        <div style={{ fontSize: 13, color: P.sub, lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
          BQ 통합 큐브 생성 대기 중입니다.<br />
          5개 카드사 (KB · NH · NH페이 · 디지로카 · GETO) 결제 데이터가<br />
          BQ에서 집계되면 자동으로 연동됩니다.
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {Object.entries(CARD_LABELS).map(([k, v]) => (
            <span key={k} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: `1px solid ${CARD_COLORS[k]}44`, color: CARD_COLORS[k],
              background: `${CARD_COLORS[k]}11`
            }}>{v}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Period selector + Summary */}
      <div style={{ padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700 }}>기간</span>
          {[3, 6].map(m => (
            <button key={m} onClick={() => setMonths(m)} style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: months === m ? 700 : 400,
              cursor: "pointer", border: `1px solid ${months === m ? P.accent : P.border}`,
              background: months === m ? "rgba(0,229,195,0.12)" : "transparent",
              color: months === m ? P.accent : P.sub
            }}>{m}개월</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: P.sub }}>{summary.month_range}</span>
      </div>

      {/* Stats */}
      <div style={{ padding: "0 28px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="카드사 수" value={String(summary.card_count)} color={P.accent} />
        <StatCard label="총 결제 건수" value={fmt(summary.total_txn || 0)} color="#4f8ff7" />
        <StatCard label="총 결제 금액" value={fmtAmt(summary.total_amt || 0)} sub="원" color="#f7a84f" />
        <StatCard label="응답 속도" value={meta?.response_ms ? `${meta.response_ms}ms` : "-"} color={P.green} />
      </div>

      {/* Row 1: Pie + Bar */}
      <div style={{ padding: "0 28px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 카드사별 비중 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            💳 카드사별 결제 비중
          </h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 150, height: 150, flexShrink: 0, position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                    formatter={(v: any) => [fmt(Number(v)) + "건"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {bySource.map((s, i) => {
                const pct = (summary.total_txn || 1) > 0 ? (s.total_txn / summary.total_txn * 100).toFixed(1) : "0";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: CARD_COLORS[s.card_source] || "#888", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{CARD_LABELS[s.card_source] || s.card_source}</span>
                    <span style={{ fontSize: 11, color: P.sub }}>{pct}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: P.text }}>{fmt(s.total_txn)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 카드사별 평균 결제금액 */}
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            💰 카드사별 평균 결제금액
          </h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={bySource.map(s => ({
                name: CARD_LABELS[s.card_source] || s.card_source,
                avg: s.avg_per_txn,
                fill: CARD_COLORS[s.card_source] || "#888"
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmtAmt(Number(v))} width={50} />
                <Tooltip contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                  formatter={(v: any) => [Number(v).toLocaleString() + "원", "평균"]} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {bySource.map((s, i) => <Cell key={i} fill={CARD_COLORS[s.card_source] || "#888"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: 월별 트렌드 */}
      <div style={{ padding: "0 28px 16px" }}>
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            📈 카드사별 월별 결제 추이
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="ym" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmt(Number(v))} width={50} />
                <Tooltip contentStyle={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, color: P.text }}
                  formatter={(v: any, name: string) => [fmt(Number(v)) + "건", CARD_LABELS[name] || name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => CARD_LABELS[v] || v} />
                {cardSources.map((src: string) => (
                  <Line key={src} type="monotone" dataKey={src} stroke={CARD_COLORS[src] || "#888"} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: 카드사별 인기 업종 */}
      <div style={{ padding: "0 28px 28px" }}>
        <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
            🏪 카드사별 인기 업종 TOP 5
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cardSources.length, 5)}, 1fr)`, gap: 16 }}>
            {cardSources.map(src => {
              const cats = topCategories.filter(c => c.card_source === src);
              return (
                <div key={src}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginBottom: 10, paddingBottom: 6,
                    borderBottom: `2px solid ${CARD_COLORS[src] || "#888"}`,
                    color: CARD_COLORS[src] || "#888"
                  }}>
                    {CARD_LABELS[src] || src}
                  </div>
                  {cats.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                        background: i === 0 ? CARD_COLORS[src] || "#888" : "rgba(255,255,255,.06)",
                        color: i === 0 ? P.bg : P.sub
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subcategory}</div>
                        <div style={{ fontSize: 9, color: P.sub }}>{fmt(c.total_txn)}건 · {fmtAmt(c.total_amt)}</div>
                      </div>
                    </div>
                  ))}
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
