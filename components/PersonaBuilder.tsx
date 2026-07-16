"use client";

/* ══════════════════════════════════════════════════════════════════
   페르소나 빌더 — 자연어 → AI 필터정의 → 모수·성과 프리뷰 → 라이프스타일 기술 → 저장
   - NL→필터: 기존 /api/campaign-target 재사용 (3개 추천안 중 선택)
   - 모수: /api/segment-preview (예상 인원·선택률)
   - 라이프스타일: /api/ai-recommend (자연어 기술)
   - 저장 = localStorage 필터세트 (lib/persona.ts)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { P, badge } from "@/lib/theme";
import {
  X, Sparkles, Wand2, Save, Loader2, Users, Target, BarChart3, Quote,
} from "lucide-react";
import {
  type Persona, type PersonaFilters, segmentsToFilters, filtersToSegments,
  summarizeFilters, newPersonaId, pickTone,
} from "@/lib/persona";

interface Rec {
  label: string;
  description: string;
  segments: { seg: string; value: string | string[] }[];
  filter_summary: string;
  estimated_audience: number;
}

const FIELD_LABEL: [keyof PersonaFilters, string][] = [
  ["sexes", "성별"], ["ages", "연령"], ["sidos", "지역"],
  ["majorCats", "업종"], ["amountFilters", "금액구간"], ["cardCompanies", "카드사"], ["telecoms", "통신사"],
];

export function PersonaBuilder({
  onSave, onClose, existingCount, fmt,
}: {
  onSave: (p: Persona) => void;
  onClose: () => void;
  existingCount: number;
  fmt: (n: number) => string;
}) {
  const [name, setName] = useState("");
  const [nl, setNl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [recs, setRecs] = useState<Rec[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ estimated: number; total: number; selectivity: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lifestyle, setLifestyle] = useState("");
  const [lifeLoading, setLifeLoading] = useState(false);
  const [err, setErr] = useState("");

  const selFilters: PersonaFilters | null = sel !== null && recs[sel] ? segmentsToFilters(recs[sel].segments) : null;

  const generate = async () => {
    if (!nl.trim() || loading) return;
    setLoading(true); setErr(""); setRecs([]); setSel(null); setPreview(null); setLifestyle("");
    try {
      const res = await fetch("/api/campaign-target", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: nl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "AI 변환 실패");
      setAnalysis(data.analysis || "");
      setRecs(data.recommendations || []);
      if ((data.recommendations || []).length > 0) pick(0, data.recommendations);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const pick = async (i: number, list?: Rec[]) => {
    const rs = list || recs;
    setSel(i); setPreview(null); setLifestyle("");
    const rec = rs[i]; if (!rec) return;
    const f = segmentsToFilters(rec.segments);
    // ① 모수 프리뷰
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
    // ② 라이프스타일 기술 (AI)
    setLifeLoading(true);
    try {
      const res = await fetch("/api/ai-recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: `[페르소나 정의] ${rec.filter_summary} — 이 조건에 해당하는 사람의 라이프스타일(소비 패턴·이동·관심사·하루 일과)을 페르소나 관점의 자연어 2~3문장으로 기술해줘. 데이터 근거 중심으로.`,
          segmentPreview: null, categories: "", ageGender: "", regions: "", amountBuckets: "",
        }),
      });
      const d = await res.json();
      if (d.success) setLifestyle(d.analysis || "");
    } catch {}
    finally { setLifeLoading(false); }
  };

  const save = () => {
    if (sel === null || !selFilters) return;
    const rec = recs[sel];
    const p: Persona = {
      id: newPersonaId(),
      name: name.trim() || rec.label || `페르소나 ${existingCount + 1}`,
      color: pickTone(existingCount),
      filters: selFilters,
      filterSummary: summarizeFilters(selFilters),
      lifestyle: lifestyle || rec.description,
      estimated: preview?.estimated ?? rec.estimated_audience,
      createdAt: new Date().toISOString(),
    };
    onSave(p);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 9, fontSize: 13,
    border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--scrim)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 20 }} onClick={onClose}>
      <div className="dmp-pop" onClick={e => e.stopPropagation()} style={{ width: 860, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto", background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, boxShadow: P.shadowLg, padding: 24 }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, margin: 0, color: P.text }}>
            <Sparkles size={17} strokeWidth={2.2} style={{ color: P.accent }} /> 페르소나 빌더
            <span style={{ fontSize: 11, fontWeight: 500, color: P.sub }}>자연어로 기술 → AI가 필터속성으로 정의 → 저장(필터세트)</span>
          </h3>
          <button onClick={onClose} title="닫기" style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, border: `1px solid ${P.border}`, background: "transparent", color: P.sub, cursor: "pointer" }}><X size={15} /></button>
        </div>

        {/* 별명 + 자연어 기술 */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", gap: 8, marginBottom: 14 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="페르소나 별명 (예: 강남 뷰티 2030)" style={inputStyle} />
          <input value={nl} onChange={e => setNl(e.target.value)} placeholder="예: 수입차에 관심 많은 고소득 40대 남성, 주말엔 골프장과 프리미엄 마트를 다니는 사람" style={inputStyle}
            onKeyDown={e => { if (e.key === "Enter" && nl.trim() && !loading) generate(); }} />
          <button onClick={generate} disabled={!nl.trim() || loading} style={{ padding: "0 18px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: loading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, var(--male), var(--accent))", color: "#fff", border: "none", opacity: (!nl.trim() || loading) ? .5 : 1, whiteSpace: "nowrap" }}>
            {loading ? <Loader2 size={14} className="dmp-spin" /> : <Wand2 size={14} strokeWidth={2.2} />} AI 정의 생성
          </button>
        </div>

        {err && <div style={{ ...badge("danger"), padding: "8px 12px", borderRadius: 9, fontSize: 12, marginBottom: 12 }}>{err}</div>}
        {analysis && <div style={{ fontSize: 12, color: P.sub, lineHeight: 1.6, padding: "9px 13px", background: P.bgElevated, borderRadius: 9, marginBottom: 12 }}>{analysis}</div>}

        {/* 추천안 3택 */}
        {recs.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(recs.length, 3)}, 1fr)`, gap: 10, marginBottom: 14 }}>
            {recs.map((r, i) => {
              const active = sel === i;
              return (
                <button key={i} onClick={() => pick(i)} style={{ textAlign: "left", padding: 13, borderRadius: 11, cursor: "pointer", border: `2px solid ${active ? P.accent : P.border}`, background: active ? P.glow : P.card, transition: "all .13s" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? P.accent : P.text, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: P.sub, marginBottom: 6, lineHeight: 1.5 }}>{r.description}</div>
                  <div style={{ fontSize: 11, color: P.text, fontWeight: 600 }}>{r.filter_summary}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P.accent, marginTop: 6 }}>{r.estimated_audience > 0 ? fmt(r.estimated_audience) + "명" : "—"}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* 선택된 정의: 필터 그리드 + 모수/성과 + 라이프스타일 */}
        {selFilters && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* 필터속성 정의 (데이터 관점) */}
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 11, padding: 14, background: "var(--card-2)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: P.text, marginBottom: 10 }}>
                <Target size={13} strokeWidth={2.2} style={{ color: P.accent }} /> 필터속성 정의
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FIELD_LABEL.map(([k, label]) => {
                  const vals = selFilters[k];
                  if (!vals.length) return null;
                  return (
                    <div key={k} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: P.sub, width: 52, flexShrink: 0 }}>{label}</span>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {vals.map(v => <span key={v} style={{ ...badge("teal"), padding: "2px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 600 }}>{v}</span>)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* 모수 바 */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <Users size={13} strokeWidth={2} style={{ color: P.accent }} />
                  {previewLoading ? <span style={{ fontSize: 11, color: P.sub }}>모수 계산 중…</span> : preview ? (
                    <>
                      <span style={{ fontSize: 17, fontWeight: 800, color: P.accent }}>{fmt(preview.estimated)}명</span>
                      <span style={{ fontSize: 10.5, color: P.sub }}>전체 {fmt(preview.total)}명 중 {(preview.selectivity * 100).toFixed(1)}%</span>
                    </>
                  ) : <span style={{ fontSize: 11, color: P.sub }}>—</span>}
                </div>
                {preview && (
                  <div style={{ marginTop: 6, height: 7, borderRadius: 4, background: P.bgElevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(1.2, Math.min(100, preview.selectivity * 100))}%`, borderRadius: 4, background: "linear-gradient(90deg, var(--male), var(--accent))" }} />
                  </div>
                )}
              </div>
            </div>

            {/* 라이프스타일 기술 (자연어) */}
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 11, padding: 14, background: "var(--card-2)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: P.text, marginBottom: 10 }}>
                <Quote size={13} strokeWidth={2.2} style={{ color: "var(--accent-2)" }} /> 라이프스타일 기술 (AI)
              </div>
              {lifeLoading ? (
                <div style={{ fontSize: 12, color: P.sub, display: "inline-flex", alignItems: "center", gap: 7 }}><Loader2 size={13} className="dmp-spin" /> 페르소나 기술 생성 중…</div>
              ) : (
                <div style={{ fontSize: 12.5, color: P.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {lifestyle || recs[sel!]?.description || "—"}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 10, color: P.sub2, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <BarChart3 size={11} strokeWidth={2} /> 상세 성과는 저장 후 소비 트렌드·쇼핑상품·카드사 비교 화면에서 이 페르소나로 브라우징하세요.
              </div>
            </div>
          </div>
        )}

        {/* 액션 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "transparent", color: P.sub, border: `1px solid ${P.border}` }}>취소</button>
          <button onClick={save} disabled={sel === null} style={{ padding: "9px 20px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: sel === null ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, background: sel === null ? P.border : "linear-gradient(135deg, var(--male), var(--accent))", color: sel === null ? P.sub : "#fff", border: "none", boxShadow: sel === null ? "none" : P.shadowSoft }}>
            <Save size={14} strokeWidth={2.2} /> 페르소나 저장
          </button>
        </div>
      </div>
    </div>
  );
}
