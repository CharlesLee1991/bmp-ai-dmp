"use client";

/* ══════════════════════════════════════════════════════════════════
   페르소나 스튜디오 — 사이드바 정식 메뉴 (빌더 승격판)
   좌측 = 튜닝 패널: 별명·자연어(AI 3안)·필드별 수동 칩 편집 + 저장 목록 관리
   우측 = 잠재고객 특성 라이브 프리뷰: 모수/선택률 · 연령×성별 분포 ·
          지역 TOP · 업종 TOP (/api/dashboard) · AI 라이프스타일
   정책: 생성자(userName) 상호 표기 — 수정/삭제는 본인(또는 admin)만.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { P, badge, tooltipStyle } from "@/lib/theme";
import {
  Sparkles, Wand2, Save, Loader2, Users, Target, Quote, Trash2,
  Pencil, CheckCircle2, UserRound, RotateCcw, MousePointerClick,
} from "lucide-react";
import { AGE_ORDER, AGE_LABEL, SIDO_LIST, PARTNER_MAP, fmt } from "@/lib/data";
import type { DmpUser } from "@/lib/auth";
import {
  type Persona, type PersonaFilters, EMPTY_FILTERS,
  segmentsToFilters, filtersToSegments, summarizeFilters,
  newPersonaId, pickTone, persistPersonaServer, deletePersonaServer, savePersonas,
} from "@/lib/persona";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const AMOUNT_OPTS = [
  { v: "under_5k", l: "~5천" }, { v: "5k_10k", l: "5천~1만" }, { v: "10k_30k", l: "1~3만" },
  { v: "30k_50k", l: "3~5만" }, { v: "50k_100k", l: "5~10만" }, { v: "100k_300k", l: "10~30만" }, { v: "over_300k", l: "30만~" },
];
const CARD_OPTS = ["KB", "NH", "NHPAY", "BC", "SH", "LOCA", "DLOCA", "OCB", "SKT", "SYRUP"];
const TELE_OPTS = [{ v: "K", l: "KT" }, { v: "T", l: "SKT" }, { v: "U", l: "LG U+" }, { v: "Z", l: "알뜰폰" }];
const SEX_OPTS = [{ v: "M", l: "남성" }, { v: "F", l: "여성" }];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: active ? 700 : 400,
      cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`,
      background: active ? P.glow : "transparent", color: active ? P.accent : P.sub,
      transition: "all .13s", userSelect: "none", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, letterSpacing: ".05em", width: 42, flexShrink: 0, paddingTop: 6 }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function PersonaStudio({
  user, personas, personaIds, onPersonasChange, onApply,
}: {
  user: DmpUser;
  personas: Persona[];
  personaIds: string[];
  onPersonasChange: (list: Persona[]) => void;
  onApply: (ids: string[], list?: Persona[]) => void;
}) {
  const isAdmin = user.role === "admin";

  /* ── 편집 상태 ── */
  const [editId, setEditId] = useState<string | null>(null);   // null = 신규
  const [name, setName] = useState("");
  const [f, setF] = useState<PersonaFilters>({ ...EMPTY_FILTERS });
  const [nl, setNl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [lifestyle, setLifestyle] = useState("");
  const [lifeLoading, setLifeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [err, setErr] = useState("");

  const toggleArr = (key: keyof PersonaFilters, v: string) =>
    setF(prev => ({ ...prev, [key]: prev[key].includes(v) ? prev[key].filter(x => x !== v) : [...prev[key], v] }));

  const anyFilter = Object.values(f).some(a => a.length > 0);
  const summary = useMemo(() => summarizeFilters(f), [f]);

  /* ── 업종 대분류 (기존 API) ── */
  const { data: catData } = useSWR("/api/categories", fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const majors: string[] = catData?.success ? catData.data.map((c: any) => c.major) : [];

  /* ── 라이브 프리뷰: 모수 (segment-preview, 400ms 디바운스) ── */
  const [preview, setPreview] = useState<{ estimated: number; total: number; selectivity: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fKey = JSON.stringify(f);
  useEffect(() => {
    if (!anyFilter) { setPreview(null); return; }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/segment-preview", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: filtersToSegments(f) }),
        });
        const d = await res.json();
        if (d.success) setPreview({ estimated: d.data.estimated_audience, total: d.data.total_audience, selectivity: d.data.selectivity });
      } catch {}
      finally { setPreviewLoading(false); }
    }, 400);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fKey]);

  /* ── 라이브 프리뷰: 특성 분포 (/api/dashboard — 데모그래픽 반영) ── */
  const demoQs = useMemo(() => {
    const p = new URLSearchParams();
    if (f.sidos.length) p.set("sido", f.sidos.join(","));
    if (f.sexes.length) p.set("sex", f.sexes.join(","));
    if (f.ages.length) p.set("age", f.ages.join(","));
    const qs = p.toString();
    return `/api/dashboard${qs ? "?" + qs : ""}`;
  }, [f.sidos, f.sexes, f.ages]);
  const { data: dashData, isLoading: dashLoading } = useSWR(demoQs, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true });
  const dash = dashData?.success ? dashData.data : null;

  const ageBar = useMemo(() => {
    if (!dash?.age_sex) return [];
    const map: Record<string, { a: string; 남성: number; 여성: number }> = {};
    (dash.age_sex as { a: string; x: string; u: number }[]).forEach(r => {
      if (!map[r.a]) map[r.a] = { a: r.a, 남성: 0, 여성: 0 };
      if (r.x === "M") map[r.a].남성 += r.u; else if (r.x === "F") map[r.a].여성 += r.u;
    });
    return AGE_ORDER.filter(k => k !== "unknown").map(k => ({ name: AGE_LABEL[k] || k, ...(map[k] || { 남성: 0, 여성: 0 }) }));
  }, [dash]);
  const regionTop = useMemo(() => (dash?.region || []).slice(0, 8) as { name: string; users: number }[], [dash]);
  const industryTop = useMemo(() =>
    ((dash?.industry || []) as { code: string; users: number }[])
      .slice(0, 8).map(r => ({ name: (PARTNER_MAP as any)[r.code] || r.code, users: r.users })), [dash]);
  const maxRegion = Math.max(1, ...regionTop.map(r => r.users));
  const maxInd = Math.max(1, ...industryTop.map(r => r.users));

  /* ── AI: 자연어 → 필터 3안 ── */
  const generate = async () => {
    if (!nl.trim() || aiLoading) return;
    setAiLoading(true); setErr(""); setAiRecs([]);
    try {
      const res = await fetch("/api/campaign-target", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign: nl }) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "AI 변환 실패");
      setAiAnalysis(d.analysis || ""); setAiRecs(d.recommendations || []);
      if (d.recommendations?.[0]) setF(segmentsToFilters(d.recommendations[0].segments));
    } catch (e: any) { setErr(e.message); }
    finally { setAiLoading(false); }
  };

  /* ── AI: 라이프스타일 기술 ── */
  const genLifestyle = async () => {
    if (!anyFilter || lifeLoading) return;
    setLifeLoading(true);
    try {
      const res = await fetch("/api/ai-recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: `[페르소나 정의] ${summary} — 이 조건에 해당하는 사람의 라이프스타일(소비 패턴·이동·관심사·하루 일과)을 페르소나 관점의 자연어 2~3문장으로 기술해줘. 데이터 근거 중심으로.`,
          segmentPreview: preview ? { estimated: preview.estimated, selectivity: (preview.selectivity * 100).toFixed(1) } : null,
          categories: industryTop.map(i => `${i.name}: ${fmt(i.users)}명`).join("\n"),
          ageGender: ageBar.map(a => `${a.name}: 남${fmt(a.남성)} 여${fmt(a.여성)}`).join("\n"),
          regions: regionTop.map(r => `${r.name}: ${fmt(r.users)}명`).join("\n"),
          amountBuckets: "",
        }),
      });
      const d = await res.json();
      if (d.success) setLifestyle(d.analysis || "");
    } catch {}
    finally { setLifeLoading(false); }
  };

  /* ── 저장 / 목록 관리 ── */
  const resetEditor = () => { setEditId(null); setName(""); setF({ ...EMPTY_FILTERS }); setNl(""); setAiRecs([]); setAiAnalysis(""); setLifestyle(""); setErr(""); };

  const canManage = (p: Persona) => isAdmin || p.userId == null || p.userId === user.id;

  const save = async (applyAfter: boolean) => {
    if (!anyFilter || saving) return;
    setSaving(true); setErr("");
    const existing = editId ? personas.find(x => x.id === editId) : null;
    const p: Persona = {
      id: editId || newPersonaId(),
      name: name.trim() || existing?.name || `페르소나 ${personas.length + 1}`,
      color: existing?.color || pickTone(personas.length),
      filters: f,
      filterSummary: summary,
      lifestyle: lifestyle || existing?.lifestyle || "",
      estimated: preview?.estimated ?? existing?.estimated,
      createdAt: existing?.createdAt || new Date().toISOString(),
      userId: existing?.userId ?? user.id,
      userName: existing?.userName || user.display_name,
    };
    const ok = await persistPersonaServer(p);
    if (!ok) { setErr("서버 저장 실패 — 권한 또는 네트워크를 확인하세요"); setSaving(false); return; }
    const next = editId ? personas.map(x => (x.id === editId ? p : x)) : [...personas, p];
    onPersonasChange(next); savePersonas(next);
    if (applyAfter) onApply(Array.from(new Set([...personaIds, p.id])), next);
    setSavedFlash(p.name); setTimeout(() => setSavedFlash(""), 2200);
    setSaving(false);
    if (!editId) resetEditor();
  };

  const loadForEdit = (p: Persona) => {
    setEditId(p.id); setName(p.name); setF({ ...EMPTY_FILTERS, ...p.filters });
    setLifestyle(p.lifestyle || ""); setNl(""); setAiRecs([]); setAiAnalysis(""); setErr("");
  };

  const remove = async (p: Persona) => {
    if (!canManage(p)) return;
    const next = personas.filter(x => x.id !== p.id);
    onPersonasChange(next); savePersonas(next);
    void deletePersonaServer(p.id);
    if (personaIds.includes(p.id)) onApply(personaIds.filter(x => x !== p.id), next);
    if (editId === p.id) resetEditor();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 12.5,
    border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", boxSizing: "border-box",
  };
  const panel: React.CSSProperties = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, boxShadow: P.shadowSoft };
  const panelHead = (Icon: any, text: string, color?: string) => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: P.text, marginBottom: 10 }}>
      <Icon size={14} strokeWidth={2.2} style={{ color: color || P.accent }} /> {text}
    </div>
  );

  return (
    <div style={{ padding: "18px 28px", display: "grid", gridTemplateColumns: "minmax(360px, 5fr) minmax(420px, 7fr)", gap: 16, alignItems: "start" }}>

      {/* ═══ 좌측 — 튜닝 패널 ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 저장된 페르소나 목록 */}
        <div style={{ ...panel, padding: 16 }}>
          {panelHead(Users, `저장된 페르소나 (${personas.length})`)}
          {personas.length === 0 ? (
            <div style={{ fontSize: 12, color: P.sub, padding: "6px 2px" }}>아직 없습니다 — 아래에서 첫 페르소나를 정의해 보세요.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {personas.map(p => {
                const applied = personaIds.includes(p.id);
                const mine = canManage(p);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 10, border: `1px solid ${editId === p.id ? P.accent : P.border}`, background: editId === p.id ? P.glow : "var(--card-2)" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: `var(--badge-${p.color}-fg)`, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: P.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                        {/* 정책: 생성자 상호 표기 */}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, color: P.sub, flexShrink: 0 }}>
                          <UserRound size={10} strokeWidth={2} /> {p.userName || "알 수 없음"}
                        </span>
                        {p.estimated != null && <span style={{ fontSize: 10, fontWeight: 700, color: P.accent, flexShrink: 0 }}>≈{fmt(p.estimated)}명</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: P.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.filterSummary}</div>
                    </div>
                    <button onClick={() => onApply(applied ? personaIds.filter(x => x !== p.id) : [...personaIds, p.id])}
                      title={applied ? "적용 해제" : "화면 필터로 적용"}
                      style={{ ...iconBtn(applied ? P.accent : P.sub), borderColor: applied ? P.accent : P.border }}>
                      <MousePointerClick size={13} strokeWidth={2.2} />
                    </button>
                    <button onClick={() => loadForEdit(p)} disabled={!mine} title={mine ? "불러와서 편집" : `소유자(${p.userName})만 편집 가능`}
                      style={{ ...iconBtn(P.sub), opacity: mine ? 1 : 0.35, cursor: mine ? "pointer" : "not-allowed" }}>
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => remove(p)} disabled={!mine} title={mine ? "삭제" : `소유자(${p.userName})만 삭제 가능`}
                      style={{ ...iconBtn("var(--danger)"), opacity: mine ? 1 : 0.35, cursor: mine ? "pointer" : "not-allowed" }}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 편집기 */}
        <div style={{ ...panel, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            {panelHead(Sparkles, editId ? "페르소나 편집" : "새 페르소나 정의")}
            {editId && (
              <button onClick={resetEditor} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: P.sub, background: "none", border: `1px solid ${P.border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer" }}>
                <RotateCcw size={11} strokeWidth={2} /> 신규로 전환
              </button>
            )}
          </div>

          <input value={name} onChange={e => setName(e.target.value)} placeholder="페르소나 별명 (예: 강남 뷰티 2030)" style={{ ...inputStyle, marginBottom: 8 }} />

          {/* 자연어 → AI */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={nl} onChange={e => setNl(e.target.value)} placeholder="자연어로 기술 → AI가 필터로 변환 (예: 수입차 관심 고소득 40대 남성)"
              style={inputStyle} onKeyDown={e => { if (e.key === "Enter" && nl.trim() && !aiLoading) generate(); }} />
            <button onClick={generate} disabled={!nl.trim() || aiLoading} style={{
              padding: "0 14px", borderRadius: 9, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
              cursor: aiLoading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, var(--male), var(--accent))", color: "#fff", border: "none",
              opacity: (!nl.trim() || aiLoading) ? .5 : 1,
            }}>
              {aiLoading ? <Loader2 size={13} className="dmp-spin" /> : <Wand2 size={13} strokeWidth={2.2} />} AI
            </button>
          </div>
          {aiAnalysis && <div style={{ fontSize: 11, color: P.sub, lineHeight: 1.55, padding: "7px 11px", background: P.bgElevated, borderRadius: 8, marginBottom: 8 }}>{aiAnalysis}</div>}
          {aiRecs.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: P.sub, lineHeight: 1.5, marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 5 }}>
                <MousePointerClick size={12} strokeWidth={2.2} style={{ color: "var(--badge-violet-fg)", flexShrink: 0, marginTop: 1 }} />
                <span>라벨칩을 클릭하면 <b style={{ color: P.text }}>페르소나 별명에 반영</b>되고 해당 필터가 적용됩니다. 이후 <b style={{ color: P.text }}>아래 필터를 직접 조정</b>해도 됩니다.</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {aiRecs.map((r, i) => (
                  <button key={i} onClick={() => { setF(segmentsToFilters(r.segments)); setName(r.label); }}
                    title={`${r.description || ""}\n클릭 시 별명 "${r.label}" 반영 + 필터 적용`}
                    style={{ ...badge("violet"), padding: "4px 11px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: "none" }}>
                    {r.label} {r.estimated_audience > 0 && `· ${fmt(r.estimated_audience)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 수동 필터 튜닝 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 4, borderTop: `1px dashed ${P.border}` }}>
            <Field label="성별">{SEX_OPTS.map(o => <Chip key={o.v} label={o.l} active={f.sexes.includes(o.v)} onClick={() => toggleArr("sexes", o.v)} />)}</Field>
            <Field label="연령">{AGE_ORDER.filter(a => a !== "unknown").map(a => <Chip key={a} label={AGE_LABEL[a]} active={f.ages.includes(a)} onClick={() => toggleArr("ages", a)} />)}</Field>
            <Field label="지역">{SIDO_LIST.map(s => <Chip key={s} label={s.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/도$/, "")} active={f.sidos.includes(s)} onClick={() => toggleArr("sidos", s)} />)}</Field>
            <Field label="업종">{(majors.length ? majors : ["유통", "식생활", "서비스", "의료/미용", "자동차", "여행", "교육", "의생활"]).map(m => <Chip key={m} label={m} active={f.majorCats.includes(m)} onClick={() => toggleArr("majorCats", m)} />)}</Field>
            <Field label="금액">{AMOUNT_OPTS.map(o => <Chip key={o.v} label={o.l} active={f.amountFilters.includes(o.v)} onClick={() => toggleArr("amountFilters", o.v)} />)}</Field>
            <Field label="카드사">{CARD_OPTS.map(c => <Chip key={c} label={c} active={f.cardCompanies.includes(c)} onClick={() => toggleArr("cardCompanies", c)} />)}</Field>
            <Field label="통신사">{TELE_OPTS.map(o => <Chip key={o.v} label={o.l} active={f.telecoms.includes(o.v)} onClick={() => toggleArr("telecoms", o.v)} />)}</Field>
          </div>

          {err && <div style={{ ...badge("danger"), padding: "7px 11px", borderRadius: 8, fontSize: 11.5, marginTop: 10 }}>{err}</div>}
          {savedFlash && (
            <div style={{ ...badge("success"), padding: "7px 11px", borderRadius: 8, fontSize: 11.5, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={13} strokeWidth={2.2} /> &quot;{savedFlash}&quot; 저장됨
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => save(false)} disabled={!anyFilter || saving} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: anyFilter ? "pointer" : "default",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "transparent", color: anyFilter ? P.accent : P.sub, border: `1px solid ${anyFilter ? P.accent : P.border}`,
              opacity: saving ? .6 : 1,
            }}>
              <Save size={14} strokeWidth={2.2} /> {editId ? "수정 저장" : "저장"}
            </button>
            <button onClick={() => save(true)} disabled={!anyFilter || saving} style={{
              flex: 1.4, padding: "10px 0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: anyFilter ? "pointer" : "default",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: anyFilter ? "linear-gradient(135deg, var(--male), var(--accent))" : P.border,
              color: anyFilter ? "#fff" : P.sub, border: "none", boxShadow: anyFilter ? P.shadowSoft : "none",
              opacity: saving ? .6 : 1,
            }}>
              {saving ? <Loader2 size={14} className="dmp-spin" /> : <MousePointerClick size={14} strokeWidth={2.2} />} 저장 후 화면에 적용
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 우측 — 잠재고객 특성 라이브 프리뷰 ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 모수 */}
        <div style={{ ...panel, padding: 16 }}>
          {panelHead(Target, "타겟 정의 · 예상 모수")}
          <div style={{ fontSize: 12, color: anyFilter ? P.text : P.sub, fontWeight: anyFilter ? 600 : 400, marginBottom: 10 }}>
            {anyFilter ? summary : "좌측에서 필터를 정의하면 실시간으로 갱신됩니다"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            {previewLoading ? (
              <span style={{ fontSize: 12, color: P.sub, display: "inline-flex", alignItems: "center", gap: 6 }}><Loader2 size={13} className="dmp-spin" /> 계산 중…</span>
            ) : preview ? (
              <>
                <span style={{ fontSize: 26, fontWeight: 900, color: P.accent, letterSpacing: "-0.02em" }}>{fmt(preview.estimated)}<span style={{ fontSize: 13, fontWeight: 500, color: P.sub, marginLeft: 3 }}>명</span></span>
                <span style={{ fontSize: 11, color: P.sub }}>전체 {fmt(preview.total)}명 중 <b style={{ color: P.text }}>{(preview.selectivity * 100).toFixed(1)}%</b></span>
              </>
            ) : <span style={{ fontSize: 13, color: P.sub }}>—</span>}
          </div>
          {preview && (
            <div style={{ marginTop: 9, height: 8, borderRadius: 5, background: P.bgElevated, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(1.2, Math.min(100, preview.selectivity * 100))}%`, borderRadius: 5, background: "linear-gradient(90deg, var(--male), var(--accent))", transition: "width .3s" }} />
            </div>
          )}
        </div>

        {/* 연령×성별 분포 */}
        <div style={{ ...panel, padding: 16 }}>
          {panelHead(Users, "연령 × 성별 분포 (데모그래픽 반영)")}
          {ageBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={ageBar} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} tickFormatter={v => fmt(Number(v))} width={44} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: P.text }} formatter={(v: any) => [fmt(Number(v)) + "명", ""]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="남성" fill="var(--male)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="여성" fill="var(--female)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ fontSize: 12, color: P.sub, padding: 20, textAlign: "center" }}>{dashLoading ? "로딩 중…" : "데이터 없음"}</div>}
        </div>

        {/* 지역 TOP + 업종 TOP */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ ...panel, padding: 16 }}>
            {panelHead(Target, "지역 TOP 8")}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {regionTop.map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: i < 3 ? P.accent : P.sub, fontWeight: 700, width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, color: P.text, width: 66, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/도$/, "")}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: P.bgElevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.users / maxRegion) * 100}%`, background: "var(--series-1)", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: P.sub, fontVariantNumeric: "tabular-nums", width: 48, textAlign: "right" }}>{fmt(r.users)}</span>
                </div>
              ))}
              {regionTop.length === 0 && <div style={{ fontSize: 11.5, color: P.sub, textAlign: "center", padding: 12 }}>—</div>}
            </div>
          </div>
          <div style={{ ...panel, padding: 16 }}>
            {panelHead(Target, "업종 TOP 8", "var(--series-2)")}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {industryTop.map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: i < 3 ? P.accent : P.sub, fontWeight: 700, width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, color: P.text, width: 84, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.name}>{r.name}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: P.bgElevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.users / maxInd) * 100}%`, background: "var(--series-2)", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: P.sub, fontVariantNumeric: "tabular-nums", width: 48, textAlign: "right" }}>{fmt(r.users)}</span>
                </div>
              ))}
              {industryTop.length === 0 && <div style={{ fontSize: 11.5, color: P.sub, textAlign: "center", padding: 12 }}>—</div>}
            </div>
          </div>
        </div>

        {/* AI 라이프스타일 */}
        <div style={{ ...panel, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            {panelHead(Quote, "라이프스타일 기술 (AI)", "var(--accent-2)")}
            <button onClick={genLifestyle} disabled={!anyFilter || lifeLoading} style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600,
              padding: "4px 12px", borderRadius: 999, cursor: anyFilter ? "pointer" : "default",
              background: "transparent", border: `1px solid ${anyFilter ? "var(--accent-2)" : P.border}`,
              color: anyFilter ? "var(--accent-2)" : P.sub, opacity: lifeLoading ? .6 : 1,
            }}>
              {lifeLoading ? <Loader2 size={12} className="dmp-spin" /> : <Wand2 size={12} strokeWidth={2.2} />} 생성
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: lifestyle ? P.text : P.sub, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {lifestyle || "필터를 정의한 뒤 '생성'을 누르면 이 페르소나의 라이프스타일을 자연어로 기술합니다."}
          </div>
        </div>
      </div>
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 26, height: 26, borderRadius: 7, cursor: "pointer", flexShrink: 0,
    background: "transparent", border: `1px solid ${P.border}`, color,
  };
}
