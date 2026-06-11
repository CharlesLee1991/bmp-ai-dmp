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
  categorize, SHOP_CAT_COLORS,
  type RegionRow, type IndustryRow, type SggRow
} from "@/lib/data";
import SpendingTab from "./SpendingTab";
import CardComparisonTab from "./CardComparisonTab";
import ExportHistoryTab from "./ExportHistoryTab";
import ShoppingProductsTab from "./ShoppingProductsTab";
import BehaviorPlaceholder from "./BehaviorPlaceholder";
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
function DropdownMulti({ options, selected, onChange, placeholder, searchable }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  const available = options.filter(o => !selected.includes(o.value));
  // 검색 가능 여부: 명시 prop 우선, 미지정 시 전체 옵션 8개 이상이면 자동 활성
  const isSearchable = searchable ?? options.length >= 8;
  const q = query.trim().toLowerCase();
  // 한글 자모 검색 + 일반 contains 매칭
  const matchFn = (o: { value: string; label: string }) => {
    if (!q) return true;
    const label = o.label.toLowerCase();
    const value = o.value.toLowerCase();
    // 단순 contains 우선
    if (label.includes(q) || value.includes(q)) return true;
    // 한글 초성 검색 (ㄱㄴㅁ → 강남구 매칭)
    return matchChoseong(o.label, query.trim());
  };
  const filtered = available.filter(matchFn);
  // 전체선택/해제 — 현재 검색 필터링된 결과 한정으로 동작
  const selectAllFiltered = () => {
    const toAdd = filtered.map(o => o.value);
    if (toAdd.length === 0) return;
    onChange(Array.from(new Set([...selected, ...toAdd])));
  };
  const clearAll = () => onChange([]);
  // 8개 미만이면 카운터 노출 안 함 (UX 깔끔)
  const showCounter = options.length >= 8 || selected.length > 0;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
        border: `1px dashed ${P.border}`, background: "transparent", color: P.sub,
        display: "flex", alignItems: "center", gap: 4
      }}>
        + {placeholder}
        {showCounter && (
          <span style={{ fontSize: 9, fontWeight: 700, color: selected.length > 0 ? P.accent : P.sub }}>
            ({selected.length}/{options.length})
          </span>
        )}
        <span style={{ fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 10,
          boxShadow: "0 8px 30px rgba(0,0,0,.12)",
          minWidth: 240, padding: 4, display: "flex", flexDirection: "column"
        }}>
          {isSearchable && (
            <div style={{ padding: "6px 8px 4px 8px", borderBottom: `1px solid ${P.border}`, marginBottom: 4 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`🔍 검색 (총 ${options.length}개${q ? `, ${filtered.length}건 일치` : ""})`}
                style={{
                  width: "100%", padding: "6px 8px", fontSize: 11,
                  border: `1px solid ${P.border}`, borderRadius: 6,
                  background: "transparent", color: P.text, outline: "none",
                  boxSizing: "border-box"
                }}
                onKeyDown={e => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }}
              />
            </div>
          )}
          {/* 전체선택/해제 액션 바 */}
          {(available.length > 0 || selected.length > 0) && (
            <div style={{
              display: "flex", gap: 6, padding: "4px 8px 6px 8px",
              borderBottom: `1px solid ${P.border}`, marginBottom: 4,
              fontSize: 10, alignItems: "center"
            }}>
              {filtered.length > 0 && (
                <button
                  onClick={selectAllFiltered}
                  style={{
                    padding: "3px 8px", borderRadius: 4, border: `1px solid ${P.border}`,
                    background: "transparent", color: P.accent, cursor: "pointer",
                    fontSize: 10, fontWeight: 600
                  }}
                >
                  {q ? `+ 검색결과 ${filtered.length}개 전체선택` : `+ 전체선택 (${filtered.length})`}
                </button>
              )}
              {selected.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    padding: "3px 8px", borderRadius: 4, border: `1px solid ${P.border}`,
                    background: "transparent", color: P.sub, cursor: "pointer",
                    fontSize: 10
                  }}
                >
                  ✕ 전체해제 ({selected.length})
                </button>
              )}
              <span style={{ marginLeft: "auto", color: P.sub, fontSize: 9 }}>
                선택 {selected.length} / 전체 {options.length}
              </span>
            </div>
          )}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 11, color: P.sub, fontStyle: "italic", textAlign: "center" }}>
                {q ? `'${query}' 검색 결과 없음` : "선택 가능한 항목 없음"}
              </div>
            ) : (
              filtered.map(o => (
                <div key={o.value} onClick={() => toggle(o.value)} style={{
                  padding: "7px 12px", fontSize: 12, cursor: "pointer", borderRadius: 6, color: P.text
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = P.glow)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >{o.label}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 한글 초성 검색 매칭 (외부 lib 없이 자체 구현) ── */
const CHOSEONG_LIST = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
function getChoseong(ch: string): string {
  const code = ch.charCodeAt(0);
  // 한글 음절 영역 (가 ~ 힣)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const idx = Math.floor((code - 0xAC00) / 588);
    return CHOSEONG_LIST[idx];
  }
  return ch;
}
function isChoseong(ch: string): boolean {
  return CHOSEONG_LIST.includes(ch);
}
function matchChoseong(text: string, query: string): boolean {
  if (!query) return true;
  // query가 모두 초성으로만 이뤄진 경우에만 초성 매칭
  if (!Array.from(query).every(isChoseong)) return false;
  const textChoseong = Array.from(text).map(getChoseong).join("");
  return textChoseong.includes(query);
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
  const [subCats, setSubCats] = useState<string[]>([]);
  const [sigoongus, setSigoongus] = useState<string[]>([]);
  const [eupmds, setEupmds] = useState<string[]>([]);
  const [amountFilters, setAmountFilters] = useState<string[]>([]);
  const [cardCompanies, setCardCompanies] = useState<string[]>([]);
  const [telecoms, setTelecoms] = useState<string[]>([]);
  const [mobileBrands, setMobileBrands] = useState<string[]>([]);
  const [audCats, setAudCats] = useState<string[]>([]);
  const [uploadSession, setUploadSession] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{ total: number; matched: number; rate: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignText, setCampaignText] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [tab, setTab] = useState<"card" | "subway" | "bus" | "membership" | "spending" | "cards" | "exports" | "shopping">("card");
  const isAdmin = user.role === "admin";

  /* month range filter */
  const [ymPreset, setYmPreset] = useState<number>(12);
  const [ymCustomFrom, setYmCustomFrom] = useState("");
  const [ymCustomTo, setYmCustomTo] = useState("");
  const [useYmCustom, setUseYmCustom] = useState(false);

  const ymFrom = useYmCustom && ymCustomFrom ? ymCustomFrom : ymPreset > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() - ymPreset); return d.toISOString().slice(0, 7); })() : undefined;
  const ymTo = useYmCustom && ymCustomTo ? ymCustomTo : ymPreset > 0 ? new Date().toISOString().slice(0, 7) : undefined;

  const [exportOpen, setExportOpen] = useState(false);
  const [exportName, setExportName] = useState("");
  const [exportMemo, setExportMemo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [shopCats, setShopCats] = useState<string[]>([]);

  /* categories */
  const { data: catData } = useSWR("/api/categories", fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const categories: { major: string; codeCount: number; middles: { middle: string; codeCount: number }[] }[] = catData?.success ? catData.data : [];
  const availableMiddles = useMemo(() => {
    if (!majorCats.length) return [];
    const mids: { middle: string; codeCount: number }[] = [];
    majorCats.forEach(mc => { const c = categories.find(x => x.major === mc); if (c) mids.push(...c.middles); });
    return mids;
  }, [majorCats, categories]);

  /* ── cascading options (안주현 5/11 요청 반영) ── */
  // 시군구: 시도 선택 시
  const sigoongQuery = sidos.length === 1 ? `?sido=${encodeURIComponent(sidos[0])}` : "";
  const { data: sigoongData } = useSWR(
    sidos.length === 1 ? `/api/segment-options/sigoongu${sigoongQuery}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );
  const sigoongOptions: { sigoongu_nm: string; user_count: number }[] = sigoongData?.success ? sigoongData.data : [];

  // 읍면동: 시군구 선택 시
  const eupmdQuery = sidos.length === 1 && sigoongus.length === 1
    ? `?sido=${encodeURIComponent(sidos[0])}&sigoongu=${encodeURIComponent(sigoongus[0])}`
    : "";
  const { data: eupmdData } = useSWR(
    sidos.length === 1 && sigoongus.length === 1 ? `/api/segment-options/eupmeuandong${eupmdQuery}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );
  const eupmdOptions: { eupmeuandong_nm: string; user_count: number }[] = eupmdData?.success ? eupmdData.data : [];

  // 소분류: 중분류 선택 시
  const subQuery = middleCats.length === 1
    ? `?middle=${encodeURIComponent(middleCats[0])}${majorCats.length === 1 ? `&major=${encodeURIComponent(majorCats[0])}` : ""}`
    : "";
  const { data: subData } = useSWR(
    middleCats.length === 1 ? `/api/segment-options/subcategory${subQuery}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );
  const subOptions: { subcategory: string; sub_code: number }[] = subData?.success ? subData.data : [];

  /* dashboard API */
  function buildUrl() {
    const p = new URLSearchParams();
    if (sidos.length) p.set("sido", sidos.join(","));
    if (sexes.length) p.set("sex", sexes.join(","));
    if (ages.length) p.set("age", ages.join(","));
    if (ymFrom) p.set("ym_from", ymFrom);
    if (ymTo) p.set("ym_to", ymTo);
    const qs = p.toString();
    return `/api/dashboard${qs ? "?" + qs : ""}`;
  }
  const url = buildUrl();
  const { data: apiData, isLoading, error } = useSWR(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true });
  const isLive = apiData?.success === true;
  const api = apiData?.data;
  const meta = apiData?.meta;

  /* segment preview */
  const anyFilter = sidos.length > 0 || sigoongus.length > 0 || eupmds.length > 0 || sexes.length > 0 || ages.length > 0 || majorCats.length > 0 || middleCats.length > 0 || subCats.length > 0 || shopCats.length > 0 || amountFilters.length > 0 || cardCompanies.length > 0 || telecoms.length > 0 || mobileBrands.length > 0 || audCats.length > 0 || !!uploadSession;
  const segKey = `${sidos}|${sigoongus}|${eupmds}|${sexes}|${ages}|${majorCats}|${middleCats}|${subCats}|${shopCats}|${amountFilters}|${cardCompanies}|${telecoms}|${mobileBrands}|${audCats}|${uploadSession || ""}`;
  const { data: segData, isLoading: segLoading, isValidating: segValidating } = useSWR(
    anyFilter ? `/api/segment-preview#${segKey}` : null,
    async () => {
      const segs: { seg: string; value: string | string[] }[] = [];
      if (sexes.length) segs.push({ seg: "gender", value: sexes.length === 1 ? sexes[0] : sexes });
      if (ages.length) segs.push({ seg: "age", value: ages.length === 1 ? ages[0] : ages });
      if (sidos.length) segs.push({ seg: "region", value: sidos.length === 1 ? sidos[0] : sidos });
      if (sigoongus.length) segs.push({ seg: "city", value: sigoongus.length === 1 ? sigoongus[0] : sigoongus });
      if (eupmds.length) segs.push({ seg: "district", value: eupmds.length === 1 ? eupmds[0] : eupmds });
      if (subCats.length) segs.push({ seg: "subcategory", value: subCats.length === 1 ? subCats[0] : subCats });
      else if (middleCats.length) segs.push({ seg: "middle_category", value: middleCats.length === 1 ? middleCats[0] : middleCats });
      else if (majorCats.length) segs.push({ seg: "major_category", value: majorCats.length === 1 ? majorCats[0] : majorCats });
      if (amountFilters.length) segs.push({ seg: "amount", value: amountFilters.length === 1 ? amountFilters[0] : amountFilters });
      if (cardCompanies.length) segs.push({ seg: "card_company", value: cardCompanies.length === 1 ? cardCompanies[0] : cardCompanies });
      if (telecoms.length) segs.push({ seg: "telecom", value: telecoms.length === 1 ? telecoms[0] : telecoms });
    if (mobileBrands.length) segs.push({ seg: "mobile_brand", value: mobileBrands.length === 1 ? mobileBrands[0] : mobileBrands });
      if (audCats.length) segs.push({ seg: "cat1", value: audCats.length === 1 ? audCats[0] : audCats });
      const reqBody: any = { segments: segs };
      if (shopCats.length) reqBody.shop_category = shopCats.join(",");
      if (uploadSession) reqBody.upload_session = uploadSession;
      const res = await fetch("/api/segment-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 15000, keepPreviousData: true }
  );
  const segEstimate = segData?.success ? segData.data : null;

  /* shopping categories for audience tab */
  const { data: shopData } = useSWR(

    tab === "card" ? "/api/shopping?days=7" : null,
    fetcher, { revalidateOnFocus: false, dedupingInterval: 120000, keepPreviousData: true }
  );
  const shopCategories = useMemo(() => {
    if (!shopData?.success || !shopData.top_products) return [];
    const catMap: Record<string, { cnt: number; revenue: number }> = {};
    for (const p of shopData.top_products) {
      const { major } = categorize(p.title);
      if (!catMap[major]) catMap[major] = { cnt: 0, revenue: 0 };
      catMap[major].cnt += p.cnt;
      catMap[major].revenue += p.revenue;
    }
    return Object.entries(catMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [shopData]);

  const { data: amountData } = useSWR(
    tab === "card" ? "/api/amount-bucket" : null,
    fetcher, { revalidateOnFocus: false, dedupingInterval: 120000, keepPreviousData: true }
  );
  const amountBuckets: { bucket: string; label: string; ads_count: number; txn_count: number; total_amt: number }[] = Array.isArray(amountData) ? amountData : [];

  const { data: adEngData } = useSWR(
    tab === "card" ? "/api/ad-engagement" : null,
    fetcher, { revalidateOnFocus: false, dedupingInterval: 120000, keepPreviousData: true }
  );
  const adHourly: { hr: number; users: number; imps: number; clicks: number }[] = adEngData?.hourly || [];
  const adOs: { os: string; users: number; imps: number; clicks: number }[] = adEngData?.os || [];

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
      if (sigoongus.length) filters.city = sigoongus.join(",");
      if (eupmds.length) filters.district = eupmds.join(",");
      if (subCats.length) filters.subcategory = subCats.join(",");
      else if (middleCats.length) filters.middle_category = middleCats.join(",");
      else if (majorCats.length) filters.major_category = majorCats.join(",");
      if (shopCats.length) filters.shop_category = shopCats.join(",");
      if (uploadSession) filters.upload_session = uploadSession;
      if (audCats.length) filters.cat1 = audCats.join(",");
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
              if (sigoongus.length) f.city = sigoongus.join(",");
              if (eupmds.length) f.district = eupmds.join(",");
              if (subCats.length) f.subcategory = subCats.join(",");
              else if (middleCats.length) f.middle_category = middleCats.join(",");
              else if (majorCats.length) f.major_category = majorCats.join(",");
              if (shopCats.length) f.shop_category = shopCats.join(",");
              if (amountFilters.length) f.amount_bucket = amountFilters.join(",");
              if (uploadSession) f.upload_session = uploadSession;
              if (cardCompanies.length) f.card_company = cardCompanies.join(",");
              if (telecoms.length) f.telecom = telecoms.join(",");
              if (mobileBrands.length) f.mobile_brand = mobileBrands.join(",");
              if (audCats.length) f.cat1 = audCats.join(",");
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

  const reset = () => { setSidos([]); setSigoongus([]); setEupmds([]); setSexes([]); setAges([]); setMajorCats([]); setMiddleCats([]); setSubCats([]); setShopCats([]); setAmountFilters([]); setCardCompanies([]); setTelecoms([]); setUploadSession(null); setUploadInfo(null); setYmPreset(12); setUseYmCustom(false); setYmCustomFrom(""); setYmCustomTo(""); };

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
  if (sigoongus.length) filterParts.push(sigoongus.length <= 3 ? sigoongus.join(", ") : `${sigoongus.length}개 시군구`);
  if (eupmds.length) filterParts.push(eupmds.length <= 3 ? eupmds.join(", ") : `${eupmds.length}개 읍면동`);
  if (subCats.length) filterParts.push(subCats.join(", "));
  else if (middleCats.length) filterParts.push(middleCats.join(", "));
  else if (majorCats.length) filterParts.push(majorCats.join(", "));
  if (shopCats.length) filterParts.push("🛒 " + shopCats.join(", "));
  const AMOUNT_LABELS: Record<string,string> = { under_5k: "~5천", "5k_10k": "5천~1만", "10k_30k": "1~3만", "30k_50k": "3~5만", "50k_100k": "5~10만", "100k_300k": "10~30만", over_300k: "30만~" };
  if (amountFilters.length) filterParts.push("💰 " + amountFilters.map(a => AMOUNT_LABELS[a] || a).join(", "));
  const CARD_LABELS: Record<string,string> = { KB: "KB국민", NH: "NH농협", BC: "BC", SH: "신한", LOCA: "LOCA", NHPAY: "NH페이", OCB: "OCB", SKT: "SKT", SYRUP: "시럽", DLOCA: "D-LOCA" };
  if (cardCompanies.length) filterParts.push("🏦 " + cardCompanies.map(c => CARD_LABELS[c] || c).join(", "));
  const TELE_LABELS: Record<string,string> = { K: "KT", T: "SKT", U: "LG U+", Z: "알뜰폰" };
  if (telecoms.length) filterParts.push("📡 " + telecoms.map(t => TELE_LABELS[t] || t).join(", "));
  if (mobileBrands.length) filterParts.push("📱 " + mobileBrands.map(b => ({Apple:"애플",SAMSUNG:"삼성",LG:"LG",ZTE:"ZTE",XIAOMI:"샤오미"} as Record<string,string>)[b] || b).join(", "));
  if (audCats.length) filterParts.push("🏷️ " + audCats.join(", "));
  if (uploadSession && uploadInfo) filterParts.push(`📤 ADID ${fmt(uploadInfo.matched)}건 매칭`);

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
          { id: "card" as const, label: "💳 카드", roles: ["admin", "advertiser"] },
          { id: "subway" as const, label: "🚇 지하철", roles: ["admin", "advertiser"] },
          { id: "bus" as const, label: "🚌 버스", roles: ["admin", "advertiser"] },
          { id: "membership" as const, label: "🎟️ 멤버십", roles: ["admin", "advertiser"] },
          { id: "exports" as const, label: "📋 전송 이력", roles: ["admin", "advertiser"] },
          { id: "spending" as const, label: "💳 소비 트렌드", roles: ["admin"] },
          { id: "cards" as const, label: "🏦 카드사 비교", roles: ["admin"] },
          { id: "shopping" as const, label: "🛒 쇼핑상품", roles: ["admin"] },
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

        {/* 시도 · 시군구 · 읍면동 (안주현 요청 반영) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>지역</span>
          {sidos.map(s => <Tag key={s} label={sidoShort(s)} onRemove={() => { setSidos(sidos.filter(x => x !== s)); setSigoongus([]); setEupmds([]); }} />)}
          <DropdownMulti options={SIDO_LIST.map(s => ({ value: s, label: s }))} selected={sidos} onChange={v => { setSidos(v); if (v.length !== 1) { setSigoongus([]); setEupmds([]); } }} placeholder="시도 추가" />
          {sidos.length === 1 && (
            <>
              <span style={{ color: P.sub, fontSize: 11, margin: "0 2px" }}>›</span>
              {sigoongus.map(g => <Tag key={`gg-${g}`} label={`↳ ${g}`} onRemove={() => { setSigoongus(sigoongus.filter(x => x !== g)); setEupmds([]); }} />)}
              <DropdownMulti
                options={sigoongOptions.map(o => ({ value: o.sigoongu_nm, label: `${o.sigoongu_nm}` }))}
                selected={sigoongus}
                onChange={v => { setSigoongus(v); if (v.length !== 1) setEupmds([]); }}
                placeholder={sigoongOptions.length ? "+ 시군구" : "시군구 로딩…"}
              />
            </>
          )}
          {sidos.length === 1 && sigoongus.length === 1 && (
            <>
              <span style={{ color: P.sub, fontSize: 11, margin: "0 2px" }}>›</span>
              {eupmds.map(e => <Tag key={`em-${e}`} label={`↳ ${e}`} onRemove={() => setEupmds(eupmds.filter(x => x !== e))} />)}
              <DropdownMulti
                options={eupmdOptions.map(o => ({ value: o.eupmeuandong_nm, label: `${o.eupmeuandong_nm}` }))}
                selected={eupmds}
                onChange={setEupmds}
                placeholder={eupmdOptions.length ? "+ 읍면동" : "읍면동 로딩…"}
              />
            </>
          )}
          {sidos.length > 1 && (
            <span style={{ fontSize: 10, color: P.sub, fontStyle: "italic" }}>※ 시군구·읍면동은 시도 1개 선택 시 활성화</span>
          )}
        </div>

        {/* 업종 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>업종</span>
          {majorCats.map(c => <Tag key={c} label={c} onRemove={() => { setMajorCats(majorCats.filter(x => x !== c)); const mids = categories.find(cat => cat.major === c)?.middles.map(m => m.middle) || []; setMiddleCats(middleCats.filter(x => !mids.includes(x))); setSubCats([]); }} />)}
          {middleCats.map(c => <Tag key={`m-${c}`} label={`↳ ${c}`} onRemove={() => { setMiddleCats(middleCats.filter(x => x !== c)); setSubCats([]); }} />)}
          {subCats.map(c => <Tag key={`s-${c}`} label={`↳ ${c}`} onRemove={() => setSubCats(subCats.filter(x => x !== c))} />)}
          <DropdownMulti options={categories.map(c => ({ value: c.major, label: `${c.major} (${c.codeCount})` }))} selected={majorCats} onChange={v => { setMajorCats(v); setMiddleCats([]); setSubCats([]); }} placeholder="대분류" />
          {majorCats.length > 0 && availableMiddles.length > 0 && (
            <DropdownMulti options={availableMiddles.map(m => ({ value: m.middle, label: `${m.middle} (${m.codeCount})` }))} selected={middleCats} onChange={v => { setMiddleCats(v); if (v.length !== 1) setSubCats([]); }} placeholder="중분류" />
          )}
          {middleCats.length === 1 && (
            <DropdownMulti
              options={subOptions.map(o => ({ value: o.subcategory, label: `${o.subcategory}` }))}
              selected={subCats}
              onChange={setSubCats}
              placeholder={subOptions.length ? "+ 소분류" : "소분류 로딩…"}
            />
          )}
          {middleCats.length > 1 && (
            <span style={{ fontSize: 10, color: P.sub, fontStyle: "italic" }}>※ 소분류는 중분류 1개 선택 시 활성화</span>
          )}
        </div>

        {/* 쇼핑 카테고리 */}
        {tab === "card" && shopCategories.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>쇼핑</span>
            {shopCats.map(c => <Tag key={`sc-${c}`} label={`🛒 ${c}`} onRemove={() => setShopCats(shopCats.filter(x => x !== c))} />)}
            <DropdownMulti options={shopCategories.map(c => ({ value: c.name, label: `${c.name} (${fmt(c.cnt)})` }))} selected={shopCats} onChange={setShopCats} placeholder="+ 쇼핑 카테고리" />
          </div>
        )}

        {/* 금액구간 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>금액</span>
            {amountFilters.map(a => <Tag key={`amt-${a}`} label={`💰 ${({under_5k:"~5천","5k_10k":"5천~1만","10k_30k":"1~3만","30k_50k":"3~5만","50k_100k":"5~10만","100k_300k":"10~30만",over_300k:"30만~"} as Record<string,string>)[a] || a}`} onRemove={() => setAmountFilters(amountFilters.filter(x => x !== a))} />)}
            <DropdownMulti options={[
              { value: "under_5k", label: "~5천원" },
              { value: "5k_10k", label: "5천~1만원" },
              { value: "10k_30k", label: "1~3만원" },
              { value: "30k_50k", label: "3~5만원" },
              { value: "50k_100k", label: "5~10만원" },
              { value: "100k_300k", label: "10~30만원" },
              { value: "over_300k", label: "30만원~" },
            ]} selected={amountFilters} onChange={setAmountFilters} placeholder="+ 금액구간" />
            {amountBuckets.length > 0 && (() => {
              const HIGH_ORDER = ["over_300k","100k_300k","50k_100k","30k_50k","10k_30k","5k_10k","under_5k"];
              const LOW_ORDER = ["under_5k","5k_10k","10k_30k","30k_50k","50k_100k","100k_300k","over_300k"];
              const bucketMap = Object.fromEntries(amountBuckets.map(b => [b.bucket, b.ads_count]));
              const total = amountBuckets.reduce((s, b) => s + b.ads_count, 0);
              const selectPct = (order: string[], pct: number) => {
                const target = total * pct / 100;
                let cum = 0; const selected: string[] = [];
                for (const k of order) { cum += (bucketMap[k] || 0); selected.push(k); if (cum >= target) break; }
                setAmountFilters(selected);
              };
              return (
                <span style={{ display: "inline-flex", gap: 3, marginLeft: 4, borderLeft: "1px solid rgba(0,0,0,.1)", paddingLeft: 8 }}>
                  {[10,20,30].map(p => <button key={`hi-${p}`} onClick={() => selectPct(HIGH_ORDER, p)} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, border: "1px solid #7c3aed33", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer", fontWeight: 600 }}>상위{p}%</button>)}
                  {[30,20,10].map(p => <button key={`lo-${p}`} onClick={() => selectPct(LOW_ORDER, p)} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, border: "1px solid #0d948833", background: "#f0fdfa", color: "#0d9488", cursor: "pointer", fontWeight: 600 }}>하위{p}%</button>)}
                </span>
              );
            })()}
          </div>
        )}

        {/* 매체/카드사 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>매체</span>
            {cardCompanies.map(c => <Tag key={`cc-${c}`} label={`🏦 ${({KB:"KB국민",NH:"NH농협",BC:"BC",SH:"신한",LOCA:"LOCA",NHPAY:"NH페이",OCB:"OCB",SKT:"SKT",SYRUP:"시럽",DLOCA:"D-LOCA"} as Record<string,string>)[c] || c}`} onRemove={() => setCardCompanies(cardCompanies.filter(x => x !== c))} />)}
            <DropdownMulti options={[
              { value: "KB", label: "KB국민" },
              { value: "NH", label: "NH농협" },
              { value: "NHPAY", label: "NH페이" },
              { value: "BC", label: "BC카드" },
              { value: "SH", label: "신한카드" },
              { value: "LOCA", label: "LOCA" },
              { value: "DLOCA", label: "D-LOCA" },
              { value: "OCB", label: "OCB" },
              { value: "SKT", label: "SKT" },
              { value: "SYRUP", label: "시럽" },
            ]} selected={cardCompanies} onChange={setCardCompanies} placeholder="+ 매체/카드사" />
          </div>
        )}

        {/* 통신사 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>통신</span>
            {telecoms.map(t => <Tag key={`tel-${t}`} label={`📡 ${({K:"KT",T:"SKT",U:"LG U+",Z:"알뜰폰"} as Record<string,string>)[t] || t}`} onRemove={() => setTelecoms(telecoms.filter(x => x !== t))} />)}
            <DropdownMulti options={[
              { value: "K", label: "KT" },
              { value: "T", label: "SKT" },
              { value: "U", label: "LG U+" },
              { value: "Z", label: "알뜰폰" },
            ]} selected={telecoms} onChange={setTelecoms} placeholder="+ 통신사" />
          </div>
        )}

        {/* 모바일 브랜드 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>단말</span>
            {mobileBrands.map(b => <Tag key={`mb-${b}`} label={`📱 ${({Apple:"애플",SAMSUNG:"삼성",LG:"LG",ZTE:"ZTE",XIAOMI:"샤오미"} as Record<string,string>)[b] || b}`} onRemove={() => setMobileBrands(mobileBrands.filter(x => x !== b))} />)}
            <DropdownMulti options={[
              { value: "Apple", label: "애플" },
              { value: "SAMSUNG", label: "삼성" },
              { value: "LG", label: "LG" },
              { value: "ZTE", label: "ZTE" },
              { value: "XIAOMI", label: "샤오미" },
            ]} selected={mobileBrands} onChange={setMobileBrands} placeholder="+ 단말" />
          </div>
        )}

        {/* 대카테고리 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>소비</span>
            {audCats.map(c => <Tag key={`ac-${c}`} label={`🏷️ ${c}`} onRemove={() => setAudCats(audCats.filter(x => x !== c))} />)}
            <DropdownMulti options={[
              { value: "유통", label: "유통" },
              { value: "식생활", label: "식생활" },
              { value: "의료/미용", label: "의료/미용" },
              { value: "서비스", label: "서비스" },
              { value: "자동차", label: "자동차" },
              { value: "여행", label: "여행" },
              { value: "레포츠/문화/취미", label: "레포츠/문화/취미" },
              { value: "의생활", label: "의생활" },
              { value: "교육", label: "교육" },
              { value: "내구재", label: "내구재" },
              { value: "주거생활", label: "주거생활" },
              { value: "유흥", label: "유흥" },
              { value: "기타", label: "기타" },
            ]} selected={audCats} onChange={setAudCats} placeholder="+ 대카테고리" />
          </div>
        )}

        {/* ADID 업로드 */}
        {tab === "card" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>ADID</span>
            {uploadSession && uploadInfo ? (
              <>
                <span style={{ padding: "4px 10px", borderRadius: 16, fontSize: 10, fontWeight: 600, background: "#dbeafe", color: "#1d4ed8", border: "1px solid #3b82f644" }}>
                  📤 {fmt(uploadInfo.matched)}건 매칭 / {fmt(uploadInfo.total)}건 업로드 ({uploadInfo.rate}%)
                </span>
                <button onClick={() => { setUploadSession(null); setUploadInfo(null); }} style={{ fontSize: 10, color: P.sub, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>해제</button>
              </>
            ) : (
              <label style={{ fontSize: 11, color: P.accent, cursor: "pointer", padding: "4px 12px", borderRadius: 16, border: `1px dashed ${P.accent}66`, background: `${P.accent}08` }}>
                {uploading ? "업로드 중..." : "+ ADID 파일 업로드"}
                <input type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }} disabled={uploading} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/adid-upload", { method: "POST", body: fd });
                    const data = await res.json();
                    if (data.success) {
                      setUploadSession(data.session_id);
                      setUploadInfo({ total: data.total_uploaded, matched: data.matched, rate: data.match_rate });
                    } else {
                      alert("업로드 실패: " + (data.error || "Unknown error"));
                    }
                  } catch (err: any) {
                    alert("업로드 에러: " + err.message);
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }} />
              </label>
            )}
          </div>
        )}

        {/* 조회기간 */}
        {(tab === "card" || tab === "spending" || tab === "cards") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".06em", width: 32 }}>기간</span>
            {[{ m: 12, label: "1년" }, { m: 1, label: "1개월" }, { m: 3, label: "3개월" }, { m: 6, label: "6개월" }].map(o => (
              <ToggleChip key={o.m} label={o.label} active={!useYmCustom && ymPreset === o.m} onClick={() => { setYmPreset(o.m); setUseYmCustom(false); }} />
            ))}
            <ToggleChip label="직접선택" active={useYmCustom} onClick={() => setUseYmCustom(true)} />
            {useYmCustom && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                <input type="month" value={ymCustomFrom} onChange={e => setYmCustomFrom(e.target.value)}
                  min="2025-09" max="2026-03"
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none", cursor: "pointer" }} />
                <span style={{ fontSize: 10, color: P.sub }}>~</span>
                <input type="month" value={ymCustomTo} onChange={e => setYmCustomTo(e.target.value)}
                  min={ymCustomFrom || "2025-09"} max="2026-03"
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none", cursor: "pointer" }} />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {anyFilter && <button onClick={reset} style={{ fontSize: 10, color: P.accent, background: "none", border: `1px solid ${P.accent}44`, borderRadius: 16, padding: "4px 14px", cursor: "pointer", fontWeight: 600 }}>✕ 초기화</button>}
            {filterParts.length > 0 && <span style={{ fontSize: 10, color: P.sub }}>{filterParts.join(" · ")}</span>}
          </div>
          {tab === "card" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setCampaignOpen(!campaignOpen); setCampaignResult(null); }} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: campaignOpen ? "#7c3aed" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", border: "none" }}>🎯 캠페인 타겟 찾기</button>
              <button onClick={() => { setExportOpen(true); setExportResult(null); setExportName(""); setExportMemo(""); }} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #3b82f6, #0d9488)", color: "#fff", border: "none" }}>🚀 런컴 타겟 전송</button>
            </div>
          )}
        </div>
      </div>

      {/* ─── CAMPAIGN TARGET FINDER ─── */}
      {campaignOpen && tab === "card" && (
        <div style={{ margin: "12px 28px 0", padding: 18, borderRadius: 12, background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", border: "1px solid #7c3aed33" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5b21b6" }}>🎯 캠페인 타겟 찾기</div>
            <button onClick={() => { setCampaignOpen(false); setCampaignResult(null); }} style={{ fontSize: 10, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>닫기</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: campaignResult ? 16 : 0 }}>
            <input value={campaignText} onChange={e => setCampaignText(e.target.value)} placeholder="예: 수입차를 많이 살 것 같은 고소득 고객, 20대 여성 뷰티 관심 타겟, 건강식품 구매 가능성 높은 중장년..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #c4b5fd", fontSize: 13, outline: "none", background: "rgba(255,255,255,.8)" }} onKeyDown={e => { if (e.key === "Enter" && campaignText.trim() && !campaignLoading) { e.preventDefault(); document.getElementById("campaign-btn")?.click(); }}} />
            <button id="campaign-btn" disabled={!campaignText.trim() || campaignLoading} onClick={async () => {
              setCampaignLoading(true); setCampaignResult(null);
              try {
                const res = await fetch("/api/campaign-target", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign: campaignText }) });
                const data = await res.json();
                if (data.success) setCampaignResult(data);
                else alert("분석 실패: " + (data.error || ""));
              } catch (e: any) { alert("에러: " + e.message); }
              finally { setCampaignLoading(false); }
            }} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: campaignLoading ? "wait" : "pointer", background: "#7c3aed", color: "#fff", border: "none", opacity: (!campaignText.trim() || campaignLoading) ? .5 : 1, whiteSpace: "nowrap" }}>
              {campaignLoading ? "분석 중..." : "타겟 추천"}
            </button>
          </div>
          {campaignResult && (
            <div>
              {campaignResult.analysis && <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, padding: "10px 14px", background: "rgba(255,255,255,.7)", borderRadius: 8, marginBottom: 12 }}>{campaignResult.analysis}</div>}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(campaignResult.recommendations?.length || 1, 3)}, 1fr)`, gap: 10 }}>
                {(campaignResult.recommendations || []).map((rec: any, i: number) => (
                  <div key={i} style={{ background: "rgba(255,255,255,.9)", borderRadius: 10, padding: 14, border: "1px solid #c4b5fd" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6", marginBottom: 6 }}>{"ⓐⓑⓒⓓ"[i]} {rec.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{rec.description}</div>
                    <div style={{ fontSize: 11, color: "#374151", padding: "6px 10px", background: "#f5f3ff", borderRadius: 6, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>조건:</span> {rec.filter_summary}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: rec.estimated_audience > 0 ? "#7c3aed" : "#9ca3af" }}>
                      {rec.estimated_audience > 0 ? fmt(rec.estimated_audience) : "—"}<span style={{ fontSize: 11, fontWeight: 500, color: "#7c3aed88", marginLeft: 4 }}>명</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>실시간 세그먼트 프리뷰 기반</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SEGMENT PREVIEW BANNER ─── */}
      {anyFilter && (
        <div style={{ position: "relative", overflow: "hidden", margin: "12px 28px 0", padding: "12px 18px", borderRadius: 10, background: "linear-gradient(135deg, rgba(59,130,246,0.04), rgba(13,148,136,0.06))", border: `1px solid ${P.accent}33`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {(segLoading || segValidating) && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `${P.accent}22` }}>
              <div className="dmp-seg-prog" style={{ height: "100%", width: "35%", background: P.accent, borderRadius: 2 }} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>세그먼트 프리뷰{(segLoading || segValidating) && <span style={{ fontWeight: 400, color: P.sub, marginLeft: 8 }}>갱신 중…</span>}</div>
              <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{filterParts.join(" · ") || "필터 적용 중"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={async () => {
              setAiLoading(true); setAiResult(null);
              try {
                const res = await fetch("/api/ai-recommend", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    filters: filterParts.join(" · "),
                    segmentPreview: segEstimate ? { estimated: segEstimate.estimated_audience, selectivity: (segEstimate.selectivity * 100).toFixed(1) } : null,
                    categories: industryData.slice(0, 12).map((it: any) => `${(PARTNER_MAP as any)[it.code] || it.code}: ${fmt(it.users)}명`).join("\n"),
                    ageGender: ageChart.map(a => `${AGE_LABEL[a.a]}: 남${fmt(a.M)} 여${fmt(a.F)}`).join("\n"),
                    regions: regionRank.slice(0, 10).map(r => `${r.name}: ${fmt(r.users)}명`).join("\n"),
                    amountBuckets: amountBuckets.map(b => `${b.label}: ${fmt(b.ads_count)}건`).join("\n"),
                  }),
                });
                const data = await res.json();
                if (data.success) setAiResult(data.analysis);
                else alert("AI 분석 실패: " + (data.error || ""));
              } catch (e: any) { alert("AI 분석 에러: " + e.message); }
              finally { setAiLoading(false); }
            }} disabled={aiLoading} style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#ede9fe", border: "1px solid #7c3aed44", borderRadius: 20, padding: "6px 16px", cursor: aiLoading ? "wait" : "pointer", opacity: aiLoading ? .6 : 1 }}>
              {aiLoading ? "🤖 분석 중..." : "🤖 AI 타겟 제안"}
            </button>
            {segEstimate && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em", opacity: segValidating ? 0.4 : 1, transition: "opacity 0.2s" }}>{fmt(segEstimate.estimated_audience)}<span style={{ fontSize: 12, fontWeight: 500, color: P.sub, marginLeft: 4 }}>명</span></div>
                <div style={{ fontSize: 10, color: P.sub }}>전체 {fmt(segEstimate.total_audience)}명 중 {(segEstimate.selectivity * 100).toFixed(1)}%{segData?.meta?.response_time_ms && ` · ${segData.meta.response_time_ms}ms`}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── AI RECOMMENDATION RESULT ─── */}
      {aiResult && (
        <div style={{ margin: "8px 28px 0", padding: 18, borderRadius: 12, background: "linear-gradient(135deg, #ede9fe, #faf5ff)", border: "1px solid #7c3aed33" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5b21b6" }}>🤖 AI 효율 타겟 분석</div>
            <button onClick={() => setAiResult(null)} style={{ fontSize: 10, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>닫기</button>
          </div>
          {aiResult.summary && <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,.7)", borderRadius: 8 }}>{aiResult.summary}</div>}
          {aiResult.insights?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginBottom: 6 }}>💡 핵심 인사이트</div>
              {aiResult.insights.map((ins: string, i: number) => (
                <div key={i} style={{ fontSize: 12, color: "#4b5563", padding: "4px 0 4px 12px", borderLeft: "2px solid #a78bfa", marginBottom: 4 }}>{ins}</div>
              ))}
            </div>
          )}
          {aiResult.recommendations?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginBottom: 8 }}>🎯 추천 타겟 조합</div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(aiResult.recommendations.length, 3)}, 1fr)`, gap: 10 }}>
                {aiResult.recommendations.map((rec: any, i: number) => (
                  <div key={i} style={{ background: "rgba(255,255,255,.85)", borderRadius: 10, padding: 14, border: "1px solid #c4b5fd" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#5b21b6", marginBottom: 6 }}>{"ⓐⓑⓒⓓ"[i] || "●"} {rec.label}</div>
                    {rec.description && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{rec.description}</div>}
                    <div style={{ fontSize: 11, color: "#374151", padding: "6px 8px", background: "#f5f3ff", borderRadius: 6, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>조건:</span> {rec.filters}
                    </div>
                    {rec.estimated_audience && <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>추정 규모: {rec.estimated_audience}</div>}
                    {rec.reason && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{rec.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── AUDIENCE TAB ─── */}
      {tab === "card" && (<>
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
              const name = PARTNER_MAP[it.code] || it.code;
              return (
                <div key={i} onClick={() => { if (!middleCats.includes(name) && !majorCats.includes(name)) { setMiddleCats(prev => [...prev, name]); }}} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, cursor: "pointer", borderRadius: 4, padding: "1px 0", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontSize: 10, color: P.sub, width: 76, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
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
                  <div key={i} onClick={() => { if (!sidos.includes(r.name)) setSidos(prev => [...prev, r.name]); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,.05)", cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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

        {/* Amount Distribution */}
        {amountBuckets.length > 0 && (
          <div style={{ padding: "0 28px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* 금액 구간 분포 */}
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💰 결제 금액 구간 분포</h3>
              {(() => {
                const maxAds = Math.max(...amountBuckets.map(b => b.ads_count));
                const totalAds = amountBuckets.reduce((s, b) => s + b.ads_count, 0);
                return amountBuckets.map((b, i) => {
                  const pct = totalAds > 0 ? (b.ads_count / totalAds * 100) : 0;
                  return (
                    <div key={i} onClick={() => { if (b.bucket && !amountFilters.includes(b.bucket)) setAmountFilters(prev => [...prev, b.bucket]); }} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", borderRadius: 4, transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontSize: 11, color: P.sub, width: 60, textAlign: "right", flexShrink: 0 }}>{b.label}</span>
                      <div style={{ flex: 1, height: 18, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", background: `hsl(${200 + i * 15}, 55%, ${55 + i * 3}%)`, borderRadius: 4, width: `${maxAds > 0 ? b.ads_count / maxAds * 100 : 0}%`, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 10, color: P.sub, width: 40, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                    </div>
                  );
                });
              })()}
              <div style={{ fontSize: 10, color: P.sub, marginTop: 8, textAlign: "right" }}>총 {fmt(amountBuckets.reduce((s, b) => s + b.ads_count, 0))}건 · 카드 결제 기반</div>
            </div>
            {/* 금액 구간별 거래액 */}
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid #d97706`, paddingBottom: 8 }}>💳 구간별 거래액</h3>
              {(() => {
                const maxAmt = Math.max(...amountBuckets.map(b => b.total_amt));
                const totalAmt = amountBuckets.reduce((s, b) => s + b.total_amt, 0);
                return amountBuckets.map((b, i) => {
                  const pct = totalAmt > 0 ? (b.total_amt / totalAmt * 100) : 0;
                  const amtLabel = b.total_amt >= 1e12 ? `${(b.total_amt / 1e12).toFixed(1)}조` : b.total_amt >= 1e8 ? `${Math.round(b.total_amt / 1e8)}억` : fmt(b.total_amt);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: P.sub, width: 60, textAlign: "right", flexShrink: 0 }}>{b.label}</span>
                      <div style={{ flex: 1, height: 18, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: `hsl(${35 + i * 5}, 75%, ${50 + i * 3}%)`, borderRadius: 4, width: `${maxAmt > 0 ? b.total_amt / maxAmt * 100 : 0}%`, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 10, color: P.sub, width: 50, textAlign: "right", flexShrink: 0 }}>{amtLabel}</span>
                    </div>
                  );
                });
              })()}
              <div style={{ fontSize: 10, color: P.sub, marginTop: 8, textAlign: "right" }}>총 {amountBuckets.reduce((s, b) => s + b.total_amt, 0) >= 1e12 ? `${(amountBuckets.reduce((s, b) => s + b.total_amt, 0) / 1e12).toFixed(1)}조` : ""} · 카드 결제 기반</div>
            </div>
          </div>
        )}

        {/* Ad Engagement */}
        {adHourly.length > 0 && (
          <div style={{ padding: "0 28px 20px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
            {/* 시간대별 광고 참여 */}
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: "2px solid #6366f1", paddingBottom: 8 }}>📊 시간대별 광고 참여</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
                {adHourly.map((h, i) => {
                  const maxU = Math.max(...adHourly.map(x => x.users));
                  const ht = maxU > 0 ? (h.users / maxU * 100) : 0;
                  const isPeak = h.users === maxU;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: "100%", height: `${ht}%`, minHeight: 2, background: isPeak ? "#6366f1" : "#a5b4fc", borderRadius: "3px 3px 0 0", transition: "height .3s" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                {adHourly.map((h, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: P.sub }}>{i % 3 === 0 ? `${h.hr}시` : ""}</div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span style={{ fontSize: 10, color: P.sub }}>피크: {adHourly.reduce((m, h) => h.users > m.users ? h : m, adHourly[0]).hr}시 ({fmt(adHourly.reduce((m, h) => h.users > m.users ? h : m, adHourly[0]).users)}명)</span>
                <span style={{ fontSize: 10, color: P.sub }}>총 {fmt(adHourly.reduce((s, h) => s + h.clicks, 0))} 클릭</span>
              </div>
            </div>
            {/* OS별 광고 참여 */}
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: "2px solid #10b981", paddingBottom: 8 }}>📱 OS별 광고 참여</h3>
              {(() => {
                const totalUsers = adOs.reduce((s, o) => s + o.users, 0);
                const colors: Record<string, string> = { Android: "#3DDC84", iOS: "#007AFF", "기타": "#94a3b8" };
                return adOs.map((o, i) => {
                  const pct = totalUsers > 0 ? (o.users / totalUsers * 100) : 0;
                  const ctr = o.imps > 0 ? (o.clicks / o.imps * 100).toFixed(2) : "0";
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{o.os}</span>
                        <span style={{ fontSize: 11, color: P.sub }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 20, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: colors[o.os] || "#94a3b8", borderRadius: 4, width: `${pct}%`, transition: "width .4s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: P.sub }}>{fmt(o.users)}명</span>
                        <span style={{ fontSize: 9, color: P.sub }}>CTR {ctr}%</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Shopping Categories */}
        {shopCategories.length > 0 && (
          <div style={{ padding: "0 28px 28px" }}>
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>🛒 쇼핑 카테고리 (최근 1주)</h3>
                <span style={{ fontSize: 10, color: P.sub }}>쿠팡 결제 기반 · {shopCategories.reduce((s, c) => s + c.cnt, 0).toLocaleString()}건</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {shopCategories.slice(0, 12).map((cat, i) => {
                  const cc = SHOP_CAT_COLORS[cat.name] || SHOP_CAT_COLORS["기타"];
                  const totalCnt = shopCategories.reduce((s, c) => s + c.cnt, 0);
                  const pct = totalCnt > 0 ? (cat.cnt / totalCnt * 100).toFixed(1) : "0";
                  const isSelected = shopCats.includes(cat.name);
                  return (
                    <div key={i} style={{ background: isSelected ? cc.bg : cc.bg + "44", borderRadius: 10, padding: "10px 12px", border: `1px solid ${isSelected ? cc.fg : cc.fg + "22"}`, transition: "all .15s" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cc.fg, marginBottom: 4 }}>{cat.name}{isSelected && " ✓"}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>{fmt(cat.cnt)}<span style={{ fontSize: 10, fontWeight: 400, color: P.sub }}>건</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <div style={{ flex: 1, height: 4, background: "rgba(0,0,0,.06)", borderRadius: 2, overflow: "hidden", marginRight: 6 }}>
                          <div style={{ height: "100%", background: cc.fg, borderRadius: 2, width: `${pct}%`, transition: "width .4s", opacity: .7 }} />
                        </div>
                        <span style={{ fontSize: 9, color: P.sub, fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>)}

      {tab === "spending" && <SpendingTab sido={sidos.length ? sidos[0] : "전체"} sex={sexes.length ? sexes[0] : "all"} age={ages.length ? ages[0] : "all"} ymFrom={ymFrom} ymTo={ymTo} />}
      {tab === "cards" && <CardComparisonTab ymFrom={ymFrom} ymTo={ymTo} />}
      {tab === "exports" && <ExportHistoryTab userRole={user.role} />}
      {tab === "shopping" && <ShoppingProductsTab />}
      {(tab === "subway" || tab === "bus" || tab === "membership") && <BehaviorPlaceholder behavior={tab} />}

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
              {shopCats.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#fef3c7", fontSize: 11, border: "1px solid #d9770644", color: "#92400e", fontWeight: 600 }}>🛒 쇼핑: {shopCats.join(", ")}</span>}
              {amountFilters.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#ede9fe", fontSize: 11, border: "1px solid #7c3aed44", color: "#5b21b6", fontWeight: 600 }}>💰 금액: {amountFilters.map(a => ({under_5k:"~5천","5k_10k":"5천~1만","10k_30k":"1~3만","30k_50k":"3~5만","50k_100k":"5~10만","100k_300k":"10~30만",over_300k:"30만~"} as Record<string,string>)[a] || a).join(", ")}</span>}
              {uploadSession && uploadInfo && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#dbeafe", fontSize: 11, border: "1px solid #3b82f644", color: "#1d4ed8", fontWeight: 600 }}>📤 ADID {fmt(uploadInfo.matched)}건 매칭</span>}
              {cardCompanies.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#e0f2fe", fontSize: 11, border: "1px solid #0284c744", color: "#0c4a6e", fontWeight: 600 }}>🏦 매체: {cardCompanies.join(", ")}</span>}
              {telecoms.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#f0fdf4", fontSize: 11, border: "1px solid #16a34a44", color: "#14532d", fontWeight: 600 }}>📡 통신: {telecoms.map(t => ({K:"KT",T:"SKT",U:"LG U+",Z:"알뜰폰"} as Record<string,string>)[t] || t).join(", ")}</span>}
              {mobileBrands.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#eef2ff", fontSize: 11, border: "1px solid #6366f144", color: "#3730a3", fontWeight: 600 }}>📱 단말: {mobileBrands.map(b => ({Apple:"애플",SAMSUNG:"삼성",LG:"LG",ZTE:"ZTE",XIAOMI:"샤오미"} as Record<string,string>)[b] || b).join(", ")}</span>}
              {audCats.length > 0 && <span style={{ padding: "4px 10px", borderRadius: 6, background: "#eef2ff", fontSize: 11, border: "1px solid #6366f144", color: "#3730a3", fontWeight: 600 }}>🏷️ 소비: {audCats.join(", ")}</span>}
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
