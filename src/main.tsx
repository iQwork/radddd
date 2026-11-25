import "./index.css";
import { ACADEMY_PAGES, PAGE_REVIEWS } from "./data/lectureData";
import { MCQ_BANK } from "./data/mcqBank";
import { cleanupAllStudios, mountMediaStudio } from "./mediaStudio";

interface SegmentItem {
  enHtml: string;
  iqHtml: string;
}

interface TermCard {
  en: string;
  iq: string;
}

interface CompareSpec {
  title: string;
  aLabel: string;
  aText: string;
  bLabel: string;
  bText: string;
}

interface TopicReview {
  simpleWay?: string;
  focusPoints: readonly string[];
  terms?: readonly TermCard[];
  compare?: CompareSpec | null;
}

interface TopicItem {
  id: string;
  simId?: string;
  simTitle?: string;
  indexLabel: string;
  titleEn: string;
  titleAr: string;
  segments: readonly SegmentItem[];
  helperNote?: string;
  review?: TopicReview;
}

interface PageItem {
  pageNumber: number;
  subtitle: string;
  titleAr: string;
  titleEn: string;
  topics: readonly TopicItem[];
}

interface PageReviewItem {
  title: string;
  simpleWay?: string;
  takeaways?: readonly string[];
  traps?: readonly string[];
}

interface McqItem {
  id: string;
  page: number;
  topicId: string;
  level: string;
  qEn: string;
  qIq: string;
  options: readonly string[];
  optionsIq: readonly string[];
  correctIndex: number;
  whyCorrectIq: string;
  whyWrongIq?: readonly string[];
}

interface AnsweredRecord {
  selected: number;
  correct: boolean;
  ts: number;
}

interface AppState {
  theme: "light" | "dark";
  currentView: "lecture" | "review" | "qbank";
  currentPage: number;
  completedPages: number[];
  completedTopics: string[];
  bookmarkedTopics: string[];
  reviewCompletedTopics: string[];
  reviewHardTopics: string[];
  answeredMcqs: Record<string, AnsweredRecord>;
  testHistory: Array<{
    id: string;
    page: number;
    topicId: string;
    correct: boolean;
    ts: number;
  }>;
}

declare global {
  interface Window {
    ACADEMY_PAGES?: readonly PageItem[];
    PAGE_REVIEWS?: Record<string, PageReviewItem>;
    MCQ_BANK?: readonly McqItem[];
    VisualSimEngine?: {
      cleanupAll: () => void;
      mountTopicVisual: (topic: TopicItem) => void;
    };
    __toastTimer?: number;
  }
}

const PAGES = ACADEMY_PAGES as unknown as readonly PageItem[];
const REVIEWS = PAGE_REVIEWS as unknown as Record<string, PageReviewItem>;
const QBANK = MCQ_BANK as unknown as readonly McqItem[];

window.ACADEMY_PAGES = PAGES;
window.PAGE_REVIEWS = REVIEWS;
window.MCQ_BANK = QBANK;
window.VisualSimEngine = {
  cleanupAll: cleanupAllStudios,
  mountTopicVisual: (topic: TopicItem) => {
    if (!topic || !topic.id) return;
    const stage = document.getElementById("vis-" + topic.id);
    if (!stage) return;
    mountMediaStudio(stage, topic);
  },
};

const STORAGE_KEY = "dr_yaser_endo_radio_v1";
const IDB_NAME = "DrYaserEndoRadioDB";

const state: AppState = {
  theme: "light",
  currentView: "lecture",
  currentPage: 1,
  completedPages: [],
  completedTopics: [],
  bookmarkedTopics: [],
  reviewCompletedTopics: [],
  reviewHardTopics: [],
  answeredMcqs: {},
  testHistory: [],
};

function applyTheme(t: string): void {
  state.theme = t === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", state.theme === "dark");
}

function saveToIdb(payload: AppState): void {
  if (!window.indexedDB) return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("academyState")) {
        db.createObjectStore("academyState", { keyPath: "id" });
      }
    };
    req.onsuccess = (e: Event) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction(["academyState"], "readwrite");
      tx.objectStore("academyState").put({
        id: "main",
        data: payload,
        updatedAt: Date.now(),
      });
    };
  } catch {
    // ignore storage quota errors
  }
}

function loadState(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && typeof parsed === "object") {
        (Object.keys(state) as Array<keyof AppState>).forEach((k) => {
          const val = parsed[k];
          if (val !== undefined) {
            (state as unknown as Record<string, unknown>)[k] = val;
          }
        });
      }
    }
  } catch {
    // ignore corrupted local storage
  }
  if (state.currentPage < 1 || state.currentPage > PAGES.length) {
    state.currentPage = 1;
  }
  applyTheme(state.theme);
}

function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
  saveToIdb(state);
  updateGlobalProgressUI();
}

function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return (d.textContent || "").trim();
}

