export interface TargetPoint {
  id: string;
  labelAr: string;
  titleEn: string;
  descIq: string;
  challengeIq?: string;
  syncKeywords: string[];
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
  defaultParam?: number;
  seeIq: string;
  whyIq: string;
  tipIq: string;
  tipEn: string;
  drawCue?: string;
}

export interface InteractiveParamSpec {
  labelAr: string;
  minLabel: string;
  maxLabel: string;
  defaultVal: number; // 0..100
  formatReadout: (val: number) => { text: string; tone: "ok" | "warn" | "info" };
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
  paramVal: number; // 0..100 user interactive lab parameter
}

export type NormRect = { x: number; y: number; w: number; h: number };

export interface DrawHelpers {
  drawFlowTrack: (
    ctx: CanvasRenderingContext2D,
    pts: Pt[],
    t: number,
    color?: string,
    opts?: {
      width?: number;
      reciprocate?: boolean;
      pulseCount?: number;
      speed?: number;
      dashed?: boolean;
      showTip?: boolean;
    }
  ) => void;
  drawSprayStream: (
    ctx: CanvasRenderingContext2D,
    origin: Pt,
    dirRad: number,
    spreadRad: number,
    lengthPx: number,
    t: number,
    color?: string
  ) => void;
  drawShockRings: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    t: number,
    maxR?: number,
    color?: string
  ) => void;
  drawOrbitPath: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    t: number,
    opts?: { startAngle?: number; spanAngle?: number; color?: string; showCursor?: boolean }
  ) => Pt;
  drawFixedGuide: (
    ctx: CanvasRenderingContext2D,
    p1: Pt,
    p2: Pt,
    label: string,
    color?: string,
    dashed?: boolean
  ) => void;
  drawFixedAngleArc: (
    ctx: CanvasRenderingContext2D,
    vertex: Pt,
    a1: number,
    a2: number,
    radius: number,
    label: string,
    color?: string
  ) => void;
  drawCanvasPill: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    text: string,
    borderColor?: string
  ) => void;
  drawExtraImage: (
    ctx: CanvasRenderingContext2D,
    key: string,
    alpha: number,
    clipRect?: NormRect
  ) => void;
  drawRegionWarp: (
    ctx: CanvasRenderingContext2D,
    rect: NormRect,
    opts?: {
      scaleX?: number;
      scaleY?: number;
      offsetX?: number;
      offsetY?: number;
      skewY?: number;
      filter?: string;
      alpha?: number;
      coneCut?: number;
      sourceKey?: string;
      radiusPx?: number;
    }
  ) => void;
  drawRegionFilter: (
    ctx: CanvasRenderingContext2D,
    rect: NormRect,
    filter: string,
    opts?: { alpha?: number; tint?: string; radiusPx?: number; sourceKey?: string }
  ) => void;
  drawFocusAperture: (
    ctx: CanvasRenderingContext2D,
    centerNorm: Pt,
    radiusNorm: number,
    dimAlpha?: number
  ) => void;
}

export type DragGizmoSpec =
  | {
      kind: "line";
      p0: Pt; // normalized 0..1 corresponding to paramVal = 0
      p1: Pt; // normalized 0..1 corresponding to paramVal = 100
      handleLabel: string;
    }
  | {
      kind: "arc";
      center: Pt; // normalized 0..1
      rx: number; // normalized width fraction
      ry: number; // normalized height fraction
      startAngle: number; // rad at paramVal = 0
      spanAngle: number; // rad span to paramVal = 100
      handleLabel: string;
    }
  | {
      kind: "radius";
      center: Pt; // normalized 0..1
      minR: number; // normalized width fraction at paramVal = 0
      maxR: number; // normalized width fraction at paramVal = 100
      angleRad?: number;
      handleLabel: string;
    };

export interface TopicStudioSpec {
  topicId: string;
  simId: string;
  imageUrl: string;
  extraImages?: Record<string, string>;
  supportsXray: boolean;
  imageAlt: string;
  hudTitleAr: string;
  hudBadgeEn: string;
  interactiveParam: InteractiveParamSpec;
  dragGizmo: DragGizmoSpec;
  targets: TargetPoint[];
  scenarios: ScenarioSpec[];
  drawOverlay: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    st: OverlayState,
    toPx: ToPxFn,
    h2: DrawHelpers
  ) => void;
}

