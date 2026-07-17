"use client";
import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { TrainFront, Bus, MapPin, Clock, Users, Medal, Circle, Search, X } from "lucide-react";

const P = {
  bg: "var(--bg)", card: "var(--card)", border: "var(--border)",
  text: "var(--text)", sub: "var(--sub)",
  accent: "var(--accent)", glow: "var(--accent-glow)",
  m: "var(--male)", f: "var(--female)",
};

const AGE_LABEL: Record<string, string> = {
  "10s": "10대", "20s": "20대", "30s": "30대",
  "40s": "40대", "50s": "50대", "60s": "60대+", "70s": "70대+"
};

const CAT_OPTIONS = [
  { value: "", label: "전체 (탭 기본)" },
  { value: "BSUB", label: "대중교통(버스+지하철)" },
  { value: "GSUB", label: "광역교통" },
];
const ONOFF_OPTIONS = [
  { value: "", label: "전체" },
  { value: "A", label: "승차" },
  { value: "R", label: "하차" },
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

interface StationInfo {
  station_id: string; station_name: string;
  infra_name: string; line_no: string; cnt: number;
}
interface Props {
  tab: "subway" | "bus";
  sidos?: string[]; sexes?: string[]; ages?: string[];
  ymFrom?: string; ymTo?: string;
}

export default function TransitSegment({ tab, sidos = [], sexes = [], ages = [] }: Props) {
  // tab별 기본 cat: subway=지하철계열(SUB,GSUB), bus=버스계열(BSUB,BUS)
  const defaultCat = tab === "subway" ? "SUB,GSUB" : "BSUB,BUS";
  const [cat, setCat] = useState(defaultCat);
  const [onOff, setOnOff] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [stationPickerOpen, setStationPickerOpen] = useState(false);   // 전체 역 검색 팝업
  const [stationQuery, setStationQuery] = useState("");

  // tab 변경 시 필터 리셋 (지하철↔버스 전환)
  useEffect(() => {
    setCat(defaultCat);
    setOnOff("");
    setSelectedStation("");
    setStationPickerOpen(false);
    setStationQuery("");
  }, [tab]);

  const fetchKey = `/api/transit#${tab}|${defaultCat}|${cat}|${onOff}|${selectedStation}|${sidos.join(",")}|${sexes.join(",")}|${ages.join(",")}`;

  const { data: raw, isLoading } = useSWR(fetchKey, async () => {
    const body: Record<string, string> = {};
    body.cat = cat || defaultCat;  // tab 기본 cat 항상 전달
    if (onOff)           body.on_off     = onOff;
    if (selectedStation) body.station_id = selectedStation;
    if (sidos.length)    body.sido       = sidos.join(",");
    if (sexes.length)    body.sex        = sexes.join(",");
    if (ages.length)     body.age        = ages.join(",");
    const res = await fetch("/api/transit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }, { revalidateOnFocus: false, dedupingInterval: 20000, keepPreviousData: true });

  const d = raw?.success ? raw.data : null;

  const hourData = useMemo(() =>
    (d?.hour_dist ?? []).map((h: any) => ({
      name: `${h.hour}시`, cnt: Number(h.cnt),
      fill: (h.hour >= 7 && h.hour <= 9) || (h.hour >= 17 && h.hour <= 19) ? P.accent : "var(--border-strong)"
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
  const stationTop: StationInfo[] = d?.station_top ?? [];
  const maxRegion = regionTop[0]?.cnt ?? 1;
  const noData = !d || total === 0;

  const pieData = [
    { name: "남성", value: male, c: P.m },
    { name: "여성", value: female, c: P.f },
  ];

  return (
    <div style={{ padding: "24px 28px 40px", background: P.bg, minHeight: 600 }}>
      {/* 2차 필터 라벨 — 상단 콘텐츠 헤더(제목·설명)와 중복 제거, 화면 내 상세 필터임을 명시 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--badge-teal-fg)", background: "var(--badge-teal-bg)", padding: "2px 7px", borderRadius: 6 }}>2차 필터</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: P.text }}>{tab === "subway" ? "지하철" : "버스"} 이용 상세</span>
        <span style={{ fontSize: 10.5, color: P.sub }}>1차 모수를 좁히는 {tab === "subway" ? "지하철" : "버스"} 전용 조건 (교통유형·승하차·{tab === "subway" ? "역" : "정류장"})</span>
      </div>

      {/* 기본 필터 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>교통유형</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CAT_OPTIONS.map(o => (
              <Chip key={o.value} label={o.label}
                active={o.value === "" ? (cat === defaultCat || cat === "") : cat === o.value}
                onClick={() => setCat(o.value === "" ? defaultCat : o.value)} />
            ))}
          </div>
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>승하차</div>
          <div style={{ display: "flex", gap: 6 }}>
            {ONOFF_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={onOff === o.value} onClick={() => setOnOff(o.value)} />)}
          </div>
        </div>
      </div>

      {/* 역/정류장 선택 — 이용량 상위 빠른선택 + 전체 검색 팝업 */}
      {stationTop.length > 0 && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: P.text }}><MapPin size={13} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4, color: P.accent }} /> {tab === "subway" ? "역" : "정류장"}별 필터 <span style={{ fontWeight: 500, color: P.sub }}>· 이용량 상위 {stationTop.length}곳</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setStationPickerOpen(true)}
                style={{ fontSize: 10.5, color: P.accent, background: P.glow, border: `1px solid ${P.accent}`, borderRadius: 8, padding: "4px 11px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Search size={12} strokeWidth={2.2} /> 전체 {tab === "subway" ? "역" : "정류장"} 검색
              </button>
              {selectedStation && (
                <button onClick={() => setSelectedStation("")}
                  style={{ fontSize: 10, color: P.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  × 선택 해제
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 10, color: P.sub, marginBottom: 10 }}>빠른 선택으로 이용량 상위 {tab === "subway" ? "역" : "정류장"}을 고르거나, <b style={{ color: P.text }}>전체 검색</b>에서 이름으로 찾아 선택하세요. (1곳 선택 시 해당 {tab === "subway" ? "역" : "정류장"} 기준으로 아래 지표가 갱신됩니다.)</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {stationTop.map((s) => {
              const active = selectedStation === s.station_id;
              return (
                <button key={s.station_id} onClick={() => setSelectedStation(active ? "" : s.station_id)}
                  style={{
                    flexShrink: 0, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${active ? P.accent : P.border}`,
                    background: active ? P.glow : P.bg,
                    textAlign: "left", transition: "all .15s",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? P.accent : P.text, whiteSpace: "nowrap" }}>
                    {s.station_name}
                  </div>
                  <div style={{ fontSize: 10, color: P.sub, marginTop: 2, whiteSpace: "nowrap" }}>
                    {s.infra_name} {s.line_no}호선 · {fmt(Number(s.cnt))}명
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 전체 역/정류장 검색 팝업 — 이름으로 찾아 선택 (단일 선택) */}
      {stationPickerOpen && (
        <div onClick={() => setStationPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "var(--scrim)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 20px 40px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", maxHeight: "76vh", display: "flex", flexDirection: "column", background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: P.text }}><MapPin size={15} strokeWidth={2.1} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />{tab === "subway" ? "역" : "정류장"} 검색 · 선택</div>
              <button onClick={() => setStationPickerOpen(false)} style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "transparent", border: `1px solid ${P.border}`, color: P.sub, cursor: "pointer" }}><X size={15} strokeWidth={2.2} /></button>
            </div>
            <div style={{ padding: "12px 18px 8px" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} strokeWidth={2} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: P.sub }} />
                <input autoFocus value={stationQuery} onChange={e => setStationQuery(e.target.value)} placeholder={`${tab === "subway" ? "역" : "정류장"} 이름 검색…`}
                  style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 9, border: `1px solid ${P.border}`, fontSize: 13, outline: "none", background: P.bg, color: P.text, boxSizing: "border-box" }} />
              </div>
              <div style={{ fontSize: 10, color: P.sub, marginTop: 6 }}>이용량 상위 {stationTop.length}곳 중 검색 · 전체 {tab === "subway" ? "역" : "정류장"} 로드는 추후 확장 예정</div>
            </div>
            <div style={{ overflowY: "auto", padding: "4px 10px 12px", flex: 1 }}>
              {stationTop
                .filter(s => !stationQuery.trim() || s.station_name.includes(stationQuery.trim()))
                .map(s => {
                  const active = selectedStation === s.station_id;
                  return (
                    <button key={s.station_id} onClick={() => { setSelectedStation(active ? "" : s.station_id); setStationPickerOpen(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", borderRadius: 9, cursor: "pointer", border: "none", background: active ? P.glow : "transparent", textAlign: "left", marginBottom: 2 }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                      <span>
                        <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? P.accent : P.text }}>{s.station_name}</span>
                        <span style={{ fontSize: 10.5, color: P.sub, marginLeft: 8 }}>{s.infra_name} {s.line_no}호선</span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: P.sub }}>{fmt(Number(s.cnt))}명</span>
                    </button>
                  );
                })}
              {stationTop.filter(s => !stationQuery.trim() || s.station_name.includes(stationQuery.trim())).length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: P.sub }}>검색 결과가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 13 }}>분석 중…</div>
      )}

      {!isLoading && noData && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>{tab === "subway" ? <TrainFront size={30} strokeWidth={1.75} style={{ color: P.sub }} /> : <Bus size={30} strokeWidth={1.75} style={{ color: P.sub }} />}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.sub, marginBottom: 4 }}>교통 데이터 집계 중</div>
          <div style={{ fontSize: 12, color: P.sub }}>오늘 19:00 KST 이후 데이터가 반영됩니다</div>
        </div>
      )}

      {!isLoading && !noData && (
        <>
          {/* KPI 4개 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: `${tab === "subway" ? "지하철" : "버스"} 이용자`, value: fmt(total) + "명", sub: selectedStation ? `선택 ${tab === "subway" ? "역" : "정류장"} 기준` : "교통 데이터 · 현재 필터" },
              { label: "남녀 비율", value: `${mPct}:${fPct}`, sub: `남성 ${fmt(male)} · 여성 ${fmt(female)}` },
              { label: "피크 이용시간", value: peakHour != null ? `${peakHour}시` : "–",
                sub: peakHour != null ? (peakHour >= 6 && peakHour <= 10 ? "출근 시간대" : peakHour >= 17 && peakHour <= 20 ? "퇴근 시간대" : "낮 시간대") : "" },
              { label: "주력 연령대", value: topAge, sub: "최다 이용 연령" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em", marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 10, color: P.sub }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: P.sub, lineHeight: 1.5, margin: "-8px 0 18px" }}>
            <b style={{ color: P.text }}>{tab === "subway" ? "지하철" : "버스"} 이용자</b>는 교통카드 데이터 기준 현재 필터 모수입니다. 상단 <b style={{ color: P.accent }}>1차 타겟 모수</b>(전 데이터소스 통합 추정치)와 정의가 달라 수치가 다를 수 있습니다.
          </div>

          {/* 시간대별 이용 분포 */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
              <Clock size={15} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} /> 시간대별 이용 분포{selectedStation && stationTop.find(s=>s.station_id===selectedStation) ? ` — ${stationTop.find(s=>s.station_id===selectedStation)!.station_name}역` : ""}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: P.sub }} tickFormatter={v => fmt(v)} width={40} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), "이용자"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="cnt" radius={[4, 4, 0, 0]}>
                  {hourData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: P.sub, marginTop: 6 }}><Circle size={8} fill={P.accent} strokeWidth={0} style={{ verticalAlign: "0px", marginRight: 5 }} /> 출퇴근 시간대 (7~9시, 17~19시) 강조</div>
          </div>

          {/* 연령×성별 + 지역 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                <Users size={15} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} /> 연령 × 성별 분포
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
                  {[{ label: "남성", p: mPct, c: P.m }, { label: "여성", p: fPct, c: P.f }].map(r => (
                    <div key={r.label} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: r.c, fontWeight: 700 }}>{r.label}</span>
                        <span style={{ color: P.sub }}>{r.p}%</span>
                      </div>
                      <div style={{ background: P.bg, borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${r.p}%`, background: r.c, borderRadius: 4, height: "100%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={ageData} barSize={10} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: P.sub }} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), ""]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 10, borderRadius: 8 }} />
                  <Bar dataKey="남성" fill={P.m} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="여성" fill={P.f} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                <MapPin size={15} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} /> 지역별 이용자
              </div>
              {regionTop.map((r, i) => {
                const w = r.cnt / maxRegion * 100;
                return (
                  <div key={r.region} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: P.text, fontWeight: i < 3 ? 700 : 400 }}>
                        {i < 3 ? <Medal size={13} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 2, color: ["#EAB308","#94A3B8","#B45309"][i] }} /> : `${i+1}.`} {r.region}
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
        </>
      )}
    </div>
  );
}
