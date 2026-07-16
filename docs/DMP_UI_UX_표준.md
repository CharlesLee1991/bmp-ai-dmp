# DMP Audience Explorer — UI/UX 디자인 표준 (SSOT)

> 이 문서는 **이 repo(bmp-ai-dmp) 프론트엔드의 단일 진실 출처(SSOT)**다.
> 새 화면·컴포넌트를 만들 때 여기 정의된 토큰·패턴을 **그대로** 쓴다. 임의 색상·스타일 도입 금지.
> 표준이 부족하면 **이 문서를 먼저 갱신한 뒤** 적용한다.
>
> **상위 정본**: `bizspring-inc/content-launcher` 의 `CL_UI_UX_표준.md`(Content Launcher 디자인 표준).
> 이 문서는 CL 표준을 **이 repo 아키텍처에 맞게 번역·이식**한 정본이다.
> **핵심 차이**: CL은 Tailwind + shadcn/ui 기반이라 클래스를 그대로 복사한다. 이 repo는 **Tailwind 미사용 · 전면 인라인 스타일 + recharts/echarts** 이므로, CL의 클래스를 **CSS 변수 토큰**으로 번역해 인라인 스타일이 `var(--token)` 을 소비하게 했다.
>
> 스택: Next.js 14 (App Router) · React 18 · TypeScript 5 · recharts · echarts-gl · lucide-react · Pretendard.
> 최종 갱신: 2026-07-16 (프리미엄 리테마 + 다크모드 이식).

---

## 0. 원칙 (반드시 준수)

1. **임의 HEX 금지** — §1 토큰만 사용. 라이트/다크 페어를 항상 같이. (예외: 차트 시리즈 배열, BizViz 정본 팔레트 — §9)
2. **인라인 스타일도 토큰 소비** — `style={{ color: "var(--text)" }}` 또는 공용 `P.*`(`lib/theme.ts`). 하드코딩 hex를 직접 박지 않는다.
3. **다크 기본 OFF** — 기본 = 라이트(현행 유지). 다크는 우상단 토글로 활성. 신규 색은 반드시 다크 페어를 globals.css에 함께 정의.
4. **아이콘 = lucide 라인 전용** — 유니코드 이모지 금지 (§9).
5. **버튼 톤 정책** — 한 화면에 진한 solid primary는 1개(가장 중요한 다음 행동), 나머지는 outline (§5).
6. **표준 컴포넌트 재사용** — 팔레트 `P`, `ThemeMenu`, `badge()`, `tooltipStyle` 등 (`lib/theme.ts` · `lib/ThemeContext.tsx`). 자체 재구현 금지.
7. **차트는 다크에서 색이 자동으로 안 따라온다** — 축·툴팁·그리드를 토큰으로 명시 (§8).
8. **백엔드 무변경 원칙** — 시각/UX 레이어(`components/*`, `app/globals.css`, `lib/theme.ts`, `lib/ThemeContext.tsx`)만 수정. `app/api/*`·`lib/data.ts` 로직 불가침.

---

## 1. 디자인 토큰 (`app/globals.css`)

색은 전부 `:root`(라이트)와 `.dark`(다크)에 **페어로** 정의된 CSS 변수다. 다크 elevation 원칙: base(bg) 8% → card/popover 15% (CL 표준 §0.1).

### 1.1 표면 · 경계 · 텍스트
| 토큰 | 용도 | 라이트 | 다크 |
|---|---|---|---|
| `--bg` | 페이지 배경 | `#f4f6fa` | `#0f1420` |
| `--bg-elevated` | 살짝 뜬 영역(muted)·호버 | `#eef1f6` | `#161c29` |
| `--card` | 카드/패널 | `#ffffff` | `#1a2130` |
| `--card-2` | 카드 내부 보조면 | `#fbfcfe` | `#1f2736` |
| `--chrome` / `--chrome-blur` | 헤더·탭바 프로스트글래스 | `#fff` / `rgba(255,255,255,.72)` | `#141a26` / `rgba(20,26,38,.72)` |
| `--border` / `--border-soft` / `--border-strong` | 경계 3단 | `#e4e8ef` / `#eef1f5` / `#d4dae3` | `#2a3242` / `#232b39` / `#384254` |
| `--text` / `--sub` / `--sub-2` | 본문·보조·옅은메타 | `#101828` / `#667085` / `#98a2b3` | `#e5e9f0` / `#94a1b5` / `#6b7688` |

