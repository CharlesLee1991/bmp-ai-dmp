"use client";
/*
  BizViz 코스믹 시각화 — 런컴 DMP 매체 성과 탭 이식본
  출처: bizspring-inc/bizviz demos/bizviz-charts3d.html + bizviz-cosmos.html
  독트린(verify/README.md · BIZVIZ-DESIGN.md §1) 준수:
    1. 데이터 지오메트리 = MeshBasicMaterial(unlit) + 정확 hex, 조명 0
    2. renderer.toneMapping = NoToneMapping (ACES 금지)
    3. 컬러 인코딩 속성 대입 없음 (모던 three no-op — 배치6 확정)
    4. 발광 = 가산합성 halo 스프라이트만 (UnrealBloom 등 postFX 금지)
    5. 데이터 머티리얼 fog 제외 — fog는 크롬(스타필드)만
    6. 팔레트 = BIZVIZ-DESIGN.md §1 정본 hex만
*/
import { useEffect, useRef } from "react";

// ── 데이터 계약 (라이브 MediaPerformanceTab 스키마와 동일) ──
export type MediaRow = {
  platform_name: string; platform_idx: number;
  impressions: number; clicks: number; conversions: number;
  ad_spend: number; ctr_pct: number;
};
export type DailyRow = { date: string; impressions: number; clicks: number; conversions: number; ad_spend: number };

// ── §1 정본 팔레트 ──
const C = { base: "#101318", surface: "#161A20", line: "#232935", grid: "#1A1F27",
            ink: "var(--border)", dim: "var(--sub)", sky: "#4FBEFF" };
// 차트 시리즈 6-hue (인접 hue 연속 금지 순서: sky→teal→purple→blue→amber→red)
const HUES = ["#4FBEFF", "#3BD6B4", "#9B8AF5", "#6B9EF2", "#F2C74B", "#F2685A"];

// ── three 로더 (코드분할 — CDN UMD, 번들 상주 회피) ──
let threePromise: Promise<any> | null = null;
function loadThree(): Promise<any> {
  if ((window as any).THREE) return Promise.resolve((window as any).THREE);
  if (threePromise) return threePromise;
  threePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    s.onload = () => resolve((window as any).THREE);
    s.onerror = () => reject(new Error("three.js 로드 실패"));
    document.head.appendChild(s);
  });
  return threePromise;
}

// ── 공용 팩토리 (charts3d verbatim 포팅) ──
function makeScene(THREE: any, el: HTMLElement, camPos: number[]) {
  const W = el.clientWidth, H = el.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;          // 독트린 2
  renderer.setClearColor(C.surface);
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 800);
  camera.position.set(camPos[0], camPos[1], camPos[2]);
  const st = { down: false, px: 0, py: 0, yaw: Math.atan2(camPos[0], camPos[2]),
               pitch: Math.asin(camPos[1] / Math.hypot(...camPos)), r: Math.hypot(...camPos) };
  function apply() {
    st.pitch = Math.max(0.05, Math.min(1.25, st.pitch));
    st.r = Math.max(18, Math.min(320, st.r));
    camera.position.set(st.r * Math.sin(st.yaw) * Math.cos(st.pitch), st.r * Math.sin(st.pitch),
                        st.r * Math.cos(st.yaw) * Math.cos(st.pitch));
    camera.lookAt(0, 3, 0);
  }
  const onDown = (e: MouseEvent) => { st.down = true; st.px = e.clientX; st.py = e.clientY; };
  const onUp = () => { st.down = false; };
  const onMove = (e: MouseEvent) => {
    if (!st.down) return;
    st.yaw -= (e.clientX - st.px) * 0.006; st.pitch += (e.clientY - st.py) * 0.006;
    st.px = e.clientX; st.py = e.clientY; apply();
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); st.r *= (1 + Math.sign(e.deltaY) * 0.08); apply(); };
  el.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("mousemove", onMove);
  el.addEventListener("wheel", onWheel, { passive: false });
  apply();
  const cleanup = () => {
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("mousemove", onMove);
    el.removeEventListener("mousedown", onDown);
    el.removeEventListener("wheel", onWheel as any);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  };
  return { renderer, scene, camera, cleanup };
}
function haloTex(THREE: any, hex: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, hex); gr.addColorStop(0.4, hex + "55"); gr.addColorStop(1, hex + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function halo(THREE: any, hex: string, s: number, op: number) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(THREE, hex),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); // 독트린 4
  sp.scale.set(s, s, 1); return sp;
}
function textSprite(THREE: any, text: string, hex: string, px = 28, w = 200) {
  const c = document.createElement("canvas"); c.width = w * 2; c.height = 64;
  const g = c.getContext("2d")!; g.scale(2, 2);
  g.font = `600 ${px}px Pretendard, sans-serif`; g.textAlign = "center"; g.fillStyle = hex;
  g.fillText(text, w / 2, px + 6);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c),
    transparent: true, depthWrite: false }));
  sp.scale.set(w / 14, 64 / 28, 1); return sp;
}
function hairGrid(THREE: any, scene: any, size: number, div: number) {
  const gh = new THREE.GridHelper(size, div, C.line, C.grid);
  gh.material.transparent = true; gh.material.opacity = 0.7;
  scene.add(gh);
}
const fmtK = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(n);

