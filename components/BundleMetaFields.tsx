"use client";

/* ══════════════════════════════════════════════════════════════════
   타겟 오디언스 메타 입력/표시 공용 — 분류 라벨 · 속성 태그(≤10) · 메모.
   CartDrawer(생성·송출)와 TargetAudienceTab(편집)에서 재사용.
   ══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { P, badge } from "@/lib/theme";
import { MAX_TAGS } from "@/lib/cart";
import { Tag as TagIcon, X, Hash } from "lucide-react";

/* 태그 칩 표시 (읽기 전용) */
export function TagChips({ tags, onClick }: { tags?: string[]; onClick?: (t: string) => void }) {
  if (!tags?.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {tags.map(t => (
        <span key={t} onClick={onClick ? () => onClick(t) : undefined}
          style={{ ...badge("sky"), fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, cursor: onClick ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 3 }}>
          <Hash size={8} strokeWidth={2.6} />{t}
        </span>
      ))}
    </span>
  );
}

/* 라벨 칩 표시 */
export function LabelChip({ label }: { label?: string | null }) {
  if (!label) return null;
  return <span style={{ ...badge("violet"), fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 7 }}>{label}</span>;
}

export interface MetaValue { label: string; tags: string[]; memo: string }

/* 편집 폼 — 라벨(자동완성) · 태그(칩 add) · 메모 */
export function BundleMetaFields({
  value, onChange, labelSuggestions = [], tagSuggestions = [], compact,
}: {
  value: MetaValue;
  onChange: (v: MetaValue) => void;
  labelSuggestions?: string[];
  tagSuggestions?: string[];
  compact?: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  const fs = compact ? 11.5 : 12.5;

  const addTag = (raw: string) => {
    const t = raw.trim().slice(0, 20);
    if (!t) return;
    if (value.tags.includes(t) || value.tags.length >= MAX_TAGS) { setTagInput(""); return; }
    onChange({ ...value, tags: [...value.tags, t] });
    setTagInput("");
  };
  const removeTag = (t: string) => onChange({ ...value, tags: value.tags.filter(x => x !== t) });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: fs, borderRadius: 8,
    border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none",
  };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: P.sub, letterSpacing: ".03em", marginBottom: 4, display: "block" };
  const freeTagSuggest = tagSuggestions.filter(t => !value.tags.includes(t)).slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {/* 분류 라벨 */}
      <div>
        <label style={lbl}>분류 라벨 <span style={{ color: P.sub2, fontWeight: 400 }}>· 그룹핑 기준 (용도/시즌/고객 등)</span></label>
        <input list="dmp-bundle-labels" value={value.label} onChange={e => onChange({ ...value, label: e.target.value.slice(0, 40) })}
          placeholder="예: 여름 프로모션 / VIP 고객 / 리타겟" style={inputStyle} />
        <datalist id="dmp-bundle-labels">
          {labelSuggestions.map(l => <option key={l} value={l} />)}
        </datalist>
      </div>

      {/* 속성 태그 */}
      <div>
        <label style={lbl}><TagIcon size={10} strokeWidth={2.4} style={{ verticalAlign: "-1px", marginRight: 3 }} />속성 태그 <span style={{ color: P.sub2, fontWeight: 400 }}>· 필터 기준 (최대 {MAX_TAGS}개)</span></label>
        {value.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
            {value.tags.map(t => (
              <span key={t} style={{ ...badge("sky"), fontSize: 10, fontWeight: 700, padding: "2px 4px 2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 3 }}>
                {t}<button onClick={() => removeTag(t)} aria-label="태그 삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", opacity: .7, padding: 0 }}><X size={11} strokeWidth={2.4} /></button>
              </span>
            ))}
          </div>
        )}
        {value.tags.length < MAX_TAGS && (
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } else if (e.key === "Backspace" && !tagInput && value.tags.length) { removeTag(value.tags[value.tags.length - 1]); } }}
            placeholder="태그 입력 후 Enter" style={inputStyle} />
        )}
        {freeTagSuggest.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {freeTagSuggest.map(t => (
              <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 999, border: `1px dashed ${P.border}`, background: "transparent", color: P.sub, cursor: "pointer" }}>+ {t}</button>
            ))}
          </div>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label style={lbl}>메모</label>
        <textarea value={value.memo} onChange={e => onChange({ ...value, memo: e.target.value.slice(0, 500) })}
          placeholder="이 타겟에 대한 설명·용도·주의사항" rows={compact ? 2 : 3}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>
    </div>
  );
}