### 1.2 브랜드 · 시맨틱
| 토큰 | 용도 | 라이트 | 다크 |
|---|---|---|---|
| `--primary` / `--primary-fg` | 진한 남색 필수액션 | `#1e293b` / `#fff` | `#e5e9f0` / `#0f1420` |
| `--accent` / `--accent-strong` / `--accent-glow` | 브랜드 teal 강조·링크·선택 | `#0d9488` / `#0b7d73` / `rgba(13,148,136,.09)` | `#2dd4bf` / `#14b8a6` / `rgba(45,212,191,.14)` |
| `--accent-2` / `--accent-2-glow` | 보조 강조(멤버십 앱 등) | `#7c6cf0` | `#a396ff` |
| `--success` / `--danger` / `--danger-strong` / `--warning` / `--neutral` | 시맨틱 | `#10b981` / `#ef4444` / `#dc2626` / `#f59e0b` / `#94a3b8` | `#34d399` / `#f87171` / `#ef4444` / `#fbbf24` / `#64748b` |
| `--male` / `--female` / `--unknown` | 성별 데이터 인코딩 | `#3b82f6` / `#f59e0b` / `#a0aec0` | `#60a5fa` / `#fbbf24` / `#64748b` |
| `--chip` / `--chip-fg` / `--chip-border` | 필터 선택 칩 | `#e4f0ff` / `#1d4e89` / `#bcd9f5` | 반투명 teal |

### 1.3 상태 배지 톤 페어 (§7) · 효과
- 배지: `--badge-{tone}-bg` + `--badge-{tone}-fg`, tone ∈ `info · sky · success · warning · danger · violet · teal · neutral`.
  라이트=옅은 틴트 배경+진한 텍스트, 다크=시맨틱 저알파 배경+밝은 텍스트 (자동 반전).
- 모달 스크림: `--scrim` (라이트 `rgba(15,23,42,.45)` / 다크 `rgba(2,6,15,.62)`).
- 그림자: `--shadow-soft` / `--shadow-md` / `--shadow-lg` (다크는 더 진하게).
- 링/포커스: `--ring`. 라운드 기본 `--radius: 10px`.

---

## 2. 공용 팔레트 · 헬퍼 (`lib/theme.ts`)

컴포넌트가 로컬로 중복 정의하던 `const P` 를 **하나로 통합**. 전부 `var(--token)` 참조 → 자동 반전.

```ts
import { P, badge, tooltipStyle, tooltipCursor, cardStyle, SERIES } from "@/lib/theme";

// P: 표면/경계/텍스트/브랜드/시맨틱/칩 슈퍼셋
//   P.bg P.card P.border P.text P.sub P.accent P.glow P.app(=accent-2)
//   P.m(남) P.f(여) P.success P.danger P.warning P.neutral P.up P.down P.flat …
// badge(tone): {background, color, border} — 상태 배지 (라이트/다크 자동)
// tooltipStyle: recharts <Tooltip contentStyle={tooltipStyle}> (§8)
// SERIES: 다중 계열 차트 색 배열 (토큰 기반)
```

- **신규 컴포넌트는 로컬 `const P` 재정의 금지** → `import { P } from "@/lib/theme"`.

---

## 3. 테마 시스템 (`lib/ThemeContext.tsx`) — geocare 2영역 독립 (§0.1·§11.4)

- **2영역 독립**: **사이드바** ↔ **콘텐츠**를 각각 light/dark/system 로 따로 토글. (geocare.ai 이식)
  - 콘텐츠 = `<html>.dark` 토글(콘텐츠 토큰 + body 포털).
  - 사이드바 = `<html>.sidebar-dark` / `.sidebar-light` 토글(`--sidebar-*` 만 교체, 콘텐츠와 독립).
