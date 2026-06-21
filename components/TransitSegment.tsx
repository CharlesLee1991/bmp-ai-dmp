"use client";
import React, { useState } from "react";
import useSWR from "swr";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096",
  accent: "#0d9488", glow: "rgba(13,148,136,0.08)",
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
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 20, fontSize: 12,
        fontWeight: active ? 700 : 400, cursor: "pointer",
        border: `1px solid ${active ? P.accent : P.border}`,
        background: active ? P.glow : P.card,
        color: active ? P.accent : P.sub, transition: "all .15s",
      }}
    >{label}</button>
  );
}

const fmt = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();

interface Props {
  tab: "subway" | "bus";
  sidos?: string[];
  sexes?: string[];
  ages?: string[];
  ymFrom?: string;
  ymTo?: string;
}

export default function TransitSegment({ tab, sidos = [], sexes = [], ages = [], ymFrom, ymTo }: Props) {
  const [cat, setCat] = useState("");
  const [onOff, setOnOff] = useState("");

  const segKey = `transit|${tab}|${cat}|${onOff}|${sidos.join(",")}|${sexes.join(",")}|${ages.join(",")}|${ymFrom}|${ymTo}`;

  const { data, isLoading } = useSWR(
    `/api/segment-preview#${segKey}`,
    async () => {
      const segs: { seg: string; value: string | string[]; }[] = [];

      // 기본 필터 (성별·연령·지역) — AND 결합
      if (sexes.length) segs.push({ seg: "gender", value: sexes.length === 1 ? sexes[0] : sexes });
      if (ages.length) segs.push({ seg: "age", value: ages.length === 1 ? ages[0] : ages });
      if (sidos.length) segs.push({ seg: "region", value: sidos.length === 1 ? sidos[0] : sidos });

      // 교통 필터
      if (cat) segs.push({ seg: "transit_cat", value: cat });
      else segs.push({ seg: "transit_cat", value: ["BSUB", "GSUB"] });
      if (onOff) segs.push({ seg: "transit_on_off", value: onOff });

      const res = await fetch("/api/segment-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: segs }),
      });
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 15000, keepPreviousData: true }
  );

  const audience: number | null = data?.success ? (data.data?.estimated_audience ?? 0) : null;
  const noData = audience === null || audience === 0;

  // 적용 중인 기본 필터 표시용
  const activeBaseFilters = [
    ...sexes.map(s => s === "M" ? "남성" : s === "F" ? "여성" : "알수없음"),
    ...ages.map(a => `${a}대`),
    ...sidos,
  ];

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.text, marginBottom: 4 }}>
          {tab === "subway" ? "🚇 지하철" : "🚌 버스"} 이용 세그먼트
        </div>
        <div style={{ fontSize: 12, color: P.sub }}>
          교통카드 이용 데이터 기반 · 오늘 19:00 KST 이후 집계 반영
        </div>
        {activeBaseFilters.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub }}>기본 필터 적용 중:</span>
            {activeBaseFilters.map((f, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: P.glow, color: P.accent, border: `1px solid ${P.accent}33` }}>{f}</span>
            ))}
          </div>
        )}
      </div>

      {/* 교통 필터 카드 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, marginBottom: 10, letterSpacing: ".05em" }}>교통유형</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CAT_OPTIONS.map(o => (
              <Chip key={o.value} label={o.label} active={cat === o.value} onClick={() => setCat(o.value)} />
            ))}
          </div>
        </div>

        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, marginBottom: 10, letterSpacing: ".05em" }}>승하차</div>
          <div style={{ display: "flex", gap: 6 }}>
            {ONOFF_OPTIONS.map(o => (
              <Chip key={o.value} label={o.label} active={onOff === o.value} onClick={() => setOnOff(o.value)} />
            ))}
          </div>
        </div>
      </div>

      {/* 오디언스 카운트 */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, marginBottom: 6, letterSpacing: ".05em" }}>
            예상 오디언스{activeBaseFilters.length > 0 ? ` (${activeBaseFilters.join(" · ")} 기준)` : ""}
          </div>
          {isLoading ? (
            <div style={{ fontSize: 13, color: P.sub }}>계산 중…</div>
          ) : noData ? (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: P.sub, letterSpacing: "-0.03em" }}>—</div>
              <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>
                오늘 19:00 KST 이후 교통 데이터가 반영됩니다
              </div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: 30, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em" }}>
                {fmt(audience!)}
              </span>
              <span style={{ fontSize: 13, color: P.sub, marginLeft: 4 }}>명</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 40, opacity: 0.12 }}>{tab === "subway" ? "🚇" : "🚌"}</div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: P.sub }}>
        📌 노선·역 세그먼트는 데이터 검증 후 순차 추가 예정
      </div>
    </div>
  );
}
