# 프론트엔드 버그 로그 (일괄 수정 대기)

> CL UI/UX 표준 이식(프리미엄 리테마 + 다크모드) 작업 중 발견한 버그·개선점을 여기 모아둔다.
> **지금은 수정하지 않고 기록만.** 나중에 몰아서 수정한다. (사용자 지시 2026-07-16)
> 상태: `[ ]` 미수정 · `[~]` 부분 · `[x]` 수정됨

## 발견 목록

| # | 위치 | 증상 | 비고 |
|---|---|---|---|
| _(작업 중 채워짐)_ | | | |

## 리테마 관련 관찰 (수정 아님, 참고)
- 구조색(표면 bg/card/border, 텍스트 text/sub, 브랜드 accent, 시맨틱 success/danger/male/female)은 265곳 토큰화 완료 → 라이트/다크 정상 반전.
- 다크에서 **토큰 미적용으로 남은 유채색 틴트**(=라이트 톤 유지, 다크에서 밝은 박스로 보일 수 있음). **일괄 수정 대기**:

| 위치 | 남은 하드코딩 | 성격 |
|---|---|---|
| Dashboard (캠페인/AI 패널) | `#7c3aed·#5b21b6·#f5f3ff·#ede9fe·#c4b5fd·#eef2ff·#3730a3·#a855f7·#06b6d4·#faf5ff` | 보라/청록 장식 그라디언트 패널 — 다크에서 밝게 뜸 |
| AiExplore / AiExploreTab | `#0369a1·#b91c1c·#047857·#e0f2fe·#7dd3fc·#0c4a6e·#f0f9ff…` | 상태배지(파랑/빨강/초록) 라이트 틴트쌍 |
| ShoppingProductsTab | `#f97316·#06b6d4·#84cc16·#e11d48·#dcfce7·#fee2e2·#ede9fe…` | 카테고리/증감 배지 유채색 |
| SpendingTab / CardComparisonTab | `#eab308·#60a5fa·#f43f5e·#d946ef·#ffb800·#00a651·#af52de…` | 차트 시리즈 & 배지 (시리즈는 다크 OK, 배지 틴트만 폴리시 대상) |
| BehaviorPlaceholder | `#dcfce7·#166534·#fef9c3·#854d0e·#fee2e2·#991b1b` | 상태 배지 라이트 틴트쌍 |
| 차트 시리즈 배열 (CleanMediaCharts SERIES 등) | `#7b61ff·#e8a838·#e0567a·#3aa0c4·#4a90e2…` | **의도된 데이터 인코딩** — 다크 정상, 수정 불필요 |

> 방침: 상태배지 틴트쌍은 `color-mix(in srgb, var(--semantic) 15%, transparent)` + 텍스트 `var(--semantic)` 로 일괄 전환 예정(라이트/다크 페어). 차트 시리즈 배열은 유지.
