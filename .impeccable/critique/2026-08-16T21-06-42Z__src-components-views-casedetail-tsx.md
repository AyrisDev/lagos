---
target: src/components/views/CaseDetail.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-16T21-06-42Z
slug: src-components-views-casedetail-tsx
---
Method: dual-agent (A: 0ac39c9e-af7a-4468-a859-ac3ec7f52397 · B: 41d632bf-6dca-4b45-a5e8-d48202dc17e0)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3.5/4 | Phased AI progress logs & status pills; silent 4s background sync polling |
| 2 | Match System / Real World | 4.0/4 | Flawless judicial vernacular (*Tensip, Celp, Müzekkere, Karara Çıkma, İlam, Beraat, CMK, HMK*) |
| 3 | User Control and Freedom | 2.0/4 | Document modal lacks `Esc` key dismiss; native `alert()` locks UI; no undo for clearing simulator |
| 4 | Consistency and Standards | 2.0/4 | Mixed styling: hardcoded dark `#0C1324` vs. stark `#F8FAFC` light paper sheet in summary; arbitrary font sizes |
| 5 | Error Prevention | 2.5/4 | "İfadeleri Getir" preview prevents wrong document selection; manual text input for client name in Strategy tab |
| 6 | Recognition Rather Than Recall | 3.0/4 | Strong document categorization; modal lacks side-by-side split view of OCR text vs. original document |
| 7 | Flexibility and Efficiency | 3.0/4 | Fast sorting/search & "Akıllı Görünüm" filter; lacks bulk actions and keyboard accelerators |
| 8 | Aesthetic and Minimalist Design | 2.0/4 | Visual noise: emoji saturation, neon accent borders, multi-hue chromatic overload |
| 9 | Error Recovery | 2.5/4 | Inline retry buttons are clear; heuristic fallbacks run silently on API failure without clarifying data provenance |
| 10 | Help and Documentation | 3.0/4 | Contextual AI tactical recommendations and digital margin notes guide procedural next steps |
| **Total** | | **28/40** | **Good (Foundation Strong, Polish Needed)** |

---

### Design Specificity Verdict

**LLM Assessment:**
`CaseDetail.tsx` possesses exceptional domain grounding in Turkish litigation procedure (HMK, CMK, İYUK, İİK). Rather than generic CRM abstractions, it models authentic legal artifacts: automatic procedural archetype detection (Criminal, Civil, Administrative, Execution), reasoned judgment banners (*Gerekçeli Karar*), contradiction mapping across investigative stages (*İfade & Çelişki Avcısı*), and UDF/UYAP compatibility. However, the interface suffers from a stylistic split between a high-tech "Cyberpunk HUD" (neon cyan `#00E699` glows, pulsating status pills, dark glassmorphism) and a traditional judicial workstation (dense tables, monochrome legal citations, stark white `#F8FAFC` paper sheets).

**Deterministic Scan:**
The automated detector (`detect.mjs`) flagged **5 distinct code-level antipatterns** across the case workspace:
- **Side-tab accent borders (`side-tab`)**: `src/components/views/CaseDetail.tsx:1521` (`border-l-4 border-l-[#3B82F6]`), `src/components/views/CaseDetail.tsx:2415`, `src/components/views/CaseCalendar.tsx:54`, `src/lib/utils.tsx:296`.
- **Layout transition thrashing (`layout-transition`)**: `src/lib/utils.tsx:543` (animating `width` instead of GPU-accelerated `transform: scaleX`).
- **Font stack saturation (`overused-font`)**: `src/app/globals.css` (Inter / Geist font stack).

---

### Overall Impression
A sophisticated and procedurally capable legal command center held back by micro-interaction friction (blocking `window.alert()` dialogs, missing keyboard shortcuts), navigation overload (12 uncurated sub-tabs), and token fragmentation.

---

### What's Working Well
1. **Procedural Legal Intelligence**: Dynamic branch adaptation (Criminal, Civil, Administrative) that surfaces relevant judicial milestones (*Tensip*, *Celp*, *Yürütmenin Durdurulması*, *Beraat*).
2. **"İfade & Çelişki Avcısı" Architecture**: Grouping contradictory statements by witness/suspect across procedural stages (Police vs. Prosecutor vs. Trial) matches trial attorney mental models.
3. **Phased System Feedback**: Transparent multi-step AI progress overlays (`AiLoadingOverlay`) keep attorneys informed during complex document analysis.