- 기본값 = **메뉴(다크) / 콘텐츠(라이트)**. 지속성: localStorage `dmp-theme-v1` = `{sidebar, content}`.
- 초기값은 lazy(`useState(() => readStored())`, SSR 가드) — 마운트 시 persist 이펙트가 덮어쓰지 않도록. 테마는 `<html>` 클래스(이펙트)로만 적용 → 하이드레이션 불일치 없음.
- 플래시 방지: `app/layout.tsx` `<head>` 인라인 스크립트가 하이드레이션 전 두 영역 클래스 선반영.
- `useAppTheme()` → `{ sidebar, content, resolvedSidebar, resolvedContent, setRegion, setAll }`.
- **테마 토글 UI = `<ThemeMenu />`** — 우상단 버튼 → 미니 팝업 **3구획(전체 일괄 / 메뉴(사이드바) / 콘텐츠)**, 각 구획에 동일한 라이트/다크/시스템 세그먼트. (상단바·로그인에 마운트)
- **사이드바 토큰**(`--sidebar-bg/fg/fg-dim/accent/accent-fg/border/hover`) = `lib/theme.ts`의 `SB.*`. `.dark`(콘텐츠)는 `--sidebar-*`를 건드리지 않는다.

---

## 4. 앱 셸 — 좌측 사이드바 + 상단바 (geocare AppSidebar/AppLayout 이식)

레이아웃 = `flex`( **`<DmpSidebar>`**(좌) + **메인 컬럼**(우) ). `components/DmpSidebar.tsx`.
- **사이드바**(`--sidebar-*` 독립 토큰): 로고 상단(h60) → 세로 메뉴(lucide 아이콘 + 라벨) → 하단 계정 푸터(아바타·이름·역할·로그아웃). 메뉴 SSOT = `TABS`(`DmpSidebar.tsx`), 역할 필터(admin/advertiser).
- **선택 하이라이트(geocare식)**: active = `background: var(--sidebar-accent)` 채움 + `color: var(--sidebar-accent-fg)` + `fontWeight 600` (좌측바 아님). hover = `var(--sidebar-hover)`.
- **접기/펼치기 = switch pill**: 로고 우측에 **튀어나온 스위치 필(슬라이딩 노브 + 방향 chevron)**. `position:absolute; right:-17` 로 사이드바 경계 밖으로 돌출 → 항상 눈에 띔. localStorage `dmp-sidebar-collapsed`(펼침 232 / 접힘 62px).
- **상단바**(메인 컬럼 최상단, `.dmp-frost` sticky, **하단 `box-shadow: var(--shadow-md)`**): **브레드크럼** `DMP Explorer > {고객/시스템명} > [메뉴아이콘] 메뉴명 ▾`. 마지막 세그먼트는 **드롭다운**(메뉴 아이콘 + 라벨, 클릭 시 바로 이동). 우측 = LIVE pill + `<ThemeMenu />`. 높이 56px.
- **사이드바 메뉴 그룹화**(`GROUP_ORDER`/`GROUP_LABEL`): ① 오디언스·추출(카드·지하철·버스·멤버십·AI탐색) ② 분석 리포트·조회(매체성과·소비트렌드·카드사비교·쇼핑상품) ③ 관리(전송이력). 그룹 라벨 헤더 + 접힘 시 구분선. 권한별 빈 그룹 자동 숨김.

### 4.1 필터 3계층 (사용자 지시)
1. **타겟 정의(페르소나)** — 브레드크럼 하단 최상단 고정. **저장된 페르소나 칩(다중 선택)** + 결합 필터 정의(`filterParts`) + 예상 모수를 전 화면 pin.
   - **페르소나** = 별명 + 데모그래픽/데이터소스별 필터속성 결합(필터세트). `lib/persona.ts` (localStorage `dmp-personas-v1`, 프론트 v1).
   - **페르소나 빌더**(`components/PersonaBuilder.tsx`): 자연어 기술 → AI 필터정의(기존 `/api/campaign-target` 재사용, 3안 추천) → 모수·선택률 바(`/api/segment-preview`) + AI 라이프스타일 자연어 기술(`/api/ai-recommend`) → **저장 = 필터세트 저장**.
   - **다중 선택 = 필터 합집합(union)** 을 공통 데모그래픽 + 카드 화면필터 상태에 즉시 적용 → 어떤 화면을 다녀도 해당 페르소나 정의로 브라우징. 칩 × = 삭제. (setState 직후 적용은 최신 목록 인자로 전달 — stale closure 방지.)