function showToast(msg: string): void {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

function openDrawer(): void {
  document.getElementById("sideDrawer")?.classList.add("open");
  document.getElementById("drawerBackdrop")?.classList.add("open");
}

function closeDrawer(): void {
  document.getElementById("sideDrawer")?.classList.remove("open");
  document.getElementById("drawerBackdrop")?.classList.remove("open");
}

function updateGlobalProgressUI(): void {
  const totalTopics = PAGES.reduce((acc, p) => acc + p.topics.length, 0);
  const pct = totalTopics
    ? Math.round((state.completedTopics.length / totalTopics) * 100)
    : 0;
  const fill = document.getElementById("globalProgressFill");
  if (fill) fill.style.width = pct + "%";

  const resBtn = document.getElementById("resumeStudyBtn");
  if (resBtn) {
    resBtn.textContent =
      state.currentPage > 1
        ? "استئناف من الصفحة " + state.currentPage
        : "ابدأ من الصفحة 1";
  }

  const drawerGrid = document.getElementById("drawerPagesGrid");
  if (drawerGrid) {
    drawerGrid.innerHTML = PAGES.map((p) => {
      let cls = "drawer-page-chip";
      if (p.pageNumber === state.currentPage) cls += " current";
      else if (state.completedPages.indexOf(p.pageNumber) !== -1) cls += " done";
      return (
        '<button class="' +
        cls +
        '" data-jump-page="' +
        p.pageNumber +
        '">' +
        p.pageNumber +
        "</button>"
      );
    }).join("");
    drawerGrid.querySelectorAll("[data-jump-page]").forEach((b) => {
      b.addEventListener("click", () => {
        const pn = Number(b.getAttribute("data-jump-page"));
        closeDrawer();
        switchView("lecture");
        goToPage(pn);
      });
    });
  }
}

function switchView(view: string): void {
  const normalized: AppState["currentView"] =
    view === "review" || view === "qbank" ? view : "lecture";
  state.currentView = normalized;
  saveState();

  document.querySelectorAll(".nav-tab").forEach((t) => {
    t.classList.toggle("active", t.getAttribute("data-view") === normalized);
  });
  document.querySelectorAll(".drawer-section-btn").forEach((t) => {
    t.classList.toggle(
      "active",
      t.getAttribute("data-drawer-view") === normalized
    );
  });

  document
    .getElementById("viewLecture")
    ?.classList.toggle("hidden", normalized !== "lecture");
  document
    .getElementById("viewReview")
    ?.classList.toggle("hidden", normalized !== "review");
  document
    .getElementById("viewQbank")
    ?.classList.toggle("hidden", normalized !== "qbank");

  if (normalized === "lecture") renderLecturePage(state.currentPage);
  if (normalized === "review") renderFocusedReviewView();
  if (normalized === "qbank") renderQbankView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openLightbox(title: string, html: string): void {
  const titleEl = document.getElementById("lightboxTitle");
  const bodyEl = document.getElementById("lightboxBody");
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = html;
  document.getElementById("lightboxOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox(): void {
  document.getElementById("lightboxOverlay")?.classList.remove("open");
  const bodyEl = document.getElementById("lightboxBody");
  if (bodyEl) bodyEl.innerHTML = "";
  document.body.style.overflow = "";
}

function findTopic(
  topicId: string
): { page: PageItem; topic: TopicItem } | null {
  for (let i = 0; i < PAGES.length; i++) {
    for (let j = 0; j < PAGES[i].topics.length; j++) {
      if (PAGES[i].topics[j].id === topicId) {
        return { page: PAGES[i], topic: PAGES[i].topics[j] };
      }
    }
  }
  return null;
}

function openTopicReviewLightbox(topicId: string): void {
  const res = findTopic(topicId);
  if (!res) return;
  const t = res.topic;
  const rev = t.review || { focusPoints: [], terms: [], compare: null };
  const isRevDone = state.reviewCompletedTopics.indexOf(t.id) !== -1;
  const isHard = state.reviewHardTopics.indexOf(t.id) !== -1;

  let html =
    '<div style="margin-bottom:16px;"><div style="font-size:0.85rem; color:var(--turquoise); font-weight:800;">' +
    esc(t.indexLabel) +
    "</div>" +
    '<div class="ltr" style="font-size:1.15rem; font-weight:800; color:var(--navy);">' +
    esc(t.titleEn) +
    "</div>" +
    '<div style="color:var(--text-secondary); font-weight:700;">' +
    esc(t.titleAr) +
    "</div></div>";

  if (rev.simpleWay) {
    html +=
      '<div style="padding:14px 16px; border-radius:12px; background:var(--gold-bg); border:1px solid rgba(180,138,62,0.34); margin-bottom:16px;">' +
      '<div style="font-weight:800; color:var(--gold); margin-bottom:6px; font-size:0.95rem;">أبسط طريقة تفهمها:</div>' +
      '<div style="font-weight:600; color:var(--text-primary); line-height:1.75;">' +
      esc(rev.simpleWay) +
      "</div></div>";
  }

  html +=
    '<div style="padding:16px; border-radius:12px; background:var(--bg-canvas); border:1px solid var(--border-hairline); margin-bottom:16px;">' +
    '<div style="font-weight:800; color:var(--navy); margin-bottom:10px;">أبرز النقاط المركزة للامتحان:</div><ul style="padding-right:18px; display:flex; flex-direction:column; gap:8px;">';
  rev.focusPoints.forEach((pt) => {
    html += "<li>" + esc(pt) + "</li>";
  });
  html += "</ul></div>";

  if (rev.terms && rev.terms.length) {
    html +=
      '<div style="font-weight:800; color:var(--navy); margin-bottom:10px;">بطاقات استرجاع المصطلحات (اضغط لكشف الشرح):</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; margin-bottom:16px;">';
    rev.terms.forEach((term) => {
      html +=
        '<div class="flashcard" onclick="this.querySelector(\'.fc-ans\').classList.toggle(\'hidden\')">' +
        '<div class="ltr" style="font-weight:800; color:var(--navy);">' +
        esc(term.en) +
        "</div>" +
        '<div style="font-size:0.78rem; color:var(--turquoise); margin-top:4px;">اضغط هنا لإظهار المعنى</div>' +
        '<div class="fc-ans hidden" style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-strong); font-size:0.9rem;">' +
        esc(term.iq) +
        "</div></div>";
    });
    html += "</div>";
  }

  if (rev.compare) {
    html +=
      '<div style="padding:16px; border-radius:12px; background:var(--turquoise-bg); border:1px solid rgba(13,148,136,0.25); margin-bottom:16px;">' +
      '<div style="font-weight:800; color:var(--navy); margin-bottom:10px;">' +
      esc(rev.compare.title) +
      "</div>" +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">' +
      '<div style="background:var(--bg-surface); padding:12px; border-radius:8px;"><div style="font-weight:800; color:var(--turquoise);">' +
      esc(rev.compare.aLabel) +
      "</div><div>" +
      esc(rev.compare.aText) +
      "</div></div>" +
      '<div style="background:var(--bg-surface); padding:12px; border-radius:8px;"><div style="font-weight:800; color:var(--gold);">' +
      esc(rev.compare.bLabel) +
      "</div><div>" +
      esc(rev.compare.bText) +
      "</div></div>" +
      "</div></div>";
  }

  html +=
    '<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; padding-top:12px; border-top:1px solid var(--border-hairline);">' +
    '<button class="btn-primary" id="lbMarkRevDone">' +
    (isRevDone ? "تمت مراجعة هذا الموضوع" : "تثبيت إتمام المراجعة") +
    "</button>" +
    '<button class="btn-secondary" id="lbToggleHard">' +
    (isHard ? "محدد كموضوع يحتاج تكراراً" : "إضافة لقائمة التكرار الصعب") +
    "</button>" +
    "</div>";

  openLightbox("مراجعة الموضوع: " + t.titleAr, html);

  document
    .getElementById("lbMarkRevDone")
    ?.addEventListener("click", function (this: HTMLButtonElement) {
      if (state.reviewCompletedTopics.indexOf(t.id) === -1) {
        state.reviewCompletedTopics.push(t.id);
      }
      saveState();
      this.textContent = "تمت مراجعة هذا الموضوع";
      showToast("تم حفظ تقدم مراجعة الموضوع");
    });

  document
    .getElementById("lbToggleHard")
    ?.addEventListener("click", function (this: HTMLButtonElement) {
      const idx = state.reviewHardTopics.indexOf(t.id);
      if (idx === -1) {
        state.reviewHardTopics.push(t.id);
        this.textContent = "محدد كموضوع يحتاج تكراراً";
        showToast("أضيف إلى قائمة التكرار");
      } else {
        state.reviewHardTopics.splice(idx, 1);
        this.textContent = "إضافة لقائمة التكرار الصعب";
        showToast("أزيل من قائمة التكرار");
      }
      saveState();
    });
}

function openPageReviewLightbox(pageNum: number): void {
  const pr = REVIEWS[pageNum];
  if (!pr) return;
  let html = "";
  if (pr.simpleWay) {
    html +=
      '<div style="padding:14px 16px; border-radius:12px; background:var(--turquoise-bg); border:1px solid rgba(13,148,136,0.3); margin-bottom:16px;">' +
      '<div style="font-weight:800; color:var(--turquoise); margin-bottom:6px; font-size:0.95rem;">أبسط طريقة تفهم بيها زبدة الصفحة:</div>' +
      '<div style="font-weight:600; color:var(--text-primary); line-height:1.75;">' +
      esc(pr.simpleWay) +
      "</div></div>";
  }
  html +=
    '<div style="padding:16px; border-radius:12px; background:var(--bg-canvas); border:1px solid var(--border-hairline); margin-bottom:16px;">' +
    '<div style="font-weight:800; color:var(--navy); margin-bottom:10px;">الخلاصة الكاملة للصفحة ' +
    pageNum +
    ':</div><ul style="padding-right:18px; display:flex; flex-direction:column; gap:8px;">';
  (pr.takeaways || []).forEach((item) => {
    html += "<li>" + esc(item) + "</li>";
  });
  html += "</ul></div>";
  html +=
    '<div style="padding:16px; border-radius:12px; background:var(--gold-bg); border:1px solid rgba(180,138,62,0.30);">' +
    '<div style="font-weight:800; color:var(--gold); margin-bottom:8px;">مصائد الامتحان السريرية في هذه الصفحة:</div><ul style="padding-right:18px; display:flex; flex-direction:column; gap:6px;">';
  (pr.traps || []).forEach((tr) => {
    html += "<li>" + esc(tr) + "</li>";
  });
  html += "</ul></div>";
  openLightbox(pr.title, html);
}

const LEVEL_AR: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  precise: "دقيق جداً",
  application: "تطبيقي",
  clinical: "سؤال سريري",
};

function buildExpHtml(q: McqItem, chosen: number): string {
  const ok = chosen === q.correctIndex;
  let h =
    '<div style="font-weight:800; color:' +
    (ok ? "#059669" : "#DC2626") +
    '; margin-bottom:6px;">' +
    (ok
      ? "إجابة صحيحة! أحسنت يا دكتور"
      : "إجابة خاطئة — الإجابة الصحيحة هي الاختيار " +
        String.fromCharCode(65 + q.correctIndex)) +
    "</div>" +
    '<div style="margin-bottom:8px;"><strong>لماذا هي الصحيحة؟</strong> ' +
    esc(q.whyCorrectIq) +
    "</div>";
  if (q.whyWrongIq && q.whyWrongIq.length) {
    h +=
      '<div style="font-size:0.84rem; color:var(--text-secondary);"><strong>تحليل بقية الخيارات:</strong><ul style="padding-right:18px; margin-top:4px;">';
    q.whyWrongIq.forEach((w, i) => {
      h +=
        "<li><strong>" +
        String.fromCharCode(65 + i) +
        ":</strong> " +
        esc(w) +
        "</li>";
    });
    h += "</ul></div>";
  }
  return h;
}

function renderQuizCardsInto(
  mountEl: HTMLElement | null,
  questions: readonly McqItem[],
  titleContext: string
): void {
  if (!mountEl) return;
  if (!questions.length) {
    mountEl.innerHTML =
      '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا توجد أسئلة مطابقة للتصفية الحالية.</div>';
    return;
  }
  const scoreBox = document.createElement("div");
  scoreBox.style.cssText =
    "padding:12px 16px; border-radius:10px; background:var(--turquoise-bg); border:1px solid rgba(13,148,136,0.25); margin-bottom:16px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px;";
  mountEl.innerHTML = "";
  mountEl.appendChild(scoreBox);

  const updateScore = () => {
    let ans = 0;
    let cor = 0;
    questions.forEach((q) => {
      const r = state.answeredMcqs[q.id];
      if (r) {
        ans++;
        if (r.correct) cor++;
      }
    });
    scoreBox.innerHTML =
      '<div style="font-weight:800; color:var(--navy);">نتيجتك في ' +
      esc(titleContext) +
      ': <span class="tabular-nums" style="color:var(--turquoise);">' +
      cor +
      " / " +
      questions.length +
      "</span> (المُجاب: " +
      ans +
      ")</div>" +
      '<button type="button" class="btn-secondary" data-reset-quiz style="padding:6px 12px; font-size:0.8rem;">إعادة اختبار هذه المجموعة</button>';
    scoreBox
      .querySelector("[data-reset-quiz]")
      ?.addEventListener("click", () => {
        questions.forEach((q) => {
          delete state.answeredMcqs[q.id];
        });
        saveState();
        renderQuizCardsInto(mountEl, questions, titleContext);
      });
  };

  questions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "mcq-card";
    const prev = state.answeredMcqs[q.id];
    let html =
      '<div class="mcq-meta">سؤال ' +
      (idx + 1) +
      " من " +
      questions.length +
      " · صفحة " +
      q.page +
      " · المستوى: " +
      (LEVEL_AR[q.level] || q.level) +
      "</div>" +
      '<div class="mcq-question-en">' +
      esc(q.qEn) +
      "</div>" +
      '<div class="mcq-question-iq">' +
      esc(q.qIq) +
      '</div><div class="mcq-options">';
    q.options.forEach((opt, oi) => {
      let cls = "mcq-option-btn";
      if (prev) {
        if (oi === q.correctIndex) cls += " correct";
        else if (oi === prev.selected) cls += " wrong";
      }
      html +=
        '<button type="button" class="' +
        cls +
        '" data-oi="' +
        oi +
        '" ' +
        (prev ? "disabled" : "") +
        ">" +
        '<span class="mcq-opt-en">' +
        String.fromCharCode(65 + oi) +
        ". " +
        esc(opt) +
        "</span>" +
        '<span class="mcq-opt-iq">' +
        esc(q.optionsIq[oi]) +
        "</span></button>";
    });
    html +=
      '</div><div class="mcq-explanation ' +
      (prev ? "" : "hidden") +
      '">' +
      (prev ? buildExpHtml(q, prev.selected) : "") +
      "</div>";
    card.innerHTML = html;
    mountEl.appendChild(card);

    card.querySelectorAll(".mcq-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = Number(btn.getAttribute("data-oi"));
        const ok = chosen === q.correctIndex;
        state.answeredMcqs[q.id] = {
          selected: chosen,
          correct: ok,
          ts: Date.now(),
        };
        state.testHistory.push({
          id: q.id,
          page: q.page,
          topicId: q.topicId,
          correct: ok,
          ts: Date.now(),
        });
        if (state.testHistory.length > 300) state.testHistory.shift();
        saveState();

        card.querySelectorAll(".mcq-option-btn").forEach((b2, bIdx) => {
          (b2 as HTMLButtonElement).disabled = true;
          if (bIdx === q.correctIndex) b2.classList.add("correct");
          else if (bIdx === chosen && !ok) b2.classList.add("wrong");
        });
        const exp = card.querySelector(".mcq-explanation");
        if (exp) {
          exp.innerHTML = buildExpHtml(q, chosen);
          exp.classList.remove("hidden");
        }
        updateScore();
      });
    });
  });
  updateScore();
}

