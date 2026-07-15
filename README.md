# DMP Audience Explorer

> BizSpring AI DMP 오디언스 분석·활용 플랫폼 (런컴 납품)
> 운영: **https://dmp.bmp.ai** · Next.js 14 · Vercel 자동배포

행동 데이터(카드·교통·멤버십·쇼핑)로 오디언스를 탐색/생성하고, AI 반응예측 오디언스를 런컴 광고 지면으로 전송하며, 그 성과를 폐루프로 회수합니다.

---

## 📖 문서

| 문서 | 대상 | 내용 |
|---|---|---|
| **[CLAUDE.md](CLAUDE.md)** 🔱 | 개발자·AI 에이전트 | **정본 SSOT** — 정본 규칙·보안·워크플로 (개발 시작 전 필독) |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** 📖 | 공동개발자 | 구조·DB 스키마·RPC·핵심 로직·함정 |
| **[docs/USER-GUIDE.md](docs/USER-GUIDE.md)** 📘 | 사용자 | 화면 사용법·전송 절차·FAQ |
| [AGENTS.md](AGENTS.md) | Cursor/Codex | CLAUDE.md 미러 |

---

## 🚀 개발 시작

```bash
npm install
cp .env.example .env.local     # 값은 PO 문의 (평문 공유 금지)
npm run dev                     # → localhost:3000

npx tsc --noEmit                # 타입체크
npx next build                  # 배포 전 필수
```

---

## 🏗 구조

```
BigQuery(dmp_data) ─→ data-worker(Railway/FastAPI) ─┐
                                                    ├→ app/api(프록시) → components(화면)
Supabase(RPC 큐브) ────────────────────────────────┘
                                                    └→ 런컴 API(at.runcomm)  ※유일 반출처
```

- **큐브 계열**(카드/교통/멤버십/쇼핑) = Supabase RPC 직접
- **매체·폐루프·AI 계열** = data-worker 경유 (BQ 원천)
- **모든 외부 키는 `app/api/*` 서버 라우트에서만 부착** (클라 노출 0)

---

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router) · React 18 · TypeScript 5
- **Data**: Supabase (`@supabase/ssr`) · SWR
- **Auth**: 자체 테이블(`de_dmp_users`, bcrypt) + jose JWT ※ Supabase Auth 아님
- **Charts**: Recharts (2D) · ECharts + ECharts-GL (3D) · three.js (CDN, BizViz)
- **Deploy**: Vercel (main push → 자동배포)

---

## 📑 주요 화면

| 탭 | 내용 |
|---|---|
| 💳 카드 | 카드 소비 기반 오디언스 (기본) |
| 🚇 지하철 · 🚌 버스 | 대중교통 이용 패턴 |
| 🎟️ 멤버십 | 제휴사·시간대·금액대 |
| 🧪 AI 탐색 | AI 오디언스 자동 발굴 (탐색→미리보기→승인) |
| 📋 전송 이력 | 전송 목록·상태 |
| 📊 매체 성과 | 매체별 성과 + 🔁 폐루프(오디언스×소재) + 시각화 토글 4단 |
| 💳 소비 트렌드 · 🏦 카드사 비교 · 🛒 쇼핑상품 | 부가 분석 |

> 탭은 계정 role(`admin` / `advertiser`)에 따라 노출이 달라집니다.

---

## ⚠️ 개발 전 필독

- **오디언스 외부 반출은 런컴(`at.runcomm`) 단일 경로만** — 제3자 반출 금지 (2026-07-12 PO 결정)
- `DMP_MCP_API_KEY`에 `NEXT_PUBLIC_` 접두사 금지 (번들 유출)
- 행수는 exact `count(*)` 만 — 통계(`n_live_tup`) 부정확
- 기타 함정 → [docs/ARCHITECTURE.md §7](docs/ARCHITECTURE.md)

---

## 🤝 기여

브랜치 → `tsc --noEmit` + `next build` 통과 → 시크릿 스캔 → PR → PO(찰스) 머지.
상세 규약 → [docs/ARCHITECTURE.md §9](docs/ARCHITECTURE.md)

---

*BizSpring Data Engineering*