2. **공통 데모그래픽 필터(도킹)** — 성별·연령·지역. `position:sticky; top:56` 로 타겟정의 바로 아래 고정, 전 화면 지속. **소비 화면(`DEMO_TABS`=카드·지하철·버스·멤버십·소비트렌드)에서만 활성**, 그 외(AI탐색·전송이력·매체·카드사·쇼핑)는 `opacity+grayscale+pointer-events:none`로 **비활성 표기 + "자체 필터 사용" 안내**.
3. **화면 필터(화면별)** — 데이터 종류별 필터. 카드 탭은 Dashboard 내 **접기/펼치기 2컬럼 패널**(업종/금액/매체/통신/단말/소비/결제/ADID/기간), 그 외 탭은 각 컴포넌트 내부(교통유형·승하차 / 적립앱·요일 등).
- **데이터 밴드(예: 쇼핑 카테고리)**: 픽토그램 대신 **실사 이미지 헤더밴드**(키워드 실사 + 로드 실패 시 색상 그라디언트 폴백) + 하단 스크림 + **흰색 그림자 글자**(`textShadow`). 카테고리명은 밴드 안, 지표는 밴드 아래.
- **테이블 가독성**: 데이터 테이블/그리드의 본문·배지 글자는 최소 10.5–12px(차트 축 tick 제외). 9/10px 데이터 셀은 한 단계 상향.

---

## 5. 버튼 톤 정책 — CL 표준 §1

| 성격 | 스타일 |
|---|---|
| **필수/주요(흐름 진행 1개)** | 진한 solid — `background: linear-gradient(135deg, var(--male), var(--accent))` 또는 `var(--primary)`, `color:#fff`, `boxShadow: P.shadowSoft` |
| **선택/옵션(부가·토글·취소)** | outline — `background: transparent`, `border: 1px solid var(--border)`, `color: P.sub` (활성 시 `P.glow` + accent) |
| **핵심/되돌리기 어려움(전송·삭제)** | `var(--danger)` 계열 (action-critical) |

- 한 화면/카드에 진한 solid는 **1개만**. 예) 카드 탭: `런컴 타겟 전송` = solid primary, `캠페인 찾기`·`AI 탐색` = outline.
- 버튼 안 아이콘은 lucide (`<Send size={14}/>` 등).

---

## 6. 타이포 · 카드 · 칩

- 글자 크기: 메타 `10–11px` · 라벨/본문 `12–13px` · 소제목 `14px` · 페이지/모달 제목 `16–22px`. 배지·칩은 본문보다 한 단계 작게.
- 카드: `cardStyle`(`lib/theme.ts`) = `var(--card)` + `1px solid var(--border)` + `--shadow-soft`, radius 12.
- 필터 칩(ToggleChip): `rounded-full`, active = `P.glow` 배경 + accent 텍스트/보더.

---

## 7. 상태 배지 (다크 대응 필수)

하드코딩 라이트 틴트 배경 + 진한 텍스트 조합은 **다크에서 밝은 박스로 깨진다.** 반드시 토큰 페어 사용:

```tsx
// 방법 A — 헬퍼
<span style={{ ...badge("success"), padding:"2px 8px", borderRadius:999, fontSize:11 }}>완료</span>
// 방법 B — 변수 직접
style={{ background:"var(--badge-danger-bg)", color:"var(--badge-danger-fg)" }}
```
색 계열 매핑: 초록→`success` · 빨강→`danger` · 주황/노랑→`warning` · 파랑→`info` · 하늘/청록→`sky` · 보라→`violet` · teal→`teal` · 회색→`neutral`.

---

## 8. 차트 · 표 다크 대응 — CL 표준 §12

