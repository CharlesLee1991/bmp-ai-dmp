> 정본: KHub `7f3919f0-9f61-451f-a3f9-d6a261b1f5b0` | 동기화: 2026-08-27 | KHub updated_at: 2026-08-27
> ⚠️ read-only 단방향 미러 — **수정은 KHub에서만**. 본 파일 직접 수정 금지 (RND C8)

# 🚧 먼저 읽을 것 — 건드리면 안 되는 파일

병렬로 같은 파일을 들면 rebase와 충돌로 시간이 녹는다. 손대야 하면 먼저 물어볼 것.

- **구자훈 대표**: `Media3DExplorer.tsx` 등 3D 계열 · PR#50 정본 — 병행 편집 회피
- **머지 권한**: 찰스(PO). AI는 게이트 하 PR까지
- **운영 공유 DB 화면발 직접 UPDATE ⛔** → RPC(SECURITY DEFINER) 경유

그리고 이 길은 벽이다 — 먼저 확인하지 않으면 며칠을 태운다.

- `de_dmp_audience` = bsa 미러 36.9만으로 **전체 모수가 아니다**. 여기만 조인하면 결과가 1/9로 줄어든다 (전체는 feature_adid ∪ bsa = 567만)
- `dmp_extract_ads_ids`는 `{txt: 개행문자열}` 단일 JSON — `count(*)`는 항상 1이다
- Vercel 요청 본문 4.5MB 하드리밋 (안전선 3.5MB)

---

# 🗂️ PLAN-INDEX-bmp-ai-dmp v1.0

> 자산: repo `CharlesLee1991/bmp-ai-dmp` (dmp.bmp.ai) · 표준 STD-TRACK-MASTER-INDEX v1.4 (`ea19f0d5-2e24-4be1-87c8-0e901d8f0a6e`)
> 🔵 인덱스는 **자산 단위**. 어느 방(DMP_RUNCOMM 내부/외부)에서 접속하든 이 인덱스 1벌을 본다.

## 활성 PLAN
| PLAN | 목적 1줄 | 상태 | 소유 | 갱신 | UUID |
|---|---|---|---|---|---|
| PLAN-bmp-ai-dmp-runcomm | 런컴이 화면에서 전체 모수로 매칭·필터해 전송한다 | 🔨 진행 | 이호 | 2026-08-27 | `b3417ade-2e5e-4af0-8779-049039c28e54` |
| (후보) 시각화 승자 승격 | 매체탭 4안 중 기본값 확정 | 미착수 | — | — | — |

## 🚫 이 자산 공통 무접촉 (여기 1곳만 — 각 PLAN 복제 ⛔)
- 구자훈 대표: `Media3DExplorer.tsx` 등 3D 계열 · PR#50 정본 — 병행 편집 회피
- 머지 권한: 찰스(PO). AI는 게이트 하 PR까지
- 운영 DB 화면발 직접 UPDATE ⛔ → RPC 경유

## ⚠️ 지뢰
- `de_dmp_audience` = bsa 미러 36.9만 **전체모수 아님** — 여기만 조인하면 1/9 축소
- `dmp_extract_ads_ids`는 `{txt:개행문자열}` 단일 JSON — `count(*)`=1
- Vercel 요청본문 4.5MB 하드리밋 (안전선 3.5MB)

## PLAN에 안 붙는 단발 잡무
JWT 재로그인 안내(보류) · 임시자산 A/B/C/E 정리(런컴 적용 확인 후)
