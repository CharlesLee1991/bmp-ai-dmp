# ARCHITECTURE — bmp-ai-dmp 개발자 문서

> 공동개발 진입점. 구조·DB·로직·규약을 한 파일에 담는다.
> 기준: main `737d58d` (2026-07-14 실측) · 정본 SSOT: [`../CLAUDE.md`](../CLAUDE.md)
> ⚠️ 이 문서와 코드가 다르면 **코드가 정본**. 발견 즉시 이 문서를 고칠 것.

---

## 0. 5분 온보딩

```bash
git clone https://github.com/CharlesLee1991/bmp-ai-dmp.git
cd bmp-ai-dmp
npm install
cp .env.example .env.local     # 값은 PO에게 요청 (평문 공유 금지)
npm run dev                     # → localhost:3000
```

로그인: `de_dmp_users` 계정 (lcseung / runcomm / aduser001). 비번은 PO 문의.

| 먼저 읽을 것 | 이유 |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) §2 정본 규칙 | **추측 개발 방지** — 특히 "런컴 외 반출 금지" |
| 이 문서 §3 데이터 흐름 | 어디서 데이터가 오는지 |
| 이 문서 §7 함정 | 신규 합류자가 반드시 밟는 지뢰 |

---

## 1. 제품 정의

**DMP Audience Explorer** — 런컴 납품 AI DMP 대시보드.

```
행동 데이터(카드·교통·멤버십·쇼핑) → 오디언스 탐색/생성 → AI 반응예측 →
런컴 광고 지면 전송 → 성과 회수(폐루프) → 다음 오디언스 개선
```

| 트랙 | 상태 |
|---|---|
| T-DMP-AI-EVOLUTION (AI 오디언스) | 🟢 P1~P4+판정 완료 → 잔여 = PO 상용 전송 버튼 |
| T-DMP-ACTIVATION (활성화·대시보드) | ✅ UI 완성 |
| T-DSP-LINEA-INTEGRATION (DSP 접합) | 🔵 설계 완료 → 잔여 = `UserPropertyParser` 매핑 + RS 협상 |

---

## 2. 시스템 구성

| 레이어 | 실체 | 위치 |
|---|---|---|
| **화면** | 이 repo (Next.js 14) | Vercel → dmp.bmp.ai |
| **API 프록시** | `app/api/*/route.ts` | 동일 (서버측 — 키 부착 지점) |
| **집계 엔진** | Supabase RPC (큐브) | `ihzttwgqahhzlrqozleh` |
| **분석 워커** | data-worker (FastAPI + fastapi-mcp) | Railway |
| **원천 DW** | BigQuery `bizspring-gp.dmp_data` | asia-northeast3 |
| **송출** | 런컴 API (`at.runcomm`) | 외부 (유일 반출처) |

### 관련 repo

| repo | 역할 |
|---|---|
| **`CharlesLee1991/bmp-ai-dmp`** | 이 repo — 대시보드 |
| `bizspring-python-workers` | data-worker (DMP API·큐브·전송) |
| `bizspring-inc/bizviz` | 디자인 시스템 정본 (코스믹 시각화 출처) |

> ⚠️ **혼동 주의**: `ap-flow`·`ap-batch`·`ad-front`·`gp-touchad` = 애드몬스터 쇼츠 DSP(별개, 미연결) / `admonster-*` = 네이버 검색광고 스크래핑 SaaS(완전 다른 제품)

---

## 3. 데이터 흐름

```
BigQuery  bizspring-gp.dmp_data  (asia-northeast3)
   │  원천: core-rhythm-279909.touchad_db
   │  ad_point_transaction_1y (10.5억행) — title·company_idx·platform_idx 내장
   │  touchad 일별통계 (1.75억) × platform 마스터 (105매체)
   ▼
data-worker (Railway)  ─ X-API-Key 인증
   │  GET  /dmp/media/performance?days=
   │  GET  /dmp/media/daily?days=&platform_idx=
   │  GET  /dmp/media/creative-platforms?days=
   │  GET  /dmp/audience/{table}/ad-performance?days=&platform_idx=   ← 폐루프
   │  GET  /dmp/audiences
   │  POST /dmp/export                        ← P4 전송
   │  GET/POST /dmp/segment/explore[/{req_id}/{approve|reject|preview}]
   │  GET  /dmp/scorecard/latest · POST /dmp/scorecard/run
   │  POST /dmp/scheduled/rebuild · GET /health
   ▼
이 repo  app/api/*/route.ts    ← 서버측 키 부착 (클라 노출 0)
   ▼
components/*.tsx

        ┌─ Supabase RPC (큐브 계열은 worker 우회, 직접 호출)
        └─ dmp_dashboard_data · dmp_transit_dashboard · dmp_membership_dashboard …
```