// ═══ 캔버스 컴포넌트 (각 차트) ═══

// ① 3D 바 — 매체별 노출 TOP N (높이=impressions, 색=팔레트 순환)
function BarCanvas({ rows }: { rows: MediaRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !rows.length) return;
    let dispose = () => {};
    loadThree().then((THREE) => {
      const el = ref.current!; el.innerHTML = "";
      const { renderer, scene, camera, cleanup } = makeScene(THREE, el, [22, 18, 40]);
      dispose = cleanup;
      hairGrid(THREE, scene, 60, 12);
      const top = [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 6);
      const maxV = Math.max(1, top[0]?.impressions || 1);
      const span = Math.max(1, top.length - 1);
      top.forEach((s, i) => {
        const h = 4 + (s.impressions / maxV) * 18, x = -18 + i * (36 / span);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, h, 4.4),
          new THREE.MeshBasicMaterial({ color: HUES[i % HUES.length] }));   // 독트린 1
        bar.position.set(x, h / 2, 0); scene.add(bar);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(bar.geometry),
          new THREE.LineBasicMaterial({ color: C.base, transparent: true, opacity: 0.35 }));
        edge.position.copy(bar.position); scene.add(edge);
        const hl = halo(THREE, HUES[i % HUES.length], 8, 0.5); hl.position.set(x, h + 1.2, 0); scene.add(hl);
        const val = textSprite(THREE, fmtK(s.impressions), C.ink, 26, 220); val.position.set(x, h + 3.4, 0); scene.add(val);
        const nm = textSprite(THREE, s.platform_name.slice(0, 8), C.dim, 20, 220); nm.position.set(x, -2.4, 3.5); scene.add(nm);
      });
      let raf = 0; (function loop() { raf = requestAnimationFrame(loop); renderer.render(scene, camera); })();
      dispose = () => { cancelAnimationFrame(raf); cleanup(); };
    });
    return () => dispose();
  }, [rows]);
  return <div ref={ref} style={{ width: "100%", height: 300 }} />;
}

// ② 3D 도넛 — 상위 매체 전환 점유
function DonutCanvas({ rows }: { rows: MediaRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !rows.length) return;
    let dispose = () => {};
    loadThree().then((THREE) => {
      const el = ref.current!; el.innerHTML = "";
      const { renderer, scene, camera, cleanup } = makeScene(THREE, el, [0, 24, 34]);
      dispose = cleanup;
      const top = [...rows].filter(r => r.conversions > 0).sort((a, b) => b.conversions - a.conversions).slice(0, 6);
      const total = Math.max(1, top.reduce((s, x) => s + x.conversions, 0));
      let a0 = Math.PI / 2;
      top.forEach((s, i) => {
        const frac = s.conversions / total, arc = frac * Math.PI * 2 - 0.03;
        const seg = new THREE.Mesh(new THREE.TorusGeometry(10, 2.6, 14, 60, arc),
          new THREE.MeshBasicMaterial({ color: HUES[i % HUES.length] }));
        seg.rotation.x = -Math.PI / 2; seg.rotation.z = a0; seg.position.y = 3; scene.add(seg);
        const mid = a0 + arc / 2;
        const lb = textSprite(THREE, `${s.platform_name.slice(0, 6)} ${(frac * 100).toFixed(0)}%`, C.ink, 20, 260);
        lb.position.set(Math.cos(mid) * 16.5, 4.5, -Math.sin(mid) * 16.5); scene.add(lb);
        a0 += arc + 0.03;
      });
      const core = halo(THREE, C.sky, 10, 0.22); core.position.y = 3; scene.add(core);
      hairGrid(THREE, scene, 44, 11);
      let raf = 0; (function loop() { raf = requestAnimationFrame(loop); renderer.render(scene, camera); })();
      dispose = () => { cancelAnimationFrame(raf); cleanup(); };
    });
    return () => dispose();
  }, [rows]);
  return <div ref={ref} style={{ width: "100%", height: 300 }} />;
}

