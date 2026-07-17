"use client";

/* ══════════════════════════════════════════════════════════════════
   생성된 오디언스 (통합 허브) — 3·추출·전송 그룹
   두 소스를 한 곳에서 관리:
     ① 카트 확정본 (필터/페르소나 묶음, de_dmp_audience_carts)
     ② AI 생성본  (퀵 AI 오디언스 생성 = 구 AI탐색의 BQ 오디언스 테이블)
   기능: 타겟명·라벨·태그·메모·생성자 리스팅 / 라벨 드롭다운(내부 검색)·태그·
        상태·소스·생성자 필터 / 검색 / 페이징 / 송출 · 복제 · 병합 · 삭제 · 편집.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useRef } from "react";
import { P, badge, cardStyle } from "@/lib/theme";
import { fmt } from "@/lib/data";
import {
  useCart, deleteBundle, loadBundle, updateBundleMeta, duplicateBundle, mergeBundles,
  addToCart, runcommSubmit, allLabels, allTags,
  type CartRow, type CartItem, type SubmitResult,
} from "@/lib/cart";
import { BundleMetaFields, LabelChip, TagChips, type MetaValue } from "./BundleMetaFields";
import type { DmpUser } from "@/lib/auth";
import {
  Boxes, Search, Tag as TagIcon, FolderOpen, Trash2, Pencil, Check, X,
  StickyNote, ChevronDown, Rocket, FlaskConical, Copy, GitMerge, ShoppingCart,
  UserRound, Bot, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";

const PAGE_SIZE = 10;
const ALL = "__all__";

/* 통합 행 모델 */
interface URow {
  key: string;
  source: "cart" | "ai";
  id: string;
  name: string;
  label: string | null;
  tags: string[];
  memo: string | null;
  status: string;          // saved | submitted | 생성됨
  estimated: number;
  creator: string;
  date: string;
  items: CartItem[];       // 송출 단위(cart=조각들, ai=단일 bq)
  raw?: CartRow;
}

