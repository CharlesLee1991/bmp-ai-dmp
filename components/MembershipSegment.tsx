"use client";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const P = {
  bg: "var(--bg)", card: "var(--card)", border: "var(--border)",
  text: "var(--text)", sub: "var(--sub)",
  accent: "var(--accent)", glow: "var(--accent-glow)",
  m: "var(--male)", f: "var(--female)",
  app: "var(--accent-2)", appGlow: "var(--accent-2-glow)",
};

const DOW_LABEL: Record<string, string> = {
  "1":"일","2":"월","3":"화","4":"수","5":"목","6":"금","7":"토"
};
const AGE_LABEL: Record<string, string> = {
  "10s":"10대","20s":"20대","30s":"30대","40s":"40대","50s":"50대","60s+":"60대+","70s":"70대+"
};
const AMT_OPTIONS = [
  { value: "", label: "전체" },
  { value: "1만원미만", label: "1만원 미만" },
  { value: "1-3만원", label: "1~3만원" },
  { value: "3-5만원", label: "3~5만원" },
  { value: "5-10만원", label: "5~10만원" },
  { value: "10만원이상", label: "10만원 이상" },
];
const DOW_OPTIONS = ["1","2","3","4","5","6","7"];

function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const c = color || P.accent;
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, fontSize: 12,
      fontWeight: active ? 700 : 400, cursor: "pointer",
      border: `1px solid ${active ? c : P.border}`,
      background: active ? `${c}14` : P.card,
      color: active ? c : P.sub, transition: "all .15s",
    }}>{label}</button>
  );
}

const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();
const pct = (a: number, b: number) => b === 0 ? 0 : Math.round(a / b * 100);

interface Props { sidos?: string[]; sexes?: string[]; ages?: string[]; }

