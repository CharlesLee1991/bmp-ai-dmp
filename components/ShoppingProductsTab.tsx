"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, Legend
} from "recharts";
import { fmt } from "@/lib/data";

const P = {
  bg: "#f5f7fa", card: "#ffffff", border: "#e2e8f0",
  text: "#1a202c", sub: "#718096",
  accent: "#0d9488", green: "#10b981",
  glow: "rgba(13,148,136,0.08)",
  up: "#10b981", down: "#ef4444", flat: "#94a3b8"
};

const CHART_COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#14b8a6", "#6366f1", "#f97316", "#a855f7", "#e11d48", "#22c55e"];

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmtAmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "조";
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(0) + "만";
  return n.toLocaleString();
}

/* ── 2-LEVEL CATEGORIZE ── */
function categorize(title: string): { major: string; minor: string } {
  const t = title.toLowerCase();
  // 유제품
  if (/우유/.test(t)) return { major: "유제품", minor: "우유" };
  if (/요거트|요구르트|엔요/.test(t)) return { major: "유제품", minor: "요거트" };
  if (/치즈|버터|크림|저지방/.test(t)) return { major: "유제품", minor: "유가공" };
  // 과일
  if (/딸기/.test(t)) return { major: "과일", minor: "딸기" };
  if (/바나나/.test(t)) return { major: "과일", minor: "바나나" };
  if (/블루베리|체리/.test(t)) return { major: "과일", minor: "베리류" };
  if (/사과|포도|귤|오렌지|수박|참외|멜론|키위|망고|자두|복숭아|레몬|라임|감$|배$/.test(t)) return { major: "과일", minor: "과일기타" };
  // 채소
  if (/양파|대파|마늘|깐마늘|쪽파|부추/.test(t)) return { major: "채소", minor: "양념채소" };
  if (/상추|시금치|양상추|배추|청경채|봄동|알배기|깻잎|양배추|루꼴라/.test(t)) return { major: "채소", minor: "엽채류" };
  if (/당근|감자|고구마|무$/.test(t)) return { major: "채소", minor: "근채류" };
  if (/오이|고추|애호박|가지|토마토|파프리카|피망|옥수수/.test(t)) return { major: "채소", minor: "과채류" };
  if (/버섯|팽이|느타리|표고/.test(t)) return { major: "채소", minor: "버섯류" };
  if (/콩나물|숙주|브로콜리|미나리|셀러리|새싹|쑥갓/.test(t)) return { major: "채소", minor: "채소기타" };
  // 라면/면류
  if (/사발면|컵라면|컵면/.test(t)) return { major: "라면/면류", minor: "컵라면" };
  if (/라면|신라면|안성탕면|짜파게티|육개장|너구리|진라면|불닭|열라면|짬뽕|참깨라면|비빔면/.test(t)) return { major: "라면/면류", minor: "봉지라면" };
  if (/칼국수|쫄면|냉면|국수|당면|스파게티면/.test(t)) return { major: "라면/면류", minor: "생면/건면" };
  // 음료/생수
  if (/생수|샘물|삼다수|탐사수|스파클/.test(t)) return { major: "음료/생수", minor: "생수" };
  if (/콜라|사이다|탄산|코카/.test(t)) return { major: "음료/생수", minor: "탄산음료" };
  if (/주스|이온음료|음료|게토레이|파워에이드|비타500|에너지드링크|식혜|수정과|매실|포카리/.test(t)) return { major: "음료/생수", minor: "음료기타" };
  // 커피
  if (/믹스커피|맥심|카누/.test(t)) return { major: "커피", minor: "믹스커피" };
  if (/커피|네스카페|아메리카노|라떼|에스프레소|콜드브루/.test(t)) return { major: "커피", minor: "커피기타" };
  // 간식/과자
  if (/빼빼로|오예스|초코파이|초콜릿|파슐랭|파슬링/.test(t)) return { major: "간식/과자", minor: "초콜릿/파이" };
  if (/과자|새우깡|감자깡|포카칩|프링글스|꼬깔콘|에이스|누룽지|스낵|칩$/.test(t)) return { major: "간식/과자", minor: "스낵" };
  if (/쿠키|비스킷|웨하스|크래커|다이제/.test(t)) return { major: "간식/과자", minor: "쿠키/비스킷" };
  if (/젤리|사탕|껌|캔디/.test(t)) return { major: "간식/과자", minor: "캔디/젤리" };
  if (/케이크|파이|타르트|도넛|빵$|모닝빵|식빵|모닝롤|마카롱/.test(t)) return { major: "간식/과자", minor: "빵/베이커리" };
  // 가공식품
  if (/두부/.test(t)) return { major: "가공식품", minor: "두부" };
  if (/어묵|오뎅|맛살|크래미/.test(t)) return { major: "가공식품", minor: "어묵/맛살" };
  if (/만두|교자/.test(t)) return { major: "가공식품", minor: "만두" };
  if (/냉동|피자|치킨|돈까스|탕수육|볶음밥/.test(t)) return { major: "가공식품", minor: "냉동식품" };
  if (/김$|김밥/.test(t)) return { major: "가공식품", minor: "김/김밥" };
  if (/햇반|오뚜기밥|오뚜기 밥/.test(t)) return { major: "가공식품", minor: "즉석밥" };
  if (/소시지|햄$|샌드위치햄|베이컨|스팸|참치캔|참치|통조림|비비고|사골|곰탕/.test(t)) return { major: "가공식품", minor: "가공기타" };
  if (/핫도그|순대|떡볶이|떡$/.test(t)) return { major: "가공식품", minor: "분식" };
  // 달걀
  if (/계란|대란|중란|소란|달걀|왕란|특란|반숙란|메추리|훈제란|구운란/.test(t)) return { major: "달걀", minor: "달걀" };
  // 조미료/양념
  if (/간장|된장|고추장|쌈장/.test(t)) return { major: "조미료/양념", minor: "장류" };
  if (/참기름|들기름|올리브유|콩기름|식용유/.test(t)) return { major: "조미료/양념", minor: "오일" };
  if (/케첩|마요네즈|마요네스|소스|드레싱|참치액|굴소스/.test(t)) return { major: "조미료/양념", minor: "소스" };
  if (/맛술|소금|설탕|식초|후추|카레|양념|조미료|미림/.test(t)) return { major: "조미료/양념", minor: "양념기타" };
  // 곡물/시리얼
  if (/쌀$|잡곡|현미|찹쌀|보리|귀리|오트밀|시리얼|그래놀라/.test(t)) return { major: "곡물/시리얼", minor: "곡물" };
  // 정육
  if (/삼겹살|목살|한우|정육|안심|등심|소고기|국거리/.test(t)) return { major: "정육", minor: "소/돼지" };
  if (/닭고기|닭볶음|닭/.test(t)) return { major: "정육", minor: "닭/오리" };
  if (/오리/.test(t)) return { major: "정육", minor: "닭/오리" };
  if (/갈비/.test(t)) return { major: "정육", minor: "소/돼지" };
  // 비식품
  if (/갤럭시|삼성|아이폰|보호필름|휴대폰|충전기|이어폰|케이블|배터리|액정|마우스|키보드/.test(t)) return { major: "전자기기", minor: "전자기기" };
  if (/실내화|의류|신발|양말|속옷|티셔츠|바지|원피스/.test(t)) return { major: "패션/아동", minor: "패션/아동" };
  if (/화장지|롤화장지|휴지|키친타올|물티슈/.test(t)) return { major: "생활용품", minor: "화장지/티슈" };
  if (/세제|세탁|세정제|섬유유연|수세미|탈취|방향제/.test(t)) return { major: "생활용품", minor: "세제/청소" };
  if (/샴푸|린스|바디워시|로션|립밤|세타필|바세린/.test(t)) return { major: "생활용품", minor: "바디/스킨" };
  if (/칫솔|치약|구강청결제|가그린|리스테린|핸드워시|손세정/.test(t)) return { major: "생활용품", minor: "구강/위생" };
  if (/배변패드|펫|강아지|고양이/.test(t)) return { major: "생활용품", minor: "반려동물" };
  return { major: "기타", minor: "기타" };
}