function openTopicQuizLightbox(topicId: string): void {
  const res = findTopic(topicId);
  if (!res) return;
  const qs = QBANK.filter((q) => q.topicId === topicId);
  openLightbox("اختبار الموضوع: " + res.topic.titleAr, '<div id="lbQuizHost"></div>');
  renderQuizCardsInto(
    document.getElementById("lbQuizHost"),
    qs,
    res.topic.titleAr
  );
}

function openPageQuizLightbox(pageNum: number): void {
  const qs = QBANK.filter((q) => q.page === pageNum);
  openLightbox("جميع أسئلة الصفحة " + pageNum, '<div id="lbPageQuizHost"></div>');
  renderQuizCardsInto(
    document.getElementById("lbPageQuizHost"),
    qs,
    "الصفحة " + pageNum
  );
}

function goToPage(pageNum: number): void {
  let target = pageNum;
  if (target < 1) target = 1;
  if (target > PAGES.length) target = PAGES.length;
  state.currentPage = target;
  saveState();
  renderLecturePage(target);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderLecturePage(pageNum: number): void {
  cleanupAllStudios();
  const pageObj = PAGES.find((p) => p.pageNumber === pageNum) || PAGES[0];
  if (!pageObj) return;

  const pills = document.getElementById("pagePillsContainer");
  if (pills) {
    pills.innerHTML = PAGES.map((p) => {
      let cls = "page-step-btn";
      if (p.pageNumber === pageObj.pageNumber) cls += " active";
      else if (state.completedPages.indexOf(p.pageNumber) !== -1) cls += " completed";
      return (
        '<button class="' +
        cls +
        '" data-nav-page="' +
        p.pageNumber +
        '">صفحة ' +
        p.pageNumber +
        "</button>"
      );
    }).join("");
    pills.querySelectorAll("[data-nav-page]").forEach((b) => {
      b.addEventListener("click", () =>
        goToPage(Number(b.getAttribute("data-nav-page")))
      );
    });
  }

  const prevBtn = document.getElementById("prevPageBtn") as HTMLButtonElement | null;
  const nextBtn = document.getElementById("nextPageBtn") as HTMLButtonElement | null;
  if (prevBtn) prevBtn.disabled = pageObj.pageNumber <= 1;
  if (nextBtn) nextBtn.disabled = pageObj.pageNumber >= PAGES.length;

  const isPageDone = state.completedPages.indexOf(pageObj.pageNumber) !== -1;
  let html =
    '<div class="page-banner">' +
    '<div class="page-kicker">' +
    esc(pageObj.subtitle) +
    "</div>" +
    '<h2 class="page-title-ar">' +
    esc(pageObj.titleAr) +
    "</h2>" +
    '<div class="page-title-en">' +
    esc(pageObj.titleEn) +
    "</div>" +
    '<div class="page-toolbar">' +
    '<div style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">مواضيع هذه الصفحة: ' +
    pageObj.topics.length +
    " مواضيع مستقلة</div>" +
    '<button id="togglePageCompleteBtn" class="action-chip-btn ' +
    (isPageDone ? "active" : "") +
    '">' +
    (isPageDone ? "الصفحة مكتملة" : "تحديد الصفحة كمكتملة") +
    "</button>" +
    "</div></div>";

  pageObj.topics.forEach((t) => {
    const isTopicDone = state.completedTopics.indexOf(t.id) !== -1;
    const isBook = state.bookmarkedTopics.indexOf(t.id) !== -1;
    const cleanSimMeta = String(t.simTitle || "").replace(
      "محاكاة 3D تفاعلية مع الشرح العراقي:",
      "استوديو تشريحي تفاعلي (4 طبقات):"
    );

    html +=
      '<article class="topic-section" id="topic-' +
      esc(t.id) +
      '">' +
      '<div class="topic-header"><div>' +
      '<div class="topic-index">' +
      esc(t.indexLabel) +
      "</div>" +
      '<h3 class="topic-title-en">' +
      esc(t.titleEn) +
      "</h3>" +
      '<div class="topic-title-ar">' +
      esc(t.titleAr) +
      "</div>" +
      '</div><div class="topic-actions-inline">' +
      '<button class="action-chip-btn ' +
      (isTopicDone ? "active" : "") +
      '" data-toggle-topic="' +
      esc(t.id) +
      '">' +
      (isTopicDone ? "مكتمل" : "تحديد كمكتمل") +
      "</button>" +
      '<button class="action-chip-btn ' +
      (isBook ? "bookmarked" : "") +
      '" data-toggle-book="' +
      esc(t.id) +
      '">' +
      (isBook ? "محفوظ للمراجعة" : "حفظ للمراجعة") +
      "</button>" +
      "</div></div>";

    t.segments.forEach((seg) => {
      html +=
        '<div class="segment-pair">' +
        '<div class="en-block">' +
        seg.enHtml +
        "</div>" +
        '<div class="iq-block">' +
        seg.iqHtml +
        "</div>" +
        "</div>";
    });

    if (t.helperNote) {
      html +=
        '<div class="helper-note"><div class="helper-note-title">توضيح علمي إضافي خارج النص الأصلي للملزمة:</div><div>' +
        esc(t.helperNote) +
        "</div></div>";
    }

    html +=
      '<div class="visual-section">' +
      '<div class="visual-header">' +
      '<div class="visual-title"><span>تذكرها بصرياً</span></div>' +
      '<div class="visual-mode-meta">' +
      esc(cleanSimMeta) +
      "</div>" +
      "</div>" +
      '<div class="visual-stage paper-canvas dark-capable" id="vis-' +
      esc(t.id) +
      '"></div>' +
      "</div>";

    html +=
      '<div class="topic-divider"></div>' +
      '<div class="topic-gate-actions">' +
      '<button type="button" class="gate-btn" data-open-topic-rev="' +
      esc(t.id) +
      '"><span>مراجعة هذا الموضوع</span><span>&#8592;</span></button>' +
      '<button type="button" class="gate-btn quiz-gate" data-open-topic-quiz="' +
      esc(t.id) +
      '"><span>اختبر نفسك في هذا الموضوع</span><span>&#8592;</span></button>' +
      "</div></article>";
  });

  html +=
    '<div class="page-end-divider"><span>نهاية الصفحة ' +
    pageObj.pageNumber +
    " من " +
    PAGES.length +
    "</span></div>" +
    '<div class="page-gate-grid">' +
    '<button type="button" class="page-gate-card" id="openPageRevGateBtn"><div><div style="font-weight:800; color:var(--navy); font-size:1.05rem;">مراجعة سريعة للصفحة ' +
    pageObj.pageNumber +
    '</div><div style="font-size:0.84rem; color:var(--text-muted);">خلاصة النقاط الذهبية ومصائد الامتحان</div></div><span style="font-size:1.25rem; color:var(--turquoise);">&#8592;</span></button>' +
    '<button type="button" class="page-gate-card" id="openPageQuizGateBtn"><div><div style="font-weight:800; color:var(--navy); font-size:1.05rem;">جميع الأسئلة التي تخص هذه الصفحة</div><div style="font-size:0.84rem; color:var(--text-muted);">اختبار شامل لكل مواضيع الصفحة ' +
    pageObj.pageNumber +
    '</div></div><span style="font-size:1.25rem; color:var(--gold);">&#8592;</span></button>' +
    "</div>";

  const mount = document.getElementById("lecturePageMount");
  if (!mount) return;
  mount.innerHTML = html;

  pageObj.topics.forEach((t) => {
    const stage = document.getElementById("vis-" + t.id);
    if (stage) mountMediaStudio(stage, t);
  });

  document
    .getElementById("togglePageCompleteBtn")
    ?.addEventListener("click", () => {
      const idx = state.completedPages.indexOf(pageObj.pageNumber);
      if (idx === -1) {
        state.completedPages.push(pageObj.pageNumber);
        pageObj.topics.forEach((t) => {
          if (state.completedTopics.indexOf(t.id) === -1) {
            state.completedTopics.push(t.id);
          }
        });
        showToast("تم تسجيل الصفحة " + pageObj.pageNumber + " كمكتملة");
      } else {
        state.completedPages.splice(idx, 1);
        showToast("تم إلغاء إكمال الصفحة " + pageObj.pageNumber);
      }
      saveState();
      renderLecturePage(pageObj.pageNumber);
    });

  mount.querySelectorAll("[data-toggle-topic]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-toggle-topic");
      if (!tid) return;
      const idx = state.completedTopics.indexOf(tid);
      if (idx === -1) {
        state.completedTopics.push(tid);
        showToast("تم حفظ إكمال الموضوع");
      } else {
        state.completedTopics.splice(idx, 1);
      }
      saveState();
      renderLecturePage(pageObj.pageNumber);
    });
  });

  mount.querySelectorAll("[data-toggle-book]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-toggle-book");
      if (!tid) return;
      const idx = state.bookmarkedTopics.indexOf(tid);
      if (idx === -1) {
        state.bookmarkedTopics.push(tid);
        showToast("تم حفظ الموضوع للمراجعة");
      } else {
        state.bookmarkedTopics.splice(idx, 1);
      }
      saveState();
      renderLecturePage(pageObj.pageNumber);
    });
  });

  mount.querySelectorAll("[data-open-topic-rev]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-open-topic-rev");
      if (tid) openTopicReviewLightbox(tid);
    });
  });
  mount.querySelectorAll("[data-open-topic-quiz]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-open-topic-quiz");
      if (tid) openTopicQuizLightbox(tid);
    });
  });
  document
    .getElementById("openPageRevGateBtn")
    ?.addEventListener("click", () => openPageReviewLightbox(pageObj.pageNumber));
  document
    .getElementById("openPageQuizGateBtn")
    ?.addEventListener("click", () => openPageQuizLightbox(pageObj.pageNumber));

  mount.querySelectorAll(".segment-pair").forEach((pairBox) => {
    const setPairState = (pid: string | null, active: boolean) => {
      if (!pid) return;
      pairBox.querySelectorAll('mark[data-pair="' + pid + '"]').forEach((el) => {
        el.classList.toggle("hl-pair-active", active);
      });
    };
    pairBox.querySelectorAll("mark[data-pair]").forEach((mk) => {
      const pid = mk.getAttribute("data-pair");
      mk.addEventListener("mouseenter", () => setPairState(pid, true));
      mk.addEventListener("mouseleave", () => setPairState(pid, false));
      mk.addEventListener("click", () => {
        const on = !mk.classList.contains("hl-pair-active");
        pairBox
          .querySelectorAll("mark.hl-pair-active")
          .forEach((x) => x.classList.remove("hl-pair-active"));
        setPairState(pid, on);
      });
    });
  });
}

