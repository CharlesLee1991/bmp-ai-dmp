"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import SpendingTab from "./SpendingTab";
import CardComparisonTab from "./CardComparisonTab";
import ExportHistoryTab from "./ExportHistoryTab";
import type { DmpUser } from "@/lib/auth";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096",
  m: "#3b82f6", f: "#f59e0b", accent: "#0d9488",
  green: "#10b981", glow: "rgba(13,148,136,0.08)"
};

const SEX_OPTIONS = [
  { id: "M", label: "남성" },
  { id: "F", label: "여성" },
  { id: "U", label: "알수없음" },
];

const fetcher = (url: string) => fetch(url).then(r => r.json());

/* ── Toggle Chip ── */
function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 400,
      cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`,
      transition: "all .15s", userSelect: "none",
      background: active ? P.glow : "transparent",
      color: active ? P.accent : P.sub
    }}>{label}</button>
  );
}

/* ── Removable Tag ── */
function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
      background: P.glow, color: P.accent, border: `1px solid ${P.accent}33`
    }}>
      {label}
      <span onClick={onRemove} style={{ cursor: "pointer", fontSize: 13, lineHeight: 1, opacity: .7 }}>×</span>
    </span>
  );
}

/* ── Dropdown Multi-Select ── */
function DropdownMulti({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  const available = options.filter(o => !selected.includes(o.value));
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
        border: `1px dashed ${P.border}`, background: "transparent", color: P.sub,
        display: "flex", alignItems: "center", gap: 4
      }}>+ {placeholder} <span style={{ fontSize: 9 }}>▾</span></button>
      {open && available.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 10,
          boxShadow: "0 8px 30px rgba(0,0,0,.12)", maxHeight: 260, overflowY: "auto",
          minWidth: 180, padding: 4
        }}>
          {available.map(o => (
            <div key={o.value} onClick={() => toggle(o.value)} style={{
              padding: "7px 12px", fontSize: 12, cursor: "pointer", borderRadius: 6, color: P.text
            }}
              onMouseEnter={e => (e.currentTarget.style.background = P.glow)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ── */
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

/* ── Static fallback ── */
function getStaticAgeSex(sidos: string[], sexes: string[], ages: string[]) {
  let d = REGION_DATA;
  if (sidos.length) d = d.filter(r => sidos.includes(r.s));
  if (sexes.length) d = d.filter(r => sexes.includes(r.x));
  if (ages.length) d = d.filter(r => ages.includes(r.a));
  const map: Record<string, { a: string; M: number; F: number; U: number }> = {};
  d.forEach(r => {
    if (!map[r.a]) map[r.a] = { a: r.a, M: 0, F: 0, U: 0 };
    if (r.x === "M") map[r.a].M += r.u;
    else if (r.x === "F") map[r.a].F += r.u;
    else map[r.a].U += r.u;
  });
  return AGE_ORDER.map(k => map[k] || { a: k, M: 0, F: 0, U: 0 });
}

function getStaticRegion(sidos: string[], sexes: string[], ages: string[]) {
  let d = REGION_DATA;
  if (sexes.length) d = d.filter(r => sexes.includes(r.x));
  if (ages.length) d = d.filter(r => ages.includes(r.a));
  const map: Record<string, number> = {};
  d.forEach(r => { map[r.s] = (map[r.s] || 0) + r.u; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, users]) => ({ name, users }));
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function Dashboard({ user, onLogout }: { user: DmpUser; onLogout: () => void }) {
  const [sidos, setSidos] = useState<string[]>([]);
  const [sexes, setSexes] = useState<string[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [majorCats, setMajorCats] = useState<string[]>([]);
  const [middleCats, setMiddleCats] = useState<string[]>([]);
  const [tab, setTab] = useState<"audience" | "spending" | "cards" | "exports">("audience");
  const isAdmin = user.role === "admin";

  const [exportOpen, setExportOpen] = useState(false);
  const [exportName, setExportName] = useState("");
  const [exportMemo, setExportMemo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);

  /* categories */
  const { data: catData } = useSWR("/api/categories", fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const categories: { major: string; codeCount: number; middles: { middle: string; codeCount: number }[] }[] = catData?.success ? catData.data : [];
  const availableMiddles = useMemo(() => {
    if (!majorCats.length) return [];
    const mids: { middle: string; codeCount: number }[] = [];
    majorCats.forEach(mc => { const c = categories.find(x => x.major === mc); if (c) mids.push(...c.middles); });
    return mids;
  }, [majorCats, categories]);

  /* dashboard API */
  function buildUrl() {
    const p = new URLSearchParams();
    if (sidos.length) p.set("sido", sidos.join(","));
    if (sexes.length) p.set("sex", sexes.join(","));
    if (ages.length) p.set("age", ages.join(","));
    const qs = p.toString();
    return `/api/dashboard${qs ? "?" + qs : ""}`;
  }
  const url = buildUrl();
  const { data: apiData, isLoading, error } = useSWR(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true });
  const isLive = apiData?.success === true;
  const api = apiData?.data;
  const meta = apiData?.meta;

  /* segment preview */
  const anyFilter = sidos.length > 0 || sexes.length > 0 || ages.length > 0 || majorCats.length > 0;
  const segKey = `${sidos}|${sexes}|${ages}|${majorCats}|${middleCats}`;
  const { data: segData, isLoading: segLoading } = useSWR(
    anyFilter ? `/api/segment-preview#${segKey}` : null,
    async () => {
      const segs: { seg: string; value: string | string[] }[] = [];
      if (sexes.length) segs.push({ seg: "gender", value: sexes.length === 1 ? sexes[0] : sexes });
      if (ages.length) segs.push({ seg: "age", value: ages.length === 1 ? ages[0] : ages });
      if (sidos.length) segs.push({ seg: "region", value: sidos.length === 1 ? sidos[0] : sidos });
      if (middleCats.length) segs.push({ seg: "middle_category", value: middleCats.length === 1 ? middleCats[0] : middleCats });
      else if (majorCats.length) segs.push({ seg: "major_category", value: majorCats.length === 1 ? majorCats[0] : majorCats });
      const res = await fetch("/api/segment-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segments: segs }) });
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 15000, keepPreviousData: true }
  );
  const segEstimate = segData?.success ? segData.data : null;

  /* export */
  const handleExport = async (env: "dev" | "prod") => {
    const datePart = new Date().toISOString().slice(2,10).replace(/-/g,"");
    const name = exportName.trim() || `DMP_${datePart}${filterParts.length ? "_" + filterParts.join("_") : ""}`;
    setExporting(true); setExportResult(null);
    try {
      const filters: Record<string, string> = {};
      if (sexes.length) filters.sex = sexes.join(",");
      if (ages.length) filters.age_group = ages.join(",");
      if (sidos.length) filters.region = sidos.join(",");
      if (middleCats.length) filters.middle_category = middleCats.join(",");
      else if (majorCats.length) filters.major_category = majorCats.join(",");
      const resp = await fetch("https://ihzttwgqahhzlrqozleh.supabase.co/functions/v1/dmp-target-export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloenR0d2dxYWhoemxycW96bGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1Nzc4ODYsImV4cCI6MjA2NTE1Mzg4Nn0.RCa4oahcW4grLkRdW33tph0LJfwwIL7RPe87smUZTmo" },
        body: JSON.stringify({ segment_name: name, filters, env }),
      });
      setExportResult(await resp.json());
    } catch (e: any) { setExportResult({ success: false, error: e.message }); }
    finally { setExporting(false); }
  };

  // 전송 결과를 이력에 저장
  useEffect(() => {
    if (!exportResult || !exportResult.success) return;
    const saveHistory = async () => {
      try {
        await fetch("/api/exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segment_name: exportName.trim() || `DMP_${new Date().toISOString().slice(2,10).replace(/-/g,"")}${filterParts.length ? "_" + filterParts.join("_") : ""}`,
            filters: (() => {
              const f: Record<string, string> = {};
              if (sexes.length) f.sex = sexes.join(",");
              if (ages.length) f.age_group = ages.join(",");
              if (sidos.length) f.region = sidos.join(",");
              if (middleCats.length) f.middle_category = middleCats.join(",");
              else if (majorCats.length) f.major_category = majorCats.join(",");
              return f;
            })(),
            audience_count: exportResult.data?.ads_id_count || 0,
            env: exportResult.data?.env || "dev",
            runcomm_target_id: exportResult.data?.runcomm_target_id || null,
            status: "success",
            memo: exportMemo,
            response_data: exportResult,
          }),
        });
      } catch {}
    };
    saveHistory();
  }, [exportResult]);

  const reset = () => { setSidos([]); setSexes([]); setAges([]); setMajorCats([]); setMiddleCats([]); };

  /* chart data */
  const ageChart = useMemo(() => {
    if (!isLive || !api?.age_sex) return getStaticAgeSex(sidos, sexes, ages);
    const map: Record<string, { a: string; M: number; F: number; U: number }> = {};
    (api.age_sex as { a: string; x: string; u: number }[]).forEach(r => {
      if (!map[r.a]) map[r.a] = { a: r.a, M: 0, F: 0, U: 0 };
      if (r.x === "M") map[r.a].M += r.u; else if (r.x === "F") map[r.a].F += r.u; else map[r.a].U += r.u;
    });
    return AGE_ORDER.map(k => map[k] || { a: k, M: 0, F: 0, U: 0 });
  }, [isLive, api, sidos, sexes, ages]);
  const industryData = useMemo(() => (!isLive || !api?.industry) ? INDUSTRY_DATA : api.industry as { code: string; users: number }[], [isLive, api]);
  const regionRank = useMemo(() => (!isLive || !api?.region) ? getStaticRegion(sidos, sexes, ages) : api.region as { name: string; users: number }[], [isLive, api, sidos, sexes, ages]);

  let mT = 0, fT = 0, uT = 0;
  if (isLive && api?.summary) { mT = api.summary.male || 0; fT = api.summary.female || 0; uT = api.summary.unknown_sex || 0; }
  else { ageChart.forEach(r => { mT += r.M; fT += r.F; uT += r.U; }); }
  const total = mT + fT + uT;
  const showU = sexes.includes("U") || (!sexes.length && uT > 0);
  const pieData = [{ name: "남성", value: mT, c: P.m }, { name: "여성", value: fT, c: P.f }, ...(showU && uT > 0 ? [{ name: "알수없음", value: uT, c: "#a0aec0" }] : [])];
  const maxBar = Math.max(...ageChart.map(r => Math.max(r.M, r.F)), 1);
  const barData = ageChart.map(r => ({ name: AGE_LABEL[r.a] || r.a, 남성: r.M, 여성: r.F }));
  const topAge = ageChart.reduce((a, b) => (a.M + a.F + a.U) > (b.M + b.F + b.U) ? a : b, { M: 0, F: 0, U: 0, a: "-" });
  const responseMs = meta?.response_ms;

  const filterParts: string[] = [];
  if (sexes.length) filterParts.push(sexes.map(s => s === "M" ? "남성" : s === "F" ? "여성" : "알수없음").join(", "));
  if (ages.length) filterParts.push(ages.map(a => AGE_LABEL[a] || a).join(", "));
  if (sidos.length) filterParts.push(sidos.length <= 3 ? sidos.map(s => s.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "")).join(", ") : `${sidos.length}개 시도`);
  if (middleCats.length) filterParts.push(middleCats.join(", "));
  else if (majorCats.length) filterParts.push(majorCats.join(", "));

  const sidoShort = (s: string) => s.replace(/특별시|광역시|특별자치시|특별자치도/, "").replace(/도$/, "");

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: P.bg, minHeight: "100vh", color: P.text }}>

      {/* HEADER */}
      <header style={{ padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff" }}>D</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>DMP Audience Explorer</h1>
            <p style={{ fontSize: 11, color: P.sub, margin: 0 }}>BizSpring · 13큐브 · 15세그먼트 키 · 멀티셀렉트</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isLoading && <span style={{ fontSize: 10, color: P.f, fontWeight: 600 }}>Loading...</span>}
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? P.green : error ? "#ef4444" : P.sub, boxShadow: isLive ? `0 0 8px ${P.green}` : "none" }} />
          <span style={{ fontSize: 11, color: P.sub }}>{isLive ? `LIVE · ${responseMs ?? "?"}ms` : error ? "Fallback" : "..."}</span>
          <span style={{ width: 1, height: 16, background: P.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: isAdmin ? "linear-gradient(135deg, #3b82f6, #0d9488)" : P.border,
              fontSize: 11, fontWeight: 700, color: isAdmin ? "#fff" : P.sub
            }}>{user.display_name[0]}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.text }}>{user.display_name}</div>
              <div style={{ fontSize: 9, color: P.sub }}>{isAdmin ? "관리자" : "광고주"}</div>
            </div>
            <button onClick={onLogout} style={{
              marginLeft: 4, padding: "4px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: "transparent", border: `1px solid ${P.border}`, color: P.sub
            }}>로그아웃</button>
          </div>
        </div>
      </header>

      {/* TAB */}
      <div style={{ padding: "0 28px", display: "flex", gap: 0, borderBottom: `1px solid ${P.border}` }}>
        {([
          { id: "audience" as const, label: "👥 오디언스", roles: ["admin", "advertiser"] },
          { id: "spending" as const, label: "💳 소비 트렌드", roles: ["admin"] },
          { id: "cards" as const, label: "🏦 카드사 비교", roles: ["admin"] },
          { id: "exports" as const, label: "📋 전송 이력", roles: ["admin", "advertiser"] },
        ]).filter(t => t.roles.includes(user.role)).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 24px", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", border: "none", borderBottom: `2px solid ${tab === t.id ? P.accent : "transparent"}`, background: "transparent", color: tab === t.id ? P.accent : P.sub, transition: "all .2s" }}>{t.label}</button>
        ))}
      </div>

      {/* ─── FILTER PANEL ─── */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${P.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* 성별 + 연령 */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>성별</span>
            {SEX_OPTIONS.map(o => <ToggleChip key={o.id} label={o.label} active={sexes.includes(o.id)} onClick={() => setSexes(sexes.includes(o.id) ? sexes.filter(x => x !== o.id) : [...sexes, o.id])} />)}
          </div>
          <span style={{ width: 1, height: 24, background: P.border, alignSelf: "center" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>연령</span>
            {AGE_ORDER.map(a => <ToggleChip key={a} label={AGE_LABEL[a]} active={ages.includes(a)} onClick={() => setAges(ages.includes(a) ? ages.filter(x => x !== a) : [...ages, a])} />)}
          </div>
        </div>

        {/* 시도 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>시도</span>
          {sidos.map(s => <Tag key={s} label={sidoShort(s)} onRemove={() => setSidos(sidos.filter(x => x !== s))} />)}
          <DropdownMulti options={SIDO_LIST.map(s => ({ value: s, label: s }))} selected={sidos} onChange={setSidos} placeholder="시도 추가" />
        </div>

        {/* 업종 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>업종</span>
          {majorCats.map(c => <Tag key={c} label={c} onRemove={() => { setMajorCats(majorCats.filter(x => x !== c)); const mids = categories.find(cat => cat.major === c)?.middles.map(m => m.middle) || []; setMiddleCats(middleCats.filter(x => !mids.includes(x))); }} />)}
          {middleCats.map(c => <Tag key={`m-${c}`} label={`↳ ${c}`} onRemove={() => setMiddleCats(middleCats.filter(x => x !== c))} />)}
          <DropdownMulti options={categories.map(c => ({ value: c.major, label: `${c.major} (${c.codeCount})` }))} selected={majorCats} onChange={v => { setMajorCats(v); setMiddleCats([]); }} placeholder="대분류" />
          {majorCats.length > 0 && availableMiddles.length > 0 && (
            <DropdownMulti options={availableMiddles.map(m => ({ value: m.middle, label: `${m.middle} (${m.codeCount})` }))} selected={middleCats} onChange={setMiddleCats} placeholder="중분류" />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {anyFilter && <button onClick={reset} style={{ fontSize: 10, color: P.accent, background: "none", border: `1px solid ${P.accent}44`, borderRadius: 16, padding: "4px 14px", cursor: "pointer", fontWeight: 600 }}>✕ 초기화</button>}
            {filterParts.length > 0 && <span style={{ fontSize: 10, color: P.sub }}>{filterParts.join(" · ")}</span>}
          </div>
          {tab === "audience" && (
            <button onClick={() => { setExportOpen(true); setExportResult(null); setExportName(""); setExportMemo(""); }} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #3b82f6, #0d9488)", color: "#fff", border: "none" }}>🚀 런컴 타겟 전송</button>
          )}
        </div>
      </div>

      {/* ─── SEGMENT PREVIEW BANNER ─── */}
      {anyFilter && (
        <div style={{ margin: "12px 28px 0", padding: "12px 18px", borderRadius: 10, background: "linear-gradient(135deg, rgba(59,130,246,0.04), rgba(13,148,136,0.06))", border: `1px solid ${P.accent}33`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>세그먼트 프리뷰{segLoading && <span style={{ fontWeight: 400, color: P.sub, marginLeft: 8 }}>계산 중...</span>}</div>
              <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{filterParts.join(" · ") || "필터 적용 중"}</div>
            </div>
          </div>
          {segEstimate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em" }}>{fmt(segEstimate.estimated_audience)}<span style={{ fontSize: 12, fontWeight: 500, color: P.sub, marginLeft: 4 }}>명</span></div>
              <div style={{ fontSize: 10, color: P.sub }}>전체 {fmt(segEstimate.total_audience)}명 중 {(segEstimate.selectivity * 100).toFixed(1)}%{segData?.meta?.response_time_ms && ` · ${segData.meta.response_time_ms}ms`}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── AUDIENCE TAB ─── */}
      {tab === "audience" && (<>
        <div style={{ padding: "16px 28px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Stat label="총 이용자" value={fmt(total)} sub={anyFilter ? "필터 적용" : "전체"} />
          <Stat label="남녀 비율" value={total > 0 ? `${Math.round(mT / total * 100)}:${Math.round(fT / total * 100)}${uT > 0 ? `:${Math.round(uT / total * 100)}` : ""}` : "-"} sub={`M ${fmt(mT)} · F ${fmt(fT)}${uT > 0 ? ` · ? ${fmt(uT)}` : ""}`} color={P.m} />
          <Stat label="주력 연령대" value={AGE_LABEL[topAge.a] || "-"} sub={`${fmt(topAge.M + topAge.F + topAge.U)}명`} color={P.f} />
          <Stat label="응답 속도" value={responseMs ? `${responseMs}ms` : "< 50ms"} sub={isLive ? "Supabase RPC LIVE" : "Supabase RPC"} color={P.green} />
        </div>

        <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "260px 1fr 240px", gap: 16 }}>
          {/* LEFT: 업종 */}
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>🏪 업종 소분류 TOP 12</h3>
            {industryData.map((it, i) => {
              const w = industryData[0] ? it.users / industryData[0].users * 100 : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <span style={{ fontSize: 10, color: P.sub, width: 76, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PARTNER_MAP[it.code] || it.code}</span>
                  <div style={{ flex: 1, height: 20, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, width: `${w}%`, background: `linear-gradient(90deg, ${P.accent}88, ${P.accent}11)`, transition: "width .5s" }} />
                  </div>
                  <span style={{ fontSize: 9, color: P.sub, width: 42, textAlign: "right", flexShrink: 0 }}>{fmt(it.users)}</span>
                </div>
              );
            })}
          </div>

          {/* CENTER: Age×Sex */}
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>📊 연령 × 성별 분포</h3>
              <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
                {[{ c: P.m, l: "남성" }, { c: P.f, l: "여성" }].map(x => (
                  <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: x.c }} /><span style={{ fontSize: 10, color: P.sub }}>{x.l}</span></div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ width: 120, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>{pieData.map((d, i) => <Cell key={i} fill={d.c} />)}</Pie>
                    <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmt(Number(v)), ""]} /></PieChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>{fmt(total)}</div><div style={{ fontSize: 9, color: P.sub }}>총 이용자</div></div>
              </div>
              <div style={{ flex: 1, height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} barSize={14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmt(Number(v))} width={44} />
                    <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmt(Number(v)), ""]} />
                    <Bar dataKey="남성" fill={P.m} radius={[4, 4, 0, 0]} /><Bar dataKey="여성" fill={P.f} radius={[4, 4, 0, 0]} />
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
                    <div style={{ display: "flex", justifyContent: "flex-end", flex: 1 }}><div style={{ height: 18, background: `linear-gradient(270deg, ${P.m}, ${P.m}33)`, borderRadius: "4px 0 0 4px", width: `${(row.M / maxBar) * 100}%`, minWidth: row.M > 0 ? 2 : 0, transition: "width .4s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4 }}>{row.M > maxBar * .1 && <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{fmt(row.M)}</span>}</div></div>
                    <div style={{ flex: 1 }}><div style={{ height: 18, background: `linear-gradient(90deg, ${P.f}, ${P.f}33)`, borderRadius: "0 4px 4px 0", width: `${(row.F / maxBar) * 100}%`, minWidth: row.F > 0 ? 2 : 0, transition: "width .4s", display: "flex", alignItems: "center", paddingLeft: 4 }}>{row.F > maxBar * .1 && <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{fmt(row.F)}</span>}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Region */}
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}`, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>📍 {sidos.length === 1 ? `${sidos[0]} 시군구별` : "지역별 이용자"}</h3>
            <div style={{ flex: 1, overflow: "auto" }}>
              {regionRank.slice(0, 25).map((r, i) => {
                const pct = regionRank[0] ? (r.users / regionRank[0].users * 100) : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,.05)" }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, background: i < 3 ? P.accent : "rgba(0,0,0,.06)", color: i < 3 ? "#fff" : P.sub }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span><span style={{ fontSize: 10, fontWeight: 700, color: P.accent, flexShrink: 0 }}>{fmt(r.users)}</span></div>
                      <div style={{ height: 3, background: "rgba(0,0,0,.04)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", background: i < 3 ? P.accent : P.m, borderRadius: 2, width: `${pct}%`, transition: "width .4s", opacity: .65 }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>)}

      {tab === "spending" && <SpendingTab sido={sidos.length ? sidos[0] : "전체"} sex={sexes.length ? sexes[0] : "all"} age={ages.length ? ages[0] : "all"} />}
      {tab === "cards" && <CardComparisonTab />}
      {tab === "exports" && <ExportHistoryTab userRole={user.role} />}

      {/* EXPORT MODAL */}
      {exportOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => !exporting && setExportOpen(false)}>
          <div style={{ background: P.card, borderRadius: 16, padding: 28, border: `1px solid ${P.border}`, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: P.accent }}>🚀 런컴 타겟 전송</h3>
            <div style={{ fontSize: 12, color: P.sub, marginBottom: 12 }}>현재 필터 조건</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: P.bg, fontSize: 11, border: `1px solid ${P.border}` }}>시도: {sidos.length ? sidos.join(", ") : "전국"}</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: P.bg, fontSize: 11, border: `1px solid ${P.border}` }}>성별: {sexes.length ? sexes.map(s => s === "M" ? "남성" : s === "F" ? "여성" : "알수없음").join(", ") : "전체"}</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: P.bg, fontSize: 11, border: `1px solid ${P.border}` }}>연령: {ages.length ? ages.map(a => AGE_LABEL[a]).join(", ") : "전체"}</span>
              {majorCats.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: P.bg, fontSize: 11, border: `1px solid ${P.accent}44`, color: P.accent, fontWeight: 600 }}>업종: {middleCats.length ? middleCats.join(", ") : majorCats.join(", ")}</span>}
              <span style={{ padding: "4px 10px", borderRadius: 6, background: P.glow, fontSize: 11, fontWeight: 700, color: P.accent, border: `1px solid ${P.accent}44` }}>예상 {segEstimate ? fmt(segEstimate.estimated_audience) : fmt(total)}명</span>
            </div>
            <div style={{ fontSize: 12, color: P.sub, marginBottom: 6 }}>그룹명 (세그먼트 이름)</div>
            <input value={exportName} onChange={e => setExportName(e.target.value)}
              placeholder={`DMP_${new Date().toISOString().slice(2,10).replace(/-/g,"")}${filterParts.length ? "_" + filterParts.join("_") : ""}`}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: P.sub, marginBottom: 6 }}>메모 (선택)</div>
            <input value={exportMemo} onChange={e => setExportMemo(e.target.value)}
              placeholder="전송 목적, 캠페인명 등"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            {!exportResult && !exporting && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleExport("dev")} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: P.bg, color: P.f, border: `1px solid ${P.f}44` }}>🧪 개발 전송</button>
                <button onClick={() => handleExport("prod")} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #3b82f6, #0d9488)", color: "#fff", border: "none" }}>🚀 상용 전송</button>
              </div>
            )}
            {exporting && <div style={{ textAlign: "center", padding: 20, fontSize: 13, color: P.accent }}>⏳ ADID 추출 → S3 업로드 → 런컴 API 전송 중...</div>}
            {exportResult && (
              <div style={{ marginTop: 4, padding: 14, borderRadius: 8, fontSize: 12, background: exportResult.success ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${exportResult.success ? P.green : "#ef4444"}44` }}>
                {exportResult.success ? (<><div style={{ fontWeight: 700, color: P.green, marginBottom: 8 }}>✅ 전송 성공!</div><div>런컴 ID: <strong>{exportResult.data.runcomm_target_id}</strong></div><div>ADID 건수: <strong>{fmt(exportResult.data.ads_id_count)}</strong></div><div>환경: <strong>{exportResult.data.env}</strong></div><div style={{ color: P.sub, marginTop: 4 }}>소요: {exportResult.meta?.elapsed_ms}ms</div></>
                ) : (<><div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>❌ 전송 실패</div><div style={{ color: P.sub }}>{exportResult.error}</div></>)}
                <button onClick={() => setExportOpen(false)} style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, background: P.bg, color: P.sub, border: `1px solid ${P.border}`, cursor: "pointer" }}>닫기</button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: "14px 0 20px", fontSize: 10, color: "rgba(107,122,153,.5)", borderTop: `1px solid ${P.border}` }}>
        {isLive ? `LIVE · Supabase RPC ${responseMs}ms` : "Static Fallback"} · BizSpring DMP · 13큐브 · 15키
      </footer>
    </div>
  );
}