export default function TargetAudienceTab({ user }: { user: DmpUser }) {
  const { cart, saved } = useCart(user.id);

  /* ── AI 생성본 로드 (퀵 AI 오디언스 생성 이력 중 테이블 생성 완료분) ── */
  const [aiRows, setAiRows] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/ai-explore", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }),
        });
        const d = await res.json();
        if (alive) setAiRows((d.requests || []).filter((h: any) => h.result_table));
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, []);

  /* ── 통합 행 ── */
  const rows: URow[] = useMemo(() => {
    const cartRows: URow[] = saved
      .filter(r => r.status === "saved" || r.status === "submitted")
      .map(r => ({
        key: "c_" + r.id, source: "cart", id: r.id, name: r.name || "(이름 없음)",
        label: r.label ?? null, tags: r.tags || [], memo: r.memo ?? null, status: r.status,
        estimated: (r.items || []).reduce((a, i) => a + (i.estimated || 0), 0),
        creator: r.user_name || "—", date: (r.updated_at || "").slice(0, 10), items: r.items || [], raw: r,
      }));
    const ai: URow[] = aiRows.map(h => ({
      key: "a_" + h.id, source: "ai", id: String(h.id), name: h.query_text || h.result_table || "AI 오디언스",
      label: null, tags: [], memo: null, status: "생성됨",
      estimated: Number(h.est_rows || 0),
      creator: h.created_by || h.user_name || "AI 생성", date: (h.created_at || "").slice(0, 10),
      items: [{ id: "ci_" + h.id, type: "ai_table", label: h.query_text || h.result_table, summary: h.result_table, sourceTab: "ai", filters: {}, bqTable: h.result_table, estimated: Number(h.est_rows || 0), addedAt: "" }],
    }));
    return [...cartRows, ...ai];
  }, [saved, aiRows]);

  /* ── 필터 상태 ── */
  const [source, setSource] = useState<"all" | "cart" | "ai">("all");
  const [labelSel, setLabelSel] = useState<string>(ALL);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [statusSel, setStatusSel] = useState<"all" | "saved" | "submitted" | "생성됨">("all");
  const [creatorSel, setCreatorSel] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const labels = useMemo(() => Array.from(new Set(rows.map(r => r.label).filter(Boolean) as string[])).sort(), [rows]);
  const tagUniverse = useMemo(() => Array.from(new Set(rows.flatMap(r => r.tags))).sort(), [rows]);
  const creators = useMemo(() => Array.from(new Set(rows.map(r => r.creator).filter(c => c && c !== "—"))).sort(), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (source !== "all") r = r.filter(x => x.source === source);
    if (labelSel !== ALL) r = r.filter(x => (x.label || "") === labelSel);
    if (statusSel !== "all") r = r.filter(x => x.status === statusSel);
    if (creatorSel !== ALL) r = r.filter(x => x.creator === creatorSel);
    if (tagFilter.length) r = r.filter(x => tagFilter.every(t => x.tags.includes(t)));
    const t = q.trim().toLowerCase();
    if (t) r = r.filter(x =>
      x.name.toLowerCase().includes(t) || (x.label || "").toLowerCase().includes(t) ||
      (x.memo || "").toLowerCase().includes(t) || x.tags.some(g => g.toLowerCase().includes(t)) ||
      x.creator.toLowerCase().includes(t));
    return r;
  }, [rows, source, labelSel, statusSel, creatorSel, tagFilter, q]);

  useEffect(() => { setPage(1); }, [source, labelSel, statusSel, creatorSel, tagFilter, q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── 선택(병합/일괄삭제) ── */
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggleSel = (key: string) => setSel(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selCartRows = useMemo(() => rows.filter(r => sel.has(r.key) && r.source === "cart"), [rows, sel]);

  /* ── 편집 ── */
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<MetaValue & { name: string }>({ name: "", label: "", tags: [], memo: "" });
  const canManage = (r: URow) => user.role === "admin" || r.raw?.user_id == null || r.raw?.user_id === user.id;
  const startEdit = (r: URow) => { setEditing(r.id); setEditVal({ name: r.name, label: r.label || "", tags: r.tags, memo: r.memo || "" }); };
  const saveEdit = async () => { if (editing) { await updateBundleMeta(editing, editVal); setEditing(null); } };

  /* ── 송출 모달 ── */
  const [send, setSend] = useState<{ items: CartItem[]; name: string } | null>(null);
  const [sendState, setSendState] = useState<{ phase: "form" | "sending" | "done"; env?: string; done?: number; total?: number; results?: SubmitResult[] }>({ phase: "form" });
  const runSend = async (env: "dev" | "prod") => {
    if (!send) return;
    setSendState({ phase: "sending", env, done: 0, total: send.items.length, results: [] });
    const results = await runcommSubmit(send.items, send.name.trim() || "타겟", env, (d, t, rs) => setSendState({ phase: "sending", env, done: d, total: t, results: rs }));
    setSendState({ phase: "done", env, done: send.items.length, total: send.items.length, results });
  };

  /* ── 병합 모달 ── */
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeName, setMergeName] = useState("");
  const doMerge = async () => {
    const ok = await mergeBundles(selCartRows.map(r => r.id), mergeName);
    if (ok) { setMergeOpen(false); setMergeName(""); setSel(new Set()); }
  };

  const addAiToCart = (r: URow) => {
    const it = r.items[0];
    addToCart({ type: "ai_table", label: it.label, summary: it.summary || "", sourceTab: "ai", filters: {}, bqTable: it.bqTable, estimated: it.estimated ?? null });
  };

  return (
    <div style={{ padding: "22px 28px 48px", background: P.bg, minHeight: 600 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>
          <Boxes size={17} strokeWidth={2} style={{ verticalAlign: "-3px", marginRight: 7, color: P.accent }} />생성된 오디언스
        </div>
        <div style={{ fontSize: 12, color: P.sub, marginTop: 3 }}>
          카트로 확정한 타겟과 <b style={{ color: P.text }}>퀵 AI 오디언스 생성</b>본을 한 곳에서 관리·송출합니다. 라벨(캠페인·고객)·태그·메모·생성자로 정리하세요.
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* 소스 */}
          {([["all", `전체 ${rows.length}`], ["cart", "카트 확정본"], ["ai", "AI 생성본"]] as [typeof source, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setSource(id)} style={chipBtn(source === id)}>{label}</button>
          ))}
          <span style={{ width: 1, height: 18, background: P.border }} />
          {/* 라벨 드롭다운 (내부 검색) */}
          <LabelDropdown labels={labels} value={labelSel} onChange={setLabelSel} rows={rows} />
          {/* 상태 */}
          <select value={statusSel} onChange={e => setStatusSel(e.target.value as any)} style={selectStyle()}>
            <option value="all">상태 전체</option>
            <option value="saved">저장됨</option>
            <option value="submitted">송출됨</option>
            <option value="생성됨">AI 생성됨</option>
          </select>
          {/* 생성자 */}
          <select value={creatorSel} onChange={e => setCreatorSel(e.target.value)} style={selectStyle()}>
            <option value={ALL}>생성자 전체</option>
            {creators.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <Search size={13} strokeWidth={2} style={{ position: "absolute", left: 9, top: 8, color: P.sub }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="이름·라벨·태그·메모·생성자"
              style={{ padding: "6px 10px 6px 27px", fontSize: 11.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, width: 210, outline: "none" }} />
          </div>
        </div>
        {/* 태그 필터 */}
        {tagUniverse.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: P.sub, display: "inline-flex", alignItems: "center", gap: 4 }}><TagIcon size={11} strokeWidth={2.4} />태그</span>
            {tagUniverse.map(t => (
              <button key={t} onClick={() => setTagFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, cursor: "pointer", border: `1px solid ${tagFilter.includes(t) ? P.accent : P.border}`, background: tagFilter.includes(t) ? P.glow : "transparent", color: tagFilter.includes(t) ? P.accent : P.sub }}>#{t}</button>
            ))}
            {tagFilter.length > 0 && <button onClick={() => setTagFilter([])} style={{ fontSize: 10, color: P.sub2, background: "none", border: "none", cursor: "pointer" }}>× 해제</button>}
          </div>
        )}
      </div>

      {/* 선택 액션 바 */}
      {sel.size > 0 && (
        <div style={{ ...cardStyle, padding: "9px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, background: P.glow, borderColor: P.accent }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>{sel.size}개 선택</span>
          <button onClick={() => { setMergeName(""); setMergeOpen(true); }} disabled={selCartRows.length < 2} style={{ ...ghostBtn(), opacity: selCartRows.length < 2 ? .4 : 1 }} title={selCartRows.length < 2 ? "카트 확정본 2개 이상 선택 시 병합 가능" : "선택 묶음 병합"}>
            <GitMerge size={12} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />병합 ({selCartRows.length})
          </button>
          <button onClick={async () => { if (confirm(`선택한 ${selCartRows.length}개 카트 확정본을 삭제할까요? (AI 생성본 제외)`)) { for (const r of selCartRows) await deleteBundle(r.id); setSel(new Set()); } }} disabled={selCartRows.length === 0} style={{ ...ghostBtn(), color: P.danger, borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)", opacity: selCartRows.length === 0 ? .4 : 1 }}>
            <Trash2 size={12} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />일괄 삭제
          </button>
          <button onClick={() => setSel(new Set())} style={{ ...ghostBtn(), marginLeft: "auto" }}>선택 해제</button>
        </div>
      )}

      {/* 빈 상태 */}
      {rows.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px 20px", color: P.sub }}>
          <Boxes size={36} strokeWidth={1.3} style={{ opacity: .5, marginBottom: 12 }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, color: P.text, marginBottom: 4 }}>아직 생성된 오디언스가 없습니다</div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>오디언스 카트(🛒)에서 조각을 담아 <b>확정</b>하거나, <b>퀵 AI 오디언스 생성</b>으로 오디언스를 만들면 여기에 모입니다.</div>
        </div>
      )}
      {rows.length > 0 && filtered.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "36px 20px", color: P.sub, fontSize: 12.5 }}>조건에 맞는 오디언스가 없습니다.</div>
      )}

      {/* 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pageRows.map(r => {
          const isEdit = editing === r.id && r.source === "cart";
          return (
            <div key={r.key} style={{ ...cardStyle, padding: 0, overflow: "hidden", borderColor: sel.has(r.key) ? P.accent : P.border }}>
              {isEdit ? (
                <div style={{ padding: "14px 16px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: P.sub, display: "block", marginBottom: 4 }}>타겟명</label>
                  <input value={editVal.name} onChange={e => setEditVal(v => ({ ...v, name: e.target.value.slice(0, 80) }))}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none", marginBottom: 10 }} />
                  <BundleMetaFields value={editVal} onChange={v => setEditVal(vv => ({ ...vv, ...v }))} labelSuggestions={allLabels()} tagSuggestions={allTags()} compact />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={saveEdit} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: P.accent, color: "#fff", border: "none" }}><Check size={13} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 4 }} />저장</button>
                    <button onClick={() => setEditing(null)} style={ghostBtn({ flex: 1, padding: "8px 0", textAlign: "center" })}>취소</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  {/* 선택 체크 (카트 확정본만) */}
                  <div style={{ display: "flex", alignItems: "center", padding: "0 4px 0 12px" }}>
                    {r.source === "cart" ? (
                      <input type="checkbox" checked={sel.has(r.key)} onChange={() => toggleSel(r.key)} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "var(--accent)" }} />
                    ) : <span style={{ width: 15 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, padding: "12px 15px 12px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ ...badge(r.source === "ai" ? "sky" : "teal"), fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        {r.source === "ai" ? <><Bot size={9} strokeWidth={2.4} />AI 생성본</> : <><SlidersHorizontal size={9} strokeWidth={2.4} />카트 확정본</>}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }} title={r.name}>{r.name}</span>
                      {r.label && <LabelChip label={r.label} />}
                      <span style={{ ...badge(r.status === "submitted" ? "success" : r.status === "생성됨" ? "sky" : "neutral"), fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 5 }}>{r.status === "submitted" ? "송출됨" : r.status === "생성됨" ? "생성됨" : "저장됨"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: P.sub, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{r.source === "cart" ? `${r.items.length}조각` : "BQ 테이블"} · 예상 ~{fmt(r.estimated)}명</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><UserRound size={10} strokeWidth={2} />{r.creator}</span>
                      <span>{r.date}</span>
                    </div>
                    {r.tags.length > 0 && <div style={{ marginTop: 7 }}><TagChips tags={r.tags} onClick={t => setTagFilter(f => f.includes(t) ? f : [...f, t])} /></div>}
                    {r.memo && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: P.sub, background: P.bgElevated, border: `1px solid ${P.border}`, borderRadius: 8, padding: "7px 10px", lineHeight: 1.5, display: "flex", gap: 6 }}>
                        <StickyNote size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: P.sub2 }} />
                        <span style={{ whiteSpace: "pre-wrap" }}>{r.memo}</span>
                      </div>
                    )}
                  </div>
                  {/* 액션 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "12px 14px", borderLeft: `1px solid ${P.border}`, background: P.bgElevated, justifyContent: "center", minWidth: 132 }}>
                    <button onClick={() => { setSend({ items: r.items, name: r.name }); setSendState({ phase: "form" }); }} style={{ ...actBtn(), background: "linear-gradient(135deg, var(--male), var(--accent))", color: "#fff", border: "none" }}>
                      <Rocket size={11} strokeWidth={2.2} style={{ verticalAlign: "-1px", marginRight: 4 }} />송출
                    </button>
                    {r.source === "cart" ? (
                      <>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => loadBundle(r.id)} style={actBtn({ flex: 1 })} title="카트로 불러오기"><FolderOpen size={11} strokeWidth={2} /></button>
                          <button onClick={() => duplicateBundle(r.id)} style={actBtn({ flex: 1 })} title="복제"><Copy size={11} strokeWidth={2} /></button>
                          <button onClick={() => canManage(r) && startEdit(r)} style={{ ...actBtn({ flex: 1 }), opacity: canManage(r) ? 1 : .35 }} title={canManage(r) ? "라벨·태그·메모 편집" : "생성자만 편집"}><Pencil size={11} strokeWidth={2} /></button>
                        </div>
                        <button onClick={() => { if (canManage(r) && confirm(`"${r.name}" 삭제?`)) deleteBundle(r.id); }} style={{ ...actBtn(), color: P.danger, borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)", opacity: canManage(r) ? 1 : .35 }} title={canManage(r) ? "삭제" : "생성자만 삭제"}>
                          <Trash2 size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />삭제
                        </button>
                      </>
                    ) : (
                      <button onClick={() => addAiToCart(r)} style={actBtn()} title="오디언스 카트에 담아 다른 조각과 함께 묶기">
                        <ShoppingCart size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />카트에 담기
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 페이징 */}
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 18 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...ghostBtn(), opacity: page === 1 ? .4 : 1 }}><ChevronLeft size={13} strokeWidth={2.2} /></button>
          <span style={{ fontSize: 12, color: P.sub, fontVariantNumeric: "tabular-nums" }}>{page} / {totalPages} <span style={{ color: P.sub2 }}>({filtered.length}건)</span></span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...ghostBtn(), opacity: page === totalPages ? .4 : 1 }}><ChevronRight size={13} strokeWidth={2.2} /></button>
        </div>
      )}

      {/* ── 송출 모달 ── */}
      {send && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, #000 40%, transparent)" }} onClick={() => sendState.phase !== "sending" && setSend(null)}>
          <div style={{ ...cardStyle, width: 420, maxWidth: "92vw", padding: "18px 20px" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: P.text, marginBottom: 4 }}><Rocket size={15} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />런컴 타겟 송출</div>
            {sendState.phase === "form" && (
              <>
                <div style={{ fontSize: 11.5, color: P.sub, marginBottom: 12 }}>{send.items.length}개 조각 → 런컴 타겟 {send.items.length}개 생성{send.items.length > 1 ? ` ("#n/${send.items.length}")` : ""}</div>
                <label style={{ fontSize: 10, fontWeight: 700, color: P.sub, display: "block", marginBottom: 4 }}>세그먼트명</label>
                <input value={send.name} onChange={e => setSend({ ...send, name: e.target.value.slice(0, 80) })}
                  style={{ width: "100%", padding: "8px 11px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none", marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSend(null)} style={ghostBtn({ flex: 1, padding: "9px 0", textAlign: "center" })}>취소</button>
                  <button onClick={() => runSend("dev")} disabled={!send.name.trim()} style={{ ...ghostBtn({ flex: 1, padding: "9px 0", textAlign: "center" }), color: P.f, borderColor: "color-mix(in srgb, var(--female) 30%, transparent)", opacity: send.name.trim() ? 1 : .5 }}><FlaskConical size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />개발</button>
                  <button onClick={() => runSend("prod")} disabled={!send.name.trim()} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, var(--male), var(--accent))", color: "#fff", border: "none", opacity: send.name.trim() ? 1 : .5 }}><Rocket size={11} strokeWidth={2.2} style={{ verticalAlign: "-1px", marginRight: 4 }} />상용</button>
                </div>
              </>
            )}
            {sendState.phase !== "form" && (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: P.text, margin: "8px 0 10px" }}>
                  {sendState.phase === "sending" ? <><Loader2 size={13} className="dmp-spin" style={{ verticalAlign: "-2px", marginRight: 5 }} />송출 중… {sendState.done}/{sendState.total}</> : "송출 결과"}
                  <span style={{ ...badge(sendState.env === "prod" ? "danger" : "info"), fontSize: 9.5, padding: "2px 7px", borderRadius: 6, marginLeft: 8 }}>{sendState.env === "prod" ? "상용" : "개발"}</span>
                </div>
                {(sendState.results || []).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, padding: "3px 0", color: r.ok ? P.text : P.danger }}>
                    <span>{r.ok ? "✓" : "✕"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.ok ? `${fmt(r.count || 0)}명` : (r.error || "").slice(0, 26)}</span>
                  </div>
                ))}
                {sendState.phase === "done" && <button onClick={() => setSend(null)} style={{ marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: P.accent, color: "#fff", border: "none" }}>확인</button>}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 병합 모달 ── */}
      {mergeOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, #000 40%, transparent)" }} onClick={() => setMergeOpen(false)}>
          <div style={{ ...cardStyle, width: 380, maxWidth: "92vw", padding: "18px 20px" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: P.text, marginBottom: 4 }}><GitMerge size={15} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />묶음 병합</div>
            <div style={{ fontSize: 11.5, color: P.sub, marginBottom: 12 }}>{selCartRows.length}개 확정본의 조각을 합집합(중복 제거)으로 새 타겟에 담습니다.</div>
            <input value={mergeName} onChange={e => setMergeName(e.target.value.slice(0, 80))} placeholder="병합 타겟 이름"
              style={{ width: "100%", padding: "8px 11px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMergeOpen(false)} style={ghostBtn({ flex: 1, padding: "9px 0", textAlign: "center" })}>취소</button>
              <button onClick={doMerge} disabled={!mergeName.trim()} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: P.accent, color: "#fff", border: "none", opacity: mergeName.trim() ? 1 : .5 }}>병합 생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 라벨 드롭다운 — 존재하는 라벨 목록 + 내부 검색 */
function LabelDropdown({ labels, value, onChange, rows }: { labels: string[]; value: string; onChange: (v: string) => void; rows: URow[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const countOf = (lb: string) => rows.filter(r => (r.label || "") === lb).length;
  const noLabelCount = rows.filter(r => !r.label).length;
  const shown = labels.filter(l => l.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = value === ALL ? "전체 라벨" : value === "__none__" ? "라벨 없음" : value;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ ...selectStyle(), display: "inline-flex", alignItems: "center", gap: 6, minWidth: 130 }}>
        <TagIcon size={11} strokeWidth={2.2} style={{ color: value === ALL ? P.sub : P.accent }} />
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value === ALL ? P.sub : P.text, fontWeight: value === ALL ? 500 : 700 }}>{cur}</span>
        <ChevronDown size={12} strokeWidth={2.4} style={{ opacity: .6, marginLeft: "auto" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 5, zIndex: 60, width: 230, background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, boxShadow: P.shadowLg, padding: 6 }}>
          <div style={{ position: "relative", marginBottom: 5 }}>
            <Search size={12} strokeWidth={2} style={{ position: "absolute", left: 8, top: 7, color: P.sub }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="라벨 검색 (캠페인·고객)"
              style={{ width: "100%", padding: "5px 8px 5px 26px", fontSize: 11.5, borderRadius: 7, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none" }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            <DropItem label={`전체 라벨`} count={rows.length} active={value === ALL} onClick={() => { onChange(ALL); setOpen(false); }} />
            {noLabelCount > 0 && <DropItem label="라벨 없음" count={noLabelCount} active={value === "__none__"} onClick={() => { onChange("__none__"); setOpen(false); }} dim />}
            {shown.map(l => <DropItem key={l} label={l} count={countOf(l)} active={value === l} onClick={() => { onChange(l); setOpen(false); }} />)}
            {shown.length === 0 && <div style={{ fontSize: 11, color: P.sub2, padding: "8px 6px", textAlign: "center" }}>일치하는 라벨 없음</div>}
          </div>
        </div>
      )}
    </div>
  );
}
function DropItem({ label, count, active, onClick, dim }: { label: string; count: number; active: boolean; onClick: () => void; dim?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer", textAlign: "left", background: active ? P.glow : "transparent", color: active ? P.accent : (dim ? P.sub2 : P.text), fontSize: 12, fontWeight: active ? 700 : 500 }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = P.bgElevated; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 10, color: P.sub2, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </button>
  );
}

function chipBtn(active: boolean): React.CSSProperties {
  return { padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`, background: active ? P.glow : P.bg, color: active ? P.accent : P.sub };
}
function selectStyle(): React.CSSProperties {
  return { padding: "6px 9px", borderRadius: 8, fontSize: 11.5, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", cursor: "pointer" };
}
function ghostBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: "5px 10px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.sub, ...extra };
}
function actBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: "6px 8px", borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.sub, display: "inline-flex", alignItems: "center", justifyContent: "center", ...extra };
}