function renderFocusedReviewView(): void {
  const host = document.getElementById("viewReview");
  if (!host) return;
  const scope = host.getAttribute("data-scope") || "all";
  const selPage = Number(host.getAttribute("data-page") || 1);

  const items: Array<{ page: number; topic: TopicItem }> = [];
  PAGES.forEach((p) => {
    p.topics.forEach((t) => {
      const isHard = state.reviewHardTopics.indexOf(t.id) !== -1;
      const isBook = state.bookmarkedTopics.indexOf(t.id) !== -1;
      if (scope === "all") items.push({ page: p.pageNumber, topic: t });
      else if (scope === "page" && p.pageNumber === selPage) {
        items.push({ page: p.pageNumber, topic: t });
      } else if (scope === "hard" && (isHard || isBook)) {
        items.push({ page: p.pageNumber, topic: t });
      }
    });
  });

  let h =
    '<div class="workspace-panel">' +
    '<h2 style="font-size:1.5rem; font-weight:800; color:var(--navy); margin-bottom:6px;">المراجعة المركزة الذكية</h2>' +
    '<p style="color:var(--text-secondary); margin-bottom:16px;">راجع المادة كاملة أو صفحة محددة أو المواضيع المحفوظة والصعبة بنظام الاستدعاء النشط والتكرار</p>' +
    '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:20px;">' +
    '<button class="sim-btn ' +
    (scope === "all" ? "active" : "") +
    '" data-rscope="all">كل المحاضرة (' +
    PAGES.reduce((a, p) => a + p.topics.length, 0) +
    " موضوع)</button>" +
    '<button class="sim-btn ' +
    (scope === "page" ? "active" : "") +
    '" data-rscope="page">صفحة محددة</button>' +
    '<button class="sim-btn ' +
    (scope === "hard" ? "active" : "") +
    '" data-rscope="hard">المحفوظة والصعبة (' +
    (state.reviewHardTopics.length + state.bookmarkedTopics.length) +
    ")</button>" +
    (scope === "page"
      ? '<select class="select-input" style="max-width:170px;" id="revPageSelect">' +
        PAGES.map(
          (p) =>
            '<option value="' +
            p.pageNumber +
            '" ' +
            (p.pageNumber === selPage ? "selected" : "") +
            ">صفحة " +
            p.pageNumber +
            "</option>"
        ).join("") +
        "</select>"
      : "") +
    "</div>";

  if (scope === "all" || scope === "page") {
    const prPages =
      scope === "page" ? PAGES.filter((p) => p.pageNumber === selPage) : PAGES;
    h +=
      '<div style="margin-bottom:22px;">' +
      '<div style="font-weight:800; color:var(--turquoise); margin-bottom:10px; font-size:0.95rem;">كبسولات الصفحات السريعة (زبدة كل صفحة بأسلوب العيادة):</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:10px;">';
    prPages.forEach((p) => {
      const pr = REVIEWS[p.pageNumber];
      if (!pr) return;
      h +=
        '<div style="padding:13px 15px; border-radius:12px; background:var(--turquoise-bg); border:1px solid rgba(13,148,136,0.28); display:flex; flex-direction:column; justify-content:space-between; gap:8px;">' +
        '<div><div style="font-weight:800; color:var(--navy); font-size:0.88rem; margin-bottom:4px;">' +
        esc(pr.title) +
        "</div>" +
        '<div style="font-size:0.84rem; color:var(--text-primary); line-height:1.68;">' +
        esc(pr.simpleWay || (pr.takeaways && pr.takeaways[0]) || "") +
        "</div></div>" +
        '<div style="display:flex; justify-content:flex-end;"><button type="button" class="btn-secondary" data-rev-page-lb="' +
        p.pageNumber +
        '" style="padding:5px 11px; font-size:0.78rem;">مصائد وملخص الصفحة ' +
        p.pageNumber +
        "</button></div>" +
        "</div>";
    });
    h += "</div></div>";
  }

  if (!items.length) {
    h +=
      '<div style="padding:24px; text-align:center; background:var(--bg-canvas); border-radius:12px; color:var(--text-muted);">لا توجد مواضيع محددة في هذه القائمة بعد — يمكنك حفظ أي موضوع من داخل المحاضرة أو نافذة المراجعة</div>';
  } else {
    items.forEach((it) => {
      const t = it.topic;
      const done = state.reviewCompletedTopics.indexOf(t.id) !== -1;
      const swHtml =
        t.review && t.review.simpleWay
          ? '<div style="padding:11px 14px; border-radius:10px; background:var(--gold-bg); border:1px solid rgba(180,138,62,0.3); margin-bottom:10px; font-size:0.92rem; line-height:1.7;"><strong style="color:var(--gold);">أبسط طريقة تفهمها:</strong> ' +
            esc(t.review.simpleWay) +
            "</div>"
          : "";
      h +=
        '<div style="padding:18px; border-radius:14px; background:var(--bg-canvas); border:1px solid var(--border-hairline); margin-bottom:14px;">' +
        '<div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px;">' +
        '<div><span style="font-size:0.78rem; color:var(--turquoise); font-weight:800;">صفحة ' +
        it.page +
        '</span><div class="ltr" style="font-weight:800; color:var(--navy);">' +
        esc(t.titleEn) +
        '</div><div style="font-weight:700; color:var(--text-secondary);">' +
        esc(t.titleAr) +
        "</div></div>" +
        '<div style="display:flex; gap:8px;"><button class="btn-secondary" data-rev-lb="' +
        esc(t.id) +
        '" style="padding:8px 14px; font-size:0.84rem;">' +
        (done ? "مكتملة — فتح المراجعة" : "فتح بطاقات المراجعة") +
        "</button>" +
        '<button class="btn-secondary" data-rev-quiz="' +
        esc(t.id) +
        '" style="padding:8px 14px; font-size:0.84rem;">اختبر نفسك</button></div>' +
        "</div>" +
        swHtml +
        '<ul style="padding-right:18px; font-size:0.9rem; color:var(--text-primary); display:flex; flex-direction:column; gap:5px;">' +
        (t.review && t.review.focusPoints
          ? t.review.focusPoints.map((pt) => "<li>" + esc(pt) + "</li>").join("")
          : "") +
        "</ul></div>";
    });
  }
  h += "</div>";
  host.innerHTML = h;

  host.querySelectorAll("[data-rscope]").forEach((b) => {
    b.addEventListener("click", () => {
      host.setAttribute("data-scope", b.getAttribute("data-rscope") || "all");
      renderFocusedReviewView();
    });
  });
  const ps = document.getElementById("revPageSelect") as HTMLSelectElement | null;
  if (ps) {
    ps.addEventListener("change", () => {
      host.setAttribute("data-page", ps.value);
      renderFocusedReviewView();
    });
  }
  host.querySelectorAll("[data-rev-page-lb]").forEach((b) => {
    b.addEventListener("click", () =>
      openPageReviewLightbox(Number(b.getAttribute("data-rev-page-lb")))
    );
  });
  host.querySelectorAll("[data-rev-lb]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-rev-lb");
      if (tid) openTopicReviewLightbox(tid);
    });
  });
  host.querySelectorAll("[data-rev-quiz]").forEach((b) => {
    b.addEventListener("click", () => {
      const tid = b.getAttribute("data-rev-quiz");
      if (tid) openTopicQuizLightbox(tid);
    });
  });
}