**P4 전송 (유일한 외부 경로)**
```
EF dmp-target-export v20 → RPC(allowlist) → S3(adtree) → 런컴 API(at.runcomm)
                                                       → de_dmp_target_submissions 기록
```
> ⛔ 런컴 외 반출 금지 (2026-07-12 PO 결정 — 크리테오 DROP). 실반출 0, 매칭 기록만 보존.

---

## 4. 디렉토리 구조

```
bmp-ai-dmp/
├── CLAUDE.md                   🔱 정본 SSOT (에이전트/개발 진입점)
├── AGENTS.md                   └ 미러 (Cursor/Codex) — 수정은 CLAUDE.md에서
├── README.md                   제품 개요
├── docs/
│   ├── ARCHITECTURE.md         📖 이 문서 (공동개발)
│   └── USER-GUIDE.md           📘 사용자 매뉴얼 (런컴 전달용)
├── .github/workflows/guard.yml CI 가드 (시크릿 스캔)
│
├── app/
│   ├── layout.tsx · globals.css
│   ├── page.tsx                로그인 게이트 (DmpUser 체크 → Dashboard)
│   └── api/                    ← 전부 서버측 프록시
│       ├── media/route.ts          📊 매체 성과 → data-worker /dmp/media/*
│       ├── dashboard/route.ts      카드 탭 → RPC dmp_dashboard_data
│       ├── auth/{login,me,logout}  RPC dmp_auth_login + jose JWT
│       ├── ai-explore/·ai-recommend/
│       ├── exports/·campaign-target/·adid-upload/
│       ├── segment-preview/·segment-options/{subcategory,sigoongu,eupmeuandong}/
│       ├── ad-engagement/·amount-bucket/·categories/·cards/
│       ├── membership/·transit/·spending/
│       └── shopping/{route.ts, detail/route.ts}
│
├── components/
│   ├── Dashboard.tsx           탭 셸 — {tab === "media" && <MediaPerformanceTab />}
│   ├── LoginPage.tsx
│   ├── MediaPerformanceTab.tsx 📊 매체 성과 탭 (+ 시각화 토글 4단 배선)
│   ├── CleanMediaCharts.tsx    정제 2D (recharts)        — PR#15
│   ├── Echarts3DMediaCharts.tsx 진짜 3D (ECharts-GL)     — PR#16
│   ├── BizVizMediaCharts.tsx   코스믹 (three.js CDN)     — PR#14
│   ├── AiExplore.tsx · AiExploreTab.tsx
│   ├── ExportHistoryTab.tsx · CardComparisonTab.tsx
│   ├── ShoppingProductsTab.tsx · SpendingTab.tsx
│   ├── MembershipSegment.tsx · TransitSegment.tsx
│   └── BehaviorPlaceholder.tsx
│
├── lib/
│   ├── auth.ts                 jose JWT 발급/검증
│   └── data.ts                 큐브 상수 (PARTNER_MAP 등)
└── types/echarts-gl.d.ts       echarts-gl 타입 선언 (번들 타입 부재 대응)
```

### 의존성
```jsonc
"next": "^14", "react": "^18", "react-dom": "^18",
"@supabase/ssr": "^0.5", "@supabase/supabase-js": "^2",
"jose": "^6.2.1",       // JWT
"swr": "^2.4.0",        // 데이터 페칭
"recharts": "^2",       // 2D 차트
"echarts": "^6.1.0",    // 3D (Apache-2.0)
"echarts-gl": "^2.1.0"  // 3D GL (MIT)
```
> three.js는 **의존성 아님** — BizViz가 CDN(unpkg 0.160) 지연로드 → 번들 무증가

---

## 5. DB 스키마 (Supabase `ihzttwgqahhzlrqozleh` / public)

### 5.1 큐브 (사전집계 — BQ 80억행 → 압축)