---

### Priority Issues

#### [P0] Hardcoded Dark Hex Values & Jarring Light Mode Inversion
- **Why it matters:** Dark hex codes (`bg-[#0C1324]`, `border-[#1E293B]`) are hardcoded across 50+ elements, while a stark white `#F8FAFC` card appears inside the "Yapay Zeka Özeti" tab (`line 1785`). This breaks light mode and causes severe contrast inconsistency.
- **Fix:** Replace all hardcoded hex values with semantic CSS variables (`bg-[var(--color-surface)]`, `border-[var(--color-divider)]`, `text-[var(--color-text)]`).
- **Suggested Command:** `/impeccable colorize src/components/views/CaseDetail.tsx`

#### [P1] Blocking Native `window.alert()` / `window.confirm()` Micro-Interactions
- **Why it matters:** Lines `1215`, `1224`, `754`, `866`, and `2560` trigger synchronous browser `alert()` dialogs for download notices and copy confirmations, freezing UI execution and breaking keyboard/screen-reader flow.
- **Fix:** Replace with non-blocking toast notifications (`toast.success("Metin kopyalandı")`) and inline modal dialogs.
- **Suggested Command:** `/impeccable harden src/components/views/CaseDetail.tsx`

#### [P2] Unstructured 12-Item Sub-Sidebar Navigation Overload
- **Why it matters:** Litigators face 12 flat, unchunked sub-tabs with equal visual weight, increasing cognitive scanning time.
- **Fix:** Group navigation into 3 semantic categories:
  - **Dava Yönetimi** (*Genel Bakış, Belgeler & Ekler, Dilekçeler, Duruşma & Süreler*)
  - **Yapay Zeka & Analiz** (*AI Özeti, Dosya Röntgeni, İfade Avcısı, Strateji, Arabuluculuk*)
  - **Etkileşim & Asistan** (*AyrisLegal'e Sor, Dijital Stajyer, Simülatör*)
- **Suggested Command:** `/impeccable layout src/components/views/CaseDetail.tsx`

#### [P3] Document Modal Usability & Accessibility Gaps
- **Why it matters:** The document viewer modal lacks an `Escape` key listener, focus trap, and in-modal text search, slowing down rapid document inspection.
- **Fix:** Implement accessible dialog attributes, keyboard shortcuts (`Esc` to close, `Cmd+F` to search within OCR text), and a side-by-side view of extracted text alongside the document.
- **Suggested Command:** `/impeccable harden src/components/views/CaseDetail.tsx`

---

### Persona Red Flags

- **Alex (Senior Litigator / Power User):** Cannot quickly close the document viewer with `Esc`; blocked by native `alert()` modals when copying excerpts in court; lacks bulk document actions.
- **Jordan (First-Year Associate / Stajyer Avukat):** Overwhelmed by 12 ungrouped sidebar tabs; confused by having to type the client's name manually in the Strategy tab when `parties` data is already present.
- **Sam (Accessibility-Dependent / Low-Vision User):** Small uppercase metadata tags (`text-[10px]` in `#64748B` on `#080D1A`) fail WCAG 2.2 AA contrast (3.2:1); top-right action buttons lack `aria-label`.

---

### Minor Observations
- **Emoji Overload:** Emojis are used simultaneously as navigation icons, section prefixes, and card bullets. Replacing secondary emojis with clean SVG icons will sharpen the enterprise feel.
- **Client Input Redundancy:** In the Dava Stratejisi tab (lines 2056-2063), a freeform text input is used for `Müvekkil adı...` instead of a pre-populated selector from `caseRow.parties`.
- **Silent Background Polling:** The 4000ms document polling interval operates silently without a background sync indicator.

---

### Questions to Consider
1. *Should the layout evolve into a persistent split-screen workspace (Evidence Viewer on Left, AI Workbench on Right) to eliminate context switching?*
2. *How should heuristic/template fallbacks be visually distinguished from live LLM synthesis to protect against legal reliance risks?*
3. *What visual balance best projects technological sophistication without sacrificing judicial dignity during courtroom proceedings?*