export default function MembershipSegment({ sidos = [], sexes = [], ages = [] }: Props) {
  const [amt, setAmt] = useState("");
  const [dow, setDow] = useState("");
  const [selPartner, setSelPartner] = useState<string>("");
  const [selApp, setSelApp] = useState<string>("");

  // ── 적립앱 데이터 ──
  const platformKey = `/api/membership#platform|${selApp}`;
  const { data: pRaw, isLoading: pLoading } = useSWR(platformKey, async () => {
    const res = await fetch("/api/membership", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_group: selApp }),
    });
    return res.json();
  }, { revalidateOnFocus: false, dedupingInterval: 60000 });

  const pd = pRaw?.success ? pRaw.data : null;
  const appList: { name: string; cnt: number }[] = pd?.app_list ?? [];
  const maxApp = appList[0]?.cnt ?? 1;
  const pAgeGender: { age: string; M: number; F: number }[] = pd?.age_gender ?? [];

  // ── 멤버십 데이터 ──
  const fetchKey = `/api/membership#${amt}|${dow}|${selPartner}|${sidos.join(",")}|${sexes.join(",")}|${ages.join(",")}`;
  const { data: raw, isLoading } = useSWR(fetchKey, async () => {
    const body: Record<string, string> = {};
    if (amt)        body.amt_bucket = amt;
    if (dow)        body.dow        = dow;
    if (selPartner) body.partner_cd = selPartner;
    if (sidos.length)  body.sido = sidos.join(",");
    if (sexes.length)  body.sex  = sexes.join(",");
    if (ages.length)   body.age  = ages.join(",");
    const res = await fetch("/api/membership", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }, { revalidateOnFocus: false, dedupingInterval: 20000, keepPreviousData: true });

  const d = raw?.success ? raw.data : null;

  const hourData = useMemo(() =>
    (d?.hour_dist ?? []).map((h: any) => ({
      name: `${h.hour}시`, cnt: Number(h.cnt),
      fill: (h.hour >= 11 && h.hour <= 14) || (h.hour >= 19 && h.hour <= 21) ? P.accent : "var(--border-strong)"
    })), [d]);

  const ageData = useMemo(() =>
    (d?.age_gender ?? []).map((a: any) => ({
      name: AGE_LABEL[a.age] || a.age,
      남성: Number(a.M), 여성: Number(a.F)
    })), [d]);

  const amtData = useMemo(() =>
    (d?.amt_dist ?? []).map((a: any) => ({
      name: a.bucket, cnt: Number(a.cnt)
    })), [d]);

  const total = d?.total_audience ?? 0;
  const male = d?.male ?? 0;
  const female = d?.female ?? 0;
  const mPct = pct(male, male + female);
  const fPct = 100 - mPct;
  const peakHour = d?.peak_hour;
  const topAge = AGE_LABEL[d?.top_age] ?? d?.top_age ?? "–";
  const partnerTop: { partner_cd: string; partner_name: string; cnt: number }[] = d?.partner_top ?? [];
  const maxPartner = partnerTop[0]?.cnt ?? 1;
  const noData = !d || total === 0;
  const pieData = [{ name: "남성", value: male, c: P.m }, { name: "여성", value: female, c: P.f }];

  return (
    <div style={{ padding: "24px 28px 40px", background: P.bg, minHeight: 600 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.text, marginBottom: 3 }}>
          🎟️ 멤버십 사용 행태
        </div>
        <div style={{ fontSize: 12, color: P.sub }}>NH멤버십 적립·사용 데이터 기반 오디언스 분석 · 오늘 17:00 이후 집계 반영</div>
      </div>

      {/* ── 적립앱 섹션 ── */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.app}`, paddingBottom: 8 }}>
          📱 적립앱별 오디언스
          <span style={{ fontSize: 11, fontWeight: 400, color: P.sub, marginLeft: 8 }}>앱 선택 시 연령·성별 분포 표시</span>
        </div>

        {pLoading && <div style={{ fontSize: 12, color: P.sub, padding: "12px 0" }}>로딩 중…</div>}

        {!pLoading && appList.length > 0 && (
          <>
            {/* 앱 선택 칩 */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <Chip label="전체" active={selApp === ""} onClick={() => setSelApp("")} color={P.app} />
              {appList.map(a => (
                <Chip key={a.name} label={`${a.name} ${fmt(a.cnt)}명`}
                  active={selApp === a.name} onClick={() => setSelApp(selApp === a.name ? "" : a.name)} color={P.app} />
              ))}
            </div>

            {selApp === "" ? (
              /* 전체: 앱별 바 차트 */
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={appList} layout="vertical" barSize={14} margin={{ left: 60, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={P.border} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: P.sub }} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: P.text }} width={60} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)) + "명", "사용자"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="cnt" fill={P.app} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              /* 선택 앱: 연령×성별 */
              <div>
                <div style={{ fontSize: 11, color: P.sub, marginBottom: 8 }}>
                  <b style={{ color: P.app }}>{selApp}</b> 사용자 총 {fmt(pd?.total_audience ?? 0)}명 · 연령×성별 분포
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={pAgeGender.map(a => ({ name: AGE_LABEL[a.age] || a.age, 남성: a.M, 여성: a.F }))} barSize={14} barGap={2}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} />
                    <YAxis tick={{ fontSize: 10, fill: P.sub }} tickFormatter={fmt} width={38} />
                    <Tooltip formatter={(v: any) => [fmt(Number(v)), ""]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 10, borderRadius: 8 }} />
                    <Bar dataKey="남성" fill={P.m} radius={[3,3,0,0]} />
                    <Bar dataKey="여성" fill={P.f} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 기존 멤버십 필터 ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>사용금액구간</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AMT_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={amt === o.value} onClick={() => setAmt(o.value)} />)}
          </div>
        </div>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 8 }}>이용요일</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["", ...DOW_OPTIONS].map(v => (
              <Chip key={v} label={v === "" ? "전체" : DOW_LABEL[v]} active={dow === v} onClick={() => setDow(v)} />
            ))}
          </div>
        </div>
      </div>

      {/* 가맹점 TOP 15 */}
      {partnerTop.length > 0 && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: P.sub }}>🏪 가맹점 필터 (이용량 TOP {partnerTop.length})</div>
            {selPartner && (
              <button onClick={() => setSelPartner("")}
                style={{ fontSize: 10, color: P.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                × 선택 해제
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {partnerTop.map((p) => {
              const active = selPartner === p.partner_cd;
              return (
                <button key={p.partner_cd} onClick={() => setSelPartner(active ? "" : p.partner_cd)}
                  style={{
                    flexShrink: 0, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${active ? P.accent : P.border}`,
                    background: active ? P.glow : P.bg, textAlign: "left", transition: "all .15s",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? P.accent : P.text, whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.partner_name || p.partner_cd}
                  </div>
                  <div style={{ fontSize: 10, color: P.sub, marginTop: 2 }}>{fmt(Number(p.cnt))}명</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 13 }}>분석 중…</div>}

      {!isLoading && noData && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎟️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.sub, marginBottom: 4 }}>멤버십 데이터 집계 중</div>
          <div style={{ fontSize: 12, color: P.sub }}>오늘 17:00 KST 이후 NH멤버십 데이터가 반영됩니다</div>
        </div>
      )}

      {!isLoading && !noData && (
        <>
          {/* KPI 4개 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "총 오디언스", value: fmt(total) + "명", sub: selPartner ? "선택 가맹점 기준" : "전체 멤버십" },
              { label: "남녀 비율", value: `${mPct}:${fPct}`, sub: `남성 ${fmt(male)} · 여성 ${fmt(female)}` },
              { label: "피크 이용시간", value: peakHour ? `${peakHour}시` : "–",
                sub: peakHour ? (Number(peakHour) >= 11 && Number(peakHour) <= 14 ? "점심 시간대" : "저녁 시간대") : "" },
              { label: "주력 연령대", value: topAge, sub: "최다 이용 연령" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: P.accent, letterSpacing: "-0.03em", marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 10, color: P.sub }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 시간대별 + 금액 구간 */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                ⏰ 시간대별 이용 분포
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={hourData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: P.sub }} tickFormatter={v => fmt(v)} width={40} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), "이용자"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="cnt" radius={[4,4,0,0]}>
                    {hourData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 10, color: P.sub, marginTop: 6 }}>🟣 점심(11~14시)·저녁(19~21시) 강조</div>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                💰 금액 구간별
              </div>
              {amtData.map((a: any, i: number) => (
                <div key={a.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: P.text, fontWeight: i === 0 ? 700 : 400 }}>{a.name}</span>
                    <span style={{ color: P.sub }}>{fmt(Number(a.cnt))}명</span>
                  </div>
                  <div style={{ background: P.bg, borderRadius: 4, height: 5 }}>
                    <div style={{ width: `${a.cnt / amtData[0]?.cnt * 100}%`, background: i === 0 ? P.accent : P.border, borderRadius: 4, height: "100%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 연령×성별 + 가맹점 TOP */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                👥 연령 × 성별 분포
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 90, height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="value" strokeWidth={0}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.c} />)}
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
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={ageData} barSize={10} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: P.sub }} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), ""]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)", fontSize: 10, borderRadius: 8 }} />
                  <Bar dataKey="남성" fill={P.m} radius={[3,3,0,0]} />
                  <Bar dataKey="여성" fill={P.f} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12, borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>
                🏪 가맹점 TOP 15
              </div>
              {partnerTop.slice(0, 10).map((p, i) => (
                <div key={p.partner_cd} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: P.text, fontWeight: i < 3 ? 700 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}.`} {p.partner_name || p.partner_cd}
                    </span>
                    <span style={{ color: P.sub, marginLeft: 4, flexShrink: 0 }}>{fmt(Number(p.cnt))}</span>
                  </div>
                  <div style={{ background: P.bg, borderRadius: 3, height: 4 }}>
                    <div style={{ width: `${Number(p.cnt)/maxPartner*100}%`, background: i===0 ? P.accent : P.border, borderRadius: 3, height: "100%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
