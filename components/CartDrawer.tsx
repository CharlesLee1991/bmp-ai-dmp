"use client";

/* ══════════════════════════════════════════════════════════════════
   오디언스 카트 드로어 — 장바구니 P1
   - 우측 슬라이드 드로어: 담은 조각 검토·제거 · 합계(중복 포함 상한) · 저장 묶음.
   - "이름 붙여 송출" = 경로 A: 조각별 EF(dmp-target-export) 호출, "{묶음명} #n/N".
     ID 레벨 중복제거(1묶음=1타겟)는 EF v21(P2)에서 — 푸터에 정직하게 명시.
   - 송출 성공 조각은 /api/exports 이력 기록(memo=묶음명), 완료 시 submitted 묶음 생성.
   ══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { P, badge, cardStyle } from "@/lib/theme";
import { fmt } from "@/lib/data";
import { Tip } from "./Tip";
import {
  useCart, removeFromCart, clearCart, saveBundle, deleteBundle, loadBundle, markSubmitted,
  allLabels, allTags, type CartItem,
} from "@/lib/cart";
import { BundleMetaFields, LabelChip, TagChips, type MetaValue } from "./BundleMetaFields";
import {
  ShoppingCart, X, Trash2, Rocket, FlaskConical, Save, FolderOpen,
  SlidersHorizontal, UserRound, AlertTriangle, PackageOpen,
} from "lucide-react";

const DMP_EXPORT_FN_URL = "https://ihzttwgqahhzlrqozleh.supabase.co/functions/v1/dmp-target-export";
const SUPA_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/* 헤더용 카트 버튼 (수량 배지) */
export function CartButton({ userId, onClick }: { userId?: number; onClick: () => void }) {
  const { cart } = useCart(userId);
  return (
    <button onClick={onClick} title="오디언스 카트" aria-label="오디언스 카트"
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, cursor: "pointer", background: "transparent", border: `1px solid ${P.border}`, color: P.sub }}>
      <ShoppingCart size={16} strokeWidth={2} />
      {cart.length > 0 && (
        <span style={{ position: "absolute", top: -6, right: -7, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: P.danger, color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{cart.length}</span>
      )}
    </button>
  );
}

type SubmitState = { phase: "form" | "sending" | "done"; env?: "dev" | "prod"; progress?: number; total?: number; results?: { label: string; ok: boolean; count?: number; error?: string }[] };

