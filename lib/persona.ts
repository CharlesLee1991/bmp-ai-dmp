/* ══════════════════════════════════════════════════════════════════
   페르소나 (타겟 오디언스 정의) — 프론트 전용 v1
   - 페르소나 = 별명 + 데모그래픽/데이터소스별 필터속성 결합(필터세트) + AI 라이프스타일 기술.
   - 저장 = localStorage "dmp-personas-v1" (기술적으로 필터세트 저장).
   - 다중 선택 = 필터 합집합(union)으로 화면 브라우징 필터링.
   - NL→필터 변환은 기존 /api/campaign-target 재사용 (백엔드 무변경).
   ══════════════════════════════════════════════════════════════════ */

export interface PersonaFilters {
  sexes: string[];          // M / F / U
  ages: string[];           // 10s..60s+ (AGE_ORDER 키)
  sidos: string[];          // 시도 전체명
  majorCats: string[];      // 업종 대분류
  amountFilters: string[];  // under_5k..over_300k
  cardCompanies: string[];  // KB, NH, ...
  telecoms: string[];       // K, T, U, Z
}

export interface Persona {
  id: string;
  name: string;              // 별명(페르소나 명칭)
  color: string;             // 칩 색 (badge tone)
  filters: PersonaFilters;
  filterSummary: string;     // 사람이 읽는 필터 요약
  lifestyle?: string;        // AI 라이프스타일 기술 (자연어)
  estimated?: number;        // 예상 모수
  createdAt: string;
}

export const EMPTY_FILTERS: PersonaFilters = {
  sexes: [], ages: [], sidos: [], majorCats: [], amountFilters: [], cardCompanies: [], telecoms: [],
};

const STORAGE_KEY = "dmp-personas-v1";
const TONES = ["teal", "info", "violet", "warning", "success", "sky"] as const;

export function loadPersonas(): Persona[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function savePersonas(list: Persona[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function newPersonaId(): string {
  return "ps_" + Math.random().toString(36).slice(2, 9);
}

export function pickTone(index: number): string {
  return TONES[index % TONES.length];
}

/* 다중 선택 페르소나 → 필터 합집합 */
export function mergePersonaFilters(personas: Persona[]): PersonaFilters {
  const out: PersonaFilters = { ...EMPTY_FILTERS, sexes: [], ages: [], sidos: [], majorCats: [], amountFilters: [], cardCompanies: [], telecoms: [] };
  const uni = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  for (const p of personas) {
    out.sexes = uni(out.sexes, p.filters.sexes || []);
    out.ages = uni(out.ages, p.filters.ages || []);
    out.sidos = uni(out.sidos, p.filters.sidos || []);
    out.majorCats = uni(out.majorCats, p.filters.majorCats || []);
    out.amountFilters = uni(out.amountFilters, p.filters.amountFilters || []);
    out.cardCompanies = uni(out.cardCompanies, p.filters.cardCompanies || []);
    out.telecoms = uni(out.telecoms, p.filters.telecoms || []);
  }
  return out;
}

/* /api/campaign-target 의 segments({seg,value}) → PersonaFilters 매핑 */
export function segmentsToFilters(segments: { seg: string; value: string | string[] }[]): PersonaFilters {
  const f: PersonaFilters = { sexes: [], ages: [], sidos: [], majorCats: [], amountFilters: [], cardCompanies: [], telecoms: [] };
  const arr = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
  const mapAge = (a: string) => (a === "60s_plus" ? "60s+" : a);
  for (const s of segments || []) {
    switch (s.seg) {
      case "gender": f.sexes.push(...arr(s.value)); break;
      case "age": f.ages.push(...arr(s.value).map(mapAge)); break;
      case "region": f.sidos.push(...arr(s.value)); break;
      case "major_category": f.majorCats.push(...arr(s.value)); break;
      case "amount": f.amountFilters.push(...arr(s.value)); break;
      case "card_company": f.cardCompanies.push(...arr(s.value)); break;
      case "telecom": f.telecoms.push(...arr(s.value)); break;
    }
  }
  return f;
}

/* PersonaFilters → segment-preview용 segments */
export function filtersToSegments(f: PersonaFilters): { seg: string; value: string | string[] }[] {
  const segs: { seg: string; value: string | string[] }[] = [];
  const one = (v: string[]) => (v.length === 1 ? v[0] : v);
  const mapAgeBack = (a: string) => (a === "60s+" ? "60s_plus" : a);
  if (f.sexes.length) segs.push({ seg: "gender", value: one(f.sexes) });
  if (f.ages.length) segs.push({ seg: "age", value: one(f.ages.map(mapAgeBack)) });
  if (f.sidos.length) segs.push({ seg: "region", value: one(f.sidos) });
  if (f.majorCats.length) segs.push({ seg: "major_category", value: one(f.majorCats) });
  if (f.amountFilters.length) segs.push({ seg: "amount", value: one(f.amountFilters) });
  if (f.cardCompanies.length) segs.push({ seg: "card_company", value: one(f.cardCompanies) });
  if (f.telecoms.length) segs.push({ seg: "telecom", value: one(f.telecoms) });
  return segs;
}

/* 사람이 읽는 요약 */
const AGE_LBL: Record<string, string> = { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50s": "50대", "60s+": "60대+", unknown: "미상" };
const AMT_LBL: Record<string, string> = { under_5k: "~5천", "5k_10k": "5천~1만", "10k_30k": "1~3만", "30k_50k": "3~5만", "50k_100k": "5~10만", "100k_300k": "10~30만", over_300k: "30만~" };
export function summarizeFilters(f: PersonaFilters): string {
  const parts: string[] = [];
  if (f.sexes.length) parts.push(f.sexes.map(s => (s === "M" ? "남성" : s === "F" ? "여성" : "미상")).join("·"));
  if (f.ages.length) parts.push(f.ages.map(a => AGE_LBL[a] || a).join("·"));
  if (f.sidos.length) parts.push(f.sidos.map(s => s.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/도$/, "")).join("·"));
  if (f.majorCats.length) parts.push(f.majorCats.join("·"));
  if (f.amountFilters.length) parts.push(f.amountFilters.map(a => AMT_LBL[a] || a).join("·"));
  if (f.cardCompanies.length) parts.push(f.cardCompanies.join("·"));
  if (f.telecoms.length) parts.push(f.telecoms.map(t => ({ K: "KT", T: "SKT", U: "LGU+", Z: "알뜰폰" } as Record<string, string>)[t] || t).join("·"));
  return parts.join(" / ") || "조건 없음";
}
