import {
  DragGizmoSpec,
  DrawHelpers,
  NormRect,
  Pt,
  TargetPoint,
  ToPxFn,
  TOPIC_STUDIOS,
} from "./studioSpecs";

export { TOPIC_STUDIOS };

// ============================================================================
// Layer 3: Deterministic 60fps Clinical Canvas Motion & Pixel-Physics Helpers
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

export const DRAW_HELPERS: DrawHelpers = {
  drawFlowTrack(ctx, pts, t, color = "#38BDF8", opts = {}) {
    if (pts.length < 2) return;
    const width = opts.width ?? 2.6;
    const speed = opts.speed ?? 1;
    const pulseCount = opts.pulseCount ?? 2;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "rgba(4, 12, 24, 0.55)";
    ctx.lineWidth = width + 2.4;
    if (opts.dashed) ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    const start = pts[0];
    const end = pts[pts.length - 1];
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "#F8FAFC");
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.setLineDash([]);

    for (let k = 0; k < pulseCount; k++) {
      let phase = (t * speed + k / pulseCount) % 1;
      if (opts.reciprocate) {
        const cyc = (t * speed * 0.8 + k * 0.5) % 1;
        phase = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
      }
      const { pt, angle } = samplePolyline(pts, phase);

      const halo = ctx.createRadialGradient(
        pt.x,
        pt.y,
        0.5,
        pt.x,
        pt.y,
        width * 4.2
      );
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
  },

  drawSprayStream(
    ctx,
    origin,
    dirRad,
    spreadRad,
    lengthPx,
    t,
    color = "#67E8F9"
  ) {
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
  },

  drawShockRings(ctx, cx, cy, t, maxR = 28, color = "#2DD4BF") {
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
  },

  drawOrbitPath(ctx, cx, cy, rx, ry, t, opts = {}) {
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
  },

  drawFixedGuide(ctx, p1, p2, label, color = "#FBBF24", dashed = true) {
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
      DRAW_HELPERS.drawCanvasPill(
        ctx,
        (p1.x + p2.x) * 0.5,
        (p1.y + p2.y) * 0.5,
        label,
        color
      );
    }
    ctx.restore();
  },

  drawFixedAngleArc(ctx, vertex, a1, a2, radius, label, color = "#2DD4BF") {
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
      DRAW_HELPERS.drawCanvasPill(ctx, lx, ly, label, color);
    }
    ctx.restore();
  },

  drawCanvasPill(ctx, cx, cy, text, borderColor = "#38BDF8") {
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
  },

  // Bound per-frame inside mountMediaStudio; safe fallbacks for headless verification
  drawExtraImage() {},
  drawRegionWarp() {},
  drawRegionFilter() {},
  drawFocusAperture() {},
};

// ============================================================================
// Visual-to-Text Bidirectional Highlight Sync
// ============================================================================

