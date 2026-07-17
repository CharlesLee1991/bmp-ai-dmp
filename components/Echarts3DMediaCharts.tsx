"use client";
/*
  진짜 3D 시각화 — ECharts-GL (Apache-2.0 / MIT)
  원칙: 3번째 축이 실제 데이터일 때만 3D. "2D를 세운 3D 막대/도넛" 금지.
    ① 3D Bar    : x=날짜 · y=매체 · z=노출  → 시간×매체 입체 지형
    ② 3D Scatter: x=광고비 · y=전환율 · z=노출 → 3축 효율 공간
*/
import { useEffect, useRef, useState } from "react";
import { Box, Globe } from "lucide-react";

export type MediaRow = {
  platform_name: string; platform_idx: number;
  impressions: number; clicks: number; conversions: number;
  ad_spend: number; ctr_pct: number;
};
export type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

/* ECharts-GL(WebGL 캔버스)은 CSS var()를 해석하지 못한다 → 3D 장면 배경은 항상 어둡고,
   var() 라벨/범례는 기본 검정으로 렌더되어 안 보였다. BizViz와 동일한 '브랜드 격리 다크'
   도크트린으로 고정 hex(밝은 글자·어두운 배경)를 사용해 라이트/다크 무관하게 가독성 확보. */
const C = { bg: "#0f1420", surface: "#161c28", line: "#2a3446", grid: "#1c2432", ink: "#e2e8f0", dim: "#9aa7bd", accent: "#38bdf8", hot: "#f2685a" };
const P = { border: C.line, sub: C.dim, text: C.ink, accent: C.accent };
const panel: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", background: C.surface };
const head: React.CSSProperties = { padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}` };
const sub: React.CSSProperties = { color: C.dim, fontWeight: 400, fontSize: 11, marginLeft: 8 };

const fmt = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(Math.round(n));
const won = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : `${(n / 1e4).toFixed(0)}만원`;
const shortName = (s: string, n = 9) => s.length > n ? s.slice(0, n) + "…" : s;
const mmdd = (d: string) => d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d.slice(5);

// echarts + echarts-gl 지연 로드 (선택 시에만)
let glPromise: Promise<any> | null = null;
function loadEchartsGL(): Promise<any> {
  if (glPromise) return glPromise;
  glPromise = (async () => {
    const echarts = await import("echarts");
    await import("echarts-gl");
    return echarts;
  })();
  return glPromise;
}

function useChart(option: any, deps: any[], height: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !option) return;
    let inst: any = null, ro: ResizeObserver | null = null, dead = false;
    loadEchartsGL().then((echarts) => {
      if (dead || !ref.current) return;
      inst = echarts.init(ref.current);
      inst.setOption(option);
      ro = new ResizeObserver(() => inst && inst.resize());
      ro.observe(ref.current);
    });
    return () => { dead = true; if (ro) ro.disconnect(); if (inst) inst.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={ref} style={{ width: "100%", height }} />;
}

// ── ① 3D Bar : 날짜 × 매체 × 노출 ──
function Bar3D({ series }: { series: { name: string; rows: DailyRow[] }[] }) {
  const dates = series[0]?.rows.map(r => mmdd(r.date)) || [];
  const names = series.map(s => shortName(s.name));
  const data: any[] = [];
  let maxV = 1;
  series.forEach((s, yi) => s.rows.forEach((r, xi) => {
    data.push([xi, yi, r.impressions]);
    if (r.impressions > maxV) maxV = r.impressions;
  }));
  const option = dates.length ? {
    tooltip: {
      formatter: (p: any) => `${names[p.value[1]]}<br/>${dates[p.value[0]]}<br/><b>노출 ${fmt(p.value[2])}</b>`,
      backgroundColor: C.surface, borderColor: P.border, borderWidth: 1,
      textStyle: { color: P.text, fontSize: 12 },
    },
    visualMap: {
      max: maxV, show: true, right: 8, top: "center", calculable: true,
      textStyle: { color: P.sub, fontSize: 10 }, formatter: (v: number) => fmt(v),
      inRange: { color: ["#e3f0ff", "#9ec5f2", "#4a90e2", "#2f80ed", "#0b3d91"] },
    },
    xAxis3D: { type: "category", data: dates, name: "날짜", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 8)) } },
    yAxis3D: { type: "category", data: names, name: "매체", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9 } },
    zAxis3D: { type: "value", name: "노출", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9, formatter: (v: number) => fmt(v) } },
    grid3D: {
      boxWidth: 150, boxDepth: 78, boxHeight: 62,
      viewControl: { autoRotate: false, distance: 210, alpha: 22, beta: 32 },
      light: { main: { intensity: 1.15, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.42 } },
      axisLine: { lineStyle: { color: C.line } },
      splitLine: { lineStyle: { color: C.grid } },
      axisPointer: { lineStyle: { color: P.accent } },
      environment: C.bg,
    },
    series: [{ type: "bar3D", data, shading: "lambert", barSize: 4.2, itemStyle: { opacity: 0.94 }, emphasis: { label: { show: false }, itemStyle: { color: "#f2685a" } } }],
  } : null;
  const el = useChart(option, [JSON.stringify(data.length), series.length, dates.length], 400);
  return option ? el : <Empty msg="일별 데이터 로딩 중…" h={400} />;
}

// ── ② 3D Scatter : 광고비 × 전환율 × 노출 ──
function Scatter3D({ rows }: { rows: MediaRow[] }) {
  const pts = rows.filter(r => r.impressions > 0).slice(0, 40).map(r => ({
    v: [r.ad_spend, r.impressions > 0 ? (r.conversions / r.impressions) * 100 : 0, r.impressions],
    name: r.platform_name,
  }));
  const maxImp = Math.max(1, ...pts.map(p => p.v[2]));
  const option = pts.length ? {
    tooltip: {
      formatter: (p: any) => `<b>${p.data.name}</b><br/>광고비 ${won(p.value[0])}<br/>전환율 ${p.value[1].toFixed(2)}%<br/>노출 ${fmt(p.value[2])}`,
      backgroundColor: C.surface, borderColor: P.border, borderWidth: 1, textStyle: { color: P.text, fontSize: 12 },
    },
    visualMap: {
      max: maxImp, dimension: 2, show: true, right: 8, top: "center", calculable: true,
      textStyle: { color: P.sub, fontSize: 10 }, formatter: (v: number) => fmt(v),
      inRange: { color: ["#b9e4d0", "#3bd6b4", "#4a90e2", "#5aa2f0", "#7b61ff"] },
    },
    xAxis3D: { type: "value", name: "광고비", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9, formatter: (v: number) => won(v) } },
    yAxis3D: { type: "value", name: "전환율(%)", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9 } },
    zAxis3D: { type: "value", name: "노출", nameTextStyle: { color: P.sub, fontSize: 11 }, axisLabel: { color: P.sub, fontSize: 9, formatter: (v: number) => fmt(v) } },
    grid3D: {
      boxWidth: 110, boxDepth: 110, boxHeight: 78,
      viewControl: { autoRotate: false, distance: 200, alpha: 20, beta: 38 },
      light: { main: { intensity: 1.1, alpha: 35, beta: 30 }, ambient: { intensity: 0.45 } },
      axisLine: { lineStyle: { color: C.line } },
      splitLine: { lineStyle: { color: C.grid } },
      environment: C.bg,
    },
    series: [{
      type: "scatter3D", symbolSize: 14,
      data: pts.map(p => ({ value: p.v, name: p.name })),
      itemStyle: { opacity: 0.86, borderWidth: 0.6, borderColor: "rgba(0,0,0,.18)" },
      emphasis: { itemStyle: { color: "#f2685a" }, label: { show: true, formatter: (p: any) => p.data.name, textStyle: { color: P.text, fontSize: 11, backgroundColor: C.surface, padding: 4, borderRadius: 4 } } },
    }],
  } : null;
  const el = useChart(option, [rows.length], 400);
  return option ? el : <Empty msg="데이터 로딩 중…" h={400} />;
}

function Empty({ msg, h }: { msg: string; h: number }) {
  return <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: P.sub, fontSize: 13 }}>{msg}</div>;
}

// ── 컨테이너 : 매체별 일별 시계열 병렬 조달 ──
export default function Echarts3DMediaCharts({ rows, days }: { rows: MediaRow[]; days: number }) {
  const [series, setSeries] = useState<{ name: string; rows: DailyRow[] }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const top = [...rows].filter(r => r.impressions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 8);
    if (!top.length) { setSeries([]); return; }
    let alive = true;
    setLoading(true);
    Promise.all(top.map(t =>
      fetch(`/api/media?view=daily&days=${days}&platform_idx=${t.platform_idx}`)
        .then(r => r.json())
        .then(d => ({ name: t.platform_name, rows: (d.rows || []) as DailyRow[] }))
        .catch(() => ({ name: t.platform_name, rows: [] as DailyRow[] }))
    )).then(res => {
      if (!alive) return;
      const ok = res.filter(s => s.rows.length > 0);
      const len = Math.max(0, ...ok.map(s => s.rows.length));
      setSeries(ok.filter(s => s.rows.length === len));
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [rows, days]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={panel}>
        <div style={head}>
          <Box size={15} style={{ verticalAlign: "-2px", marginRight: 6, color: C.accent }} />시간 × 매체 × 노출 — 3D 지형
          <span style={sub}>x = 날짜 · y = 매체 TOP8 · z = 노출 · 색 = 노출 강도 (3축 전부 실데이터)</span>
        </div>
        {loading && !series.length ? <Empty msg="매체별 일별 시계열 조달 중…" h={400} /> : <Bar3D series={series} />}
        <div style={{ fontSize: 11, color: P.sub, padding: "0 16px 10px" }}>드래그: 회전 · 휠: 줌 · 봉우리 = 특정 매체가 특정 날짜에 터진 지점</div>
      </div>
      <div style={panel}>
        <div style={head}>
          <Globe size={15} style={{ verticalAlign: "-2px", marginRight: 6, color: C.accent }} />광고비 × 전환율 × 노출 — 3D 효율 공간
          <span style={sub}>x = 광고비 · y = 전환율 · z = 노출 · 색 = 노출 강도 (3축 전부 실데이터)</span>
        </div>
        {rows.length ? <Scatter3D rows={rows} /> : <Empty msg="데이터 로딩 중…" h={400} />}
        <div style={{ fontSize: 11, color: P.sub, padding: "0 16px 10px" }}>드래그: 회전 · 휠: 줌 · 호버: 매체명 · 저비용×고전환×고노출 = 좌상단 상공</div>
      </div>
    </div>
  );
}
