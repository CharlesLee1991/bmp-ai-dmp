/* ══════════════════════════════════════════════════════════════════
   매핑 메타데이터 등록부 (SSOT) — 시스템관리 > 분류 맵핑 관리 화면 백본.
   앱 곳곳에 흩어진 코드→라벨/색상 매핑을 한 곳에서 조회·관리하기 위한 목록.

   source:
     - "hardcoded" : 소스코드에 강제 지정된 분류(강제지정분류). DB 대조 없음.
     - "db"        : DB(정본 테이블)에서 동적 조회.
     - "hybrid"    : DB 정본 + 강제지정분류(오버라이드) 혼합. (예: 업종 소분류)
   ══════════════════════════════════════════════════════════════════ */

import { AGE_LABEL, SIDO_LIST, SHOP_CAT_COLORS } from "@/lib/data";

export type MappingSource = "hardcoded" | "db" | "hybrid";

export interface RefMapping {
  id: string;
  title: string;
  desc: string;
  source: MappingSource;
  dbTable?: string;
  usedIn: string;                                   // 사용 화면
  entries: { code: string; label: string; swatch?: string }[];
}

/* ── 업종 소분류: 유일한 hybrid(강제지정분류 + DB 정본) — 화면에서 별도 처리 ── */
export const INDUSTRY_MAPPING_META = {
  id: "industry",
  title: "업종 소분류 (가맹점 분류)",
  desc: "카드/멤버십 가맹점 업종 코드. DB 정본은 de_dmp_category_code(sub_code→subcategory). 강제지정분류(PARTNER_MAP)로 코드별 라벨을 덮어쓸 수 있음.",
  source: "hybrid" as MappingSource,
  dbTable: "de_dmp_category_code",
  usedIn: "카드 대시보드 업종차트 · 멤버십 가맹점 필터",
};

/* 요일 코드(멤버십) — MembershipSegment 로컬 DOW_LABEL 미러 */
const DOW_LABEL: Record<string, string> = { "1":"일","2":"월","3":"화","4":"수","5":"목","6":"금","7":"토" };
/* 사용금액구간(멤버십) — MembershipSegment 로컬 AMT_OPTIONS 미러 */
const AMT_OPTIONS: [string, string][] = [
  ["1만원미만","1만원 미만"], ["1-3만원","1~3만원"], ["3-5만원","3~5만원"],
  ["5-10만원","5~10만원"], ["10만원이상","10만원 이상"],
];
/* 카드사 코드 — CardComparisonTab 로컬 CARD_LABELS 미러 */
const CARD_LABELS: Record<string, string> = { KB:"KB카드", NH:"NH카드", NHPAY:"NH페이", LOCA:"디지로카", GETO:"GETO" };

const toEntries = (m: Record<string, string>) => Object.entries(m).map(([code, label]) => ({ code, label }));

/* ── 읽기 전용 참조 매핑(대부분 강제지정분류=하드코딩) ── */
export const REF_MAPPINGS: RefMapping[] = [
  {
    id: "age", title: "연령대 코드", source: "hardcoded",
    desc: "연령 그룹 코드 → 한글 라벨. 여러 화면에 중복 정의됨(AGE_LABEL).",
    usedIn: "카드/멤버십/교통 등 전 화면",
    entries: toEntries(AGE_LABEL),
  },
  {
    id: "dow", title: "이용요일 코드", source: "hardcoded",
    desc: "요일 숫자 코드(1=일 … 7=토) → 한글. 멤버십 필터.",
    usedIn: "멤버십",
    entries: toEntries(DOW_LABEL),
  },
  {
    id: "amt", title: "사용금액 구간", source: "hardcoded",
    desc: "멤버십 사용금액 버킷 값 → 표시 라벨.",
    usedIn: "멤버십",
    entries: AMT_OPTIONS.map(([code, label]) => ({ code, label })),
  },
  {
    id: "card", title: "카드사 코드", source: "hardcoded",
    desc: "카드 소스 코드 → 카드사명. 카드사 비교.",
    usedIn: "카드사 비교",
    entries: toEntries(CARD_LABELS),
  },
  {
    id: "sido", title: "시도 목록", source: "hardcoded",
    desc: "표준 행정구역 시도 17종(순서 고정).",
    usedIn: "지역 필터 전반",
    entries: SIDO_LIST.map((s) => ({ code: s, label: s })),
  },
  {
    id: "shopcolor", title: "쇼핑 카테고리 색상", source: "hardcoded",
    desc: "쇼핑 카테고리 → 배지 색상(bg/fg). 다크모드 미대응 원색 하드코딩.",
    usedIn: "쇼핑상품 · 카드 대시보드",
    entries: Object.entries(SHOP_CAT_COLORS).map(([code, c]) => ({ code, label: code, swatch: c.fg })),
  },
];