| 테이블 | 행수(실측 2026-07-14) | 용도 |
|---|---:|---|
| `de_dmp_cube_apprl_window` | 2,069,043 | 승인 윈도우 |
| `de_dmp_cube_membership` | 880,275 | 멤버십 |
| `de_dmp_cube_shopping_daily` | 721,104 | 쇼핑 일별 |
| `de_dmp_cube_region_detail` | 678,386 | 시도×시군구×성별×연령 |
| `de_dmp_cube_card_category` | 507,153 | 업종×지역×성별×연령 |
| `de_dmp_cube_time_pattern` | 40,781 | 시간대 패턴 |
| `de_dmp_cube_transit` | 35,565 | 대중교통 |
| `de_dmp_cube_amount_bucket` | 28,711 | 금액 구간 |
| `de_dmp_cube_card_by_source` | 20,655 | 카드사별 |
| `de_dmp_cube_demo_region` | 10,251 | 인구·지역 |
| `de_dmp_cube_category` | 9,056 | 카테고리 |
| `de_dmp_cube_device` | 4,175 | 단말 |
| `de_dmp_cube_ad_daily_hour` | 2,160 | 광고 시간대 |
| `de_dmp_cube_ad_daily_type` | 745 | 광고 타입 |
| `de_dmp_cube_membership_platform` | 282 | 멤버십 플랫폼 |
| `de_dmp_cube_ad_daily_os` | 270 | 광고 OS |
| `de_dmp_cube_subway`·`de_dmp_cube_bus`·`de_dmp_cube_audience_cat1` | (미사용/0) | |

### 5.2 운영 테이블

| 테이블 | 행수 | 용도 |
|---|---:|---|
| `de_dmp_audience` | 354,437 | 통합 오디언스 |
| `de_dmp_uploaded_audience` | 199,976 | ADID 업로드 세션 |
| `de_dmp_category_code` | 257 | 카테고리 코드 (⚠️ Q/A/N/M/E/I/S/T/C 의미사전 미확보 — 런컴 요청 대기) |
| `de_dmp_category` | 247 | 카테고리 마스터 |
| `de_admin_credentials` | 129 | 🔑 시크릿 (동적 조회) |
| `de_dmp_target_submissions` | 9 | **P4 런컴 전송 기록** |
| `de_dmp_export_history` | 3 | 내보내기 이력 |
| `de_dmp_users` | 3 | 자체 인증 (bcrypt) |
| `de_dmp_shopping_ads` | 279,394 | 쇼핑 광고 |
| `de_dmp_segment_cube`·`de_dmp_segment_mapping`·`de_dmp_station_map`·`de_dmp_sync_status` | 0~ | 보조 |

> ⚠️ 행수는 **exact `count(*)`** 로만 확인. `pg_stat_user_tables.n_live_tup`은 통계라 부정확
> (예: `de_dmp_uploaded_audience`가 통계상 0인데 실제 199,976행)

### 5.3 주요 RPC

**인증·권한**
- `dmp_auth_login(p_username, p_password)` — bcrypt 검증 → 로그인
- `dmp_check_access(p_email)` · `dmp_get_service_credential(p_service_name)`

**대시보드 (탭별)**
- `dmp_dashboard_data(p_sido, p_sex, p_age_group, p_ym_from, p_ym_to)` — 카드 탭
- `dmp_transit_dashboard(p_cat, p_on_off, p_sido, p_sex, p_age, p_station_id)`
- `dmp_membership_dashboard(p_partner_cd, p_hour, p_dow, p_amt_bucket, p_sex, p_age)`
- `dmp_spending_trend(...)` · `dmp_card_comparison(p_months[, p_ym_from, p_ym_to])`
- `dmp_shopping_products(p_days, p_gender, p_age_group, p_limit, p_date_from, p_date_to)`
- `dmp_shopping_product_detail(p_title, p_days)`
- `dmp_amount_distribution(...)` · `dmp_ad_engagement()` · `dmp_admin_dashboard()`

**세그먼트·오디언스**
- `get_segment_preview(p_segments jsonb, p_cube)` · `get_segment_options()`
- `get_dmp_segment_count(...)` · `get_dmp_segment_breakdown(...)` · `get_dmp_audience_segment(...)`
- `dmp_options_sigoongu(p_sido)` · `dmp_options_eupmeuandong(p_sido, p_sigoongu)`
- `dmp_options_middle_category(p_major)` · `dmp_options_subcategory(p_major, p_middle)`
- `dmp_expand_segment_values(p_seg_key, p_raw_value)` · `dmp_transform_value(...)`

**전송·추출**
- `dmp_extract_ads_ids(p_sex, p_age_group, p_os, p_region, p_major_category, p_middle_category, p_subcategory, p_shop_category, p_upload_session, p_cat1, p_apprl jsonb)`
- `dmp_extract_ads_ids_from_audience(p_table)` — **AI 오디언스 → ADID 추출**
- `dmp_match_uploaded_ads(p_session_id)` · `dmp_upload_audience_count(p_session_id)`
- `dmp_export_list(p_user_id, p_limit)`

