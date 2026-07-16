import React from "react";

const C = { card: "var(--card)", border: "var(--border)", text: "var(--text)", sub: "var(--sub)", accent: "var(--accent)" };

const ST: Record<string, { bg: string; fg: string; label: string }> = {
  ready: { bg: "#dcfce7", fg: "#166534", label: "준비됨" },
  soon: { bg: "#fef9c3", fg: "#854d0e", label: "곧 제공" },
  block: { bg: "#fee2e2", fg: "#991b1b", label: "런컴 데이터" },
};

type Dim = { name: string; status: "ready" | "soon" | "block"; note?: string };

const MAP: Record<string, { icon: string; title: string; desc: string; dims: Dim[]; foot: string }> = {
  subway: {
    icon: "🚇",
    title: "지하철 이용 행태",
    desc: "기본 구분(성별·연령·지역) + 지하철 이용 차원으로 오디언스를 찾습니다.",
    dims: [
      { name: "교통수단 (지하철)", status: "soon", note: "큐브 재적재 시" },
      { name: "지역 (시도)", status: "ready", note: "100% 채움" },
      { name: "시간대", status: "ready", note: "100% 채움" },
      { name: "노선 · 역", status: "block", note: "현재 빈값" },
      { name: "승하차", status: "block" },
    ],
    foot: "현행 cube_transit은 노선·역·교통수단 구분이 비어 있어, tb_tam_f1 재적재로 ‘교통수단·지역·시간’부터 활성화합니다. 노선·역은 런컴 원본 확정 후 추가.",
  },
  bus: {
    icon: "🚌",
    title: "버스 이용 행태",
    desc: "기본 구분(성별·연령·지역) + 버스 이용 차원으로 오디언스를 찾습니다.",
    dims: [
      { name: "교통수단 (버스)", status: "soon", note: "큐브 재적재 시" },
      { name: "지역 (시도)", status: "ready" },
      { name: "시간대", status: "ready" },
      { name: "노선", status: "block", note: "현재 빈값" },
    ],
    foot: "지하철과 동일 큐브(cube_transit)를 공유합니다. 재적재로 버스/지하철을 분리하면 함께 활성화됩니다.",
  },
  membership: {
    icon: "🎟️",
    title: "멤버십 사용 행태",
    desc: "기본 구분(성별·연령·지역) + 멤버십 적립/사용 차원으로 오디언스를 찾습니다.",
    dims: [
      { name: "적립/사용 업종", status: "block" },
      { name: "지역 (시도·시군구·읍면동)", status: "block" },
      { name: "요일 · 시간", status: "block" },
      { name: "횟수 · 금액", status: "block" },
    ],
    foot: "멤버십은 데이터·큐브·키가 모두 없는 상태입니다. 런컴 데이터 공급 라인 확정(또는 point_path='M' PoC) 후 카드 탭과 동일 파이프라인으로 구축합니다.",
  },
};

export default function BehaviorPlaceholder({ behavior }: { behavior: string }) {
  const m = MAP[behavior];
  if (!m) return null;
  return (
    <div style={{ margin: "40px 28px", padding: "48px 32px", border: "2px dashed var(--border-strong)", borderRadius: 16, background: C.card, textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>{m.icon}</div>
      <h2 style={{ fontSize: 20, margin: "12px 0 6px", color: C.text }}>{m.title}</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 24 }}>{m.desc}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 680, margin: "0 auto" }}>
        {m.dims.map((d, i) => (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 12, minWidth: 160, textAlign: "left", background: "var(--card-2)" }}>
            <b style={{ display: "block", fontSize: 12, marginBottom: 6 }}>{d.name}</b>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: ST[d.status].bg, color: ST[d.status].fg }}>{ST[d.status].label}</span>
            {d.note && <span style={{ fontSize: 10, color: C.sub }}> · {d.note}</span>}
          </div>
        ))}
      </div>
      <p style={{ color: C.sub, fontSize: 12, marginTop: 20, maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>{m.foot}</p>
    </div>
  );
}
