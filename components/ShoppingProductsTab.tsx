"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, Legend
} from "recharts";
import { fmt, categorize, FOOD_CATEGORIES, SHOP_CAT_COLORS as CAT_COLORS } from "@/lib/data";

const P = {
  bg: "var(--bg)", card: "var(--card)", border: "var(--border)",
  text: "var(--text)", sub: "var(--sub)",
  accent: "var(--accent)", green: "var(--success)",
  glow: "var(--accent-glow)",
  up: "var(--success)", down: "var(--danger)", flat: "var(--neutral)"
};
const CHART_COLORS = ["var(--accent)", "var(--male)", "var(--female)", "var(--accent-2)", "var(--accent)", "var(--success)", "#f97316", "#06b6d4", "#84cc16", "#a855f7", "#e11d48", "#14b8a6"];
const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmtAmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "조";
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(0) + "만";
  return n.toLocaleString();
}

const CAT_EMOJI: Record<string, string> = {
  "채소": "🥬", "과일": "🍎", "유제품": "🥛", "라면/면류": "🍜", "음료/생수": "🥤",
  "커피": "☕", "간식/과자": "🍪", "가공식품": "🥫", "달걀": "🥚", "조미료/양념": "🧂",
  "곡물/시리얼": "🌾", "정육": "🥩", "생활용품": "🧴", "전자기기": "📱", "패션/아동": "👟", "기타": "📦"
};

const GENDER_OPTIONS = [{ id: "", label: "전체" }, { id: "M", label: "남성" }, { id: "F", label: "여성" }];
const AGE_OPTIONS = [{ id: "", label: "전체" }, { id: "10s", label: "10대" }, { id: "20s", label: "20대" }, { id: "30s", label: "30대" }, { id: "40s", label: "40대" }, { id: "50s", label: "50대" }, { id: "60s+", label: "60대+" }];
const PERIOD_OPTIONS = [{ id: 7, label: "1주" }, { id: 14, label: "2주" }, { id: 28, label: "4주" }];