// ③ 발광 리본 — 일별 노출 추이 (x=date, y=impressions)
function RibbonCanvas({ daily }: { daily: DailyRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || daily.length < 2) return;
    let dispose = () => {};
    loadThree().then((THREE) => {
      const el = ref.current!; el.innerHTML = "";
      const { renderer, scene, camera, cleanup } = makeScene(THREE, el, [2, 12, 38]);
      dispose = cleanup;
      const vs = daily.map(p => p.impressions), mn = Math.min(...vs), mx = Math.max(...vs) || 1;
      const X = (i: number) => -15 + i * 30 / (daily.length - 1);
      const Y = (v: number) => 1 + (mx === mn ? 7 : (v - mn) * 13 / (mx - mn));
      const pts = daily.map((p, i) => new THREE.Vector3(X(i), Y(p.impressions), 0));
      const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.12);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 100, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: C.sky })));
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 100, 0.65, 8),
        new THREE.MeshBasicMaterial({ color: C.sky, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.16, depthWrite: false }));
      scene.add(glow);
      const last = pts[pts.length - 1];
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshBasicMaterial({ color: C.sky }));
      head.position.copy(last); scene.add(head);
      scene.add(Object.assign(halo(THREE, C.sky, 5, 0.6), { position: last }));
      const hv = textSprite(THREE, `${daily[daily.length - 1].date.slice(5)} · ${fmtK(vs[vs.length - 1])}`, C.ink, 22, 240);
      hv.position.set(last.x - 1, last.y + 2.4, 0); scene.add(hv);
      const axMat = new THREE.LineBasicMaterial({ color: C.line });
      ([[[-15, 1, 0], [15, 1, 0]], [[-15, 1, 0], [-15, 15, 0]]] as number[][][]).forEach(([a, b]) =>
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
          [new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2])]), axMat)));
      [0, Math.floor(daily.length / 2), daily.length - 1].forEach(i => {
        const d = textSprite(THREE, daily[i].date.slice(5), C.dim, 18, 140); d.position.set(X(i), -0.8, 0); scene.add(d);
      });
      hairGrid(THREE, scene, 44, 11);
      let raf = 0; (function loop() { raf = requestAnimationFrame(loop); renderer.render(scene, camera); })();
      dispose = () => { cancelAnimationFrame(raf); cleanup(); };
    });
    return () => dispose();
  }, [daily]);
  return <div ref={ref} style={{ width: "100%", height: 300 }} />;
}

