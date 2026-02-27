# DMP Audience Explorer

> BizSpring DMP 오디언스 분석 대시보드  
> Supabase Cube Engine · BQ 80억행 → 141만행 · 9큐브

## 🚀 배포 (Vercel)

### 방법 1: CLI (권장)
```bash
npm i -g vercel
cd dmp-dashboard
vercel
```

### 방법 2: GitHub → Vercel
1. GitHub repo 생성 후 push
2. [vercel.com](https://vercel.com) → Import Project → 해당 repo 선택
3. Framework: Next.js 자동 감지 → Deploy

### 방법 3: Vercel Dashboard
1. vercel.com → New Project → Upload
2. 이 폴더를 드래그앤드롭

## 📊 현재 기능 (Phase A — 정적)

| 기능 | 상태 |
|------|------|
| 시도 필터 (17개 시도) | ✅ |
| 성별 필터 (남/여/전체) | ✅ |
| 연령 필터 (10대~60대+) | ✅ |
| 성별 비율 도넛 차트 | ✅ |
| 연령별 바 차트 | ✅ |
| 인구 피라미드 | ✅ |
| 업종 TOP 12 | ✅ |
| 지역별 랭킹 (서울=구별) | ✅ |
| 반응형 레이아웃 | ✅ |

## 🗺️ 로드맵 (Phase B → API 연동)

### Phase B-1: Supabase API 연동
```
정적 데이터 → segment-preview Edge Function 실시간 쿼리
- 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY
- API Route: /api/cube/[cubeName] → Supabase RPC 호출
- 업종 × 지역 크로스 필터 활성화
```

### Phase B-2: 인증 + 멀티테넌트
```
- Supabase Auth 연동 (OAuth / Magic Link)
- tenant_code 기반 데이터 격리
- 대시보드 접근 권한 관리
```

### Phase B-3: 실시간 갱신
```
- ISR (Incremental Static Regeneration) → revalidate: 3600
- 또는 SWR/React Query로 클라이언트 사이드 갱신
- DMP-SYNC 야간배치 완료 시 Webhook → revalidate 트리거
```

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Charts**: Recharts
- **Font**: Pretendard
- **Data**: Supabase 큐브 (de_dmp_cube_*)
- **Deploy**: Vercel

## 📁 프로젝트 구조

```
dmp-dashboard/
├── app/
│   ├── globals.css      # 글로벌 스타일
│   ├── layout.tsx       # 루트 레이아웃 (메타데이터)
│   └── page.tsx         # 홈페이지
├── components/
│   └── Dashboard.tsx    # 메인 대시보드 (클라이언트 컴포넌트)
├── lib/
│   └── data.ts          # 큐브 데이터 (Phase B에서 API 전환)
├── vercel.json          # Vercel 설정
├── next.config.js
├── tsconfig.json
└── package.json
```

## 데이터 소스

| 큐브 | 행 수 | 용도 |
|------|-------|------|
| region_detail | 330,000 | 시도×시군구×성별×연령 |
| card_category | 280,000 | 업종×지역×성별×연령 |
| transit | 669,000 | 대중교통×역×성별×연령 |
| audience | 358,000 | 통합 오디언스 |
| + 5 추가 큐브 | ~100,000 | 금액, OS, 시간대 등 |

---

*BizSpring Data Engineering · 2026.02*