export default function CartDrawer({ open, onClose, userId, onGoToTargets }: { open: boolean; onClose: () => void; userId?: number; onGoToTargets?: () => void }) {
  const { cart, saved } = useCart(userId);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState<MetaValue>({ label: "", tags: [], memo: "" });
  const [metaOpen, setMetaOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sub, setSub] = useState<SubmitState>({ phase: "form" });
  const [saveMsg, setSaveMsg] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  const sumMax = cart.reduce((a, i) => a + (i.estimated || 0), 0);
  const savedBundles = saved.filter(r => r.status === "saved");
  const bundleMeta = () => ({ label: meta.label, tags: meta.tags, memo: meta.memo });

  const doSave = async () => {
    const n = name.trim();
    if (!n || !cart.length) return;
    const ok = await saveBundle(n, bundleMeta());
    setSaveMsg(ok ? `"${n}" 저장됨` : "저장 실패 — 다시 시도해주세요");
    setSavedOk(ok);
    if (ok) { setName(""); setMeta({ label: "", tags: [], memo: "" }); setMetaOpen(false); }
    setTimeout(() => { setSaveMsg(""); setSavedOk(false); }, 6000);
  };

  /* 경로 A 송출: 조각별 EF 호출 → 이력 기록 → submitted 묶음 */
  const doSubmit = async (env: "dev" | "prod") => {
    const n = name.trim();
    if (!n || !cart.length) return;
    const items = [...cart];
    setSub({ phase: "sending", env, progress: 0, total: items.length, results: [] });
    const results: { label: string; ok: boolean; count?: number; error?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const segName = items.length === 1 ? n : `${n} #${i + 1}/${items.length}`;
      // ai_table 조각은 BQ 오디언스 테이블 모드, 그 외는 필터 모드
      const payload = it.type === "ai_table" && it.bqTable
        ? { segment_name: segName, bq_audience_table: it.bqTable, env }
        : { segment_name: segName, filters: it.filters, env };
      try {
        const resp = await fetch(DMP_EXPORT_FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_ANON_KEY}` },
          body: JSON.stringify(payload),
        });
        const r = await resp.json();
        const ok = !!r?.success;
        results.push({ label: it.label, ok, count: r?.data?.ads_id_count, error: ok ? undefined : (r?.error || `HTTP ${resp.status}`) });
        if (ok) {
          // 이력 기록 (묶음명 memo) — 실패해도 송출 자체는 성공이므로 무시
          try {
            await fetch("/api/exports", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                segment_name: segName, filters: it.type === "ai_table" ? { bq_audience_table: it.bqTable || "" } : it.filters,
                audience_count: r?.data?.ads_id_count || 0,
                env: r?.data?.env || env,
                runcomm_target_id: r?.data?.runcomm_target_id || null,
                status: "success", memo: `카트 묶음: ${n} (${it.label})`, response_data: r,
              }),
            });
          } catch {}
        }
      } catch (e: any) {
        results.push({ label: it.label, ok: false, error: e.message });
      }
      setSub({ phase: "sending", env, progress: i + 1, total: items.length, results: [...results] });
    }
    if (results.some(r => r.ok)) { await markSubmitted(n, items, bundleMeta()); setMeta({ label: "", tags: [], memo: "" }); setName(""); setMetaOpen(false); }
    setSub({ phase: "done", env, results, total: items.length, progress: items.length });
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      {/* scrim */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 38%, transparent)" }} />
      {/* drawer */}
      <aside style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "94vw", background: P.card, borderLeft: `1px solid ${P.border}`, boxShadow: P.shadowLg, display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${P.border}` }}>
          <ShoppingCart size={16} strokeWidth={2.2} style={{ color: P.accent }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: P.text }}>오디언스 카트</span>
          <span style={{ ...badge("teal"), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{cart.length}개 조각</span>
          <button onClick={onClose} aria-label="닫기" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: P.sub, display: "flex" }}><X size={17} strokeWidth={2} /></button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
          {/* 송출 진행/결과 */}
          {sub.phase !== "form" && (
            <div style={{ ...cardStyle, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: P.text, marginBottom: 8 }}>
                {sub.phase === "sending" ? `송출 중… ${sub.progress}/${sub.total}` : "송출 결과"}
                <span style={{ ...badge(sub.env === "prod" ? "danger" : "info"), fontSize: 9.5, padding: "2px 7px", borderRadius: 6, marginLeft: 8 }}>{sub.env === "prod" ? "상용" : "개발"}</span>
              </div>
              {(sub.results || []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, padding: "3px 0", color: r.ok ? P.text : P.danger }}>
                  <span>{r.ok ? "✓" : "✕"}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.ok ? `${fmt(r.count || 0)}명` : (r.error || "").slice(0, 30)}</span>
                </div>
              ))}
              {sub.phase === "done" && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => setSub({ phase: "form" })} style={ghostBtn({ flex: 1 })}>확인</button>
                  {onGoToTargets && <button onClick={() => { onGoToTargets(); onClose(); }} style={{ flex: 1, padding: "5px 9px", borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: "pointer", border: "none", background: P.accent, color: "#fff" }}>생성된 오디언스 →</button>}
                </div>
              )}
            </div>
          )}

          {/* 조각 목록 */}
          {cart.length === 0 && sub.phase === "form" && (
            <div style={{ textAlign: "center", padding: "42px 10px", color: P.sub }}>
              <PackageOpen size={34} strokeWidth={1.4} style={{ opacity: .5, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 4 }}>카트가 비어 있습니다</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.6 }}>화면을 둘러보며 오디언스를 담아보세요.<br />필터 패널의 <b>"현재 조건 담기"</b>, 페르소나 칩의 <b>🛒</b> 버튼으로 담을 수 있습니다.</div>
            </div>
          )}
          {cart.map(it => (
            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 2px", borderBottom: `1px dashed ${P.border}` }}>
              <span style={{ marginTop: 2, color: it.type === "persona" ? "var(--badge-violet-fg)" : P.accent }}>
                {it.type === "persona" ? <UserRound size={14} strokeWidth={2.2} /> : <SlidersHorizontal size={14} strokeWidth={2.2} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: P.text, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                  <span style={{ ...badge(it.type === "persona" ? "violet" : "teal"), fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, flexShrink: 0 }}>{it.type === "persona" ? "페르소나" : "필터"}</span>
                </div>
                <div style={{ fontSize: 11, color: P.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.summary || "조건 없음"}</div>
                {it.dropped && it.dropped.length > 0 && (
                  <Tip content={`아래 조건은 현재 송출 추출(EF)이 지원하지 않아 제외됩니다:\n${it.dropped.join(", ")}`}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--badge-warning-fg)", marginTop: 3, cursor: "default" }}>
                      <AlertTriangle size={11} strokeWidth={2} /> 송출 시 미적용: {it.dropped.join("·")}
                    </span>
                  </Tip>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: P.text, fontVariantNumeric: "tabular-nums" }}>{it.estimated ? `~${fmt(it.estimated)}` : "—"}</div>
                <div style={{ fontSize: 9.5, color: P.sub2 }}>예상 모수</div>
              </div>
              <button onClick={() => removeFromCart(it.id)} title="제거" style={{ background: "none", border: "none", cursor: "pointer", color: P.sub2, padding: 2, display: "flex" }}><X size={14} strokeWidth={2} /></button>
            </div>
          ))}
          {cart.length > 0 && (
            <button onClick={() => { if (confirm("카트를 비울까요?")) clearCart(); }} style={ghostBtn({ marginTop: 10 })}>
              <Trash2 size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />카트 비우기
            </button>
          )}

          {/* 저장된 묶음 */}
          {savedBundles.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: P.sub, letterSpacing: ".05em", marginBottom: 8 }}>
                <FolderOpen size={12} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 5 }} />저장된 묶음 ({savedBundles.length})
              </div>
              {savedBundles.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 2px", borderBottom: `1px dashed ${P.border}`, fontSize: 12 }}>
                  <span style={{ flex: 1, fontWeight: 700, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ color: P.sub2, fontSize: 10.5, flexShrink: 0 }}>{r.items.length}조각</span>
                  <button onClick={() => loadBundle(r.id)} style={ghostBtn()} title="이 묶음을 카트로 불러오기(현재 카트 교체)">불러오기</button>
                  <button onClick={() => { if (confirm(`"${r.name}" 묶음을 삭제할까요?`)) deleteBundle(r.id); }} style={ghostBtn({ padding: "3px 7px" })} title="삭제"><Trash2 size={11} strokeWidth={2} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 — 합계 + 확정 */}
        <div style={{ borderTop: `1px solid ${P.border}`, padding: "13px 18px", background: P.bgElevated }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
            <span style={{ color: P.sub }}>단순 합계 (중복 포함 상한)</span>
            <span style={{ fontWeight: 800, color: P.text, fontVariantNumeric: "tabular-nums" }}>~{fmt(sumMax)}명</span>
          </div>
          <div style={{ fontSize: 10, color: P.sub2, marginBottom: 10 }}>중복 제거(1묶음=1타겟) 통합 송출은 EF v21에서 지원 예정 — 현재는 조각별 개별 타겟으로 송출됩니다.</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="묶음 이름 (런컴 세그먼트명)"
            style={{ width: "100%", padding: "8px 11px", fontSize: 12.5, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, outline: "none", marginBottom: 8 }} />

          {/* 분류 라벨 · 태그 · 메모 (접이식) */}
          <button onClick={() => setMetaOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "5px 2px", background: "none", border: "none", cursor: "pointer", color: P.sub, fontSize: 11, fontWeight: 700, marginBottom: metaOpen ? 8 : 4 }}>
            <span style={{ transform: metaOpen ? "rotate(90deg)" : "none", transition: "transform .13s" }}>›</span>
            분류 라벨 · 태그 · 메모
            {!metaOpen && (meta.label || meta.tags.length > 0) && (
              <span style={{ marginLeft: 4, display: "inline-flex", gap: 4, alignItems: "center" }}>
                <LabelChip label={meta.label} /><TagChips tags={meta.tags.slice(0, 3)} />
              </span>
            )}
          </button>
          {metaOpen && (
            <div style={{ marginBottom: 10 }}>
              <BundleMetaFields value={meta} onChange={setMeta} labelSuggestions={allLabels()} tagSuggestions={allTags()} compact />
            </div>
          )}

          {saveMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: P.accent, fontWeight: 600 }}>{saveMsg}</span>
              {savedOk && onGoToTargets && (
                <button onClick={() => { onGoToTargets(); onClose(); }} style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, border: `1px solid ${P.accent}`, background: P.glow, color: P.accent, cursor: "pointer" }}>생성된 오디언스로 이동 →</button>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {/* 메인 = 타겟으로 저장(생성된 오디언스 보관). 송출은 거기서 언제든. */}
            <Tip content={"'생성된 오디언스' 메뉴에 타겟으로 보관됩니다.\n라벨·태그·메모로 관리하고 언제든 송출할 수 있어요."} side="top">
              <button disabled={!name.trim() || !cart.length} onClick={doSave}
                style={footBtn(true, !name.trim() || !cart.length)}>
                <Save size={12} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 5 }} />타겟으로 저장
              </button>
            </Tip>
            {/* 서브 = 바로 송출(저장 겸용) */}
            <Tip content={"저장과 동시에 즉시 런컴으로 송출합니다.\n'생성된 오디언스' 메뉴에 '송출됨'으로 기록돼요."} side="top">
              <button disabled={!name.trim() || !cart.length || sub.phase === "sending"} onClick={() => setConfirmOpen(true)}
                style={footBtn(false, !name.trim() || !cart.length || sub.phase === "sending")}>
                <Rocket size={12} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 5 }} />바로 송출
              </button>
            </Tip>
          </div>
        </div>

        {/* 송출 확인 미니 모달 */}
        {confirmOpen && (
          <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 30%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <div style={{ ...cardStyle, width: 320, padding: "18px 20px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: P.text, marginBottom: 4 }}>"{name.trim()}" 송출</div>
              <div style={{ fontSize: 11.5, color: P.sub, marginBottom: 14 }}>{cart.length}개 조각 → 런컴 타겟 {cart.length}개 생성{cart.length > 1 ? ` ("#n/${cart.length}" 접미사)` : ""}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmOpen(false)} style={ghostBtn({ flex: 1, padding: "9px 0", textAlign: "center" })}>취소</button>
                <button onClick={() => { setConfirmOpen(false); void doSubmit("dev"); }} style={{ ...ghostBtn({ flex: 1, padding: "9px 0", textAlign: "center" }), color: P.f, borderColor: "color-mix(in srgb, var(--female) 30%, transparent)" }}>
                  <FlaskConical size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />개발
                </button>
                <button onClick={() => { setConfirmOpen(false); void doSubmit("prod"); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, var(--male), var(--accent))", color: "#fff", border: "none" }}>
                  <Rocket size={11} strokeWidth={2.2} style={{ verticalAlign: "-1px", marginRight: 4 }} />상용
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function ghostBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: "4px 9px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.sub, ...extra };
}
function footBtn(primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    flex: primary ? 1.4 : 1, padding: "10px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, textAlign: "center",
    background: primary ? "linear-gradient(135deg, var(--male), var(--accent))" : P.card,
    color: primary ? "#fff" : P.text,
    border: primary ? "none" : `1px solid ${P.borderStrong}`,
  };
}