export const TOPIC_STUDIOS: Record<string, TopicStudioSpec> = {
  "p1-t1": {
    topicId: "p1-t1",
    simId: "p1-role-xray",
    imageUrl: "./src/assets/images/p1_t1_anat_ideal_1795600071509.jpg",
    extraImages: {
      short: "./src/assets/images/p1_t1_anat_short_1795600095717.jpg",
      over: "./src/assets/images/p1_t1_anat_over_1795600096512.jpg",
    },
    supportsXray: true,
    imageAlt: "Wet hemisected mandibular molar with K-file inside mesial canal, collimator beam to sensor, and corresponding radiograph",
    hudTitleAr: "دور أشعة علاج الجذور والفحص السريري المسبق",
    hudBadgeEn: "Indirect Vision · K-File WL · Clinical Exam First",
    interactiveParam: {
      labelAr: "مختبر عمق المبرد داخل القناة (K-File Depth):",
      minLabel: "قصير -4mm",
      maxLabel: "تجاوز الذروة +2mm",
      defaultVal: 66,
      formatReadout: (v) => {
        const mm = -4 + (v / 100) * 6;
        if (mm > 0.2) return { text: `تجاوز الذروة (+${mm.toFixed(1)}mm) ⚠️`, tone: "warn" };
        if (mm >= -1.2 && mm <= -0.3) return { text: `طول مثالي (${mm.toFixed(1)}mm) ✓`, tone: "ok" };
        return { text: `ناقص الطول (${mm.toFixed(1)}mm)`, tone: "info" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.24, y: 0.48 },
      p1: { x: 0.215, y: 0.85 },
      handleLabel: "اسحب المبرد ⇅",
    },
    targets: [
      {
        id: "t1",
        labelAr: "التاج وحجرة اللب",
        titleEn: "Clinical Exam Before X-Ray",
        descIq: "نبدأ بالفحص السريري للتاج والأنسجة الداعمة أولاً قبل ما نطلب أي أشعة، وبعدين الأشعة تعطينا رؤية غير مباشرة لداخل السن.",
        syncKeywords: ["examined before", "indirect vision"],
        posPct: { x: 29, y: 26 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "المبرد وطول العمل",
        titleEn: "Intracanal Standardization (K-File)",
        descIq: "توحيد خطوات داخل القناة: نتحقق من طول العمل بالمبرد السني داخل القناة الجذرية حتى ما نتجاوز الذروة.",
        syncKeywords: ["standardization", "intracanal"],
        posPct: { x: 22, y: 62 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "قمع الأشعة والحساس",
        titleEn: "Cone Alignment & Sensor",
        descIq: "الحزمة الشعاعية تخترق السن باتجاه الحساس لتشكيل صورة دقيقة تُوحّد متابعة الحالات.",
        syncKeywords: ["diagnosis", "treatment"],
        posPct: { x: 59.5, y: 58 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "اللامينا دورا والذروة",
        titleEn: "Lamina Dura & Apical Radiograph",
        descIq: "الأشعة تكشف استمرارية الصفيحة القاسية حول الجذر والالتهاب الذروي اللي ما ينشاف بالعين المجردة.",
        syncKeywords: ["supporting structures", "indirect vision"],
        posPct: { x: 85, y: 72 },
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
        defaultParam: 66,
        seeIq: "على اليسار سن حقيقي مشقوق طولياً وداخله مبرد K-File واصل لحد قريب من الذروة، وبالوسط القمع يرسل الأشعة للحساس حتى تطلع الصورة على اليمين.",
        whyIq: "بدون الأشعة الطبيب يشتغل بالظلمة لأن القنوات والعظم تحت اللثة؛ فالأشعة توفر رؤية غير مباشرة وتوحد قياس خطوات القناة.",
        tipIq: "الأشعة توفر رؤية غير مباشرة للسن والأنسجة الساندة وتوحّد خطوات داخل القناة (مثل طول المبرد)، وتُعد مساعداً مهماً للتشخيص والعلاج.",
        tipEn: "Radiograph allows indirect vision to dentition & supporting structures and provides standardization of intracanal procedures (diagnosis & treatment aid).",
        drawCue: "beam-and-wl",
      },
      {
        id: "sc-exam-first",
        labelAr: "2. شرط الفحص السريري قبل الأشعة",
        badgeEn: "Pre-Radiographic Clinical Exam",
        duration: 8,
        focus: { cx: 0.28, cy: 0.48, scale: 1.35 },
        highlightTargetId: "t1",
        defaultParam: 55,
        seeIq: "الكاميرا والمصباح يركزان على التاج وحجرة اللب والأنسجة الداعمة المحيطة ومكان دخول المبرد من السطح الطاحن نحو القناة.",
        whyIq: "بالعيادة ما يصير تكتب ورقة أشعة تلقائياً لأي مريض! لازم تفحص المريض سريرياً (Clinical examination) بالأول حتى تحدد إذا يحتاج أشعة وشنو نوعها.",
        tipIq: "مصيدة امتحان مؤكدة: يجب فحص المريض سريرياً بعينك ويدك قبل أن تطلب أو توصف أي أشعة.",
        tipEn: "Exam Rule: Patients MUST be examined before ordering or prescribing X-ray images.",
        drawCue: "focus-crown",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      if (st.paramVal < 55) {
        const shortAlpha = 1 - st.paramVal / 55;
        h2.drawExtraImage(ctx, "short", shortAlpha);
      } else if (st.paramVal > 68) {
        const overAlpha = Math.min(1, (st.paramVal - 68) / 32);
        h2.drawExtraImage(ctx, "over", overAlpha);
      }

      if (st.scenario.drawCue === "focus-crown") {
        h2.drawFocusAperture(ctx, { x: 0.26, y: 0.34 }, 0.24, 0.42);
      } else if (st.paramVal > 72) {
        h2.drawFocusAperture(ctx, { x: 0.22, y: 0.78 }, 0.16, 0.36);
        h2.drawCanvasPill(ctx, toPx(0.82, 0.88).x, toPx(0.82, 0.88).y, "Over-Apex! تجاوز الذروة", "#FB7185");
      }
    },
  },

  "p1-t2": {
    topicId: "p1-t2",
    simId: "p1-2d-shadow-sim",
    imageUrl: "./src/assets/images/p1_t2_anat_shadow_1795600072292.jpg",
    extraImages: {
      cut: "./src/assets/images/p1_t2_anat_cut_1795600098023.jpg",
    },
    supportsXray: true,
    imageAlt: "Straight metal X-ray collimator aimed through 3D bone-embedded molar with anatomical sagittal cut revealing two canals versus 2D superimposed radiograph",
    hudTitleAr: "المفاهيم الأساسية للأشعة والصورة الظلية 2D",
    hudBadgeEn: "Straight Line Rays · 2D Shadow of 3D Object",
    interactiveParam: {
      labelAr: "نسبة انحراف وتشتت الأشعة وكشف المقطع التشريحي:",
      minLabel: "مستقيمة 0%",
      maxLabel: "تشتت + كشف 2D",
      defaultVal: 20,
      formatReadout: (v) =>
        v <= 25
          ? { text: `وضوح عالٍ (تشتت ${Math.round(v)}%) ✓`, tone: "ok" }
          : v <= 60
          ? { text: `بداية ضبابية وتراكب (تشتت ${Math.round(v)}%)`, tone: "info" }
          : { text: `فقدان وضوح شديد (${Math.round(v)}%) ⚠️`, tone: "warn" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.51, y: 0.35 },
      p1: { x: 0.51, y: 0.65 },
      handleLabel: "اسحب تشتت الأشعة ⇅",
    },
    targets: [
      {
        id: "t1",
        labelAr: "مصدر الأشعة المستقيمة",
        titleEn: "Straight X-Ray Beam Path",
        descIq: "الأشعة السينية مثل الضوء تسير بخط مستقيم حتى تمتصها الأنسجة أو تنحرف، والانحراف يقلل وضوح الصورة.",
        syncKeywords: ["straight line", "deflected"],
        posPct: { x: 24, y: 50 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "السن والعظم ثلاثي الأبعاد (3D)",
        titleEn: "3D Tooth & Two-Canal Specimen",
        descIq: "السن بالعظم له أبعاد 3D وقناتان داخليتان وكثافات مختلفة؛ المينا والعظم يمتصان أشعة أكثر من اللب.",
        syncKeywords: ["three dimensional", "density"],
        posPct: { x: 50.5, y: 54 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الصورة الظلية 2D المتراكبة",
        titleEn: "2D Superimposed Shadow Image",
        descIq: "على الفيلم يطلع ظل ثنائي الأبعاد 2D فقط، ويتأثر الحجم والشكل والتباين بالسن ومصدر الإشعاع والفيلم.",
        syncKeywords: ["shadow image", "two dimensional", "distortions"],
        posPct: { x: 81, y: 50 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-rays",
        labelAr: "1. الأشعة المستقيمة وتشتت الأشعة المنحرفة",
        badgeEn: "Straight Line Travel & Scatter Loss",
        duration: 8,
        focus: { cx: 0.48, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t1",
        defaultParam: 20,
        seeIq: "قمع الأشعة المعدني يوجه الحزمة بخط مستقيم عبر الضرس المغروس بالعظم الحقيقي نحو الفيلم ذو الإطار الأخضر.",
        whyIq: "الأشعة مثل الضوء تمشي بخط مستقيم لحد ما تنحرف (Deflected) أو تُمتص (Absorbed)؛ وكل ما كثرت الأشعة المنحرفة تقل دقة الصورة ووضوحها.",
        tipIq: "القاعدة الأولى: الأشعة السينية تشبه الضوء بالسير في خط مستقيم، والأشعة المنحرفة تقلل وضوح الصورة.",
        tipEn: "X-rays travel in a straight line until deflected or absorbed; deflected rays reduce image clarity.",
        drawCue: "straight-rays",
      },
      {
        id: "sc-2d-shadow",
        labelAr: "2. كشف المقطع 3D وانضغاطه إلى ظل 2D",
        badgeEn: "3D Anatomy → 2D Shadow Projection",
        duration: 8,
        focus: { cx: 0.68, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t3",
        defaultParam: 65,
        seeIq: "بالوسط السن يتشرح تشريحياً ليكشف الجذرين واللب الحقيقي (3D)، وبجنبه الفيلم باليمين يبين شلون ينطبعون كظل رمادي مسطح (2D).",
        whyIq: "صورة الأشعة هي ظل 2D لمجسم 3D، ويتأثر حجمها وشكلها وتباينها بـ: 1) الجسم نفسه، 2) مصدر الإشعاع، 3) الفيلم.",
        tipIq: "الأشعة عبارة عن صورة ظل 2D لجسم 3D؛ والتشوهات تعتمد على خصائص الجسم ومصدر الإشعاع والفيلم.",
        tipEn: "Radiograph = 2D shadow image of a 3D structure; size, shape & contrast distortion depend on Object, Radiation source, and Film.",
        drawCue: "shadow-2d",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const scatter = st.paramVal / 100;
      const cutAlpha = st.scenario.drawCue === "shadow-2d" ? 0.96 : Math.min(0.85, scatter * 1.15);
      if (cutAlpha > 0.05) {
        h2.drawExtraImage(ctx, "cut", cutAlpha, { x: 0.40, y: 0.32, w: 0.21, h: 0.48 });
      }

      if (scatter > 0.08) {
        const blurPx = (scatter * 4.5).toFixed(1);
        const contPct = Math.round(100 - scatter * 38);
        h2.drawRegionFilter(
          ctx,
          { x: 0.695, y: 0.19, w: 0.235, h: 0.59 },
          `blur(${blurPx}px) contrast(${contPct}%) brightness(${Math.round(100 + scatter * 18)}%)`,
          { alpha: Math.min(0.95, 0.35 + scatter * 0.6), tint: `rgba(226, 232, 240, ${(scatter * 0.22).toFixed(2)})`, radiusPx: 10 }
        );
      }

      h2.drawFlowTrack(ctx, [toPx(0.365, 0.5), toPx(0.70, 0.5)], t, "#38BDF8", {
        width: 1.8,
        pulseCount: 2,
        showTip: true,
      });

      if (scatter > 0.32) {
        h2.drawFixedGuide(ctx, toPx(0.505, 0.49), toPx(0.66, 0.32 - scatter * 0.08), `Scatter ${Math.round(scatter * 100)}%`, "#FB7185", true);
      }

      if (st.scenario.drawCue === "shadow-2d") {
        h2.drawFocusAperture(ctx, { x: 0.81, y: 0.5 }, 0.22, 0.42);
      }
    },
  },

  "p2-t1": {
    topicId: "p2-t1",
    simId: "p2-interp-types",
    imageUrl: "./src/assets/images/p2_t1_anat_density_1795600073075.jpg",
    supportsXray: true,
    imageAlt: "Wet hemisected molar with amalgam restoration, caries, pulp, lamina dura, and bone abscess matched to clinical radiograph and BW/OPG thumbnails",
    hudTitleAr: "جدول التفسير الشعاعي وأنواع الأشعة",
    hudBadgeEn: "White vs Creamy vs Black · Intraoral & Extraoral",
    interactiveParam: {
      labelAr: "كاشف طبقات الكثافة (Radiographic Density Filter):",
      minLabel: "مناطق سوداء (Lucent)",
      maxLabel: "مناطق بيضاء (Opaque)",
      defaultVal: 50,
      formatReadout: (v) =>
        v < 34
          ? { text: "Black: Decay / Pulp / Abscess / Cyst", tone: "warn" }
          : v <= 68
          ? { text: "Creamy White: Dentin + White Lamina Dura", tone: "info" }
          : { text: "Bright White: Enamel / Metal / GP", tone: "ok" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.75, y: 0.82 },
      p1: { x: 0.75, y: 0.21 },
      handleLabel: "اسحب كاشف الكثافة ⇅",
    },
    targets: [
      {
        id: "t1",
        labelAr: "مناطق بيضاء (حشوة ومينا)",
        titleEn: "White Radiopaque Structures",
        descIq: "المينا والحشوات المعدنية والكوتا بيركا تمنع مرور الأشعة فتظهر بيضاء ناصعة (Radiopaque).",
        syncKeywords: ["White area", "Enamel", "Restoration"],
        posPct: { x: 74.5, y: 21 },
        color: "#F8FAFC",
      },
      {
        id: "t2",
        labelAr: "العاج الكريمي واللامينا دورا",
        titleEn: "Creamy White Dentin & White Line Lamina Dura",
        descIq: "العاج يظهر بلون أبيض كريمي (أقل بياضاً من المينا)، والـ Lamina dura خط أبيض مستمر يحيط بالجذر.",
        syncKeywords: ["Creamy white", "Lamina dura"],
        posPct: { x: 71, y: 58 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "مناطق سوداء (تسوس وخراج)",
        titleEn: "Black/Gray Radiolucent Findings",
        descIq: "التسوس واللب والفراغات والخراج (Abscess) والكيس (Cyst) تسمح بمرور الأشعة فتظهر سوداء/رمادية.",
        syncKeywords: ["Black/gray", "Abscess", "Cyst"],
        posPct: { x: 80, y: 81 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "أنواع الأشعة (ذروية وبانورامية)",
        titleEn: "Intraoral (PA/BW) & Extraoral (OPG)",
        descIq: "الأشعة الفموية تشمل Periapical و Bitewing، والخارجية تشمل Panoramic و Computed Tomography.",
        syncKeywords: ["Intraoral", "Extraoral", "Panoramic"],
        posPct: { x: 89, y: 94 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-densities",
        labelAr: "1. مقارنة الكثافات (أبيض / كريمي / أسود)",
        badgeEn: "Radiographic Appearance Table",
        duration: 8,
        focus: { cx: 0.54, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t1",
        defaultParam: 80,
        seeIq: "على اليسار التشريح الحقيقي للرحى: حشوة فضية، تسوس غامق، لب، وخراج ذروي، وعلى اليمين مقابلها تماماً كيف تظهر كظلال بيضاء وكريمية وسوداء بالأشعة.",
        whyIq: "مفتاح قراءة أي أشعة جذور هو مقارنة الكثافات: المعادن والمينا يمتصون الأشعة (أبيض)، بينما التسوس والخراج والأنسجة الرخوة تمرر الأشعة (أسود).",
        tipIq: "العاج يظهر بلون أبيض كريمي (Creamy white)، واللامينا دورا خط أبيض حول الأسنان، والخراج والكيس والتسوس واللب مناطق سوداء/رمادية.",
        tipEn: "Black/gray: Decay, Pulp, Gingiva/space, Abscess, Cyst | White: Enamel, Restoration (metal/GP) | Creamy white: Dentin | White line: Lamina dura.",
        drawCue: "densities",
      },
      {
        id: "sc-pathosis",
        labelAr: "2. الخراج واللامينا دورا وأنواع التصوير",
        badgeEn: "Periapical Lesion & Exam Types",
        duration: 8,
        focus: { cx: 0.75, cy: 0.65, scale: 1.35 },
        highlightTargetId: "t3",
        xraySuggested: true,
        defaultParam: 20,
        seeIq: "المصباح مركز على الأشعة باليمين: شوف الخراج الأسود تحت الذروة وانقطاع خط الـ Lamina dura حول الالتهاب، وبأسفل اليمين مصغرات Bitewing والبانوراما.",
        whyIq: "بعيادة علاج الجذور نعتمد أساساً على Intraoral Periapical لأنها أدق للتاج والجذر والذروة، وبحالات خاصة نلجأ للـ Bitewing أو الـ Panoramic أو CT.",
        tipIq: "أنواع الأشعة بعلاج الجذور: داخل الفم (Periapical و Bitewing) وخارج الفم (Panoramic و Computed Tomography).",
        tipEn: "Endo Radiograph Types: 1) Intraoral (Intraoral periapical, Bitewing) · 2) Extraoral (Panoramic, Computed tomography).",
        drawCue: "lesion-types",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      if (st.paramVal < 34) {
        h2.drawFocusAperture(ctx, { x: 0.80, y: 0.81 }, 0.17, 0.46);
        h2.drawCanvasPill(ctx, toPx(0.80, 0.65).x, toPx(0.80, 0.65).y, "Black/Gray: Abscess · Decay", "#FB7185");
      } else if (st.paramVal <= 68) {
        h2.drawFocusAperture(ctx, { x: 0.72, y: 0.56 }, 0.19, 0.44);
        h2.drawCanvasPill(ctx, toPx(0.72, 0.39).x, toPx(0.72, 0.39).y, "Creamy Dentin + Lamina Dura", "#FBBF24");
      } else {
        h2.drawFocusAperture(ctx, { x: 0.745, y: 0.22 }, 0.17, 0.46);
        h2.drawCanvasPill(ctx, toPx(0.745, 0.37).x, toPx(0.745, 0.37).y, "White: Enamel · Metal/GP", "#F8FAFC");
      }
    },
  },

  "p2-t2": {
    topicId: "p2-t2",
    simId: "p2-bisecting-sim",
    imageUrl: "./src/assets/images/p2_t2_incisor_xray_1795595819479.jpg",
    extraImages: {
      steep: "./src/assets/images/p2_t2_cone_steep_1795595902068.jpg",
    },
    supportsXray: true,
    imageAlt: "Bisecting angle technique: sagittal maxillary incisor with tilted film held by finger, PID cone, and corresponding human incisor radiograph",
    hudTitleAr: "تقنية تنصيف الزاوية (Bisecting Angle)",
    hudBadgeEn: "Beam ⊥ Bisector Plane · Elongation vs Foreshortening",
    interactiveParam: {
      labelAr: "انحراف زاوية القمع عن المنصف (PID Error):",
      minLabel: "-20° أقل (تطاول)",
      maxLabel: "+20° أزيد (تقاصر)",
      defaultVal: 50,
      formatReadout: (v) => {
        const deg = Math.round(((v - 50) / 50) * 20);
        if (Math.abs(deg) <= 2) return { text: "0° مثالي: 90° ⊥ Bisector (طول حقيقي) ✓", tone: "ok" };
        if (deg < 0) return { text: `${deg}° زاوية منخفضة ← تطاول (Elongation) ⚠️`, tone: "warn" };
        return { text: `+${deg}° زاوية حادة ← تقاصر (Foreshortening) ⚠️`, tone: "warn" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.25, y: 0.44 },
      p1: { x: 0.25, y: 0.18 },
      handleLabel: "اسحب زاوية القمع ⇅",
    },
    targets: [
      {
        id: "t1",
        labelAr: "المحور الطولي للسن",
        titleEn: "Long Axis of Tooth",
        descIq: "المحور الهندسي الممتد من التاج إلى قمة الجذر داخل العظم، ويصنع زاوية حادة مع الفيلم المائل.",
        syncKeywords: ["long axis", "Bisecting angle"],
        posPct: { x: 49, y: 50 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "الفيلم المثبت بإصبع المريض",
        titleEn: "Finger-Held Tilted Film Plane",
        descIq: "المريض يثبت الفيلم بإصبعه على الحنك بدون حامل (Quick & comfortable)، لكن قد يثني الفيلم أو يحركه.",
        syncKeywords: ["comfortable", "rubber dam", "holder"],
        posPct: { x: 58, y: 63 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "قمع الأشعة ومنصف الزاوية",
        titleEn: "X-Ray Beam ⊥ Imaginary Bisector",
        descIq: "القمع يتوجه عمودياً بزاوية 90° على الخط الوهمي اللي ينصف الزاوية بين السن والفيلم، وليس على الفيلم نفسه!",
        syncKeywords: ["perpendicular", "imaginary plane", "bisects"],
        posPct: { x: 26, y: 31 },
        color: "#38BDF8",
      },
      {
        id: "t4",
        labelAr: "الفيلم الحي (تطاول/تقاصر)",
        titleEn: "Periapical Film Length Projection",
        descIq: "انخفاض زاوية القمع يطوّل الجذر على الفيلم (Elongation) وزيادتها تقصّره (Foreshortening).",
        syncKeywords: ["distortion", "Bisecting"],
        posPct: { x: 85, y: 50 },
        color: "#FB7185",
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
        defaultParam: 50,
        seeIq: "شوف المحور الطولي للقاطع العلوي ومحور الفيلم المائل؛ بينهما ينرسم خط وهمي بالوسط (Bisector)، والأشعة تنزل عمودية 90° على هذا المنصف والفيلم الحي على اليمين يثبت الطول.",
        whyIq: "الهدف من قاعدة تنصيف المثلثات إن طول الظل على الفيلم يساوي الطول الحقيقي للسن قدر الإمكان رغم عدم التوازي.",
        tipIq: "توجيه الشعاع يكون عمودياً على المستوي الوهمي الذي ينصف الزاوية بين مستوى الفيلم والمحور الطولي للسن.",
        tipEn: "X-ray beam is directed perpendicular to an imaginary plane which bisects the angle formed by the film plane and the long axis of the tooth.",
        drawCue: "bisector",
      },
      {
        id: "sc-pros-cons",
        labelAr: "2. أثر تغيير الزاوية (تطاول وتقاصر) ومساوئ الإصبع",
        badgeEn: "Elongation vs Foreshortening & Finger Limits",
        duration: 8,
        focus: { cx: 0.55, cy: 0.5, scale: 1.05 },
        highlightTargetId: "t4",
        defaultParam: 88,
        seeIq: "اسحب القمع للأعلى أو الأسفل وراقب الفيلم الحقيقي على اليمين شلون يتطاول الجذر أو ينكمش فيزيائياً قدامك.",
        whyIq: "من مميزاته: سهل ومريح، سريع بلا holder، وأسهل مع السد المطاطي؛ لكن مساوئه: تشويه بالصورة، عدم قابلية الإعادة الدقيقة، وأخطاء Cone cut.",
        tipIq: "3 مزايا: مريحة وسريعة بلا holder وأسهل مع السد المطاطي · 4 عيوب: تشوه وتراكب معالم، cone cut، صعوبة تخيل توجيه القمع، وصعوبة الإعادة.",
        tipEn: "Pros: Easy/comfortable, quick (no holder), easier with rubber dam | Cons: More distortion/superimposition, cone cut artifacts, hard cone aim, hard to reproduce.",
        drawCue: "distortion",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const errNorm = (st.paramVal - 50) / 50; // -1..+1
      // Morph real PID cone on the left smoothly toward steep angle when errNorm > 0
      if (errNorm > 0.05) {
        h2.drawExtraImage(ctx, "steep", Math.min(1, errNorm), { x: 0, y: 0, w: 0.42, h: 0.65 });
      }

      // Real pixel vertical stretch (Elongation) or compression (Foreshortening) on the right human incisor radiograph
      const scaleY = errNorm < 0 ? 1 - errNorm * 0.34 : 1 - errNorm * 0.25;
      const coneCut = Math.abs(errNorm) > 0.55 ? (Math.abs(errNorm) - 0.55) * 1.45 * Math.sign(errNorm) : 0;
      h2.drawRegionWarp(
        ctx,
        { x: 0.728, y: 0.135, w: 0.242, h: 0.73 },
        {
          scaleY,
          coneCut,
          sourceKey: errNorm > 0.35 ? "steep" : undefined,
          radiusPx: 14,
        }
      );

      // Clean geometric bisector + central X-ray path
      const vertex = toPx(0.55, 0.28);
      const toothAxisBot = toPx(0.41, 0.84);
      const filmPlaneBot = toPx(0.48, 0.88);
      const bisectorBot = toPx(0.445, 0.86);
      h2.drawFixedGuide(ctx, vertex, toothAxisBot, "Tooth", "#FBBF24", true);
      h2.drawFixedGuide(ctx, vertex, filmPlaneBot, "Film", "#2DD4BF", true);
      h2.drawFixedGuide(ctx, vertex, bisectorBot, "Bisector", "#F8FAFC", false);

      const beamStart = toPx(0.25, 0.31 - errNorm * 0.13);
      const beamMid = toPx(0.5, 0.53 + errNorm * 0.08);
      const col = Math.abs(errNorm) <= 0.1 ? "#38BDF8" : "#FB7185";
      h2.drawFlowTrack(ctx, [beamStart, beamMid], t, col, { width: 2.0, pulseCount: 2, showTip: true });

      const lenText =
        Math.abs(errNorm) <= 0.1
          ? "1:1 True Length"
          : errNorm < 0
          ? "Elongated (تطاول)"
          : "Foreshortened (تقاصر)";
      h2.drawCanvasPill(ctx, toPx(0.85, 0.90).x, toPx(0.85, 0.90).y, lenText, col);
    },
  },

  "p3-t1": {
    topicId: "p3-t1",
    simId: "p3-paralleling-3d",
    imageUrl: "./src/assets/images/p3_t1_paralleling_xcp_1795591372515.jpg",
    extraImages: {
      tilted: "./src/assets/images/p3_t1_tilted_edit_1795595877975.jpg",
    },
    supportsXray: true,
    imageAlt: "Paralleling technique using XCP bite-block, indicator rod, aiming ring, and parallel film with perpendicular X-ray beam",
    hudTitleAr: "تقنية التوازي (Paralleling / Right-Angle)",
    hudBadgeEn: "Film ∥ Tooth · Beam 90° ⊥ Film · XCP Ring",
    interactiveParam: {
      labelAr: "دقة توازي الفيلم مع محور السن:",
      minLabel: "0° توازي تام",
      maxLabel: "25° انحراف عن التوازي",
      defaultVal: 0,
      formatReadout: (v) => {
        const deg = Math.round((v / 100) * 25);
        return deg <= 3
          ? { text: "0° توازي تام + تعامد 90° ✓", tone: "ok" }
          : { text: `انحراف ${deg}° ← بداية تشويه هندسي ⚠️`, tone: "warn" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.735, y: 0.22 },
      p1: { x: 0.805, y: 0.22 },
      handleLabel: "اسحب توازي الفيلم ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "حلقة التصويب البرتقالية",
        titleEn: "Aiming Ring Auto-Alignment",
        descIq: "الحلقة الخارجية تخلي توجيه القمع سهل جداً وتمنع خطأ Cone cutting بغض النظر عن وضعية رأس المريض.",
        challengeIq: "انقر على حلقة التصويب البرتقالية الخاصة بجهاز الـ XCP",
        syncKeywords: ["aiming ring", "irrespective of position"],
        posPct: { x: 22, y: 49 },
        color: "#F59E0B",
      },
      {
        id: "t2",
        labelAr: "مكعب العض ومحور السن",
        titleEn: "Tooth Long Axis & Bite-Block",
        descIq: "المريض يعض على القطعة البيضاء حتى تثبت الحساس موازياً لمحور السن تماماً؛ لكنها مزعجة أحياناً أو يصعب استعمالها مع السد.",
        challengeIq: "حدد منطقة مكعب العض الأبيض والمحور الطولي للرحى",
        syncKeywords: ["rubber dam", "uncomfortable"],
        posPct: { x: 61, y: 55 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الفيلم الموازي بزاوية 90°",
        titleEn: "Parallel Film (90° Perpendicular Beam)",
        descIq: "الفيلم يوازي السن (0° بينهما)، والأشعة تسقط بزاوية قائمة 90° على الفيلم فتعطي أدق صورة قابلة للإعادة.",
        challengeIq: "أشر على الفيلم المثبت عمودياً بموازاة محور السن",
        syncKeywords: ["parallel to the long axis", "perpendicular"],
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
        defaultParam: 0,
        seeIq: "شوف المحور العمودي للضرس ومحور الفيلم على اليمين متوازيين تماماً، والقمع متحاذي ويا حلقة الـ XCP البرتقالية بزاوية 90°.",
        whyIq: "بسبب التوازي الهندسي وبُعد الفيلم، نحصل على صورة عالية الدقة بأقل تشويه، ونقدر نعيد نفس الزاوية بكل جلسة متابعة.",
        tipIq: "مزايا التوازي: دقة أعلى وتشوه أقل + سهولة المحاذاة بحلقة التصويب مهما كان وضع الرأس + صور قابلة للإعادة.",
        tipEn: "Film parallel to tooth long axis via holder + beam perpendicular to film → Better accuracy/less distortion, easy alignment irrespective of head position, reproducible.",
        drawCue: "parallel-90",
      },
      {
        id: "sc-disadv",
        labelAr: "2. تحديات الحنك والانزعاج والسد المطاطي",
        badgeEn: "Disadvantages & Anatomic Limits",
        duration: 8,
        focus: { cx: 0.65, cy: 0.54, scale: 1.38 },
        highlightTargetId: "t2",
        defaultParam: 45,
        seeIq: "المصباح والتركيز على الحساس الصلب وحامل الـ Bite block خلف الرحى حيث يضغط على قاع الفم أو الحنك.",
        whyIq: "أكثر ثلاث مساوئ نواجهها بالعيادة: 1) ضغط مزعج بقاع الفم أو الحنك 2) صعب ويا حنك مسطح أو تهوع أو أسنان طويلة 3) صعوبة وضعه مع Rubber dam.",
        tipIq: "عيوب التوازي: يطخ بقاع الفم أو الحنك (مزعج)، وصعب ويا shallow palatal vault أو gag reflex أو أسنان طويلة جداً أو rubber dam.",
        tipEn: "Cons: Upright film impinges on floor of mouth/palate (uncomfortable); difficult with shallow palatal vault, gag reflex, extremely long teeth, and rubber dam.",
        drawCue: "intraoral-limit",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      // Morph real XCP digital sensor smoothly from 0° parallel to 25° tilted
      const tiltNorm = st.paramVal / 100;
      if (tiltNorm > 0.03) {
        h2.drawExtraImage(ctx, "tilted", tiltNorm);
      }

      const tilt = tiltNorm * 0.07;
      const toothTop = toPx(0.615, 0.14);
      const toothBot = toPx(0.615, 0.76);
      const filmTop = toPx(0.735 + tilt, 0.22);
      const filmBot = toPx(0.735 - tilt, 0.8);

      h2.drawFixedGuide(ctx, toothTop, toothBot, "Tooth", "#FBBF24", true);
      h2.drawFixedGuide(ctx, filmTop, filmBot, tiltNorm <= 0.12 ? "0° Parallel" : "Tilted!", tiltNorm <= 0.12 ? "#2DD4BF" : "#FB7185", false);
      h2.drawFlowTrack(ctx, [toPx(0.16, 0.49), toPx(0.735, 0.49)], t, "#38BDF8", { width: 2.0, pulseCount: 2, showTip: true });

      if (st.scenario.drawCue === "intraoral-limit") {
        h2.drawFocusAperture(ctx, { x: 0.70, y: 0.66 }, 0.24, 0.40);
      }
    },
  },

  "p3-t2": {
    topicId: "p3-t2",
    simId: "p3-suggestions-12",
    imageUrl: "./src/assets/images/p3_t2_coronal_exact_1795607510788.jpg",
    extraImages: {
      balanced: "./src/assets/images/p3_t2_coronal_exact_balanced_1795607535023.jpg",
    },
    supportsXray: true,
    imageAlt: "Left: coronal anatomical cross-section of maxilla with buccal steel X-ray collimator outside, maxillary molar hanging below intact maxillary sinus, and gloved finger inside oral cavity pressing white film against sloped hard palate near occlusal plane; Right: maxillary periapical radiograph with intact white sinus floor above all roots showing short buccal root and very long palatal root",
    hudTitleAr: "إرشادات التصوير السريري ومشكلة الحنك الصلب",
    hudBadgeEn: "Film Inside Palate · Short Buccal / Very Long Palatal",
    interactiveParam: {
      labelAr: "شدة ميلان الحنك الصلب (Hard Palate Angle):",
      minLabel: "تشوه أقل (متوازن)",
      maxLabel: "ميلان الحنك (تشوه)",
      defaultVal: 85,
      formatReadout: (v) =>
        v > 55
          ? { text: "جذر حنكي طويل جداً + جذور خدية قصيرة ⚠️", tone: "warn" }
          : { text: "ميلان أقل ← أطوال جذور أقرب للطبيعي ✓", tone: "info" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.773, y: 0.41 },
      p1: { x: 0.773, y: 0.285 },
      handleLabel: "اسحب طول الجذر الحنكي ⇅",
    },
    targets: [
      {
        id: "t1",
        labelAr: "قمع الأشعة من الخارج (الجهة الخدية)",
        titleEn: "Buccal X-Ray PID & Intact Maxillary Sinus",
        descIq: "الحزمة السينية تدخل من الجهة الخدية الخارجية عبر جذور الرحى العلوية أسفل الجيب الفكي السليم لتسقط على الفيلم بالداخل.",
        syncKeywords: ["hard palate", "maxillary molars"],
        posPct: { x: 15.5, y: 52 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "الفيلم الممسوك بالإصبع من داخل الحنك",
        titleEn: "Finger-Held Film Inside Hard Palate",
        descIq: "من داخل الفم يضغط إصبع المريض الفيلم مقابل سقف الحنك الصلب المائل، فتتكون زاوية بين محور السن ومستوى الفيلم.",
        syncKeywords: ["held by the finger", "angle of the hard palate"],
        posPct: { x: 36, y: 56 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "حافة الفيلم قرب السطح الطاحن",
        titleEn: "Film Edge Parallel & Near Occlusal Surface",
        descIq: "النصيحة #1: نضع الحافة السفلية للفيلم قريبة وموازية للسطح الطاحن/القاطع حتى تطلع ذروات الجذور بمنتصف الفيلم.",
        syncKeywords: ["occlusal surface", "apices are near the center"],
        posPct: { x: 28.5, y: 72 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "جذر خدي قصير وحنكي طويل جداً",
        titleEn: "Short Buccal & Very Long Palatal Root",
        descIq: "النصيحة #2: بسبب زاوية الحنك الصلب، تظهر الرحى العلوية بالأفلام الممسوكة بالإصبع بجذور خدية قصيرة وجذر حنكي طويل جداً أسفل الجيب الفكي.",
        syncKeywords: ["short buccal", "very long palatal root"],
        posPct: { x: 77.3, y: 34 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-edge-occlusal",
        labelAr: "1. موضع الفيلم من الداخل قرب السطح الطاحن",
        badgeEn: "Suggestion #1: Palatal Film Edge Near Occlusal",
        duration: 8,
        focus: { cx: 0.42, cy: 0.50, scale: 1.06 },
        highlightTargetId: "t3",
        defaultParam: 80,
        seeIq: "بالمقطع العرضي: الفيلم الأبيض مضغوط بالإصبع من داخل سقف الحنك خلف الضرس، وحافته السفلية قرب مستوى السطح الطاحن حتى تصير الذروات بنص الفيلم.",
        whyIq: "لو دفعت الفيلم زايد لأعلى الحنك تنقص صورة التاج، ولو نزلته زايد تنكص ذروات الجذور! وضع الحافة قريبة من السطح الطاحن يوسط الـ Apices بالفيلم.",
        tipIq: "التوصية 1: في تقنية منصف الزاوية نضع حافة الفيلم موازية وقريبة من السطح القاطع أو الطاحن حتى تتوسط ذروات الأسنان الفيلم.",
        tipEn: "Suggestion #1: For bisecting technique, position film edge parallel to and near incisal/occlusal surface so tooth apices are near the center of the film.",
        drawCue: "occlusal-edge",
      },
      {
        id: "sc-palate-molar",
        labelAr: "2. أثر زاوية الحنك: جذر خدي قصير وحنكي طويل",
        badgeEn: "Suggestion #2: Short Buccal vs Very Long Palatal",
        duration: 8,
        focus: { cx: 0.54, cy: 0.46, scale: 1.04 },
        highlightTargetId: "t4",
        xraySuggested: true,
        defaultParam: 92,
        seeIq: "قارن اللقطتين: دخول الأشعة من الخارج نحو الفيلم المائل بالداخل يقصّر الجذر الخدي ويمطّ الجذر الحنكي للأعلى داخل العظم أسفل الجيب الفكي السليم.",
        whyIq: "بسبب زاوية الحنك الصلب (Hard palate angle)، الجذر الحنكي يكون أبعد عن الفيلم وتصله الأشعة بزاوية حادة فيستطيل جداً، عكس الجذور الشدقية التي تقصر.",
        tipIq: "التوصية 2: بسبب زاوية الحنك الصلب، الأفلام الممسوكة بالإصبع تظهر الأضراس العلوية بجذور شدقية قصيرة وجذر حنكي طويل جداً.",
        tipEn: "Suggestion #2: Because of the angle of the hard palate, finger-held films usually show maxillary molars with short buccal roots & very long palatal root.",
        drawCue: "root-lengths",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const balancedAlpha = Math.max(0, Math.min(1, 1 - st.paramVal / 88));
      if (balancedAlpha > 0.02) {
        h2.drawExtraImage(ctx, "balanced", balancedAlpha);
      }

      // Continuous 60fps X-ray rays from outer buccal steel PID through buccal & palatal roots onto inner palatal film
      h2.drawFlowTrack(ctx, [toPx(0.16, 0.50), toPx(0.245, 0.54), toPx(0.34, 0.57)], t, "#38BDF8", {
        width: 2.0,
        pulseCount: 2,
        showTip: true,
      });
      h2.drawFlowTrack(ctx, [toPx(0.15, 0.55), toPx(0.265, 0.47), toPx(0.395, 0.42)], t, "#FB7185", {
        width: 2.0,
        pulseCount: 2,
        showTip: true,
      });

      if (st.scenario.drawCue === "occlusal-edge") {
        h2.drawFixedGuide(ctx, toPx(0.195, 0.705), toPx(0.305, 0.705), "Occlusal Level", "#38BDF8", true);
        h2.drawFixedGuide(ctx, toPx(0.285, 0.735), toPx(0.415, 0.375), "Palatal Film (Inside)", "#FBBF24", false);
        const edgePt = toPx(0.29, 0.725);
        h2.drawShockRings(ctx, edgePt.x, edgePt.y, t, 22, "#FBBF24");
        const radCenter = toPx(0.75, 0.48);
        h2.drawShockRings(ctx, radCenter.x, radCenter.y, t, 32, "#FBBF24");
        h2.drawCanvasPill(ctx, toPx(0.75, 0.14).x, toPx(0.75, 0.14).y, "Apices Near Film Center ✓", "#FBBF24");
      } else {
        const apexPt = toPx(0.25, 0.52);
        h2.drawFixedGuide(ctx, toPx(0.25, 0.38), toPx(0.25, 0.70), "Tooth Axis", "#2DD4BF", true);
        h2.drawFixedGuide(ctx, toPx(0.285, 0.735), toPx(0.415, 0.375), "Hard Palate Film", "#FBBF24", false);
        h2.drawFixedAngleArc(ctx, apexPt, -1.55, -1.10, 32, "Palate ∠", "#FBBF24");

        const buccalPt = toPx(0.730, 0.43);
        const palatalApexY = 0.41 - (st.paramVal / 100) * 0.125;
        const palatalPt = toPx(0.773, palatalApexY);
        h2.drawShockRings(ctx, buccalPt.x, buccalPt.y, t, 20, "#2DD4BF");
        h2.drawShockRings(ctx, palatalPt.x, palatalPt.y, t, 24, "#FB7185");
        h2.drawFlowTrack(ctx, [toPx(0.773, 0.48), palatalPt], t, "#FB7185", {
          width: 2.2,
          pulseCount: 1,
          showTip: true,
        });
        h2.drawCanvasPill(ctx, toPx(0.67, 0.12).x, toPx(0.67, 0.12).y, "Short Buccal", "#2DD4BF");
        h2.drawCanvasPill(ctx, toPx(0.84, 0.12).x, toPx(0.84, 0.12).y, "Very Long Palatal", "#FB7185");
      }
    },
  },

  "p4-t1": {
    topicId: "p4-t1",
    simId: "p4-slob-sim",
    imageUrl: "./src/assets/images/p4_t1_slob_overlap_1795595817376.jpg",
    extraImages: {
      separated: "./src/assets/images/p4_t1_slob_premolar_1795591374321.jpg",
    },
    supportsXray: true,
    imageAlt: "Plastic film holder standardization with horizontal X-ray tube shift separating two premolar canals via SLOB rule",
    hudTitleAr: "الحامل البلاستيكي وقاعدة الجسم الشدقي (SLOB)",
    hudBadgeEn: "Plastic Holder · Same Lingual, Opposite Buccal",
    interactiveParam: {
      labelAr: "مختبر تحريك القمع أفقياً (Horizontal Tube Shift):",
      minLabel: "-25° Distal",
      maxLabel: "+25° Mesial",
      defaultVal: 82,
      formatReadout: (v) => {
        const deg = Math.round(((v - 50) / 50) * 25);
        if (Math.abs(deg) <= 3) return { text: "0° مستقيم ← القناتان منطبقتان! (Overlap)", tone: "warn" };
        if (deg > 0) return { text: `+${deg}° Mesial → اللسانية تروح Mesial (Same) ✓`, tone: "ok" };
        return { text: `${deg}° Distal → اللسانية تروح Distal (Same) ✓`, tone: "ok" };
      },
    },
    dragGizmo: {
      kind: "arc",
      center: { x: 0.475, y: 0.52 },
      rx: 0.175,
      ry: 0.145,
      startAngle: Math.PI * 0.78,
      spanAngle: Math.PI * 0.44,
      handleLabel: "اسحب القمع Mesial ↔ Distal",
    },
    targets: [
      {
        id: "t1",
        labelAr: "تحريك القمع أفقياً",
        titleEn: "Mesial / Distal Cone Shift",
        descIq: "نحرك القمع أفقياً 20° نحو الإنسي (Mesial) أو الوحشي (Distal) لفصل القنوات المنطبقة فوق بعضها.",
        challengeIq: "انقر على فوهة القمع التي يتم إزاحتها أفقياً",
        syncKeywords: ["cone", "mesial", "horizontal"],
        posPct: { x: 27, y: 50 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "القناتان والمبردان (B/L)",
        titleEn: "Buccal & Lingual Root Canals",
        descIq: "في الضواحك والأرحاء تكون القناة الخدية واللسانية على خط واحد بالأشعة الاعتيادية وتندمج كقناة واحدة.",
        challengeIq: "حدد منطقة الجذرين والمبردين داخل الضاحك",
        syncKeywords: ["premolars", "molars", "buccal", "lingual"],
        posPct: { x: 47.5, y: 55 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "الحامل البلاستيكي القياسي",
        titleEn: "Plastic Film Holder (Standardization)",
        descIq: "الحامل البلاستيكي في التوازي يمنع حركة الفيلم، يسهل التوجيه بغض النظر عن وضعية الرأس، ويوحد القياس.",
        challengeIq: "أشر على الحامل البلاستيكي القياسي الماسك للفيلم",
        syncKeywords: ["plastic film holder", "standardization", "preventing movement"],
        posPct: { x: 62, y: 52 },
        color: "#94A3B8",
      },
      {
        id: "t4",
        labelAr: "انفصال القنوات (SLOB)",
        titleEn: "Same Lingual, Opposite Buccal",
        descIq: "الأبعد عن الأشعة (اللساني/الحنكي) يتحرك بنفس اتجاه القمع (Same)، والأقرب للأشعة (الخدي) يتحرك بالاتجاه المعاكس (Opposite).",
        challengeIq: "انقر على الأشعة باليمين حيث تظهر القناتان منفصلتين",
        syncKeywords: ["Buccal object rule", "SLOB", "Same Lingual"],
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
        defaultParam: 50,
        seeIq: "الحامل البلاستيكي الرمادي ماسك الفيلم بشكل عمودي ثابت وراء الضاحك ذو الجذرين وبيهم مبردين، والقمع متمركز قبله.",
        whyIq: "الحامل البلاستيكي بتقنية التوازي يثبت الفيلم ويمنع تحركه وقت التعرض، ويخلي توجيه الحزمة سهل حتى لو رأس المريض متحرك.",
        tipIq: "وظائف الحامل البلاستيكي: التوحيد القياسي للتصوير، تثبيت ومنع حركة الفيلم، وسهولة توجيه الشعاع مهما كان وضع الرأس.",
        tipEn: "Plastic film holder facilitates standardization by aiding film positioning, preventing movement, and easing beam alignment irrespective of head position.",
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
        defaultParam: 85,
        seeIq: "عند إزاحة القمع أفقياً، الحزمة تمر بزاوية فتنفصل صورة القناتين على الفيلم باليمين بوضوح بدل أن تنطبق واحدة فوق الأخرى.",
        whyIq: "من يتحرك القمع للـ Mesial: القناة اللسانية/الحنكية (الأقرب للفيلم) تروح للـ Mesial وياه (SAME)، والخدية (الأقرب للقمع) تروح للـ Distal عكسه (OPPOSITE).",
        tipIq: "قاعدة الجسم الشدقي (SLOB): القناة اللي تتحرك بنفس اتجاه القمع هي اللسانية/الحنكية، واللي تتحرك بالعكس هي الخدية.",
        tipEn: "SLOB Rule: Canal moving in the SAME direction as cone shift is LINGUAL (or Palatal); canal moving OPPOSITE is BUCCAL.",
        drawCue: "slob-shift",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const shift = (st.paramVal - 50) / 50; // -1 (Distal) .. +1 (Mesial)
      const sepStrength = Math.min(1, Math.abs(shift) * 1.45);

      // Photorealistic cross-morph on right radiograph: 0° single overlapped canal -> separated 2 canals!
      if (sepStrength > 0.04) {
        h2.drawExtraImage(ctx, "separated", sepStrength, { x: 0.78, y: 0.25, w: 0.2, h: 0.5 });
      }

      // Orbit arc visualizing tube horizontal shift synced with dragGizmo
      const premolar = toPx(0.475, 0.52);
      const rxPx = Math.abs(toPx(0.475 + 0.175, 0.52).x - premolar.x);
      const ryPx = Math.abs(toPx(0.475, 0.52 + 0.145).y - premolar.y);
      const shiftPt = h2.drawOrbitPath(ctx, premolar.x, premolar.y, rxPx, ryPx, st.paramVal / 100, {
        startAngle: Math.PI * 0.78,
        spanAngle: Math.PI * 0.44,
        color: "#FBBF24",
      });
      h2.drawFlowTrack(ctx, [shiftPt, premolar, toPx(0.82, 0.5)], t, "#38BDF8", { width: 1.9, pulseCount: 2, showTip: true });

      if (Math.abs(shift) < 0.1) {
        h2.drawCanvasPill(ctx, toPx(0.88, 0.26).x, toPx(0.88, 0.26).y, "0° Superimposed (منطبقتان)", "#FBBF24");
      } else if (shift > 0) {
        h2.drawCanvasPill(ctx, toPx(0.88, 0.26).x, toPx(0.88, 0.26).y, "Mesial Shift → L Same · B Opp.", "#2DD4BF");
      } else {
        h2.drawCanvasPill(ctx, toPx(0.88, 0.26).x, toPx(0.88, 0.26).y, "Distal Shift → L Same · B Opp.", "#38BDF8");
      }
    },
  },

  "p4-t2": {
    topicId: "p4-t2",
    simId: "p4-frames-clamps",
    imageUrl: "./src/assets/images/p4_t2_anat_rubberdam_1795600174622.jpg",
    supportsXray: true,
    imageAlt: "Clinical split macro photography of turquoise rubber dam with blue plastic radiolucent frame and clear radiograph versus shiny metal Young's clamp and white radiopaque masking radiograph",
    hudTitleAr: "جودة الأشعة: السد المطاطي البلاستيكي مقابل المعدني",
    hudBadgeEn: "Radiolucent Frame vs Radiopaque Metal Masking",
    interactiveParam: {
      labelAr: "كثافة الحجب المعدني على الفيلم (Masking Opacity):",
      minLabel: "بلاستيك شفاف 0%",
      maxLabel: "معدن كامل 100%",
      defaultVal: 80,
      formatReadout: (v) =>
        v < 30
          ? { text: "شفاف للأشعة (Radiolucent) — لا يحجب ✓", tone: "ok" }
          : { text: `حجب معتم فوق الجذور بنسبة ${Math.round(v)}% ⚠️`, tone: "warn" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.25, y: 0.85 },
      p1: { x: 0.76, y: 0.85 },
      handleLabel: "قارن البلاستيك vs المعدن ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "الإطار البلاستيكي الشفاف",
        titleEn: "Radiolucent Plastic Dam Frame",
        descIq: "الإطار البلاستيكي يمرر الأشعة (Radiolucent) بدون ما يترك أي ظل أبيض يخرب الصورة.",
        syncKeywords: ["Radiolucent", "rubber dam frames"],
        posPct: { x: 8, y: 32 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "أشعة واضحة للذروة والآفة",
        titleEn: "Unobstructed Periapical View",
        descIq: "الجذور والآفة الذروية طالعة كاملة وبوضوح تام تحت السد البلاستيكي أثناء عمل حشوة الجذر.",
        syncKeywords: ["do not interfere", "radiography"],
        posPct: { x: 35, y: 62 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "الإطار والملقط المعدني",
        titleEn: "Metal Frame & Metal Clamp",
        descIq: "المعدن يمتص الأشعة بقوة (Radiopaque) ويصنع حواجز بيضاء ناصعة على الفيلم.",
        syncKeywords: ["Metal frames", "clamps"],
        posPct: { x: 64, y: 34 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "حجب التراكيب والأدوات",
        titleEn: "Masking Important Root Structures",
        descIq: "الـ Metal clamp والإطار المعدني ممكن يغطون ذروة الجذر أو الآفة أو نهاية المبرد بالأشعة.",
        syncKeywords: ["mask important structures", "Metal frames"],
        posPct: { x: 88, y: 52 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-plastic",
        labelAr: "1. الإطار البلاستيكي الشفاف (لا يتداخل مع الأشعة)",
        badgeEn: "Radiolucent Advantage",
        duration: 8,
        focus: { cx: 0.25, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t2",
        defaultParam: 15,
        seeIq: "على اليسار إطار أزرق بلاستيكي حقيقي على الضرس، وبجنبه صورة الأشعة طالعة صافية وتبين القنوات والآفة بوضوح بدون أي ظل يعيق القراءة.",
        whyIq: "بما أن البلاستيك شفيف للأشعة (Radiolucent)، ما نضطر نشيل السد المطاطي أثناء تصوير طول العمل أو الكوتا بيركا فنحافظ على التعقيم.",
        tipIq: "إطارات السد المطاطي الشفافة للأشعة (البلاستيكية) لا تتداخل مع أخذ صورة الأشعة.",
        tipEn: "Radiolucent rubber dam frames do NOT interfere with taking radiography.",
        drawCue: "plastic-clear",
      },
      {
        id: "sc-metal",
        labelAr: "2. الإطار والملقط المعدني وحجب الجذور",
        badgeEn: "Metal Frame/Clamp Masking",
        duration: 8,
        focus: { cx: 0.75, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t4",
        xraySuggested: true,
        defaultParam: 90,
        seeIq: "على اليمين ملقط وإطار معدني، شوف كيف طلعوا بالأشعة على شكل أشرطة بيضاء صلبة غطّت التاج ومسار الجذور.",
        whyIq: "المعادن كثافتها عالية جداً فتمنع مرور الأشعة وتسبب ظلال Radiopaque ممكن تخفي كسر، انثقاب، أو طرف المبرد قرب الذروة.",
        tipIq: "الإطارات والملقط المعدني قد تحجب تراكيب مهمة على الفيلم (مثل القنوات أو الذروة).",
        tipEn: "Metal frames and clamps MAY MASK important structures on the film.",
        drawCue: "metal-mask",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      const isMetalSide = st.paramVal >= 45;
      if (!isMetalSide) {
        h2.drawFocusAperture(ctx, { x: 0.25, y: 0.50 }, 0.26, 0.44);
        h2.drawCanvasPill(ctx, toPx(0.36, 0.14).x, toPx(0.36, 0.14).y, "Radiolucent Frame · Clear Film ✓", "#2DD4BF");
      } else {
        h2.drawFocusAperture(ctx, { x: 0.76, y: 0.50 }, 0.26, 0.44);
        h2.drawCanvasPill(ctx, toPx(0.86, 0.14).x, toPx(0.86, 0.14).y, "Radiopaque Metal Masking ⚠️", "#FB7185");
      }
    },
  },

  "p5-t1": {
    topicId: "p5-t1",
    simId: "p5-processing-sim",
    imageUrl: "./src/assets/images/p5_t1_film_processor_1795591376644.jpg",
    supportsXray: false,
    imageAlt: "Quick automated processor heated to 37.7 C with developer and fixer baths, chronological film mount, and magnification monitor",
    hudTitleAr: "التحميض الآلي السريع (37.7°C) والتأريخ والتكبير",
    hudBadgeEn: "Heated Bath 37.7°C · Chronological Order · Zoom",
    interactiveParam: {
      labelAr: "منظم حرارة الحمام المائي (Thermostat Temp):",
      minLabel: "25°C بارد",
      maxLabel: "44°C ساخن جداً",
      defaultVal: 67, // ~37.7C
      formatReadout: (v) => {
        const temp = 25 + (v / 100) * 19;
        if (Math.abs(temp - 37.7) <= 0.6) return { text: `37.7°C قياسي مثالي — تحميض سريع وواضح ✓`, tone: "ok" };
        if (temp < 37.1) return { text: `${temp.toFixed(1)}°C بارد ← بطء وضعف تباين`, tone: "info" };
        return { text: `${temp.toFixed(1)}°C مفرط ← ضباب كيميائي (Fog) ⚠️`, tone: "warn" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.13, y: 0.72 },
      p1: { x: 0.27, y: 0.72 },
      handleLabel: "اسحب حرارة الحوض ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "حوض المظهر والحرارة 37.7°C",
        titleEn: "Developer Bath (Thermostat 37.7°C)",
        descIq: "سخان منظم الحرارة يثبت المظهر والمثبت على 37.7°C، وينغمس الفيلم بالمظهر 5–10 ثوانٍ فقط.",
        syncKeywords: ["37.7", "developer", "thermostatically"],
        posPct: { x: 13.5, y: 72 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "الغسل والمثبت (15–20 ثانية)",
        titleEn: "Water Rinse & Fixer (15–20s)",
        descIq: "بعد المظهر يُشطف الفيلم بالماء ثم يوضع بالمثبت حتى يصفى ويصبح واضحاً خلال 15–20 ثانية.",
        syncKeywords: ["fixer", "immersed", "quick automated"],
        posPct: { x: 26, y: 71 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "تأريخ وترتيب الأفلام زمنياً",
        titleEn: "Dated & Mounted in Chronological Sequence",
        descIq: "العامل #3: كل أفلام علاج الجذور يجب أن تُؤرخ وتُرتب بتسلسل زمني للرجوع الفوري إليها.",
        syncKeywords: ["chronological sequence", "chronological order", "mounted"],
        posPct: { x: 52, y: 49 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "التكبير الرقمي (Digital Zoom In)",
        titleEn: "Magnification & Digital Zoom In",
        descIq: "العامل #4: سابقاً كان التكبير بعدسة مكبرة، أما الآن فالتصوير الرقمي يسمح بالتكبير الواضح مباشرة.",
        syncKeywords: ["magnification", "magnifying lens", "zoomed in"],
        posPct: { x: 83, y: 40 },
        color: "#A78BFA",
      },
    ],
    scenarios: [
      {
        id: "sc-37-7",
        labelAr: "1. التحميض السريع بالحمام الساخن 37.7°C",
        badgeEn: "Quick Automated Processing (37.7°C)",
        duration: 8,
        focus: { cx: 0.22, cy: 0.5, scale: 1.32 },
        highlightTargetId: "t1",
        defaultParam: 67,
        seeIq: "الفيلم يمر من المظهر الأزرق (5–10 ثوانٍ) ثم الغسل بالماء ثم المثبت البرتقالي (15–20 ثانية) داخل حمام مائي بحرارة 37.7°C.",
        whyIq: "السخان المنظم حرارياً يسرّع التحميض ويختصر وقت انتظار المراجع والكرسي مع الحفاظ على صفاء الفيلم.",
        tipIq: "أرقام التحميض السريع: حرارة 37.7°C، المظهر 5–10 ثوانٍ، غسل بالماء، والمثبت حتى يصفى 15–20 ثانية.",
        tipEn: "Quick automated processing maintains developer & fixer at 37.7°C: Developer 5–10s → Water rinse → Fixer until clear (15–20s).",
        drawCue: "processor-flow",
      },
      {
        id: "sc-mount-zoom",
        labelAr: "2. التأريخ المتسلسل والتكبير التشخيصي",
        badgeEn: "Chronological Mount & Digital Zoom",
        duration: 8,
        focus: { cx: 0.7, cy: 0.52, scale: 1.24 },
        highlightTargetId: "t4",
        defaultParam: 67,
        seeIq: "بالوسط إطار يحتوي 4 أفلام مؤرخة ومرتبة زمنياً، وعلى اليمين الشاشة التي تكبّر تفاصيل الجذر بدقة بدون عدسة يدوية.",
        whyIq: "ترتيب الأفلام زمنياً يسمح بالمقارنة الفورية بين الزيارات، والتكبير الرقمي (Zoom in) يكشف القنوات الدقيقة دون الحاجة لعدسة مكبرة.",
        tipIq: "عوامل الجودة 3 و 4: تأريخ وترتيب الأفلام بالتسلسل الزمني + التكبير (الآن بالزوم الرقمي بدل العدسة المكبرة).",
        tipEn: "All endodontic radiographs must be dated and mounted in chronological sequence; digital radiography allows clear zoom in without a magnifying lens.",
        drawCue: "mount-zoom",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const temp = 25 + (st.paramVal / 100) * 19;
      const opt = Math.abs(temp - 37.7) <= 0.6;
      const col = opt ? "#2DD4BF" : temp > 38.3 ? "#FB7185" : "#38BDF8";

      if (st.scenario.drawCue === "processor-flow") {
        h2.drawFocusAperture(ctx, { x: 0.20, y: 0.50 }, 0.22, 0.40);
        const track = [
          toPx(0.135, 0.72),
          toPx(0.115, 0.34),
          toPx(0.16, 0.22),
          toPx(0.2, 0.56),
          toPx(0.23, 0.22),
          toPx(0.265, 0.71),
        ];
        h2.drawFlowTrack(ctx, track, t, col, { width: 2.0, pulseCount: 1, showTip: true });
        h2.drawShockRings(ctx, toPx(0.20, 0.72).x, toPx(0.20, 0.72).y, t, 30, col);
      } else {
        h2.drawFocusAperture(ctx, { x: 0.69, y: 0.50 }, 0.28, 0.38);
      }

      h2.drawCanvasPill(ctx, toPx(0.2, 0.85).x, toPx(0.2, 0.85).y, `${temp.toFixed(1)}°C Bath`, col);
    },
  },

  "p5-t2": {
    topicId: "p5-t2",
    simId: "p5-8-info",
    imageUrl: "./src/assets/images/p5_t2_anat_v4_1795600208024.jpg",
    extraImages: {
      xray: "./src/assets/images/p5_t2_anat_xray_1795600226361.jpg",
    },
    supportsXray: true,
    imageAlt: "Photorealistic bisected mandibular molars inside trabecular bone showing pulp stones sclerosis, external root resorption, K-file with separated tip inside canal lumen, gutta-percha master cone inside canal, lateral perforation, and mental foramen",
    hudTitleAr: "المعلومات الثمانية من صورة الأشعة (8 Items)",
    hudBadgeEn: "Crown/Pulp · WL · Master Cone · Broken File · Landmarks",
    interactiveParam: {
      labelAr: "فحص المعلومات الثمانية تسلسلياً (Items 1 → 8):",
      minLabel: "1–4 التشريح والطول",
      maxLabel: "5–8 المعالم والحوادث",
      defaultVal: 25,
      formatReadout: (v) => {
        const item = Math.max(1, Math.min(8, Math.round(1 + (v / 100) * 7)));
        const names = [
          "1. التاج واللب",
          "2. التكلس والامتصاص",
          "3. عدد واتجاه الجذور",
          "4. تقدير طول العمل",
          "5. الثقب الذقني والجيب",
          "6. تأكيد الكوتا بيركا",
          "7. تقييم نجاح الحشو",
          "8. كسر الأداة أو الانثقاب",
        ];
        return { text: names[item - 1], tone: item >= 8 ? "warn" : "ok" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.255, y: 0.36 },
      p1: { x: 0.805, y: 0.49 },
      handleLabel: "اسحب مسبار المعلومات ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "التاج واللب والتكلس (Sclerosis)",
        titleEn: "1–2: Crown, Pulp & Hard Tissue Sclerosis",
        descIq: "تشريح التاج وحجرة اللب، واكتشاف تغيرات النسج الصلبة مثل حصيات التكلس (Sclerosis) داخل حجرة اللب.",
        syncKeywords: ["crown and pulp", "sclerosis"],
        posPct: { x: 25.5, y: 36 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "امتصاص الجذر وتوجه الجذور",
        titleEn: "2–3: Resorption & Root Morphology",
        descIq: "كشف الامتصاص الجذري الخارجي (Resorption)، ومعرفة عدد وحجم ومكان واتجاه الجذور في العظم.",
        syncKeywords: ["resorption", "roots"],
        posPct: { x: 34, y: 52 },
        color: "#FB7185",
      },
      {
        id: "t3",
        labelAr: "طول العمل والكوتا بيركا والحشو",
        titleEn: "4, 6 & 7: WL, Master Cone & Obturation",
        descIq: "تقدير طول العمل بالمبرد (المسار الأيسر)، وتأكيد موقع قمع الكوتا بيركا وتقييم نجاح الحشو النهائي (المسار الأيمن).",
        syncKeywords: ["working length", "master cone", "obturation"],
        posPct: { x: 80.5, y: 49 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "الثقب الذقني وكسر الأداة والانثقاب",
        titleEn: "5 & 8: Mental Foramen, Separation & Perforation",
        descIq: "تحديد المعالم المجاورة كالثقب الذقني أسفل الجذر، وكشف انكسار مبرد عند الذروة أو ثقب جانبي بجدار الجذر.",
        syncKeywords: ["mental foramen", "separated", "perforations"],
        posPct: { x: 74, y: 86.5 },
        color: "#38BDF8",
      },
    ],
    scenarios: [
      {
        id: "sc-anatomy-alter",
        labelAr: "1. تشريح السن والتكلس والامتصاص والمعالم (1–5)",
        badgeEn: "Items 1–5: Anatomy, Sclerosis, Resorption, Landmarks",
        duration: 8,
        focus: { cx: 0.27, cy: 0.50, scale: 1.24 },
        highlightTargetId: "t1",
        defaultParam: 20,
        seeIq: "الضرس الأيسر يكشف حصيات التكلس داخل حجرة اللب وتآكل الامتصاص على جدار الجذر وتفرع الجذرين داخل العظم الإسفنجي.",
        whyIq: "قبل الشغل لازم تعرف تشريح التاج واللب، وهل يوجد تكلس (Sclerosis) أو امتصاص (Resorption)، وكم جذر واتجاهه وعلاقته بالمعالم.",
        tipIq: "المعلومات 1–5: التاج واللب، تغيرات النسج الصلبة (Sclerosis/Resorption)، عدد وحجم ومكان واتجاه الجذور، تقدير طول العمل، والمعالم التشريحية.",
        tipEn: "Items 1–5: Crown & pulp anatomy, hard tissue alterations (sclerosis/resorption), root number/size/location/direction, WL estimation & mental foramen/maxillary sinus.",
        drawCue: "left-tooth",
      },
      {
        id: "sc-endo-check",
        labelAr: "2. الكوتا بيركا وتقييم الحشو والحوادث (6–8)",
        badgeEn: "Items 6–8: Master Cone, Obturation, Separation & Perforation",
        duration: 8,
        focus: { cx: 0.74, cy: 0.52, scale: 1.24 },
        highlightTargetId: "t3",
        xraySuggested: true,
        defaultParam: 78,
        seeIq: "الضرس الأيمن يظهر المبرد داخل القناة اليسرى مع طرف مكسور عند الذروة، والكوتا بيركا جوه القناة اليمنى، وثقب جانبي صغير وثقب ذقني بالأسفل.",
        whyIq: "الأشعة تؤكد لك وصول قمع الكوتا بيركا لمكانه وتقيم نجاح الحشو، وتكشف أي مبرد مكسور أو انثقاب جانبي فوراً.",
        tipIq: "المعلومات 6–8: تأكيد موضع الـ Master cone، تقييم نجاح الـ Obturation، وكشف انكسار الأدوات أو الانثقابات.",
        tipEn: "Items 6–8: Confirm position of master cone, evaluation of success of obturation, and locate instrument separations or perforations.",
        drawCue: "right-tooth",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      if (st.xrayMode) {
        h2.drawExtraImage(ctx, "xray", 0.98);
      }
      const idx = Math.max(1, Math.min(8, Math.round(1 + (st.paramVal / 100) * 7)));
      const ptsNorm: Pt[] = [
        { x: 0.255, y: 0.24 }, // 1. Crown & pulp
        { x: 0.255, y: 0.36 }, // 2. Sclerosis & resorption
        { x: 0.26, y: 0.65 },  // 3. Number, size, location, direction of roots
        { x: 0.68, y: 0.50 },  // 4. Estimation of WL
        { x: 0.74, y: 0.865 }, // 5. Mental foramen
        { x: 0.805, y: 0.49 }, // 6. Master cone
        { x: 0.805, y: 0.63 }, // 7. Evaluation of obturation
        { x: 0.845, y: 0.53 }, // 8. Instrument separation & perforation
      ];
      const activeNorm = ptsNorm[idx - 1] || ptsNorm[0];
      h2.drawFocusAperture(ctx, activeNorm, 0.16, 0.44);
      const pPx = toPx(activeNorm.x, activeNorm.y);
      h2.drawCanvasPill(ctx, pPx.x, Math.max(26, pPx.y - 36), `Item ${idx}/8`, idx >= 8 ? "#FB7185" : "#2DD4BF");
    },
  },

  "p6-t1": {
    topicId: "p6-t1",
    simId: "p6-ccd-overview",
    imageUrl: "./src/assets/images/p6_t1_ccd_sensor_1795591377919.jpg",
    supportsXray: false,
    imageAlt: "Transition from silver halide film to direct digital CCD wired sensor connected via USB to laptop displaying instant dental radiograph",
    hudTitleAr: "مقدمة التصوير الرقمي والنظام المباشر (CCD)",
    hudBadgeEn: "Silver Halide → 3 Digital Variations · Direct CCD",
    interactiveParam: {
      labelAr: "مقارنة سرعة المعالجة والجرعة (Film vs Direct CCD):",
      minLabel: "فيلم تقليدي",
      maxLabel: "رقمي مباشر CCD",
      defaultVal: 85,
      formatReadout: (v) =>
        v > 50
          ? { text: "Direct CCD: عرض فوري عبر كابل الحاسوب ✓", tone: "ok" }
          : { text: "Silver Halide: فيلم كيميائي تقليدي", tone: "info" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.18, y: 0.75 },
      p1: { x: 0.39, y: 0.53 },
      handleLabel: "اسحب من الفيلم إلى CCD ↗",
    },
    targets: [
      {
        id: "t1",
        labelAr: "قمع الأشعة والأنظمة الثلاثة",
        titleEn: "Three Digital Variations",
        descIq: "التصوير الرقمي في طب الأسنان يتوفر بثلاثة أنظمة: المباشر (CCD)، الفوسفور المخزن (PSP)، وغير المباشر.",
        syncKeywords: ["Digital radiography", "three variations"],
        posPct: { x: 24, y: 44 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "حساس الـ CCD الصلب والكابل",
        titleEn: "Direct Digital Solid-State Sensor (CCD)",
        descIq: "النظام الرقمي المباشر يستخدم حساساً صلباً (CCD) موصولاً بكابل مباشرة نحو الحاسوب.",
        syncKeywords: ["Direct digital system", "CCD", "solid-state"],
        posPct: { x: 39, y: 53 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "برمجية المعالجة والعرض",
        titleEn: "Computer Processing & Software Display",
        descIq: "الحاسوب يحتوي على البرنامج الخاص بمعالجة الإشارة وعرض صورة الأشعة مباشرة على الشاشة.",
        syncKeywords: ["computer", "software", "display"],
        posPct: { x: 77, y: 49 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "الانتقال عن فيلم هاليد الفضة",
        titleEn: "Shift From Silver Halide Film",
        descIq: "على غرار التصوير الفوتوغرافي، يتحول طب الأسنان من أفلام هاليد الفضة إلى المعالجة الحاسوبية.",
        syncKeywords: ["silver halide film", "digital photography"],
        posPct: { x: 16, y: 85 },
        color: "#94A3B8",
      },
    ],
    scenarios: [
      {
        id: "sc-digital-shift",
        labelAr: "1. التحول عن فيلم الفضة والأنواع الثلاثة الرقمية",
        badgeEn: "From Silver Halide to 3 Digital Variations",
        duration: 8,
        focus: { cx: 0.45, cy: 0.52, scale: 1.0 },
        highlightTargetId: "t4",
        defaultParam: 35,
        seeIq: "فيلم هاليد الفضة الأخضر بالزاوية اليسرى السفلى، مقابل المنظومة الرقمية الحديثة بالوسط واليمين.",
        whyIq: "توازي تطوّر طب الأسنان مع التصوير الفوتوغرافي بالانتقال للأنظمة الرقمية الثلاثة: CCD، PSP، و Indirect digital.",
        tipIq: "الأنظمة الرقمية الثلاثة: 1) المباشر CCD، 2) الفوسفور المخزن PSP، 3) النظام غير المباشر.",
        tipEn: "Dental radiography moved from silver halide film to 3 digital variations: 1) Direct digital (CCD), 2) Storage phosphor (PSP), 3) Indirect digital.",
        drawCue: "cable-flow",
      },
      {
        id: "sc-ccd-live",
        labelAr: "2. مسار الإشارة المباشر بحساس الـ CCD",
        badgeEn: "Direct CCD Cable Transmission",
        duration: 8,
        focus: { cx: 0.58, cy: 0.5, scale: 1.25 },
        highlightTargetId: "t2",
        xraySuggested: true,
        defaultParam: 90,
        seeIq: "الحساس الصلب خلف السن يلتقط الأشعة ويرسل الإشارة عبر الكابل إلى برنامج العرض بالحاسوب فوراً.",
        whyIq: "سُمّي نظاماً مباشراً لأن الحساس يتصل بكابل مباشر مع الحاسوب بدون خطوة تحميض أو ماسح خارجي.",
        tipIq: "النظام الرقمي المباشر يستخدم Solid-state sensor مثل CCD مع كابل متصل ببرنامج المعالجة على الحاسوب.",
        tipEn: "Direct digital system uses a solid-state sensor (CCD) and a cable connecting it to computer software to process and display the radiograph.",
        drawCue: "monitor-pulse",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      if (st.paramVal <= 50) {
        h2.drawFocusAperture(ctx, { x: 0.16, y: 0.80 }, 0.18, 0.42);
      } else {
        h2.drawFocusAperture(ctx, { x: 0.58, y: 0.52 }, 0.28, 0.36);
        const speedBoost = 0.7 + (st.paramVal / 100) * 1.1;
        h2.drawFlowTrack(
          ctx,
          [toPx(0.39, 0.55), toPx(0.45, 0.66), toPx(0.47, 0.91), toPx(0.56, 0.72)],
          t,
          "#2DD4BF",
          { width: 2.0, pulseCount: 1, speed: speedBoost, showTip: true }
        );
        h2.drawRegionFilter(ctx, { x: 0.67, y: 0.28, w: 0.21, h: 0.34 }, "contrast(1.24) brightness(1.08)", { alpha: 0.9, radiusPx: 6 });
      }
    },
  },

  "p6-t2": {
    topicId: "p6-t2",
    simId: "p6-rvg-components",
    imageUrl: "./src/assets/images/p6_t2_rvg_system_1795591453838.jpg",
    supportsXray: false,
    imageAlt: "RVG direct digital system components left-to-right: Radio CCD sensor in disposable sheath with fiber-optic shield and cold sterilization tray, Visio monitor unit, Graphy printer",
    hudTitleAr: "مكونات النظام الرقمي المباشر الثلاثة (RVG)",
    hudBadgeEn: "1) Radio (Shield + Sheath) · 2) Visio · 3) Graphy",
    interactiveParam: {
      labelAr: "تسلسل إشارة RVG (Radio → Visio → Graphy):",
      minLabel: "1. Radio استقبال",
      maxLabel: "3. Graphy طباعة",
      defaultVal: 50,
      formatReadout: (v) =>
        v < 34
          ? { text: "1) Radio: Sensor + Fiber Shield + Sheath ✓", tone: "ok" }
          : v < 68
          ? { text: "2) Visio: Processing Unit + Monitor ✓", tone: "info" }
          : { text: "3) Graphy: High-Res Hard-Copy Printer ✓", tone: "ok" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.24, y: 0.68 },
      p1: { x: 0.86, y: 0.60 },
      handleLabel: "اسحب مسار RVG ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "مكون الـ Radio ودرع الألياف",
        titleEn: "Radio Component + Fiber-Optic Shield",
        descIq: "حساس عالي الدقة مساحته تشبه الفيلم التقليدي، محمي من تلف الأشعة بدرع ألياف بصرية (Fiber-optic shield).",
        syncKeywords: ["Radio component", "fiber-optic shield"],
        posPct: { x: 24, y: 38 },
        color: "#FBBF24",
      },
      {
        id: "t2",
        labelAr: "التعقيم البارد والكيس الواقي",
        titleEn: "Cold Sterilization & Disposable Plastic Sheath",
        descIq: "ممنوع يدخل الأوتوكلاف! يُعقم بالتعقيم البارد (Cold sterilized) ويُغلف بكيس بلاستيكي للاستعمال الواحد.",
        syncKeywords: ["cold sterilized", "disposable plastic sheaths"],
        posPct: { x: 26, y: 62 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "مكون الـ Visio والمعالجة",
        titleEn: "Visio: Video Monitor & Processing Unit",
        descIq: "شاشة فيديو ووحدة عرض ومعالجة تحول الصورة المرسلة إلى بيانات رقمية مخزونة في الحاسوب.",
        syncKeywords: ["Visio", "video monitor", "digitized"],
        posPct: { x: 60, y: 39 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "مكون الـ Graphy والطابعة",
        titleEn: "Graphy: High-Resolution Printer",
        descIq: "طابعة عالية الدقة توفر نسخة ورقية مطبوعة (Hard copy) من صورة الشاشة بنفس إشارة الفيديو.",
        syncKeywords: ["Graphy", "printer", "hard copy"],
        posPct: { x: 86, y: 59 },
        color: "#A78BFA",
      },
    ],
    scenarios: [
      {
        id: "sc-radio-care",
        labelAr: "1. مكون Radio والحماية والتعقيم البارد",
        badgeEn: "Radio Component Protection & Infection Control",
        duration: 8,
        focus: { cx: 0.28, cy: 0.48, scale: 1.32 },
        highlightTargetId: "t1",
        defaultParam: 20,
        seeIq: "الحساس باليسار يُظهر الدرع الذهبي للألياف البصرية داخله، وغلافه البلاستيكي الشفاف بجانب حوض التعقيم البارد.",
        whyIq: "درع الألياف البصرية يمنع تلف الحساس بالأشعة، والتعقيم البارد مع الأكياس البلاستيكية يمنع انتقال العدوى دون إتلاف الإلكترونيات بالحرارة.",
        tipIq: "مكون Radio: حساس عالي الدقة محمي بـ Fiber-optic shield، يتعقم بالتعقيم البارد ويُغطى بكيس بلاستيكي للاستعمال الواحد.",
        tipEn: "Radio component: high-res sensor protected from X-ray degradation by a fiber-optic shield, cold sterilized, and covered with disposable plastic sheaths.",
        drawCue: "radio-care",
      },
      {
        id: "sc-visio-graphy",
        labelAr: "2. مسار العرض (Visio) والطباعة الورقية (Graphy)",
        badgeEn: "Visio Monitor → Graphy Hard-Copy",
        duration: 8,
        focus: { cx: 0.67, cy: 0.5, scale: 1.15 },
        highlightTargetId: "t3",
        defaultParam: 75,
        seeIq: "البيانات تنتقل إلى وحدة المعالجة وشاشة الفيديو (Visio) بالوسط، وتخرج نسخة ورقية مطبوعة من الطابعة (Graphy) باليمين.",
        whyIq: "كل مكون في RVG يكمل الآخر: استقبال في الفم، رقمنة وخزن وعرض بالشاشة، وطباعة ورقية بنفس إشارة الفيديو.",
        tipIq: "Visio = شاشة فيديو ووحدة معالجة للرقمنة والخزن؛ Graphy = طابعة عالية الدقة للنسخة الورقية بنفس إشارة الفيديو.",
        tipEn: "Visio component: video monitor + display-processing unit that digitizes & stores the image. Graphy: high-res printer providing hard copy via the same video signal.",
        drawCue: "rvg-chain",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      if (st.paramVal < 34) {
        h2.drawFocusAperture(ctx, { x: 0.25, y: 0.50 }, 0.22, 0.42);
        h2.drawFlowTrack(ctx, [toPx(0.28, 0.68), toPx(0.51, 0.67)], t, "#38BDF8", { width: 2.0, pulseCount: 1, showTip: true });
      } else if (st.paramVal < 68) {
        h2.drawFocusAperture(ctx, { x: 0.60, y: 0.46 }, 0.22, 0.42);
        h2.drawFlowTrack(ctx, [toPx(0.28, 0.68), toPx(0.51, 0.67)], t, "#2DD4BF", { width: 2.0, pulseCount: 1, showTip: true });
      } else {
        h2.drawFocusAperture(ctx, { x: 0.86, y: 0.56 }, 0.20, 0.42);
        h2.drawFlowTrack(ctx, [toPx(0.68, 0.63), toPx(0.77, 0.59)], t, "#A78BFA", { width: 1.9, pulseCount: 1, showTip: true });
      }
    },
  },

  "p7-t1": {
    topicId: "p7-t1",
    simId: "p7-ccd-pros-cons",
    imageUrl: "./src/assets/images/p7_t1_bulky_ccd_1795591380751.jpg",
    supportsXray: false,
    imageAlt: "Bulky thick wired CCD sensor pressing lingual mucosa beside lower molar versus enhanced monitor image and storage HDD",
    hudTitleAr: "حساس الـ CCD: المزايا الخمس والمساوئ الأربع",
    hudBadgeEn: "5 Advantages vs 4 Disadvantages (Bulky + Cable + Disk Space)",
    interactiveParam: {
      labelAr: "موازنة المزايا الرقمية مقابل عيوب الحساس السلكي:",
      minLabel: "المساوئ الأربع",
      maxLabel: "المزايا الخمس",
      defaultVal: 30,
      formatReadout: (v) =>
        v < 50
          ? { text: "عيوب CCD: غالي + عمر غير ثابت + سميك بكابل + مساحة قرص ⚠️", tone: "warn" }
          : { text: "مزايا CCD: جرعة أقل + بلا غرفة مظلمة + تحسين وأرشفة ✓", tone: "ok" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.36, y: 0.55 },
      p1: { x: 0.82, y: 0.45 },
      handleLabel: "اسحب بين الحساس والشاشة ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "الحساس السميك والكابل الموصول",
        titleEn: "Bulky Sensor With Cable Attachment",
        descIq: "العيب (c): حساس سميك ومربوط بكابل يجعل وضعه وتثبيته داخل فم المريض صعباً (مع سعره الغالي وعمره غير الثابت).",
        syncKeywords: ["Bulky sensor", "cable attachment", "Expensive"],
        posPct: { x: 40, y: 39 },
        color: "#FB7185",
      },
      {
        id: "t2",
        labelAr: "صعوبة التموضع وضغط الأنسجة",
        titleEn: "Difficult Placement in Mouth",
        descIq: "صلابة الحساس وسماكته تضغطان على اللسان وقاع الفم الحساسين خصوصاً عند تصوير الأرحاء السفلية.",
        syncKeywords: ["placement in mouth difficult", "Life expectancy"],
        posPct: { x: 38, y: 57 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "بلا غرفة مظلمة + تحسين وتكبير رقمي",
        titleEn: "No Darkroom, Consistent & Digital Zoom",
        descIq: "المزايا (a–d): جرعة إشعاع قليلة، عرض فوري بلا غرفة مظلمة أو مخاطر تحميض، جودة ثابتة، وتحسين وتكبير رقمي.",
        syncKeywords: ["Low radiation dose", "Darkroom", "digital enhancement"],
        posPct: { x: 83, y: 37 },
        color: "#2DD4BF",
      },
      {
        id: "t4",
        labelAr: "الأرشفة مقابل مساحة القرص الكبيرة",
        titleEn: "Archiving vs Large Disk Space Required",
        descIq: "يوفر أرشفة وخزن معلومات المرضى (الميزة e)، لكنه في المقابل يتطلب مساحة قرص صلب كبيرة لحفظ الصور (العيب d).",
        syncKeywords: ["Storages and archiving", "Large disk space"],
        posPct: { x: 83, y: 69 },
        color: "#38BDF8",
      },
    ],
    scenarios: [
      {
        id: "sc-cons",
        labelAr: "1. المساوئ الأربع بالعيادة (السماكة والكابل والقرص)",
        badgeEn: "4 Disadvantages: Expensive · Lifespan · Bulky/Cable · Disk Space",
        duration: 8,
        focus: { cx: 0.36, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t1",
        defaultParam: 25,
        seeIq: "الحساس الأسود السميك وكابله يدفعان اللسان ويصعّبان التثبيت بجانب الرحى السفلية داخل الفم.",
        whyIq: "سماكة الـ CCD وجودة السلك صعبان موضعياً بالفم، بالإضافة لارتفاع كلفته وعمره غير الثابت وحاجته لمساحة تخزين كبيرة.",
        tipIq: "عيوب الـ CCD الأربعة: غالي، عمره الافتراضي غير ثابت، حساس سميك بكابل يصعب وضعه بالفم، ويحتاج مساحة قرص كبيرة.",
        tipEn: "CCD 4 Disadvantages: a) Expensive, b) Life expectancy not fixed, c) Bulky sensor with cable making mouth placement difficult, d) Large disk space required.",
        drawCue: "ccd-pressure",
      },
      {
        id: "sc-pros",
        labelAr: "2. المزايا الخمس: جرعة قليلة وجودة ثابتة وتكبير وأرشفة",
        badgeEn: "5 Advantages: Low Dose · No Darkroom · Enhancement · Archiving",
        duration: 8,
        focus: { cx: 0.78, cy: 0.5, scale: 1.25 },
        highlightTargetId: "t3",
        xraySuggested: true,
        defaultParam: 80,
        seeIq: "على الشاشة اليسرى/اليمنى صورة واضحة مكبرة مباشرة بلا تحميض، وأيقونة القرص بالأسفل توضح خزن وأرشفة ملفات المرضى.",
        whyIq: "تستغني عن غرفة التحميض ومخاطرها الكيميائية تماماً، وتعدل التباين وتكبر التفاصيل وتأرشف ملف المريض بضغطة زر.",
        tipIq: "مزايا الـ CCD الخمس: جرعة قليلة، بلا غرفة مظلمة (رؤية فورية)، جودة ثابتة، تحسين وتكبير رقمي، وأرشفة معلومات المريض.",
        tipEn: "CCD 5 Advantages: Low radiation dose, no darkroom (instant view without processing hazards), consistent quality, digital enhancement & enlargement, storage & archiving.",
        drawCue: "ccd-screen",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      if (st.paramVal < 50) {
        h2.drawFocusAperture(ctx, { x: 0.36, y: 0.49 }, 0.25, 0.44);
        h2.drawCanvasPill(ctx, toPx(0.29, 0.72).x, toPx(0.29, 0.72).y, "Bulky + Cable Placement ⚠️", "#FB7185");
      } else {
        h2.drawRegionFilter(
          ctx,
          { x: 0.72, y: 0.22, w: 0.22, h: 0.34 },
          "contrast(1.28) brightness(1.06)",
          { alpha: 0.92, radiusPx: 10 }
        );
        h2.drawFocusAperture(ctx, { x: 0.83, y: 0.45 }, 0.23, 0.44);
        h2.drawCanvasPill(ctx, toPx(0.83, 0.16).x, toPx(0.83, 0.16).y, "Digital Zoom + No Darkroom ✓", "#2DD4BF");
      }
    },
  },

  "p7-t2": {
    topicId: "p7-t2",
    simId: "p7-psp-scanner-sim",
    imageUrl: "./src/assets/images/p7_t2_psp_scanner_1795591454905.jpg",
    supportsXray: false,
    imageAlt: "PSP indirect storage phosphor plate exposed wirelessly by X-ray then scanned by red laser drum scanner in 20-30 seconds",
    hudTitleAr: "نظام الفوسفور المخزن (PSP) ومسح الليزر",
    hudBadgeEn: "Wireless Plate · 90% Lower Dose · 20–30s Laser Readout",
    interactiveParam: {
      labelAr: "التقدم داخل الماسح الليزري (0s → 30s):",
      minLabel: "تعريض -90% جرعة",
      maxLabel: "اكتمال المسح 30s",
      defaultVal: 60,
      formatReadout: (v) => {
        const sec = Math.round((v / 100) * 30);
        if (sec < 10) return { text: `تخزين الصورة الكامنة (-90% Radiation)`, tone: "info" };
        return { text: `قراءة الليزر: ${sec}s / 20–30s ✓`, tone: "ok" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.35, y: 0.55 },
      p1: { x: 0.73, y: 0.58 },
      handleLabel: "اسحب الصفيحة للماسح ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "صفيحة PSP اللاسلكية (-90% جرعة)",
        titleEn: "Photo-Stimulable Phosphor Plate (90% Reduction)",
        descIq: "صفيحة مرنة بلا سلك تخزن الصورة الكامنة (Latent image) في الفوسفور بجرعة إشعاع أقل بنسبة 90%.",
        syncKeywords: ["phosphor plate", "90% reduction", "latent image"],
        posPct: { x: 35, y: 36 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "جهاز المسح الليزري الخارجي",
        titleEn: "Extra-Oral Laser Scanner",
        descIq: "جهاز خارج الفم تُوضع فيه الصفيحة بعد التصوير لقراءة الصورة الكامنة وتحويلها لملف رقمي.",
        syncKeywords: ["extra-oral laser scanner", "readout"],
        posPct: { x: 63, y: 40 },
        color: "#F59E0B",
      },
      {
        id: "t3",
        labelAr: "قراءة الليزر (20–30 ثانية)",
        titleEn: "Laser Readout (20–30 Seconds)",
        descIq: "شعاع الليزر يمسح الصفيحة ويحول الطاقة المخزنة إلى صورة شبه فورية خلال 20 إلى 30 ثانية.",
        syncKeywords: ["20", "30", "Almost instant"],
        posPct: { x: 67, y: 61 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "العرض شبه الفوري على الشاشة",
        titleEn: "Almost Instant Screen Image",
        descIq: "تظهر الأشعة بوضوح عالٍ على الشاشة بعد 20–30 ثانية من إدخال الصفيحة في الماسح.",
        syncKeywords: ["Almost instant image", "Storage phosphor"],
        posPct: { x: 86, y: 46 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-exposure",
        labelAr: "1. التصوير بالصفيحة وتقليل الإشعاع 90%",
        badgeEn: "90% Dose Reduction & Latent Storage",
        duration: 8,
        focus: { cx: 0.28, cy: 0.5, scale: 1.28 },
        highlightTargetId: "t1",
        defaultParam: 20,
        seeIq: "على اليسار القمع يسلط الأشعة على صفيحة الفوسفور الزرقاء اللاسلكية خلف الضرس فتخزن الصورة الكامنة داخلها.",
        whyIq: "الفوسفور يلتقط الصورة بـ 10% فقط من جرعة الفيلم الاعتيادي (تقليل 90%) دون أي سلك مزعج داخل الفم.",
        tipIq: "الـ PSP يستخدم Photo-stimulable phosphor plate لتخزين الصورة الكامنة بجرعة أقل بنسبة 90%.",
        tipEn: "PSP system uses a photo-stimulable phosphor plate storing the latent image in the phosphor with a low radiation dose (90% reduction).",
        drawCue: "psp-expose",
      },
      {
        id: "sc-laser",
        labelAr: "2. القراءة بالماسح الليزري خلال 20–30 ثانية",
        badgeEn: "Extra-Oral Laser Readout (20–30 s)",
        duration: 8,
        focus: { cx: 0.72, cy: 0.5, scale: 1.24 },
        highlightTargetId: "t3",
        xraySuggested: true,
        defaultParam: 75,
        seeIq: "باليمين الصفيحة تدخل داخل جهاز المسح الليزري وتحت خط الليزر الأحمر لتظهر الأشعة على الشاشة.",
        whyIq: "سُميت الصورة شبه فورية (Almost instant) لأنها تحتاج 20–30 ثانية للقراءة داخل الماسح الليزري خارج الفم.",
        tipIq: "تُقرأ صفيحة الـ PSP عبر Extra-oral laser scanner فتظهر صورة شبه فورية خلال 20–30 ثانية.",
        tipEn: "Latent image in the PSP plate is read out by an extra-oral laser scanner, yielding an almost instant image in 20–30 seconds.",
        drawCue: "psp-laser",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      if (st.paramVal < 40) {
        h2.drawFocusAperture(ctx, { x: 0.32, y: 0.47 }, 0.22, 0.36);
        h2.drawFlowTrack(ctx, [toPx(0.14, 0.41), toPx(0.32, 0.44)], t, "#38BDF8", { width: 2.0, pulseCount: 1, showTip: true });
        h2.drawCanvasPill(ctx, toPx(0.28, 0.21).x, toPx(0.28, 0.21).y, "-90% Radiation Dose · Wireless PSP ✓", "#2DD4BF");
      } else {
        const u = Math.max(0.04, Math.min(1, (st.paramVal - 40) / 60));
        const scanX = 0.60 + u * 0.14;
        const l1 = toPx(scanX, 0.585);
        const l2 = toPx(scanX, 0.645);
        ctx.save();
        ctx.strokeStyle = "rgba(251, 113, 133, 0.95)";
        ctx.shadowColor = "#FB7185";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(l1.x, l1.y);
        ctx.lineTo(l2.x, l2.y);
        ctx.stroke();
        ctx.restore();

        h2.drawFocusAperture(ctx, { x: 0.74, y: 0.50 }, 0.24, 0.32);
        h2.drawFlowTrack(ctx, [toPx(0.73, 0.59), toPx(0.84, 0.48)], t, "#2DD4BF", { width: 1.8, pulseCount: 1, showTip: true });
        h2.drawCanvasPill(ctx, toPx(0.84, 0.24).x, toPx(0.84, 0.24).y, `Laser Readout: ${Math.round((st.paramVal / 100) * 30)}s ✓`, "#2DD4BF");
      }
    },
  },

  "p8-t1": {
    topicId: "p8-t1",
    simId: "p8-psp-indirect",
    imageUrl: "./src/assets/images/p8_t1_anat_indirect_1795600173672.jpg",
    supportsXray: false,
    imageAlt: "Left: flexible PSP plates sizes 0, 2, 3 with dental model and remote wall X-ray head; Right: flatbed transparency scanner digitizing green silver halide film onto LCD monitor",
    hudTitleAr: "مزايا ومساوئ PSP والنظام غير المباشر (Indirect)",
    hudBadgeEn: "Flexible Sizes · Remote X-Ray vs Flatbed Film Scan",
    interactiveParam: {
      labelAr: "مقارنة التقنيتين (PSP Wireless ← → Indirect Film Scan):",
      minLabel: "PSP قياسات مرنة",
      maxLabel: "Indirect مسح فيلم",
      defaultVal: 60,
      formatReadout: (v) =>
        v < 50
          ? { text: "PSP: مرونة + مصدر بعيد | عيوب: كلفة وعمر وتخزين", tone: "info" }
          : { text: "Indirect Digital: رقمنة أفلام هاليد الفضة بالماسح ✓", tone: "ok" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.18, y: 0.76 },
      p1: { x: 0.67, y: 0.63 },
      handleLabel: "اسحب بين PSP والماسح ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "صفائح PSP مرنة بمقاسات الأفلام",
        titleEn: "PSP Pro (4): Flexible & Film-Sized Plates",
        descIq: "الميزة 4 للـ PSP: صفائح مرنة وبأحجام مطابقة لأفلام الأشعة التقليدية (0 و 2 و 3)، مما يسهل وضعها بالفم.",
        syncKeywords: ["Flexible", "similar sizes"],
        posPct: { x: 18, y: 76 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "مصدر أشعة بعيد ومساوئ PSP",
        titleEn: "PSP Pro (5) Remote X-Ray & 3 Cons",
        descIq: "الميزة 5: جهاز الأشعة يكون بعيداً عن الحاسوب. أما المساوئ الثلاث: الكلفة، عمر الصفيحة، وتخزين الصور (مثل CCD).",
        syncKeywords: ["remote from PC", "Cost", "Life expectancy"],
        posPct: { x: 29, y: 30 },
        color: "#FBBF24",
      },
      {
        id: "t3",
        labelAr: "النظام غير المباشر: مسح فيلم تقليدي",
        titleEn: "3) Indirect Digital: Silver Halide Scanner",
        descIq: "النظام الرقمي غير المباشر يستخدم جهاز ماسح ضوئي متصل بالحاسوب لرقمنة أفلام هاليد الفضة التقليدية.",
        syncKeywords: ["Indirect digital", "scanning device", "silver halide"],
        posPct: { x: 67, y: 63 },
        color: "#F59E0B",
      },
      {
        id: "t4",
        labelAr: "الأرشفة ومساحة التخزين بالحاسوب",
        titleEn: "Storage & Archiving on PC",
        descIq: "خزن وأرشفة معلومات المريض على الحاسوب (الميزة 3 لـ PSP)، مع ملاحظة حجم التخزين المطلوب كأحد المساوئ.",
        syncKeywords: ["Storage", "archiving", "Storage of images"],
        posPct: { x: 91, y: 25 },
        color: "#2DD4BF",
      },
    ],
    scenarios: [
      {
        id: "sc-psp-rest",
        labelAr: "1. مزايا الـ PSP (3–5) ومساوئه الثلاثة",
        badgeEn: "PSP Pros (3–5) & Cons (1–3)",
        duration: 8,
        focus: { cx: 0.25, cy: 0.54, scale: 1.24 },
        highlightTargetId: "t1",
        defaultParam: 25,
        seeIq: "على اليسار ثلاث صفائح PSP زرقاء مرنة بمقاسات 0 و 2 و 3 على الطاولة، وجهاز الأشعة الجداري منفصل تماماً عن غرفة الحاسوب.",
        whyIq: "عدم وجود سلك يتيح بُعد جهاز الأشعة عن الحاسوب ومرونة المقاسات مثل الفيلم، لكن الصفيحة تتأثر بالخدش ولها عمر محدود وكلفة.",
        tipIq: "مزايا PSP 3–5: الأرشفة، المرونة بمقاسات الأفلام، وبعد المصدر عن الحاسوب. عيوبه: الكلفة، عمر الصفائح، وحجم التخزين.",
        tipEn: "PSP Pros 3–5: Storage & archiving, flexible with similar sizes to X-ray films, X-ray source remote from PC. Cons: Cost, plate life expectancy, image storage (same as CCD).",
        drawCue: "psp-remote",
      },
      {
        id: "sc-indirect",
        labelAr: "2. النظام الرقمي غير المباشر (Indirect Digital)",
        badgeEn: "3) Indirect Digital System (Film Scanning)",
        duration: 8,
        focus: { cx: 0.76, cy: 0.45, scale: 1.24 },
        highlightTargetId: "t3",
        defaultParam: 80,
        seeIq: "على اليمين فيلم هاليد فضة أخضر تقليدي محمض مسبقاً داخل الماسح الضوئي ليتحول لصورة رقمية على الشاشة.",
        whyIq: "النظام غير المباشر لا يستغني عن الفيلم التقليدي بل يحوّل أفلام هاليد الفضة الموجودة إلى ملفات رقمية بالحاسوب.",
        tipIq: "النظام غير المباشر (Indirect digital): جهاز مسح متصل بالحاسوب لرقمنة أفلام هاليد الفضة التقليدية.",
        tipEn: "3) Indirect digital system: uses a scanning device connected to a computer for digitizing traditional silver halide dental films.",
        drawCue: "flatbed-scan",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      if (st.paramVal < 50) {
        h2.drawFocusAperture(ctx, { x: 0.25, y: 0.54 }, 0.24, 0.42);
        h2.drawCanvasPill(ctx, toPx(0.25, 0.16).x, toPx(0.25, 0.16).y, "Flexible Sizes · Remote PC ✓", "#2DD4BF");
      } else {
        const u = Math.max(0.05, Math.min(1, (st.paramVal - 50) / 50));
        const scanX = 0.58 + u * 0.16;
        const s1 = toPx(scanX, 0.55);
        const s2 = toPx(scanX, 0.68);
        ctx.save();
        ctx.strokeStyle = "#F59E0B";
        ctx.shadowColor = "#FBBF24";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        ctx.restore();

        h2.drawRegionFilter(
          ctx,
          { x: 0.80, y: 0.08, w: 0.19, h: 0.34 },
          "contrast(1.24) brightness(1.06)",
          { alpha: 0.9, radiusPx: 6 }
        );
        h2.drawFocusAperture(ctx, { x: 0.77, y: 0.46 }, 0.25, 0.40);
        h2.drawFlowTrack(ctx, [toPx(0.75, 0.58), toPx(0.86, 0.38)], t, "#2DD4BF", { width: 1.9, pulseCount: 1, showTip: true });
      }
    },
  },

  "p8-t2": {
    topicId: "p8-t2",
    simId: "p8-cbct-scanner-3d",
    imageUrl: "./src/assets/images/p8_t2_patient_cbct_small_fov_1795604875172.jpg",
    extraImages: {
      large: "./src/assets/images/p8_t2_patient_cbct_large_fov_1795604900922.jpg",
    },
    supportsXray: false,
    imageAlt: "Photorealistic clinical dental CBCT suite with a real living human patient inside the rotating C-arm gantry, narrow 4x4 cm teal cone beam focused on the jaw transitioning to wide amber full-head FOV and 3D workstation monitor",
    hudTitleAr: "التصوير المقطعي المخروطي (CBCT) ومجال 4×4 سم",
    hudBadgeEn: "180–360° Sweep · Limited FOV 4×4 cm · 75–60 µm Voxel",
    interactiveParam: {
      labelAr: "حجم مجال الرؤية (CBCT FOV Size):",
      minLabel: "4×4 cm سن واحد",
      maxLabel: "Large FOV كامل الرأس",
      defaultVal: 15,
      formatReadout: (v) =>
        v <= 30
          ? { text: "Limited FOV ≤4×4 cm: سن محدد · دقة 75–60 µm ✓", tone: "ok" }
          : { text: "Large FOV: كامل الرأس · دقة فوكسل أقل ⚠️", tone: "warn" },
    },
    dragGizmo: {
      kind: "radius",
      center: { x: 0.46, y: 0.48 },
      minR: 0.055,
      maxR: 0.19,
      angleRad: -0.35,
      handleLabel: "اسحب مجال FOV ⇔",
    },
    targets: [
      {
        id: "t1",
        labelAr: "مصدر الحزمة المخروطية (180–360°)",
        titleEn: "Cone-Shaped Beam (180–360° Single Sweep)",
        descIq: "ظهر CBCT للوجه والفكين سنة 1996، ويدور مصدره وحساسه 180–360° بمسحة واحدة حول رأس المريض لإنتاج مئات الإسقاطات وبناء 3D فوري.",
        syncKeywords: ["coneshaped", "180", "360", "1996"],
        posPct: { x: 16, y: 46 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "منطقة السن ومجال 4×4 سم",
        titleEn: "Small / Limited FOV (≤ 4×4 cm)",
        descIq: "يتراوح الـ FOV من جزء صغير من القوس (منطقة سن واحد) إلى كامل الرأس؛ ولعلاج الجذور نطلب Limited FOV (4×4 سم أو أقل) لأعلى دقة.",
        syncKeywords: ["limited", "field of view", "4x4"],
        posPct: { x: 47, y: 50 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "مجسم الفوكسل على الشاشة (75–60 µm)",
        titleEn: "Flat Detector & 75–60 µm Voxel Resolution",
        descIq: "تظهر على الشاشة النتيجة المطابقة لحجم المجال: سن واحد بدقة فائقة (75–60 µm voxel) عند 4×4 سم، أو الرأس كاملاً في الـ Large FOV.",
        syncKeywords: ["75", "60", "voxel", "maximum resolution"],
        posPct: { x: 86, y: 28 },
        color: "#FBBF24",
      },
    ],
    scenarios: [
      {
        id: "sc-gantry-orbit",
        labelAr: "1. دوران الحزمة 180–360° حول رأس المريض",
        badgeEn: "CBCT Cone Rotation (1996) & Single Sweep",
        duration: 8,
        focus: { cx: 0.5, cy: 0.5, scale: 1.0 },
        highlightTargetId: "t1",
        defaultParam: 15,
        seeIq: "ذراع الـ CBCT الدوارة تحيط برأس المريض الحقيقي، والحزمة المخروطية تنطلق من المصدر يساراً عبر الفك نحو الكاشف المسطح يميناً لتبني الصورة الثلاثية على الشاشة.",
        whyIq: "منذ 1996 قدّم CBCT أول تقنية 3D عملية للاندو بالتقاط مئات الصور المسطحة بمسحة واحدة وبعلاقة مباشرة بين المصدر والحساس.",
        tipIq: "أرقام الـ CBCT: ظهر عام 1996، حزمة مخروطية تدور 180–360° بمسحة واحدة، ودقة الفوكسل 75–60 µm.",
        tipEn: "Introduced in 1996, CBCT uses a cone-shaped beam rotating 180–360° in a single sweep to capture hundreds of planar projections into an immediate 3D FOV.",
        drawCue: "gantry-orbit",
      },
      {
        id: "sc-limited-fov",
        labelAr: "2. مقارنة مجال 4×4 سم (سن) vs كامل الرأس",
        badgeEn: "Limited FOV (4×4 cm) vs Full Head",
        duration: 8,
        focus: { cx: 0.56, cy: 0.47, scale: 1.12 },
        highlightTargetId: "t2",
        defaultParam: 10,
        seeIq: "الحزمة الفيروزية الضيقة تتركز على منطقة السن المطلوب فتظهر رحى واحدة بدقة فائقة على الشاشة، وعند توسيع الشريط يتسع الشعاع ليشمل الرأس كله مع مجسم الرأس الكامل.",
        whyIq: "كلما صغر مجال الرؤية إلى ≤4×4 سم حققنا أعلى دقة وضوح مكانية (75–60 مايكرومتر فوكسل) لكشف تفاصيل القنوات بأقل جرعة إشعاع.",
        tipIq: "لعلاج الجذور نختار مجال رؤية صغير ومحدود (≤4×4 سم) للحصول على أعلى دقة وضوح (75–60 µm voxel).",
        tipEn: "For endodontics, a small/limited FOV (≤4×4 cm) is required for maximum resolution, reaching 75–60 µm voxel in some machines.",
        drawCue: "fov-4x4",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const fovFrac = Math.max(0, Math.min(1, (st.paramVal - 20) / 65));
      if (fovFrac > 0.02) {
        h2.drawExtraImage(ctx, "large", fovFrac);
      }

      const gantryCenter = toPx(0.365, 0.46);
      const rxPx = Math.abs(toPx(0.365 + 0.275, 0.46).x - gantryCenter.x);
      const ryPx = Math.abs(toPx(0.365, 0.46 + 0.485).y - gantryCenter.y);
      h2.drawOrbitPath(ctx, gantryCenter.x, gantryCenter.y, rxPx, ryPx, t, {
        startAngle: 0,
        spanAngle: Math.PI * 2,
        color: st.paramVal <= 30 ? "#38BDF8" : "#F59E0B",
      });

      const isSmall = st.paramVal <= 30;
      const col = isSmall ? "#2DD4BF" : "#F59E0B";
      if (isSmall) {
        h2.drawFocusAperture(ctx, { x: 0.47, y: 0.50 }, 0.145, 0.34);
        h2.drawCanvasPill(
          ctx,
          toPx(0.86, 0.10).x,
          toPx(0.86, 0.10).y,
          "FOV 4×4 cm (سن واحد) · 75–60 µm ✓",
          col
        );
      } else {
        h2.drawFocusAperture(ctx, { x: 0.43, y: 0.45 }, 0.24, 0.34);
        h2.drawCanvasPill(
          ctx,
          toPx(0.86, 0.10).x,
          toPx(0.86, 0.10).y,
          "Large FOV (كامل الرأس) · دقة أقل ⚠️",
          "#FB7185"
        );
      }
    },
  },

  "p9-t1": {
    topicId: "p9-t1",
    simId: "p9-cbct-slices-sim",
    imageUrl: "./src/assets/images/p9_t1_cbct_clean_1795595818304.jpg",
    extraImages: {
      metal: "./src/assets/images/p9_t1_cbct_artifacts_1795591456401.jpg",
    },
    supportsXray: true,
    imageAlt: "CBCT orthogonal axial, sagittal, and coronal planes with 1:1 isotropic voxel transitioning to metallic beam-hardening starburst artifacts and motion blur",
    hudTitleAr: "مزايا ومحددات الـ CBCT وتقطيع المحاور الثلاثة",
    hudBadgeEn: "Isotropic Voxels · All Planes vs Artifacts & Motion",
    interactiveParam: {
      labelAr: "شدة تشويش المعادن والحركة (Artifact Severity):",
      minLabel: "فوكسل متساوي نقي",
      maxLabel: "وتد معدني + حركة",
      defaultVal: 70,
      formatReadout: (v) =>
        v < 30
          ? { text: "شرائح 3D نقية بفوكسل متساوي (Isotropic) ✓", tone: "ok" }
          : { text: `تشويش عالي الكثافة وحركة (${Math.round(v)}%) ⚠️`, tone: "warn" },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.72, y: 0.24 },
      p1: { x: 0.88, y: 0.24 },
      handleLabel: "اسحب تشويش المعدن ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "المستويات المتعامدة والعلاقة المكانية",
        titleEn: "3D Spatial Relationship & All-Plane Slices",
        descIq: "الميزتان (a & b): إظهار التشريح ثلاثي الأبعاد والعلاقة المكانية للآفة، وإمكانية تصفح الشرائح بكل المستويات.",
        syncKeywords: ["slices", "all the planes", "spatial relationship"],
        posPct: { x: 33, y: 47 },
        color: "#2DD4BF",
      },
      {
        id: "t2",
        labelAr: "الفوكسل المتساوي (Isotropic Voxels)",
        titleEn: "Isotropic Voxels (Geometrical Accuracy)",
        descIq: "الميزتان (c & d): إشعاع أقل وجودة ممتازة للنسج الصلبة، وفوكسلات متساوية الأبعاد تضمن الدقة الهندسية للصور.",
        syncKeywords: ["isotropic", "geometrical accuracy", "hard tissues"],
        posPct: { x: 48.5, y: 69 },
        color: "#38BDF8",
      },
      {
        id: "t3",
        labelAr: "تشويش الأجسام عالية الكثافة",
        titleEn: "High-Density Artifacts (Enamel / Metal)",
        descIq: "المحدد (b): احتمالية الشوائب أعلى بالـ CBCT عند اصطدام الشعاع بأجسام كثيفة جداً مثل المينا أو الحشوات والتيجان المعدنية.",
        syncKeywords: ["artifacts", "high-density", "metallic restorations"],
        posPct: { x: 80, y: 24 },
        color: "#FB7185",
      },
      {
        id: "t4",
        labelAr: "تباين أقل من الذروية وثبات المريض",
        titleEn: "Lower Resolution vs PA & Patient Stillness",
        descIq: "المحددان (a & c): الوضوح والتباين أقل من أشعة داخل الفم، ويجب أن يبقى المريض ساكناً تماماً حتى لا تقل حدة الصورة.",
        syncKeywords: ["Resolution and contrast", "absolutely still"],
        posPct: { x: 80, y: 74 },
        color: "#FBBF24",
      },
    ],
    scenarios: [
      {
        id: "sc-planes-voxel",
        labelAr: "1. مزايا القطع بثلاث محاور والفوكسل المتساوي 1:1",
        badgeEn: "4 Advantages: 3D · All Planes · Hard Tissue · Isotropic",
        duration: 8,
        focus: { cx: 0.34, cy: 0.5, scale: 1.24 },
        highlightTargetId: "t1",
        defaultParam: 20,
        seeIq: "السن باليسار مقطوع بـ 3 مستويات متعامدة (Axial، Sagittal، Coronal) مع مكعب الفوكسل المتساوي 1:1.",
        whyIq: "الفوكسل المتساوي الأبعاد (Isotropic) يضمن قياساً هندسياً حقيقياً بدون مط، مع رؤية ثلاثية الأبعاد للعلاقة بين الآفة والتراكيب.",
        tipIq: "مزايا CBCT الأربع: رؤية 3D مكانية، شرائح بكل المستويات، إشعاع أقل وجودة للأنسجة الصلبة، وفوكسلات Isotropic لدقة هندسية.",
        tipEn: "CBCT 4 Pros: 3D accurate spatial anatomy, slices in all planes, reduced exposure & superior hard-tissue quality, and isotropic voxels ensuring geometrical accuracy.",
        drawCue: "isotropic",
      },
      {
        id: "sc-artifacts",
        labelAr: "2. محددات CBCT: الدقة وتشويش المعادن والحركة",
        badgeEn: "3 Limitations: Lower Res/Contrast · Artifacts · Stillness",
        duration: 8,
        focus: { cx: 0.78, cy: 0.5, scale: 1.26 },
        highlightTargetId: "t3",
        xraySuggested: true,
        defaultParam: 85,
        seeIq: "على اليمين مقاطع CBCT بها وتد وتاج معدني؛ الخطوط الشعاعية الساطعة والسوداء تشوه الحدود وتطمس مع الحركة.",
        whyIq: "وضوح وتباين CBCT أقل من الأشعة داخل الفم، والأجسام الكثيفة كالمعادن والمينا تصنع Artifacts، وحركة المريض تفقد الصورة حدتها.",
        tipIq: "محددات CBCT الثلاث: دقة وتباين أقل من الأشعة داخل الفم، تشويش مع المينا والمعادن، وضرورة ثبات المريض التام.",
        tipEn: "CBCT 3 Limitations: Resolution & contrast lower than intraoral radiography; higher artifacts with high-density enamel/metallic restorations; patient must stay absolutely still.",
        drawCue: "artifacts",
      },
    ],
    drawOverlay(ctx, _w, _h, _t, st, toPx, h2) {
      const artFrac = Math.max(0, Math.min(1, (st.paramVal - 15) / 60));
      if (artFrac > 0.02) {
        h2.drawExtraImage(ctx, "metal", artFrac);
      }

      if (st.paramVal > 75) {
        const blurFrac = (st.paramVal - 75) / 25;
        h2.drawRegionFilter(
          ctx,
          { x: 0.67, y: 0.04, w: 0.28, h: 0.92 },
          `blur(${(blurFrac * 3.8).toFixed(1)}px) contrast(${Math.round(100 - blurFrac * 18)}%)`,
          { alpha: 0.92, sourceKey: "metal", radiusPx: 10 }
        );
      }

      if (st.paramVal < 35) {
        h2.drawFocusAperture(ctx, { x: 0.33, y: 0.50 }, 0.26, 0.38);
      } else {
        h2.drawFocusAperture(ctx, { x: 0.80, y: 0.50 }, 0.22, 0.38);
      }

      h2.drawCanvasPill(
        ctx,
        toPx(0.8, 0.1).x,
        toPx(0.8, 0.1).y,
        st.paramVal < 30 ? "Isotropic 1:1 · Clean Slices ✓" : st.paramVal > 75 ? "Artifacts + Motion Blur ⚠️" : "High-Density Artifacts ⚠️",
        st.paramVal < 30 ? "#2DD4BF" : "#FB7185"
      );
    },
  },

  "p9-t2": {
    topicId: "p9-t2",
    simId: "p9-cbct-apps",
    imageUrl: "./src/assets/images/p9_t2_anat_cbct_upright_1795604875635.jpg",
    supportsXray: true,
    imageAlt: "Upright photorealistic bisected human mandibular posterior jaw showing curved mesial root with branching canals, apical periodontitis defect, pink gutta-percha obturation cone inside canal lumen stopping at apex, vertical root fracture hairline, and mid-root lateral resorption",
    hudTitleAr: "التطبيقات السريرية الستة للـ CBCT بعلاج الجذور",
    hudBadgeEn: "Morphology · Periapical · Resorption · Trauma/VRF · Surgery",
    interactiveParam: {
      labelAr: "مسبار التطبيقات الستة (App 1 → 6):",
      minLabel: "1. القنوات والآفات",
      maxLabel: "6. الجراحة والمتابعة",
      defaultVal: 40,
      formatReadout: (v) => {
        const idx = Math.max(1, Math.min(6, Math.round(1 + (v / 100) * 5)));
        const apps = [
          "1) Morphology & Extra Canal",
          "2) Periapical Pathosis & Lesion",
          "3) Root Resorption & Perforation",
          "4) Trauma & Vertical Root Fracture",
          "5) Surgical Endodontic Planning",
          "6) Post-Op Obturation & Healing",
        ];
        return { text: apps[idx - 1], tone: idx === 3 || idx === 4 ? "warn" : "ok" };
      },
    },
    dragGizmo: {
      kind: "line",
      p0: { x: 0.36, y: 0.54 },
      p1: { x: 0.66, y: 0.48 },
      handleLabel: "اسحب مسبار التطبيقات ⇄",
    },
    targets: [
      {
        id: "t1",
        labelAr: "تشريح الجذور والقنوات (App 1)",
        titleEn: "1) Tooth Morphology & Canal Configuration",
        descIq: "تقييم الشكل التشريحي الكامل للسن كعدد الجذور والانحناءات والشذوذات وعدد وتفرع القنوات الإضافية.",
        syncKeywords: ["morphology", "curvatures", "canal numbers"],
        posPct: { x: 36, y: 54 },
        color: "#38BDF8",
      },
      {
        id: "t2",
        labelAr: "الآفة الذروية والتهاب ما حول الذروة (App 2)",
        titleEn: "2) Periapical Pathosis & Apical Periodontitis",
        descIq: "تشخيص الآفات الذروية السنية والتهاب دواعم الذروة وعلاقتها بالعظم والقنوات المجاورة بلا تراكب.",
        syncKeywords: ["periapical pathosis", "apical periodontitis"],
        posPct: { x: 31.5, y: 72 },
        color: "#2DD4BF",
      },
      {
        id: "t3",
        labelAr: "التخطيط الجراحي ومتابعة الحشو (Apps 5–6)",
        titleEn: "5–6) Surgical Planning & Post-Op Healing",
        descIq: "التخطيط لجراحة علاج الجذور قبل العملية، والتقييم البعدي لمراقبة جودة الحشو والتئام الآفة بدقة تفوق التقليدي.",
        syncKeywords: ["surgical endodontic", "postoperative assessment", "obturation"],
        posPct: { x: 57.5, y: 52 },
        color: "#FBBF24",
      },
      {
        id: "t4",
        labelAr: "الكسور العمودية والامتصاص والانثقاب (Apps 3–4)",
        titleEn: "3–4) Resorption, Perforation & Root Fracture",
        descIq: "تشخيص أنواع امتصاص وثقوب الجذور وتقييم رضوض الأسنان والكسور العمودية بدقة ثلاثية الأبعاد.",
        syncKeywords: ["root resorption", "perforations", "root fracture"],
        posPct: { x: 67.5, y: 49 },
        color: "#FB7185",
      },
    ],
    scenarios: [
      {
        id: "sc-morph-pa",
        labelAr: "1. تشريح القنوات الإضافية والآفات الذروية (1–2)",
        badgeEn: "Apps 1–2: Morphology & Periapical Pathosis",
        duration: 8,
        focus: { cx: 0.38, cy: 0.52, scale: 1.24 },
        highlightTargetId: "t2",
        defaultParam: 15,
        seeIq: "الرحى السفلية اليسرى تُظهر الجذر المنحني مع تفرع قناتين دقيقتين، وآفة ذروية داكنة عند الذروة فوق القناة السنية.",
        whyIq: "الأشعة التقليدية تخفي التفرعات الإضافية وتشوّه موقع الآفة؛ بينما يكشف CBCT القنوات والآفات بلا تراكب.",
        tipIq: "التطبيقان 1 و 2: تقييم التشريح الكامل (عدد الجذور، الانحناءات، الشذوذات، عدد القنوات) وكشف الآفات الذروية والتهاب ما حول الذروة.",
        tipEn: "CBCT Apps 1–2: Evaluation of total tooth morphology (root numbers, curvatures, anomalies, canal configurations) & identification of periapical pathosis / apical periodontitis.",
        drawCue: "apps-left",
      },
      {
        id: "sc-resorp-frac",
        labelAr: "2. الامتصاص والكسور وتخطيط الجراحة والمتابعة (3–6)",
        badgeEn: "Apps 3–6: Resorption, Fracture, Surgery & Post-Op",
        duration: 8,
        focus: { cx: 0.62, cy: 0.50, scale: 1.24 },
        highlightTargetId: "t4",
        xraySuggested: true,
        defaultParam: 70,
        seeIq: "الرحى اليمنى تُظهر قمع الكوتا بيركا الوردي مستقراً داخل القناة حتى الذروة، وكسر جذري عمودي وامتصاص جانبي على الجذر المجاور.",
        whyIq: "تشخيص الكسر العمودي والامتصاص والانثقاب والتخطيط الجراحي ومراقبة التئام الآفة بعد الحشو يكون أدق بالـ CBCT مقارنة بالتقليدي.",
        tipIq: "التطبيقات 3–6: الامتصاص والثقوب، الرضوض وكسور الجذر، تخطيط جراحة العصب، والتقييم البعدي للحشو والتئام الآفة.",
        tipEn: "CBCT Apps 3–6: Diagnosis of root resorption & perforations, dentoalveolar trauma & root fracture, surgical endodontic planning, and postoperative obturation/healing evaluation.",
        drawCue: "apps-right",
      },
    ],
    drawOverlay(ctx, _w, _h, t, st, toPx, h2) {
      const appIdx = Math.max(1, Math.min(6, Math.round(1 + (st.paramVal / 100) * 5)));
      if (appIdx === 1) {
        h2.drawFocusAperture(ctx, { x: 0.36, y: 0.54 }, 0.20, 0.40);
        h2.drawFlowTrack(ctx, [toPx(0.40, 0.32), toPx(0.365, 0.50), toPx(0.325, 0.68)], t, "#38BDF8", { width: 1.9, pulseCount: 1, showTip: true });
        h2.drawCanvasPill(ctx, toPx(0.36, 0.86).x, toPx(0.36, 0.86).y, "1) Morphology & Extra Canal", "#38BDF8");
      } else if (appIdx === 2) {
        h2.drawFocusAperture(ctx, { x: 0.315, y: 0.72 }, 0.16, 0.42);
        h2.drawCanvasPill(ctx, toPx(0.315, 0.88).x, toPx(0.315, 0.88).y, "2) Periapical Pathosis & Lesion", "#2DD4BF");
      } else if (appIdx === 3) {
        h2.drawFocusAperture(ctx, { x: 0.68, y: 0.49 }, 0.17, 0.42);
        h2.drawCanvasPill(ctx, toPx(0.68, 0.76).x, toPx(0.68, 0.76).y, "3) Root Resorption & Perforation", "#FB7185");
      } else if (appIdx === 4) {
        h2.drawFocusAperture(ctx, { x: 0.655, y: 0.44 }, 0.19, 0.42);
        h2.drawFixedGuide(ctx, toPx(0.648, 0.16), toPx(0.662, 0.72), "4) Vertical Root Fracture", "#FBBF24", false);
      } else if (appIdx === 5) {
        h2.drawFocusAperture(ctx, { x: 0.575, y: 0.73 }, 0.18, 0.40);
        h2.drawCanvasPill(ctx, toPx(0.575, 0.88).x, toPx(0.575, 0.88).y, "5) Surgical Endodontic Planning", "#F472B6");
      } else {
        h2.drawFocusAperture(ctx, { x: 0.575, y: 0.50 }, 0.22, 0.36);
        h2.drawCanvasPill(ctx, toPx(0.575, 0.14).x, toPx(0.575, 0.14).y, "6) Post-Op Obturation & Healing ✓", "#2DD4BF");
      }
    },
  },
};
