# bmp-ai-dmp — Agent Guide (CLAUDE.md)

> 이 파일 하나로 이 repo 개발을 시작할 수 있다. 사람·Claude·Cursor·Codex 공통 진입점.
> 정본 충돌 시: 이 repo > KHub. 상위 표준: bizspring-standards / STD-GITHUB-CONTEXT-LAYER v1.1.
> 최종 갱신: 2026-07-14 (main `737d58d`)

## 전사 지형도·표준 (먼저 확인)
- 전사 구조/repo 지도 → bizspring-standards/docs/REPO-TOPOLOGY.md (KHub 84a5a172)
- 전사 표준(AP/골든/PGE/헌법/보안) → bizspring-standards/standards/*

---

## 1. WHAT — 이 repo는

- **제품**: DMP Audience Explorer — 런컴(Runcomm) 납품 AI DMP 대시보드. 카드·교통·멤버십·쇼핑 행동 데이터로 오디언스를 탐색/생성하고, AI 반응예측 오디언스를 런컴 광고 지면으로 전송하며, 그 성과를 폐루프로 회수한다.
- **소관 방 / project_code**: `DMP_RUNCOMM` (내부 DMP_RUNCOMM ↔ 외부 CLIENT_RUNCOMM 공유)
- **KHub 마스터 정본**: Snapshot `a05b362d-9818-492a-ae4e-3dfd2357462e` (Full UUID로만 조회)
- **스택 / 배포**: Next.js 14 (App Router) · React 18 · TypeScript 5 → **Vercel main 자동배포 → dmp.bmp.ai**
- **📖 상세 문서**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 구조·DB·로직 (공동개발 진입점)

### 3계층 구조 (한 눈에)
```
BigQuery(bizspring-gp.dmp_data) ─→ data-worker(Railway/FastAPI) ─┐
                                                                 ├→ 이 repo(app/api 프록시) → components(화면)
Supabase(ihzttwgqahhzlrqozleh) ─→ RPC 직접 호출 ─────────────────┘
```
- **큐브 계열**(카드/교통/멤버십/쇼핑) = Supabase RPC 직접
- **매체·폐루프·AI 계열** = data-worker 경유 (BQ 원천)

---

## 2. 🔱 정본 규칙 (절대 — 추측 개발 금지)

프로세스마다 ✅정본 / ⛔레거시 / ⚠️함정 / 🔗KHub UUID 명시. 정본 표기 없으면 "모른다" → PO 확인.

| 프로세스 | 정본 | 비고 |
|---|---|---|
| 오디언스 외부 전송 | ✅ **런컴(`at.runcomm`) 단일 경로만** | ⛔ 크리테오 등 제3자 반출 **금지** (2026-07-12 PO 결정) |
| 전송 파이프라인 | ✅ EF `dmp-target-export` v20 → RPC(allowlist) → S3(adtree) → 런컴 API → `de_dmp_target_submissions` | |
| 매체 성과 원천 | ✅ data-worker `/dmp/media/*` (touchAd 일별통계 × platform 마스터) | ⛔ 대시보드에서 BQ 직접 조회 금지 |
| 폐루프 원천 | ✅ `ad_point_transaction_1y` (10.5억행, title·company_idx·platform_idx **내장**) | ⚠️ 런컴 협조 불필요 — 자체 해결 |
| 인증 | ✅ RPC `dmp_auth_login` (bcrypt) + jose JWT 쿠키 | ⚠️ Supabase Auth 아님 |
| 시각화 | ✅ 토글 4단 (기본=`current`) — `docs/ARCHITECTURE.md` §6 | ⚠️ 기본값 변경은 PO 승인 |
| 시간 판정 | ✅ BQ 서버시각 `SELECT CURRENT_DATE('Asia/Seoul')` | ⚠️ 컨테이너 시계 신뢰 금지 |
| 행수 | ✅ exact `count(*)` 만 | ⚠️ `n_live_tup`(통계) 오차 큼 — 0으로 나와도 실제 20만행 사례 |

### ⚠️ 알려진 함정 (신규 합류자 필독)
- `de_dmp_users` = **자체 인증 테이블**. Supabase Auth 아님.
- `platform_idx`는 **연속 아님** (실제 10·19·41·44·9 …). `1`로 테스트하면 0행 반환.
- 매체 2유형: **적립형**(볼륨 큼, title 없음 → 폐루프 빈결과가 **정상**) vs **소재형**(30개, 소재 인사이트 원천).
- 좌측 일별통계 매체집합 ≠ 트랜잭션 매체집합 (예: 라방보고머니 idx=45는 일별통계에 없음).
- `touchad_renewal_tb_advertise_transaction.reg_dt` = **STRING `YYYYMMDD`** → `FORMAT_DATE('%Y%m%d', ...)` 비교 (DATE 캐스팅 금지).
- 폐루프 첫 콜드 쿼리 = 최대 1~2분 (10.5억 스캔). `maxDuration = 180` 설정됨.

---

## 3. 🔒 보안 베이스라인 (5계명 — 고정)
1. `.env` 커밋 금지 (`.gitignore` 포함)
2. 시크릿은 secrets 테이블 / Actions secret만 — repo·문서 평문 키 금지
3. push 전 시크릿 스캔 통과 (guard.yml CI)
4. anon key 사용 = RLS 필수 전제
5. PAT fine-grained + 최소 scope + 90일 로테이션

### 추가 (이 repo 고유)
- **모든 외부 키는 서버측 `app/api/*` 라우트에서만 부착.** 클라이언트 번들 유출 금지.
  → `DMP_MCP_API_KEY`에 `NEXT_PUBLIC_` 접두사 **절대 금지**
- 시크릿 조회 = Supabase `de_admin_credentials` **동적 조회** (STD-SECRET-MGMT `d6ca4fc6-a8cb-4ca9-87cb-a0515bb71e26`)
- `github_pat` = **classic `ghp_`** 정확매칭. ⛔ `github_pat_btm_agent_poc`(fine-grained)는 이 repo 권한 없음.
- 토큰 정리는 **remote URL만** (`git remote set-url origin`). ⛔ `.git/config` 통삭제 금지.

---

## 4. HOW — 항상 적용 (고정)
- 수술적 변경만 / 최소 구현 (요청 범위 외 변경 금지)
- main 자동반영 repo면 별도 브랜치 + push 직전 git fetch
- push 시: 빌드 통과 + 시크릿 스캔 통과

### 이 repo 워크플로
```bash
npm install
npm run dev          # localhost:3000
npx tsc --noEmit     # 타입체크
npx next build       # 배포 전 필수 (Vercel과 동일 조건)
```
- **머지 권한**: PO(찰스) 컨펌 머지 원칙 → 브랜치 push + PR 생성까지가 기본
  (2026-07-12 PR#10~13, 07-14 PR#14~16 = 명시 승인 하 직접 머지 선례)
- **커밋**: `feat:` / `fix:` / `docs:` + 한글 본문. PR 본문에 배경·안전성·롤백 명시
- **신규 시각화/탭 추가 시**: additive 원칙 — 기존 무변경, 토글/분기로 추가, 롤백 = 토글 OFF

---

## 5. 동기화
- **AGENTS.md** = 이 파일 동등본 (Cursor/Codex) — 수정은 **CLAUDE.md에서** 하고 재동기화
- 상위 표준: bizspring-standards / STD-GITHUB-CONTEXT-LAYER v1.1
- 📖 상세 구조·DB·로직 → `docs/ARCHITECTURE.md`
- 📘 사용자 매뉴얼(런컴 전달용) → `docs/USER-GUIDE.md`
- 🎨 프론트 디자인 표준(SSOT) → `docs/DMP_UI_UX_표준.md` (토큰·다크모드·버튼톤·아이콘·차트 규칙)
