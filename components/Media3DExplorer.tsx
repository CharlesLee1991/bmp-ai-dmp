"use client";
/* ══════════════════════════════════════════════════════════════════
   매체 분석 워크스페이스 (구 3D 탐색기 확장)
   - 좌상단: 선택 탭의 분석 제목.  상단 우측: 뷰 형태 토글 · 기간 · 전체창.
   - 메인: 분석 탭(축 결합)을 여러 '뷰 형태'로 렌더 — 3D 입체분포 / 버블 / 히스토그램 / 관계형(노드망).
   - '매체 우주 조망'은 폐기 → 성과 프로파일 유사도 기반 '매체 상관 관계망'(Neo4j식 노드-엣지)으로 대체.
   - 우측 패널: 항목 온/오프 필터 + 선택 항목 상세.  하단: AI 인사이트(자연어 서술, 사용자 클릭 생성).
   - 렌더러: ECharts(2D graph/scatter/bar) + ECharts-GL(3D). 색은 고정 hex(브랜드 격리 다크).
   ══════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Box, Target, Filter, Share2, Grid3x3, BarChart2, Sparkles, RefreshCw, Eye, EyeOff, PanelRightClose, PanelRightOpen, SlidersHorizontal, X } from "lucide-react";

export type MediaRow = { platform_name: string; platform_idx: number; impressions: number; clicks: number; conversions: number; ad_spend: number; ctr_pct: number };
export type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

const C = { bg: "#0f1420", surface: "#161c28", panel: "#131926", line: "#2a3446", grid: "#1c2432", ink: "#e2e8f0", dim: "#9aa7bd", faint: "#6b7686", accent: "#38bdf8", hot: "#f2685a" };
const HEAT = ["#334155", "#3b6ea5", "#4a90e2", "#38bdf8", "#3bd6b4"]; // 저→고 (효율)

const fmt = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(Math.round(n));
const won = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : n >= 1e4 ? `${(n / 1e4).toFixed(0)}만원` : `${Math.round(n)}원`;
const pctS = (n: number) => `${n.toFixed(2)}%`;
const shortName = (s: string, n = 9) => s.length > n ? s.slice(0, n) + "…" : s;
const mmdd = (d: string) => d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d.slice(5);

const cvr = (r: MediaRow) => r.impressions > 0 ? (r.conversions / r.impressions) * 100 : 0;
const ctr = (r: MediaRow) => r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
const cpa = (r: MediaRow) => r.conversions > 0 ? r.ad_spend / r.conversions : 0;

// IQR(1.5×) 극단값 판정 — 현재 분석의 축(지표) 중 어느 하나라도 경계 밖이면 극단 매체
function iqrBounds(vals: number[]) {
  const s = [...vals].filter(Number.isFinite).sort((a, b) => a - b); const n = s.length;
  if (n < 4) return { lo: -Infinity, hi: Infinity };
  const q = (p: number) => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
  return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
}
function outlierSet(rows: MediaRow[], metrics: ((r: MediaRow) => number)[]): Set<number> {
  const bounds = metrics.map(m => iqrBounds(rows.map(m)));
  const out = new Set<number>();
  rows.forEach(r => { if (metrics.some((m, i) => { const v = m(r); return v < bounds[i].lo || v > bounds[i].hi; })) out.add(r.platform_idx); });
  return out;
}

let glPromise: Promise<any> | null = null;
function loadECharts(): Promise<any> {
  if (glPromise) return glPromise;
  glPromise = (async () => { const echarts = await import("echarts"); await import("echarts-gl"); return echarts; })();
  return glPromise;
}
function useChart(option: any, deps: any[], height: number | string, onPick?: (name: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  useEffect(() => {
    if (!ref.current || !option) return;
    let inst: any = null, ro: ResizeObserver | null = null, dead = false;
    loadECharts().then((echarts) => {
      if (dead || !ref.current) return;
      inst = echarts.init(ref.current);
      inst.setOption(option);
      inst.on("click", (p: any) => { if (p?.name && pickRef.current) pickRef.current(p.name); });
      ro = new ResizeObserver(() => inst && inst.resize());
      ro.observe(ref.current);
    });
    return () => { dead = true; if (ro) ro.disconnect(); if (inst) inst.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={ref} style={{ width: "100%", height }} />;
}
function Empty({ msg, h }: { msg: string; h: number | string }) {
  return <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 13 }}>{msg}</div>;
}

type Axis = { name: string; fmt: (v: number) => string; get: (r: MediaRow) => number };
const AX = {
  spend: { name: "광고비", fmt: won, get: (r: MediaRow) => r.ad_spend } as Axis,
  cvr: { name: "전환율(%)", fmt: pctS, get: cvr } as Axis,
  imp: { name: "노출", fmt, get: (r: MediaRow) => r.impressions } as Axis,
  cpa: { name: "CPA", fmt: won, get: cpa } as Axis,
  ctr: { name: "CTR(%)", fmt: pctS, get: ctr } as Axis,
  conv: { name: "전환수", fmt, get: (r: MediaRow) => r.conversions } as Axis,
  clicks: { name: "클릭", fmt, get: (r: MediaRow) => r.clicks } as Axis,
};
type Form = "scatter3d" | "bar3d" | "network";
type Guide = { x?: string; y?: string; z?: string; good: string };
type Analysis = { key: string; title: string; icon: any; q: string; guide: Guide; kind: "axis" | "time" | "network"; x?: Axis; y?: Axis; z?: Axis; forms: Form[] };
const ANALYSES: Analysis[] = [
  { key: "eff", title: "효율 지도", icon: Target, kind: "axis", x: AX.spend, y: AX.cvr, z: AX.imp, forms: ["scatter3d", "bar3d"],
    q: "돈을 잘 쓰는 매체는?", guide: { x: "광고비 →많이 씀", y: "전환율 ↑잘 전환", z: "크기=노출(규모)", good: "적게 쓰고 잘 전환하는 좌상단 큰 점이 알짜 매체" } },
  { key: "acq", title: "획득비용 지형", icon: Filter, kind: "axis", x: AX.cpa, y: AX.ctr, z: AX.conv, forms: ["scatter3d", "bar3d"],
    q: "전환 1건을 얼마에 사고 있나?", guide: { x: "CPA →비쌈", y: "CTR ↑클릭 매력", z: "크기=전환수", good: "싸게 많이 전환하는 좌상단 큰 점이 우위" } },
  { key: "time", title: "시간 지형", icon: Box, kind: "time", forms: ["scatter3d"],
    q: "언제, 어떤 매체가 터졌나?", guide: { x: "날짜", y: "매체", z: "높이=노출", good: "솟은 봉우리 = 특정 매체가 특정일에 터진 지점" } },
  { key: "network", title: "닮은 매체 묶음", icon: Share2, kind: "network", forms: ["network"],
    q: "성향이 비슷한 매체는?", guide: { good: "노드=매체 · 선=성과 프로파일 유사 · 가까이 붙은 매체끼리 성향이 닮음" } },
];
const FORM_META: Record<Form, { label: string; icon: any }> = {
  scatter3d: { label: "3D 산점", icon: Grid3x3 },
  bar3d: { label: "3D 막대", icon: BarChart2 },
  network: { label: "관계형", icon: Share2 },
};

// ── 색 램프 (효율=cvr 기준) ──
function heat(v: number, max: number) {
  if (max <= 0) return HEAT[2];
  const t = Math.max(0, Math.min(1, v / max)); const i = Math.min(HEAT.length - 1, Math.floor(t * (HEAT.length - 1)));
  return HEAT[i];
}

// ── 관계망: 성과 프로파일 유사도 kNN 그래프 ──
function buildNetwork(rows: MediaRow[]) {
  const rs = rows.slice(0, 40);
  const feats = rs.map(r => [ctr(r), cvr(r), Math.log10(r.ad_spend + 1), Math.log10(r.impressions + 1)]);
  const dims = 4; const mn = Array(dims).fill(Infinity), mx = Array(dims).fill(-Infinity);
  feats.forEach(f => f.forEach((v, d) => { if (v < mn[d]) mn[d] = v; if (v > mx[d]) mx[d] = v; }));
  const norm = feats.map(f => f.map((v, d) => mx[d] > mn[d] ? (v - mn[d]) / (mx[d] - mn[d]) : 0.5));
  const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  const maxCvr = Math.max(1e-6, ...rs.map(cvr));
  const maxImp = Math.max(1, ...rs.map(r => r.impressions));
  const nodes = rs.map((r, i) => ({
    name: r.platform_name, symbolSize: 14 + Math.sqrt(r.impressions / maxImp) * 34,
    itemStyle: { color: heat(cvr(r), maxCvr), borderColor: "rgba(255,255,255,.14)", borderWidth: 1 },
    label: { show: true, color: C.ink, fontSize: 10, position: "right" as const },
  }));
  const links: any[] = []; const seen = new Set<string>();
  norm.forEach((a, i) => {
    const nn = norm.map((b, j) => ({ j, d: i === j ? Infinity : dist(a, b) })).sort((p, q) => p.d - q.d).slice(0, 2);
    nn.forEach(({ j, d }) => { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (seen.has(k)) return; seen.add(k);
      links.push({ source: rs[i].platform_name, target: rs[j].platform_name, lineStyle: { color: C.line, width: 1 + (1 - Math.min(1, d)) * 2, opacity: 0.55, curveness: 0.06 } }); });
  });
  return { nodes, links };
}

// ── 옵션 빌더 ──
function scatter3dOption(rows: MediaRow[], a: Analysis) {
  const pts = rows.map(r => ({ value: [a.x!.get(r), a.y!.get(r), a.z!.get(r)], name: r.platform_name })).filter(p => p.value.every(Number.isFinite));
  const maxZ = Math.max(1, ...pts.map(p => p.value[2]));
  if (!pts.length) return null;
  return {
    tooltip: { formatter: (p: any) => `<b>${p.data.name}</b><br/>${a.x!.name} ${a.x!.fmt(p.value[0])}<br/>${a.y!.name} ${a.y!.fmt(p.value[1])}<br/>${a.z!.name} ${a.z!.fmt(p.value[2])}`, backgroundColor: C.surface, borderColor: C.line, textStyle: { color: C.ink, fontSize: 12 } },
    visualMap: { max: maxZ, dimension: 2, show: true, right: 8, top: "center", calculable: true, textStyle: { color: C.dim, fontSize: 10 }, formatter: (v: number) => fmt(v), inRange: { color: HEAT } },
    xAxis3D: { type: "value", name: a.x!.name, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.x!.fmt } },
    yAxis3D: { type: "value", name: a.y!.name, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.y!.fmt } },
    zAxis3D: { type: "value", name: a.z!.name, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.z!.fmt } },
    grid3D: { boxWidth: 108, boxDepth: 108, boxHeight: 84, viewControl: { distance: 205, alpha: 20, beta: 38 }, light: { main: { intensity: 1.1, alpha: 35, beta: 30 }, ambient: { intensity: 0.45 } }, axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.grid } }, environment: C.bg },
    series: [{ type: "scatter3D", symbolSize: 14, data: pts, itemStyle: { opacity: 0.86 }, emphasis: { itemStyle: { color: C.hot }, label: { show: true, formatter: (p: any) => p.data.name, textStyle: { color: C.ink, backgroundColor: C.surface, padding: 4, borderRadius: 4 } } } }],
  };
}
// 3D 막대 — 매체를 x·y 평면에 배치하고 z를 막대 높이로 (같은 3축, 다른 표현)
function bar3dAxisOption(rows: MediaRow[], a: Analysis) {
  const pts = rows.map(r => ({ value: [a.x!.get(r), a.y!.get(r), a.z!.get(r)], name: r.platform_name })).filter(p => p.value.every(Number.isFinite));
  if (!pts.length) return null;
  const maxZ = Math.max(1, ...pts.map(p => p.value[2]));
  const spanX = Math.max(1, ...pts.map(p => p.value[0]));
  const spanY = Math.max(1, ...pts.map(p => p.value[1]));
  return {
    tooltip: { formatter: (p: any) => `<b>${p.data.name}</b><br/>${a.x!.name} ${a.x!.fmt(p.value[0])}<br/>${a.y!.name} ${a.y!.fmt(p.value[1])}<br/>${a.z!.name} ${a.z!.fmt(p.value[2])}`, backgroundColor: C.surface, borderColor: C.line, textStyle: { color: C.ink, fontSize: 12 } },
    visualMap: { max: maxZ, dimension: 2, show: true, right: 8, top: "center", calculable: true, textStyle: { color: C.dim, fontSize: 10 }, formatter: (v: number) => fmt(v), inRange: { color: HEAT } },
    xAxis3D: { type: "value", name: a.x!.name, max: spanX, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.x!.fmt } },
    yAxis3D: { type: "value", name: a.y!.name, max: spanY, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.y!.fmt } },
    zAxis3D: { type: "value", name: a.z!.name, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: a.z!.fmt } },
    grid3D: { boxWidth: 108, boxDepth: 108, boxHeight: 84, viewControl: { distance: 210, alpha: 22, beta: 40 }, light: { main: { intensity: 1.15, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.42 } }, axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.grid } }, environment: C.bg },
    series: [{ type: "bar3D", data: pts, shading: "lambert", barSize: 6, bevelSize: 0.2, itemStyle: { opacity: 0.92 }, emphasis: { itemStyle: { color: C.hot }, label: { show: true, formatter: (p: any) => p.data.name, textStyle: { color: C.ink, backgroundColor: C.surface, padding: 4, borderRadius: 4 } } } }],
  };
}
function networkOption(rows: MediaRow[]) {
  const { nodes, links } = buildNetwork(rows);
  if (!nodes.length) return null;
  return {
    tooltip: { formatter: (p: any) => p.dataType === "node" ? `<b>${p.name}</b> — 클릭해 상세 보기` : `${p.data.source} ↔ ${p.data.target}`, backgroundColor: C.surface, borderColor: C.line, textStyle: { color: C.ink } },
    series: [{ type: "graph", layout: "force", roam: true, draggable: true, data: nodes, links, force: { repulsion: 220, edgeLength: [50, 130], gravity: 0.08 }, lineStyle: { color: C.line, opacity: 0.5 }, emphasis: { focus: "adjacency", lineStyle: { color: C.accent, width: 3 }, itemStyle: { color: C.hot } }, label: { color: C.ink } }],
  };
}

function ChartArea({ rows, series, analysis, form, height, onPick }: { rows: MediaRow[]; series: { name: string; rows: DailyRow[] }[]; analysis: Analysis; form: Form; height: number | string; onPick: (n: string) => void }) {
  let option: any = null;
  if (analysis.kind === "time") {
    const dates = series[0]?.rows.map(r => mmdd(r.date)) || []; const names = series.map(s => shortName(s.name));
    // z축 = 노출의 log10(v+1). 특정 매체(예: KBPay) 노출이 타 매체를 압도해 봉우리가 한 매체에 몰리는 편중을
    // 완화하기 위한 로그 정규화. 표시값(툴팁·축·범례)은 원래 노출로 역표기 → 사용자에겐 실제 노출로 보이고
    // 3D 지형 높이만 로그로 눌러 중·하위 매체 봉우리도 함께 읽히게 한다. (3원칙 ① 로그 정규화)
    const zlog = (v: number) => Math.log10(Math.max(0, v) + 1);
    const zinv = (z: number) => Math.max(0, Math.pow(10, z) - 1);
    const data: any[] = []; let maxRaw = 1;
    series.forEach((s, yi) => s.rows.forEach((r, xi) => { data.push([xi, yi, zlog(r.impressions), r.impressions]); if (r.impressions > maxRaw) maxRaw = r.impressions; }));
    const maxZ = zlog(maxRaw);
    option = dates.length ? {
      tooltip: { formatter: (p: any) => `${names[p.value[1]]}<br/>${dates[p.value[0]]}<br/><b>노출 ${fmt(p.value[3])}</b>`, backgroundColor: C.surface, borderColor: C.line, textStyle: { color: C.ink } },
      visualMap: { max: maxZ, min: 0, dimension: 2, show: true, right: 8, top: "center", calculable: true, textStyle: { color: C.dim, fontSize: 10 }, formatter: (v: number) => fmt(zinv(v)), inRange: { color: ["#e3f0ff", "#9ec5f2", "#4a90e2", "#2f80ed", "#0b3d91"] } },
      xAxis3D: { type: "category", data: dates, name: "날짜", nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 8)) } },
      yAxis3D: { type: "category", data: names, name: "매체", nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9 } },
      zAxis3D: { type: "value", name: "노출(로그)", min: 0, max: maxZ, nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => fmt(zinv(v)) } },
      grid3D: { boxWidth: 150, boxDepth: 82, boxHeight: 66, viewControl: { distance: 215, alpha: 22, beta: 32 }, light: { main: { intensity: 1.15, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.42 } }, axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.grid } }, environment: C.bg },
      series: [{ type: "bar3D", data, shading: "lambert", barSize: 4.2, itemStyle: { opacity: 0.94 }, emphasis: { itemStyle: { color: C.hot } } }],
    } : null;
  } else if (analysis.kind === "network") option = networkOption(rows);
  else if (form === "bar3d") option = bar3dAxisOption(rows, analysis);
  else option = scatter3dOption(rows, analysis);

  const el = useChart(option, [analysis.key, form, height, rows.length, JSON.stringify(rows.map(r => r.platform_idx)), series.length], height, onPick);
  return option ? el : <Empty msg={analysis.kind === "time" ? "일별 데이터 로딩 중…" : "데이터 없음"} h={height} />;
}

// ── 드릴다운 상세: 단일 매체 일별 추이(2D) ──
function DrillDetail({ row, days, height }: { row: MediaRow; days: number; height: number | string }) {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true; setLoading(true); setDaily([]);
    fetch(`/api/media?view=daily&days=${days}&platform_idx=${row.platform_idx}`).then(r => r.json())
      .then(d => { if (alive) setDaily((d.rows || []) as DailyRow[]); }).catch(() => {}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [row.platform_idx, days]);
  const dates = daily.map(d => mmdd(d.date));
  const option = dates.length ? {
    tooltip: { trigger: "axis", backgroundColor: C.surface, borderColor: C.line, textStyle: { color: C.ink } },
    legend: { data: ["노출", "전환"], textStyle: { color: C.dim }, top: 4, right: 8 },
    grid: { left: 56, right: 56, top: 36, bottom: 40 },
    xAxis: { type: "category", data: dates, axisLabel: { color: C.dim, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 10)) }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: [
      { type: "value", name: "노출", nameTextStyle: { color: C.dim }, axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => fmt(v) }, splitLine: { lineStyle: { color: C.grid } } },
      { type: "value", name: "전환", nameTextStyle: { color: C.dim }, position: "right", axisLabel: { color: C.dim, fontSize: 9, formatter: (v: number) => fmt(v) }, splitLine: { show: false } },
    ],
    series: [
      { name: "노출", type: "line", smooth: true, data: daily.map(d => d.impressions), itemStyle: { color: C.accent }, areaStyle: { color: "rgba(56,189,248,0.12)" } },
      { name: "전환", type: "line", smooth: true, yAxisIndex: 1, data: daily.map(d => d.conversions), itemStyle: { color: "#3bd6b4" } },
    ],
  } : null;
  const el = useChart(option, [row.platform_idx, days, dates.length, height], height);
  if (loading && !dates.length) return <Empty msg={`${row.platform_name} 일별 추이 조달 중…`} h={height} />;
  return option ? el : <Empty msg="이 매체의 일별 데이터가 없습니다." h={height} />;
}

// 읽는 법 배지
function ReadingGuide({ a }: { a: Analysis }) {
  const parts = [a.guide.x, a.guide.y, a.guide.z].filter(Boolean) as string[];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
      {parts.map((p, i) => <span key={i} style={{ fontSize: 10, color: C.dim, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 5, padding: "1px 7px" }}>{p}</span>)}
      <span style={{ fontSize: 10, color: "#bfe6ff", display: "inline-flex", alignItems: "center", gap: 3 }}><Sparkles size={10} style={{ color: C.accent }} />{a.guide.good}</span>
    </div>
  );
}

export default function Media3DExplorer({ rows, days, onDays }: { rows: MediaRow[]; days: number; onDays?: (d: number) => void }) {
  const [aKey, setAKey] = useState("eff");
  const [form, setForm] = useState<Form>("scatter3d");
  const [fullscreen, setFullscreen] = useState(false);
  const [disabled, setDisabled] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [series, setSeries] = useState<{ name: string; rows: DailyRow[] }[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [ai, setAi] = useState<{ summary?: string; insights?: string[]; recs?: { label?: string; reason?: string }[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [excludeOutliers, setExcludeOutliers] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);      // 우측 패널 숨김/보임
  const [itemsPop, setItemsPop] = useState(false);        // 항목 온/오프 미니 팝업
  const [drillIdx, setDrillIdx] = useState<number | null>(null);  // 드릴다운: 단일 매체 상세

  const analysis = ANALYSES.find(a => a.key === aKey)!;
  useEffect(() => { if (!analysis.forms.includes(form)) setForm(analysis.forms[0]); }, [aKey]); // eslint-disable-line
  useEffect(() => { setDrillIdx(null); }, [aKey]); // 분석 전환 시 드릴 해제
  const drillRow = drillIdx != null ? rows.find(r => r.platform_idx === drillIdx) : null;

  const allActive = useMemo(() => rows.filter(r => r.impressions > 0), [rows]);
  const shownRows = useMemo(() => allActive.filter(r => !disabled.has(r.platform_idx)).slice(0, 60), [allActive, disabled]);
  // 현재 분석 축(지표) 기준 극단 매체 판정 → 토글 시 차트 표현에서 제외 (원본 불변)
  const outliers = useMemo(() => {
    const m = analysis.kind === "axis" ? [analysis.x!.get, analysis.y!.get, analysis.z!.get]
      : analysis.kind === "time" ? [(r: MediaRow) => r.impressions]
      : [ctr, cvr, (r: MediaRow) => r.ad_spend, (r: MediaRow) => r.impressions];
    return outlierSet(shownRows, m);
  }, [shownRows, aKey]); // eslint-disable-line
  const chartRows = useMemo(() => excludeOutliers ? shownRows.filter(r => !outliers.has(r.platform_idx)) : shownRows, [shownRows, excludeOutliers, outliers]);
  const selRow = selected != null ? rows.find(r => r.platform_idx === selected) : null;
  const nameToIdx = useMemo(() => { const m: Record<string, number> = {}; allActive.forEach(r => m[r.platform_name] = r.platform_idx); return m; }, [allActive]);

  useEffect(() => {
    if (analysis.kind !== "time") return;
    const top = [...chartRows].sort((a, b) => b.impressions - a.impressions).slice(0, 8);
    if (!top.length) { setSeries([]); return; }
    let alive = true; setTLoading(true);
    Promise.all(top.map(t => fetch(`/api/media?view=daily&days=${days}&platform_idx=${t.platform_idx}`).then(r => r.json())
      .then(d => ({ name: t.platform_name, rows: (d.rows || []) as DailyRow[] })).catch(() => ({ name: t.platform_name, rows: [] as DailyRow[] }))))
      .then(res => { if (!alive) return; const ok = res.filter(s => s.rows.length > 0); const len = Math.max(0, ...ok.map(s => s.rows.length)); setSeries(ok.filter(s => s.rows.length === len)); })
      .finally(() => alive && setTLoading(false));
    return () => { alive = false; };
  }, [aKey, days, JSON.stringify(chartRows.map(r => r.platform_idx))]); // eslint-disable-line

  useEffect(() => { if (!fullscreen) return; const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [fullscreen]);

  const genAI = async () => {
    setAiLoading(true);
    try {
      const top = [...chartRows].sort((a, b) => b.impressions - a.impressions).slice(0, 12);
      const body = {
        filters: `[매체 성과 · ${analysis.title}] 기간 ${days}일 · 표시 매체 ${chartRows.length}개 · 뷰 ${FORM_META[form].label}. 3~5줄로 상황·인사이트·제안을 간결히.`,
        categories: top.map(r => `${r.platform_name}: 노출 ${fmt(r.impressions)} · 전환 ${fmt(r.conversions)} · CVR ${pctS(cvr(r))} · CTR ${pctS(ctr(r))} · CPA ${won(cpa(r))} · 광고비 ${won(r.ad_spend)}`).join("\n"),
      };
      const res = await fetch("/api/ai-recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (d.success && d.analysis) setAi({ summary: d.analysis.summary, insights: d.analysis.insights, recs: d.analysis.recommendations });
      else setAi({ summary: "AI 해설 생성 실패: " + (d.error || "알 수 없는 오류") });
    } catch (e: any) { setAi({ summary: "AI 해설 에러: " + e.message }); }
    finally { setAiLoading(false); }
  };
  const toggleItem = (idx: number) => setDisabled(s => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  const chartHeight = fullscreen ? "calc(100vh - 250px)" : 430;
  const maxImp = Math.max(1, ...allActive.map(r => r.impressions));
  const maxCvr = Math.max(1e-6, ...allActive.map(cvr));

  const body = (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: fullscreen ? 0 : 10, overflow: "hidden", background: C.surface, display: "flex", flexDirection: "column", height: fullscreen ? "100%" : "auto" }}>
      {/* 상단: 제목 + 탭 + 컨트롤 */}
      <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(56,189,248,0.16)", color: C.accent }}><analysis.icon size={16} strokeWidth={2.1} /></span>
            <div style={{ minWidth: 0 }}>
              {drillRow ? (
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
                  <button onClick={() => setDrillIdx(null)} title="전체로 돌아가기" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.dim, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 7, padding: "2px 8px", cursor: "pointer" }}>← 전체</button>
                  <span style={{ color: C.faint, fontSize: 12 }}>{analysis.title} ›</span> {drillRow.platform_name}
                </div>
              ) : (
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>{analysis.title} <span style={{ fontSize: 11.5, fontWeight: 500, color: C.faint }}>· {analysis.q}</span></div>
              )}
              {drillRow ? <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3 }}>이 매체의 일별 노출·전환 추이 — 언제 오르내렸는지 파고들어 봅니다.</div> : <ReadingGuide a={analysis} />}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* 뷰 형태 토글 (3D 방식 전환) */}
            {analysis.forms.length > 1 && (
              <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                {analysis.forms.map(f => { const M = FORM_META[f]; const on = form === f; return (
                  <button key={f} onClick={() => setForm(f)} title={M.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer", border: "none", background: on ? "rgba(56,189,248,0.16)" : "transparent", color: on ? "#bfe6ff" : C.dim }}><M.icon size={12} strokeWidth={2.1} />{M.label}</button>
                ); })}
              </div>
            )}
            {/* 극단값 제외 토글 */}
            {analysis.kind !== "time" && (
              <button onClick={() => setExcludeOutliers(v => !v)} title="IQR 1.5× 기준 극단 매체를 차트 표현에서 일시 제외 (원본 불변)" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: `1px solid ${excludeOutliers ? C.accent : C.line}`, borderRadius: 8, padding: "4px 9px", cursor: "pointer" }}>
                <span style={{ fontSize: 11, fontWeight: excludeOutliers ? 700 : 500, color: excludeOutliers ? "#bfe6ff" : C.dim, whiteSpace: "nowrap" }}>극단값 제외{outliers.size > 0 ? ` (${outliers.size})` : ""}</span>
                <span style={{ position: "relative", width: 30, height: 16, borderRadius: 999, background: excludeOutliers ? C.accent : C.line, flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: excludeOutliers ? 16 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left .15s" }} /></span>
              </button>
            )}
            {/* 기간 */}
            <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
              {[7, 30, 90].map(d => <button key={d} onClick={() => onDays?.(d)} style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer", border: "none", background: days === d ? "rgba(56,189,248,0.16)" : "transparent", color: days === d ? "#bfe6ff" : C.dim, fontWeight: days === d ? 700 : 500 }}>{d}일</button>)}
            </div>
            {/* 패널 토글 */}
            <button onClick={() => setPanelOpen(p => !p)} title={panelOpen ? "분석 패널 숨기기" : "분석 패널 보기"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 28, borderRadius: 8, cursor: "pointer", border: `1px solid ${panelOpen ? C.accent : C.line}`, background: panelOpen ? "rgba(56,189,248,0.16)" : "transparent", color: panelOpen ? "#bfe6ff" : C.dim }}>{panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}</button>
            <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? "복귀 (Esc)" : "전체창"} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.accent}`, background: "rgba(56,189,248,0.16)", color: "#bfe6ff" }}>{fullscreen ? <><Minimize2 size={12} /> 복귀</> : <><Maximize2 size={12} /> 전체창</>}</button>
          </div>
        </div>
        {/* 탐색 탭 */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ANALYSES.map(a => { const on = a.key === aKey; const Icon = a.icon; return (
            <button key={a.key} onClick={() => setAKey(a.key)} title={a.q} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: on ? 700 : 500, cursor: "pointer", border: `1px solid ${on ? C.accent : C.line}`, background: on ? "rgba(56,189,248,0.12)" : "transparent", color: on ? "#bfe6ff" : C.dim, whiteSpace: "nowrap" }}><Icon size={13} strokeWidth={2.1} />{a.title}</button>
          ); })}
        </div>
      </div>

      {/* 본문: 차트 | (선택) 우측 패널 */}
      <div style={{ display: "grid", gridTemplateColumns: panelOpen ? "minmax(0,1fr) 250px" : "minmax(0,1fr)", flex: 1, minHeight: 0 }}>
        <div style={{ minWidth: 0, borderRight: panelOpen ? `1px solid ${C.line}` : "none" }}>
          {drillRow ? <DrillDetail key={`drill-${drillRow.platform_idx}-${fullscreen}`} row={drillRow} days={days} height={chartHeight} />
            : analysis.kind === "time" && tLoading && !series.length ? <Empty msg="매체별 일별 시계열 조달 중…" h={chartHeight} />
            : <ChartArea key={`${aKey}-${form}-${fullscreen}-${excludeOutliers}`} rows={chartRows} series={series} analysis={analysis} form={form} height={chartHeight} onPick={(n) => { if (nameToIdx[n] != null) { setSelected(nameToIdx[n]); setDrillIdx(nameToIdx[n]); } }} />}
        </div>

        {/* 우측 분석 패널 */}
        {panelOpen && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: C.panel }}>
            <div style={{ padding: "9px 12px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>분석 패널</span>
              <button onClick={() => setPanelOpen(false)} title="숨기기" style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: C.dim }}><PanelRightClose size={15} /></button>
            </div>

            {/* 항목 온/오프 — 요약 + 미니팝업 */}
            <div style={{ position: "relative", padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.dim }}>표시 매체 <b style={{ color: C.ink }}>{chartRows.length}</b> / {allActive.length}{excludeOutliers && outliers.size > 0 ? <span style={{ color: C.accent }}> · 극단 {outliers.size} 제외</span> : ""}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {disabled.size > 0 ? `숨김 ${disabled.size}: ${allActive.filter(r => disabled.has(r.platform_idx)).map(r => r.platform_name).slice(0, 3).join(", ")}${disabled.size > 3 ? " 외" : ""}` : "숨긴 매체 없음"}
                  </div>
                </div>
                <button onClick={() => setItemsPop(v => !v)} title="항목 켜기/끄기" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${itemsPop ? C.accent : C.line}`, borderRadius: 7, padding: "5px 9px", background: itemsPop ? "rgba(56,189,248,0.16)" : "transparent", color: itemsPop ? "#bfe6ff" : C.dim, flexShrink: 0 }}><SlidersHorizontal size={12} />항목 관리</button>
              </div>
              {/* 미니 팝업(풍선창) */}
              {itemsPop && (
                <div style={{ position: "absolute", top: "100%", right: 8, marginTop: 4, width: 226, maxHeight: 320, zIndex: 20, background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>매체 표시 온/오프</span>
                    <span style={{ display: "inline-flex", gap: 8 }}>
                      {disabled.size > 0 && <button onClick={() => setDisabled(new Set())} style={{ fontSize: 10, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>전체 켜기</button>}
                      <button onClick={() => setItemsPop(false)} style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: C.dim }}><X size={13} /></button>
                    </span>
                  </div>
                  <div style={{ overflowY: "auto" }}>
                    {allActive.slice(0, 60).map(r => { const off = disabled.has(r.platform_idx); return (
                      <div key={r.platform_idx} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", opacity: off ? 0.45 : 1, borderBottom: `1px solid ${C.grid}` }}>
                        <button onClick={() => toggleItem(r.platform_idx)} title={off ? "표시 켜기" : "표시 끄기"} style={{ color: off ? C.faint : C.accent, display: "inline-flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{off ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: heat(cvr(r), maxCvr), flexShrink: 0 }} />
                        <span onClick={() => { setSelected(r.platform_idx); setDrillIdx(r.platform_idx); setItemsPop(false); }} title="클릭해 이 매체로 파고들기" style={{ fontSize: 11, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, cursor: "pointer" }}>{r.platform_name}</span>
                        <span style={{ fontSize: 9.5, color: C.faint }}>{fmt(r.impressions)}</span>
                      </div>
                    ); })}
                  </div>
                </div>
              )}
            </div>

            {/* 선택 항목 상세 */}
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.dim, marginBottom: 6 }}>선택 항목 상세</div>
              {selRow ? (<>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: heat(cvr(selRow), maxCvr) }} />{selRow.platform_name}</div>
                {([["노출", fmt(selRow.impressions)], ["클릭", fmt(selRow.clicks)], ["전환", fmt(selRow.conversions)], ["광고비", won(selRow.ad_spend)], ["CTR", pctS(ctr(selRow))], ["CVR", pctS(cvr(selRow))], ["CPA", won(cpa(selRow))]] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}><span style={{ color: C.faint }}>{k}</span><span style={{ color: C.ink, fontWeight: 600 }}>{v}</span></div>
                ))}
                {drillIdx !== selRow.platform_idx && (
                  <button onClick={() => setDrillIdx(selRow.platform_idx)} style={{ marginTop: 8, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#bfe6ff", background: "rgba(56,189,248,0.16)", border: `1px solid ${C.accent}`, borderRadius: 7, padding: "6px 0", cursor: "pointer" }}>이 매체 일별 추이 파고들기 →</button>
                )}
              </>) : <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6 }}>차트의 점·노드를 클릭하면 상세가 표시되고, 클릭 한 번으로 그 매체의 일별 추이로 파고듭니다.</div>}
            </div>

            {/* AI 인사이트 (우측 패널로 이관 · 압축) */}
            <div style={{ padding: "10px 12px", flex: 1, minHeight: 0, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.dim, display: "inline-flex", alignItems: "center", gap: 5 }}><Sparkles size={13} style={{ color: C.accent }} />AI 인사이트</span>
                <button onClick={genAI} disabled={aiLoading} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: "#fff", background: aiLoading ? C.line : "linear-gradient(135deg,#2f80ed,#38bdf8)", border: "none", borderRadius: 7, padding: "5px 10px", cursor: aiLoading ? "wait" : "pointer" }}>{aiLoading ? <RefreshCw size={11} className="dmp-spin" /> : <Sparkles size={11} />}{ai ? "업데이트" : "해설 생성"}</button>
              </div>
              {ai ? (
                <div style={{ fontSize: 11, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 6 }}>
                  {ai.summary && <div><span style={{ color: C.accent, fontWeight: 700 }}>상황</span> <span style={{ color: C.ink }}>{ai.summary}</span></div>}
                  {ai.insights?.[0] && <div><span style={{ color: C.accent, fontWeight: 700 }}>인사이트</span> <span style={{ color: C.dim }}>{ai.insights.slice(0, 2).join(" · ")}</span></div>}
                  {ai.recs?.[0] && <div><span style={{ color: C.accent, fontWeight: 700 }}>제안</span> <span style={{ color: C.dim }}>{ai.recs[0].label ? `${ai.recs[0].label} — ` : ""}{ai.recs[0].reason || ai.recs[0].label}</span></div>}
                </div>
              ) : <div style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.6 }}>현재 분석·표시 매체 기준 자연어 해설을 상황·인사이트·제안으로 요약합니다. ‘해설 생성’을 눌러 요청하세요.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return fullscreen
    ? <div style={{ position: "fixed", inset: 0, zIndex: 200, background: C.bg, display: "flex", flexDirection: "column" }}>{body}</div>
    : body;
}