export default function ShoppingProductsTab() {
  const [subView, setSubView] = useState<"category" | "nonfood">("category");
  const [days, setDays] = useState(7);
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"cnt" | "revenue" | "avg_price" | "change">("cnt");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedMinor, setSelectedMinor] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (useCustom && customFrom && customTo) { params.set("from", customFrom); params.set("to", customTo); } else { params.set("days", String(days)); }
  if (gender) params.set("gender", gender);
  if (ageGroup) params.set("age_group", ageGroup);

  const { data, isLoading } = useSWR(`/api/shopping?${params}`, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true });
  const ok = data?.success === true;
  const products: { title: string; cnt: number; revenue: number; avg_price: number; prev_cnt: number }[] = ok ? data.top_products || [] : [];
  const dailyTrend: { dt: string; cnt: number; revenue: number; products: number }[] = ok ? data.daily_trend || [] : [];
  const priceDist: { price_range: string; sort_order: number; cnt: number; revenue: number }[] = ok ? data.price_distribution || [] : [];
  const platforms: { platform_idx: number; platform_name: string; cnt: number; revenue: number; avg_price: number }[] = ok ? data.platform_summary || [] : [];

  const allEnriched = useMemo(() => products.map(p => {
    const change = p.prev_cnt > 0 ? Math.round(((p.cnt - p.prev_cnt) / p.prev_cnt) * 100) : (p.prev_cnt === 0 && p.cnt > 0 ? 999 : 0);
    const cat = categorize(p.title);
    return { ...p, change, major: cat.major, minor: cat.minor, isNew: p.prev_cnt === 0, isFood: FOOD_CATEGORIES.includes(cat.major) };
  }), [products]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { cnt: number; revenue: number; products: number; minors: Map<string, { cnt: number; revenue: number; products: number }> }>();
    allEnriched.forEach(p => {
      let e = map.get(p.major);
      if (!e) { e = { cnt: 0, revenue: 0, products: 0, minors: new Map() }; map.set(p.major, e); }
      e.cnt += p.cnt; e.revenue += p.revenue; e.products += 1;
      let m = e.minors.get(p.minor);
      if (!m) { m = { cnt: 0, revenue: 0, products: 0 }; e.minors.set(p.minor, m); }
      m.cnt += p.cnt; m.revenue += p.revenue; m.products += 1;
    });
    return Array.from(map.entries()).map(([n, d]) => ({ name: n, ...d, minorList: Array.from(d.minors.entries()).map(([mn, md]) => ({ name: mn, ...md })).sort((a, b) => b.cnt - a.cnt) })).sort((a, b) => b.cnt - a.cnt);
  }, [allEnriched]);

  const totalCnt = categoryStats.reduce((s, c) => s + c.cnt, 0);

  const viewProducts = useMemo(() => {
    let list = allEnriched;
    if (subView === "nonfood") list = list.filter(p => !p.isFood);
    else if (selectedMajor) { list = list.filter(p => p.major === selectedMajor); if (selectedMinor) list = list.filter(p => p.minor === selectedMinor); }
    if (search) list = list.filter(p => p.title.includes(search));
    return [...list].sort((a, b) => sortBy === "cnt" ? b.cnt - a.cnt : sortBy === "revenue" ? b.revenue - a.revenue : sortBy === "avg_price" ? b.avg_price - a.avg_price : b.change - a.change);
  }, [allEnriched, subView, selectedMajor, selectedMinor, search, sortBy]);

  const viewSummary = useMemo(() => {
    const tc = viewProducts.reduce((s, p) => s + p.cnt, 0);
    const tr = viewProducts.reduce((s, p) => s + p.revenue, 0);
    return { total_purchases: tc, total_revenue: tr, unique_products: viewProducts.length, avg_price: tc > 0 ? Math.round(tr / tc) : 0 };
  }, [viewProducts]);

  const totalPlatformCnt = platforms.reduce((s, p) => s + p.cnt, 0);
  const elapsedMs = data?.elapsed_ms;
  const period = data?.period;

  const { data: detailData, isLoading: detailLoading } = useSWR(selectedProduct ? `/api/shopping/detail?title=${encodeURIComponent(selectedProduct)}&days=30` : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const detail = detailData?.success ? detailData : null;

  function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (<button onClick={onClick} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`, transition: "all .15s", userSelect: "none", background: active ? P.glow : "transparent", color: active ? P.accent : P.sub }}>{label}</button>);
  }

  function ProductTable({ items, title }: { items: typeof viewProducts; title: string }) {
    return (
      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{title} ({items.length})</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" placeholder="🔍 상품명 검색..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "5px 12px", border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, width: 180, outline: "none" }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: "5px 10px", border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, background: "var(--card)", cursor: "pointer" }}>
              <option value="cnt">건수순</option><option value="revenue">매출순</option><option value="avg_price">고가순</option><option value="change">WoW순</option>
            </select>
          </div>
        </div>
        {items.length > 0 ? (
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "var(--bg-elevated)", position: "sticky", top: 0 }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--sub)", width: 36 }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--sub)" }}>상품명</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--sub)", width: 70 }}>분류</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--sub)", width: 60 }}>건수</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "var(--sub)", width: 70 }}>WoW</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--sub)", width: 70 }}>매출</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--sub)", width: 70 }}>평균가</th>
              </tr></thead>
              <tbody>{items.map((p, i) => {
                const cc = CAT_COLORS[p.major] || CAT_COLORS["기타"];
                const isUp = !p.isNew && p.change > 0; const isDown = !p.isNew && p.change < 0;
                return (<tr key={i} style={{ borderBottom: "1px solid var(--bg-elevated)", cursor: "pointer" }} onClick={() => setSelectedProduct(p.title)} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "6px 12px", fontWeight: 800, color: i < 3 ? P.accent : P.sub, fontSize: i < 3 ? 13 : 11 }}>{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</td>
                  <td style={{ padding: "6px 12px", fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</td>
                  <td style={{ padding: "6px 12px" }}><span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: cc.bg, color: cc.fg }}>{p.minor}</span></td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(p.cnt)}</td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: p.isNew ? "#ede9fe" : isUp ? "#dcfce7" : isDown ? "#fee2e2" : "var(--bg-elevated)", color: p.isNew ? "#7c3aed" : isUp ? "#16a34a" : isDown ? "#dc2626" : "var(--neutral)" }}>{p.isNew ? "NEW" : (isUp ? "↑" : isDown ? "↓" : "→")}{!p.isNew && p.change + "%"}</span></td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtAmt(p.revenue)}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--sub)" }}>₩{p.avg_price.toLocaleString()}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        ) : (<div style={{ textAlign: "center", padding: 60, color: P.sub }}><div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div><div style={{ fontSize: 13, fontWeight: 600 }}>데이터 없음</div></div>)}
      </div>
    );
  }

  function KpiRow({ s }: { s: typeof viewSummary }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        {[{ label: "전환 건수", value: fmt(s.total_purchases), color: P.accent }, { label: "총 매출", value: fmtAmt(s.total_revenue), color: "var(--male)" }, { label: "상위 상품수", value: fmt(s.unique_products), color: "var(--female)" }, { label: "평균 단가", value: s.avg_price > 0 ? "₩" + s.avg_price.toLocaleString() : "—", color: "var(--accent-2)" }].map((kpi, i) => (
          <div key={i} style={{ background: P.card, borderRadius: 10, padding: "14px 16px", border: `1px solid ${P.border}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: kpi.color, borderRadius: "0 2px 2px 0" }} />
            <div style={{ fontSize: 10, color: P.sub, marginBottom: 6, fontWeight: 500 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, letterSpacing: "-0.03em" }}>{kpi.value}</div>
            {period && i === 0 && <div style={{ fontSize: 10, color: P.sub, marginTop: 4 }}>{period.from} ~ {period.to}</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "0 28px 28px" }}>
      {/* SUB TABS */}
      <div style={{ display: "flex", gap: 4, padding: "14px 0 0" }}>
        {([{ id: "category" as const, label: "📊 카테고리 분석", desc: "대/중분류 드릴다운" }, { id: "nonfood" as const, label: "🔍 비식품 탐색", desc: "식음료 제외" }]).map(tab => (
          <button key={tab.id} onClick={() => { setSubView(tab.id); setSelectedMajor(null); setSelectedMinor(null); setSearch(""); }}
            style={{ padding: "10px 20px", borderRadius: "10px 10px 0 0", fontSize: 12, fontWeight: subView === tab.id ? 700 : 500, cursor: "pointer", border: `1px solid ${subView === tab.id ? P.border : "transparent"}`, borderBottom: subView === tab.id ? `2px solid ${P.card}` : `1px solid ${P.border}`, background: subView === tab.id ? P.card : "transparent", color: subView === tab.id ? P.accent : P.sub, transition: "all .15s", marginBottom: -1, position: "relative", zIndex: subView === tab.id ? 1 : 0 }}>
            {tab.label}<span style={{ fontSize: 9, color: P.sub, marginLeft: 6 }}>{tab.desc}</span>
          </button>
        ))}
        {isLoading && <span style={{ fontSize: 10, color: P.accent, fontWeight: 600, alignSelf: "center", marginLeft: "auto" }}>Loading...</span>}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "14px 0", borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>성별</span>
          {GENDER_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={gender === o.id} onClick={() => setGender(o.id)} />)}
        </div>
        <span style={{ width: 1, height: 24, background: P.border, alignSelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>연령</span>
          {AGE_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={ageGroup === o.id} onClick={() => setAgeGroup(o.id)} />)}
        </div>
        <span style={{ width: 1, height: 24, background: P.border, alignSelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>기간</span>
          {PERIOD_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={!useCustom && days === o.id} onClick={() => { setDays(o.id); setUseCustom(false); }} />)}
          <Chip label="직접선택" active={useCustom} onClick={() => setUseCustom(true)} />
          {useCustom && (<div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} min="2025-12-16" max="2026-03-17" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none" }} />
            <span style={{ fontSize: 10, color: P.sub }}>~</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} min={customFrom || "2025-12-16"} max="2026-03-17" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none" }} />
          </div>)}
        </div>
      </div>

      {/* VIEW A: CATEGORY */}
      {subView === "category" && (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
          {categoryStats.map(cat => {
            const cc = CAT_COLORS[cat.name] || CAT_COLORS["기타"];
            const pct = totalCnt > 0 ? (cat.cnt / totalCnt * 100) : 0;
            const isActive = selectedMajor === cat.name;
            return (<button key={cat.name} onClick={() => { setSelectedMajor(isActive ? null : cat.name); setSelectedMinor(null); setSearch(""); }}
              style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${isActive ? cc.fg : P.border}`, background: isActive ? cc.bg : P.card, cursor: "pointer", textAlign: "left" as const, transition: "all .15s", boxShadow: isActive ? `0 2px 8px ${cc.fg}22` : "none" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{CAT_EMOJI[cat.name] || "📦"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: cc.fg, marginBottom: 2 }}>{cat.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>{fmtAmt(cat.cnt)}<span style={{ fontSize: 9, color: P.sub, marginLeft: 2 }}>건</span></div>
              <div style={{ fontSize: 9, color: P.sub, marginTop: 2 }}>{pct.toFixed(1)}% · {cat.products}종</div>
            </button>);
          })}
        </div>

        {selectedMajor && (() => {
          const md = categoryStats.find(c => c.name === selectedMajor);
          if (!md) return null;
          return (<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{CAT_EMOJI[selectedMajor] || "📦"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: (CAT_COLORS[selectedMajor] || CAT_COLORS["기타"]).fg }}>{selectedMajor}</span>
            <span style={{ width: 1, height: 18, background: P.border }} />
            <button onClick={() => setSelectedMinor(null)} style={{ padding: "4px 12px", borderRadius: 14, fontSize: 10, fontWeight: !selectedMinor ? 700 : 500, cursor: "pointer", border: `1px solid ${!selectedMinor ? P.accent : P.border}`, background: !selectedMinor ? P.glow : "transparent", color: !selectedMinor ? P.accent : P.sub }}>전체 ({fmtAmt(md.cnt)})</button>
            {md.minorList.map((m: any) => (<button key={m.name} onClick={() => setSelectedMinor(selectedMinor === m.name ? null : m.name)} style={{ padding: "4px 12px", borderRadius: 14, fontSize: 10, fontWeight: selectedMinor === m.name ? 700 : 500, cursor: "pointer", border: `1px solid ${selectedMinor === m.name ? P.accent : P.border}`, background: selectedMinor === m.name ? P.glow : "transparent", color: selectedMinor === m.name ? P.accent : P.sub }}>{m.name} ({fmtAmt(m.cnt)})</button>))}
          </div>);
        })()}

        <ProductTable items={viewProducts} title={selectedMajor ? `${CAT_EMOJI[selectedMajor] || ""} ${selectedMajor}${selectedMinor ? " > " + selectedMinor : ""} 상품` : "🏆 전체 인기 상품"} />
        <KpiRow s={viewSummary} />
      </>)}

      {/* VIEW B: NON-FOOD */}
      {subView === "nonfood" && (<>
        <div style={{ padding: "8px 0 14px", fontSize: 11, color: P.sub }}>🚫 식음료 12개 카테고리 자동 제외 — 생활용품, 전자기기, 패션, 기타 상품만 표시</div>
        <ProductTable items={viewProducts} title="🔍 비식품 상품" />
        <KpiRow s={viewSummary} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>📈 일별 전환 추이</h3>
            {dailyTrend.length > 0 ? (<ResponsiveContainer width="100%" height={200}><AreaChart data={dailyTrend.map(d => ({ ...d, dt: String(d.dt).slice(5) }))}><defs><linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.accent} stopOpacity={0.2} /><stop offset="100%" stopColor={P.accent} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" /><XAxis dataKey="dt" tick={{ fontSize: 10, fill: P.sub }} /><YAxis tick={{ fontSize: 9, fill: P.sub }} tickFormatter={v => fmt(Number(v))} width={44} /><Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v: any, name: string) => [name === "cnt" ? fmt(Number(v)) + "건" : fmtAmt(Number(v)), name === "cnt" ? "건수" : "매출"]} /><Area type="monotone" dataKey="cnt" stroke={P.accent} fill="url(#shopGrad)" strokeWidth={2} dot={{ r: 3 }} /></AreaChart></ResponsiveContainer>) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
          </div>
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💳 제휴처별 비교</h3>
            {platforms.length > 0 ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{platforms.map((p, i) => { const pct = totalPlatformCnt > 0 ? (p.cnt / totalPlatformCnt * 100) : 0; return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 11, fontWeight: 600, width: 100, flexShrink: 0 }}>{p.platform_name}</span><div style={{ flex: 1, height: 22, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}><div style={{ height: "100%", background: CHART_COLORS[i], borderRadius: 4, width: `${pct}%`, transition: "width .4s", display: "flex", alignItems: "center", paddingLeft: 6 }}>{pct > 15 && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{fmt(p.cnt)}건</span>}</div></div><span style={{ fontSize: 10, fontWeight: 700, color: P.accent, width: 44, textAlign: "right" }}>{pct.toFixed(1)}%</span><span style={{ fontSize: 10, color: P.sub, width: 50, textAlign: "right" }}>{fmtAmt(p.revenue)}</span></div>); })}</div>) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💰 가격대별 구매 건수</h3>
            {priceDist.length > 0 ? (<ResponsiveContainer width="100%" height={180}><BarChart data={priceDist}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" /><XAxis dataKey="price_range" tick={{ fontSize: 10, fill: P.sub }} /><YAxis tick={{ fontSize: 9, fill: P.sub }} tickFormatter={v => fmt(Number(v))} width={44} /><Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmt(Number(v)) + "건"]} /><Bar dataKey="cnt" radius={[4, 4, 0, 0]}>{priceDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
          </div>
          <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💰 가격대별 매출 비중</h3>
            {priceDist.length > 0 ? (<ResponsiveContainer width="100%" height={180}><PieChart><Pie data={priceDist} dataKey="revenue" nameKey="price_range" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} label={({ name, percent }: any) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 9 }}>{priceDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => [fmtAmt(Number(v))]} /></PieChart></ResponsiveContainer>) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
          </div>
        </div>
      </>)}

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelectedProduct(null)}>
        <div style={{ background: P.card, borderRadius: 16, padding: 0, border: `1px solid ${P.border}`, width: 720, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: P.accent, fontWeight: 700, marginBottom: 4 }}>📦 상품 상세 추세</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProduct}</h3>
              {detail && <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>{detail.period.from} ~ {detail.period.to} ({detail.period.days}일) · {detail.elapsed_ms}ms</div>}
            </div>
            <button onClick={() => setSelectedProduct(null)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, cursor: "pointer", fontSize: 14, color: P.sub, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          {detailLoading && <div style={{ textAlign: "center", padding: 40, color: P.accent, fontSize: 13 }}>📊 추세 데이터 로딩 중...</div>}
          {detail && (<div style={{ padding: "16px 24px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
              {[{ label: "총 판매건수", value: fmt(detail.summary.total_cnt), color: P.accent }, { label: "총 매출", value: fmtAmt(detail.summary.total_revenue), color: "var(--male)" }, { label: "평균 단가", value: "₩" + detail.summary.avg_price.toLocaleString(), color: "var(--female)" }, { label: "판매일수", value: detail.summary.days_active + "일", color: "var(--accent-2)" }].map((k, i) => (
                <div key={i} style={{ background: P.bg, borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${k.color}` }}><div style={{ fontSize: 9, color: P.sub, fontWeight: 600 }}>{k.label}</div><div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginTop: 2 }}>{k.value}</div></div>
              ))}
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: P.text }}>📈 일별 판매 추이</div>
              <ResponsiveContainer width="100%" height={180}><LineChart data={(detail.daily as any[]).map((d: any) => ({ ...d, dt: String(d.dt).slice(5) }))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" /><XAxis dataKey="dt" tick={{ fontSize: 9, fill: P.sub }} /><YAxis tick={{ fontSize: 9, fill: P.sub }} width={36} /><Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v: any, name: string) => [name === "cnt" ? v + "건" : fmtAmt(Number(v)), name === "cnt" ? "건수" : "매출"]} /><Line type="monotone" dataKey="cnt" stroke={P.accent} strokeWidth={2.5} dot={{ r: 2.5 }} name="cnt" /></LineChart></ResponsiveContainer>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>👤 성별</div><ResponsiveContainer width="100%" height={140}><PieChart><Pie data={detail.by_gender} dataKey="cnt" nameKey="label" cx="50%" cy="50%" outerRadius={50} innerRadius={25} label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 9 }}>{(detail.by_gender as any[]).map((_: any, i: number) => <Cell key={i} fill={["var(--male)", "var(--female)", "var(--neutral)"][i]} />)}</Pie><Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} formatter={(v: any) => [v + "건"]} /></PieChart></ResponsiveContainer></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📊 연령대</div><ResponsiveContainer width="100%" height={140}><BarChart data={detail.by_age} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" /><XAxis type="number" tick={{ fontSize: 8, fill: P.sub }} /><YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: P.sub }} width={30} /><Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} formatter={(v: any) => [v + "건"]} /><Bar dataKey="cnt" radius={[0, 3, 3, 0]}>{(detail.by_age as any[]).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💳 제휴처</div><div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>{(detail.by_platform as any[]).map((p: any, i: number) => { const total = (detail.by_platform as any[]).reduce((s: number, x: any) => s + x.cnt, 0); const pct = total > 0 ? (p.cnt / total * 100) : 0; return (<div key={i}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.label}</span><span style={{ color: P.sub }}>{fmt(p.cnt)}건 ({pct.toFixed(0)}%)</span></div><div style={{ height: 6, background: "rgba(0,0,0,.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", background: CHART_COLORS[i], borderRadius: 3, width: `${pct}%`, transition: "width .3s" }} /></div></div>); })}</div></div>
            </div>
          </div>)}
        </div>
      </div>)}

      {elapsedMs && (<div style={{ textAlign: "right", padding: "8px 0", fontSize: 10, color: "rgba(107,122,153,.5)" }}>RPC {elapsedMs}ms · {gender ? (gender === "M" ? "남성" : "여성") : "전체"} · {ageGroup || "전연령"} · {useCustom && customFrom ? `${customFrom}~${customTo}` : days + "일"}</div>)}
    </div>
  );
}