function renderQbankView(): void {
  const host = document.getElementById("viewQbank");
  if (!host) return;
  const fPage = host.getAttribute("data-fpage") || "all";
  const fLevel = host.getAttribute("data-flevel") || "all";
  const fStatus = host.getAttribute("data-fstatus") || "all";
  const shuffleOn = host.getAttribute("data-shuffle") === "1";

  let list = QBANK.filter((q) => {
    if (fPage !== "all" && String(q.page) !== fPage) return false;
    if (fLevel !== "all" && q.level !== fLevel) return false;
    const rec = state.answeredMcqs[q.id];
    if (fStatus === "unanswered" && rec) return false;
    if (fStatus === "wrong" && (!rec || rec.correct)) return false;
    return true;
  });
  if (shuffleOn) {
    list = list.slice().sort(() => Math.random() - 0.5);
  }

  const totalAns = Object.keys(state.answeredMcqs).length;
  const totalCor = Object.keys(state.answeredMcqs).filter(
    (k) => state.answeredMcqs[k].correct
  ).length;

  const h =
    '<div class="workspace-panel">' +
    '<div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center;">' +
    '<div><h2 style="font-size:1.5rem; font-weight:800; color:var(--navy);">بنك الأسئلة الطبي الشامل</h2>' +
    '<p style="color:var(--text-secondary);">' +
    QBANK.length +
    " سؤال MCQ مترجم مع تحليل تفصيلي لكل خيار صح أو خطأ</p></div>" +
    '<div style="padding:10px 16px; border-radius:10px; background:var(--turquoise-bg); font-weight:800; color:var(--navy);">الإجمالي: <span class="tabular-nums" style="color:var(--turquoise);">' +
    totalCor +
    " / " +
    totalAns +
    "</span> صحيحة</div>" +
    "</div>" +
    '<div class="filter-grid">' +
    '<select id="qbPage" class="select-input"><option value="all">كل الصفحات (1 - ' +
    PAGES.length +
    ")</option>" +
    PAGES.map(
      (p) =>
        '<option value="' +
        p.pageNumber +
        '" ' +
        (fPage === String(p.pageNumber) ? "selected" : "") +
        ">صفحة " +
        p.pageNumber +
        "</option>"
    ).join("") +
    "</select>" +
    '<select id="qbLevel" class="select-input"><option value="all">كل المستويات</option>' +
    Object.keys(LEVEL_AR)
      .map(
        (lv) =>
          '<option value="' +
          lv +
          '" ' +
          (fLevel === lv ? "selected" : "") +
          ">" +
          LEVEL_AR[lv] +
          "</option>"
      )
      .join("") +
    "</select>" +
    '<select id="qbStatus" class="select-input"><option value="all" ' +
    (fStatus === "all" ? "selected" : "") +
    '>كل الأسئلة</option><option value="unanswered" ' +
    (fStatus === "unanswered" ? "selected" : "") +
    '>غير المحلولة فقط</option><option value="wrong" ' +
    (fStatus === "wrong" ? "selected" : "") +
    ">الأخطاء السابقة للمراجعة</option></select>" +
    '<button id="qbShuffleBtn" class="btn-secondary">' +
    (shuffleOn ? "خلط عشوائي مفعل" : "خلط عشوائي للأسئلة") +
    "</button>" +
    '</div><div id="qbQuestionsHost"></div></div>';

  host.innerHTML = h;
  renderQuizCardsInto(
    document.getElementById("qbQuestionsHost"),
    list,
    "البنك المصفى"
  );

  document.getElementById("qbPage")?.addEventListener("change", (e) => {
    host.setAttribute("data-fpage", (e.target as HTMLSelectElement).value);
    renderQbankView();
  });
  document.getElementById("qbLevel")?.addEventListener("change", (e) => {
    host.setAttribute("data-flevel", (e.target as HTMLSelectElement).value);
    renderQbankView();
  });
  document.getElementById("qbStatus")?.addEventListener("change", (e) => {
    host.setAttribute("data-fstatus", (e.target as HTMLSelectElement).value);
    renderQbankView();
  });
  document.getElementById("qbShuffleBtn")?.addEventListener("click", () => {
    host.setAttribute("data-shuffle", shuffleOn ? "0" : "1");
    renderQbankView();
  });
}