// ④ 궤도계 — 매체 우주 조망 (반경=ad_spend, 크기=impressions, 색=팔레트)
//    자체 궤도(force-graph 미사용) — 번들 = three 단독
function CosmosCanvas({ rows }: { rows: MediaRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !rows.length) return;
    let dispose = () => {};
    loadThree().then((THREE) => {
      const el = ref.current!; el.innerHTML = "";
      const { renderer, scene, camera, cleanup } = makeScene(THREE, el, [0, 60, 150]);
      dispose = cleanup;
      // 크롬: 스타필드 (fog 수신) — 데이터 코어는 fog 제외
      scene.fog = new THREE.Fog(C.base, 200, 620);
      renderer.setClearColor(C.base);
      { const N = 700, pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { const R = 240 + Math.random() * 300, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = R * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = R * Math.cos(p) * 0.6; pos[i * 3 + 2] = R * Math.sin(p) * Math.sin(t); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: C.dim, size: 1.1, transparent: true, opacity: 0.35 }))); }
      // 중심 항성 (전체 매체 집계 코어)
      const star = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 16), new THREE.MeshBasicMaterial({ color: C.sky }));
      star.material.fog = false; scene.add(star);
      scene.add(halo(THREE, C.sky, 42, 0.5));
      // 궤도 링 (크롬 — fog 수신)
      const top = [...rows].filter(r => r.impressions > 0).sort((a, b) => b.ad_spend - a.ad_spend).slice(0, 12);
      const maxSpend = Math.max(1, ...top.map(r => r.ad_spend));
      const maxImp = Math.max(1, ...top.map(r => r.impressions));
      const GOLD = 2.399963;
      top.forEach((r, i) => {
        const orbitR = 22 + (r.ad_spend / maxSpend) * 92;         // 반경 = ad_spend (클수록 외곽)
        const a = i * GOLD;
        const fx = Math.cos(a) * orbitR, fz = Math.sin(a) * orbitR, fy = (i % 5 - 2) * 6;
        // 궤도 링 (크롬)
        const pts: any[] = []; for (let k = 0; k <= 80; k++) { const t = k / 80 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * orbitR, fy * 0.3, Math.sin(t) * orbitR)); }
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0.35 }));
        scene.add(ring);
        // 매체 행성 (데이터 — fog 제외, 정확 hex)
        const size = 1.6 + Math.sqrt(r.impressions / maxImp) * 4.4;
        const hue = HUES[i % HUES.length];
        const planet = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshBasicMaterial({ color: hue }));
        planet.material.fog = false; planet.position.set(fx, fy, fz); scene.add(planet);
        const h = halo(THREE, hue, size * 4.5, 0.45); h.position.set(fx, fy, fz); scene.add(h);
        if (i < 8) { const lb = textSprite(THREE, r.platform_name.slice(0, 8), C.ink, 20, 220); lb.position.set(fx, fy + size + 4, fz); scene.add(lb); }
      });
      let raf = 0, tt = 0;
      (function loop() { raf = requestAnimationFrame(loop); tt += 0.0016; scene.rotation.y = tt; renderer.render(scene, camera); })();
      dispose = () => { cancelAnimationFrame(raf); cleanup(); };
    });
    return () => dispose();
  }, [rows]);
  return <div ref={ref} style={{ width: "100%", height: 420 }} />;
}

// ═══ 컨테이너 — 다크 격리 (브랜드 충돌 방지) ═══
export default function BizVizMediaCharts({ rows, daily }: { rows: MediaRow[]; daily: DailyRow[] }) {
  const panel: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" };
  const head: React.CSSProperties = { padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}` };
  const sub: React.CSSProperties = { color: C.dim, fontWeight: 400, fontSize: 11, marginLeft: 8 };
  const hint = <div style={{ fontSize: 11, color: C.dim, padding: "6px 16px 0" }}>드래그: 회전 · 휠: 줌</div>;
  return (
    <div className="dark" style={{ background: C.base, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 궤도계 — 임팩트 컷 (전폭) */}
      <div style={panel}>
        <div style={head}>🪐 매체 우주 조망 — 궤도계<span style={sub}>반경 = 광고비 · 크기 = 노출 · 색 = 매체</span></div>
        {rows.length ? <CosmosCanvas rows={rows} /> : <Empty />}
        {hint}
      </div>
      {/* 3열: 바 · 도넛 · 리본 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={panel}>
          <div style={head}>📊 매체별 노출 TOP6 — 3D 바</div>
          {rows.length ? <BarCanvas rows={rows} /> : <Empty />}{hint}
        </div>
        <div style={panel}>
          <div style={head}>🍩 전환 점유 — 3D 도넛</div>
          {rows.filter(r => r.conversions > 0).length ? <DonutCanvas rows={rows} /> : <Empty msg="전환 데이터 없음" />}{hint}
        </div>
        <div style={panel}>
          <div style={head}>🎗️ 일별 노출 추이 — 발광 리본</div>
          {daily.length >= 2 ? <RibbonCanvas daily={daily} /> : <Empty msg="추이 데이터 부족" />}{hint}
        </div>
      </div>
    </div>
  );
}
function Empty({ msg = "데이터 로딩 중…" }: { msg?: string }) {
  return <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 13 }}>{msg}</div>;
}
