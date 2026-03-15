"use client";

import { useState } from "react";
import useSWR from "swr";
import { fmt } from "@/lib/data";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096", accent: "#0d9488",
  green: "#10b981", glow: "rgba(13,148,136,0.08)",
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ExportRow {
  id: number;
  segment_name: string;
  filters: Record<string, any>;
  audience_count: number;
  env: string;
  runcomm_target_id: string | null;
  status: string;
  memo: string | null;
  created_at: string;
  user_name: string;
  username: string;
}

export default function ExportHistoryTab({ userRole }: { userRole: string }) {
  const [envFilter, setEnvFilter] = useState<"all" | "dev" | "prod">("all");

  const { data: apiData, isLoading, mutate } = useSWR("/api/exports", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const rows: ExportRow[] = apiData?.success ? apiData.data : [];
  const filtered = envFilter === "all" ? rows : rows.filter(r => r.env === envFilter);

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const filterSummary = (f: Record<string, any>) => {
    const parts: string[] = [];
    if (f.sex) parts.push(f.sex.split(",").map((s: string) => s === "M" ? "남" : s === "F" ? "여" : "?").join(""));
    if (f.age_group) parts.push(f.age_group);
    if (f.region) parts.push(f.region.split(",").map((s: string) => s.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "")).join(","));
    if (f.major_category) parts.push(f.major_category);
    if (f.middle_category) parts.push(f.middle_category);
    return parts.join(" · ") || "전체";
  };

  if (isLoading && !apiData) {
    return <div style={{ padding: "60px 28px", textAlign: "center", color: P.sub, fontSize: 13 }}>전송 이력 로딩 중...</div>;
  }

  return (
    <div style={{ padding: "16px 28px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: P.text }}>📋 전송 이력</h3>
          <span style={{ fontSize: 11, color: P.sub, background: P.glow, padding: "3px 10px", borderRadius: 12 }}>
            {filtered.length}건
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "prod", "dev"] as const).map(env => (
            <button key={env} onClick={() => setEnvFilter(env)} style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: envFilter === env ? 700 : 400,
              cursor: "pointer", border: `1px solid ${envFilter === env ? P.accent : P.border}`,
              background: envFilter === env ? P.glow : "transparent",
              color: envFilter === env ? P.accent : P.sub
            }}>{env === "all" ? "전체" : env === "prod" ? "🟢 상용" : "🧪 개발"}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          padding: "60px 28px", textAlign: "center", background: P.card,
          borderRadius: 12, border: `1px solid ${P.border}`
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 6 }}>전송 이력이 없습니다</div>
          <div style={{ fontSize: 12, color: P.sub }}>오디언스 탭에서 필터를 설정하고 전송해보세요</div>
        </div>
      ) : (
        <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: "hidden" }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: userRole === "admin" ? "2fr 2.5fr 1fr 0.8fr 1.2fr 1.2fr" : "2fr 2.5fr 1fr 0.8fr 1.2fr",
            padding: "10px 16px", background: P.bg, borderBottom: `1px solid ${P.border}`,
            fontSize: 10, fontWeight: 700, color: P.sub, letterSpacing: ".04em", textTransform: "uppercase" as const
          }}>
            <span>그룹명</span>
            <span>필터 조건</span>
            <span style={{ textAlign: "right" }}>오디언스</span>
            <span style={{ textAlign: "center" }}>환경</span>
            {userRole === "admin" && <span>전송자</span>}
            <span style={{ textAlign: "right" }}>일시</span>
          </div>

          {/* Rows */}
          {filtered.map(row => (
            <div key={row.id} style={{
              display: "grid",
              gridTemplateColumns: userRole === "admin" ? "2fr 2.5fr 1fr 0.8fr 1.2fr 1.2fr" : "2fr 2.5fr 1fr 0.8fr 1.2fr",
              padding: "12px 16px", borderBottom: `1px solid ${P.border}`,
              alignItems: "center", fontSize: 12, color: P.text,
              transition: "background .1s"
            }}
              onMouseEnter={e => (e.currentTarget.style.background = P.glow)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.segment_name}
                </div>
                {row.memo && <div style={{ fontSize: 10, color: P.sub, marginTop: 2 }}>{row.memo}</div>}
              </div>
              <div style={{ fontSize: 11, color: P.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filterSummary(row.filters)}
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmt(row.audience_count)}
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: row.env === "prod" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  color: row.env === "prod" ? "#059669" : "#d97706"
                }}>{row.env === "prod" ? "상용" : "개발"}</span>
              </div>
              {userRole === "admin" && (
                <div style={{ fontSize: 11, color: P.sub }}>{row.user_name}</div>
              )}
              <div style={{ textAlign: "right", fontSize: 11, color: P.sub }}>
                {fmtDate(row.created_at)}
                {row.runcomm_target_id && (
                  <div style={{ fontSize: 9, color: P.accent, marginTop: 1 }}>ID: {row.runcomm_target_id}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