const FOOD_CATEGORIES = ["유제품", "과일", "채소", "라면/면류", "음료/생수", "커피", "간식/과자", "가공식품", "달걀", "조미료/양념", "곡물/시리얼", "정육"];

const CAT_ICONS: Record<string, string> = {
  "유제품": "🥛", "과일": "🍎", "채소": "🥬", "라면/면류": "🍜", "음료/생수": "🥤", "커피": "☕",
  "간식/과자": "🍪", "가공식품": "🥫", "달걀": "🥚", "조미료/양념": "🧂", "곡물/시리얼": "🌾", "정육": "🥩",
  "전자기기": "📱", "패션/아동": "👟", "생활용품": "🧹", "기타": "📦",
};

const CAT_COLORS: Record<string, { bg: string; fg: string }> = {
  "유제품": { bg: "#e0f2fe", fg: "#0284c7" }, "과일": { bg: "#fef3c7", fg: "#d97706" },
  "채소": { bg: "#dcfce7", fg: "#16a34a" }, "라면/면류": { bg: "#fee2e2", fg: "#dc2626" },
  "음료/생수": { bg: "#e0e7ff", fg: "#4f46e5" }, "커피": { bg: "#fde68a", fg: "#92400e" },
  "간식/과자": { bg: "#fff7ed", fg: "#c2410c" }, "가공식품": { bg: "#f3e8ff", fg: "#7c3aed" },
  "달걀": { bg: "#fefce8", fg: "#a16207" }, "조미료/양념": { bg: "#fdf2f8", fg: "#a21caf" },
  "곡물/시리얼": { bg: "#ecfdf5", fg: "#047857" }, "정육": { bg: "#fef2f2", fg: "#b91c1c" },
  "전자기기": { bg: "#ede9fe", fg: "#6d28d9" }, "패션/아동": { bg: "#fce7f3", fg: "#db2777" },
  "생활용품": { bg: "#f0fdf4", fg: "#15803d" }, "기타": { bg: "#f1f5f9", fg: "#64748b" },
};