function openSearchLightbox(): void {
  const html =
    '<div class="search-input-wrap"><input id="smartSearchInput" class="text-input" type="search" placeholder="ابحث بالعربي أو الإنجليزي... مثل: SLOB / Bisecting / Paralleling / 37.7 / CCD / PSP / 90% / CBCT / 4x4 / Voxel" autofocus /></div>' +
    '<div id="smartSearchResults" style="color:var(--text-muted); font-size:0.9rem;">اكتب أي مصطلح علمي أو رقم للبحث الفوري في كل صفحات المحاضرة الـ 9</div>';
  openLightbox(
    "البحث الذكي في ملزمة أشعة علاج الجذور (Endodontic Radiography)",
    html
  );

  const inp = document.getElementById(
    "smartSearchInput"
  ) as HTMLInputElement | null;
  const resBox = document.getElementById("smartSearchResults");
  if (!inp || !resBox) return;

  inp.addEventListener("input", () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) {
      resBox.innerHTML = "اكتب أي كلمة مفتاحية للبحث السريع";
      return;
    }
    const matches: Array<{ page: number; topic: TopicItem }> = [];
    PAGES.forEach((p) => {
      p.topics.forEach((t) => {
        const blob = (
          t.titleEn +
          " " +
          t.titleAr +
          " " +
          t.segments
            .map((s) => stripHtml(s.enHtml) + " " + stripHtml(s.iqHtml))
            .join(" ")
        ).toLowerCase();
        if (blob.indexOf(q) !== -1) matches.push({ page: p.pageNumber, topic: t });
      });
    });
    if (!matches.length) {
      resBox.innerHTML = "لا توجد نتائج مطابقة لهذا المصطلح";
      return;
    }
    resBox.innerHTML = matches
      .map(
        (m) =>
          '<button type="button" class="search-result-item" data-sjump-page="' +
          m.page +
          '" data-sjump-topic="' +
          esc(m.topic.id) +
          '">' +
          '<div style="font-size:0.78rem; color:var(--turquoise); font-weight:800;">صفحة ' +
          m.page +
          "</div>" +
          '<div class="ltr" style="font-weight:800; color:var(--navy);">' +
          esc(m.topic.titleEn) +
          "</div>" +
          '<div style="font-size:0.86rem; color:var(--text-secondary);">' +
          esc(m.topic.titleAr) +
          "</div></button>"
      )
      .join("");
    resBox.querySelectorAll("[data-sjump-page]").forEach((b) => {
      b.addEventListener("click", () => {
        const pn = Number(b.getAttribute("data-sjump-page"));
        const tid = b.getAttribute("data-sjump-topic");
        closeLightbox();
        switchView("lecture");
        goToPage(pn);
        window.setTimeout(() => {
          const el = document.getElementById("topic-" + tid);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      });
    });
  });
}

