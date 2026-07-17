"use client";

/* ══════════════════════════════════════════════════════════════════
   타겟 오디언스 관리 — 저장/송출된 타겟 묶음을 용도·시즌·고객별로 관리.
   - 분류 라벨로 그룹핑 · 속성 태그로 필터 · 메모 함께 리스팅.
   - 라벨/태그/메모 편집, 카트로 불러오기, 삭제.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { P, badge, cardStyle } from "@/lib/theme";
import { fmt } from "@/lib/data";
import {
  useCart, deleteBundle, loadBundle, updateBundleMeta, allLabels, allTags,
  type CartRow,
} from "@/lib/cart";
import { BundleMetaFields, LabelChip, TagChips, type MetaValue } from "./BundleMetaFields";
import {
  Boxes, Search, Tag as TagIcon, FolderOpen, Trash2, Pencil, Check, X,
  Send, Save as SaveIcon, StickyNote, ChevronDown,
} from "lucide-react";

const NO_LABEL = "__none__";

export default function TargetAudienceTab({ userId }: { userId?: number }) {
  const { cart, saved } = useCart(userId);
  const bundles = useMemo(() => saved.filter(r => r.status === "saved" || r.status === "submitted"), [saved]);

  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "saved" | "submitted">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<MetaValue & { name: string }>({ name: "", label: "", tags: [], memo: "" });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const tagUniverse = allTags();

  const filtered = useMemo(() => {
    let r = bundles;
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (tagFilter.length) r = r.filter(b => tagFilter.every(t => (b.tags || []).includes(t)));
    const t = q.trim().toLowerCase();
    if (t) r = r.filter(b =>
      (b.name || "").toLowerCase().includes(t) ||
      (b.label || "").toLowerCase().includes(t) ||
      (b.memo || "").toLowerCase().includes(t) ||
      (b.tags || []).some(x => x.toLowerCase().includes(t)));
    return r;
  }, [bundles, statusFilter, tagFilter, q]);

  // 라벨별 그룹핑
  const groups = useMemo(() => {
    const m = new Map<string, CartRow[]>();
    for (const b of filtered) {
      const key = b.label || NO_LABEL;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === NO_LABEL) return 1;
      if (b[0] === NO_LABEL) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const startEdit = (b: CartRow) => {
    setEditing(b.id);
    setEditVal({ name: b.name || "", label: b.label || "", tags: b.tags || [], memo: b.memo || "" });
  };
  const saveEdit = async () => {
    if (!editing) return;
    await updateBundleMeta(editing, editVal);
    setEditing(null);
  };

  const toggleTag = (t: string) => setTagFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);

  return (
    <div style={{ padding: "22px 28px 48px", background: P.bg, minHeight: 600 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>
          <Boxes size={17} strokeWidth={2} style={{ verticalAlign: "-3px", marginRight: 7, color: P.accent }} />타겟 오디언스
        </div>
        <div style={{ fontSize: 12, color: P.sub, marginTop: 3 }}>
          저장·송출한 타겟 묶음을 <b style={{ color: P.text }}>분류 라벨</b>로 그룹핑하고 <b style={{ color: P.text }}>속성 태그</b>로 필터링해 용도·시즌·고객별로 관리합니다.
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {([["all", `전체 ${bundles.length}`], ["saved", "저장됨"], ["submitted", "송출됨"]] as [typeof statusFilter, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setStatusFilter(id)} style={chipBtn(statusFilter === id)}>{label}</button>
          ))}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <Search size={13} strokeWidth={2} style={{ position: "absolute", left: 9, top: 8, color: P.sub }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="이름·라벨·태그·메모 검색"
              style={{ padding: "6px 10px 6px 27px", fontSize: 11.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, width: 210, outline: "none" }} />
          </div>
        </div>
        {tagUniverse.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: P.sub, display: "inline-flex", alignItems: "center", gap: 4 }}><TagIcon size={11} strokeWidth={2.4} />태그 필터</span>
            {tagUniverse.map(t => (
              <button key={t} onClick={() => toggleTag(t)} style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, cursor: "pointer", border: `1px solid ${tagFilter.includes(t) ? P.accent : P.border}`, background: tagFilter.includes(t) ? P.glow : "transparent", color: tagFilter.includes(t) ? P.accent : P.sub }}>#{t}</button>
            ))}
            {tagFilter.length > 0 && <button onClick={() => setTagFilter([])} style={{ fontSize: 10, color: P.sub2, background: "none", border: "none", cursor: "pointer" }}>× 해제</button>}
          </div>
        )}
      </div>

      {/* 빈 상태 */}
      {bundles.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px 20px", color: P.sub }}>
          <Boxes size={36} strokeWidth={1.3} style={{ opacity: .5, marginBottom: 12 }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, color: P.text, marginBottom: 4 }}>저장된 타겟 오디언스가 없습니다</div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>오디언스 카트(🛒)에서 조각을 담고 <b>분류 라벨·태그·메모</b>를 붙여 저장하면 여기에 모입니다.</div>
        </div>
      )}
      {bundles.length > 0 && filtered.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "36px 20px", color: P.sub, fontSize: 12.5 }}>검색·필터 조건에 맞는 타겟이 없습니다.</div>
      )}

      {/* 라벨 그룹 */}
      {groups.map(([label, rows]) => {
        const isNone = label === NO_LABEL;
        const open = !collapsed[label];
        const sum = rows.reduce((a, r) => a + (r.items || []).reduce((x, i) => x + (i.estimated || 0), 0), 0);
        return (
          <section key={label} style={{ marginBottom: 18 }}>
            <button onClick={() => setCollapsed(c => ({ ...c, [label]: !c[label] }))}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "6px 2px", background: "none", border: "none", cursor: "pointer", marginBottom: 8 }}>
              <ChevronDown size={15} strokeWidth={2.4} style={{ color: P.sub, transform: open ? "none" : "rotate(-90deg)", transition: "transform .13s" }} />
              {isNone ? <span style={{ fontSize: 13, fontWeight: 700, color: P.sub2 }}>라벨 없음</span> : <LabelChip label={label} />}
              <span style={{ fontSize: 11, color: P.sub }}>{rows.length}개 · 합계 ~{fmt(sum)}명</span>
            </button>

            {open && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                {rows.map(b => {
                  const est = (b.items || []).reduce((x, i) => x + (i.estimated || 0), 0);
                  const isEdit = editing === b.id;
                  return (
                    <div key={b.id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                      {isEdit ? (
                        <div style={{ padding: "14px 16px" }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: P.sub, display: "block", marginBottom: 4 }}>묶음 이름</label>
                          <input value={editVal.name} onChange={e => setEditVal(v => ({ ...v, name: e.target.value.slice(0, 80) }))}
                            style={{ width: "100%", padding: "7px 10px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none", marginBottom: 10 }} />
                          <BundleMetaFields value={editVal} onChange={v => setEditVal(vv => ({ ...vv, ...v }))} labelSuggestions={allLabels()} tagSuggestions={allTags()} compact />
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button onClick={saveEdit} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: P.accent, color: "#fff", border: "none" }}><Check size={13} strokeWidth={2.4} style={{ verticalAlign: "-2px", marginRight: 4 }} />저장</button>
                            <button onClick={() => setEditing(null)} style={ghostBtn({ flex: 1, padding: "8px 0", textAlign: "center" })}><X size={13} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 4 }} />취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ padding: "13px 15px 11px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 800, color: P.text, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.name || "(이름 없음)"}</span>
                                  <span style={{ ...badge(b.status === "submitted" ? "success" : "neutral"), fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 5 }}>{b.status === "submitted" ? "송출됨" : "저장됨"}</span>
                                </div>
                                <div style={{ fontSize: 11, color: P.sub, marginTop: 3 }}>{(b.items || []).length}조각 · 예상 ~{fmt(est)}명 · {(b.updated_at || "").slice(0, 10)}</div>
                              </div>
                            </div>
                            {(b.tags?.length || 0) > 0 && <div style={{ marginTop: 8 }}><TagChips tags={b.tags} onClick={toggleTag} /></div>}
                            {b.memo && (
                              <div style={{ marginTop: 9, fontSize: 11.5, color: P.sub, background: P.bgElevated, border: `1px solid ${P.border}`, borderRadius: 8, padding: "8px 10px", lineHeight: 1.5, display: "flex", gap: 6 }}>
                                <StickyNote size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: P.sub2 }} />
                                <span style={{ whiteSpace: "pre-wrap" }}>{b.memo}</span>
                              </div>
                            )}
                            {/* 조각 미리보기 */}
                            <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 3 }}>
                              {(b.items || []).slice(0, 3).map(it => (
                                <div key={it.id} style={{ fontSize: 10.5, color: P.sub2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {it.label} <span style={{ opacity: .7 }}>{it.summary}</span></div>
                              ))}
                              {(b.items || []).length > 3 && <div style={{ fontSize: 10, color: P.sub2 }}>+{(b.items || []).length - 3}개 더</div>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, padding: "9px 15px", borderTop: `1px solid ${P.border}`, background: P.bgElevated }}>
                            <button onClick={() => loadBundle(b.id)} style={ghostBtn()} title="이 묶음을 카트로 불러와 재편집/재송출">
                              <FolderOpen size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />카트로
                            </button>
                            <button onClick={() => startEdit(b)} style={ghostBtn()}>
                              <Pencil size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />라벨·태그·메모
                            </button>
                            <button onClick={() => { if (confirm(`"${b.name}" 을(를) 삭제할까요?`)) deleteBundle(b.id); }} style={{ ...ghostBtn({ marginLeft: "auto" }), color: P.danger, borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)" }} title="삭제">
                              <Trash2 size={11} strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function chipBtn(active: boolean): React.CSSProperties {
  return { padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`, background: active ? P.glow : P.bg, color: active ? P.accent : P.sub };
}
function ghostBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: "5px 10px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.sub, ...extra };
}
