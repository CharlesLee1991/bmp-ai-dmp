"use client";
/* ══════════════════════════════════════════════════════════════════
   매체 3D 탐색기 — 기존 'gl3d'(ECharts-GL)와 'BizViz'(three.js) 시각화 모듈을
   하나의 3D 뷰로 병합. 상단 탭으로 3-축 결합(탐색 모드)을 바꿔가며 dig 탐색.
   - 탭 우측 확대 토글: 브라우저 전체창 모달 ↔ 인라인 (유튜브식 플로팅 전체창).
   - 렌더러는 뷰별 최적: 3-축 산점/시계열=ECharts-GL, 궤도 조망=three.js(BizViz Cosmos).
   - 색은 var() 대신 고정 hex('브랜드 격리 다크' 도크트린) — 캔버스 가독성 확보.
   ══════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Minimize2, Box, Target, Filter, GitCompareArrows, Orbit } from "lucide-react";

const CosmosCanvas = dynamic(() => import("./BizVizMediaCharts").then(m => m.CosmosCanvas), { ssr: false });

export type MediaRow = { platform_name: string; platform_idx: number; impressions: number; clicks: number; conversions: number; ad_spend: number; ctr_pct: number };
export type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

const C = { bg: "#0f1420", surface: "#161c28", line: "#2a3446", grid: "#1c2432", ink: "#e2e8f0", dim: "#9aa7bd", accent: "#38bdf8", hot: "#f2685a" };

const fmt = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(Math.round(n));
const won = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : n >= 1e4 ? `${(n / 1e4).toFixed(0)}만원` : `${Math.round(n)}원`;
const pct = (n: number) => `${n.toFixed(2)}%`;
const shortName = (s: string, n = 9) => s.length > n ? s.slice(0, n) + "…" : s;
const mmdd = (d: string) => d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d.slice(5);

let glPromise: Promise<any> | null = null;
function loadEchartsGL(): Promise<any> {
  if (glPromise) return glPromise;
  glPromise = (async () => { const echarts = await import("echarts"); await import("echarts-gl"); return echarts; })();
  return glPromise;
}
function useChart(option: any, deps: any[], height: number | string) {
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

// ── 탐색 모드 정의 (3-5개, 재정의) ──
type AxisDef = { name: string; fmt: (v: number) => string; get: (r: MediaRow) => number };
type ScatterMode = { key: string; label: string; icon: any; kind: "scatter"; desc: string; x: AxisDef; y: AxisDef; z: AxisDef; colorDim: 0 | 1 | 2; colorRamp: string[] };
type BarMode = { key: string; label: string; icon: any; kind: "bar-time"; desc: string };
type CosmosMode = { key: string; label: string; icon: any; kind: "cosmos"; desc: string };
type Mode = ScatterMode | BarMode | CosmosMode;

const cvr = (r: MediaRow) => r.impressions > 0 ? (r.conversions / r.impressions) * 100 : 0;
const ctr = (r: MediaRow) => r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
const cpa = (r: MediaRow) => r.conversions > 0 ? r.ad_spend / r.conversions : 0;

const MODES: Mode[] = [
  { key: "time", label: "시간 × 매체 × 노출", icon: Box, kind: "bar-time",
    desc: "x = 날짜 · y = 매체 TOP8 · z = 노출 — 특정 매체가 특정 날짜에 터진 봉우리를 탐색" },
  { key: "eff", label: "광고비 × 전환율 × 노출", icon: Target, kind: "scatter",
    desc: "x = 광고비 · y = 전환율 · z = 노출 — 저비용·고전환·고노출(좌상단 상공)이 이상적",
    x: { name: "광고비", fmt: won, get: r => r.ad_spend }, y: { name: "전환율(%)", fmt: pct, get: cvr }, z: { name: "노출", fmt, get: r => r.impressions }, colorDim: 2, colorRamp: ["#b9e4d0", "#3bd6b4", "#4a90e2", "#5aa2f0", "#7b61ff"] },
  { key: "acq", label: "획득비용 × 클릭률 × 전환수", icon: Filter, kind: "scatter",
    desc: "x = CPA(전환당비용) · y = CTR(클릭률) · z = 전환수 — 저CPA·고CTR·고전환(좌상단 상공)이 효율 우위",
    x: { name: "CPA", fmt: won, get: cpa }, y: { name: "CTR(%)", fmt: pct, get: ctr }, z: { name: "전환수", fmt, get: r => r.conversions }, colorDim: 0, colorRamp: ["#3bd6b4", "#4a90e2", "#7b61ff", "#f0a13b", "#f2685a"] },
  { key: "funnel", label: "노출 × 클릭 × 전환 (퍼널 3축)", icon: GitCompareArrows, kind: "scatter",
    desc: "x = 노출 · y = 클릭 · z = 전환 — 원점에서 뻗는 대각선에 가까울수록 퍼널이 균형적",
    x: { name: "노출", fmt, get: r => r.impressions }, y: { name: "클릭", fmt, get: r => r.clicks }, z: { name: "전환", fmt, get: r => r.conversions }, colorDim: 2, colorRamp: ["#e3f0ff", "#9ec5f2", "#4a90e2", "#2f80ed", "#0b3d91"] },
  { key: "cosmos", label: "매체 우주 조망 — 궤도계", icon: Orbit, kind: "cosmos",
    desc: "반경 = 광고비 · 크기 = 노출 · 색 = 매체 — 매체 포트폴리오 전체를 궤도로 조망(회전·줌으로 dig)" },
];

// ── ECharts-GL: 3-축 산점 ──
function ScatterView({ rows, mode, height }: { rows: MediaRow[]; mode: ScatterMode; height: number | string }) {
  const pts = useMemo(() => rows.filter(r => r.impressions > 0).slice(0, 60)
    .map(r => ({ value: [mode.x.get(r), mode.y.get(r), mode.z.get(r)], name: r.platform_name }))
    .filter(p => p.value.every(v => Number.isFinite(v))), [rows, mode]);
  const maxC = Math.max(1, ...pts.map(p => p.value[mode.colorDim]));
  const option = pts.length ? {
    tooltip: { formatter: (p: any) => `<b>${p.data.name}</b><br/>${mode.x.name} ${mode.x.fmt(p.value[0])}<br/>${mode.y.name} ${mode.y.fmt(p.value[1])}<br/>${mode.z.name} ${mode.z.fmt(p.value[2])}`,
      backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, textStyle: { color: C.ink, fontSize: 12 } },
    visualMap: { max: maxC, dimension: mode.colorDim, show: true, right: 10, top: "center", calculable: true, textStyle: { color: C.dim, fontSize: 10 }, formatter: (v: number) => fmt(v), inRange: { color: mode.colorRamp } },
    xAxis3D: { type: "value", name: mode.x.name, nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => mode.x.fmt(v) } },
    yAxis3D: { type: "value", name: mode.y.name, nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => mode.y.fmt(v) } },
    zAxis3D: { type: "value", name: mode.z.name, nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => mode.z.fmt(v) } },
    grid3D: { boxWidth: 110, boxDepth: 110, boxHeight: 84, viewControl: { autoRotate: false, distance: 205, alpha: 20, beta: 38 },
      light: { main: { intensity: 1.1, alpha: 35, beta: 30 }, ambient: { intensity: 0.45 } },
      axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.grid } }, environment: C.bg },
    series: [{ type: "scatter3D", symbolSize: 14, data: pts, itemStyle: { opacity: 0.86, borderWidth: 0.6, borderColor: "rgba(0,0,0,.18)" },
      emphasis: { itemStyle: { color: C.hot }, label: { show: true, formatter: (p: any) => p.data.name, textStyle: { color: C.ink, fontSize: 11, backgroundColor: C.surface, padding: 4, borderRadius: 4 } } } }],
  } : null;
  const el = useChart(option, [JSON.stringify(pts.length), mode.key, height], height);
  return option ? el : <Empty msg="데이터 로딩 중…" h={height} />;
}

// ── ECharts-GL: 시간 × 매체 × 노출 (bar3D) ──
function BarTimeView({ series, height }: { series: { name: string; rows: DailyRow[] }[]; height: number | string }) {
  const dates = series[0]?.rows.map(r => mmdd(r.date)) || [];
  const names = series.map(s => shortName(s.name));
  const data: any[] = []; let maxV = 1;
  series.forEach((s, yi) => s.rows.forEach((r, xi) => { data.push([xi, yi, r.impressions]); if (r.impressions > maxV) maxV = r.impressions; }));
  const option = dates.length ? {
    tooltip: { formatter: (p: any) => `${names[p.value[1]]}<br/>${dates[p.value[0]]}<br/><b>노출 ${fmt(p.value[2])}</b>`, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, textStyle: { color: C.ink, fontSize: 12 } },
    visualMap: { max: maxV, show: true, right: 10, top: "center", calculable: true, textStyle: { color: C.dim, fontSize: 10 }, formatter: (v: number) => fmt(v), inRange: { color: ["#e3f0ff", "#9ec5f2", "#4a90e2", "#2f80ed", "#0b3d91"] } },
    xAxis3D: { type: "category", data: dates, name: "날짜", nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 8)) } },
    yAxis3D: { type: "category", data: names, name: "매체", nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9 } },
    zAxis3D: { type: "value", name: "노출", nameTextStyle: { color: C.dim, fontSize: 11 }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => fmt(v) } },
    grid3D: { boxWidth: 150, boxDepth: 82, boxHeight: 66, viewControl: { autoRotate: false, distance: 215, alpha: 22, beta: 32 },
      light: { main: { intensity: 1.15, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.42 } },
      axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.grid } }, axisPointer: { lineStyle: { color: C.accent } }, environment: C.bg },
    series: [{ type: "bar3D", data, shading: "lambert", barSize: 4.2, itemStyle: { opacity: 0.94 }, emphasis: { label: { show: false }, itemStyle: { color: C.hot } } }],
  } : null;
  const el = useChart(option, [JSON.stringify(data.length), series.length, dates.length, height], height);
  return option ? el : <Empty msg="일별 데이터 로딩 중…" h={height} />;
}

function Empty({ msg, h }: { msg: string; h: number | string }) {
  return <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 13 }}>{msg}</div>;
}

export default function Media3DExplorer({ rows, days }: { rows: MediaRow[]; days: number }) {
  const [modeKey, setModeKey] = useState("time");
  const [fullscreen, setFullscreen] = useState(false);
  const [series, setSeries] = useState<{ name: string; rows: DailyRow[] }[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const mode = MODES.find(m => m.key === modeKey)!;

  // 시간 모드: 매체 TOP8 일별 시계열 병렬 조달
  useEffect(() => {
    if (modeKey !== "time") return;
    const top = [...rows].filter(r => r.impressions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 8);
    if (!top.length) { setSeries([]); return; }
    let alive = true; setTLoading(true);
    Promise.all(top.map(t => fetch(`/api/media?view=daily&days=${days}&platform_idx=${t.platform_idx}`).then(r => r.json())
      .then(d => ({ name: t.platform_name, rows: (d.rows || []) as DailyRow[] })).catch(() => ({ name: t.platform_name, rows: [] as DailyRow[] }))))
      .then(res => { if (!alive) return; const ok = res.filter(s => s.rows.length > 0); const len = Math.max(0, ...ok.map(s => s.rows.length)); setSeries(ok.filter(s => s.rows.length === len)); })
      .finally(() => alive && setTLoading(false));
    return () => { alive = false; };
  }, [rows, days, modeKey]);

  // esc로 전체창 닫기
  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fullscreen]);

  const chartHeight = fullscreen ? "calc(100vh - 118px)" : 440;
  const chart = mode.kind === "bar-time"
    ? (tLoading && !series.length ? <Empty msg="매체별 일별 시계열 조달 중…" h={chartHeight} /> : <BarTimeView key={`bt-${fullscreen}`} series={series} height={chartHeight} />)
    : mode.kind === "cosmos"
    ? <CosmosCanvas key={`cos-${fullscreen}`} rows={rows} height={chartHeight} />
    : <ScatterView key={`sc-${modeKey}-${fullscreen}`} rows={rows} mode={mode} height={chartHeight} />;

  // 탭바 + 확대 토글
  const tabBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.line}`, background: C.surface, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        {MODES.map(m => {
          const active = m.key === modeKey; const Icon = m.icon;
          return (
            <button key={m.key} onClick={() => setModeKey(m.key)} title={m.desc}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
                border: `1px solid ${active ? C.accent : C.line}`, background: active ? "rgba(56,189,248,0.14)" : "transparent", color: active ? "#bfe6ff" : C.dim, whiteSpace: "nowrap" }}>
              <Icon size={13} strokeWidth={2.1} />{m.label}
            </button>
          );
        })}
      </div>
      <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? "화면 내로 복귀 (Esc)" : "브라우저 전체창으로 확대"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.accent}`, background: "rgba(56,189,248,0.14)", color: "#bfe6ff", flexShrink: 0 }}>
        {fullscreen ? <><Minimize2 size={13} strokeWidth={2.2} /> 복귀</> : <><Maximize2 size={13} strokeWidth={2.2} /> 전체창</>}
      </button>
    </div>
  );

  const body = (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: fullscreen ? 0 : 10, overflow: "hidden", background: C.surface, display: "flex", flexDirection: "column", height: fullscreen ? "100%" : "auto" }}>
      {tabBar}
      <div style={{ flex: 1, minHeight: 0 }}>{chart}</div>
      <div style={{ fontSize: 11, color: C.dim, padding: "8px 16px", borderTop: `1px solid ${C.line}` }}>
        {mode.desc} · <span style={{ color: C.ink }}>드래그: 회전 · 휠: 줌</span>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: C.bg, padding: 0, display: "flex", flexDirection: "column" }}>
        {body}
      </div>
    );
  }
  return body;
}
