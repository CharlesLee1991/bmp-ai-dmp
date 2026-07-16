# 프론트엔드 버그 로그

> CL UI/UX 표준 이식(프리미엄 리테마 + 다크모드) 작업 중 발견한 버그·개선점.
> 정본 표준: `docs/DMP_UI_UX_표준.md`

## 검증 결과 (Playwright, 2026-07-16)
- ✅ 로그인 라이트/다크, 카드 대시보드 라이트/다크, 전송 모달+스크림, AI탐색(배지), 멤버십 — 정상
- ✅ 관리자 탭 전수 다크 렌더, **페이지 에러 0건**, `npx tsc` + `npx next build` 통과

## 일괄 수정 완료 (2026-07-16, 2차)

| # | 항목 | 처리 |
|---|---|---|
| 1 | **인콘텐츠 이모지 → lucide (§9)** | ✅ 전 컴포넌트 섹션헤더·버튼·라벨 이모지를 lucide 라인 아이콘으로 전환. 탭 아이콘 SSOT(`TAB_ICON`) |
| 2 | **상태배지 유채색 틴트 다크 대비 (§7)** | ✅ `--badge-{tone}-bg/fg` 8톤 페어 토큰 도입(globals.css), 하드코딩 틴트쌍 → 토큰 전환. 보라 AI/캠페인 패널 → card+violet 배지 |
| 3 | **echarts** | ✅ Echarts3D 토큰화 확인. BizViz는 **브랜드 격리 다크(도크트린)** → 정본 hex 유지 + 코드모드 회귀(`ink/dim`) 복구 |
| 4 | **모달 스크림 (§8.1)** | ✅ Dashboard·Shopping 오버레이 → `var(--scrim)` + backdrop-blur (라이트=검정저알파 / 다크=elevation) |

## 남은 저우선 폴리시 (선택)

| 위치 | 내용 | 판단 |
|---|---|---|
| Dashboard `filterParts` | `🛒💰🏦📡📱🏷️📤` 이모지 잔존 | **의도적** — 프리뷰 표시 + 전송 세그먼트명·AI API에 투입되는 dual-use 문자열. 제거 시 데이터/전송명 변경 → 백엔드 영향으로 미변경 |
| ShoppingProductsTab | `CAT_EMOJI` 카테고리 데이터맵, `🥇🥈🥉` 순위 메달 | 데이터/로우 라벨 — 값별 아이콘 매핑 필요, 저우선 |
| Spending/CardComparison | `rgba(0,0,0,.04~.06)` 랭크원·트랙 배경 | 다크에서 옅음(가시성 낮음). 배지/패널 아님 → 별도 폴리시 대상 |
| Membership/Transit | 금·은·동 메달 metallic hex (#EAB308/#94A3B8/#B45309) | 토큰에 금속색 없음 — metallic 리터럴이 정직한 표현 |
| Transit | 🟢/🔴 승하차 칩 색상 큐 상실(라벨만) | 색 복원 시 Chip에 color prop 필요, 저우선 |