function animateHeroCounters(): void {
  const qEl = document.getElementById("cntQuestions");
  if (qEl) qEl.setAttribute("data-counter", String(QBANK.length));
  document.querySelectorAll("[data-counter]").forEach((el) => {
    const target = Number(el.getAttribute("data-counter")) || 0;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 24));
    const timer = window.setInterval(() => {
      cur += step;
      if (cur >= target) {
        el.textContent = String(target);
        window.clearInterval(timer);
      } else {
        el.textContent = String(cur);
      }
    }, 22);
  });
}

function boot(): void {
  loadState();
  animateHeroCounters();
  updateGlobalProgressUI();

  document.getElementById("openDrawerBtn")?.addEventListener("click", openDrawer);
  document.getElementById("closeDrawerBtn")?.addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop")?.addEventListener("click", closeDrawer);
  document
    .getElementById("openSearchBtn")
    ?.addEventListener("click", openSearchLightbox);
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
    saveState();
  });
  document
    .getElementById("lightboxCloseBtn")
    ?.addEventListener("click", closeLightbox);
  document
    .getElementById("lightboxOverlay")
    ?.addEventListener("click", function (this: HTMLElement, e: MouseEvent) {
      if (e.target === this) closeLightbox();
    });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      closeDrawer();
    }
  });

  document.querySelectorAll(".nav-tab").forEach((b) => {
    b.addEventListener("click", () =>
      switchView(b.getAttribute("data-view") || "lecture")
    );
  });
  document.querySelectorAll("[data-drawer-view]").forEach((b) => {
    b.addEventListener("click", () => {
      closeDrawer();
      switchView(b.getAttribute("data-drawer-view") || "lecture");
    });
  });

  document
    .getElementById("prevPageBtn")
    ?.addEventListener("click", () => goToPage(state.currentPage - 1));
  document
    .getElementById("nextPageBtn")
    ?.addEventListener("click", () => goToPage(state.currentPage + 1));
  document.getElementById("resumeStudyBtn")?.addEventListener("click", () => {
    switchView("lecture");
    document
      .getElementById("lecturePageMount")
      ?.scrollIntoView({ behavior: "smooth" });
  });
  document
    .getElementById("quickGoQbankBtn")
    ?.addEventListener("click", () => switchView("qbank"));

  switchView(state.currentView);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
