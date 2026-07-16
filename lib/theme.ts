/* ══════════════════════════════════════════════════════════════════
   DMP 공용 디자인 팔레트 (SSOT) — CL UI/UX 표준 §0 이식
   각 컴포넌트가 로컬로 중복 정의하던 `const P` 를 이 하나로 대체한다.
   값은 전부 CSS 변수(var(--token)) → 라이트/다크가 자동 반전된다.
   (globals.css 의 :root / .dark 가 실제 색을 정의)
   ══════════════════════════════════════════════════════════════════ */

export const P = {
  /* 표면 */
  bg: "var(--bg)",
  bgElevated: "var(--bg-elevated)",
  card: "var(--card)",
  cardAlt: "var(--card-2)",
  chrome: "var(--chrome)",

  /* 경계 */
  border: "var(--border)",
  borderSoft: "var(--border-soft)",
  borderStrong: "var(--border-strong)",

  /* 텍스트 */
  text: "var(--text)",
  sub: "var(--sub)",
  sub2: "var(--sub-2)",

  /* 브랜드/강조 */
  primary: "var(--primary)",
  primaryFg: "var(--primary-fg)",
  accent: "var(--accent)",
  accentStrong: "var(--accent-strong)",
  accentFg: "var(--accent-fg)",
  glow: "var(--accent-glow)",
  app: "var(--accent-2)",          // 멤버십 '앱' 등 보조 강조
  appGlow: "var(--accent-2-glow)",

  /* 시맨틱 / 데이터 인코딩 */
  green: "var(--success)",
  good: "var(--success)",
  success: "var(--success)",
  danger: "var(--danger)",
  dangerStrong: "var(--danger-strong)",
  dangerFg: "var(--danger-fg)",
  warning: "var(--warning)",
  neutral: "var(--neutral)",
  m: "var(--male)",                // 남성
  f: "var(--female)",              // 여성
  unknown: "var(--unknown)",
  up: "var(--success)",
  down: "var(--danger)",
  flat: "var(--neutral)",

  /* 칩 */
  chip: "var(--chip)",
  chipFg: "var(--chip-fg)",
  chipBorder: "var(--chip-border)",

  /* 효과 */
  ring: "var(--ring)",
  shadowSoft: "var(--shadow-soft)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
} as const;

/* 차트 시리즈 팔레트 (다중 계열용) — 채도 낮은 실무 톤 */
export const SERIES = [
  "var(--accent)",
  "var(--male)",
  "var(--accent-2)",
  "var(--warning)",
  "var(--success)",
  "var(--female)",
] as const;

/* recharts <Tooltip> 다크 대응 표준 (CL 표준 §12) — 그대로 스프레드 */
export const tooltipStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
};

/* recharts Tooltip cursor (막대/영역 위 회색 바) 토큰화 */
export const tooltipCursor = { fill: "var(--accent-glow)" } as const;

/* 공용 카드 스타일 (표준 §7) */
export const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  boxShadow: "var(--shadow-soft)",
};