**recharts** (SVG는 CSS 상속이 약해 색 명시 필수):
- 툴팁: `<Tooltip contentStyle={tooltipStyle} itemStyle={{ color: P.text }} />` — 배경 없는 `contentStyle` 금지(기본 흰색 → 다크 깨짐).
- 축/틱: `stroke="var(--sub)"`, `tick={{ fill: P.sub }}`. 그리드: `<CartesianGrid stroke="var(--border)" />`. cursor: `tooltipCursor`(=accent-glow).
- 데이터 색은 `SERIES` 배열 또는 시맨틱 토큰(`var(--male)` 등).
- **중후·안정 톤**(사용자 지시): 차트 시리즈 = `--series-1..6`(저채도 하모니, 라이트/다크 자동). `--male`/`--female` 도 뮤트(스틸블루/웜샌드). `lib/theme.ts`의 `SERIES` + 컴포넌트 `COLORS`/`CHART_COLORS`가 이를 참조.
- 컴포넌트 로컬 색 배열(recharts)은 `var(--series-N)` 토큰 사용(SVG는 var() 해석 O). echarts(canvas)·`CARD_COLORS`(카드사 브랜드색)·BizViz `HUES`(정본)는 예외로 hex 유지.

**echarts (3D)**: 축·툴팁·환경색을 `var(--card)`·`var(--border)`·`P.sub` 로 지정. visualMap 히트맵 스케일은 데이터 인코딩이라 하드코딩 유지.

**BizViz (브랜드 격리 다크)**: `components/BizVizMediaCharts.tsx` 는 `<div className="dark">` 로 강제 격리된 **코스믹 다크 비주얼**. 정본 팔레트 `const C`(base `#101318`·surface `#161A20`·ink `#DEE4EC`·dim `#8B94A3`·sky `#4FBEFF`)와 `HUES` 배열은 BIZVIZ-DESIGN.md §1 도크트린이라 **토큰화 금지·변경 금지**. (헤더 아이콘 색만 `C.sky`.)

---

## 9. 아이콘 — CL 표준 §9

- **범용 아이콘 = `lucide-react`(라인) 전용.** 유니코드 이모지(💳🚇📊 등) 직접 사용 **금지**(줄맞춤·다크 대비·플랫폼 렌더 편차).
- 렌더: 텍스트 앞에 `<Icon size={15} strokeWidth={2} style={{ verticalAlign:"-2px", marginRight:6, color: P.accent }} />` 또는 inline-flex + gap.
- 문자열 prop/placeholder 안 이모지는 **JSX 주입 불가** → 이모지 문자만 제거.
- 비이모지 기호(· › × ✕ → ~ ↳ ▾ ✦ 원문자 ⓐⓑ)는 이모지 아님 → 유지.
- 탭 아이콘 SSOT: `TAB_ICON`(`components/Dashboard.tsx`).

---

## 10. 모달 · 오버레이 — CL 표준 §8.1

- 스크림: `background: "var(--scrim)"` + `backdropFilter: "blur(2px)"`. 라이트=검정 저알파, 다크=밝은 elevation으로 카드가 떠 보이게.
- 모달 카드는 `var(--card)`(elevation) + `--shadow-lg`.

---

## 11. 로그인 (`components/LoginPage.tsx`)

프리미엄 진입 패턴: 앰비언트 radial-gradient 배경(`--accent-glow`/`--accent-2-glow`) + 아이콘 인풋(lucide `User`/`Lock`) + solid 그라디언트 로그인 버튼 + 우상단 `<ThemeMenu />`. 에러는 `color-mix(... var(--danger) ...)`.

---

## 12. 알려진 잔여 · 폴리시 백로그

`docs/FRONTEND-BUGS.md` 참조. (일부 SpendingTab/CardComparison의 `rgba(0,0,0,.0x)` 랭크원·트랙, 금/은/동 메달 metallic hex 등은 의도적/저우선.)

---

## 변경 절차
1. 새 결정이 생기면 이 문서의 해당 섹션을 먼저 갱신.
2. globals.css 토큰 추가 시 **라이트/다크 페어**를 반드시 같이.
3. `AGENTS.md`/`CLAUDE.md` 요약과 필요 시 동기화. 상위 정본 CL_UI_UX_표준.md와 어긋나면 그 배경을 여기 명시.
