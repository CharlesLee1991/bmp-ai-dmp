"use client";

/* ══════════════════════════════════════════════════════════════════
   시스템관리 > 분류 맵핑 관리
   - 업종 소분류: 강제지정분류(하드코딩/오버라이드) ↔ DB 정본(de_dmp_category_code) 대조·편집.
   - 기타 매핑 메타데이터(연령·요일·금액·카드사·시도·쇼핑색상) 조회 관리.
   - 편집은 DB 영속(de_dmp_label_overrides · admin 전용 API 경유). 정본 테이블 불변.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import useSWR from "swr";
import { PARTNER_MAP, INDUSTRY_DATA, fmt } from "@/lib/data";
import { P, badge, cardStyle } from "@/lib/theme";
import { Tip, ForcedLabelTipBody } from "./Tip";
import { useOverrides, setOverride, removeOverride, clearOverrides } from "@/lib/labelOverrides";
import { REF_MAPPINGS, INDUSTRY_MAPPING_META } from "@/lib/mappingMeta";
import {
  Settings2, Database, Lock, Search, Pencil, RotateCcw, Check, X, Info, Layers,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const NS = "industry";

type Row = {
  code: string; db?: string; forced?: string;
  isOverride: boolean; isForced: boolean; effective: string;
  status: "diff" | "match" | "db-only" | "db-none"; users?: number;
};
type FilterId = "all" | "forced" | "diff" | "dbonly" | "dbnone";

export default function SystemMappingTab() {
  const { data } = useSWR("/api/segment-options/subcategory", fetcher, { revalidateOnFocus: false, dedupingInterval: 600000 });
  const overrides = useOverrides(NS);

  const dbMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (data?.success) for (const r of data.data as { subcategory: string; sub_code: number }[]) m[String(r.sub_code)] = r.subcategory;
    return m;
  }, [data]);

  const usersMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of INDUSTRY_DATA) m[it.code] = it.users;
    return m;
  }, []);

  const rows: Row[] = useMemo(() => {
    const codes = new Set<string>([...Object.keys(dbMap), ...Object.keys(PARTNER_MAP), ...Object.keys(overrides)]);
    const out: Row[] = [];
    codes.forEach((code) => {
      const db = dbMap[code];
      const forced = overrides[code] ?? (PARTNER_MAP as Record<string, string>)[code];
      const isForced = forced != null;
      const status: Row["status"] = !db ? "db-none" : !isForced ? "db-only" : forced === db ? "match" : "diff";
      out.push({ code, db, forced, isOverride: code in overrides, isForced, effective: forced ?? db ?? code, status, users: usersMap[code] });
    });
    // 강제지정분류 우선 → 불일치 우선 → 이용자수 desc → 코드
    const rank = (r: Row) => (r.status === "diff" ? 0 : r.isForced ? 1 : r.status === "db-only" ? 2 : 3);
    return out.sort((a, b) => rank(a) - rank(b) || (b.users ?? 0) - (a.users ?? 0) || a.code.localeCompare(b.code));
  }, [dbMap, overrides, usersMap]);

  const counts = useMemo(() => ({
    all: rows.length,
    forced: rows.filter((r) => r.isForced).length,
    diff: rows.filter((r) => r.status === "diff").length,
    dbonly: rows.filter((r) => r.status === "db-only").length,
    dbnone: rows.filter((r) => r.status === "db-none").length,
  }), [rows]);

  const [filter, setFilter] = useState<FilterId>("forced");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ code: string; value: string } | null>(null);

  const shown = useMemo(() => {
    let r = rows;
    if (filter === "forced") r = r.filter((x) => x.isForced);
    else if (filter === "diff") r = r.filter((x) => x.status === "diff");
    else if (filter === "dbonly") r = r.filter((x) => x.status === "db-only");
    else if (filter === "dbnone") r = r.filter((x) => x.status === "db-none");
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((x) => x.code.includes(t) || (x.db || "").toLowerCase().includes(t) || (x.forced || "").toLowerCase().includes(t));
    return r.slice(0, 400);
  }, [rows, filter, q]);

  const overrideCount = Object.keys(overrides).length;

  const saveEdit = () => { if (editing) { setOverride(NS, editing.code, editing.value); setEditing(null); } };

  return (
    <div style={{ padding: "22px 28px 48px", background: P.bg, minHeight: 600 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>
          <Settings2 size={17} strokeWidth={2} style={{ verticalAlign: "-3px", marginRight: 7, color: P.accent }} />분류 맵핑 관리
        </div>
        <div style={{ fontSize: 12, color: P.sub, marginTop: 3 }}>
          코드→라벨 매핑을 조회·관리. <b style={{ color: P.text }}>강제지정분류</b>(하드코딩/오버라이드)와 <b style={{ color: P.text }}>DB 정본</b>을 대조합니다.
        </div>
      </div>

      {/* 안내 배너 */}
      <div style={{ ...cardStyle, display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 13px", marginBottom: 18, background: "var(--badge-teal-bg)", borderColor: "transparent" }}>
        <Info size={15} strokeWidth={2} style={{ color: "var(--badge-teal-fg)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11.5, color: "var(--badge-teal-fg)", lineHeight: 1.55 }}>
          편집은 <b>DB(de_dmp_label_overrides)에 영속</b>되어 모든 사용자·기기에 즉시 반영됩니다(admin 전용).
          정본 테이블(de_dmp_category_code)은 변경하지 않으며, 오버라이드 해제 시 정본 라벨로 복귀합니다.
        </div>
      </div>

      {/* 업종 매핑 섹션 */}
      <section style={{ ...cardStyle, padding: 0, marginBottom: 22, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: P.text }}>
              <Layers size={15} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.accent }} />{INDUSTRY_MAPPING_META.title}
              <span style={{ ...badge("teal"), fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, marginLeft: 8 }}>HYBRID</span>
            </div>
            <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>
              정본: <code style={{ color: P.accent }}>{INDUSTRY_MAPPING_META.dbTable}</code> · 사용: {INDUSTRY_MAPPING_META.usedIn}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {overrideCount > 0 && (
              <button onClick={() => { if (confirm(`오버라이드 ${overrideCount}건을 모두 초기화할까요? (모든 사용자에게 반영)`)) clearOverrides(NS); }}
                style={ghostBtn()}>
                <RotateCcw size={12} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />오버라이드 초기화 ({overrideCount})
              </button>
            )}
          </div>
        </div>

        {/* 필터 + 검색 */}
        <div style={{ padding: "11px 16px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: `1px solid ${P.border}` }}>
          {([
            ["forced", `강제지정분류 ${counts.forced}`],
            ["diff", `불일치 ${counts.diff}`],
            ["dbonly", `DB만 ${counts.dbonly}`],
            ["dbnone", `DB없음 ${counts.dbnone}`],
            ["all", `전체 ${counts.all}`],
          ] as [FilterId, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={chipBtn(filter === id)}>{label}</button>
          ))}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <Search size={13} strokeWidth={2} style={{ position: "absolute", left: 9, top: 8, color: P.sub }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코드·라벨 검색"
              style={{ padding: "6px 10px 6px 27px", fontSize: 11.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, width: 170, outline: "none" }} />
          </div>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: P.card, zIndex: 1 }}>
              <tr style={{ textAlign: "left", color: P.sub, fontSize: 10.5 }}>
                <Th w={64}>코드</Th>
                <Th>DB 정본 라벨</Th>
                <Th>강제 라벨</Th>
                <Th w={116}>출처 / 상태</Th>
                <Th w={78}>이용자</Th>
                <Th w={112}>편집</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isEditing = editing?.code === r.code;
                return (
                  <tr key={r.code} style={{ borderTop: `1px solid ${P.border}` }}>
                    <td style={td()}><code style={{ color: P.sub }}>{r.code}</code></td>
                    <td style={td()}>{r.db || <span style={{ color: P.sub2 }}>— (DB 미등록)</span>}</td>
                    <td style={td()}>
                      {isEditing ? (
                        <input autoFocus value={editing!.value} onChange={(e) => setEditing({ code: r.code, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                          style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: `1px solid ${P.accent}`, background: P.bg, color: P.text, width: "90%", outline: "none" }} />
                      ) : r.isForced ? (
                        <span style={{ fontWeight: 600, color: P.text }}>{r.forced}<span style={{ color: P.accent }}> *</span></span>
                      ) : <span style={{ color: P.sub2 }}>—</span>}
                    </td>
                    <td style={td()}>{sourceBadge(r)}</td>
                    <td style={{ ...td(), color: P.sub }}>{r.users ? fmt(r.users) : "—"}</td>
                    <td style={td()}>
                      {isEditing ? (
                        <span style={{ display: "flex", gap: 5 }}>
                          <button onClick={saveEdit} style={iconAction(P.accent)}><Check size={13} strokeWidth={2.4} /></button>
                          <button onClick={() => setEditing(null)} style={iconAction(P.sub)}><X size={13} strokeWidth={2.4} /></button>
                        </span>
                      ) : (
                        <span style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => setEditing({ code: r.code, value: r.forced ?? r.db ?? "" })} style={ghostBtn()} title="강제 라벨 지정/수정">
                            <Pencil size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 3 }} />{r.isForced ? "수정" : "지정"}
                          </button>
                          {r.isOverride && (
                            <button onClick={() => removeOverride(NS, r.code)} style={ghostBtn()} title="오버라이드 해제(하드코딩/DB 기본값으로)">
                              <RotateCcw size={11} strokeWidth={2} />
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={6} style={{ ...td(), textAlign: "center", color: P.sub, padding: "26px 0" }}>{data ? "해당 조건의 항목이 없습니다." : "DB 라벨 로딩 중…"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 기타 매핑 메타데이터 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: "0 0 12px" }}>
        <Database size={14} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: P.sub }} />기타 매핑 메타데이터
        <span style={{ fontSize: 11, fontWeight: 400, color: P.sub, marginLeft: 8 }}>대부분 소스 하드코딩(강제지정분류) · 조회 전용</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {REF_MAPPINGS.map((mp) => (
          <div key={mp.id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "11px 13px", borderBottom: `1px solid ${P.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: P.text }}>{mp.title}</span>
                <Tip content={mp.source === "hardcoded" ? "소스코드에 강제 지정된 분류. DB 대조 없음." : "DB 정본에서 조회."}>
                  <span style={{ ...badge(mp.source === "hardcoded" ? "warning" : "success"), fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, cursor: "default" }}>
                    {mp.source === "hardcoded" ? "강제지정분류" : "DB"}
                  </span>
                </Tip>
                <span style={{ marginLeft: "auto", fontSize: 10, color: P.sub }}>{mp.entries.length}건</span>
              </div>
              <div style={{ fontSize: 10.5, color: P.sub, marginTop: 5, lineHeight: 1.45 }}>{mp.desc}</div>
            </div>
            <div style={{ maxHeight: 190, overflowY: "auto", padding: "6px 13px 10px" }}>
              {mp.entries.map((e) => (
                <div key={e.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 11.5 }}>
                  <code style={{ color: P.sub, minWidth: 62, fontSize: 10.5 }}>{e.code}</code>
                  {e.swatch && <span style={{ width: 11, height: 11, borderRadius: 3, background: e.swatch, flexShrink: 0, border: `1px solid ${P.border}` }} />}
                  <span style={{ color: P.text }}>{e.label}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "7px 13px", borderTop: `1px solid ${P.border}`, fontSize: 10, color: P.sub, display: "flex", alignItems: "center", gap: 5 }}>
              <Lock size={10} strokeWidth={2} /> 사용: {mp.usedIn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sourceBadge(r: Row) {
  if (r.status === "diff")
    return (
      <Tip content={<ForcedLabelTipBody code={r.code} dbLabel={r.db} forcedLabel={r.forced} />}>
        <span style={{ ...badge("danger"), fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, cursor: "default" }}>강제≠DB{r.isOverride ? " (편집됨)" : ""}</span>
      </Tip>
    );
  if (r.isForced)
    return (
      <Tip content={<ForcedLabelTipBody code={r.code} dbLabel={r.db} forcedLabel={r.forced} />}>
        <span style={{ ...badge("warning"), fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, cursor: "default" }}>강제지정분류{r.isOverride ? " (편집됨)" : ""}</span>
      </Tip>
    );
  if (r.status === "db-only")
    return <span style={{ ...badge("success"), fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>DB 정본</span>;
  return <span style={{ ...badge("neutral"), fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>DB 미등록</span>;
}

function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return <th style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap", width: w }}>{children}</th>;
}
function td(): React.CSSProperties { return { padding: "8px 12px", verticalAlign: "middle" }; }
function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
    border: `1px solid ${active ? P.accent : P.border}`, background: active ? P.glow : P.bg, color: active ? P.accent : P.sub,
  };
}
function ghostBtn(): React.CSSProperties {
  return { padding: "4px 8px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${P.border}`, background: P.bg, color: P.sub };
}
function iconAction(color: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, cursor: "pointer", border: `1px solid ${P.border}`, background: P.bg, color };
}
