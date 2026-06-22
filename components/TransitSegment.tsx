"use client";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096",
  accent: "#0d9488", glow: "rgba(13,148,136,0.08)",
  m: "#3b82f6", f: "#f59e0b",
};

const AGE_LABEL: Record<string, string> = {
  "10s": "10대", "20s": "20대", "30s": "30대",
  "40s": "40대", "50s": "50대", "60s": "60대+", "70s": "70대+"
};

const CAT_OPTIONS = [
  { value: "", label: "전체 교통" },
  { value: "BSUB", label: "대중교통(버스+지하철)" },
  { value: "GSUB", label: "광역교통" },
];
const ONOFF_OPTIONS = [
  { value: "", label: "전체" },
  { value: "A", label: "🟢 승차" },
  { value: "R", label: "🔴 하차" },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, fontSize: 12,
      fontWeight: active ? 700 : 400, cursor: "pointer",
      border: `1px solid ${active ? P.accent : P.border}`,
      background: active ? P.glow : P.card,
      color: active ? P.accent : P.sub, transition: "all .15s",
    }}>{label}</button>
  );
}

const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();
const pct = (a: number, b: number) => b === 0 ? 0 : Math.round(a / b * 100);

interface Props {
  tab: "subway" | "bus";
  sidos?: string[];
  sexes?: string[];
  ages?: string[];
  ymFrom?: string;
  ymTo?: string;
}

export default function TransitSegment({ tab, sidos = [], sexes = [], ages = [] }: Props) {
  const [cat, setCat] = useState("");
  const [onOff, setOnOff] = useState("");

  const fetchKey = `/api/transit#${tab}|${cat}|${onOff}|${sidos.join(",")}|${sexes.join(",")}|${ages.join(",")}`;

  const { data: raw, isLoading } = useSWR(fetchKey, async () => {
    const body: Record<string, string> = {};
    if (cat)           body.cat    = cat;
    if (onOff)         body.on_off = onOff;
    if (sidos.length)  body.sido   = sidos.join(",");
    if (sexes.length)  body.sex    = sexes.join(",");
    if (ages.length)   body.age    = ages.join(",");
    const res = await fetch("/api/transit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }, { revalidateOnFocus: false, dedupingInterval: 20000, keepPreviousData: true });

  const d = raw?.success ? raw.data : null;

  /* chart data */
  const hourData = useMemo(() =>
    (d?.hour_dist ?? []).map((h: any) => ({
      name: `${h.hour}시`, cnt: Number(h.cnt),
      fill: (h.hour >= 7 && h.hour <= 9) || (h.hour >= 17 && h.hour <= 19) ? P.accent : "#cbd5e0"
    })), [d]);

  const ageData = useMemo(() =>
    (d?.age_gender ?? []).map((a: any) => ({
      name: AGE_LABEL[a.age] || a.age,
      남성: Number(a.M), 여성: Number(a.F)
    })), [d]);

  const total = d?.total_audience ?? 0;
  const male = d?.male ?? 0;
  const female = d?.female ?? 0;
  const mPct = pct(male, male + female);
  const fPct = 100 - mPct;
  const peakHour = d?.peak_hour;
  const topAge = AGE_LABEL[d?.top_age] ?? d?.top_age ?? "–";
  const regionTop: { region: string; cnt: number }[] = d?.region_top ?? [];
  const maxRegion = regionTop[0]?.cnt ?? 1;

  const pieData = [
    { name: "남성", value: male, c: P.m },
    { name: "여성", value: female, c: P.f },
  ];

  const noData = !d || total === 0;

  return (
    <div style={{ padding: "24px 28px 40px", background: P.bg, minHeight: 600 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.text, marginBottom: 3 }}>
          {tab === "subway" ? "🚇 지하철" : "🚌 버스"} 이용 세그먼트
        </div>
        <div style={{ fontSize: 12, color: P.sub }}>교통카드 이용 데이터 기반 오디언스 분석</div>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>교통유형</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CAT_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={cat === o.value} onClick={() => setCat(o.value)} />)}
          </div>
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>승하차</div>
          <div style={{ display: "flex", gap: 6 }}>
            {ONOFF_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={onOff === o.value} onClick={() => setOnOff(o.value)} />)}
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 13 }}>분석 중…</div>
      )}

      {!isLoading && noData && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🚇</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.sub, marginBottom: 4 }}>교통 데이터 집계 중</div>
          <div style={{ fontSize: 12, color: P.sub }}>오늘 19:00 KST 이후 데이터가 반영됩니다</div>
        </div>
      )}

      {!isLoading && !noData && (
        <>
          {/* KPI 4개 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "총 오디언스", value: fmt(total) + "명", sub: `전체 대비` },
              { label: "남녀 비율", value: `${mPct}:${fPct}`, sub: `남성 ${fmt(male)} · 여성 ${fmt(female)}` },
              { label: "피크 이용시간", value: peakHour != null ? `${peakHour}시` : "–", sub: peakHour != null ? (peakHour >= 6 && peakHour <= 10 ? "출근 시간대" : peakHour >= 17 && peakHour <= 20 ? "퇴근 시간대" : "낮 시간대") : "" },
              { label: "주력 연령대", value: topAge, sub: "최다 이용 연령" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em", marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 10, color: P.sub }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 시간대별 이용 분포 */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
              ⏰ 시간대별 이용 분포
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: P.sub }} tickFormatter={v => fmt(v)} width={40} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), "이용자"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="cnt" radius={[4, 4, 0, 0]}>
                  {hourData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: P.sub, marginTop: 6 }}>
              🟩 출퇴근 시간대 (7~9시, 17~19시) 강조
            </div>
          </div>

          {/* 연령×성별 + 지역 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* 연령×성별 */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                👥 연령 × 성별 분포
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 100, height: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44}
                        dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.c} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  {[{ label: "남성", pct: mPct, c: P.m }, { label: "여성", pct: fPct, c: P.f }].map(r => (
                    <div key={r.label} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: r.c, fontWeight: 700 }}>{r.label}</span>
                        <span style={{ color: P.sub }}>{r.pct}%</span>
                      </div>
                      <div style={{ background: P.bg, borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${r.pct}%`, background: r.c, borderRadius: 4, height: "100%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={ageData} barSize={10} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: P.sub }} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), ""]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  <Bar dataKey="남성" fill={P.m} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="여성" fill={P.f} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 지역 TOP 8 */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                📍 지역별 이용자
              </div>
              {regionTop.map((r, i) => {
                const w = r.cnt / maxRegion * 100;
                return (
                  <div key={r.region} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: P.text, fontWeight: i < 3 ? 700 : 400 }}>
                        {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}.`} {r.region}
                      </span>
                      <span style={{ color: P.sub }}>{fmt(Number(r.cnt))}명</span>
                    </div>
                    <div style={{ background: P.bg, borderRadius: 4, height: 5 }}>
                      <div style={{ width: `${w}%`, background: i === 0 ? P.accent : P.border, borderRadius: 4, height: "100%", transition: "width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: P.sub }}>
            📌 노선·역 세그먼트는 데이터 검증 후 순차 추가 예정
          </div>
        </>
      )}
    </div>
  );
}