**배치·유지보수**
- `dmp_refresh_cube(p_cube_name)` · `dmp_refresh_shopping_batch(p_start, p_end)`
- `dmp_refresh_transit_*` · `dmp_load_transit_batch/full`

---

## 6. 핵심 로직

### 6.1 인증
```
LoginPage → POST /api/auth/login → RPC dmp_auth_login (bcrypt)
                                 → jose JWT 발급 → httpOnly 쿠키
app/page.tsx → GET /api/auth/me → 검증 → Dashboard 렌더
```
> `de_dmp_users` 자체 테이블. **Supabase Auth 아님.**

### 6.2 키 부착 (보안 핵심)
```
클라이언트                    서버 (app/api/*)                  외부
fetch("/api/media?...")  →   X-API-Key 부착 (env)      →  data-worker
                             ↑ 키는 여기서만 존재
```
> `DMP_MCP_API_KEY`에 `NEXT_PUBLIC_` 붙이면 **번들에 유출**. 절대 금지.

### 6.3 매체 성과 탭 (`MediaPerformanceTab.tsx`)

**데이터 계약**
```ts
type MediaRow  = { platform_name; platform_idx; impressions; clicks;
                   conversions; ad_spend; ctr_pct }
type DailyRow  = { date; impressions; clicks; conversions; ad_spend }   // date = "YYYYMMDD"
type AudienceAdRow = { title; platform_name; company_idx;
                       aud_converters; conv_events; points }
```

**조달**
| view | 엔드포인트 | 비고 |
|---|---|---|
| `performance` | `/api/media?view=performance&days=` | 매체 50종 집계 |
| `daily` | `/api/media?view=daily&days=&platform_idx=` | 매체별 필터 가능 |
| `creative-platforms` | `/api/media?view=creative-platforms&days=` | 🔁 배지용 (소재 보유 30매체) |
| `audiences` | `/api/media?view=audiences` | 폐루프 드롭다운 |
| `audience-ads` | `/api/media?view=audience-ads&audience_table=&days=&platform_idx=` | 폐루프 본체 |

**화면 구조**
```
상단: 기간(7/30/90d) · KPI 4종 · 시각화 토글 · [시각화 영역]
하단 2열:
  좌(3fr) 매체 순위 50행 — 노출비중 바 · 행클릭 드릴다운 · 🔁 배지
  우(2fr, sticky) 🔁 폐루프 — 오디언스 선택 → 반응 소재 TOP (좌측 매체 선택 시 자동 필터)
```

### 6.4 시각화 토글 4단

`viz` state: `"current" | "clean" | "gl3d" | "bizviz"` — **기본 `current`**

| 토글 | 컴포넌트 | 스택 | 차트 | 평가 |
|---|---|---|---|---|
| 현재 | (인라인) | div | 미니 바차트 | 빈약 |
| 정제 2D | `CleanMediaCharts` | recharts | 버블(광고비×전환율·크기=노출) · 가로막대 TOP8 · 2D 도넛 · 라인 이중축 | ⭐ **실무 승자** |
| 🧊 3D | `Echarts3DMediaCharts` | echarts-gl | 3D Bar(날짜×매체×노출) · 3D Scatter(광고비×전환율×노출) | 애매 (개선 여지) |
| ✦ BizViz | `BizVizMediaCharts` | three.js CDN | 궤도계·3D바·3D도넛·발광리본 | 발표용 (운영 부적합) |

**공통 규약**
- 전부 `dynamic(..., { ssr: false })` 지연로드 → First Load 158 kB
- **데이터 무연동** — 기존 API 재사용, 스키마 변경 0
- **additive** — 서로 무간섭, 롤백 = 토글 OFF

**3D 원칙**: 3번째 축이 **실제 데이터**일 때만 3D. "2D를 세운 3D 막대/도넛" 금지.
**BizViz 독트린** (`bizspring-inc/bizviz` `verify/README.md` 준수):
MeshBasicMaterial(unlit) · `NoToneMapping` · 조명 0 · 가산합성 halo만(postFX 금지) · 데이터 fog 제외 · §1 정본 hex만

**개선 백로그**: 정제 2D 기본값 승격 / 3D Bar 로그·정규화(매체 규모차로 계단 현상) / 3D Scatter x축 로그(점 뭉침) / BizViz·3D 발표용 분리