function highlightTopicTextByKeywords(topicId: string, keywords: string[]): void {
  const article = document.getElementById("topic-" + topicId);
  if (!article) return;

  article.querySelectorAll("mark.ms-sync-flash").forEach((el) => {
    el.classList.remove("ms-sync-flash");
  });

  const blocks = Array.from(article.querySelectorAll(".en-block, .iq-block"));
  let firstMatched: HTMLElement | null = null;

  const lowerKeys = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  if (!lowerKeys.length) return;

  for (const mk of Array.from(article.querySelectorAll("mark"))) {
    const txt = (mk.textContent || "").toLowerCase();
    if (lowerKeys.some((k) => txt.includes(k))) {
      mk.classList.add("ms-sync-flash");
      const pair = mk.getAttribute("data-pair");
      if (pair) {
        article
          .querySelectorAll(`mark[data-pair="${pair}"]`)
          .forEach((p) => p.classList.add("ms-sync-flash"));
      }
      if (!firstMatched) firstMatched = mk as HTMLElement;
    }
  }

  if (!firstMatched) {
    for (const blk of blocks) {
      const txt = (blk.textContent || "").toLowerCase();
      if (lowerKeys.some((k) => txt.includes(k))) {
        firstMatched = blk as HTMLElement;
        break;
      }
    }
  }

  if (firstMatched) {
    firstMatched.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ============================================================================
// Layer 2 & 4: mountMediaStudio Interactive Controller + Radiology Lab Tools
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

type ViewFilterMode = "normal" | "xray";

export function mountMediaStudio(
  stageEl: HTMLElement,
  topic: { id: string; simId?: string; titleAr?: string }
): void {
  const spec =
    TOPIC_STUDIOS[topic.id] ||
    Object.values(TOPIC_STUDIOS).find((s) => s.simId === topic.simId);

  if (!spec) {
    stageEl.innerHTML = `<div class="p-6 text-center text-sm">لا تتوفر بيانات استوديو لهذا الموضوع</div>`;
    return;
  }

  let scenarioIdx = 0;
  let activeTargetId = spec.scenarios[0].highlightTargetId || spec.targets[0].id;
  let calloutOpen = false;
  let isPlaying = true;
  let speed = 1;
  let userZoom = 1;
  let labelsVisible = true;
  let filterMode: ViewFilterMode = "normal";
  let splitActive = false;
  let splitRatio = 0.5;
  let loupeActive = false;
  let pointerPos: Pt | null = null;
  let caliperActive = false;
  let caliperPts: Array<{ nx: number; ny: number }> = [];

  let paramVal = spec.interactiveParam.defaultVal;
  let elapsed = 0;
  let lastFrameMs = performance.now();
  let rafId = 0;

  // Preload aligned clinical state images (for photorealistic real-image morphing)
  const extraImgMap: Record<string, HTMLImageElement> = {};
  if (spec.extraImages) {
    Object.entries(spec.extraImages).forEach(([key, url]) => {
      const im = new Image();
      im.referrerPolicy = "no-referrer";
      im.src = url;
      extraImgMap[key] = im;
    });
  }

  const targetFocus = () => spec.scenarios[scenarioIdx].focus;
  const curCam = {
    cx: targetFocus().cx,
    cy: targetFocus().cy,
    scale: targetFocus().scale * userZoom,
  };

  const xrayButtonsHtml = spec.supportsXray
    ? `
        <button type="button" class="sim-btn active" data-ms-mode="normal">طبيعي</button>
        <button type="button" class="sim-btn xray-btn" data-ms-mode="xray">أشعة X-Ray</button>
        <button type="button" class="sim-btn" data-ms-split>تشريح ↔ أشعة</button>
      `
    : "";

  stageEl.innerHTML = `
    <div class="ms-stage-viewport" data-ms-viewport style="cursor:grab; touch-action:none;">
      <div class="ms-camera-layer" data-ms-camera>
        <img
          src="${spec.imageUrl}"
          alt="${spec.imageAlt.replace(/"/g, "&quot;")}"
          class="ms-stage-img"
          referrerpolicy="no-referrer"
          draggable="false"
        />
        ${
          spec.supportsXray
            ? `<img
                src="${spec.imageUrl}"
                alt=""
                aria-hidden="true"
                class="ms-stage-img ms-split-xray-img"
                data-ms-split-img
                referrerpolicy="no-referrer"
                draggable="false"
              />`
            : ""
        }
      </div>
      ${spec.supportsXray ? `<div class="ms-xray-vignette" aria-hidden="true"></div>` : ""}
      ${
        spec.supportsXray
          ? `<div class="ms-split-line hidden" data-ms-split-line>
              <div class="ms-split-handle" title="اسحب للمقارنة بين التشريح والأشعة">↔</div>
              <span class="ms-split-tag-l">تشريح</span>
              <span class="ms-split-tag-r">أشعة X-Ray</span>
            </div>`
          : ""
      }
      <canvas class="ms-overlay-canvas" data-ms-canvas></canvas>
      <svg class="sim-3d-leaders" data-ms-leaders xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="sim-3d-pins" data-ms-pins></div>
      <div class="ms-hud-top-right" data-ms-hud-ar>${spec.hudTitleAr}</div>
      <div class="ms-hud-top-left" data-ms-hud-en>${spec.hudBadgeEn}</div>
    </div>

    <div class="ms-lab-bar">
      <div class="ms-lab-tools">
        <span class="ms-lab-title">أدوات الفحص:</span>
        ${xrayButtonsHtml}
        <button type="button" class="sim-btn" data-ms-loupe>عدسة 2.5x</button>
        <button type="button" class="sim-btn" data-ms-caliper>مسطرة قياس</button>
      </div>

      <div class="ms-physics-row">
        <div class="ms-physics-head">
          <span class="ms-physics-lbl">${spec.interactiveParam.labelAr}</span>
          <span class="ms-physics-badge ok" data-ms-param-badge></span>
        </div>
        <div class="ms-physics-slider-wrap">
          <span class="ms-physics-bound">${spec.interactiveParam.minLabel}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value="${paramVal}"
            class="ms-scrubber ms-physics-range"
            aria-label="${spec.interactiveParam.labelAr}"
            data-ms-param
          />
          <span class="ms-physics-bound">${spec.interactiveParam.maxLabel}</span>
        </div>
      </div>
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
          <button type="button" class="sim-btn" data-ms-fwd title="تقديم ثانية">+1s</button>
          <button type="button" class="sim-btn" data-ms-speed="0.5">0.5x بطيء</button>
          <button type="button" class="sim-btn active" data-ms-speed="1">1x</button>
          <button type="button" class="sim-btn" data-ms-speed="1.5">1.5x</button>
          <button type="button" class="sim-btn" data-ms-zoom="in">تقريب +</button>
          <button type="button" class="sim-btn" data-ms-zoom="out">إبعاد -</button>
          <button type="button" class="sim-btn" data-ms-labels>إخفاء التسميات</button>
        </div>
      </div>
    </div>

    <div class="sim-iq-guide" data-ms-guide></div>

    <div class="sim-inspector">
      <div class="ms-insp-card">
        <div class="ms-insp-top">
          <div class="ms-insp-titles">
            <span class="ms-insp-en-badge ltr" data-ms-insp-en></span>
            <div class="ms-insp-ar-title" data-ms-insp-ar></div>
          </div>
          <button type="button" class="sim-btn" data-ms-sync-text>اربطه بالنص العلمي ↑</button>
        </div>
        <div class="ms-insp-desc" data-ms-insp-desc></div>
      </div>
      <div class="sim-part-chips" data-ms-chips></div>
    </div>
  `;

  const viewportEl = stageEl.querySelector("[data-ms-viewport]") as HTMLElement;
  const cameraEl = stageEl.querySelector("[data-ms-camera]") as HTMLElement;
  const imgEl = stageEl.querySelector(".ms-stage-img") as HTMLImageElement;
  const splitImgEl = stageEl.querySelector("[data-ms-split-img]") as HTMLImageElement | null;
  const splitLineEl = stageEl.querySelector("[data-ms-split-line]") as HTMLElement | null;
  const canvasEl = stageEl.querySelector("[data-ms-canvas]") as HTMLCanvasElement;
  const leadersSvg = stageEl.querySelector("[data-ms-leaders]") as SVGSVGElement;
  const pinsWrap = stageEl.querySelector("[data-ms-pins]") as HTMLElement;
  const hudEnEl = stageEl.querySelector("[data-ms-hud-en]") as HTMLElement;
  const timeEl = stageEl.querySelector("[data-ms-time]") as HTMLElement;
  const scrubberEl = stageEl.querySelector("[data-ms-scrubber]") as HTMLInputElement;
  const paramSliderEl = stageEl.querySelector("[data-ms-param]") as HTMLInputElement;
  const paramBadgeEl = stageEl.querySelector("[data-ms-param-badge]") as HTMLElement;
  const guideEl = stageEl.querySelector("[data-ms-guide]") as HTMLElement;
  const inspEnEl = stageEl.querySelector("[data-ms-insp-en]") as HTMLElement;
  const inspArEl = stageEl.querySelector("[data-ms-insp-ar]") as HTMLElement;
  const inspDescEl = stageEl.querySelector("[data-ms-insp-desc]") as HTMLElement;
  const chipsWrap = stageEl.querySelector("[data-ms-chips]") as HTMLElement;
  const playBtn = stageEl.querySelector("[data-ms-play]") as HTMLButtonElement;
  const labelsBtn = stageEl.querySelector("[data-ms-labels]") as HTMLButtonElement;
  const splitBtn = stageEl.querySelector("[data-ms-split]") as HTMLButtonElement | null;
  const loupeBtn = stageEl.querySelector("[data-ms-loupe]") as HTMLButtonElement;
  const caliperBtn = stageEl.querySelector("[data-ms-caliper]") as HTMLButtonElement;
  const syncTextBtn = stageEl.querySelector("[data-ms-sync-text]") as HTMLButtonElement;

  imgEl.addEventListener("error", () => {
    viewportEl.style.background = "linear-gradient(135deg, #0B1F3A 0%, #16335B 100%)";
  });

  // Compact Numbered Anatomical Pins + Single Floating Active Callout + Chips
  const pinEls: Map<string, HTMLButtonElement> = new Map();
  const chipEls: Map<string, HTMLButtonElement> = new Map();

  spec.targets.forEach((tg, i) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "sim-3d-pin";
    pin.setAttribute("data-target-id", tg.id);
    pin.setAttribute("title", `${tg.titleEn} — ${tg.labelAr}`);
    pin.textContent = String(i + 1);
    pin.addEventListener("click", () => selectTarget(tg.id, true));
    pinsWrap.appendChild(pin);
    pinEls.set(tg.id, pin);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sim-part-chip";
    chip.textContent = `${i + 1}. ${tg.labelAr}`;
    chip.addEventListener("click", () => selectTarget(tg.id, true));
    chipsWrap.appendChild(chip);
    chipEls.set(tg.id, chip);
  });

  const activeCalloutEl = document.createElement("button");
  activeCalloutEl.type = "button";
  activeCalloutEl.className = "ms-active-callout hidden";
  activeCalloutEl.innerHTML = `<span class="ms-active-callout-ar"></span><span class="ms-active-callout-en"></span>`;
  activeCalloutEl.addEventListener("click", () => {
    const tg = spec.targets.find((t) => t.id === activeTargetId) || spec.targets[0];
    highlightTopicTextByKeywords(spec.topicId, tg.syncKeywords);
  });
  pinsWrap.appendChild(activeCalloutEl);
  const activeCalloutArEl = activeCalloutEl.querySelector(".ms-active-callout-ar") as HTMLElement;
  const activeCalloutEnEl = activeCalloutEl.querySelector(".ms-active-callout-en") as HTMLElement;

  function selectTarget(tid: string, fromUserClick = false): void {
    if (fromUserClick && calloutOpen && activeTargetId === tid) {
      calloutOpen = false;
      activeCalloutEl.classList.add("hidden");
      leadersSvg.innerHTML = "";
      pinEls.forEach((el) => el.classList.remove("active"));
      return;
    }

    calloutOpen = fromUserClick;
    activeTargetId = tid;
    const idx = Math.max(
      0,
      spec.targets.findIndex((t) => t.id === tid)
    );
    const tg = spec.targets[idx] || spec.targets[0];
    inspEnEl.textContent = tg.titleEn;
    inspArEl.textContent = `${idx + 1}. ${tg.labelAr}`;
    inspDescEl.textContent = tg.descIq;
    activeCalloutArEl.textContent = `${idx + 1}. ${tg.labelAr}`;
    activeCalloutEnEl.textContent = tg.titleEn;
    activeCalloutEl.classList.toggle("hidden", !calloutOpen);
    if (!calloutOpen) {
      leadersSvg.innerHTML = "";
    }
    pinEls.forEach((el, id) => el.classList.toggle("active", calloutOpen && id === tg.id));
    chipEls.forEach((el, id) => el.classList.toggle("selected", id === tg.id));
  }

  function updateParamReadout(): void {
    const res = spec.interactiveParam.formatReadout(paramVal);
    paramBadgeEl.textContent = res.text;
    paramBadgeEl.className = `ms-physics-badge ${res.tone}`;
  }

  function setSplitActive(active: boolean): void {
    splitActive = spec.supportsXray ? active : false;
    splitBtn?.classList.toggle("active", splitActive);
    viewportEl.classList.toggle("split-active", splitActive);
    splitLineEl?.classList.toggle("hidden", !splitActive);
  }

  function setFilterMode(mode: ViewFilterMode): void {
    setSplitActive(false);
    const effectiveMode: ViewFilterMode = spec.supportsXray ? mode : "normal";
    filterMode = effectiveMode;
    viewportEl.classList.toggle("xray-active", effectiveMode === "xray");
    stageEl.querySelectorAll("[data-ms-mode]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-ms-mode") === effectiveMode);
    });
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
        <div class="sim-iq-card exam-card">
          <div class="sim-iq-card-lbl gold">زبدة الامتحان (عربي + English)</div>
          <div class="sim-iq-card-txt">${sc.tipIq}</div>
          ${sc.tipEn ? `<div class="ms-exam-en-layer ltr">${sc.tipEn}</div>` : ""}
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

    if (sc.defaultParam !== undefined) {
      paramVal = sc.defaultParam;
      paramSliderEl.value = String(paramVal);
      updateParamReadout();
    }

    stageEl.querySelectorAll("[data-ms-scenario]").forEach((btn, i) => {
      btn.classList.toggle("active", i === scenarioIdx);
    });

    if (spec.supportsXray && sc.xraySuggested) setFilterMode("xray");
    else setFilterMode("normal");

    if (sc.highlightTargetId) selectTarget(sc.highlightTargetId);
    renderWalkthroughCards();
  }

  // Bind scenario & playback controls
  stageEl.querySelectorAll("[data-ms-scenario]").forEach((btn) => {
    btn.addEventListener("click", () =>
      switchScenario(Number(btn.getAttribute("data-ms-scenario") || 0))
    );
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
      if (dir === "in") userZoom = Math.min(2.1, +(userZoom + 0.25).toFixed(2));
      else userZoom = Math.max(1.0, +(userZoom - 0.25).toFixed(2));
    });
  });

  labelsBtn.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    viewportEl.classList.toggle("ms-labels-hidden", !labelsVisible);
    labelsBtn.textContent = labelsVisible ? "إخفاء التسميات" : "إظهار التسميات";
    labelsBtn.classList.toggle("active", !labelsVisible);
  });

  // Conditional X-Ray Mode & Split-Curtain Lab Tools
  if (spec.supportsXray) {
    stageEl.querySelectorAll("[data-ms-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setFilterMode((btn.getAttribute("data-ms-mode") as ViewFilterMode) || "normal");
      });
    });

    splitBtn?.addEventListener("click", () => {
      if (splitActive) {
        setFilterMode("normal");
      } else {
        filterMode = "normal";
        viewportEl.classList.remove("xray-active");
        stageEl.querySelectorAll("[data-ms-mode]").forEach((b) => {
          b.classList.remove("active");
        });
        setSplitActive(true);
      }
    });
  }

  loupeBtn.addEventListener("click", () => {
    loupeActive = !loupeActive;
    loupeBtn.classList.toggle("active", loupeActive);
    if (loupeActive) {
      caliperActive = false;
      caliperBtn.classList.remove("active");
      viewportEl.style.cursor = "none";
    } else {
      viewportEl.style.cursor = "grab";
    }
  });

  caliperBtn.addEventListener("click", () => {
    caliperActive = !caliperActive;
    caliperBtn.classList.toggle("active", caliperActive);
    caliperPts = [];
    if (caliperActive) {
      loupeActive = false;
      loupeBtn.classList.remove("active");
      viewportEl.style.cursor = "crosshair";
    } else {
      viewportEl.style.cursor = "grab";
    }
  });

  paramSliderEl.addEventListener("input", () => {
    paramVal = Number(paramSliderEl.value) || 0;
    updateParamReadout();
  });

  scrubberEl.addEventListener("input", () => {
    elapsed = Number(scrubberEl.value) || 0;
    isPlaying = false;
    playBtn.textContent = "تشغيل الحركة";
    playBtn.classList.remove("active");
  });

  syncTextBtn.addEventListener("click", () => {
    const tg = spec.targets.find((t) => t.id === activeTargetId) || spec.targets[0];
    highlightTopicTextByKeywords(spec.topicId, tg.syncKeywords);
  });

  // Camera & Coordinate Projection Math
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
    fromPx: (px: number, py: number) => { nx: number; ny: number };
  } {
    const vw = viewportEl.clientWidth || 800;
    const vh = viewportEl.clientHeight || 450;
    const imgRatio = 16 / 9;
    const boxRatio = vw / vh;

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
    const fx = baseX + curCam.cx * baseW;
    const fy = baseY + curCam.cy * baseH;
    let tx = vw * 0.5 - fx * effScale;
    let ty = vh * 0.5 - fy * effScale;

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

    const fromPx = (px: number, py: number) => ({
      nx: ((px - tx) / effScale - baseX) / baseW,
      ny: ((py - ty) / effScale - baseY) / baseH,
    });

    return { vw, vh, baseW, baseH, baseX, baseY, tx, ty, effScale, toPx, fromPx };
  }

  // Direct On-Canvas Tactile Gizmo Mapping
  function getGizmoHandleNorm(gizmo: DragGizmoSpec, val: number): { nx: number; ny: number } {
    const u = Math.max(0, Math.min(1, val / 100));
    if (gizmo.kind === "line") {
      return {
        nx: lerp(gizmo.p0.x, gizmo.p1.x, u),
        ny: lerp(gizmo.p0.y, gizmo.p1.y, u),
      };
    }
    if (gizmo.kind === "arc") {
      const ang = gizmo.startAngle + u * gizmo.spanAngle;
      return {
        nx: gizmo.center.x + Math.cos(ang) * gizmo.rx,
        ny: gizmo.center.y + Math.sin(ang) * gizmo.ry,
      };
    }
    const r = lerp(gizmo.minR, gizmo.maxR, u);
    const ang = gizmo.angleRad ?? -0.35;
    return {
      nx: gizmo.center.x + Math.cos(ang) * r,
      ny: gizmo.center.y + Math.sin(ang) * r * (16 / 9),
    };
  }

  function projectPointerToGizmo(gizmo: DragGizmoSpec, nx: number, ny: number): number {
    if (gizmo.kind === "line") {
      const dx = gizmo.p1.x - gizmo.p0.x;
      const dy = gizmo.p1.y - gizmo.p0.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-6) return 50;
      const u = ((nx - gizmo.p0.x) * dx + (ny - gizmo.p0.y) * dy) / lenSq;
      return Math.max(0, Math.min(100, Math.round(u * 100)));
    }
    if (gizmo.kind === "arc") {
      const dx = (nx - gizmo.center.x) / (gizmo.rx || 0.1);
      const dy = (ny - gizmo.center.y) / (gizmo.ry || 0.1);
      let ang = Math.atan2(dy, dx);
      const mid = gizmo.startAngle + gizmo.spanAngle * 0.5;
      while (ang - mid > Math.PI) ang -= Math.PI * 2;
      while (ang - mid < -Math.PI) ang += Math.PI * 2;
      const u = (ang - gizmo.startAngle) / (gizmo.spanAngle || 1);
      return Math.max(0, Math.min(100, Math.round(u * 100)));
    }
    const dx = nx - gizmo.center.x;
    const dy = (ny - gizmo.center.y) / (16 / 9);
    const r = Math.hypot(dx, dy);
    const u = (r - gizmo.minR) / (gizmo.maxR - gizmo.minR || 0.1);
    return Math.max(0, Math.min(100, Math.round(u * 100)));
  }

  type DragMode = "none" | "split" | "gizmo";
  let dragMode: DragMode = "none";
  let isHoveringGizmo = false;

  const getRelPt = (ev: PointerEvent): Pt => {
    const rect = viewportEl.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const applyGizmoValue = (val: number) => {
    paramVal = val;
    paramSliderEl.value = String(val);
    updateParamReadout();
  };

  viewportEl.addEventListener("pointerdown", (ev) => {
    if ((ev.target as HTMLElement).closest(".sim-3d-pin")) return;
    const p = getRelPt(ev);
    const m = computeCameraMetrics();

    if (spec.supportsXray && splitActive && Math.abs(p.x - splitRatio * m.vw) < 38) {
      dragMode = "split";
      viewportEl.setPointerCapture(ev.pointerId);
      viewportEl.style.cursor = "ew-resize";
      return;
    }

    if (caliperActive) {
      const norm = m.fromPx(p.x, p.y);
      if (caliperPts.length >= 2) caliperPts = [norm];
      else caliperPts.push(norm);
      return;
    }

    if (loupeActive) return;

    const gNorm = getGizmoHandleNorm(spec.dragGizmo, paramVal);
    const gPx = m.toPx(gNorm.nx, gNorm.ny);
    const distToGizmo = Math.hypot(p.x - gPx.x, p.y - gPx.y);

    if (distToGizmo <= 72) {
      dragMode = "gizmo";
      const norm = m.fromPx(p.x, p.y);
      applyGizmoValue(projectPointerToGizmo(spec.dragGizmo, norm.nx, norm.ny));
      viewportEl.setPointerCapture(ev.pointerId);
      viewportEl.style.cursor = "grabbing";
    }
  });

  viewportEl.addEventListener("pointermove", (ev) => {
    const p = getRelPt(ev);
    pointerPos = p;
    const m = computeCameraMetrics();

    if (dragMode === "split") {
      splitRatio = Math.max(0.08, Math.min(0.92, p.x / m.vw));
      return;
    }
    if (dragMode === "gizmo") {
      const norm = m.fromPx(p.x, p.y);
      applyGizmoValue(projectPointerToGizmo(spec.dragGizmo, norm.nx, norm.ny));
      return;
    }

    const gNorm = getGizmoHandleNorm(spec.dragGizmo, paramVal);
    const gPx = m.toPx(gNorm.nx, gNorm.ny);
    isHoveringGizmo = Math.hypot(p.x - gPx.x, p.y - gPx.y) <= 68;
    if (!loupeActive && !caliperActive) {
      viewportEl.style.cursor = isHoveringGizmo ? "grab" : "default";
    }
  });

  const endPointerDrag = (ev: PointerEvent) => {
    if (dragMode !== "none") {
      dragMode = "none";
      try {
        viewportEl.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      if (!loupeActive && !caliperActive) {
        viewportEl.style.cursor = isHoveringGizmo ? "grab" : "default";
      }
    }
  };

  viewportEl.addEventListener("pointerup", endPointerDrag);
  viewportEl.addEventListener("pointercancel", endPointerDrag);

  viewportEl.addEventListener("pointerleave", () => {
    pointerPos = null;
    isHoveringGizmo = false;
    if (dragMode === "none" && !loupeActive && !caliperActive) {
      viewportEl.style.cursor = "default";
    }
  });

  // Compact Numbered Anatomical Dots + ONLY ONE Active Floating Callout & Single Curved Arrow
  function layoutPerimeterCallouts(vw: number, vh: number, toPx: ToPxFn): void {
    const padX = vw < 640 ? 8 : 12;
    const topSafe = vw < 640 ? 36 : 42;
    const botSafe = 12;
    const dotSize = vw < 640 ? 22 : 26;
    const halfDot = dotSize * 0.5;

    interface DotPt {
      tg: TargetPoint;
      pin: HTMLButtonElement;
      tx: number;
      ty: number;
      dx: number;
      dy: number;
    }

    const pts: DotPt[] = spec.targets.map((tg) => {
      const p = toPx(tg.posPct.x / 100, tg.posPct.y / 100);
      const tx = Math.max(18, Math.min(vw - 18, p.x));
      const ty = Math.max(topSafe + 4, Math.min(vh - 18, p.y));
      return { tg, pin: pinEls.get(tg.id)!, tx, ty, dx: tx, dy: ty };
    });

    // Gentle de-overlap nudge if any two numbered dots are closer than 28px
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dist = Math.hypot(pts[j].dx - pts[i].dx, pts[j].dy - pts[i].dy);
        if (dist < dotSize + 4) {
          pts[j].dy = Math.min(vh - 20, pts[i].dy + dotSize + 5);
        }
      }
    }

    pts.forEach((pt) => {
      pt.pin.style.transform = `translate3d(${Math.round(pt.dx - halfDot)}px, ${Math.round(pt.dy - halfDot)}px, 0)`;
    });

    if (!calloutOpen) {
      activeCalloutEl.classList.add("hidden");
      leadersSvg.innerHTML = "";
      return;
    }

    const active = pts.find((p) => p.tg.id === activeTargetId) || pts[0];
    if (!active) return;
    activeCalloutEl.classList.remove("hidden");

    const cw = activeCalloutEl.offsetWidth || 180;
    const ch = activeCalloutEl.offsetHeight || 40;
    const isLeftHalf = active.tx < vw * 0.5;
    const isTopHalf = active.ty < vh * 0.5;

    // Place the single active callout cleanly in a quiet perimeter corner opposite the target dot
    let cx = isLeftHalf ? padX : vw - cw - padX;
    let cy = isTopHalf ? vh - ch - botSafe : topSafe;

    // If active target is close to that vertical zone, shift toward the opposite horizontal edge or vertical band
    if (Math.hypot(active.tx - (cx + cw * 0.5), active.ty - (cy + ch * 0.5)) < 90) {
      cy = isTopHalf ? topSafe : vh - ch - botSafe;
    }
    cx = Math.max(padX, Math.min(vw - cw - padX, cx));
    cy = Math.max(topSafe, Math.min(vh - ch - botSafe, cy));
    activeCalloutEl.style.transform = `translate3d(${Math.round(cx)}px, ${Math.round(cy)}px, 0)`;

    const sx = isLeftHalf ? cx + cw : cx;
    const sy = cy + ch * 0.5;
    const dx = active.tx - sx;
    const dy = active.ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const stopOffset = halfDot + 5;
    const ex = dist > stopOffset ? active.tx - (dx / dist) * stopOffset : active.tx;
    const ey = dist > stopOffset ? active.ty - (dy / dist) * stopOffset : active.ty;

    const curveSpan = Math.max(24, Math.abs(ex - sx) * 0.42);
    const dirSign = isLeftHalf ? 1 : -1;
    const c1x = sx + dirSign * curveSpan;
    const c2x = ex - dirSign * curveSpan * 0.55;
    const dStr = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${sy.toFixed(1)}, ${c2x.toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    const strokeCol = "#FDE68A";

    leadersSvg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    leadersSvg.innerHTML = `
      <defs>
        <marker id="ms-arrow-${spec.topicId}-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 1 1.5 L 9 5 L 1 8.5 L 3 5 Z" fill="${strokeCol}" />
        </marker>
      </defs>
      <path d="${dStr}" fill="none" stroke="rgba(4,12,24,0.72)" stroke-width="4" stroke-linecap="round" />
      <path d="${dStr}" fill="none" stroke="${strokeCol}" stroke-width="2.1" stroke-linecap="round" marker-end="url(#ms-arrow-${spec.topicId}-active)" />
      <circle cx="${active.tx.toFixed(1)}" cy="${active.ty.toFixed(1)}" r="${halfDot + 4}" fill="none" stroke="rgba(253,230,138,0.65)" stroke-width="1.6" stroke-dasharray="3 3" />
    `;
  }

  function formatSec(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function drawDiagnosticOverlays(
    ctx: CanvasRenderingContext2D,
    m: ReturnType<typeof computeCameraMetrics>
  ): void {
    // 1. Working Length Caliper Ruler (Click 2 points)
    if (caliperActive) {
      if (caliperPts.length === 1) {
        const p1 = m.toPx(caliperPts[0].nx, caliperPts[0].ny);
        ctx.save();
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (pointerPos) {
          DRAW_HELPERS.drawFixedGuide(ctx, p1, pointerPos, "اختر النقطة الثانية", "#FBBF24", true);
        }
        ctx.restore();
      } else if (caliperPts.length === 2) {
        const p1 = m.toPx(caliperPts[0].nx, caliperPts[0].ny);
        const p2 = m.toPx(caliperPts[1].nx, caliperPts[1].ny);
        const distNorm = Math.hypot(
          (caliperPts[1].nx - caliperPts[0].nx) * 16,
          (caliperPts[1].ny - caliperPts[0].ny) * 9
        );
        const estMm = distNorm * 4.1;
        DRAW_HELPERS.drawFixedGuide(ctx, p1, p2, `${estMm.toFixed(1)} mm`, "#2DD4BF", false);
        ctx.save();
        [p1, p2].forEach((pt) => {
          ctx.fillStyle = "#2DD4BF";
          ctx.strokeStyle = "#061224";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      } else if (pointerPos) {
        DRAW_HELPERS.drawCanvasPill(
          ctx,
          pointerPos.x,
          Math.max(24, pointerPos.y - 20),
          "انقر لتثبيت بداية القياس",
          "#2DD4BF"
        );
      }
    }

    // 2. Tactile On-Canvas Direct-Drag Handle (dragGizmo)
    const gNorm = getGizmoHandleNorm(spec.dragGizmo, paramVal);
    const gp = m.toPx(gNorm.nx, gNorm.ny);
    const isDraggingThis = dragMode === "gizmo";
    const hot = isDraggingThis || isHoveringGizmo;

    ctx.save();
    if (spec.dragGizmo.kind === "line") {
      const a = m.toPx(spec.dragGizmo.p0.x, spec.dragGizmo.p0.y);
      const b = m.toPx(spec.dragGizmo.p1.x, spec.dragGizmo.p1.y);
      ctx.strokeStyle = "rgba(253, 230, 138, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = hot ? "#FBBF24" : "rgba(45, 212, 191, 0.85)";
    ctx.lineWidth = hot ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, hot ? 18 : 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hot ? "#F59E0B" : "#0D9488";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const labelY = gp.y > 46 ? gp.y - 26 : gp.y + 26;
    const badgeTxt = isDraggingThis
      ? spec.interactiveParam.formatReadout(paramVal).text
      : spec.dragGizmo.handleLabel;
    DRAW_HELPERS.drawCanvasPill(
      ctx,
      Math.max(85, Math.min(m.vw - 85, gp.x)),
      labelY,
      badgeTxt,
      hot ? "#FBBF24" : "#2DD4BF"
    );
    ctx.restore();

    // 3. Diagnostic 2.5x Magnifier Loupe
    if (loupeActive && pointerPos && imgEl.complete && imgEl.naturalWidth > 0) {
      const r = m.vw < 640 ? 54 : 74;
      const zoomFactor = 2.5;
      const cx = pointerPos.x;
      const cy = pointerPos.y;
      const norm = m.fromPx(cx, cy);
      const natW = imgEl.naturalWidth;
      const natH = imgEl.naturalHeight;
      const sampleSpanX = ((r * 2) / (m.baseW * m.effScale * zoomFactor)) * natW;
      const sampleSpanY = ((r * 2) / (m.baseH * m.effScale * zoomFactor)) * natH;
      const sx = norm.nx * natW - sampleSpanX * 0.5;
      const sy = norm.ny * natH - sampleSpanY * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = "#061224";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      if (filterMode === "xray") ctx.filter = "grayscale(1) contrast(1.48) brightness(0.92)";

      ctx.drawImage(
        imgEl,
        sx,
        sy,
        sampleSpanX,
        sampleSpanY,
        cx - r,
        cy - r,
        r * 2,
        r * 2
      );
      ctx.filter = "none";

      ctx.strokeStyle = "rgba(45, 212, 191, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx, cy + 14);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "#2DD4BF";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      DRAW_HELPERS.drawCanvasPill(ctx, cx, cy + r - 6, "2.5× Loupe", "#2DD4BF");
      ctx.restore();
    }
  }

  function makeFrameHelpers(m: ReturnType<typeof computeCameraMetrics>): DrawHelpers {
    const modeFilterPrefix =
      filterMode === "xray"
        ? "grayscale(1) contrast(1.42) brightness(0.92)"
        : "";

    const joinFilters = (a: string, b?: string): string => {
      const parts = [a, b].filter((s) => Boolean(s && s.trim() && s !== "none"));
      return parts.length ? parts.join(" ") : "none";
    };

    const dx = m.tx + m.baseX * m.effScale;
    const dy = m.ty + m.baseY * m.effScale;
    const dw = m.baseW * m.effScale;
    const dh = m.baseH * m.effScale;

    return {
      ...DRAW_HELPERS,

      drawExtraImage(ctx, key, alpha, clipRect?: NormRect) {
        const im = extraImgMap[key];
        if (!im || !im.complete || im.naturalWidth <= 0 || alpha <= 0.005) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        if (clipRect) {
          ctx.beginPath();
          ctx.rect(
            dx + clipRect.x * dw,
            dy + clipRect.y * dh,
            clipRect.w * dw,
            clipRect.h * dh
          );
          ctx.clip();
        }
        ctx.filter = joinFilters(modeFilterPrefix);
        ctx.drawImage(im, dx, dy, dw, dh);
        ctx.filter = "none";
        ctx.restore();
      },

      drawRegionWarp(ctx, rect, opts = {}) {
        const src = opts.sourceKey ? extraImgMap[opts.sourceKey] : imgEl;
        if (!src || !src.complete || src.naturalWidth <= 0) return;

        const rx = dx + rect.x * dw;
        const ry = dy + rect.y * dh;
        const rw = rect.w * dw;
        const rh = rect.h * dh;
        const sx = rect.x * src.naturalWidth;
        const sy = rect.y * src.naturalHeight;
        const sw = rect.w * src.naturalWidth;
        const sh = rect.h * src.naturalHeight;
        const radius = opts.radiusPx ?? 0;

        ctx.save();
        ctx.beginPath();
        if (radius > 0) ctx.roundRect(rx, ry, rw, rh, radius);
        else ctx.rect(rx, ry, rw, rh);
        ctx.clip();

        const sxFactor = opts.scaleX ?? 1;
        const syFactor = opts.scaleY ?? 1;
        const offX = (opts.offsetX ?? 0) * dw;
        const offY = (opts.offsetY ?? 0) * dh;
        const skew = opts.skewY ?? 0;

        if (
          Math.abs(sxFactor - 1) > 0.01 ||
          Math.abs(syFactor - 1) > 0.01 ||
          Math.abs(offX) > 0.5 ||
          Math.abs(offY) > 0.5 ||
          Math.abs(skew) > 0.005
        ) {
          ctx.fillStyle = "#060D1A";
          ctx.fillRect(rx, ry, rw, rh);
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha ?? 1));
        ctx.filter = joinFilters(modeFilterPrefix, opts.filter);

        ctx.save();
        ctx.translate(rx + rw * 0.5 + offX, ry + rh * 0.5 + offY);
        if (Math.abs(skew) > 1e-4) ctx.transform(1, skew, 0, 1, 0, 0);
        ctx.scale(sxFactor, syFactor);
        ctx.drawImage(src, sx, sy, sw, sh, -rw * 0.5, -rh * 0.5, rw, rh);
        ctx.restore();

        ctx.filter = "none";

        // Authentic curved unexposed white/pale-blue cone-cut margin
        if (opts.coneCut && Math.abs(opts.coneCut) > 0.02) {
          const shiftY = opts.coneCut * rh * 0.52;
          const beamCx = rx + rw * 0.5;
          const beamCy = ry + rh * 0.5 + shiftY;
          const beamR = Math.max(rw, rh) * 0.6;
          ctx.beginPath();
          ctx.rect(rx - 2, ry - 2, rw + 4, rh + 4);
          ctx.arc(beamCx, beamCy, beamR, 0, Math.PI * 2, true);
          ctx.fillStyle = "rgba(226, 232, 240, 0.90)";
          ctx.fill("evenodd");
          ctx.strokeStyle = "rgba(148, 163, 184, 0.65)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(beamCx, beamCy, beamR, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      },

      drawRegionFilter(ctx, rect, filter, opts = {}) {
        const src = opts.sourceKey ? extraImgMap[opts.sourceKey] : imgEl;
        if (!src || !src.complete || src.naturalWidth <= 0) return;

        const rx = dx + rect.x * dw;
        const ry = dy + rect.y * dh;
        const rw = rect.w * dw;
        const rh = rect.h * dh;
        const sx = rect.x * src.naturalWidth;
        const sy = rect.y * src.naturalHeight;
        const sw = rect.w * src.naturalWidth;
        const sh = rect.h * src.naturalHeight;
        const radius = opts.radiusPx ?? 0;

        ctx.save();
        ctx.beginPath();
        if (radius > 0) ctx.roundRect(rx, ry, rw, rh, radius);
        else ctx.rect(rx, ry, rw, rh);
        ctx.clip();

        ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha ?? 1));
        ctx.filter = joinFilters(modeFilterPrefix, filter);
        ctx.drawImage(src, sx, sy, sw, sh, rx, ry, rw, rh);
        ctx.filter = "none";

        if (opts.tint) {
          ctx.fillStyle = opts.tint;
          ctx.fillRect(rx, ry, rw, rh);
        }
        ctx.restore();
      },

      drawFocusAperture(ctx, centerNorm, radiusNorm, dimAlpha = 0.42) {
        const cp = m.toPx(centerNorm.x, centerNorm.y);
        const rPx = Math.max(24, radiusNorm * dw);

        ctx.save();
        const grad = ctx.createRadialGradient(
          cp.x,
          cp.y,
          rPx * 0.58,
          cp.x,
          cp.y,
          rPx * 1.18
        );
        grad.addColorStop(0, "rgba(4, 10, 20, 0)");
        grad.addColorStop(1, `rgba(4, 10, 20, ${Math.max(0, Math.min(0.85, dimAlpha))})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, m.vw, m.vh);

        ctx.strokeStyle = "rgba(45, 212, 191, 0.28)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, rPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      },
    };
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

    const desiredScale = Math.min(2.4, sc.focus.scale * userZoom);
    const damp = 1 - Math.exp(-dt * 8.5);
    curCam.cx = lerp(curCam.cx, sc.focus.cx, damp);
    curCam.cy = lerp(curCam.cy, sc.focus.cy, damp);
    curCam.scale = lerp(curCam.scale, desiredScale, damp);

    const metrics = computeCameraMetrics();
    cameraEl.style.transform = `translate3d(${metrics.tx.toFixed(2)}px, ${metrics.ty.toFixed(2)}px, 0) scale(${metrics.effScale.toFixed(4)})`;

    if (spec.supportsXray && splitActive && splitImgEl && splitLineEl) {
      const splitPxInCam = (splitRatio * metrics.vw - metrics.tx) / metrics.effScale;
      const clipPct = Math.max(0, Math.min(100, (splitPxInCam / metrics.vw) * 100));
      splitImgEl.style.clipPath = `inset(0 0 0 ${clipPct.toFixed(2)}%)`;
      splitLineEl.style.left = `${(splitRatio * 100).toFixed(2)}%`;
    }

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
      const frameHelpers = makeFrameHelpers(metrics);
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
          xrayMode: filterMode === "xray",
          scale: metrics.effScale,
          paramVal,
        },
        metrics.toPx,
        frameHelpers
      );
      drawDiagnosticOverlays(ctx, metrics);
      ctx.restore();
    }

    if (labelsVisible) {
      layoutPerimeterCallouts(metrics.vw, metrics.vh, metrics.toPx);
    }

    rafId = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(() => {
    const metrics = computeCameraMetrics();
    if (labelsVisible) {
      layoutPerimeterCallouts(metrics.vw, metrics.vh, metrics.toPx);
    }
  });
  ro.observe(viewportEl);

  updateParamReadout();
  switchScenario(0);
  rafId = requestAnimationFrame(tick);

  activeInstances.push({
    destroy: () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    },
  });
}