const GENDER_OPTIONS = [
  { id: "", label: "전체" }, { id: "M", label: "남성" }, { id: "F", label: "여성" },
];
const AGE_OPTIONS = [
  { id: "", label: "전체" }, { id: "10s", label: "10대" }, { id: "20s", label: "20대" },
  { id: "30s", label: "30대" }, { id: "40s", label: "40대" }, { id: "50s", label: "50대" }, { id: "60s+", label: "60대+" },
];
const PERIOD_OPTIONS = [
  { id: 7, label: "1주" }, { id: 14, label: "2주" }, { id: 28, label: "4주" },
];

export default function ShoppingProductsTab() {
  const [subView, setSubView] = useState<"category" | "nonfood">("category");
  const [days, setDays] = useState(7);
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"cnt" | "revenue" | "avg_price" | "change">("cnt");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (useCustom && customFrom && customTo) {
    params.set("from", customFrom); params.set("to", customTo);
  } else { params.set("days", String(days)); }
  if (gender) params.set("gender", gender);
  if (ageGroup) params.set("age_group", ageGroup);

  const { data, isLoading } = useSWR(`/api/shopping?${params}`, fetcher, {
    revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true
  });

  const ok = data?.success === true;
  const summary = data?.summary;
  const products: { title: string; cnt: number; revenue: number; avg_price: number; prev_cnt: number }[] = ok ? data.top_products || [] : [];
  const dailyTrend: { dt: string; cnt: number; revenue: number; products: number }[] = ok ? data.daily_trend || [] : [];
  const priceDist: { price_range: string; sort_order: number; cnt: number; revenue: number }[] = ok ? data.price_distribution || [] : [];
  const platforms: { platform_idx: number; platform_name: string; cnt: number; revenue: number; avg_price: number }[] = ok ? data.platform_summary || [] : [];

  /* enrich all products with 2-level category */
  const allEnriched = useMemo(() => {
    return products.map(p => {
      const change = p.prev_cnt > 0
        ? Math.round(((p.cnt - p.prev_cnt) / p.prev_cnt) * 100)
        : (p.prev_cnt === 0 && p.cnt > 0 ? 999 : 0);
      const cat = categorize(p.title);
      return { ...p, change, major: cat.major, minor: cat.minor, isNew: p.prev_cnt === 0 };
    });
  }, [products]);

  /* ── VIEW A: category aggregation ── */
  const categoryStats = useMemo(() => {
    const map = new Map<string, { cnt: number; revenue: number; products: number }>();
    allEnriched.forEach(p => {
      const s = map.get(p.major) || { cnt: 0, revenue: 0, products: 0 };
      s.cnt += p.cnt; s.revenue += p.revenue; s.products += 1;
      map.set(p.major, s);
    });
    return Array.from(map.entries())
      .map(([major, s]) => ({ major, ...s }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [allEnriched]);

  const totalCategoryCnt = categoryStats.reduce((s, c) => s + c.cnt, 0);

  const minorStats = useMemo(() => {
    if (!selectedMajor) return [];
    const map = new Map<string, { cnt: number; revenue: number; products: number }>();
    allEnriched.filter(p => p.major === selectedMajor).forEach(p => {
      const s = map.get(p.minor) || { cnt: 0, revenue: 0, products: 0 };
      s.cnt += p.cnt; s.revenue += p.revenue; s.products += 1;
      map.set(p.minor, s);
    });
    return Array.from(map.entries())
      .map(([minor, s]) => ({ minor, ...s }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [allEnriched, selectedMajor]);

  const categoryProducts = useMemo(() => {
    let list = selectedMajor
      ? allEnriched.filter(p => p.major === selectedMajor)
      : allEnriched;
    if (search) list = list.filter(p => p.title.includes(search));
    return [...list].sort((a, b) => b.cnt - a.cnt);
  }, [allEnriched, selectedMajor, search]);

  /* ── VIEW B: non-food only ── */
  const nonFoodProducts = useMemo(() => {
    let list = allEnriched.filter(p => !FOOD_CATEGORIES.includes(p.major));
    if (search) list = list.filter(p => p.title.includes(search));
    return [...list].sort((a, b) => {
      if (sortBy === "cnt") return b.cnt - a.cnt;
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "avg_price") return b.avg_price - a.avg_price;
      return b.change - a.change;
    });
  }, [allEnriched, search, sortBy]);

  const nonFoodSummary = useMemo(() => {
    const totalCnt = nonFoodProducts.reduce((s, p) => s + p.cnt, 0);
    const totalRev = nonFoodProducts.reduce((s, p) => s + p.revenue, 0);
    return {
      total_purchases: totalCnt,
      total_revenue: totalRev,
      unique_products: nonFoodProducts.length,
      avg_price: totalCnt > 0 ? Math.round(totalRev / totalCnt) : 0,
    };
  }, [nonFoodProducts]);

  const totalPlatformCnt = platforms.reduce((s, p) => s + p.cnt, 0);
  const elapsedMs = data?.elapsed_ms;
  const period = data?.period;

  /* Product detail modal */
  const { data: detailData, isLoading: detailLoading } = useSWR(
    selectedProduct ? `/api/shopping/detail?title=${encodeURIComponent(selectedProduct)}&days=30` : null,
    fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const detail = detailData?.success ? detailData : null;

  function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button onClick={onClick} style={{
        padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 400,
        cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`,
        transition: "all .15s", userSelect: "none",
        background: active ? P.glow : "transparent", color: active ? P.accent : P.sub
      }}>{label}</button>
    );
  }

  /* ── Shared product table renderer ── */
  function ProductTable({ items, maxH = 500 }: { items: typeof allEnriched; maxH?: number }) {
    if (items.length === 0) return (
      <div style={{ textAlign: "center", padding: 60, color: P.sub }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>상품 없음</div>
      </div>
    );
    return (
      <div style={{ maxHeight: maxH, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: 36 }}>#</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>상품명</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", width: 60 }}>카테고리</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#475569", width: 60 }}>건수</th>
              <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#475569", width: 70 }}>WoW</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#475569", width: 70 }}>매출</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#475569", width: 70 }}>평균가</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => {
              const cc = CAT_COLORS[p.major] || CAT_COLORS["기타"];
              const isUp = !p.isNew && p.change > 0;
              const isDown = !p.isNew && p.change < 0;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setSelectedProduct(p.title)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "6px 12px", fontWeight: 800, color: i < 3 ? P.accent : P.sub, fontSize: i < 3 ? 13 : 11 }}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                  </td>
                  <td style={{ padding: "6px 12px", fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</td>
                  <td style={{ padding: "6px 12px" }}>
                    <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: cc.bg, color: cc.fg }}>{p.minor}</span>
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(p.cnt)}</td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                      background: p.isNew ? "#ede9fe" : isUp ? "#dcfce7" : isDown ? "#fee2e2" : "#f1f5f9",
                      color: p.isNew ? "#7c3aed" : isUp ? "#16a34a" : isDown ? "#dc2626" : "#94a3b8",
                    }}>
                      {p.isNew ? "NEW" : (isUp ? "↑" : isDown ? "↓" : "→")}{!p.isNew && p.change + "%"}
                    </span>
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtAmt(p.revenue)}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#64748b" }}>₩{p.avg_price.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── KPI row renderer ── */
  function KpiRow({ s, showPeriod = true }: { s: { total_purchases: number; total_revenue: number; unique_products: number; avg_price: number }; showPeriod?: boolean }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        {[
          { label: "전환 건수", value: fmt(s.total_purchases), color: P.accent },
          { label: "총 매출", value: fmtAmt(s.total_revenue), color: "#3b82f6" },
          { label: "상위 상품수", value: fmt(s.unique_products), color: "#f59e0b" },
          { label: "평균 단가", value: s.avg_price ? "₩" + s.avg_price.toLocaleString() : "—", color: "#8b5cf6" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: P.card, borderRadius: 10, padding: "14px 16px", border: `1px solid ${P.border}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: kpi.color, borderRadius: "0 2px 2px 0" }} />
            <div style={{ fontSize: 10, color: P.sub, marginBottom: 6, fontWeight: 500 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, letterSpacing: "-0.03em" }}>{kpi.value}</div>
            {showPeriod && period && i === 0 && <div style={{ fontSize: 10, color: P.sub, marginTop: 4 }}>{period.from} ~ {period.to}</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "0 28px 28px" }}>

      {/* ── SUB-TAB NAVIGATION ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `2px solid ${P.border}` }}>
        {([
          { id: "category" as const, label: "📊 카테고리 분석", desc: "전체 상품 대/중분류" },
          { id: "nonfood" as const, label: "🔍 비식품 탐색", desc: "식음료 제외" },
        ]).map(tab => (
          <button key={tab.id} onClick={() => { setSubView(tab.id); setSearch(""); setSelectedMajor(null); }}
            style={{
              padding: "12px 24px 10px", cursor: "pointer", border: "none", background: "transparent",
              borderBottom: subView === tab.id ? `3px solid ${P.accent}` : "3px solid transparent",
              color: subView === tab.id ? P.accent : P.sub,
              fontWeight: subView === tab.id ? 800 : 500, fontSize: 13,
              transition: "all .15s", marginBottom: -2
            }}>
            {tab.label}
            <span style={{ display: "block", fontSize: 9, fontWeight: 400, marginTop: 2, color: P.sub }}>{tab.desc}</span>
          </button>
        ))}
        {isLoading && <span style={{ fontSize: 10, color: P.accent, fontWeight: 600, alignSelf: "center", marginLeft: "auto", paddingRight: 8 }}>Loading...</span>}
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "10px 0 14px", borderBottom: `1px solid ${P.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>성별</span>
          {GENDER_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={gender === o.id} onClick={() => setGender(o.id)} />)}
        </div>
        <span style={{ width: 1, height: 24, background: P.border, alignSelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>연령</span>
          {AGE_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={ageGroup === o.id} onClick={() => setAgeGroup(o.id)} />)}
        </div>
        <span style={{ width: 1, height: 24, background: P.border, alignSelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: P.sub, fontWeight: 700, width: 32 }}>기간</span>
          {PERIOD_OPTIONS.map(o => <Chip key={o.id} label={o.label} active={!useCustom && days === o.id} onClick={() => { setDays(o.id); setUseCustom(false); }} />)}
          <Chip label="직접선택" active={useCustom} onClick={() => setUseCustom(true)} />
          {useCustom && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} min="2025-12-16" max="2026-03-17"
                style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none", cursor: "pointer" }} />
              <span style={{ fontSize: 10, color: P.sub }}>~</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} min={customFrom || "2025-12-16"} max="2026-03-17"
                style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, color: P.text, background: P.card, outline: "none", cursor: "pointer" }} />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── VIEW A: CATEGORY ANALYSIS ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subView === "category" && (
        <>
          {/* Category tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
            {/* "전체" tile */}
            <button onClick={() => setSelectedMajor(null)} style={{
              padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all .15s",
              border: selectedMajor === null ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
              background: selectedMajor === null ? P.glow : P.card,
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🏪</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.text }}>전체</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: P.accent, marginTop: 4 }}>{fmt(totalCategoryCnt)}</div>
              <div style={{ fontSize: 9, color: P.sub }}>100%</div>
            </button>
            {categoryStats.map(c => {
              const cc = CAT_COLORS[c.major] || CAT_COLORS["기타"];
              const pct = totalCategoryCnt > 0 ? (c.cnt / totalCategoryCnt * 100) : 0;
              const isSelected = selectedMajor === c.major;
              return (
                <button key={c.major} onClick={() => setSelectedMajor(isSelected ? null : c.major)} style={{
                  padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all .15s",
                  border: isSelected ? `2px solid ${cc.fg}` : `1px solid ${P.border}`,
                  background: isSelected ? cc.bg : P.card,
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{CAT_ICONS[c.major] || "📦"}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: cc.fg }}>{c.major}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: cc.fg, marginTop: 4 }}>{fmt(c.cnt)}</div>
                  <div style={{ fontSize: 9, color: P.sub }}>{pct.toFixed(1)}% · {c.products}종</div>
                </button>
              );
            })}
          </div>

          {/* Minor category breakdown (when major selected) */}
          {selectedMajor && minorStats.length > 0 && (
            <div style={{ background: P.card, borderRadius: 10, padding: 16, border: `1px solid ${P.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: P.text }}>
                {CAT_ICONS[selectedMajor]} {selectedMajor} — 중분류
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {minorStats.map((m, i) => {
                  const cc = CAT_COLORS[selectedMajor] || CAT_COLORS["기타"];
                  const total = minorStats.reduce((s, x) => s + x.cnt, 0);
                  const pct = total > 0 ? (m.cnt / total * 100) : 0;
                  return (
                    <div key={m.minor} style={{
                      padding: "8px 14px", borderRadius: 8, background: cc.bg, border: `1px solid ${cc.fg}22`,
                      minWidth: 100
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cc.fg }}>{m.minor}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: P.text, marginTop: 2 }}>{fmt(m.cnt)}</div>
                      <div style={{ fontSize: 9, color: P.sub }}>{pct.toFixed(0)}% · {m.products}종 · {fmtAmt(m.revenue)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category products table */}
          <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                {selectedMajor ? `${CAT_ICONS[selectedMajor]} ${selectedMajor} 상품 TOP ${categoryProducts.length}` : `🏆 전체 인기 상품 TOP ${categoryProducts.length}`}
              </h3>
              <input type="text" placeholder="🔍 상품명 검색..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: "5px 12px", border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, width: 180, outline: "none" }} />
            </div>
            <ProductTable items={categoryProducts} />
          </div>

          {/* KPI for selected category */}
          {selectedMajor ? (
            <KpiRow s={{
              total_purchases: categoryProducts.reduce((s, p) => s + p.cnt, 0),
              total_revenue: categoryProducts.reduce((s, p) => s + p.revenue, 0),
              unique_products: categoryProducts.length,
              avg_price: categoryProducts.length > 0 ? Math.round(categoryProducts.reduce((s, p) => s + p.revenue, 0) / Math.max(categoryProducts.reduce((s, p) => s + p.cnt, 0), 1)) : 0,
            }} />
          ) : summary && (
            <KpiRow s={summary} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── VIEW B: NON-FOOD EXPLORATION ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subView === "nonfood" && (
        <>
          {/* Info banner */}
          <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚫</span>
            <span style={{ fontSize: 11, color: "#92400e" }}>
              식음료 12개 카테고리(유제품·과일·채소·라면·음료·커피·간식·가공식품·달걀·조미료·곡물·정육) 제외 —
              <strong> 비식품 {nonFoodProducts.length}종</strong>만 표시
            </span>
          </div>

          {/* Non-food product table */}
          <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>🔍 비식품 상품 TOP {nonFoodProducts.length}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" placeholder="🔍 상품명 검색..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding: "5px 12px", border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, width: 180, outline: "none" }} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  style={{ padding: "5px 10px", border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11, background: "#fff", cursor: "pointer" }}>
                  <option value="cnt">건수순</option>
                  <option value="revenue">매출순</option>
                  <option value="avg_price">고가순</option>
                  <option value="change">WoW순</option>
                </select>
              </div>
            </div>
            <ProductTable items={nonFoodProducts} />
          </div>

          {/* Non-food KPI */}
          <KpiRow s={nonFoodSummary} />

          {/* Charts: daily trend + platform */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>📈 일별 전환 추이</h3>
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyTrend.map(d => ({ ...d, dt: String(d.dt).slice(5) }))}>
                    <defs>
                      <linearGradient id="shopGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={P.accent} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={P.accent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                    <XAxis dataKey="dt" tick={{ fontSize: 10, fill: P.sub }} />
                    <YAxis tick={{ fontSize: 9, fill: P.sub }} tickFormatter={v => fmt(Number(v))} width={44} />
                    <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any, name: string) => [name === "cnt" ? fmt(Number(v)) + "건" : fmtAmt(Number(v)), name === "cnt" ? "건수" : "매출"]} />
                    <Area type="monotone" dataKey="cnt" stroke={P.accent} fill="url(#shopGrad2)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>데이터 적재 후 표시됩니다</div>}
            </div>
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💳 제휴처별 비교</h3>
              {platforms.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {platforms.map((p, i) => {
                    const pct = totalPlatformCnt > 0 ? (p.cnt / totalPlatformCnt * 100) : 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 100, flexShrink: 0 }}>{p.platform_name}</span>
                        <div style={{ flex: 1, height: 22, background: "rgba(0,0,0,.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div style={{ height: "100%", background: CHART_COLORS[i], borderRadius: 4, width: `${pct}%`, transition: "width .4s", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            {pct > 15 && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{fmt(p.cnt)}건</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: P.accent, width: 44, textAlign: "right" }}>{pct.toFixed(1)}%</span>
                        <span style={{ fontSize: 10, color: P.sub, width: 50, textAlign: "right" }}>{fmtAmt(p.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>데이터 적재 후 표시됩니다</div>}
            </div>
          </div>

          {/* Price dist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💰 가격대별 구매 건수</h3>
              {priceDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={priceDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                    <XAxis dataKey="price_range" tick={{ fontSize: 10, fill: P.sub }} />
                    <YAxis tick={{ fontSize: 9, fill: P.sub }} tickFormatter={v => fmt(Number(v))} width={44} />
                    <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [fmt(Number(v)) + "건"]} />
                    <Bar dataKey="cnt" radius={[4, 4, 0, 0]}>
                      {priceDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
            </div>
            <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", borderBottom: `2px solid ${P.accent}`, paddingBottom: 8 }}>💰 가격대별 매출 비중</h3>
              {priceDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={priceDist} dataKey="revenue" nameKey="price_range" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}
                      label={({ name, percent }: any) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""} labelLine={{ strokeWidth: 1 }}
                      style={{ fontSize: 9 }}>
                      {priceDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => [fmtAmt(Number(v))]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: "center", padding: 40, color: P.sub, fontSize: 12 }}>—</div>}
            </div>
          </div>
        </>
      )}

      {/* ── PRODUCT DETAIL MODAL (shared) ── */}
      {selectedProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setSelectedProduct(null)}>
          <div style={{ background: P.card, borderRadius: 16, padding: 0, border: `1px solid ${P.border}`, width: 720, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: P.accent, fontWeight: 700, marginBottom: 4 }}>📦 상품 상세 추세</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProduct}</h3>
                {detail && <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>{detail.period.from} ~ {detail.period.to} ({detail.period.days}일) · {detail.elapsed_ms}ms</div>}
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, cursor: "pointer", fontSize: 14, color: P.sub, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {detailLoading && <div style={{ textAlign: "center", padding: 40, color: P.accent, fontSize: 13 }}>📊 추세 데이터 로딩 중...</div>}
            {detail && (
              <div style={{ padding: "16px 24px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
                  {[
                    { label: "총 판매건수", value: fmt(detail.summary.total_cnt), color: P.accent },
                    { label: "총 매출", value: fmtAmt(detail.summary.total_revenue), color: "#3b82f6" },
                    { label: "평균 단가", value: "₩" + detail.summary.avg_price.toLocaleString(), color: "#f59e0b" },
                    { label: "판매일수", value: detail.summary.days_active + "일", color: "#8b5cf6" },
                  ].map((k, i) => (
                    <div key={i} style={{ background: P.bg, borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: 9, color: P.sub, fontWeight: 600 }}>{k.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginTop: 2 }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: P.text }}>📈 일별 판매 추이</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={(detail.daily as any[]).map((d: any) => ({ ...d, dt: String(d.dt).slice(5) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
                      <XAxis dataKey="dt" tick={{ fontSize: 9, fill: P.sub }} />
                      <YAxis tick={{ fontSize: 9, fill: P.sub }} width={36} />
                      <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any, name: string) => [name === "cnt" ? v + "건" : fmtAmt(Number(v)), name === "cnt" ? "건수" : "매출"]} />
                      <Line type="monotone" dataKey="cnt" stroke={P.accent} strokeWidth={2.5} dot={{ r: 2.5 }} name="cnt" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>👤 성별</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={detail.by_gender} dataKey="cnt" nameKey="label" cx="50%" cy="50%" outerRadius={50} innerRadius={25}
                          label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 9 }}>
                          {(detail.by_gender as any[]).map((_: any, i: number) => <Cell key={i} fill={["#3b82f6", "#f59e0b", "#94a3b8"][i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} formatter={(v: any) => [v + "건"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📊 연령대</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={detail.by_age} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" />
                        <XAxis type="number" tick={{ fontSize: 8, fill: P.sub }} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: P.sub }} width={30} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} formatter={(v: any) => [v + "건"]} />
                        <Bar dataKey="cnt" radius={[0, 3, 3, 0]}>
                          {(detail.by_age as any[]).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💳 제휴처</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                      {(detail.by_platform as any[]).map((p: any, i: number) => {
                        const total = (detail.by_platform as any[]).reduce((s: number, x: any) => s + x.cnt, 0);
                        const pct = total > 0 ? (p.cnt / total * 100) : 0;
                        return (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                              <span style={{ fontWeight: 600 }}>{p.label}</span>
                              <span style={{ color: P.sub }}>{fmt(p.cnt)}건 ({pct.toFixed(0)}%)</span>
                            </div>
                            <div style={{ height: 6, background: "rgba(0,0,0,.04)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: CHART_COLORS[i], borderRadius: 3, width: `${pct}%`, transition: "width .3s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {elapsedMs && (
        <div style={{ textAlign: "right", padding: "8px 0", fontSize: 10, color: "rgba(107,122,153,.5)" }}>
          RPC {elapsedMs}ms · {gender ? (gender === "M" ? "남성" : "여성") : "전체"} · {ageGroup || "전연령"} · {useCustom && customFrom ? `${customFrom}~${customTo}` : days + "일"}
        </div>
      )}
    </div>
  );
}
