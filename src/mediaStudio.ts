export interface TargetPoint {
  id: string;
  labelAr: string;
  titleEn: string;
  descIq: string;
  posPct: { x: number; y: number };
  color?: string;
}

export interface ScenarioSpec {
  id: string;
  labelAr: string;
  badgeEn: string;
  duration: number;
  focus: { cx: number; cy: number; scale: number };
  highlightTargetId?: string;
  xraySuggested?: boolean;
  seeIq: string;
  whyIq: string;
  tipIq: string;
  drawCue?: string;
}

export type Pt = { x: number; y: number };
export type ToPxFn = (nx: number, ny: number) => Pt;

export interface OverlayState {
  tNorm: number;
  elapsed: number;
  duration: number;
  scenario: ScenarioSpec;
  scenarioIdx: number;
  activeTargetId: string;
  xrayMode: boolean;
  scale: number;
}

export interface TopicStudioSpec {
  topicId: string;
  simId: string;
  imageUrl: string;
  imageAlt: string;
  hudTitleAr: string;
  hudBadgeEn: string;
  targets: TargetPoint[];
  scenarios: ScenarioSpec[];
  drawOverlay: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    st: OverlayState,
    toPx: ToPxFn
  ) => void;
}

// ============================================================================
// Layer 3: Deterministic 60fps Clinical Canvas Motion Helpers (Zero Jitter)
// ============================================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function samplePolyline(pts: Pt[], u: number): { pt: Pt; angle: number } {
  if (pts.length < 2) return { pt: pts[0] || { x: 0, y: 0 }, angle: 0 };
  const clamped = Math.max(0, Math.min(1, u));
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const d = Math.hypot(dx, dy);
    segLengths.push(d);
    total += d;
  }
  if (total < 1e-4) return { pt: pts[0], angle: 0 };
  let targetDist = clamped * total;
  for (let i = 0; i < segLengths.length; i++) {
    const len = segLengths[i];
    if (targetDist <= len || i === segLengths.length - 1) {
      const f = len > 1e-4 ? targetDist / len : 0;
      const a = pts[i];
      const b = pts[i + 1];
      return {
        pt: { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    targetDist -= len;
  }
  return { pt: pts[pts.length - 1], angle: 0 };
}

/**
 * drawFlowTrack:
 * Fixed geometric path with harmonious gradient, soft shadow, and continuous
 * bright white light pulse traveling smoothly along the path (zero jitter).
 */
export function drawFlowTrack(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  t: number,
  color = "#38BDF8",
  opts: {
    width?: number;
    reciprocate?: boolean;
    pulseCount?: number;
    speed?: number;
    dashed?: boolean;
    showTip?: boolean;
  } = {}
): void {
  if (pts.length < 2) return;
  const width = opts.width ?? 2.6;
  const speed = opts.speed ?? 1;
  const pulseCount = opts.pulseCount ?? 2;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Subtle dark shadow rail for visibility on light or dark medical backgrounds
  ctx.strokeStyle = "rgba(4, 12, 24, 0.55)";
  ctx.lineWidth = width + 2.4;
  if (opts.dashed) ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // Primary colored gradient stroke
  const start = pts[0];
  const end = pts[pts.length - 1];
  const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#F8FAFC");
  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);

  // Continuous smooth light pulse(s) traveling along path
  for (let k = 0; k < pulseCount; k++) {
    let phase = (t * speed + k / pulseCount) % 1;
    if (opts.reciprocate) {
      const cyc = (t * speed * 0.8 + k * 0.5) % 1;
      phase = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
    }
    const { pt, angle } = samplePolyline(pts, phase);

    const halo = ctx.createRadialGradient(pt.x, pt.y, 0.5, pt.x, pt.y, width * 4.2);
    halo.addColorStop(0, "rgba(255,255,255,0.95)");
    halo.addColorStop(0.45, color);
    halo.addColorStop(1, "rgba(56,189,248,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, width * 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (opts.showTip) {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -3.5);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * drawSprayStream:
 * Deterministic smooth micro-droplet cooling/disinfectant stream (zero jitter).
 */
export function drawSprayStream(
  ctx: CanvasRenderingContext2D,
  origin: Pt,
  dirRad: number,
  spreadRad: number,
  lengthPx: number,
  t: number,
  color = "#67E8F9"
): void {
  ctx.save();
  const count = 14;
  for (let i = 0; i < count; i++) {
    const phase = (t * 1.4 + i / count) % 1;
    const lane = ((i * 7) % count) / (count - 1) - 0.5;
    const angle = dirRad + lane * spreadRad;
    const dist = phase * lengthPx;
    const x = origin.x + Math.cos(angle) * dist;
    const y = origin.y + Math.sin(angle) * dist;
    const alpha = Math.sin(phase * Math.PI) * 0.72;
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + phase * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * drawShockRings:
 * Subtle graduated localized wave rings over a clinical landmark.
 */
export function drawShockRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  maxR = 28,
  color = "#2DD4BF"
): void {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.9 + i / 3) % 1;
    const r = 6 + p * (maxR - 6);
    const alpha = (1 - p) * 0.62;
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.6 - p * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * drawOrbitPath:
 * Clean geometric elliptical orbital sweep track + moving emitter cursor.
 */
export function drawOrbitPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: number,
  opts: { startAngle?: number; spanAngle?: number; color?: string; showCursor?: boolean } = {}
): Pt {
  const startA = opts.startAngle ?? -Math.PI * 0.85;
  const spanA = opts.spanAngle ?? Math.PI * 1.7;
  const color = opts.color ?? "#38BDF8";

  ctx.save();
  ctx.strokeStyle = "rgba(4, 12, 24, 0.55)";
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, startA, startA + spanA);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.setLineDash([]);

  const curA = startA + t * spanA;
  const curPt = { x: cx + Math.cos(curA) * rx, y: cy + Math.sin(curA) * ry };
  if (opts.showCursor !== false) {
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(curPt.x, curPt.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  return curPt;
}

/**
 * Stationary reference line + pill badge (never moves or vibrates).
 */
export function drawFixedGuide(
  ctx: CanvasRenderingContext2D,
  p1: Pt,
  p2: Pt,
  label: string,
  color = "#FBBF24",
  dashed = true
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(4, 12, 24, 0.72)";
  ctx.lineWidth = 3.8;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    const mx = (p1.x + p2.x) * 0.5;
    const my = (p1.y + p2.y) * 0.5;
    drawCanvasPill(ctx, mx, my, label, color);
  }
  ctx.restore();
}

export function drawFixedAngleArc(
  ctx: CanvasRenderingContext2D,
  vertex: Pt,
  a1: number,
  a2: number,
  radius: number,
  label: string,
  color = "#2DD4BF"
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(4, 12, 24, 0.72)";
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.arc(vertex.x, vertex.y, radius, a1, a2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.9;
  ctx.stroke();

  if (label) {
    const mid = (a1 + a2) * 0.5;
    const lx = vertex.x + Math.cos(mid) * (radius + 14);
    const ly = vertex.y + Math.sin(mid) * (radius + 14);
    drawCanvasPill(ctx, lx, ly, label, color);
  }
  ctx.restore();
}

export function drawCanvasPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  borderColor = "#38BDF8"
): void {
  ctx.save();
  ctx.font = '700 11px "IBM Plex Mono", "Cairo", sans-serif';
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 14;
  const ph = 20;
  const x = cx - pw / 2;
  const y = cy - ph / 2;

  ctx.fillStyle = "rgba(7, 15, 29, 0.9)";
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#F8FAFC";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

// ============================================================================
// Topic Specifications (All 18 Slides — Verified Pixel Coordinates & Scenarios)
// ============================================================================

export const TOPIC_STUDIOS: Record<string, TopicStudioSpec> = {
  "p1-t1": {
    topicId: "p1-t1",
    simId: "p1-role-xray",
    imageUrl: "/src/assets/images/p1_t1_endo_xray_1795591368380.jpg",
    imageAlt: "Endodontic Radiography: Indirect vision into dentition, K-file WL standardization, and lamina dura radiograph",
    hudTitleAr: "دور أشعة علاج الجذور والفحص السريري المسبق",
    hudBadgeEn: "Indirect Vision · K-File WL · Clinical Exam First",
    targets: [
      {
        id: "t1",
        labelAr: "التاج وحجرة اللب",
        titleEn: "Clinical Exam Before X-Ray",
        descIq: "نبدأ بالفحص السريري للتاج والأنسجة الداعمة أولاً قبل ما نطلب أي أشعة، وبعدين الأشعة تعطينا رؤية غير مباشرة لداخل السن.",
        posPct: { x: 34, y: 28 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "المبرد وطول العمل",
        titleEn: "Intracanal Standardization (K-File)",
        descIq: "توحيد خطوات داخل القناة: نتحقق من طول العمل بالمبرد السني داخل القناة الجذرية حتى ما نتجاوز الذروة.",
        posPct: { x: 28.5, y: 61 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "قمع الأشعة والحساس",
        titleEn: "Cone Alignment & Sensor",
        descIq: "الحزمة الشعاعية تخترق السن باتجاه الحساس لتشكيل صورة دقيقة تُوحّد متابعة الحالات.",
        posPct: { x: 68.5, y: 50 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "اللامينا دورا والذروة",
        titleEn: "Lamina Dura & Apical Radiograph",
        descIq: "الأشعة تكشف استمرارية الصفيحة القاسية حول الجذر والالتهاب الذروي اللي ما ينشاف بالعين المجردة.",
        posPct: { x: 85.5, y: 69 },
        color: "#F472B6",
      },
    ],
    scenarios: [
      {
        id: "sc-wl",
        labelAr: "1. الرؤية غير المباشرة وطول العمل",
        badgeEn: "Indirect Vision · Working Length",
        duration: 8,
        focus: { cx: 0.5, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t2",
        seeIq: "على اليسار سن مشقوق طولياً وداخله مبرد K-File واصل لحد قريب من الذروة، وبالوسط قمع الأشعة يرسل الحزمة للحساس حتى تطلع الصورة على اليمين.",
        whyIq: "بدون الأشعة الطبيب يشتغل بالظلمة لأن القنوات والعظم تحت اللثة؛ فالأشعة توفر رؤية غير مباشرة وتوحد قياس خطوات القناة.",
        tipIq: "زبدة الامتحان: الأشعة توفر Indirect vision وتساعد في Standardization of intracanal procedures لكن تبقى مساعد تشخيصي مهم.",
        drawCue: "beam-and-wl",
      },
      {
        id: "sc-exam-first",
        labelAr: "2. شرط الفحص السريري قبل الأشعة",
        badgeEn: "Pre-Radiographic Clinical Exam",
        duration: 8,
        focus: { cx: 0.34, cy: 0.5, scale: 1.38 },
        highlightTargetId: "t1",
        seeIq: "الكاميرا مقربة على السن والتاج والأنسجة المحيطة ومكان دخول المبرد من السطح الطاحن نحو القناة.",
        whyIq: "بالعيادة ما يصير تكتب ورقة أشعة تلقائياً لأي مريض! لازم تفحص المريض سريرياً (Clinical examination) بالأول حتى تحدد إذا يحتاج أشعة وشنو نوعها.",
        tipIq: "مصيدة امتحان مؤكدة: يجب فحص المريض سريرياً BEFORE ordering أو prescribing X-ray images.",
        drawCue: "focus-crown",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      const cone = toPx(0.52, 0.5);
      const sensorTop = toPx(0.66, 0.38);
      const sensorBot = toPx(0.66, 0.62);
      const sensorMid = toPx(0.685, 0.5);
      const fileTop = toPx(0.35, 0.14);
      const fileTip = toPx(0.285, 0.61);
      const apex = toPx(0.285, 0.72);

      // Fixed beam rays from cone to sensor
      drawFlowTrack(ctx, [cone, sensorMid], t, "#38BDF8", { width: 2.2, pulseCount: 2, showTip: true });
      drawFlowTrack(ctx, [cone, sensorTop], t, "#2DD4BF", { width: 1.6, pulseCount: 1, dashed: true });
      drawFlowTrack(ctx, [cone, sensorBot], t, "#2DD4BF", { width: 1.6, pulseCount: 1, dashed: true });

      if (st.scenario.drawCue === "beam-and-wl") {
        drawFlowTrack(ctx, [fileTop, fileTip], t, "#FBBF24", { width: 2.4, reciprocate: true, pulseCount: 1 });
        drawFixedGuide(ctx, fileTip, apex, "WL -1mm", "#FBBF24", false);
        drawShockRings(ctx, toPx(0.77, 0.68).x, toPx(0.77, 0.68).y, t, 22, "#2DD4BF");
      } else {
        const crownL = toPx(0.25, 0.28);
        const crownR = toPx(0.43, 0.28);
        drawFixedGuide(ctx, crownL, crownR, "Clinical Exam 1st", "#FBBF24", true);
        drawShockRings(ctx, toPx(0.34, 0.35).x, toPx(0.34, 0.35).y, t, 28, "#FBBF24");
      }
    },
  },

  "p1-t2": {
    topicId: "p1-t2",
    simId: "p1-2d-shadow-sim",
    imageUrl: "/src/assets/images/p1_t2_shadow_rays_1795591369162.jpg",
    imageAlt: "Straight X-ray beam forming a 2D superimposed shadow image of a 3D multi-rooted structure",
    hudTitleAr: "المفاهيم الأساسية للأشعة والصورة الظلية 2D",
    hudBadgeEn: "Straight Line Rays · 2D Shadow of 3D Object",
    targets: [
      {
        id: "t1",
        labelAr: "مصدر الأشعة المستقيمة",
        titleEn: "Straight X-Ray Beam Path",
        descIq: "الأشعة السينية مثل الضوء تسير بخط مستقيم حتى تمتصها الأنسجة أو تنحرف، والانحراف يقلل وضوح الصورة.",
        posPct: { x: 15, y: 50 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "الجذر والأنسجة الثلاثية الأبعاد",
        titleEn: "3D Tooth Density Differences",
        descIq: "السن بالعظم له أبعاد 3D وكثافات مختلفة؛ المينا والعظم يمتصون أشعة أكثر من اللب والفراغات.",
        posPct: { x: 52, y: 49 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الصورة الظلية 2D المتراكبة",
        titleEn: "2D Superimposed Shadow Image",
        descIq: "على الفيلم يطلع ظل ثنائي الأبعاد 2D فقط، ولهذا الجذور المتقابلة ممكن تنطبق فوق بعضها وتبين كجذر واحد.",
        posPct: { x: 83, y: 50 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-rays",
        labelAr: "1. الأشعة المستقيمة والامتصاص",
        badgeEn: "Straight Line Travel & Scatter Loss",
        duration: 8,
        focus: { cx: 0.48, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t1",
        seeIq: "تشوف الأشعة طالعة بخطوط زرقاء متوازية ومستقيمة من الأنبوب وتمر عبر الضاحك ذو الجذرين والعظم نحو الفيلم الأخضر.",
        whyIq: "الأشعة مثل الضوء تمشي بخط مستقيم لحد ما تنحرف (Deflected) أو تُمتص (Absorbed)؛ وكل ما كثرت الأشعة المنحرفة تقل دقة الصورة ووضوحها.",
        tipIq: "امتحانياً: الأشعة تسير في Straight line، والأشعة المشتتة/المنحرفة (Deflected rays) تُضعف وضوح الصورة (Reduce clarity).",
        drawCue: "straight-rays",
      },
      {
        id: "sc-2d-shadow",
        labelAr: "2. ضغط المجسم 3D إلى ظل 2D",
        badgeEn: "3D Anatomy → 2D Shadow Projection",
        duration: 8,
        focus: { cx: 0.72, cy: 0.5, scale: 1.38 },
        highlightTargetId: "t3",
        seeIq: "التركيز على الفيلم الأخضر باليمين: الجذرين المنفصلين تشريحياً انضغطوا وصاروا ظل رمادي واحد متراكب على الفيلم.",
        whyIq: "لأن الصورة الشعاعية الاعتيادية هي مجرد Shadow image من بعدين 2D لمجسم 3D، فحجمها وشكلها وتباينها يتغير حسب وضعية الفيلم والمصدر.",
        tipIq: "زبدة الامتحان: Radiograph = 2D image of 3D structure، ولهذا نحتاج تقنيات زاوية إضافية (مثل SLOB) أو CBCT لفصل الجذور.",
        drawCue: "shadow-2d",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      const ys = [0.41, 0.45, 0.5, 0.55, 0.59];
      ys.forEach((ny, idx) => {
        const p1 = toPx(0.16, ny);
        const p2 = toPx(0.81, ny);
        drawFlowTrack(ctx, [p1, p2], (t + idx * 0.12) % 1, idx % 2 === 0 ? "#38BDF8" : "#2DD4BF", {
          width: 1.7,
          pulseCount: 1,
          speed: 1.1,
        });
      });

      if (st.scenario.drawCue === "straight-rays") {
        // Stationary deflection scatter angle illustration without oscillating lines
        const hit = toPx(0.51, 0.45);
        const scatterEnd = toPx(0.61, 0.28);
        drawFixedGuide(ctx, hit, scatterEnd, "Deflected = ↓ Clarity", "#FB7185", true);
      } else {
        const filmTop = toPx(0.83, 0.30);
        const filmBot = toPx(0.83, 0.70);
        drawFixedGuide(ctx, filmTop, filmBot, "3D → 2D Shadow", "#FBBF24", false);
        drawShockRings(ctx, toPx(0.83, 0.50).x, toPx(0.83, 0.50).y, t, 32, "#2DD4BF");
      }
    },
  },

  "p2-t1": {
    topicId: "p2-t1",
    simId: "p2-interp-types",
    imageUrl: "/src/assets/images/p2_t1_radiograph_densities_1795591371597.jpg",
    imageAlt: "Radiographic density chart comparing enamel, metal restoration, dentin, lamina dura, caries, abscess, and dental radiograph types",
    hudTitleAr: "جدول التفسير الشعاعي وأنواع الأشعة",
    hudBadgeEn: "White vs Creamy vs Black · Intraoral & Extraoral",
    targets: [
      {
        id: "t1",
        labelAr: "مناطق بيضاء (حشوة ومينا)",
        titleEn: "White Radiopaque Structures",
        descIq: "المينا والحشوات المعدنية والكوتا بيركا تمنع مرور الأشعة فتظهر بيضاء ناصعة (Radiopaque).",
        posPct: { x: 74, y: 24 },
        color: "#F8FAFC",
      },
      {
        id: "t2",
        labelAr: "العاج الكريمي واللامينا دورا",
        titleEn: "Creamy White Dentin & White Line Lamina Dura",
        descIq: "العاج يظهر بلون أبيض كريمي (أقل بياضاً من المينا)، والـ Lamina dura خط أبيض مستمر يحيط بالجذر.",
        posPct: { x: 70, y: 60 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "مناطق سوداء (تسوس وخراج)",
        titleEn: "Black/Gray Radiolucent Findings",
        descIq: "التسوس واللب والفراغات والخراج (Abscess) والكيس (Cyst) تسمح بمرور الأشعة فتظهر سوداء/رمادية.",
        posPct: { x: 79, y: 84 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "أنواع الأشعة (ذروية وبانورامية)",
        titleEn: "Intraoral (PA/BW) & Extraoral (OPG)",
        descIq: "الأشعة الفموية تشمل Periapical و Bitewing و Occlusal، والخارجية مثل Panoramic و Lateral oblique.",
        posPct: { x: 91, y: 74 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-densities",
        labelAr: "1. مقارنة الكثافات (أبيض / كريمي / أسود)",
        badgeEn: "Radiographic Appearance Table",
        duration: 8,
        focus: { cx: 0.55, cy: 0.52, scale: 1.0 },
        highlightTargetId: "t1",
        seeIq: "على اليسار التشريح الحقيقي للرحى: حشوة فضية، تسوس غامق، لب، وخراج ذروي، وعلى اليمين مقابلها تماماً كيف تظهر كظلال بيضاء وكريمية وسوداء بالأشعة.",
        whyIq: "مفتاح قراءة أي أشعة جذور هو مقارنة الكثافات: المعادن والمينا يمتصون الأشعة (أبيض)، بينما التسوس والخراج والأنسجة الرخوة تمرر الأشعة (أسود).",
        tipIq: "امتحانياً مهم: Dentin = Creamy white، الـ Lamina dura = White line around teeth، والخراج والـ Cyst والـ Decay = Black/gray area.",
        drawCue: "densities",
      },
      {
        id: "sc-pathosis",
        labelAr: "2. الخراج واللامينا دورا وأنواع التصوير",
        badgeEn: "Periapical Lesion & Exam Types",
        duration: 8,
        focus: { cx: 0.74, cy: 0.65, scale: 1.38 },
        highlightTargetId: "t3",
        xraySuggested: true,
        seeIq: "اللقطة مركزة على الأشعة باليمين: شوف الخراج الأسود تحت الذروة وانقطاع خط الـ Lamina dura حول الالتهاب، وبأسفل اليمين مصغرات Bitewing والبانوراما.",
        whyIq: "بعيادة علاج الجذور نعتمد أساساً على Intraoral Periapical لأنها أدق للتاج والجذر والذروة، وبحالات خاصة نلجأ للـ Bitewing أو الـ Panoramic.",
        tipIq: "أنواع الأشعة تنقسم إلى Intraoral (Periapical, Bitewing, Occlusal) و Extraoral (Lateral oblique of mandible, Panoramic).",
        drawCue: "lesion-types",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      // Connect anatomical landmark on left directly to its radiographic counterpart on right
      const metalL = toPx(0.25, 0.24);
      const metalR = toPx(0.73, 0.24);
      const cariesL = toPx(0.16, 0.34);
      const cariesR = toPx(0.65, 0.34);
      const lesionL = toPx(0.30, 0.85);
      const lesionR = toPx(0.79, 0.85);

      drawFlowTrack(ctx, [metalL, metalR], t, "#E2E8F0", { width: 1.6, dashed: true, pulseCount: 1 });
      drawFlowTrack(ctx, [cariesL, cariesR], (t + 0.33) % 1, "#FB7185", { width: 1.6, dashed: true, pulseCount: 1 });
      drawFlowTrack(ctx, [lesionL, lesionR], (t + 0.66) % 1, "#2DD4BF", { width: 1.9, pulseCount: 1, showTip: true });

      if (st.scenario.drawCue === "lesion-types") {
        drawShockRings(ctx, lesionR.x, lesionR.y, t, 30, "#FB7185");
        const ld1 = toPx(0.66, 0.56);
        const ld2 = toPx(0.69, 0.75);
        drawFixedGuide(ctx, ld1, ld2, "Lamina Dura (White)", "#FBBF24", false);
      } else {
        drawFixedGuide(ctx, toPx(0.66, 0.48), toPx(0.76, 0.48), "Creamy Dentin", "#FBBF24", true);
      }
    },
  },

  "p2-t2": {
    topicId: "p2-t2",
    simId: "p2-bisecting-sim",
    imageUrl: "/src/assets/images/p2_t2_bisecting_angle_1795591371752.jpg",
    imageAlt: "Bisecting angle technique: sagittal maxillary incisor with tilted film held by finger and PID cone perpendicular to bisector",
    hudTitleAr: "تقنية تنصيف الزاوية (Bisecting Angle)",
    hudBadgeEn: "Beam ⊥ Bisector Plane · Finger-Held",
    targets: [
      {
        id: "t1",
        labelAr: "المحور الطولي للسن",
        titleEn: "Long Axis of Tooth",
        descIq: "المحور الهندسي الممتد من التاج إلى قمة الجذر داخل العظم، ويصنع زاوية حادة مع الفيلم المائل.",
        posPct: { x: 50, y: 52 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "الفيلم المثبت بإصبع المريض",
        titleEn: "Finger-Held Tilted Film Plane",
        descIq: "المريض يثبت الفيلم بإصبعه على الحنك بدون حامل (Quick & comfortable)، لكن قد يثني الفيلم أو يحركه.",
        posPct: { x: 58, y: 63 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "قمع الأشعة ومنصف الزاوية",
        titleEn: "X-Ray Beam ⊥ Imaginary Bisector",
        descIq: "القمع يتوجه عمودياً بزاوية 90° على الخط الوهمي اللي ينصف الزاوية بين السن والفيلم، وليس على الفيلم نفسه!",
        posPct: { x: 30, y: 31 },
        color: "#38BDF8",
      },
    ],
    scenarios: [
      {
        id: "sc-geometry",
        labelAr: "1. هندسة منصف الزاوية والتوجيه 90°",
        badgeEn: "Rule of Isometry (Perpendicular to Bisector)",
        duration: 8,
        focus: { cx: 0.5, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t3",
        seeIq: "شوف المحور الطولي للقاطع العلوي ومحور الفيلم المائل؛ بينهما ينرسم خط وهمي بالوسط (Bisector)، والأشعة تنزل عمودية 90° على هذا المنصف.",
        whyIq: "الهدف من قاعدة تنصيف المثلثات إن طول الظل على الفيلم يساوي الطول الحقيقي للسن قدر الإمكان رغم عدم التوازي.",
        tipIq: "تعريف بالامتحان: X-ray beam directed PERPENDICULAR to imaginary plane bisecting the angle between film and tooth long axis.",
        drawCue: "bisector",
      },
      {
        id: "sc-pros-cons",
        labelAr: "2. مزايا الراحة ومساوئ التشويه والإشعاع",
        badgeEn: "3 Advantages vs 4 Disadvantages",
        duration: 8,
        focus: { cx: 0.54, cy: 0.56, scale: 1.32 },
        highlightTargetId: "t2",
        seeIq: "الكاميرا مقربة على إصبع المريض وهو ضاغط الفيلم داخل الحنك بدون حامل خارجي (مناسب مع Rubber dam).",
        whyIq: "من مميزاته: سهل ومريح، سريع بلا holder، وأسهل مع السد المطاطي؛ لكن مساوئه: تشويه بالصورة، عدم قابلية الإعادة الدقيقة، وتعريض إصبع المريض للأشعة!",
        tipIq: "أهم مساوئ الـ Bisecting الأربعة: 1) Image distortion 2) Non-reproducible 3) No aiming ring -> cone cutting 4) Finger exposure & film bending.",
        drawCue: "distortion",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      // Tooth apex/root apex near (0.54, 0.25), crown tip near (0.42, 0.85)
      // Film top near (0.66, 0.28), film bottom near (0.48, 0.90)
      const vertex = toPx(0.56, 0.30);
      const toothAxisBot = toPx(0.42, 0.84);
      const filmPlaneBot = toPx(0.49, 0.88);
      const bisectorBot = toPx(0.455, 0.86);

      // Stationary geometric reference lines (no jitter)
      drawFixedGuide(ctx, vertex, toothAxisBot, "Tooth Axis", "#FBBF24", true);
      drawFixedGuide(ctx, vertex, filmPlaneBot, "Film Plane", "#2DD4BF", true);
      drawFixedGuide(ctx, vertex, bisectorBot, "Bisector", "#F8FAFC", false);

      // Stationary angle bisection arc
      const aTooth = Math.atan2(toothAxisBot.y - vertex.y, toothAxisBot.x - vertex.x);
      const aFilm = Math.atan2(filmPlaneBot.y - vertex.y, filmPlaneBot.x - vertex.x);
      drawFixedAngleArc(ctx, vertex, Math.min(aTooth, aFilm), Math.max(aTooth, aFilm), 44, "θ/2 | θ/2", "#FBBF24");

      // Animated X-ray beam traveling perpendicularly to the bisector plane
      const beamStart = toPx(0.28, 0.32);
      const beamMid = toPx(0.51, 0.54);
      drawFlowTrack(ctx, [beamStart, beamMid], t, "#38BDF8", { width: 2.5, pulseCount: 2, showTip: true });

      if (st.scenario.drawCue === "distortion") {
        drawShockRings(ctx, toPx(0.59, 0.62).x, toPx(0.59, 0.62).y, t, 26, "#FB7185");
        drawCanvasPill(ctx, toPx(0.59, 0.72).x, toPx(0.59, 0.72).y, "Finger Exposure Risk", "#FB7185");
      } else {
        drawCanvasPill(ctx, toPx(0.39, 0.42).x, toPx(0.39, 0.42).y, "90° ⊥ Bisector", "#38BDF8");
      }
    },
  },

  "p3-t1": {
    topicId: "p3-t1",
    simId: "p3-paralleling-3d",
    imageUrl: "/src/assets/images/p3_t1_paralleling_xcp_1795591372515.jpg",
    imageAlt: "Paralleling technique using XCP bite-block, indicator rod, aiming ring, and parallel film with perpendicular X-ray beam",
    hudTitleAr: "تقنية التوازي (Paralleling / Right-Angle)",
    hudBadgeEn: "Film ∥ Tooth · Beam 90° ⊥ Film · XCP Ring",
    targets: [
      {
        id: "t1",
        labelAr: "حلقة التصويب البرتقالية",
        titleEn: "Aiming Ring Auto-Alignment",
        descIq: "الحلقة الخارجية تخلي توجيه القمع سهل جداً وتمنع خطأ Cone cutting بغض النظر عن وضعية رأس المريض.",
        posPct: { x: 22, y: 49 },
        color: "#F59E0B",
      },
      {
        id: "t2",
        labelAr: "مكعب العض ومحور السن",
        titleEn: "Tooth Long Axis & Bite-Block",
        descIq: "المريض يعض على القطعة البيضاء حتى تثبت الحساس موازياً لمحور السن تماماً؛ لكنها مزعجة أحياناً أو يصعب استعمالها مع السد.",
        posPct: { x: 61, y: 55 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الفيلم الموازي بزاوية 90°",
        titleEn: "Parallel Film (90° Perpendicular Beam)",
        descIq: "الفيلم يوازي السن (0° بينهما)، والأشعة تسقط بزاوية قائمة 90° على الفيلم فتعطي أدق صورة قابلة للإعادة.",
        posPct: { x: 73, y: 51 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-xcp-align",
        labelAr: "1. التوازي التام والتعامد 90° بالحامل",
        badgeEn: "Standardization & Accuracy",
        duration: 8,
        focus: { cx: 0.48, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t3",
        seeIq: "شوف المحور العمودي للضرس ومحور الفيلم على اليمين متوازيين تماماً، والقمع متحاذي ويا حلقة الـ XCP البرتقالية بزاوية 90°.",
        whyIq: "بسبب التوازي الهندسي وبُعد الفيلم، نحصل على صورة عالية الدقة بأقل تشويه، ونقدر نعيد نفس الزاوية بكل جلسة متابعة.",
        tipIq: "أبرز المزايا بالامتحان: 1) Better accuracy & less distortion 2) Easy alignment via aiming ring regardless of head position 3) Reproducible.",
        drawCue: "parallel-90",
      },
      {
        id: "sc-disadv",
        labelAr: "2. تحديات الحنك والانزعاج والسد المطاطي",
        badgeEn: "Disadvantages & Anatomic Limits",
        duration: 8,
        focus: { cx: 0.65, cy: 0.54, scale: 1.38 },
        highlightTargetId: "t2",
        seeIq: "تقريب داخل الفم على الحساس الصلب وحامل الـ Bite block خلف الرحى حيث يضغط على قاع الفم أو الحنك.",
        whyIq: "أكثر ثلاث مساوئ نواجهها بالعيادة: 1) يحتاج وقت وتمرين 2) غير مريح للمريض (خصوصاً بالـ shallow palate) 3) صعوبة وضعه بوجود Rubber dam clamp.",
        tipIq: "قارن دائماً بالامتحان: Paralleling = صعب مع الـ Rubber dam و Shallow palate، بينما Bisecting = أسهل مع الـ Rubber dam!",
        drawCue: "intraoral-limit",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      // Tooth long axis vs parallel receptor axis (vertical)
      const toothTop = toPx(0.615, 0.14);
      const toothBot = toPx(0.615, 0.76);
      const filmTop = toPx(0.735, 0.22);
      const filmBot = toPx(0.735, 0.80);

      drawFixedGuide(ctx, toothTop, toothBot, "Tooth Axis", "#FBBF24", true);
      drawFixedGuide(ctx, filmTop, filmBot, "0° Parallel Film", "#2DD4BF", false);

      // Horizontal X-ray beam passing through orange aiming ring to film at 90 degrees
      const beamL = toPx(0.16, 0.49);
      const beamR = toPx(0.735, 0.49);
      drawFlowTrack(ctx, [beamL, beamR], t, "#38BDF8", { width: 2.5, pulseCount: 2, showTip: true });

      // Crisp 90-degree perpendicular square corner marker at film intersection
      const corner = toPx(0.735, 0.49);
      ctx.save();
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.strokeRect(corner.x - 14, corner.y - 14, 14, 14);
      ctx.restore();
      drawCanvasPill(ctx, toPx(0.45, 0.43).x, toPx(0.45, 0.43).y, "90° ⊥ Film", "#38BDF8");

      if (st.scenario.drawCue === "intraoral-limit") {
        drawShockRings(ctx, toPx(0.72, 0.80).x, toPx(0.72, 0.80).y, t, 26, "#FB7185");
      }
    },
  },

  "p3-t2": {
    topicId: "p3-t2",
    simId: "p3-suggestions-12",
    imageUrl: "/src/assets/images/p3_t2_palate_molar_1795591519218.jpg",
    imageAlt: "Maxillary molar beneath hard palate and sinus with finger-held film near occlusal surface causing short buccal and long palatal roots",
    hudTitleAr: "إرشادات التصوير السريري ومشكلة الحنك الصلب",
    hudBadgeEn: "Film Near Occlusal · Short Buccal / Long Palatal",
    targets: [
      {
        id: "t1",
        labelAr: "قمع الأشعة والغار الفكي",
        titleEn: "PID Angle & Maxillary Sinus",
        descIq: "لما نخفض القمع أو يميل الحنك في الرحى العلوية، زاوية سقوط الأشعة على الجذور الخدية والحنكية تختلف.",
        posPct: { x: 25, y: 44 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "ميلان الحنك الصلب والإصبع",
        titleEn: "Sloped Hard Palate & Finger-Held Film",
        descIq: "الفيلم المثبت بالإصبع ينحصر بزاوية الحنك الصلب المائلة بدل أن يقف عمودياً وموازياً للجذور.",
        posPct: { x: 52, y: 64 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "حافة الفيلم قرب الطحن",
        titleEn: "Edge Parallel & Near Occlusal Surface",
        descIq: "النصيحة #1: نضع حافة الفيلم موازية وقريبة من السطح الطاحن/القاطع حتى تطلع قمم الجذور بمنتصف الفيلم.",
        posPct: { x: 36, y: 58 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "جذر حنكي طويل وخدي قصير",
        titleEn: "Short Buccal & Very Long Palatal Root",
        descIq: "بسبب زاوية الحنك، الرحى العلوية بالأفلام المثبتة بالإصبع تظهر بجذور خدية قصيرة وجذر حنكي طويل جداً.",
        posPct: { x: 86, y: 39 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-edge-occlusal",
        labelAr: "1. قاعدة وضع الفيلم قرب السطح الطاحن",
        badgeEn: "Suggestion #1: Centering Tooth Apices",
        duration: 8,
        focus: { cx: 0.44, cy: 0.52, scale: 1.18 },
        highlightTargetId: "t3",
        seeIq: "شوف حافة الفيلم الرمادية السفلية محاذية وقريبة من السطح الطاحن للضرس العلوي حتى تندفع قمم الجذور لنص مساحة الفيلم.",
        whyIq: "لو دفعت الفيلم زايد لفوق باتجاه سقف الحنك، التاج يختفي أو تتشوه الأنسجة، ولو نزلته زايد تنقص الذروة. القاعدة تضمن الذروة بالنص!",
        tipIq: "نصيحة 1 بالامتحان: ضع حافة الفيلم parallel to and near the incisal/occlusal surface حتى تكون الـ tooth apices near the center of the film.",
        drawCue: "occlusal-edge",
      },
      {
        id: "sc-palate-molar",
        labelAr: "2. أثر زاوية الحنك على طول الجذور بالرحى العلوية",
        badgeEn: "Suggestion #2: Buccal Short vs Palatal Long",
        duration: 8,
        focus: { cx: 0.64, cy: 0.5, scale: 1.05 },
        highlightTargetId: "t4",
        xraySuggested: true,
        seeIq: "بالصورة الشعاعية على اليمين شوف الفرق الواضح: الجذر الخدي طالع قصير (Foreshortened) والجذر الحنكي طالع أطول بهواي نحو الجيب الفكي.",
        whyIq: "بسبب ميلان سقف الحنك (Hard palate angle)، الجذر الحنكي يبتعد عن الفيلم أكثر أو يصطدم بزاوية مسطحة فيظهر متطاولاً جداً مقارنة بالخدية.",
        tipIq: "نصيحة 2 بالامتحان (تتكرر كثيراً): finger-held films show maxillary molars with SHORT buccal roots and VERY LONG palatal root.",
        drawCue: "root-lengths",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      const cone = toPx(0.24, 0.45);
      const filmCenter = toPx(0.47, 0.61);
      drawFlowTrack(ctx, [cone, filmCenter], t, "#38BDF8", { width: 2.3, pulseCount: 2, showTip: true });

      if (st.scenario.drawCue === "occlusal-edge") {
        drawFixedGuide(ctx, toPx(0.29, 0.57), toPx(0.43, 0.68), "Edge ∥ Occlusal", "#FBBF24", false);
        drawShockRings(ctx, toPx(0.35, 0.36).x, toPx(0.35, 0.36).y, t, 22, "#2DD4BF");
      } else {
        // Highlight short buccal vs very long palatal root right on the radiograph inset
        drawFixedGuide(ctx, toPx(0.795, 0.31), toPx(0.795, 0.55), "Short Buccal", "#2DD4BF", false);
        drawFixedGuide(ctx, toPx(0.875, 0.21), toPx(0.875, 0.55), "Long Palatal", "#FB7185", false);
      }
    },
  },

  "p4-t1": {
    topicId: "p4-t1",
    simId: "p4-slob-sim",
    imageUrl: "/src/assets/images/p4_t1_slob_premolar_1795591374321.jpg",
    imageAlt: "Plastic film holder standardization with horizontal X-ray tube shift separating two premolar canals via SLOB rule",
    hudTitleAr: "الحامل البلاستيكي وقاعدة الجسم الشدقي (SLOB)",
    hudBadgeEn: "Plastic Holder · Same Lingual, Opposite Buccal",
    targets: [
      {
        id: "t1",
        labelAr: "تحريك القمع أفقياً",
        titleEn: "Mesial / Distal Cone Shift",
        descIq: "نحرك القمع أفقياً 20° نحو الإنسي (Mesial) أو الوحشي (Distal) لفصل القنوات المنطبقة فوق بعضها.",
        posPct: { x: 27, y: 50 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "القناتان والمبردان (B/L)",
        titleEn: "Buccal & Lingual Root Canals",
        descIq: "في الضواحك والأرحاء تكون القناة الخدية واللسانية على خط واحد بالأشعة الاعتيادية وتندمج كقناة واحدة.",
        posPct: { x: 47.5, y: 55 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الحامل البلاستيكي القياسي",
        titleEn: "Plastic Film Holder (Standardization)",
        descIq: "الحامل البلاستيكي في التوازي يمنع حركة الفيلم، يسهل التوجيه بغض النظر عن وضعية الرأس، ويوحد القياس.",
        posPct: { x: 62, y: 52 },
        color: "#94A3B8",
      },
      {
        id: "t4",
        labelAr: "انفصال القنوات (SLOB)",
        titleEn: "Same Lingual, Opposite Buccal",
        descIq: "الأبعد عن الأشعة (اللساني/الحنكي) يتحرك بنفس اتجاه القمع (Same)، والأقرب للأشعة (الخدي) يتحرك بالاتجاه المعاكس (Opposite).",
        posPct: { x: 88, y: 50 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-holder",
        labelAr: "1. وظيفة الحامل البلاستيكي بتوحيد التصوير",
        badgeEn: "Suggestion #3: Plastic Film Holder",
        duration: 8,
        focus: { cx: 0.48, cy: 0.52, scale: 1.0 },
        highlightTargetId: "t3",
        seeIq: "الحامل البلاستيكي الرمادي ماسك الفيلم بشكل عمودي ثابت وراء الضاحك ذو الجذرين وبيهم مبردين، والقمع متمركز قبله.",
        whyIq: "الحامل البلاستيكي بتقنية التوازي يثبت الفيلم ويمنع تحركه وقت التعرض، ويخلي توجيه الحزمة سهل حتى لو رأس المريض متحرك.",
        tipIq: "وظائف الحامل الثلاث بالامتحان: 1) Standardization 2) Film positioning & prevent movement 3) Easy beam alignment irrespective of head position.",
        drawCue: "holder",
      },
      {
        id: "sc-slob",
        labelAr: "2. تطبيق قاعدة SLOB عند تحريك القمع",
        badgeEn: "SLOB: Same Lingual, Opposite Buccal",
        duration: 8,
        focus: { cx: 0.65, cy: 0.5, scale: 1.15 },
        highlightTargetId: "t4",
        xraySuggested: true,
        seeIq: "عند إزاحة القمع أفقياً، الحزمة تمر بزاوية فتنفصل صورة القناتين على الفيلم باليمين بوضوح بدل أن تنطبق واحدة فوق الأخرى.",
        whyIq: "من يتحرك القمع للـ Mesial: القناة اللسانية/الحنكية (الأقرب للفيلم) تروح للـ Mesial وياه (SAME)، والخدية (الأقرب للقمع) تروح للـ Distal عكسه (OPPOSITE).",
        tipIq: "أهم قاعدة بالمحاضرة: SLOB = Same Lingual, Opposite Buccal (اللساني يمشي مع حركة القمع، والخدي يعكسها).",
        drawCue: "slob-shift",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      const cone = toPx(0.28, 0.5);
      const premolar = toPx(0.475, 0.52);
      const film = toPx(0.60, 0.5);
      if (st.scenario.drawCue === "holder") {
        drawFlowTrack(ctx, [cone, premolar, film], t, "#38BDF8", { width: 2.3, pulseCount: 2, showTip: true });
        drawFixedGuide(ctx, toPx(0.60, 0.30), toPx(0.60, 0.72), "Fixed Plastic Holder", "#2DD4BF", false);
      } else {
        const arcCenter = toPx(0.475, 0.52);
        const shiftPt = drawOrbitPath(ctx, arcCenter.x, arcCenter.y, 135, 58, t, {
          startAngle: Math.PI * 0.78,
          spanAngle: Math.PI * 0.44,
          color: "#FBBF24",
        });
        drawFlowTrack(ctx, [shiftPt, premolar, toPx(0.88, 0.50)], t, "#38BDF8", { width: 2.1, pulseCount: 2, showTip: true });
        drawFixedGuide(ctx, toPx(0.84, 0.39), toPx(0.84, 0.60), "Opposite (B)", "#FB7185", true);
        drawFixedGuide(ctx, toPx(0.91, 0.39), toPx(0.91, 0.60), "Same (L)", "#2DD4BF", false);
      }
    },
  },

  "p4-t2": {
    topicId: "p4-t2",
    simId: "p4-frames-clamps",
    imageUrl: "/src/assets/images/p4_t2_rubber_dam_1795591375159.jpg",
    imageAlt: "Comparison of radiolucent plastic rubber dam frame and clear radiograph versus radiopaque metal frame and clamp masking roots",
    hudTitleAr: "جودة الأشعة: السد المطاطي البلاستيكي مقابل المعدني",
    hudBadgeEn: "Radiolucent Frame vs Radiopaque Metal Masking",
    targets: [
      {
        id: "t1",
        labelAr: "الإطار البلاستيكي الشفاف",
        titleEn: "Radiolucent Plastic Dam Frame",
        descIq: "الإطار البلاستيكي يمرر الأشعة (Radiolucent) بدون ما يترك أي ظل أبيض يخرب الصورة.",
        posPct: { x: 24, y: 17 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "أشعة واضحة للذروة والآفة",
        titleEn: "Unobstructed Periapical View",
        descIq: "الجذور والآفة الذروية طالعة كاملة وبوضوح تام تحت السد البلاستيكي أثناء عمل حشوة الجذر.",
        posPct: { x: 39, y: 63 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "الإطار والملقط المعدني",
        titleEn: "Metal Frame & Metal Clamp",
        descIq: "المعدن يمتص الأشعة بقوة (Radiopaque) ويصنع حواجز بيضاء ناصعة على الفيلم.",
        posPct: { x: 71, y: 49 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "حجب التراكيب والأدوات",
        titleEn: "Masking Important Root Structures",
        descIq: "الـ Metal clamp والإطار المعدني ممكن يغطون ذروة الجذر أو الآفة أو نهاية المبرد بالأشعة.",
        posPct: { x: 87, y: 63 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-plastic",
        labelAr: "1. الإطار البلاستيكي الشفاف (لا يتداخل مع الأشعة)",
        badgeEn: "Radiolucent Advantage",
        duration: 8,
        focus: { cx: 0.27, cy: 0.5, scale: 1.32 },
        highlightTargetId: "t2",
        seeIq: "على اليسار إطار أزرق بلاستيكي على الضرس، وبجنبه صورة الأشعة طالعة صافية وتبين الآفة السوداء بوضوح بدون أي ظل يعيق القراءة.",
        whyIq: "بما أن البلاستيك شفيف للأشعة (Radiolucent)، ما نضطر نشيل السد المطاطي أثناء تصوير طول العمل أو الكوتا بيركا فنحافظ على التعقيم.",
        tipIq: "امتحانياً: Radiolucent rubber dam frames do NOT interfere with taking radiography.",
        drawCue: "plastic-clear",
      },
      {
        id: "sc-metal",
        labelAr: "2. الإطار والملقط المعدني وحجب الجذور",
        badgeEn: "Metal Frame/Clamp Masking",
        duration: 8,
        focus: { cx: 0.74, cy: 0.5, scale: 1.32 },
        highlightTargetId: "t4",
        xraySuggested: true,
        seeIq: "على اليمين إطار وملقط معدني، شوف كيف طلعوا بالأشعة على شكل أشرطة بيضاء صلبة غطّت التاج ومسار الجذور.",
        whyIq: "المعادن كثافتها عالية جداً فتمنع مرور الأشعة وتسبب ظلال Radiopaque ممكن تخفي كسر، انثقاب، أو طرف المبرد قرب الذروة.",
        tipIq: "احذر بالعيادة والامتحان: Metal frames and clamps MAY MASK important structures on the film.",
        drawCue: "metal-mask",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "plastic-clear") {
        drawFlowTrack(ctx, [toPx(0.22, 0.45), toPx(0.39, 0.58)], t, "#2DD4BF", { width: 2.2, pulseCount: 2, showTip: true });
        drawShockRings(ctx, toPx(0.36, 0.72).x, toPx(0.36, 0.72).y, t, 22, "#2DD4BF");
        drawCanvasPill(ctx, toPx(0.39, 0.33).x, toPx(0.39, 0.33).y, "Radiolucent = Clear", "#2DD4BF");
      } else {
        drawFlowTrack(ctx, [toPx(0.71, 0.49), toPx(0.87, 0.58)], t, "#FB7185", { width: 2.2, pulseCount: 2, showTip: true });
        drawShockRings(ctx, toPx(0.87, 0.66).x, toPx(0.87, 0.66).y, t, 28, "#FB7185");
        drawCanvasPill(ctx, toPx(0.87, 0.42).x, toPx(0.87, 0.42).y, "Radiopaque Masking!", "#FB7185");
      }
    },
  },

  "p5-t1": {
    topicId: "p5-t1",
    simId: "p5-processing-sim",
    imageUrl: "/src/assets/images/p5_t1_film_processor_1795591376644.jpg",
    imageAlt: "Quick automated processor heated to 37.7 C with developer and fixer baths, chronological film mount, and magnification monitor",
    hudTitleAr: "التحميض الآلي السريع (37.7°C) والتأريخ والتكبير",
    hudBadgeEn: "Heated Bath 37.7°C · Chronological Order · Zoom",
    targets: [
      {
        id: "t1",
        labelAr: "حوض المظهر والحرارة 37.7°C",
        titleEn: "Developer Bath (Thermostat 37.7°C)",
        descIq: "سخان منظم الحرارة يحافظ على حرارة المظهر والمثبت عند 37.7 درجة مئوية فيختصر وقت التحميض لثواني معدودة.",
        posPct: { x: 13.5, y: 72 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "المثبت والغسل المتسلسل",
        titleEn: "Rinse & Fixer Tank Sequence",
        descIq: "الفيلم المكشوف يمر أولاً بالمظهر ثم الغسل ثم المثبت تلقائياً لإعطاء صورة واضحة وثابتة.",
        posPct: { x: 26, y: 71 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "ترتيب الأفلام بالتاريخ",
        titleEn: "Chronological Film Mounting",
        descIq: "العامل #3: ترتيب الأفلام في إطار العرض بالتسلسل الزمني (قبل، أثناء، الحشو، المتابعة) لتسهيل المقارنة.",
        posPct: { x: 52, y: 49 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "التكبير والعدسة المكبرة",
        titleEn: "Magnification & Digital Zoom",
        descIq: "العامل #4: استخدام عدسة مكبرة أو التكبير الرقمي على الشاشة لرؤية التفاصيل الدقيقة كالقنوات الإضافية.",
        posPct: { x: 83, y: 40 },
        color: "#A78BFA",
      },
    ],
    scenarios: [
      {
        id: "sc-37-7",
        labelAr: "1. آلية التحميض السريع بالحمام الساخن 37.7°C",
        badgeEn: "Quick Automated Processing (37.7°C)",
        duration: 8,
        focus: { cx: 0.22, cy: 0.5, scale: 1.32 },
        highlightTargetId: "t1",
        seeIq: "الفيلم يمشي على البكرات من الحوض الأزرق (Developer) إلى حوض الماء بالنص ثم إلى الحوض البرتقالي (Fixer) بحرارة ثابتة.",
        whyIq: "الحرارة المنظمة عند 37.7°C تسرّع التفاعل الكيميائي بشكل آمن بدل الانتظار بالتحميض اليدوي البطيء، فترجع تشتغل بسرعة والـ patient ما ينتظر.",
        tipIq: "رقم امتحان مقدس: درجة حرارة السخان المنظم للـ developer والـ fixer هي 37.7°C بالضبط!",
        drawCue: "processor-flow",
      },
      {
        id: "sc-mount-zoom",
        labelAr: "2. التأريخ المتسلسل والتكبير التشخيصي",
        badgeEn: "Chronological Mount & Magnification",
        duration: 8,
        focus: { cx: 0.70, cy: 0.52, scale: 1.24 },
        highlightTargetId: "t4",
        seeIq: "بالوسط إطار يحتوي 4 أفلام مرتبة تاريخياً من اليسار لليمين، وعلى اليمين الشاشة والعدسة المكبرة لفحص تفاصيل الجذر.",
        whyIq: "التشخيص ما يخلص من يطلع الفيلم! ترتيب الأفلام تاريخياً يمنع اللخبطة بين الزيارات، والتكبير يكشف شقوق أو قنوات دقيقة.",
        tipIq: "عوامل الجودة 2–4: (2) Quick automated processing at 37.7°C، (3) Mounted in chronological order، (4) Viewed with magnification.",
        drawCue: "mount-zoom",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      // Roller film track inside the 3-tank processor
      const track = [
        toPx(0.135, 0.72),
        toPx(0.115, 0.34),
        toPx(0.16, 0.22),
        toPx(0.20, 0.56),
        toPx(0.23, 0.22),
        toPx(0.265, 0.71),
      ];
      drawFlowTrack(ctx, track, t, "#38BDF8", { width: 2.4, pulseCount: 2, showTip: true });
      drawCanvasPill(ctx, toPx(0.20, 0.85).x, toPx(0.20, 0.85).y, "37.7°C Bath", "#F59E0B");

      if (st.scenario.drawCue === "processor-flow") {
        drawSprayStream(ctx, toPx(0.135, 0.63), Math.PI * 0.5, 0.5, 22, t, "#67E8F9");
      } else {
        drawFlowTrack(ctx, [toPx(0.41, 0.49), toPx(0.62, 0.49)], t, "#2DD4BF", { width: 2.1, pulseCount: 1, showTip: true });
        drawShockRings(ctx, toPx(0.81, 0.76).x, toPx(0.81, 0.76).y, t, 30, "#A78BFA");
      }
    },
  },

  "p5-t2": {
    topicId: "p5-t2",
    simId: "p5-8-info",
    imageUrl: "/src/assets/images/p5_t2_endo_landmarks_1795591521194.jpg",
    imageAlt: "Eight endodontic radiographic findings: pulp sclerosis, external resorption, lamina dura, working length K-file, master GP cone, broken instrument, lateral perforation, mental foramen",
    hudTitleAr: "المعلومات الثمانية من صورة الأشعة (8 Items)",
    hudBadgeEn: "Crown/Pulp · WL · Master Cone · Broken File · Landmarks",
    targets: [
      {
        id: "t1",
        labelAr: "التاج واللب وتكلس القنوات",
        titleEn: "1-2: Crown, Pulp & Hard Tissue Sclerosis",
        descIq: "تشريح التاج وحجرة اللب، وتغيرات النسج الصلبة مثل التكلس (Sclerosis) اللي يصغر القناة.",
        posPct: { x: 27, y: 42 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "امتصاص الجذر واللامينا دورا",
        titleEn: "2-3: Resorption, Root Curvature & PDL",
        descIq: "الامتصاص الجذري (Resorption)، وعدد وحجم واتجاه الجذور وانحناءاتها في العظم.",
        posPct: { x: 37, y: 54 },
        color: "#FB7185",
      },
      {
        id: "t3",
        labelAr: "طول العمل وقمع الكوتا بيركا",
        titleEn: "4 & 6: Working Length & Master Cone",
        descIq: "تقدير طول العمل بالمبرد وتأكيد وصول قمع الكوتا بيركا الرئيسي (Master cone) للذروة قبل الحشو النهائي.",
        posPct: { x: 75, y: 51 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "الثقب الذقني والانثقاب والأداة المكسورة",
        titleEn: "5, 7 & 8: Landmarks, Broken File & Perforation",
        descIq: "تحديد المعالم مثل الثقب الذقني والجيب الفكي، واكتشاف مكان أداة مكسورة أو انثقاب جانبي (Perforation).",
        posPct: { x: 74, y: 80 },
        color: "#38BDF8",
      },
    ],
    scenarios: [
      {
        id: "sc-anatomy-alter",
        labelAr: "1. تشريح السن والتكلس والامتصاص والمعالم (1–5)",
        badgeEn: "Items 1–5: Anatomy, Sclerosis, Resorption, Landmarks",
        duration: 8,
        focus: { cx: 0.31, cy: 0.5, scale: 1.25 },
        highlightTargetId: "t1",
        seeIq: "الرحى باليسار تبين حصيات تكلس جوه حجرة اللب، وتآكل امتصاصي على جدار الجذر، وخطوط الأربطة والعظم المحيط.",
        whyIq: "قبل لا تلمس السن بالفايل لازم تعرف إذا القناة متكلسة (Sclerosis)، أو بيها امتصاص (Resorption)، وكم جذر واتجاهه وعلاقته بالجيب أو الثقب الذقني.",
        tipIq: "احفظ البنود 1–5: التاج واللب، Sclerosis/Resorption، عدد وحجم واتجاه الجذور، طول العمل، والمعالم التشريحية (Mental foramen & sinus).",
        drawCue: "left-tooth",
      },
      {
        id: "sc-endo-check",
        labelAr: "2. تأكيد الكوتا بيركا وكشف الحوادث (6–8)",
        badgeEn: "Items 6–8: Master Cone, Broken File & Perforation",
        duration: 8,
        focus: { cx: 0.72, cy: 0.52, scale: 1.25 },
        highlightTargetId: "t3",
        seeIq: "الضاحك باليمين يبين المبرد والقمع الوردي واصلين للذروة، وبجدار الجذر انثقاب جانبي، وتحته الثقب الذقني الدائري وقناة الفك.",
        whyIq: "الأشعة هي الحكم الصادق اللي يأكدلك إن قمع الكوتا بيركا واصل مضبوط، أو ينبهك مبكراً لو انكسر فايل أو صار انثقاب جانبي أثناء التحضير.",
        tipIq: "البنود 6–8 بالامتحان: 6) Confirm position of master cone 7) Locate separated/broken instruments 8) Locate root perforations.",
        drawCue: "right-tooth",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "left-tooth") {
        drawShockRings(ctx, toPx(0.27, 0.41).x, toPx(0.27, 0.41).y, t, 24, "#FBBF24");
        drawShockRings(ctx, toPx(0.365, 0.55).x, toPx(0.365, 0.55).y, (t + 0.5) % 1, 20, "#FB7185");
        drawFlowTrack(ctx, [toPx(0.21, 0.44), toPx(0.18, 0.84)], t, "#38BDF8", { width: 1.8, pulseCount: 1 });
      } else {
        drawFlowTrack(ctx, [toPx(0.715, 0.14), toPx(0.72, 0.73)], t, "#38BDF8", { width: 2.0, reciprocate: true, pulseCount: 1 });
        drawFlowTrack(ctx, [toPx(0.785, 0.14), toPx(0.74, 0.73)], (t + 0.3) % 1, "#F472B6", { width: 2.0, pulseCount: 1 });
        drawFixedGuide(ctx, toPx(0.75, 0.54), toPx(0.81, 0.55), "Perforation", "#FB7185", false);
        drawShockRings(ctx, toPx(0.70, 0.83).x, toPx(0.70, 0.83).y, t, 22, "#2DD4BF");
      }
    },
  },

  "p6-t1": {
    topicId: "p6-t1",
    simId: "p6-ccd-overview",
    imageUrl: "/src/assets/images/p6_t1_ccd_sensor_1795591377919.jpg",
    imageAlt: "Transition from silver halide film to direct digital CCD wired sensor connected via USB to laptop displaying instant dental radiograph",
    hudTitleAr: "مقدمة التصوير الرقمي والنظام المباشر (CCD)",
    hudBadgeEn: "Silver Halide → 3 Digital Variations · Direct CCD",
    targets: [
      {
        id: "t1",
        labelAr: "قمع الأشعة بجرعة منخفضة",
        titleEn: "X-Ray Beam Toward Digital Sensor",
        descIq: "الأشعة توجه نحو حساس إلكتروني فائق الحساسية يحتاج جرعة إشعاع أقل بكثير من الفيلم الاعتيادي.",
        posPct: { x: 24, y: 44 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "حساس الـ CCD السلكي",
        titleEn: "Direct Digital Wired CCD Sensor",
        descIq: "النظام الرقمي المباشر (Direct digital) يستقبل الأشعة مباشرة داخل الفم ويرسل الإشارة عبر السلك للحاسوب.",
        posPct: { x: 39, y: 53 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "المعالجة والعرض الفوري",
        titleEn: "USB Computer Processing & Display",
        descIq: "خلال ثواني تطلع الصورة رقمياً على الحاسوب مع إمكانية التعديل والتكبير والحفظ مباشرة.",
        posPct: { x: 77, y: 49 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "بديل فيلم هاليد الفضة",
        titleEn: "Shift From Silver Halide Film",
        descIq: "طب الأسنان يوازي التصوير الفوتوغرافي بالانتقال من أفلام هاليد الفضة التقليدية إلى الأنظمة الرقمية الثلاثة.",
        posPct: { x: 16, y: 85 },
        color: "#94A3B8",
      },
    ],
    scenarios: [
      {
        id: "sc-digital-shift",
        labelAr: "1. التحول من فيلم الفضة والأنواع الثلاثة الرقمية",
        badgeEn: "From Silver Halide to 3 Digital Variations",
        duration: 8,
        focus: { cx: 0.45, cy: 0.52, scale: 1.0 },
        highlightTargetId: "t4",
        seeIq: "فيلم هاليد الفضة الأخضر مرمي تحت بالزاوية اليسرى، بينما الأشعة تصوّب على حساس CCD متصل بكابل للابتوب لعرض الصورة فوراً.",
        whyIq: "مثل ما تركت الكاميرات أفلام التحميض وصارت ديجيتال، طب الأسنان انتقل لـ 3 أنظمة رقمية: المباشر CCD، والفوسفور PSP، وغير المباشر بالمسح.",
        tipIq: "الأنواع الثلاثة بالامتحان: 1) Direct digital (CCD) 2) Storage phosphor system (PSP) 3) Indirect digital system.",
        drawCue: "cable-flow",
      },
      {
        id: "sc-ccd-live",
        labelAr: "2. مسار الإشارة المباشر داخل حساس CCD",
        badgeEn: "Direct CCD Signal Transmission",
        duration: 8,
        focus: { cx: 0.58, cy: 0.5, scale: 1.25 },
        highlightTargetId: "t2",
        xraySuggested: true,
        seeIq: "الحساس داخل الفك يلتقط الإشارة الكهربائية ويرسلها مباشرة عبر السلك إلى منفذ الحاسوب لتظهر الأشعة بوضوح فوري.",
        whyIq: "حساس الـ CCD يُعرف بالـ Direct لأن ماكو مرحلة وسطية ولا مسح ليزري ولا تحميض؛ الصورة تتولد باللحظة نفسها.",
        tipIq: "مهم بالامتحان: Direct digital system يعتمد على CCD sensor موصول مباشرة بالحاسوب دون الحاجة لغرفة مظلمة.",
        drawCue: "monitor-pulse",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      drawFlowTrack(ctx, [toPx(0.24, 0.44), toPx(0.37, 0.51)], t, "#38BDF8", { width: 2.3, pulseCount: 1, showTip: true });
      const cablePath = [
        toPx(0.39, 0.55),
        toPx(0.45, 0.66),
        toPx(0.47, 0.91),
        toPx(0.56, 0.72),
      ];
      drawFlowTrack(ctx, cablePath, t, "#2DD4BF", { width: 2.4, pulseCount: 2, showTip: true });

      if (st.scenario.drawCue === "monitor-pulse") {
        drawShockRings(ctx, toPx(0.77, 0.47).x, toPx(0.77, 0.47).y, t, 32, "#FBBF24");
      }
    },
  },

  "p6-t2": {
    topicId: "p6-t2",
    simId: "p6-rvg-components",
    imageUrl: "/src/assets/images/p6_t2_rvg_system_1795591453838.jpg",
    imageAlt: "RVG direct digital system components left-to-right: Radio CCD sensor in disposable sheath with fiber-optic shield and cold sterilization tray, Visio monitor unit, Graphy printer",
    hudTitleAr: "مكونات النظام الرقمي المباشر الثلاثة (RVG)",
    hudBadgeEn: "1) Radio (Shield + Sheath) · 2) Visio · 3) Graphy",
    targets: [
      {
        id: "t1",
        labelAr: "مكون الـ Radio ودرع الألياف",
        titleEn: "Radio Component + Fiber-Optic Shield",
        descIq: "حساس عالي الدقة مساحة فعاليته تشبه الفيلم، محمي بدرع ألياف بصرية (Fiber-optic shield) لمنع تلفه بالأشعة.",
        posPct: { x: 24, y: 38 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "الكيس العازل والتعقيم البارد",
        titleEn: "Disposable Plastic Sheath & Cold Sterilization",
        descIq: "ممنوع يدخل الحساس للأوتوكلاف! يتعقم بالتعقيم البارد (Cold sterilization) ويتغلف بكيس بلاستيكي للاستعمال الواحد.",
        posPct: { x: 26, y: 62 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "مكون الـ Visio والمعالجة",
        titleEn: "Visio: Processing Unit & Video Monitor",
        descIq: "يتكون من وحدة معالجة وعرض وشاشة فيديو تحول إشارة الحساس إلى صورة رقمية عالية التباين.",
        posPct: { x: 60, y: 39 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "مكون الـ Graphy والطابعة",
        titleEn: "Graphy: High-Resolution Printer",
        descIq: "طابعة طبية عالية الدقة توفر نسخة ورقية مطبوعة (Hard-copy) من الصورة عند الحاجة للملف أو المريض.",
        posPct: { x: 86, y: 59 },
        color: "#A78BFA",
      },
    ],
    scenarios: [
      {
        id: "sc-radio-care",
        labelAr: "1. مكون Radio وحمايته بالألياف البصرية والتعقيم البارد",
        badgeEn: "Radio Component Protection & Infection Control",
        duration: 8,
        focus: { cx: 0.28, cy: 0.48, scale: 1.32 },
        highlightTargetId: "t1",
        seeIq: "الحساس باليسار مقطوع جزئياً حتى يبين الدرع الذهبي للألياف البصرية جواه، ومغلف بغلاف شفاف، وبجنبه حوض المحلول المعقم البارد.",
        whyIq: "الحساس غالي وحساس للحرارة والأشعة: درع الـ Fiber-optic يحميه من تخرب X-ray، والغلاف البلاستيكي + التعقيم البارد يحمون المريض بدون حرق الإلكترونيات.",
        tipIq: "امتحانياً: الـ Radio محمي بـ Fiber-optic shield against X-ray degradation، ويُعقم بـ Cold sterilization + Disposable plastic sheath.",
        drawCue: "radio-care",
      },
      {
        id: "sc-visio-graphy",
        labelAr: "2. مسار العرض (Visio) والطباعة الورقية (Graphy)",
        badgeEn: "Visio Monitor → Graphy Hard-Copy",
        duration: 8,
        focus: { cx: 0.67, cy: 0.5, scale: 1.15 },
        highlightTargetId: "t3",
        seeIq: "البيانات تمر بالكابل الأسود نحو الصندوق المعالج وشاشة العرض (Visio)، وبعدين تخرج نسخة مطبوعة جاهزة من الطابعة (Graphy) باليمين.",
        whyIq: "كلمة RVG جاية من دمج المكونات الثلاثة: Radio (الاستقبال) + Visio (العرض بالشاشة) + Graphy (الطباعة الفورية).",
        tipIq: "احفظ الثلاثي بالامتحان: 1) Radio = Sensor 2) Visio = Display unit + monitor 3) Graphy = High-res printer for hard-copy.",
        drawCue: "rvg-chain",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      drawFlowTrack(ctx, [toPx(0.28, 0.68), toPx(0.51, 0.67)], t, "#38BDF8", { width: 2.2, pulseCount: 2, showTip: true });
      drawFlowTrack(ctx, [toPx(0.68, 0.63), toPx(0.77, 0.59)], (t + 0.4) % 1, "#A78BFA", { width: 2.0, pulseCount: 1, showTip: true });

      if (st.scenario.drawCue === "radio-care") {
        drawShockRings(ctx, toPx(0.22, 0.39).x, toPx(0.22, 0.39).y, t, 24, "#FBBF24");
        drawSprayStream(ctx, toPx(0.26, 0.58), Math.PI * 0.5, 0.6, 20, t, "#67E8F9");
      } else {
        drawShockRings(ctx, toPx(0.60, 0.37).x, toPx(0.60, 0.37).y, t, 30, "#2DD4BF");
      }
    },
  },

  "p7-t1": {
    topicId: "p7-t1",
    simId: "p7-ccd-pros-cons",
    imageUrl: "/src/assets/images/p7_t1_bulky_ccd_1795591380751.jpg",
    imageAlt: "Bulky thick wired CCD sensor pressing lingual mucosa beside lower molar versus enhanced monitor image and storage HDD",
    hudTitleAr: "حساس الـ CCD: المزايا الخمس والمساوئ الأربع",
    hudBadgeEn: "5 Advantages vs 4 Disadvantages (Bulky + Wire + Storage)",
    targets: [
      {
        id: "t1",
        labelAr: "جسم الحساس السميك والسلك",
        titleEn: "Bulky Sensor & Rigid Wire",
        descIq: "العيوب (1–2): الحساس سميك وصلب، ووجود السلك يصعب التموضع ويسبب أخطاء زاوية متكررة.",
        posPct: { x: 40, y: 39 },
        color: "#FB7185",
      },
      {
        id: "t2",
        labelAr: "ضغط قاع الفم وانزعاج المريض",
        titleEn: "Discomfort Pressing Oral Tissues",
        descIq: "العيب (3): سمك الحساس وصلابته يضغطان على اللسان وقاع الفم الحساسين فيتألم المريض.",
        posPct: { x: 38, y: 57 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "تحسين الصورة وجرعة أقل",
        titleEn: "Low Radiation & Digital Enhancement",
        descIq: "المزايا (a–e): جرعة منخفضة، بلا غرفة مظلمة، جودة ثابتة، تكبير وتحسين تشخيصي، ومثالية لثقافة المريض.",
        posPct: { x: 83, y: 37 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "مشكلة سعة التخزين (HDD)",
        titleEn: "Image Storage & Hard Drive Burden",
        descIq: "العيب (4): حجم الصور الرقمية ومشاكل الأرشفة والنسخ الاحتياطي وتخزين الحالات المستمر.",
        posPct: { x: 83, y: 69 },
        color: "#38BDF8",
      },
    ],
    scenarios: [
      {
        id: "sc-cons",
        labelAr: "1. المساوئ الأربع بالعيادة (السماكة والسلك والضغط)",
        badgeEn: "4 Disadvantages: Wire · Bulk · Discomfort · Storage",
        duration: 8,
        focus: { cx: 0.36, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t1",
        seeIq: "الحساس الأسود السميك وسلكه يدفعون اللسان للخلف ويضغطون على قاع الفم الحساس بجانب الرحى السفلية.",
        whyIq: "رغم إن الصورة تطلع فوراً، صعوبة تثبيت حساس سميك ومربوط بسلك تخلي المريض ينزعج وممكن يتحرك فيخرب محاذاة القمع.",
        tipIq: "امتحانياً مهم: مساوئ الـ CCD الأربع = 1) Presence of wire 2) Bulky sensor 3) Discomfort to patient 4) Storage of images.",
        drawCue: "ccd-pressure",
      },
      {
        id: "sc-pros",
        labelAr: "2. المزايا الخمس: جودة ثابتة وتكبير وتثقيف المريض",
        badgeEn: "5 Advantages: Low Dose · No Darkroom · Education",
        duration: 8,
        focus: { cx: 0.78, cy: 0.5, scale: 1.25 },
        highlightTargetId: "t3",
        xraySuggested: true,
        seeIq: "التركيز على الشاشة الطبية باليمين: أشعة حادة مكبّرة بدون غرفة تحميض، وتحتها أيقونة القرص الصلب لحفظ ملفات المرضى.",
        whyIq: "الشاشة الكبيرة بالعيادة تخلي المريض يشوف الالتهاب أو الحشوة قدامه (Patient education) وبنفس الوقت نكبر الصورة ونقيس بدقة.",
        tipIq: "المزايا الخمس لـ CCD: Low dose + No darkroom + Consistent quality + Digital enhancement & enlargement + Patient education.",
        drawCue: "ccd-screen",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "ccd-pressure") {
        drawShockRings(ctx, toPx(0.38, 0.57).x, toPx(0.38, 0.57).y, t, 26, "#FB7185");
        drawFlowTrack(ctx, [toPx(0.06, 0.25), toPx(0.33, 0.30)], t, "#F59E0B", { width: 2.2, reciprocate: true, pulseCount: 1 });
        drawCanvasPill(ctx, toPx(0.28, 0.70).x, toPx(0.28, 0.70).y, "Bulky + Wire Pressure", "#FB7185");
      } else {
        drawFlowTrack(ctx, [toPx(0.83, 0.55), toPx(0.83, 0.65)], t, "#38BDF8", { width: 2.0, pulseCount: 1, showTip: true });
        drawShockRings(ctx, toPx(0.83, 0.36).x, toPx(0.83, 0.36).y, t, 30, "#2DD4BF");
      }
    },
  },

  "p7-t2": {
    topicId: "p7-t2",
    simId: "p7-psp-scanner-sim",
    imageUrl: "/src/assets/images/p7_t2_psp_scanner_1795591454905.jpg",
    imageAlt: "PSP indirect storage phosphor plate exposed wirelessly by X-ray then scanned by red laser drum scanner in 20-30 seconds",
    hudTitleAr: "نظام الفوسفور المخزن (PSP) ومسح الليزر",
    hudBadgeEn: "Wireless Plate · 90% Lower Dose · 20–30s Laser Readout",
    targets: [
      {
        id: "t1",
        labelAr: "صفيحة PSP اللاسلكية (تقليل 90%)",
        titleEn: "Wireless Thin PSP Plate (90% Less Dose)",
        descIq: "صفيحة رقيقة ومرنة بلا سلك تخزن الصورة الكامنة (Latent image) بجرعة إشعاع مخفضة بنسبة 90%!",
        posPct: { x: 36, y: 42 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "جهاز المسح الليزري الخارجي",
        titleEn: "Extra-Oral Laser Drum Scanner",
        descIq: "جهاز خارج الفم يُدخل فيه الطبيب الصفيحة بعد التصوير لقراءتها وتحويلها إلى إشارة رقمية.",
        posPct: { x: 62, y: 46 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "خط الليزر الأحمر (20–30 ثانية)",
        titleEn: "Red Laser Readout (20–30s)",
        descIq: "شعاع ليزر يمسح الصفيحة ويحرر الصورة المخزنة خلال 20 إلى 30 ثانية فقط (صورة شبه فورية).",
        posPct: { x: 66, y: 58 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "العرض الرقمي على الشاشة",
        titleEn: "Almost Instant Screen Display",
        descIq: "تظهر صورة الأشعة بوضوح عالٍ وتباين مستقر على شاشة العيادة مباشرة بعد المسح.",
        posPct: { x: 87, y: 44 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-exposure",
        labelAr: "1. التصوير بالصفيحة المرنة وتقليل الإشعاع 90%",
        badgeEn: "90% Dose Reduction & Latent Storage",
        duration: 8,
        focus: { cx: 0.28, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t1",
        seeIq: "على اليسار القمع يطلق الأشعة على صفيحة الفوسفور الزرقاء الرقيقة واللاسلكية خلف الضرس حتى تخزن الصورة الكامنة جواها.",
        whyIq: "الفوسفور يخزن طاقة الأشعة داخل البلورات دون سلك مزعج داخل الفم، ويحتاج فقط 10% من جرعة الفيلم التقليدي (يعني 90% تقليل إشعاع!).",
        tipIq: "أرقام امتحان مؤكدة للـ PSP: جرعة إشعاع منخفضة بمقدار 90% reduction وتخزين Latent image inside the phosphor.",
        drawCue: "psp-expose",
      },
      {
        id: "sc-laser",
        labelAr: "2. القراءة بجهاز الماسح الليزري خلال 20–30 ثانية",
        badgeEn: "Extra-Oral Laser Readout (20–30 s)",
        duration: 8,
        focus: { cx: 0.72, cy: 0.5, scale: 1.24 },
        highlightTargetId: "t3",
        xraySuggested: true,
        seeIq: "باليمين الصفيحة تدخل داخل جهاز الماسح وتحت خط الليزر الأحمر فتقرأ الصورة وتظهر فوراً على الشاشة بجانبها.",
        whyIq: "الـ PSP يسمى شبه فوري (Almost instant) لأنه مو بلحظتها مثل الـ CCD، بل يأخذ حوالي 20–30 ثانية داخل جهاز الـ Laser scanner.",
        tipIq: "امتحانياً: مدة ظهور الصورة بـ PSP هي 20–30 seconds عبر Extra-oral laser scanner.",
        drawCue: "psp-laser",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "psp-expose") {
        [0.34, 0.43, 0.52].forEach((ny, idx) => {
          drawFlowTrack(ctx, [toPx(0.14, ny), toPx(0.34, ny)], (t + idx * 0.2) % 1, "#38BDF8", { width: 1.9, pulseCount: 1, showTip: true });
        });
        drawCanvasPill(ctx, toPx(0.28, 0.23).x, toPx(0.28, 0.23).y, "-90% Radiation Dose", "#2DD4BF");
      } else {
        // Smooth horizontal sweeping laser beam across the plate slot (using cosine-eased travel, not sin jitter)
        const u = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
        const l1 = toPx(0.58 + u * 0.14, 0.55);
        const l2 = toPx(0.58 + u * 0.14, 0.62);
        drawFixedGuide(ctx, l1, l2, "", "#FB7185", false);
        drawFlowTrack(ctx, [toPx(0.73, 0.52), toPx(0.84, 0.46)], t, "#2DD4BF", { width: 2.2, pulseCount: 2, showTip: true });
        drawCanvasPill(ctx, toPx(0.66, 0.27).x, toPx(0.66, 0.27).y, "Readout: 20–30 sec", "#FB7185");
      }
    },
  },

  "p8-t1": {
    topicId: "p8-t1",
    simId: "p8-psp-indirect",
    imageUrl: "/src/assets/images/p8_t1_indirect_scanner_1795591385985.jpg",
    imageAlt: "Left: three sizes of flexible PSP plates with remote wall X-ray head; Right: Indirect digital flatbed scanner digitizing conventional silver halide radiograph onto monitor",
    hudTitleAr: "مزايا ومساوئ PSP والنظام غير المباشر (Indirect)",
    hudBadgeEn: "Flexible Sizes · Remote X-Ray vs Flatbed Film Scan",
    targets: [
      {
        id: "t1",
        labelAr: "مقاسات PSP المرنة والمصدر البعيد",
        titleEn: "PSP Sizes & Remote X-Ray Source",
        descIq: "مزايا PSP (3–5): أرشفة سهلة، صفائح مرنة بنفس أحجام الأفلام، ومصدر الأشعة يمكن أن يكون بعيداً عن الحاسوب.",
        posPct: { x: 20, y: 48 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "النظام غير المباشر: مسح فيلم قديم",
        titleEn: "Indirect Digital: Scanning Existing Film",
        descIq: "النظام غير المباشر (Indirect) يأخذ صورة أشعة تقليدية محمضة مسبقاً ويدخلها بماسح ضوئي/كاميرا لرقمنتها.",
        posPct: { x: 69, y: 58 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "رقمنة وحفظ البيانات بالحاسوب",
        titleEn: "Digital Archiving & Storage Limitations",
        descIq: "نحفظ الصور الرقمية بالأرشيف، مع التنبه لمساوئ PSP الثلاث: الكلفة، عمر الصفيحة المحدود، وتخزين الصور.",
        posPct: { x: 87, y: 33 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-psp-rest",
        labelAr: "1. مرونة صفائح PSP وبعد المصدر (مقابل الكلفة وعمر الصفيحة)",
        badgeEn: "PSP Pros (3–5) & Cons (1–3)",
        duration: 8,
        focus: { cx: 0.26, cy: 0.5, scale: 1.3 },
        highlightTargetId: "t1",
        seeIq: "باليسار تشوف 3 صفائح PSP زرقاء مقوّسة بأحجام مختلفة، وبجنبها جهاز الأشعة الجداري منفصل تماماً عن غرفة الحاسوب.",
        whyIq: "لأن الصفيحة لا سلكية، تقدر تصور بغرفة والماسح + الحاسوب بغرفة ثانية (Remote from PC)، بس انتبه تنخدش الصفائح لأن عمرها محدود وكلفتها أعلى.",
        tipIq: "امتحانياً: مساوئ PSP الثلاث: 1) Cost 2) Life expectancy of plates 3) Image storage (نفس مشكلة CCD).",
        drawCue: "psp-remote",
      },
      {
        id: "sc-indirect",
        labelAr: "2. النظام الرقمي غير المباشر (مسح الفيلم التقليدي)",
        badgeEn: "3) Indirect Digital System (Film Scanning)",
        duration: 8,
        focus: { cx: 0.74, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t2",
        seeIq: "باليمين فيلم أخضر تقليدي محمض موضوع فوق زجاج جهاز الماسح الضوئي (Flatbed scanner) حتى يتحول لملف على الشاشة.",
        whyIq: "بعيادة تتحول للديجيتال وتحتاج أرشفة صور المرضى الورقية القديمة، النظام غير المباشر يصور أو يمسح الفيلم المحمض بدون إعادة تعرض المريض للأشعة.",
        tipIq: "الفرق الجوهري بالامتحان: Indirect digital يبدأ بـ existing/conventional film محمض مسبقاً ويُدخل عبر scanner أو كاميرا للحاسوب!",
        drawCue: "flatbed-scan",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "psp-remote") {
        drawFlowTrack(ctx, [toPx(0.32, 0.50), toPx(0.24, 0.50)], t, "#38BDF8", { width: 2.2, pulseCount: 2, showTip: true });
        drawCanvasPill(ctx, toPx(0.25, 0.24).x, toPx(0.25, 0.24).y, "Remote X-Ray OK", "#2DD4BF");
      } else {
        const u = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
        const s1 = toPx(0.61 + u * 0.14, 0.54);
        const s2 = toPx(0.64 + u * 0.14, 0.65);
        drawFixedGuide(ctx, s1, s2, "", "#F59E0B", false);
        drawFlowTrack(ctx, [toPx(0.75, 0.54), toPx(0.84, 0.45)], t, "#2DD4BF", { width: 2.2, pulseCount: 2, showTip: true });
      }
    },
  },

  "p8-t2": {
    topicId: "p8-t2",
    simId: "p8-cbct-scanner-3d",
    imageUrl: "/src/assets/images/p8_t2_cbct_gantry_1795591381512.jpg",
    imageAlt: "CBCT gantry with cone-shaped X-ray beam scanning 4x4 cm cylindrical limited FOV around molar onto flat detector forming isotropic voxels",
    hudTitleAr: "التصوير المقطعي المخروطي (CBCT) ومجال 4×4 سم",
    hudBadgeEn: "180–360° Sweep · Limited FOV 4×4 cm · 75–60 µm Voxel",
    targets: [
      {
        id: "t1",
        labelAr: "مصدر الحزمة المخروطية الدوارة",
        titleEn: "Cone Beam Source (180–360° Rotation)",
        descIq: "حزمة أشعة مخروطية (Cone-shaped) تدور 180° إلى 360° حول الرأس وتلتقط مئات الإسقاطات بحركة واحدة.",
        posPct: { x: 22, y: 50 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "مجال الرؤية المحدود (4×4 سم)",
        titleEn: "Limited Field of View (4×4 cm FOV)",
        descIq: "بعلاج الجذور نفضل الـ Limited FOV (مثلاً 4×4 سم) لتقليل الإشعاع ورفع الدقة المكانية على سن أو سنين فقط.",
        posPct: { x: 50, y: 57 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "الكاشف المسطح والفوكسل (75–60 µm)",
        titleEn: "Flat Panel Detector & High-Res Voxels",
        descIq: "مكعب البيانات الثلاثي يتكون من فوكسلات مجهرية متناهية الصغر بحجم 75–60 ميكرومتر بأجهزة Endodontic FOV.",
        posPct: { x: 89, y: 50 },
        color: "#FBBF24",
      },
    ],
    scenarios: [
      {
        id: "sc-gantry-orbit",
        labelAr: "1. دوران الحزمة المخروطية 180–360° وتكوين الفوكسل",
        badgeEn: "CBCT Cone Rotation & Volumetric Data",
        duration: 8,
        focus: { cx: 0.5, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t1",
        seeIq: "القوس الدوار يدور حول الجمجمة والحزمة المخروطية الزرقاء تعبر السن نحو الكاشف المسطح باليمين وتبني مكعب الفوكسل الثلاثي الأبعاد.",
        whyIq: "من عام 1996، غير الـ CBCT تشخيص الجذور لأنه بدل صورة مسطحة 2D يبني حجم بيانات أسطواني/كروي 3D بدورة واحدة من 180 إلى 360 درجة.",
        tipIq: "أرقام امتحان الـ CBCT: ظهر بالـ 1996، زاوية الدوران 180–360°، وحجم الفوكسل للـ Endo يصل إلى 75–60 µm.",
        drawCue: "gantry-orbit",
      },
      {
        id: "sc-limited-fov",
        labelAr: "2. ليش نختار مجال رؤية محدود (4×4 cm FOV)؟",
        badgeEn: "Limited FOV = Lower Dose + Higher Resolution",
        duration: 8,
        focus: { cx: 0.51, cy: 0.54, scale: 1.48 },
        highlightTargetId: "t2",
        seeIq: "الأسطوانة الخضراء الصغيرة مركزة بالضبط على ضرس واحد فقط بدل ما تشمل كامل الفكين والجمجمة.",
        whyIq: "تضييق مجال الرؤية إلى 4×4 سم يقلل الإشعاع على المريض بشكل كبير، ويرفع دقة التفاصيل (Spatial resolution) جداً لكشف القنوات والكسور الدقيقة.",
        tipIq: "زبدة الامتحان: بعلاج الجذور نختار Limited FOV (typically 4×4 cm) لأنه يعطي Lower dose + Higher resolution (75–60 µm).",
        drawCue: "fov-4x4",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      const center = toPx(0.51, 0.50);
      drawOrbitPath(ctx, center.x, center.y, 170, 145, t, {
        startAngle: 0,
        spanAngle: Math.PI * 2,
        color: "#38BDF8",
      });

      const conePt = toPx(0.25, 0.49);
      const detPt = toPx(0.68, 0.49);
      drawFlowTrack(ctx, [conePt, toPx(0.50, 0.57), detPt], t, "#2DD4BF", { width: 2.0, pulseCount: 2, showTip: true });

      if (st.scenario.drawCue === "fov-4x4") {
        drawShockRings(ctx, toPx(0.50, 0.57).x, toPx(0.50, 0.57).y, t, 28, "#2DD4BF");
        drawCanvasPill(ctx, toPx(0.50, 0.42).x, toPx(0.50, 0.42).y, "FOV 4×4 cm · 75–60 µm", "#2DD4BF");
      } else {
        drawCanvasPill(ctx, toPx(0.50, 0.12).x, toPx(0.50, 0.12).y, "Rotation: 180°–360°", "#38BDF8");
      }
    },
  },

  "p9-t1": {
    topicId: "p9-t1",
    simId: "p9-cbct-slices-sim",
    imageUrl: "/src/assets/images/p9_t1_cbct_artifacts_1795591456401.jpg",
    imageAlt: "CBCT orthogonal axial, sagittal, and coronal planes with 1:1 isotropic voxel and metallic beam-hardening starburst artifacts plus motion blur",
    hudTitleAr: "تقطيع المحاور الثلاثة ومحددات الـ CBCT",
    hudBadgeEn: "Axial · Sagittal · Coronal · Isotropic Voxel vs Artifacts",
    targets: [
      {
        id: "t1",
        labelAr: "المستويات المتعامدة الثلاثة",
        titleEn: "All-Plane Slicing (Axial/Sagittal/Coronal)",
        descIq: "الميزة (b): يقدر الطبيب يختار ويعرض الشرائح من أي مستوى (محوري، سهمي، إكليلي) بدون تراكب.",
        posPct: { x: 33, y: 47 },
        color: "#2DD4BF",
      },
      {
        id: "t2",
        labelAr: "الفوكسل المكعب المتساوي (1:1)",
        titleEn: "Isotropic Voxels (Reduced Distortion)",
        descIq: "الميزة (c): لأن الفوكسلات متساوية الأبعاد (Isotropic)، التقطيع بأي اتجاه يحافظ على قياسات حقيقية بلا تشويه.",
        posPct: { x: 48.5, y: 69 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "تشويش المعادن الشعاعي",
        titleEn: "Metallic Beam-Hardening / Starburst Artifacts",
        descIq: "المحدد (b): الحشوات المعدنية والتيجان والـ Metal posts والكوتا بيركا تسبب خطوطاً متشععة ساطعة وسوداء تخفي التفاصيل.",
        posPct: { x: 80, y: 24 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "محدودية الدقة وحركة المريض",
        titleEn: "Motion Blur & Lower Resolution Than PA",
        descIq: "المحددات (a & c): الدقة المكانية أقل من الفيلم الذروي وأي حركة من المريض تطمس حواف الصورة.",
        posPct: { x: 80, y: 74 },
        color: "#FBBF24",
      },
    ],
    scenarios: [
      {
        id: "sc-planes-voxel",
        labelAr: "1. مزايا القطع بثلاث محاور والفوكسل المتساوي 1:1",
        badgeEn: "Isotropic Voxels & Multi-Planar Accuracy",
        duration: 8,
        focus: { cx: 0.34, cy: 0.5, scale: 1.24 },
        highlightTargetId: "t1",
        seeIq: "السن باليسار مخترقه 3 مستويات ملونة متعامدة (أحمر Axial، أزرق Sagittal، أخضر Coronal) وبجنبه مكعب الفوكسل 1:1.",
        whyIq: "بفضل الفوكسل المكعب المتساوي (Isotropic) والتصوير ثلاثي الأبعاد، تنحل مشكلة انطباق الأنسجة وتقدر تقيس أي آفة أو انحناء بأي محور بدقة.",
        tipIq: "امتحانياً: CBCT مزاياه (a) رؤية 3D للعلاقة التشريحية (b) تصفح شرائح بكل المستويات (c) Reduced distortion بفضل الـ isotropic voxels.",
        drawCue: "isotropic",
      },
      {
        id: "sc-artifacts",
        labelAr: "2. مساوئ تشويش المعادن (Artifacts) وحركة المريض",
        badgeEn: "3 Limitations: Spatial Res · Metal Artifacts · Motion",
        duration: 8,
        focus: { cx: 0.78, cy: 0.5, scale: 1.26 },
        highlightTargetId: "t3",
        xraySuggested: true,
        seeIq: "على اليمين مقاطع CBCT حقيقية لوتد معدني داخل القناة؛ شوف الأشعة والخطوط البيضاء والسوداء المتشععة طالعة منه ومشوّشة حدود العظم.",
        whyIq: "الأشعة المقطعية تتأثر بـ Beam-hardening حول المعادن والـ Gutta-percha، فتصعب رؤية الكسر العمودي الدقيق بوجود وتد معدني، وحركة المريض تزيد التشوش.",
        tipIq: "محددات الـ CBCT الثلاث: 1) Lower spatial resolution than conventional X-ray 2) Metallic & beam-hardening artifacts 3) Patient movement.",
        drawCue: "artifacts",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "isotropic") {
        drawFlowTrack(ctx, [toPx(0.08, 0.45), toPx(0.51, 0.45)], t, "#FB7185", { width: 1.8, reciprocate: true, pulseCount: 1 });
        drawFlowTrack(ctx, [toPx(0.32, 0.08), toPx(0.32, 0.88)], t, "#38BDF8", { width: 1.8, reciprocate: true, pulseCount: 1 });
        drawShockRings(ctx, toPx(0.485, 0.69).x, toPx(0.485, 0.69).y, t, 20, "#38BDF8");
        drawCanvasPill(ctx, toPx(0.485, 0.79).x, toPx(0.485, 0.79).y, "1:1 Isotropic Voxel", "#38BDF8");
      } else {
        drawShockRings(ctx, toPx(0.80, 0.24).x, toPx(0.80, 0.24).y, t, 32, "#FB7185");
        drawShockRings(ctx, toPx(0.79, 0.72).x, toPx(0.79, 0.72).y, (t + 0.5) % 1, 28, "#FBBF24");
        drawCanvasPill(ctx, toPx(0.80, 0.49).x, toPx(0.80, 0.49).y, "Metal Streaking Artifact", "#FB7185");
      }
    },
  },

  "p9-t2": {
    topicId: "p9-t2",
    simId: "p9-cbct-apps",
    imageUrl: "/src/assets/images/p9_t2_cbct_applications_1795591387024.jpg",
    imageAlt: "Six CBCT endodontic applications: root morphology and extra MB2 canal, periapical periodontitis near maxillary sinus, vertical root fracture, lateral perforation and resorption, surgical GP planning",
    hudTitleAr: "التطبيقات السريرية الستة للـ CBCT بعلاج الجذور",
    hudBadgeEn: "Morphology · Periapical · Resorption · Trauma/VRF · Surgery",
    targets: [
      {
        id: "t1",
        labelAr: "التشريح وتعداد القنوات (MB2)",
        titleEn: "1) Tooth Morphology & Canal Configuration",
        descIq: "كشف عدد الجذور والانحناءات والشذوذات التشريحية والقنوات الإضافية المخفية مثل MB2.",
        posPct: { x: 37, y: 65 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "الآفة الذروية وعلاقتها بالجيب",
        titleEn: "2) Periapical Pathosis & Sinus Proximity",
        descIq: "تشخيص التهاب ما حول الذروة المبكر وتحديد قربه من الجيب الفكي أو القناة السنية السفلية بدقة.",
        posPct: { x: 36, y: 27 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "الكسر العمودي والرضوض والتخطيط",
        titleEn: "4–6) Trauma, VRF & Surgical Planning",
        descIq: "تقييم الرضوض والكسور العمودية (Vertical fractures) والتخطيط قبل الجراحة الذروية أو إعادة المعالجة.",
        posPct: { x: 64, y: 72 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "الامتصاص والانثقاب الجذري",
        titleEn: "3) Root Resorption & Root Perforation",
        descIq: "تحديد موقع وحجم الامتصاص الداخلي أو الخارجي والانثقاب الجانبي للجذر بدقة ثلاثية الأبعاد.",
        posPct: { x: 72, y: 56 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-morph-pa",
        labelAr: "1. القنوات الإضافية والآفات الذروية حول الجيب الفكي (1–2)",
        badgeEn: "Apps 1–2: Morphology & Periapical Pathosis",
        duration: 8,
        focus: { cx: 0.35, cy: 0.5, scale: 1.24 },
        highlightTargetId: "t2",
        seeIq: "السن باليسار يوضح انحناء القناة وتفرع قناة ثانية دقيقة مع آفة سوداء حول الذروة ملاصقة مباشرة لأرضية الجيب الفكي.",
        whyIq: "بالأشعة العادية التراكب يخفي القنوات الإضافية أو يغشّك بعلاقة الآفة بالجيب الفكي؛ الـ CBCT يعرض كل قناة وآفة بحجمها وموقعها الحقيقي.",
        tipIq: "التطبيقات 1–2: Evaluation of total tooth morphology & canal configurations + Identification of periapical pathosis.",
        drawCue: "apps-left",
      },
      {
        id: "sc-resorp-frac",
        labelAr: "2. الامتصاص والانثقاب والكسور وتخطيط الجراحة (3–6)",
        badgeEn: "Apps 3–6: Resorption, Perforation, Trauma & Surgery",
        duration: 8,
        focus: { cx: 0.64, cy: 0.54, scale: 1.24 },
        highlightTargetId: "t3",
        xraySuggested: true,
        seeIq: "السن باليمين يكشف كسر عمودي يمتد من التاج للجذر، وامتصاص/انثقاب جانبي بالعظم، مع تخطيط مسار الكوتا بيركا وتقييم الجراحة.",
        whyIq: "الكسور العمودية والانثقابات الخدية/اللسانية شبه مستحيل تشخيصها بالأشعة 2D وحدها؛ فـ CBCT يحسم القرار بين إعادة العلاج أو الجراحة أو القلع.",
        tipIq: "احفظ الستة للامتحان: 1- Morphology 2- Periapical pathosis 3- Resorption & perforation 4- Trauma & fractures 5- Pre-surgical planning 6- Follow-up outcome.",
        drawCue: "apps-right",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx) {
      if (st.scenario.drawCue === "apps-left") {
        drawFlowTrack(ctx, [toPx(0.35, 0.72), toPx(0.38, 0.52), toPx(0.38, 0.32)], t, "#38BDF8", { width: 2.0, pulseCount: 1, showTip: true });
        drawShockRings(ctx, toPx(0.36, 0.27).x, toPx(0.36, 0.27).y, t, 28, "#2DD4BF");
      } else {
        drawFixedGuide(ctx, toPx(0.65, 0.55), toPx(0.61, 0.90), "Vertical Fracture", "#FBBF24", false);
        drawShockRings(ctx, toPx(0.72, 0.56).x, toPx(0.72, 0.56).y, t, 26, "#FB7185");
        drawFlowTrack(ctx, [toPx(0.58, 0.76), toPx(0.68, 0.19)], (t + 0.4) % 1, "#F472B6", { width: 2.0, pulseCount: 1 });
      }
    },
  },
};

// ============================================================================
// Layer 2 & 4: mountMediaStudio Interactive Controller + Edge-Packed Leaders
// ============================================================================

interface ActiveInstance {
  destroy: () => void;
}

const activeInstances: ActiveInstance[] = [];

export function cleanupAllStudios(): void {
  while (activeInstances.length) {
    const inst = activeInstances.pop();
    try {
      inst?.destroy();
    } catch {
      // ignore teardown errors
    }
  }
}

export function mountMediaStudio(stageEl: HTMLElement, topic: { id: string; simId?: string; titleAr?: string }): void {
  const spec =
    TOPIC_STUDIOS[topic.id] ||
    Object.values(TOPIC_STUDIOS).find((s) => s.simId === topic.simId);

  if (!spec) {
    stageEl.innerHTML = `<div class="p-6 text-center text-sm">لا تتوفر بيانات استوديو لهذا الموضوع</div>`;
    return;
  }

  let scenarioIdx = 0;
  let activeTargetId = spec.scenarios[0].highlightTargetId || spec.targets[0].id;
  let isPlaying = true;
  let speed = 1;
  let userZoom = 1;
  let labelsVisible = true;
  let xrayMode = false;
  let elapsed = 0;
  let lastFrameMs = performance.now();
  let rafId = 0;

  // Smooth interpolated camera values
  const targetFocus = () => spec.scenarios[scenarioIdx].focus;
  const curCam = {
    cx: targetFocus().cx,
    cy: targetFocus().cy,
    scale: targetFocus().scale * userZoom,
  };

  stageEl.innerHTML = `
    <div class="ms-stage-viewport" data-ms-viewport>
      <div class="ms-camera-layer" data-ms-camera>
        <img
          src="${spec.imageUrl}"
          alt="${spec.imageAlt.replace(/"/g, "&quot;")}"
          class="ms-stage-img"
          referrerpolicy="no-referrer"
          draggable="false"
        />
      </div>
      <div class="ms-xray-vignette" aria-hidden="true"></div>
      <canvas class="ms-overlay-canvas" data-ms-canvas></canvas>
      <svg class="sim-3d-leaders" data-ms-leaders xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="sim-3d-pins" data-ms-pins></div>
      <div class="ms-hud-top-right" data-ms-hud-ar>${spec.hudTitleAr}</div>
      <div class="ms-hud-top-left" data-ms-hud-en>${spec.hudBadgeEn}</div>
    </div>

    <div class="ms-controls-wrap">
      <div class="ms-timeline-row">
        <span class="ms-time-readout tabular-nums" data-ms-time>00:00 / 00:08</span>
        <input
          type="range"
          min="0"
          max="${spec.scenarios[0].duration}"
          step="0.05"
          value="0"
          class="ms-scrubber"
          aria-label="شريط التوقيت التفاعلي"
          data-ms-scrubber
        />
      </div>

      <div class="sim-controls-dock">
        <div class="ms-btn-group">
          ${spec.scenarios
            .map(
              (sc, i) =>
                `<button type="button" class="sim-btn ${i === 0 ? "active" : ""}" data-ms-scenario="${i}">${sc.labelAr}</button>`
            )
            .join("")}
        </div>

        <div class="ms-btn-group">
          <button type="button" class="sim-btn active" data-ms-play>إيقاف مؤقت</button>
          <button type="button" class="sim-btn" data-ms-restart>إعادة</button>
          <button type="button" class="sim-btn" data-ms-rew title="ترجيع ثانية">-1s</button>
          <button type="button" class="sim-btn" data-ms-fwd title="تقديم ثانية">+1s</button>
          <button type="button" class="sim-btn" data-ms-speed="0.5">0.5x بطيء</button>
          <button type="button" class="sim-btn active" data-ms-speed="1">1x</button>
          <button type="button" class="sim-btn" data-ms-speed="1.5">1.5x</button>
          <button type="button" class="sim-btn" data-ms-zoom="in">تقريب +</button>
          <button type="button" class="sim-btn" data-ms-zoom="out">إبعاد -</button>
          <button type="button" class="sim-btn" data-ms-labels>إخفاء التسميات</button>
          <button type="button" class="sim-btn xray-btn" data-ms-xray>تصوير أشعة X-Ray</button>
        </div>
      </div>
    </div>

    <div class="sim-iq-guide" data-ms-guide></div>

    <div class="sim-inspector">
      <div style="font-weight:800; color:var(--navy);" data-ms-insp-title></div>
      <div style="color:var(--text-secondary); margin-top:4px; line-height:1.7;" data-ms-insp-desc></div>
      <div class="sim-part-chips" data-ms-chips></div>
    </div>
  `;

  const viewportEl = stageEl.querySelector("[data-ms-viewport]") as HTMLElement;
  const cameraEl = stageEl.querySelector("[data-ms-camera]") as HTMLElement;
  const imgEl = stageEl.querySelector("img") as HTMLImageElement;
  const canvasEl = stageEl.querySelector("[data-ms-canvas]") as HTMLCanvasElement;
  const leadersSvg = stageEl.querySelector("[data-ms-leaders]") as SVGSVGElement;
  const pinsWrap = stageEl.querySelector("[data-ms-pins]") as HTMLElement;
  const hudEnEl = stageEl.querySelector("[data-ms-hud-en]") as HTMLElement;
  const timeEl = stageEl.querySelector("[data-ms-time]") as HTMLElement;
  const scrubberEl = stageEl.querySelector("[data-ms-scrubber]") as HTMLInputElement;
  const guideEl = stageEl.querySelector("[data-ms-guide]") as HTMLElement;
  const inspTitleEl = stageEl.querySelector("[data-ms-insp-title]") as HTMLElement;
  const inspDescEl = stageEl.querySelector("[data-ms-insp-desc]") as HTMLElement;
  const chipsWrap = stageEl.querySelector("[data-ms-chips]") as HTMLElement;
  const playBtn = stageEl.querySelector("[data-ms-play]") as HTMLButtonElement;
  const labelsBtn = stageEl.querySelector("[data-ms-labels]") as HTMLButtonElement;
  const xrayBtn = stageEl.querySelector("[data-ms-xray]") as HTMLButtonElement;

  imgEl.addEventListener("error", () => {
    viewportEl.style.background = "linear-gradient(135deg, #0B1F3A 0%, #16335B 100%)";
  });

  // Create perimeter pins + inspector chips
  const pinEls: Map<string, HTMLButtonElement> = new Map();
  const chipEls: Map<string, HTMLButtonElement> = new Map();

  spec.targets.forEach((tg, i) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "sim-3d-pin";
    pin.setAttribute("data-target-id", tg.id);
    pin.innerHTML = `<span class="sim-3d-pin-idx">${i + 1}</span><span>${tg.labelAr}</span>`;
    pin.addEventListener("click", () => selectTarget(tg.id));
    pinsWrap.appendChild(pin);
    pinEls.set(tg.id, pin);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sim-part-chip";
    chip.textContent = `${i + 1}. ${tg.labelAr}`;
    chip.addEventListener("click", () => selectTarget(tg.id));
    chipsWrap.appendChild(chip);
    chipEls.set(tg.id, chip);
  });

  function selectTarget(tid: string): void {
    activeTargetId = tid;
    const tg = spec.targets.find((t) => t.id === tid) || spec.targets[0];
    inspTitleEl.innerHTML = `${tg.labelAr} <span class="ltr" style="font-size:0.84rem; color:var(--turquoise); margin-inline-start:6px;">(${tg.titleEn})</span>`;
    inspDescEl.textContent = tg.descIq;
    pinEls.forEach((el, id) => el.classList.toggle("active", id === tg.id));
    chipEls.forEach((el, id) => el.classList.toggle("selected", id === tg.id));
  }

  function renderWalkthroughCards(): void {
    const sc = spec.scenarios[scenarioIdx];
    hudEnEl.textContent = sc.badgeEn;
    scrubberEl.max = String(sc.duration);

    guideEl.innerHTML = `
      <div class="sim-iq-guide-head">
        <div class="sim-iq-guide-title">${sc.labelAr}</div>
        <div class="sim-iq-guide-badge ltr">${sc.badgeEn} · ${sc.duration}s</div>
      </div>
      <div class="sim-iq-cards">
        <div class="sim-iq-card">
          <div class="sim-iq-card-lbl">شدا تشوف هسه باللقطة؟</div>
          <div class="sim-iq-card-txt">${sc.seeIq}</div>
        </div>
        <div class="sim-iq-card">
          <div class="sim-iq-card-lbl navy">ليش جاي يصير هيج بالعيادة؟</div>
          <div class="sim-iq-card-txt">${sc.whyIq}</div>
        </div>
        <div class="sim-iq-card">
          <div class="sim-iq-card-lbl gold">زبدة الامتحان</div>
          <div class="sim-iq-card-txt">${sc.tipIq}</div>
        </div>
      </div>
    `;
  }

  function switchScenario(idx: number): void {
    scenarioIdx = Math.max(0, Math.min(spec.scenarios.length - 1, idx));
    const sc = spec.scenarios[scenarioIdx];
    elapsed = 0;
    userZoom = 1;
    isPlaying = true;
    playBtn.textContent = "إيقاف مؤقت";
    playBtn.classList.add("active");

    stageEl.querySelectorAll("[data-ms-scenario]").forEach((btn, i) => {
      btn.classList.toggle("active", i === scenarioIdx);
    });

    if (sc.xraySuggested !== undefined && sc.xraySuggested !== xrayMode) {
      xrayMode = sc.xraySuggested;
      viewportEl.classList.toggle("xray-active", xrayMode);
      xrayBtn.classList.toggle("active", xrayMode);
    }

    if (sc.highlightTargetId) selectTarget(sc.highlightTargetId);
    renderWalkthroughCards();
  }

  // Bind controls
  stageEl.querySelectorAll("[data-ms-scenario]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchScenario(Number(btn.getAttribute("data-ms-scenario") || 0));
    });
  });

  playBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;
    playBtn.textContent = isPlaying ? "إيقاف مؤقت" : "تشغيل الحركة";
    playBtn.classList.toggle("active", isPlaying);
  });

  stageEl.querySelector("[data-ms-restart]")?.addEventListener("click", () => {
    elapsed = 0;
    isPlaying = true;
    playBtn.textContent = "إيقاف مؤقت";
    playBtn.classList.add("active");
  });

  stageEl.querySelector("[data-ms-rew]")?.addEventListener("click", () => {
    const dur = spec.scenarios[scenarioIdx].duration;
    elapsed = (elapsed - 1 + dur) % dur;
  });

  stageEl.querySelector("[data-ms-fwd]")?.addEventListener("click", () => {
    const dur = spec.scenarios[scenarioIdx].duration;
    elapsed = (elapsed + 1) % dur;
  });

  stageEl.querySelectorAll("[data-ms-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      speed = Number(btn.getAttribute("data-ms-speed") || 1);
      stageEl.querySelectorAll("[data-ms-speed]").forEach((b) => {
        b.classList.toggle("active", Number(b.getAttribute("data-ms-speed")) === speed);
      });
    });
  });

  stageEl.querySelectorAll("[data-ms-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-ms-zoom");
      if (dir === "in") userZoom = Math.min(2.0, +(userZoom + 0.2).toFixed(2));
      else userZoom = Math.max(1.0, +(userZoom - 0.2).toFixed(2));
    });
  });

  labelsBtn.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    viewportEl.classList.toggle("ms-labels-hidden", !labelsVisible);
    labelsBtn.textContent = labelsVisible ? "إخفاء التسميات" : "إظهار التسميات";
    labelsBtn.classList.toggle("active", !labelsVisible);
  });

  xrayBtn.addEventListener("click", () => {
    xrayMode = !xrayMode;
    viewportEl.classList.toggle("xray-active", xrayMode);
    xrayBtn.classList.toggle("active", xrayMode);
  });

  scrubberEl.addEventListener("input", () => {
    elapsed = Number(scrubberEl.value) || 0;
    isPlaying = false;
    playBtn.textContent = "تشغيل الحركة";
    playBtn.classList.remove("active");
  });

  // Compute exact rendered image geometry & clamped translate3d(tx, ty, 0) scale(effScale)
  function computeCameraMetrics(): {
    vw: number;
    vh: number;
    baseW: number;
    baseH: number;
    baseX: number;
    baseY: number;
    tx: number;
    ty: number;
    effScale: number;
    toPx: ToPxFn;
  } {
    const vw = viewportEl.clientWidth || 800;
    const vh = viewportEl.clientHeight || 450;
    const imgRatio = 16 / 9;
    const boxRatio = vw / vh;

    // Image sits inside cameraEl (vw x vh) with object-fit: cover
    let baseW = vw;
    let baseH = vh;
    let baseX = 0;
    let baseY = 0;
    if (boxRatio > imgRatio) {
      baseW = vw;
      baseH = vw / imgRatio;
      baseY = (vh - baseH) * 0.5;
    } else {
      baseH = vh;
      baseW = vh * imgRatio;
      baseX = (vw - baseW) * 0.5;
    }

    const effScale = curCam.scale;
    // Anchor focus (curCam.cx, curCam.cy) in normalized image space to viewport center
    const fx = baseX + curCam.cx * baseW;
    const fy = baseY + curCam.cy * baseH;
    let tx = vw * 0.5 - fx * effScale;
    let ty = vh * 0.5 - fy * effScale;

    // Clamp translation so zoomed image never exposes empty margins
    const minTx = vw - (baseX + baseW) * effScale;
    const maxTx = -baseX * effScale;
    const minTy = vh - (baseY + baseH) * effScale;
    const maxTy = -baseY * effScale;
    if (effScale <= 1.001) {
      tx = 0;
      ty = 0;
    } else {
      tx = Math.min(maxTx, Math.max(minTx, tx));
      ty = Math.min(maxTy, Math.max(minTy, ty));
    }

    const toPx: ToPxFn = (nx, ny) => ({
      x: tx + (baseX + nx * baseW) * effScale,
      y: ty + (baseY + ny * baseH) * effScale,
    });

    return { vw, vh, baseW, baseH, baseX, baseY, tx, ty, effScale, toPx };
  }

  // Layer 4: Edge-packed perimeter callouts + SVG Cubic Bezier curved leaders (>=32px target clearance)
  function layoutPerimeterCallouts(vw: number, vh: number, toPx: ToPxFn): void {
    const padX = vw < 640 ? 6 : 10;
    const topSafe = vw < 640 ? 34 : 40;
    const botSafe = 10;
    const minGapY = vw < 640 ? 5 : 8;

    interface ItemBox {
      tg: TargetPoint;
      pin: HTMLButtonElement;
      tx: number;
      ty: number;
      pw: number;
      ph: number;
      side: "left" | "right";
      px: number;
      py: number;
    }

    const items: ItemBox[] = spec.targets.map((tg) => {
      const p = toPx(tg.posPct.x / 100, tg.posPct.y / 100);
      const pin = pinEls.get(tg.id)!;
      const pw = pin.offsetWidth || 120;
      const ph = pin.offsetHeight || 26;
      const tx = Math.max(12, Math.min(vw - 12, p.x));
      const ty = Math.max(12, Math.min(vh - 12, p.y));
      return {
        tg,
        pin,
        tx,
        ty,
        pw,
        ph,
        side: tx < vw * 0.5 ? "left" : "right",
        px: 0,
        py: ty - ph * 0.5,
      };
    });

    // Balance sides if all fall to one side so neither edge crowds awkwardly
    const leftCount = items.filter((i) => i.side === "left").length;
    if (leftCount === 0 && items.length >= 2) {
      const sorted = items.slice().sort((a, b) => a.tx - b.tx);
      sorted[0].side = "left";
    } else if (leftCount === items.length && items.length >= 2) {
      const sorted = items.slice().sort((a, b) => b.tx - a.tx);
      sorted[0].side = "right";
    }

    const placeColumn = (col: ItemBox[], isLeft: boolean) => {
      col.sort((a, b) => a.ty - b.ty);
      let cursorY = topSafe;
      col.forEach((it) => {
        it.px = isLeft ? padX : vw - it.pw - padX;
        let idealY = it.ty - it.ph * 0.5;
        if (idealY < cursorY) idealY = cursorY;
        it.py = idealY;
        cursorY = it.py + it.ph + minGapY;
      });
      // Push upward from bottom if overflowed
      let bottomLimit = vh - botSafe;
      for (let i = col.length - 1; i >= 0; i--) {
        if (col[i].py + col[i].ph > bottomLimit) {
          col[i].py = Math.max(topSafe, bottomLimit - col[i].ph);
        }
        bottomLimit = col[i].py - minGapY;
      }

      // Enforce >= 32px clearance between label box and anatomical target dot
      col.forEach((it) => {
        const horizGap = isLeft ? it.tx - (it.px + it.pw) : it.px - it.tx;
        const vertClear = Math.max(it.py - it.ty, it.ty - (it.py + it.ph));
        if (horizGap < 32 && vertClear < 32) {
          // Shift pin vertically away from dot to honor >=32px clearance
          if (it.ty + 34 + it.ph <= vh - botSafe) {
            it.py = it.ty + 34;
          } else if (it.ty - 34 - it.ph >= topSafe) {
            it.py = it.ty - 34 - it.ph;
          }
        }
        it.pin.style.transform = `translate3d(${Math.round(it.px)}px, ${Math.round(it.py)}px, 0)`;
      });
    };

    placeColumn(
      items.filter((i) => i.side === "left"),
      true
    );
    placeColumn(
      items.filter((i) => i.side === "right"),
      false
    );

    // Render SVG curved Cubic Bezier connectors + small target dots (inner 3px, outer 5.8px)
    let defsHtml = "<defs>";
    items.forEach((it) => {
      const col = it.tg.id === activeTargetId ? "#FDE68A" : it.tg.color || "#38BDF8";
      defsHtml += `
        <marker id="ms-arrow-${spec.topicId}-${it.tg.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 1 1.5 L 9 5 L 1 8.5 L 3 5 Z" fill="${col}" />
        </marker>`;
    });
    defsHtml += "</defs>";

    let pathsHtml = "";
    items.forEach((it) => {
      const isAct = it.tg.id === activeTargetId;
      const strokeCol = isAct ? "#FDE68A" : it.tg.color || "#38BDF8";
      const sx = it.side === "left" ? it.px + it.pw : it.px;
      const sy = it.py + it.ph * 0.5;

      const dx = it.tx - sx;
      const dy = it.ty - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const stopOffset = 9;
      const ex = dist > stopOffset ? it.tx - (dx / dist) * stopOffset : it.tx;
      const ey = dist > stopOffset ? it.ty - (dy / dist) * stopOffset : it.ty;

      const curveSpan = Math.max(24, Math.abs(ex - sx) * 0.45);
      const dirSign = it.side === "left" ? 1 : -1;
      const c1x = sx + dirSign * curveSpan;
      const c1y = sy;
      const c2x = ex - dirSign * curveSpan * 0.65;
      const c2y = ey;
      const dStr = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;

      pathsHtml += `
        <path d="${dStr}" fill="none" stroke="rgba(4,12,24,0.68)" stroke-width="${isAct ? 3.8 : 3}" stroke-linecap="round" />
        <path d="${dStr}" fill="none" stroke="${strokeCol}" stroke-width="${isAct ? 2.1 : 1.5}" stroke-linecap="round" marker-end="url(#ms-arrow-${spec.topicId}-${it.tg.id})" />
        <circle cx="${it.tx.toFixed(1)}" cy="${it.ty.toFixed(1)}" r="5.8" fill="none" stroke="rgba(4,12,24,0.65)" stroke-width="2.4" />
        <circle cx="${it.tx.toFixed(1)}" cy="${it.ty.toFixed(1)}" r="5.8" fill="none" stroke="${strokeCol}" stroke-width="1.4" />
        <circle cx="${it.tx.toFixed(1)}" cy="${it.ty.toFixed(1)}" r="3.0" fill="${strokeCol}" stroke="#061224" stroke-width="0.9" />
      `;
    });

    leadersSvg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    leadersSvg.innerHTML = defsHtml + pathsHtml;
  }

  function formatSec(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function tick(now: number): void {
    const dt = Math.min(0.1, (now - lastFrameMs) / 1000);
    lastFrameMs = now;

    const sc = spec.scenarios[scenarioIdx];
    const dur = sc.duration || 8;
    if (isPlaying) {
      elapsed = (elapsed + dt * speed) % dur;
      scrubberEl.value = elapsed.toFixed(2);
    }
    timeEl.textContent = `${formatSec(elapsed)} / ${formatSec(dur)}`;

    // Smoothly interpolate camera focus { cx, cy, scale } via damped lerp
    const desiredScale = Math.min(2.4, sc.focus.scale * userZoom);
    const damp = 1 - Math.exp(-dt * 8.5);
    curCam.cx = lerp(curCam.cx, sc.focus.cx, damp);
    curCam.cy = lerp(curCam.cy, sc.focus.cy, damp);
    curCam.scale = lerp(curCam.scale, desiredScale, damp);

    const metrics = computeCameraMetrics();
    cameraEl.style.transform = `translate3d(${metrics.tx.toFixed(2)}px, ${metrics.ty.toFixed(2)}px, 0) scale(${metrics.effScale.toFixed(4)})`;

    // Layer 3: High-DPI 60fps Canvas clinical overlay
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetCW = Math.round(metrics.vw * dpr);
    const targetCH = Math.round(metrics.vh * dpr);
    if (canvasEl.width !== targetCW || canvasEl.height !== targetCH) {
      canvasEl.width = targetCW;
      canvasEl.height = targetCH;
    }
    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, metrics.vw, metrics.vh);
      spec.drawOverlay(
        ctx,
        metrics.vw,
        metrics.vh,
        elapsed / dur,
        {
          tNorm: elapsed / dur,
          elapsed,
          duration: dur,
          scenario: sc,
          scenarioIdx,
          activeTargetId,
          xrayMode,
          scale: metrics.effScale,
        },
        metrics.toPx
      );
      ctx.restore();
    }

    // Layer 4: Sync perimeter callout labels & SVG curved leaders
    if (labelsVisible) {
      layoutPerimeterCallouts(metrics.vw, metrics.vh, metrics.toPx);
    }

    rafId = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(() => {
    const metrics = computeCameraMetrics();
    if (labelsVisible) layoutPerimeterCallouts(metrics.vw, metrics.vh, metrics.toPx);
  });
  ro.observe(viewportEl);

  // Initialize first state cleanly
  switchScenario(0);
  rafId = requestAnimationFrame(tick);

  activeInstances.push({
    destroy: () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    },
  });
}