### 6.5 폐루프 (오디언스 × 소재)
```
de_dmp_audience(AI 오디언스) × ad_point_transaction_1y(10.5억, type=2 전환)
  → 오디언스별 실제 전환 유발 소재 TOP
```
**매체 2유형** (인사이트 — 빈결과 오진 방지)
- **적립형** (KBPay출첵·BC페이북 등, 상위 볼륨) — title 없는 전환 → **빈결과가 정상**
- **소재형** (디지로카_라방보고머니 등 30개) — 소재 인사이트 원천
> 대표: `response_cat_a` × 라방보고머니 "[SK매직] 라이브 특가" 전환자 7,836

---

## 7. ⚠️ 함정 (신규 합류자 필독)

| 함정 | 증상 | 정답 |
|---|---|---|
| `platform_idx` 연속 아님 | `platform_idx=1` → 0행 | 실제 값(10·19·41·44·9…) 사용 |
| 폐루프 빈결과 | "버그인가?" | 적립형 매체는 title 없음 = **정상** |
| 행수 통계 | `n_live_tup`=0인데 실제 20만행 | exact `count(*)` 만 |
| 시간 | 컨테이너 시계 오차 | BQ `CURRENT_DATE('Asia/Seoul')` |
| `reg_dt` | DATE 캐스팅 실패 | STRING `YYYYMMDD` → `FORMAT_DATE('%Y%m%d', ...)` |
| 콜드 쿼리 | 첫 폐루프 조회 1~2분 | `maxDuration=180` 설정됨. 이후 캐시 1~2s |
| 키 유출 | `NEXT_PUBLIC_DMP_MCP_API_KEY` | 서버 라우트에서만 부착 |
| 매체집합 불일치 | 일별통계에 없는 매체 | 일별통계 ≠ 트랜잭션 매체집합 |

---

## 8. 배포 · 환경

| 항목 | 값 |
|---|---|
| Vercel 프로젝트 | `prj_OMgkiiiTAv27nTrY9YofJaKPF0Iu` |
| Vercel 팀 | Bawee `team_U97Q0Uc7ki1EchHyk9k2GkrO` |
| 도메인 | dmp.bmp.ai (**main push → 자동배포**) |
| data-worker | `data-worker-production-84d4.up.railway.app` |
| Railway | 프로젝트 `46844e9a-51f5-46dd-a8f0-d6098f531d70` · 서비스 `4609ee4a` |
| Supabase | `ihzttwgqahhzlrqozleh` |
| BigQuery | `bizspring-gp.dmp_data` (asia-northeast3) |

### 환경변수
| 이름 | 용도 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 클라 | 공개 (RLS 전제) |
| `DMP_MCP_API_KEY` | data-worker 인증 | 🔒 **서버 전용** |
| `DATA_WORKER_URL` | worker 주소 | 서버 |
| `JWT_SECRET` | jose 서명 | 🔒 서버 전용 |

> 값은 `de_admin_credentials` 동적 조회 또는 PO 문의. **평문 공유·커밋 금지.**

---

## 9. 기여 규약

```bash
git checkout -b feat/<범위>-<요약>
# 작업
npx tsc --noEmit && npx next build      # 둘 다 통과 필수
git diff main..HEAD | grep -iE "ghp_|sk-|password"   # 시크릿 스캔
git push origin feat/...
# → PR 생성 (본문: 배경·구현·안전성·롤백·변경파일)
# → PO(찰스) 머지
```

**원칙**
- 수술적 변경 — 요청 범위 외 금지 / 인접 리팩토링 금지
- 최소 구현 — 선제 추상화 금지
- additive — 신규는 토글·분기로, 기존 무변경, 롤백 = 토글 OFF
- 문서 동기화 — 구조 변경 시 이 문서 + `CLAUDE.md` 갱신

---

## 10. 참조

| 문서 | 위치 |
|---|---|
| 정본 SSOT | [`../CLAUDE.md`](../CLAUDE.md) |
| 사용자 매뉴얼(런컴) | [`./USER-GUIDE.md`](./USER-GUIDE.md) |
| KHub Snapshot | `a05b362d-9818-492a-ae4e-3dfd2357462e` |
| DSP 소스 지도 | `a07b3ad5-df10-4bf4-8eb3-c358829f05c1` |
| STD-SECRET-MGMT | `d6ca4fc6-a8cb-4ca9-87cb-a0515bb71e26` |
| BizViz 디자인 정본 | `bizspring-inc/bizviz` (`BIZVIZ-DESIGN.md` · `verify/README.md`) |

---

*BizSpring Data Engineering · 최종 실측 2026-07-14 (main `737d58d`)*
