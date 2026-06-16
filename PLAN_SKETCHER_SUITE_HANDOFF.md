# PLAN SKETCHER SUITE — SESSION HANDOFF
*Updated: 2026-06-16 (rev 30 — **TEXT SCALE control added to the Plan Sketcher toolbar.** A new **View ▸ Text** dropdown (`1×` · `0.75×` · `0.5×` · `0.25×`, default `1×`) shrinks the on-plan label text (wind-load plf, dimensions, reaction "rocket" chips, the draw-mode live length, the imbalance flag) so labels don't blanket a zoomed-out large plan. Implemented as a `textScale` state threaded as a `ts` prop into the `Tag`/`WindLoad`/`Reaction` sketcher visuals (+ two inline canvas texts); **default `ts=1` is byte-identical to before**, so every existing call site is unaffected. Persisted in the `.wps` sketcher session (forward-compatible: old files → `1`). **Engine + the guarded fns byte-identical (guard CLEAN — all 10 engine/stacking fns verified identical).** `APP_BUILD = 111` ("Version 1.11"). See the rev-30 blockquote + §4ee.** Prior current rev — rev 29 — **DEPLOYED TO VERCEL** (Vite host scaffold; no app-code change); see the rev-29 blockquote + §4dd. Step 7a = the secondary detailing (anchor · embed · strap · deflection · footing) is re-derived from the stacked demand; Step 7c = a 25-assert stacking regression test; Step 7b = a frozen two-story `.wps` fixture + 31-assert round-trip load test + a schema tripwire locking the two-story field names (`H2`, `twoStory`, `activeFloor`, `linesByFloor`). All test/fixture infra is checked in; 7b made NO app-code change (persistence already worked). Engine + the 7 guarded fns byte-identical throughout.) · File: `plan-sketcher-suite.jsx` (~4,036 lines, single file, default export `App`)*

*Prior: rev 26 — Steps 1–5 of two-story (UI scaffold, `H2` model, two line loads, `SecDiagram2`, floor-aware on-plan loads + two-floor design). rev 25 — User-facing "Version X.XX" in the top bar. rev 24 — Design-data forward-compat + stale-line recovery + schema guards.*

> **rev 30 — TEXT SCALE control on the Plan Sketcher toolbar (user-requested).** On a large plan zoomed out, the on-plan labels stay a roughly constant *screen* size (their fontSize is `1.35·S`, and `S = max(view.w,view.h)/110` grows as you zoom out), so the text ends up blanketing the small drawing. Fix: a **View ▸ Text** `<select>` (`1×`/`0.75×`/`0.5×`/`0.25×`, default `1×`) drives a new `textScale` state that multiplies the font size of every on-plan label. **Surface (all sketcher-canvas text, nothing in the wind-window modal or section diagrams):** `Tag` (dimension boxes + the reaction-rocket chip — font AND box scale together so the chip shrinks, not just its glyphs), `WindLoad` (the `… plf` label), `Reaction` (its `Tag`), plus the two inline canvas texts — the draw-mode live length (`{L}′`) and the `⚠ imbalance` flag. Each got a `ts=1` prop / `*textScale` factor; **`ts` defaults to 1, so every pre-existing call site and the SSR smokes render byte-identically to rev 29.** Drawing geometry (arrows, strokes, nodes, boxes' *positions*) is untouched — only text size (and the `Tag` box that wraps text) responds. **Persistence:** `textScale` rides in the sketcher `.wps` session (`get()` adds it; `set()` restores via `if("textScale" in s)` → old files default to `1`). This is sketcher session-UI, NOT part of `loadProject`'s `ui`/`design`/`calc` schema, so the schema tripwire is unaffected. **Engine guard CLEAN** — `calcSegment`, `generateDesign`, `lineReactions`, `buildSecData`, `findLeewardPartner`, `lineResults`, `stackSeg`, `stackedLineResults`, `upliftStk`, `withUtil` all byte-identical (verified by extract-and-diff). Verification: esbuild compile, comment-lexer clean, SSR render smoke (Text group + all four options + View/Stories intact), and a focused component test (Tag fontSize 13.5→6.75 at ts .5, box width shrinks, omitted-`ts`≡1, Reaction 3.375 at ts .25). Current build: `APP_BUILD = 111` ("Version 1.11").

> **rev 29 — DEPLOYED TO VERCEL (Vite host scaffold; NO app-code change).** The app is now a deployed static site (GitHub web UI → Vercel auto-deploy). To make the single-file React component buildable by Vite, a thin host shell was added AROUND it — the app jsx itself is byte-identical (engine + the 7 guarded fns untouched, `APP_BUILD` still 110 = "Version 1.10"). **Files (the deployable repo, see §4dd for full contents):** `index.html` (Vite entry — mounts `#root`, loads `./main.jsx`, plus a 4-line `html,body{margin:0}` host reset because the app's roots size to `calc(100vh − 46px)` and it never resets default body margin → avoids a gutter; the reset lives in the SHELL, not the app file) · `main.jsx` (imports `react` + `react-dom/client`, imports `App` from `./plan-sketcher-suite.jsx`, mounts under `React.StrictMode`) · `package.json` (deps `react`/`react-dom` ^18.3.1, dev `vite` ^5.4.10 + `@vitejs/plugin-react` ^4.3.4, version "1.10.0", scripts dev/build/preview) · `vite.config.js` (just the React plugin) · `.gitignore` (node_modules, dist, .vercel, …). **Why this is all it needs:** the only real `import` in the app is `react` (the `…xlsx` hits are inside comments); no CSS-file imports (all styling is injected `<style>` strings; IBM Plex loads from Google Fonts at runtime); no `import.meta` / `process.env`; no `ReactDOM` inside the app file — so the shell just has to mount it. **No `vercel.json` is required** — the app navigates via internal tab state (no react-router / URL routes), so there's nothing to rewrite. **Vercel settings:** auto-detected Vite — Build `npm run build`, Output `dist`, Install `npm install` (no overrides). **⚠ Actual repo layout is FLAT** (all files at repo root; `index.html` loads `./main.jsx`; `main.jsx` imports `./plan-sketcher-suite.jsx`) — note the rev-29 chat *prose* sketched a `src/`-nested layout, but the delivered zip is flat and is the source of truth. **Handoff sync gap closed:** this rev also adds the previously-missing step of committing THIS handoff MD into the repo alongside the code (it had been left out of the first push). **STILL OPEN — the one live sign-off:** preview the stacked 1st-floor detailing + a two-story `.wps` save/open on the live Vercel URL to close out the Step-7 two-story feature. Current build: `APP_BUILD = 110` ("Version 1.10").

> **rev 28 — TWO-STORY: STEP 7a/7c — SECONDARY DETAILING WIRED TO THE STACKED DEMAND + REGRESSION LOCK (landed).** Step 6 stacked end post + uplift + holdown; rev 28 extends the same arm-aware stacking to the rest of the 1st-floor detailing: **anchor (`anchorSel`/`anchorEnd`), embedment (`embed`/`embedEnd`), straps (`altStrap`/`strapCorner`, via a stacked `upStrap_*`/`maxStrap` at the E56/E57 denominator of 3″), deflection (`deflW`/`deflS`) and footing (`reqFtgLen`/`LminS`/`LminW`)** now all derive from the stacked moment/uplift. Done by mirroring `calcSegment`'s own `anchorFor`/`embedFor`/`strapFor`/`defl`/footing-quad formula shapes inside `stackSeg` — **the 7 guarded engine fns stay byte-identical (guard CLEAN).** `stackSeg`'s signature became `(r1, r2, L, g, d, h)` so it has the species/grade/anchor/footing/height it needs; `stackedLineResults` passes `line1.heightFt` as `h`. **Deflection note:** the shear `v` is unchanged (the 1st-floor story shear was already carried by Step 5's combined load); only the chord/bending term uses the STACKED (≥) end post, so a stacked wall with a bigger required chord reports a *smaller* 1st-floor inter-story Δ — the as-built behavior (flagged in the UI note). **Footing** uses the stacked moments/uplifts with the 1st-floor's own dead load + base shear (`r1.B`/`r1.BwDL`/`r1.CwDL`/`r1.Fs`/`r1.Fw`), the same dead-load convention Step 6 set. The Design-tab note was rewritten — it no longer says anchor/strap/deflection/footing are unstacked; it now states every row reflects the stacked demand and explains the Δ behavior. **Calc-sheet interaction (unchanged, by design):** "Send line to calculation sheet" (`applyToCalc`) still sends only geometry + selType + `forceLbs`; the Calculation tab remains a single-line/single-floor view and does NOT apply moment stacking — stacking lives only in the Design tab's `resultsByLine`. Regression: new checked-in `work/test_stacking_step7.cjs` (25 asserts: §4aa 160 k·ft/16,203-lb example; exact discrete buckets HDU5→SSTB24→Simpson + STHD14/None strap on a 5000-lb stacked uplift; end-to-end via `stackedLineResults` with real engine floors + monotonic relations stacked-vs-single + top-floor-no-stack). **Step 7b (landed, same rev):** a frozen v2 two-story fixture (`work/fixtures/fixture_v2_2story.wps`), a 31-assert round-trip test (`work/test_loadstate_2story.cjs`) proving `H2`/`linesByFloor`/`ui.twoStory`/`ui.activeFloor` survive the pure `loadProject`/`mergeWallProps` core (+ v1 back-compat, newer-version, and stale-line paths), and a schema tripwire (`work/test_schema.cjs` + `work/fixtures/schema.expected.json`) that fires on any rename/add/remove of a schema-bearing default field — verified to trip on a simulated `H2`→`h2` rename. 7b is test/fixture infrastructure only; persistence already worked, so the jsx is unchanged. **Step 7 is COMPLETE** (the two-story feature, Steps 1–7, is feature-complete pending live sign-off). Current build: `APP_BUILD = 110` ("Version 1.10").

> **rev 27 — TWO-STORY: STEP 6 ARM-AWARE VERTICAL LOAD STACKING (landed).** The 1st-floor shear walls now carry the upper story's overturning with the correct moment arm. Because Step 5 already handed each floor the right force AND design height, the arm-aware base moment is exactly the SUM of the two floors' engine overturning moments for the same vertically-aligned segment: **M_base = Mot(1st) + Mot(2nd)** (e.g. roof 5k @ 20ft + 2nd-floor 6k @ 10ft over a 10ft wall → (5·20+6·10)/10 = **16k**, NOT a flat 11k). End post + holdown (+ a new "Overturning M · stacked" row and an explanatory note) are re-derived from that combined moment in a post-process wrapper (`stackedLineResults`/`stackSeg`/`upliftStk`) that mirrors the engine's own formula shapes — **`calcSegment`/`lineResults` and all 7 guarded fns stay byte-identical** (the new helpers are separate functions; engine guard CLEAN). Shear/nailing are unaffected (the combined shear was already carried by Step 5's 534-level load). Only the 1st floor in 2-story mode stacks; the 2nd floor and 1-story mode use plain `lineResults`, unchanged. Scope note (flagged in the UI + below): anchor / strap / deflection / footing rows still show the single-floor 1st-story demand — wiring those to the stacked uplift folds into Step 7. PENDING · Step 7 persistence/regression/finalize. Current build: `APP_BUILD = 109` ("Version 1.09").

> **rev 26 — TWO-STORY WOOD SHEAR WALL DESIGN (Steps 1–5).** Adding a simple two-story option (the building's two floors share one footprint + shear-wall layout, so they stay identical and vertically aligned; the upper story's load transfers down). Engine (`calcSegment` + the 7 guarded fns) stays byte-identical throughout — all new structural logic lives OUTSIDE the engine. Built step-by-step with the user testing each in the live preview before the next. Landed (see **§4z**): Step 1 (build 101–102) 1-Story/2-Story sliding pill + below-canvas floor selector · Step 2 (build 103) per-wall 2nd-story height `H2` data model · Step 3 (build 104) the two diaphragm line-load formulas (roof + 2nd-floor) shown live in the wind window · Step 4 (build 105–106) two-story section-cut elevation (`SecDiagram2`) with both diaphragm callouts + full windward/leeward height parity · Step 5 (builds 107–108) on-plan loads floor-aware (`propsForActive`) + BOTH floors designed and switchable in the Design tab (`designLinesByFloor` + a greyed-until-2-story floor switcher; shared `segsByLine`).

---

## 0. START HERE — how to resume this project (read me first)

**This project = the app + this handoff + the engine guards + the deploy scaffold:** `plan-sketcher-suite.jsx` (the app) · this handoff · `test_str1_golden.mjs` + `test_str1_design.mjs` (engine guards) · the rev-29 Vite host shell (`index.html` · `main.jsx` · `package.json` · `vite.config.js` · `.gitignore`, see §4dd) that makes it deployable · and separately `STRUCTURAL_SUITE_UI_THEME.md` (a *different* task — see bottom). **The whole repo (app + scaffold + this handoff) is what's committed to GitHub → Vercel.**

**Standing rules for every session (do these automatically, without being asked):**
- **Preview on resume.** As soon as you've read this handoff, preview the current `plan-sketcher-suite.jsx` in chat — copy it to `/mnt/user-data/outputs/` and present it so it renders as a live artifact — *before* writing the state summary and waiting for a task. The user wants to see the live app at the start of every session.
- **Run the test harness ONCE per chat, at the start.** After the preview, set up the harness (§6b) and run it a single time at the **beginning of the session** on the current code to establish a clean baseline (build + comment-lexer + render smoke + the engine byte-identity guard + whatever targeted suites exist). **Do NOT re-run the full sweep after every individual edit** — that burns tokens. Per change, the minimal guard is: esbuild compile, the engine byte-identity check (cheap, pure-Python), and a focused render/headless smoke for the *specific* thing you touched. Snapshot the engine baseline (`cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx`) as part of that one session-start run, before your first edit.
- **Handoff tracks code.** Any time the app is updated, update this MD in the **same session/response** as the code. That means: bump the rev line at the very top, add a new `§4*`-style rev subsection describing the change (additive/invariant tone, like the existing ones), update the rev number inside the §0 resume prompt, and adjust "Where rev N left off" / "Open items". Never hand back updated code with a stale handoff — the two always ship together.
- **Version bump.** On every app update, increment `APP_BUILD` by 1 at the top of the jsx (rev 25 introduced it at 100 = "Version 1.00", shown in the top bar). It rolls 199→"2.00" by construction. This is the user-facing version ONLY — never touch `CURRENT_VERSION` (save-file schema) to bump the display.

**Save-file status (as of rev 29):** the app is now **deployed to Vercel (rev 29)**, but the Save/Open (`.wps`) feature **has not been used in anger yet** — so **no real save files exist in the wild that could break.** The rev 23–24 forward-compat work and the save-file regression guards are therefore *pre-emptive insurance*, not protecting live data. Practical consequence: when adding fields, you still want the merge-on-defaults discipline so a future save round-trips, but you do **not** need to treat "an old `.wps` won't load" as a live-fire risk yet. (This stops being true the moment someone saves a real `.wps` from the live site — once the two-story sign-off below happens, assume real files may start to exist.)

**To keep building:**
1. **Push the latest code to GitHub** (web UI → Vercel auto-deploys) so your live app matches this file's rev. The repo holds the app + the rev-29 Vite scaffold (§4dd) + THIS handoff — commit all three together (the handoff was missing from the first push; rev 29 closes that gap). Every push to `main` auto-redeploys on Vercel.
2. **Open a NEW Claude chat, attach `plan-sketcher-suite.jsx` + this handoff**, and paste:
   > Continuing development of my Plan Sketcher / Shear Wall Suite. Attached: the current app (`plan-sketcher-suite.jsx`, rev 30) and `PLAN_SKETCHER_SUITE_HANDOFF.md`. Read the handoff fully first. Key points: single-file React 18 + Vite app, default export `App`, deployed to Vercel via a thin host scaffold (§4dd — `index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`) that wraps the app WITHOUT touching it; the calc engine is a faithful port of a Struware-style spreadsheet and must stay byte-identical unless I explicitly approve a formula change; my workflow is GitHub web UI → Vercel (no terminal), so give me complete copy-paste-ready files. §6b has the full test harness — set it up and run it ONCE at the start of the session (build + render smoke + engine guard), and snapshot the engine baseline before your first edit (`cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx`). After that, don't re-run the whole sweep on every edit — per change, just compile + the engine byte-identity check + a focused smoke for what you touched. Per the §0 standing rules: after reading the handoff, preview the current jsx in chat (render it as a live artifact), and update this handoff in the same response as any code change. Confirm you've read the handoff, preview the current `plan-sketcher-suite.jsx`, give me a one-paragraph summary of the current state, then wait for my task.
3. **Describe what you want changed.** For visual tweaks, paste a screenshot of the live UI — that gets the best results.

**Tests:** the two `.mjs` engine guards are kept as ready-to-run files (they protect the calculations). **Checked-in save-file guards (rev 23–24):** `test_loadstate.cjs` (real-file load regression) · `test_schema.cjs` + `schema.expected.json` (a tripwire that fails if a defaulted field is renamed/removed) · `test_migrate_ladder.cjs` (proves the version-migration mechanism) · frozen fixtures `fixture_v1.wps` / `fixture_v2.wps` / `fixture_v2_design.wps` / `fixture_v2_stale.wps`. They all `require` a `work/exp.cjs` bundle built from a temp-export copy of the app (see §4w/§4x for the one-liner). The 8 UI/SSR `.cjs` suites aren't shipped as files — their full source is in **§6b** and a new chat regenerates them on demand.

**Where rev 30 left off (TEXT SCALE):** the Plan Sketcher toolbar has a new **Text** group (between **View** and **Stories**) with a `<select className="rsel">` offering `1×`/`0.75×`/`0.5×`/`0.25×` (default `1×`). It sets `textScale` (PlanSketcher state, declared beside `snapOn`/`ortho`/`dims`), which flows as `ts` into `Tag`, `WindLoad`, `Reaction` and multiplies the two inline canvas texts (draw-mode length, imbalance flag). Lower values shrink the on-plan labels (and the `Tag` chip boxes) so they stop covering a zoomed-out plan; drawing geometry is unchanged. Saved/restored in the `.wps` sketcher session. App-code change is confined to UI (build const, CSS `.rsel`, the three sketcher-visual components, PlanSketcher state/JSX/session) — **engine + the guarded fns byte-identical (all 10 engine/stacking fns verified identical).** Build `APP_BUILD = 111` ("Version 1.11"). NEXT: deploy (push the jsx + this handoff to GitHub → Vercel) and, still outstanding from rev 29, the two-story live sign-off on the Vercel URL. Minor judgment call to revisit if the user dislikes it: the draw-mode *live length* readout also obeys `textScale`, so at `0.25×` it gets small while drawing — exempting it is a one-line change (drop `*textScale` on that single inline text) if preferred.

**Where rev 29 left off (DEPLOYED):** the app is live on Vercel. The rev-29 change was infrastructure only — a Vite host shell (`index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`, §4dd) wrapped around the byte-identical app jsx; engine + the 7 guarded fns untouched, `APP_BUILD` still 110. No `vercel.json` (no URL routing — tab state only). Repo layout is FLAT (all files at root; `index.html` → `./main.jsx` → `./plan-sketcher-suite.jsx`). The handoff MD itself is now committed into the repo (it was omitted from the first push; this rev fixes that). **THE ONE OPEN ITEM is still the two-story live sign-off:** the user previews the stacked 1st-floor detailing AND a two-story `.wps` save/open on the live Vercel URL and confirms. Once that's signed off, the Step-7 two-story feature is closed and it's open season on the §10 wishlist (PDF/report export, footings UI, per-line design constraints, mobile on-diagram input ergonomics). Note: the first real `.wps` saved from the live site retires the "no save files in the wild" assumption — see the §0 save-file status note.

**Where rev 28 left off (TWO-STORY feature — Steps 1–7 COMPLETE):** the single-story app is unchanged when the pill is on "1 Story". In "2 Story" mode: a sliding pill toggles the mode; a floor selector sits in its own bar below the canvas; each wall carries a 2nd-story height `H2`; the wind window draws the two-story elevation (`SecDiagram2`, editable windward+leeward 1st/2nd-story heights) and shows both diaphragm line loads (roof = ½·H₂·pw + parapets → 2nd-floor walls; 2nd-floor = ½·H·pw + ½·H₂·pw + roof → 1st-floor walls; example 350 / 534 plf); on-plan loads/reactions switch with the floor selector; the Design tab carries BOTH floors' designs with a floor switcher (shared/aligned shear-wall positions). When viewing the **1st floor** in 2-story mode the design is **fully stacked** — end post, uplift, holdown (Step 6) AND now **anchor, embedment, straps, deflection, and footing** (rev 28 / Step 7a) are all re-derived from the **arm-aware combined overturning** M_base = Mot(1st)+Mot(2nd) (roof reaction at H₁+H₂; 5k@20ft + 6k@10ft / 10ft wall → 16k, ~16,203 lbs). The "Overturning M · stacked" row + the (rewritten) note show on the 1st floor only. Shear/nailing unchanged; deflection's `v` unchanged but its chord term uses the stacked (stiffer) post, so 1st-floor inter-story Δ can read smaller. The Calculation tab stays single-line/single-floor (no stacking) by design. Stacking math is regression-locked in `work/test_stacking_step7.cjs` (25 asserts); two-story persistence is locked in `work/test_loadstate_2story.cjs` (31 asserts) + `work/test_schema.cjs` (15 asserts, fires on any default-field rename incl. `H2`/`twoStory`/`activeFloor`/`linesByFloor`). **STEP 7 IS COMPLETE — the whole two-story feature (Steps 1–7) is feature-complete and verified, pending the user's live sign-off in the deploy.** NEXT: (1) user previews the stacked 1st-floor detailing + a two-story save/open on Vercel and signs off; (2) then it's open season on the §10 wishlist (PDF/report export, footings UI, per-line design constraints, mobile on-diagram input ergonomics) — confirm which the user wants next. The two-story `KNOWN LIMITATION` from Step 5 still stands and is acceptable: per-segment MANUAL overrides in `segsByLine` (holdown/nailing/post) are shared across floors; the AUTO design already differs per floor (and now stacks on the 1st). See **§4z** (Steps 1–5), **§4aa** (Step 6), **§4bb** (Step 7a/7c), **§4cc** (Step 7b) for the full feature log + the stacking-statics derivation.

**Where rev 25 left off:** pinned ribbon + Clear (rev 5/7) · Structural I sheathing (rev 6) · dead-load inputs + grouped pinned constraints (rev 7) · compact controls (rev 8) · design-system pass (rev 9/10) · constraints panel as inline aligned fields (rev 11) · vertical-wall reaction label as a rocket (rev 12) · shear-wall plan symbol as a detail-bubble (rev 13) · editable leeward wall height + sloping roof line (rev 14) · Wall-height row on the Design table (rev 15) · Design height H→h + section-cut parapet line-with-node (rev 16) · tab order Plan · Design · Calculation (rev 17) · re-entrant interior walls take point loads + equal-plf labels merge (rev 18) · CAD navigation: wheel-zoom / middle-drag pan / ⊡ Fit (rev 19) · Canvas menu: Draw · Pan · Zoom (rev 20) · Canvas menu reachable mid-draw (rev 21) · full session restore (§4v, rev 22) · save-file forward-compat (§4w, rev 23) · Design-data forward-compat + stale recovery (§4x, rev 24) · user-facing "Version X.XX" in the top bar (§4y, rev 25). Struware shear engine byte-identical throughout; the wind **reaction** model changed once, deliberately, in rev 18 (see §4r); rev 19–26 are view/UI/serialization only (engine byte-identical, see §4s–§4z).

**Open items to pick from (full detail in §7):** PDF/report export · footings UI placement · per-line design constraints (currently global) · mobile ergonomics of on-diagram inputs · dash highlight only on the selected design line · `.wps` stores **inputs+geometry+session-UI** and is now forward-compatible against ADDED fields across `g`/`d`/`segments`/per-wall props/`lines`/placed segments (rev 23–24), but still stores no **derived results / optimizer `meta`** — optionally persist those for an engine-independent archive · **renames + unit/semantics changes are still NOT auto-handled** — they need an explicit `MIGRATIONS` step + a frozen old-version fixture; the schema tripwire (`test_schema.cjs`) + the migration checklist (§7) enforce the discipline.

**Do NOT mix in `STRUCTURAL_SUITE_UI_THEME.md`** — that file is for applying this app's *look* to a **different** app, used in its own separate chat. It is not part of building this app.

## 1. What this app is

A merged React app (one JSX file, rendered as a Claude artifact, deployed via GitHub web UI → Vercel) with **three tabs** (left→right, sheet numbers S-1/S-2/S-3): **Plan Sketcher · Design · Calculation Sheet**.

1. **Plan Sketcher** — dark-theme SVG plan editor. Draw a building footprint (straight walls only, 1 unit = 1 ft), drag wind sections across it, and it computes ASCE-style wind **line loads (plf)** on windward walls and **point-load reactions (kips)** on walls parallel to the wind, via simply-supported beam statics.
2. **Design** — plan-view shear-wall designer fed by the sketcher. Each point-load wall arrives as a "line" (length, wall height H, reaction lbs). Per-line optimizer (`generateDesign`), drag-in-plan shear walls with live recalc, right-click overrides (holdown / edge nailing type / end post) validated against engine capacities.
3. **Calculation Sheet** — verbatim port of "Plywood Shear Wall — Wood Studs.xlsx" (engine `calcSegment` is character-identical to the source app). **Now styled LIGHT, 1:1 with the standalone calculator**: paper page + white sheet w/ ink border, light title block w/ ⎙ Print button, compliance banner (clickable per-wall verdicts), D/C utilization bars, collapsible sections w/ fail badges, sticky row labels, zebra/hover, column highlight (click SW-n header / elevation wall / banner chip), formula-cell tooltips on row labels. **Do not change its logic or row labels without asking the user.**

The user (licensed PE/SE) replaces commercial spreadsheets (Struware) with these tools. **Rule from the user: never delete existing functionality — ask first. Additions only unless instructed.**

## 2. Architecture map (by section in the file)

| Region | Contents |
|---|---|
| top | geometry helpers: `keyOf`, `norm`, `same`, `edgeAxis`, `dist`, `clamp`, `segInt`, `niceStep`, `fmt1/fmt2`; `WORLD=4000` (coords span **−WORLD..+WORLD**, origin arbitrary) |
| ~100–330 | **load engine**: `findLeewardPartner`, `lineReactions` (beam statics), `buildSecData` (windward grouping, leeward-region subdivision, dashed divides, reactions agg — **reactions carry `key`**, `baseShear`) |
| ~480–630 | sketcher visuals: colors `C_BG/C_WALL/C_NODE/C_LOAD/C_REACT/...`, `Tag`, `WindLoad` (renders per-region `subLoads`), `Reaction`, `SecDiagram`, `WindWindow` |
| ~640–1140 | `PlanSketcher({ onDesignShearWalls, fileOps, registerProject })`: state, history/**future** (redo), draw mode, LENGTHEN dim editing, view fit/freeze/**auto-expand**, pointer handlers, `runDesignHandoff` |
| ~1150–1450 | sketcher JSX: header, **ribbon toolbar**, canvas (grid, walls, divides, loads, reactions, rubber band), side panel (cards unchanged + design button), **status bar**, `WindWindow` mount |
| ~1500–1810 | shear-wall module: `SCHEDULE/CODES/HD_TABLE`, **`calcSegment` (verbatim — don't touch)**, `generateDesign`, dark theme `SW`, `Chip/Row/SectionTitle/NumInput/SwField/selStyle/swBtn` (**used by Design tab only now**), dark `Elevation` (currently unused, kept) |
| ~1810–2130 | **LIGHT calc-sheet module** (namespaced `Lt*`/`LT` — collision-free with dark set): `withUtil(r,seg)` (derives `utilW/utilS/utilPost/utilHD/pass` WITHOUT touching the engine), `LT` palette, `LT_CSS` (`.sw-table` sticky/zebra/hover/`.sw-hl`, focus rings, `@media print .no-print`), `LtChip/LtUtilBar/LtRow/LtSegHeader/LtCollapse/LtNumInput/ltSel/LtComplianceBanner/LtElevation`, `HL` context (`React.createContext` — react import not widened), `CalcSheet` (light, 1:1 body from standalone rev; consumes **util-augmented** results) |
| ~1950–2400 | Design tab: `lineResults` (auto type + override validation: `postAllowable`, `hdCapacity`), `DesignPlan` (plan canvas, drag, ctx menu trigger), `SwCtxMenu`, `DesignTab` |
| ~2780–end | **`App` shell**: tabs (Calculation tab now carries a green/red pass dot from `calcOK`), shear globals `g` + calc `segments`, `resultsU = results.map(withUtil)` + `hlSel` column-highlight state, **`calcSheetPage`** (light page: `LT.paper` bg, white sheet, light title block + Print, `<style>{LT_CSS}</style>`, `HL.Provider` wrapping `CalcSheet results={resultsU}`) and **`designSheet`** (dark wrapper, unchanged styling, DesignTab only) replacing the old shared `sheetTab`; **.wps save/open/new**, `applyToCalc`, sketcher kept mounted (`display:none`) so plan survives tab switches. Suite tab bar has `className="no-print"`. |

## 3. Core data model (critical to not regress)

- **Wall props** `wallProps[edgeKey] = { H, pw, qWind, qLee, par }` — **one parapet `par` per physical wall** (legacy `parW` auto-migrated in `propsFor`). The leeward parapet term is **read live from the actual back wall** via `findLeewardPartner(windKey, axis, sign, graph, sAt)`; `sAt` = across-wind cut position so split back walls resolve to the segment behind *this* cut. **(rev 14) The leeward *wall height* is handled the same way**: it is the back wall's own `H`, surfaced in the section-cut window as `activeSection.leeH` and edited via `setVals("lee",{H})`. No new stored field — each physical wall keeps one `H`, so reversing the wind/cutting from the other side just swaps roles and the heights stick. The leeward wall height feeds the **elevation diagram only** (sloping roof); it does **not** enter this wall's plf (the windward `H` drives the line load — the back wall's `H` drives *its* line load when it is the windward face).
- **plf formula** per windward region: `0.5·H·pw + par·qWind + leePar(region)·qLee`. A windward wall is **subdivided where the back wall changes** (`buildSecData` → `w.subLoads`, dashed `divides`, true `baseShear`). The dashed `divides` are drawn only where plf actually changes; **rev 18** makes the on-plan plf *label* match — `WindLoad` coalesces consecutive equal-plf sub-spans into ONE label, so two values appear only when the load genuinely differs (e.g. a 374|462 south wall), never as a duplicated 374|374.
- **Reactions**: collinear windward segments group into a *line*; the line is a beam on the point-load (support) walls; per-bay simply-supported statics (`W·(TL−X)/TL`), loads split at interior supports, **overhangs → nearest support**. Splitting a wall with equal props never changes reactions (invariant, tested). A wall qualifies as a support if it runs parallel to the wind, sits within the line's across-wind span, and is **at or downwind of the windward face** (`lineReactions`, rev 18) — it need NOT span all the way back to the windward depth, so a **re-entrant interior wall** (the step wall of an L, a notch wall) acts as an interior support exactly like a full-depth interior wall. Only walls entirely *upwind* of the windward face are rejected (they belong to a deeper windward line in a concave footprint).
- **Elevation window**: opens on the exact windward segment the cut crosses (lowest-`t` hit); a valid cut must cross **≥2 across-wind walls**. Reverse flips sign and re-opens the segment at the same across-wind position. `setVals("self"|"lee", patch)` writes to the wall the value physically belongs to.
- **Design handoff** (`runDesignHandoff`, shared by card + ribbon buttons): per reaction (kips>0) → line `{id:"ax|key", key, windAxis, o, a, b, lengthFt (full collinear extent), heightFt (max H along it), forceLbs (kips×1000)}` + a frozen copy of the footprint. Parapets are **not** sent.
- **Design engine per line**: `lineResults(line, segs, g, d)` runs `calcSegment` with `gLine={...g, wWind:line.forceLbs}`, `totalL = Σ seg lengths on the line`. Overrides per seg `s.ov = {type?, hd?, post?}`; NG flags via `hdCapacity` (uplift ≥ cap) and `postAllowable` (comp > Pa, thin-wall 4x6 = `Pa46·3.5/5.5`). Constraints `d` are **global across lines** (deliberate; per-line constraints = possible future ask).

## 4. UI features added this session (all additive)

- **Ribbon toolbar** (in PlanSketcher, above canvas): File (New/Open/Save), Edit (Undo/**Redo**/Clear), Draft (✏ Draw / ⌗ Snap / ∟ Ortho / ⟷ Dims toggles), View (⊡ Fit / + In / − Out), **Text (on-plan label-size dropdown 1× / 0.75× / 0.5× / 0.25× — rev 30, §4ee)**, Stories (1-Story/2-Story pill), Analyze (⚡ Design shear walls — disabled until reactions exist). Presets live in the side panel (deduped out of the ribbon, rev 5). Side-panel cards otherwise intentionally duplicated, not removed.
- **Status bar** (below canvas): live cursor X/Y in ft (gated setState), mode badge `SELECT` / `DRAW · chaining`, clickable SNAP/ORTHO flags, right side = walls · total ft · E–W/N–S base shears.
- **Draw mode**: polyline clicking; node snap (radius `2.4·S`, cyan ring, **beats ortho** — CAD osnap) closes loops exactly; ortho locks H/V from anchor; grid snap; yellow dashed rubber band with live length; right-click ends chain, Esc ends chain then exits mode; duplicate edges rejected; each placement undoable. While ON, all clicks place points (drag/cut/dim-edit suspended).
- **LENGTHEN dim editing**: end nearest the click moves (`t` projection, ±10% midband → anchor the **higher-degree** node); `applyWallLength(edge, len, moveEnd)`; ortho propagation follows the moved end.
- **View**: auto-fit; frozen during drags; **auto-expands** (`expandViewTo`, pointer+5% margin) so one gesture reaches any distance; pointer capture keeps drags alive outside the SVG.
- **Shortcuts**: Ctrl+S/O save/open, Ctrl+Z undo, Ctrl+Shift+Z or Ctrl+Y redo, Esc/Delete as before.
- **.wps project file** (version 1): `{app:"plan-sketcher-suite", version:1, savedAt, sketcher:{graph, wallProps, noSupport[], sections, nextId}, design:{lines, shape, segsByLine, d}, calc:{g, segments}}`. Sketcher registers `get/set` via `registerProject`; shell owns Blob download / FileReader open / New (confirm). Open restores everything and clears undo/redo.

## 4b. Calc-sheet restyle session (rev 2) — invariants

- **Engine + Design tab byte-identical** to rev 1 (verified by function-text diff: `calcSegment/generateDesign/evaluateCandidate/baseDesignSeg/lineResults/buildSecData/lineReactions/PlanSketcher/DesignTab/DesignPlan/SwCtxMenu` all UNCHANGED).
- Light components were extracted **mechanically from the standalone app file** with word-boundary renames (`C.→LT.`, `Chip→LtChip`, …) — keep using that approach for future 1:1 syncs rather than retyping.
- `withUtil` is the only new logic: D/C ratios at the SELECTED type, post capacity from `r.Pa` (NG! → largest available; thin-wall 4x6 = `Pa46·3.5/5.5`), holdown cap by name match (NG! → HDU14 cap), `pass` flag. It lives OUTSIDE `calcSegment` deliberately.
- Old dark `CalcSheet` removed (replaced); dark `Elevation`/`SectionTitle` retained though currently unused by the calc tab.
- `.wps` schema untouched (still version 1; `calc:{g, segments}` unchanged — `resultsU` is derived).
- **Bug fixed post-splice:** the light-block header comment contained `Lt*/LT` — the `*/` terminated the block comment early → artifact parse error at 1810:59. Now reads `Lt- / LT-`. **Lesson: never write `*/` inside block comments; lexer-scan comments after editing.**
- **Env note (no network this session):** esbuild was found bundled inside the global `tsx` install — `/home/claude/.npm-global/lib/node_modules/tsx/node_modules/esbuild/bin/esbuild` (v0.27.7) — and react/react-dom 19.2.5 live in `/home/claude/.npm-global/lib/node_modules` (use `NODE_PATH=` to resolve). Full §6 pipeline ran: syntax transform OK, render smoke PASS, plus **per-tab mount smokes** (sed `useState("plan")`→`"calc"`/`"design"`, rebuild, renderToString) verifying the light page, LT_CSS, banner, collapsed-section behavior, tooltips, pass dot, and the dark design sheet. Logic suite 9/9 PASS (`test_integration` needs `cp plan-sketcher-suite.jsx sw_module.jsx` first). Add the per-tab mount smokes to the standard workflow.

## 4c. Whole-app light theme (rev 3) — invariants

- **All three tabs now share the Calculation Sheet's drafting-paper scheme** (paper #F4F3EE page, white panels/sheets, ink #1C2733, rule #D8D4C8, blue #23577F accent, red #B23A2A, amber #9A6B1F, green #2E6B4F). Styling-only change; engine + all logic functions byte-identical to rev 1 (re-diffed).
- **Sketcher**: skin lives in the `CSS` template (`.r` vars + classes — names/layout untouched, colors/fonts/shadows only; IBM Plex @import dropped → calc-sheet font stacks) and the SVG constants `C_BG/C_GRID/C_WALL/C_NODE/C_LOAD/C_REACT/C_DIMBOX/C_REACTBOX/C_DRAFT` (now white canvas, ink walls, blue nodes/loads, red reactions, amber rubber band). `SecDiagram` CY/YEL + its inline dim editor and 7 inline hardcodes in `PlanSketcher` JSX were also mapped (selected-node halo, base-shear amber, imbalance warning, design CTA button). Stage/win modals = white, 1.5px ink border, offset shadow `4px 4px 0 rgba(28,39,51,0.12)` — same framing as the calc sheet.
- **Design tab**: restyled almost entirely by swapping the `SW` palette values to light (components/JSX untouched except: `swBtn` primary colors, `SwCtxMenu` shadow, the results table now `className="sw-scroll"/"sw-table"` for sticky labels + zebra + hover, and the `designSheet` wrapper framing → ink border + offset shadow).
- **`LT_CSS` is now mounted ONCE at the App root** (not inside `calcSheetPage`) so `.sw-table`/`.no-print` classes work on every tab. Don't re-add a second `<style>` mount.
- Verification: esbuild syntax OK, comment-lexer clean, per-tab render smokes assert **zero dark-hex leaks** (scan list of 14 old colors) + light markers on all three tabs, logic suite 9/9.

## 4d. Rev 4 — Design-tab readability (user-requested)

- **Wall marks SW-A, SW-B, …**: `letterOf(k)` (A..Z, AA, AB…) + `wallMarks` useMemo in `DesignTab` keyed `lineId+"|"+segIdx`, assigned in **line order then segment order**; passed to `DesignPlan` as new `marks` prop. Plan labels read `SW-A · 9.50′ · Type 1`; the per-line results table headers use the same marks. NOTE: marks re-letter if lines/segments are re-ordered or re-generated — they are positional, not persisted in `.wps`.
- **"Required type / selected" row → "Shear wall nailing"**: shows the edge-nailing callout from `NAIL_EDGE` (`{1:'10d-6" o.c. @ edges', 2:'10d-4"…', 3:'10d-3"…'}` — defined next to `SCHEDULE`, keep in sync) with a faint `Type n` sub-line; a type override below the required type renders red with `— requires Type n`.
- **Schedule reference on the Design tab**: `SwScheduleRef()` (same data/markup as the calc sheet's reference section, light `LtCollapse` + `sw-table`) renders at the bottom of `DesignTab` in BOTH states — the no-lines early return now wraps notice + schedule.
- **Label capitalization**: first letter of every `Row`/`LtRow` label in `CalcSheet` + `DesignTab` is now uppercase ("Wind shear v"), done by scoped regex; **`label="wDL"` deliberately excluded** (symbol). Input-array display labels + literal `<td>` labels also capitalized.
- Verification note: **SSR inserts `<!-- -->` between adjacent JSX text/expression nodes** — strip them before `includes()` assertions in render smokes (caused false FAILs on `SW-A`). Engine re-diffed incl. const-arrow functions (earlier diff helper silently passed on those): all UNCHANGED.

## 4e. Rev 5 — Pinned ribbon + toolbar/side-panel dedup (user-requested)

- **Ribbon is pinned**: `.ribbon` now `position:sticky; top:var(--tabbar-h,42px); z-index:30`. It sticks **below** the suite tab bar (which was already sticky at `top:0, zIndex:40`). The tab bar's actual height is measured at runtime in `App` (`tabBarRef` + `useEffect` → sets `--tabbar-h` on `document.documentElement`, re-measures on window resize); 42px is the SSR/no-JS fallback. Z order: dim-input 25 < ribbon 30 < tab bar 40 < modals/ctx-fixed 60.
- **Draft toggles deduplicated**: ✏ Draw / ⌗ Snap / ∟ Ortho / ⟷ Dims now exist ONLY on the ribbon (short names preserved per user). The side panel "Options" card was **removed entirely** (it contained only those four toggles). Status-bar SNAP/ORTHO clickable flags kept. Hint card's "✏ Draw walls" explainer text kept (documentation, not a control).
- **Presets deduplicated the other way**: the Presets group (+ its `rsep`) was removed from the ribbon; the side panel Presets card is now the only home for shape presets.
- `.tog`/`.sw` CSS classes are now unused by the sketcher — left in the CSS template deliberately (additive philosophy).
- `react` import NOT widened (constraint preserved) — measurement uses `useEffect`, not `useLayoutEffect`.
- Verification: full render smoke + new `test_ribbon_pin.cjs` (18 assertions: sticky rule, dedup counts — note "Snap to grid"/"Orthogonal (90°)" still appear ONCE as ribbon button `title` attrs, button-vs-hint-text disambiguation via `>✏ Draw</button>` count), per-tab mount smokes (calc/design) PASS, diff-vs-prior confirmed 6 hunks all in JSX/CSS — engine regions untouched.

## 4f. Rev 6 — Structural I sheathing option (user-requested)

- **Source**: `shear_walls_-_Structural_1.xlsx` ("Plywood Shearwalls (Structural I) w/Wood Studs"). Verified **formula-identical** to the workbook the engine was ported from — every LINE N formula (allowable ladders, DL factors A/B/C, both denominator quirks incl. E42, 625-neglect, post buckling constants 510k/580k·1400/1350 + 550k/470k·825/700, HD caps X46:48 = 7870/9335/14445, anchor/embed/strap thresholds, deflection, footing quadratic) matches `calcSegment`. **No discrepancies found**; only the Shearwall Schedule capacities + Ga differ.
- **Data**: `SCHEDULE` (rated, unchanged: 435/645/840 W, 310/460/600 S, Ga 14/17/19×1.2) + new `SCHEDULE_STR1` (475/715/930 W, 340/510/665 S, Ga 16/20/22×1.2, sheathing label `…PANELS-STR. 1 — ONE SIDE OF WALL`). Nailing/anchorage callouts identical between grades → `NAIL_EDGE` untouched. `schedFor(grade)`: `"str1"` → STR1, anything else → rated.
- **Engine touch (sanctioned, minimal)**: `calcSegment` gained ONE line (`const SCHED = schedFor(g.grade)`) and its 3 schedule reads now use `SCHED`. Formulas byte-identical (function-diffed vs rev 5: generateDesign/evaluateCandidate/baseDesignSeg/lineResults/buildSecData/lineReactions all UNCHANGED). `withUtil(r, seg, grade)` gained the grade param; caller passes `g.grade` (memo deps widened).
- **State**: `g.grade` ∈ {"rated","str1"}, lives in shear globals `g` → **shared by both tabs** (one project = one sheathing spec; toggling on either tab updates both) and **rides in `.wps` `calc.g` automatically** (still version 1; old files lack `grade` → rated; golden test asserts undefined === rated).
- **UI**: Calc sheet "Design loads" gained a 4th card (grade select + live Type 1/2/3 W/S capacity readout); Design tab constraints panel gained a Sheathing `SwField` (also present in the **no-lines early-return state**, since it drives the schedule reference below); both schedule reference tables (`CalcSheet` + `SwScheduleRef({grade})`) and the Design-tab "Allowable wind / seismic" row are grade-aware; both title blocks append `(Structural I)` when active (mirrors source workbook F1). `DesignTab` now receives `setGl`.
- **Tests**: `test_str1_golden.mjs` (21 asserts) runs the REAL bundled engine (temp copy + appended `export {…}` → esbuild) against LINE N computed cells to FP precision — incl. the grade discriminator vW=438.75 plf (>435 rated → type 2/FAILED at sel 1; ≤475 STR1 → type 1/OK) and split-invariance under str1. `test_str1_design.mjs`: optimizer returns `{segs, meta:{type,…}}` (NOT top-level `type`); str1 ≤ rated in type and total length. Per-tab SSR smokes in both grades (note: the schedule reference table is inside a default-collapsed `LtCollapse` → absent from SSR; assert capacities via the always-rendered Sheathing card instead).

## 4g. Rev 7 — Clear→ribbon, pinned/grouped Design constraints, dead loads editable on Design tab (user-requested)

- **Clear moved to ribbon**: now `🗑 Clear` in the ribbon's Edit group (Undo/Redo/Clear); removed from the side-panel Presets card (Undo stays there). `clearAll` unchanged.
- **Design constraints panel pinned**: wrapped (title row + cards) in `position:sticky; top:var(--tabbar-h,42px); z-index:30` with `background:SW.page` + soft bottom shadow — same mechanism as the rev-5 ribbon (shares the `--tabbar-h` runtime measurement). `SectionTitle` NOT used inside the sticky wrapper (its 26px top margin would waste pinned viewport) — its row is inlined with `margin:0 0 8px`. genMsg + the hint line stay OUTSIDE the sticky wrapper (they scroll). Z order on Design tab: table sticky col 2 < panel 30 < tab bar 40 < ctx menu 60.
- **Grouped cards** via new `ConGroup` helper (visual twin of the calc sheet's Design-loads cards): **Loads** (Roof/Floor/Wall-self DL ← `g`/`setGl` NEW on this tab, + Roof/Floor trib ← `d`), **Dimensions** (Min/Max segment, Max # segments, Snap, Thickness, HD dist), **Plywood** (Sheathing grade, Max SW type), **Other constraints** (Objective, Anchored into, ⚡ Optimize button).
- **Dead loads are SHARED state** (`g.roofDL/floorDL/wallDL` — same object the calc sheet edits), like the rev-6 grade. Verified `resultsByLine` memo deps = `[lines, segsByLine, g, d]`, so DL/grade edits recompute design results live. Hint text updated accordingly ("dead loads and sheathing grade are shared with it").
- **Engine untouched** (function-diffed vs rev 6: all 7 engine fns UNCHANGED).
- **Test note**: SSR-ing the populated constraints panel needs a synthetic design line WITH plan geometry — lines require `a:{x,y}, b:{x,y}, windAxis` or `DesignPlan.lineGeom` throws (`ln.a.x`). See `test_rev7.cjs` (24 asserts: ribbon Clear placement, side-panel removal, all 4 groups + every field in its group, sticky rule, shared-DL hint, rendered DL values).

## 4h. Rev 8 — Pinned-constraints cleanup (user-requested)

- **Uniform control sizing**: new module consts `CON_H=24`, `conNum={height:24,boxSizing:border-box}`, `conSel={...selStyle, fontSize:12, padding:"2px 4px", height:24, boxSizing, minWidth:56, maxWidth:158}` — used ONLY inside the pinned panel (global `selStyle` and other call sites untouched). All 15 controls (8 NumInputs + 7 selects) plus the ⚡ Optimize button share the 24px height; `maxWidth:158` stops the Objective select from ballooning. `NumInput` gained an optional `style` prop merged LAST (backward compatible — callers without it are unaffected).
- **Vertical compaction**: sticky wrapper padding 8/8→4/6; title margin 8→6; card gap 10→8; `ConGroup` padding 10·14→6px 10px 8px, title now 10px uppercase tracking with marginBottom 4, field gap 10·16→6px 12px. Net pinned height ≈ one tight card row (~70px cards + ~20px title strip) on desktop.
- **Test gotcha** (`test_rev8_compact.cjs`): `conSel` spreads selStyle then appends height/boxSizing AFTER `outline:none`, so the serialized substring `outline:none;height:24px;box-sizing:border-box` matches selects AND NumInputs — count is 15, not 8. Asserting inputs-only by that substring is wrong (caused one false FAIL during dev).
- Engine untouched (UI-only rev). Full sweep green: rev-5 ribbon (18), rev-7 panel (24), rev-6 golden+optimizer on fresh bundle, rev-8 compaction (9).

## 4i. Rev 9 — Design-system elevation (user-requested "expert UI pass")

Direction: sharpen the established drafting identity into a complete language — NOT a re-theme. One signature risk; everything else discipline.

- **Type**: IBM Plex Sans (UI) + IBM Plex Mono (data) via single Google Fonts @import in `APP_CSS` (display=swap; full fallback to prior stacks, so offline/artifact-blocked envs degrade gracefully). `MONO` const + all inline 'Helvetica Neue' stacks + CSS-template stacks updated via global string replace. `tabular-nums` scoped to `.sw-root`/`.lt-root`.
- **Signature — engineer's quad-ruled desk**: `.paper-desk` class (4 layered linear-gradients: faint 22px grid + heavier rule every 110px, drafting-blue rgba .045/.085 on `#EFEDE6`) applied to App root + calc (`paper-desk lt-root`) + design (`paper-desk sw-root`) wrappers; same gradients inlined into the sketcher `.r` rule. **Print strips it** (APP_CSS print block + sketcher CSS print block). CAUTION: never put an inline `background:` shorthand on a `.paper-desk` element — it kills the class's background-image (App root's inline bg was removed for exactly this).
- **Tokens unified**: paper `#F4F3EE→#EFEDE6`, faint `#6B7684→#67737F` across sketcher vars + SW + LT. **Pinned constraints backdrop fixed `SW.page→SW.sheet`** — it lives INSIDE the white sheet container, so the cream backdrop was a flat patch (pre-existing, worse on grid).
- **Title-block tab bar**: `.tbrand` cell (right hairline, mono "STRUCTURAL SUITE" sub-line); tabs get mono sheet-number eyebrows S-1/S-2/S-3 (`.teye`) — label text unchanged (smokes intact); `.ttab:hover` added. `tabBarRef` measurement unaffected (offsetHeight still measured; bar grew ~6px, var adapts).
- **Micro-interactions / quality floor** (all in `APP_CSS`, mounted via `<style>` inside App — declared ABOVE `export default function App` after a botched insert split the export statement, see below): global `:focus-visible` 2px accent ring; scoped button hover `filter:brightness(.965)` + input/select hover/focus accent borders (filter/box-shadow don't collide with inline styles); `prefers-reduced-motion` kill-switch; ribbon `.rbtn` transitions + `:active` inset press; `.rsep` fade-gradient separators; ribbon stuck-shadow appended AFTER `z-index:30` (keeps rev-5 regex matching); `.sw-table thead th` band `#F7F6F1` + 1.5px ink bottom (collapses with the existing inline tr border); 6px accent drafting-tick squares before SectionTitle + the pinned panel title.
- **Pitfalls hit this rev**: (1) inserting a const at the `function App() {` anchor split `export default function App` — anchor on the full `export default function` text or re-add the export after; (2) per-tab wrappers are conditionally rendered, so plan-tab SSR sees only the App-root `.paper-desk` — assert calc/design surfaces on their own renders; (3) the tick span pushed "Design constraints" ~75 chars further from the sticky rule — rev-7 test proximity window widened 300→520 (intentional).
- Engine: all 7 functions UNCHANGED (function-diffed vs rev 8). Full sweep green: rev-9 design smoke (20), rev-5 (18+6), rev-7 (24, updated window), rev-8 (9), rev-6 golden+optimizer.

## 4j. Rev 10 — Screenshot-driven visual polish (user pasted 3 UI screenshots, "make the decision")

Diagnosed from rendered screenshots (things SSR assertions can't catch). Four fixes, ranked by impact:

1. **PLYWOOD card void (Design tab)** — was the worst offender: 2 controls stretched to match a 6-field neighbor → big empty box. Fixed by FILLING it with a live capacity readout (Allow. wind 1/2/3 + Allow. seis. 1/2/3, plf, reads `schedFor(g.grade)`, updates with grade) — mirrors the calc sheet's Sheathing card, earns the space, adds real design context. Belt-and-suspenders: constraint card row `align-items: stretch → flex-start` so any height delta sizes to content instead of voiding.
2. **Objective dropdown clipped its own text** ("Minimize wall lengt▾") — the rev-8 `maxWidth:158` cap was too tight for that select. Shortened option labels ("Minimize wall length"→"Min. wall length", "Minimize nailing (lowest type)"→"Min. nailing (type)") AND bumped that ONE select to `maxWidth:176`. **`d.objective` VALUES unchanged** ("length"/"nailing") — only display labels changed, so generateDesign + .wps are unaffected.
3. **D/C gauges refined** (`LtUtilBar`) — flat 8px bar w/ hairline tick → 9px pill track with inset shadow, gradient fill w/ rounded ends, **diagonal hatch when >100%** + **▲ prefix on over-capacity %**, crisper 2px 100% marker, width transition (respects reduced-motion globally). Legend updated. Verdict semantics/thresholds (.85/1.0, FAILED!!!) untouched.
4. **Desk signature now legible** — screenshots showed the grid was effectively invisible (only thin gutters show, and at .045/.085 they vanished). Grid bumped to **.12 (110px major) / .06 (22px minor)** in BOTH `.paper-desk` and sketcher `.r`. Sheets + plan `.stage` got a refined 3-layer floating shadow (`0 1px 1px / 0 10px 24px -14px / 4px 4px 0`) replacing the single hard offset — paper now clearly rests on the desk. Print still strips the grid.

- Restraint: explicitly did NOT touch the title-block top-right (SHEAR LINE box / Print button) or the failing-banner chips — boldness budget spent on the four above (Chanel's rule).
- Engine: all 7 fns UNCHANGED (function-diffed vs rev 9). Sweep green: rev-10 polish (16), rev-9 (20), rev-7 (24), rev-8 (9, two assertions updated: Objective now 176px not 158, row now flex-start not stretch), rev-5 (18+6), rev-6 golden+optimizer.

## 4k. Rev 11 — Design-constraints panel rebuilt for alignment + height (user screenshot of the panel, asked: align inputs, smaller text, shorter pinned panel)

Root-cause from the close-up: (a) controls didn't align — number inputs fixed 56px, selects wider/variable, ragged within and across cards; (b) the panel was TALL because every field stacked label-ABOVE-control (2 lines) × 3 rows. Font size was a red herring — the stacking was the cost.

**New field system** (replaces ConGroup/SwField/conSel/conNum usage in the panel; those helpers are now unused but left defined):
- `PinCard({title, cols})` — card with a real CSS grid (`repeat(cols, minmax(0,1fr))`, columnGap 12, rowGap 5). Loads + Dimensions are `cols=2`; Plywood + Other are `cols=1`.
- `PinRow({label, unit, full, grow})` — INLINE field: label left (8.5px uppercase, `nowrap + overflow:hidden + ellipsis + title=` so no label can ever break the row), control, then a fixed 13px unit gutter. One line per field = ~half the height of stacked. `grow` makes the control flex to fill (Plywood/Other full-width selects); default keeps control fixed so edges align in a column.
- `pinNumS` (46px, right-aligned, 11px) / `pinSelS` (minWidth 46, 11px), `PIN_H=22`.
- **Alignment** is now structural: grid columns + fixed control widths → every control shares a column edge.
- **Height**: stacked 3-row card (~150px) → inline 3-row card (~95px); panel overall ~40% shorter. Controls 24→22px, paddings/gaps tightened, card titles 10→9px.
- **Units moved label→gutter**: "Roof DL (psf)" → label "Roof DL" + gutter "psf". Labels also shortened ("Max # segments"→"Max segs"). VALUES/bindings unchanged (`g.roofDL`, `d.*`, `setGl`/`setDk` identical).
- **Uneven flex weights** so the field-heavy cards get width and inline labels don't truncate: Loads/Dimensions `flex:1.4 1 280px` (minWidth 240), Plywood `flex:1 1 210px`, Other `flex:1 1 230px`. The ellipsis is a safety net, not the plan.
- Plywood capacity readout kept but condensed to 2 lines ("Allow. W/S (plf)", values joined by "/"). Objective stays short-labeled (rev-10) in a full-width select → no clip.

**Test bookkeeping** (panel DOM changed, so panel-specific assertions in older suites were retired/migrated — NOT silently broken):
- `test_rev11_panel.cjs` (35 asserts) is the new owner of all panel structure/fields/bindings.
- `test_rev8_compact.cjs` → stub (its conSel/conNum/24px markers are gone; superseded by rev-11).
- `test_rev10_polish.cjs` → trimmed to its still-valid non-panel checks (gauges + signature).
- `test_rev7.cjs` → field-label arrays updated to current names ("Roof DL" not "Roof DL (psf)"); its group-card/sticky/DL-binding asserts unchanged and still pass.
- Engine: all 7 fns UNCHANGED (function-diffed vs rev 10). Sweep green: render, ribbon(rev5), rev7(24), rev8(stub), rev9(20), rev10(trimmed), rev11(35), rev6 golden+optimizer.

## 4l. Rev 12 — Reaction "rocket" reads correctly on vertical walls (user screenshot of plan corner)

Diagnosed from a zoomed plan corner: the horizontal-wall reaction (7.29k) reads as a clean rocket because its label and arrowhead are colinear (both horizontal). The vertical-wall reaction (11.22k) pointed correctly DOWN along its wall, but its label stayed HORIZONTAL → a horizontal chip with an arrow poking out the bottom, not a rocket.

- **Reality check first**: ran the real `buildSecData` on the default rectangle for both wind dirs. Confirmed reactions are point loads delivered ALONG the supporting wall: secH (E-W) → reactions on horizontal walls pointing right (tdir {x:±1,y:0}); secV (N-S) → reactions on vertical walls pointing down (tdir {x:0,y:±1}). So the arrow DIRECTION was already correct — only the label orientation was off.
- **Fix**: `Reaction` now computes `vert = |dy|>|dx|` and passes `rot={vert ? -90 : 0}` to `<Tag>` (Tag already supported `rot`). Vertical rockets get their label rotated -90° to lie along the shaft (consistent with the -90° used by WindLoad plf labels and dimension tags on vertical walls). Horizontal rockets unchanged.
- **No math touched**: `buildSecData`/`lineReactions`/`tdir`/reaction positions all identical (function-diffed). Pure presentational rotation of the label `<g>`.
- Test: `test_rev12_rocket.cjs` (6 asserts) renders `Reaction` directly for horizontal / vertical-down / vertical-up tdir and checks the label rotation (none / -90 / -90) while arrowhead + value text survive. Full sweep green; all 7 engine fns UNCHANGED.

## 4m. Rev 13 — Shear-wall plan symbol redrawn as a drafting detail-bubble (user reference sketch)

User supplied a hand-style reference of the desired plan symbol and four asks. All presentational; lives entirely in `DesignPlan` (the per-segment `<g>` in the `lines.map`) plus three small `DesignTab` wiring lines.

- **Detail-bubble callout (type + length).** The old single text label `SW-n · L′ · Type n ✕` above the band is gone. In its place: an inverted (point-down) triangle floats above the wall center on a short stem, holding **just the type number** (e.g. `1`, not `Type 1`) via `isNum(r.selType) ? r.selType : "—"`. The **length** (`fmt(s.length,2)′`) is dimensioned on its own line **above** the triangle. Triangle constants: `tipOff=band+1.3*S`, `triH=2.3*S`, `triHalf=1.35*S`; type at `triH*0.56` up from apex, length `1.05*S` above the base. All three (stem/triangle geometry via `at()`) auto-orient to the wall; the two text nodes get the usual `vert?rotate(-90)` readability spin.
- **Half-width band.** `band` 2.4*S → **1.2*S** (the only line-level constant change), giving the thin-band look of the reference. Hatch `step` 1.8*S → 1.3*S and lighter weight so density reads right on the thinner band. Note `band` is tied to building size (S = maxVB/110), NOT wall length — same scaling idiom as before, just halved.
- **End zones = X-boxes (not solid posts).** Each end is now an **outlined** square (`fill C_BG`, half-size `eb=band`) with two diagonals forming an X — the boundary/post symbol from the reference — replacing the old solid `fill={stroke}` square. The separate visible stretch-handle rect was dropped; the transparent hit-circle (`r=1.5*S`, `onPointerDown` L/R) is retained so **drag-to-stretch still works**, and the body polygon still drag-slides (M), and the `<g onContextMenu>` right-click override is unchanged.
- **Dot bubble now numbered = the hold-down number.** The end holdown indicator is kept and still gated on `r.dispHd && !=="None"`, but is now a **filled** circle (`fill={stroke}`, white ring) centered on the end box carrying the **HDU model number** parsed from `dispHd` via `/HDU(\d+)/` (HDU4→`4`, HDU11→`11`; wood `(2) HDU4`→`4`; `NG!`→`!`). Font shrinks for 2-digit. Color scheme deliberately **kept** (blue pass / red fail) — did NOT adopt the reference's yellow.
- **SW tag now toggled, off by default.** The `SW-A/B/…` mark no longer renders automatically. `DesignTab` gained `const [showTags,setShowTags]=useState(false)` and a **"Show/Hide wall tags"** button in the plan's `SectionTitle` right-slot (`swBtn(showTags)`); `showTags` flows to `DesignPlan` as a prop and gates a tag text node placed **below** the wall (`at(mid, band+1.5*S)`), so it never collides with the length above.
- **No math touched**: engine guard re-run by building engine-export bundles from baseline AND current and deep-comparing `schedFor` (both grades), `calcSegment`, and `generateDesign` on fixed inputs → all IDENTICAL. Compile + SSR render smoke (6/6) green. Verified the symbol visually by rasterizing the exact geometry standalone (resvg) at realistic S — passing/failing/no-holdown walls + tags all read correctly, incl. vertical rotation.

## 4n. Rev 14 — Leeward wall height + sloping roof line (user-requested)

User ask: "add a height value to the leeward wall in the section cut window… the roof line can be sloping… change the leeward height no matter the direction of the section cut." Implemented as a presentational/UI + live-read change; **no engine touch, no new stored field, `.wps` schema untouched**.

- **Leeward height = back wall's own `H`** (mirrors the leeward-parapet pattern exactly). `activeSection` now also returns `leeH: lee ? lee.H : 0` (read via the existing `activeLeeKey`/`findLeewardPartner`). `WindWindow` seeds a `leeH` field and routes its edits with a new `upd` branch `prop==="leeH" → setVals("lee",{ H:num(raw) })` (writes to the back wall, alongside the existing `parL → setVals("lee",{par})`). Because each physical wall keeps one `H`, this works through reverse and through split back walls, and is settable from either cut direction — satisfying "no matter the direction."
- **`SecDiagram` redrawn for a sloping roof.** Old single flat `H`/`roofY` replaced by independent `HL=v.H` (windward) and `HR=v.leeH` (leeward) with a **common foundation baseline** `wallBot=padTop+availH`; `roofYL/roofYR` are each side's roof point. The wall is now a `<polygon>` trapezoid (left edge HL, right edge HR, sloped top); the ROOF LINE label rotates to the slope angle (`roofAng=atan2(roofYR-roofYL, wallRX-wallLX)`). Each parapet column + its pressure arrows hang off its own side's roof point (`parWTop=roofYL-…`, `parLTop=roofYR-…`). Scaling `maxFt=max(HL+parW, HR+parL, 1)`. **Backward-compatible: when `HL===HR` the geometry is pixel-identical to the old flat diagram** (verified — `roofYL===roofYR`, angle 0).
- **New editable box**: a red leeward-wall height box (`field="leeH" prop="leeH"`) at the leeward wall mid-height, beside the existing windward `H` box. Windward `H` box nudged to `wallLX+22` for symmetry with `wallRX-22`.
- **Total line-load breakdown unchanged** (Wall H/2·pw + windward parapet + leeward parapet) — leeward *wall* height is geometric context, not a term in this wall's plf.
- **Verification**: esbuild syntax OK, comment-lexer clean, render smoke 7/7. **Engine guard** (fresh export bundles from the pre-edit baseline vs current, deep-compare `schedFor`/`calcSegment`/`generateDesign` both grades) → ALL IDENTICAL. New `test_slope` (7 asserts): sloped both directions (windward-taller and leeward-taller), ROOF LINE rotated, both height boxes render their values, and the flat `HL===HR` case has zero slope. SVG emitted + confirmed well-formed (cairosvg rasterizes blank here — its marker/defs handling, not a code issue; geometry asserted via SSR instead).

## 4o. Rev 15 — Wall height H row on the Design tab (user-requested)

- Added one `<Row label="Wall height H" unit="ft" …>` immediately **below** the "Length / position (ft)" row in the `DesignTab` selected-line table (the `selSegs.length>0` branch). Renders `fmt(sel.heightFt,2)` in each segment column (mono, 12px) — the line's height is uniform across its segments by design (the documented "max H along the support" rule, §7), so every active column shows the same value. Mirrors the height already shown in the SectionTitle ("H … ft").
- **No engine touch, no new state, no `.wps` change** — `sel.heightFt` is existing per-line data. Engine guard (baseline vs current) ALL IDENTICAL; render smoke OK; new `test_wallheight_row` mounts the Design tab with a synthetic line + segments and asserts the row renders, carries the (ft) unit, sits between "Length / position" and "Aspect ratio", and shows the correct value (12.00) per column.

## 4p. Rev 16 — Design height label H→h + section-cut parapet redrawn as line-with-node (user-requested)

Two independent UI-only asks, both presentational; engine + all logic byte-identical (guard CLEAN vs baseline).

- **Design-tab height label `H → h`.** The rev-15 row is now `<Row label="Wall height h" unit="ft" …>` (was `"Wall height H"`). Reason from the user: lowercase `h` is the height symbol in the aspect-ratio formula `h/L`, and that row (`"Aspect ratio h/L"`) sits immediately below — so the two now read consistently. Pure string change; value/binding (`sel.heightFt`) untouched. (First-letter-capitalization rule from §4d is unaffected — the changed `h` is mid-string.)
- **Section-cut parapets are now a LINE, not a column rectangle** (`SecDiagram`, Plan Sketcher tab). Each parapet was a `<rect width={colW=26}>` column standing on its side's roof point; it is now a single vertical `<line>` continuing the wall's outer face upward — windward at `x=wallLX` from `roofYL→parWTop`, leeward at `x=wallRX` from `roofYR→parLTop`. The `colW` const was removed (its only consumers were the two rects, the two labels, and the two height boxes — all re-anchored).
- **WINDWARD / LEEWARD labels** keep their vertical (`rotate(-90)`) orientation but now sit *beside* the parapet line (interior side: `wallLX+8` / `wallRX-8`) instead of centered inside the old column. Still gated on `parW>0` / `parL>0`.
- **Node where the parapet starts.** A small filled `<circle r=2.4 fill={C_NODE} stroke="#FFFFFF">` is drawn at the wall/parapet junction — windward `(wallLX, roofYL)`, leeward `(wallRX, roofYR)`. Because that point is `wallBot − H·pxPerFt` (and `pxPerFt` rescales off `maxFt`), the node **repositions live** as any height (wall or parapet, either side) is typed — no new state, it's derived from the existing live values. Gated on the parapet existing.
- **Parapet height boxes** (red, `fmt1(par) ft`) re-anchored off the removed `colW` to the line: windward `wallLX+30`, leeward `wallRX-30` (clears the beside-line label). Pressure-arrow geometry, the wall trapezoid, the sloping ROOF LINE label, and both wall-height boxes are all unchanged — the flat-roof (`HL===HR`) case still degrades to the prior pixel geometry apart from rect→line.
- **Verification**: esbuild syntax OK, comment-lexer clean, render smoke 6/6, engine guard CLEAN (7 fns byte-identical vs baseline). New `test_secdiagram_parapet.cjs` (13 asserts) renders `SecDiagram` directly across three cases — both parapets present (asserts WINDWARD/LEEWARD text, both `<circle>` nodes at cx 95/250 with white ring, both parapet `<line>`s with `x1==x2`, **no** `width="26"` column rect, polygon + ROOF LINE intact, `5 ft`/`4 ft` value boxes), flat-roof (nodes present, no column), and no-parapet (no line/node/label). Note `fmt1` rounds to integer when whole (`5`, not `5.0`) — assert on `5 ft`.

## 4q. Rev 17 — Tab order: Plan · Design · Calculation (user-requested)

- **New left→right order: Plan Sketcher → Design → Calculation Sheet.** Design moved up one slot; the Calculation Sheet is now the last tab. Reordering only — no tab was added, removed, or renamed, and the default tab is still `"plan"`.
- Three lines in the `App` shell changed: the tab-button block (`tabBtn("plan",…)` / `tabBtn("design",…)` / `tabBtn("calc",…, calcOK dot)` now in that order) and the conditional content block (`{tab==="design" && designSheet}` before `{tab==="calc" && calcSheetPage}`). The always-mounted hidden sketcher `<div>` and the pass-dot wiring on the Calculation tab are unchanged.
- **Sheet-number eyebrows remapped** so they still count up in screen order: `SHEET_NO = { plan:"S-1", design:"S-2", calc:"S-3" }` (was `calc:"S-2", design:"S-3"`). The title-block tab bar therefore reads S-1 Plan · S-2 Design · S-3 Calculation.
- No state, no `.wps`, no engine touch; tab keys (`"plan"/"design"/"calc"`) are unchanged so saved projects and the `setTab` calls (design handoff jumps to `"design"`, applyToCalc jumps to `"calc"`) all still resolve.
- **Verification**: syntax OK, comment-lexer clean, render smoke 6/6, engine guard CLEAN. Render-order assertion on the mounted `App`: tab labels appear Plan < Design < Calculation, eyebrows S-1 < S-2 < S-3, and each eyebrow pairs with its own label (S-1↔Plan, S-2↔Design, S-3↔Calculation).

## 4r. Rev 18 — Re-entrant interior walls take point loads + equal-plf labels merge (user screenshots: L-shape vs rectangle)

User showed an L-shape (20ft step wall `2-3`, 23ft wall `1-2`) beside a rectangle with an interior wall, and asked: (a) the re-entrant walls should take **point-load reactions** like the rectangle's interior wall does, and (b) the left wall shows **"374 plf" twice** with no real load change — two values should appear only where the load actually differs along the wall (like the 374|462 south wall).

- **Root cause (a):** `lineReactions` gate 4 required a support wall to *reach the windward line's depth* (`line.depth ∈ [aMin,aMax]`). The L's 20ft step wall sits at x60–80 while the windward (left) wall is at x20, so it failed the test and carried nothing in E–W wind. (In N–S wind the 23ft wall already worked — it spans its windward line's depth.) **Fix:** the gate is now `aMax < line.depth − tol → skip`, i.e. a support need only be **at or downwind of the windward face**; a re-entrant wall tied to that face by the diaphragm is an interior support. One line changed in `lineReactions`; the parallel-to-wind and across-wind-span gates are unchanged.
- **Root cause (b):** `buildSecData` subdivides a windward wall at every back-wall breakpoint into `w.subLoads`; `WindLoad` rendered one label per sub-load, so an equal-plf split showed a duplicate label even though the dashed `divides` (which test `|Δplf|>0.5`) correctly drew nothing. **Fix:** `WindLoad` now coalesces consecutive equal-plf sub-spans (`|Δplf|<0.5`) into one span before rendering — **display-only**, no engine/statics/`divides` touched (`subLoads` is read nowhere else; grep-confirmed).
- **Effect on the L-shape (E–W wind):** step wall `2-3` now carries the dominant point load. Before 8.41/8.41k (top/bottom only); after **top 4.30k · step 8.41k · bottom 4.11k** (Σ≈16.83k = the line load — balances). N–S wind unchanged (left 7.48 · 23ft wall `1-2` 11.22 · `3-4` 3.74k). Rectangle + interior wall unchanged (4.67 / 11.22 / 6.54k).
- **Side effect, flagged to user:** a **U-shape** in E–W wind now also loads the notch-bottom wall as an interior support (8.41/8.41 → **5.61/8.41/2.81k**, still balances). Arguably more correct (base diaphragm ties it to the windward face); reversible if undesired.
- **Verification:** syntax OK · comment-lexer clean · render smoke 5/5 · **engine guard CLEAN** — `calcSegment/generateDesign/evaluateCandidate/baseDesignSeg/lineResults/buildSecData/computeCut/findLeewardPartner/pointInRing` all byte-identical (only `lineReactions` + `WindLoad` changed, both intended). New regression `work/test_reentrant_reactions.cjs` (9/9: step wall is the dominant reaction & totals balance; N–S + rectangle unchanged; left-wall sub-loads equal → merge). `WindLoad` SSR (4/4): equal plf → one label, 374|462 → two labels.

## 4s. Rev 19 — CAD navigation + Draw stops auto-zooming the canvas (user report: first node jumps to center, canvas keeps zooming while drawing; asked for mouse-wheel zoom like CAD)

The viewBox was `frozenView || fit`, where `fit` is a `useMemo` that auto-frames the bounding box of all nodes on every `graph` change. In Draw mode nothing froze the view, so each click re-fit the canvas — and the **first** node collapsed `fit` to a ~20×20 ft window centred on that node (the "spawns at center + keeps zooming" report).

- **New view model:** added a persistent **`userView`** state; `view = frozenView || userView || fit` (auto-fit only when `userView` is null). `viewRef`/`userViewRef` keep the live values for handlers. `freezeView` now freezes the *current* view (incl. manual zoom), and `expandViewTo` grows from it — so drags start from wherever you're zoomed, not from `fit`.
- **Draw no longer refits:** entering Draw seeds `userView` from the current view (`toggleDrawMode`). Placing a node only ever **grows** the view to keep the new node visible (`growUserViewTo` — expand-only, never recenters/zooms-in); a node inside the view leaves it untouched. So the canvas holds still while you chain walls, and still lets you draw past the old viewport edge.
- **CAD navigation:** mouse **wheel = zoom toward the cursor** (`zoomAt`, native non-passive `wheel` listener so page-scroll is prevented; keeps the world point under the cursor fixed, preserves aspect, clamps span to `VMIN 6 … VMAX 3·WORLD` ft). **Middle-drag = pan** (`panRef`; the native middle-button autoscroll puck is suppressed). New **View** ribbon group: **⊡ Fit** (`zoomToFit` → `userView=null`, zoom-extents) + **+ In / − Out** buttons (zoom about the canvas centre) for trackpad/no-wheel users. Loading a preset / New / opening a file resets `userView=null` so the plan re-frames.
- **No engine/geometry/statics touched.** Function-diff vs the rev-18 file: `calcSegment / generateDesign / evaluateCandidate / baseDesignSeg / lineResults / buildSecData / lineReactions / WindLoad / Reaction / computeCut / findLeewardPartner / pointInRing` all byte-identical — the change is entirely the view state + pointer/wheel handlers + three ribbon buttons + a help line.
- **Verification:** syntax OK · comment-lexer clean · render smoke 5/5 (App still mounts; View buttons present in the rendered ribbon) · navigation **math invariants** (`/tmp/view_math.cjs`, 14/14): zoom keeps the cursor world-point fixed & preserves aspect, zoom-in/out clamp at VMIN/VMAX, **grow leaves the view unchanged when the point is already inside (the no-jump guarantee)** and expands-only otherwise, pan translates without resizing · rev-18 reaction regression still 9/9.

## 4t. Rev 20 — Pan tool + wheel-zoom toggle on the empty-area right-click menu (user-requested)

User asked to add a left-drag **Pan** capability and surface it (plus Draw and a wheel-zoom switch) on the right-click of empty canvas, **without disturbing the existing right-click menus** (node = select/connect/delete; wall = point-load/add-node/delete) or the draw-chain right-click.

- **New "Canvas" context menu.** `onBgContextMenu` previously just cleared the selection on empty-area right-click. It still does that (and still ends the draw chain when in Draw mode — that path is untouched), but when **not** drawing it now also calls `openMenu(e,{kind:"canvas"})`. The menu render gained a third branch (`menu.kind==="canvas"`) ahead of the existing node/wall branches: **✏ Draw** (calls `toggleDrawMode`), **✋ Pan** (`togglePanMode`), and **🔍 Zoom (wheel)** with a status dot. Draw/Pan show a ✓ + active tint when on; the menu closes on Draw/Pan but **stays open on Zoom** so the light visibly flips.
- **Pan tool (`panMode`).** A left-drag "hand" tool that complements the existing middle-drag pan (rev 19) for trackpad/no-middle-button users. New `beginPan(e)` starts the **same** `panRef` gesture the middle button uses (capture → translate `userView` in `onMove` → release in `onUp`), so panning math is shared and unchanged. All three left-button entry points route to it when `panMode` is on: `onBgLDown`, `onNodeLDown`, `onWallLDown` (and dimension labels), so dragging **anywhere** pans instead of moving geometry / cutting a section / opening the dim editor. Mutually exclusive with Draw (each toggle clears the other). `Esc` exits Pan.
- **Wheel-zoom toggle (`zoomEnabled`, default on).** The native non-passive `wheel` listener now early-returns when `zoomEnabledRef.current` is false (so it neither zooms nor `preventDefault`s — the page scrolls normally). The green `.cmlight` (`#34C759`, grey when off) tracks the state live. Middle-drag pan and the ⊡ Fit / + In / − Out buttons are unaffected by this toggle.
- **Cursor + status feedback.** Canvas cursor reads `grab` in Pan mode and `grabbing` during any live pan (`panCursor` state, set on every pan start / cleared on up — covers both middle-drag and the Pan tool). The status-bar mode chip shows **PAN** alongside the existing DRAW / SELECT.
- **No engine/geometry/statics touched.** Tail-diff vs the rev-19 file from `function calcSegment` to EOF is **byte-identical**; `lineReactions / buildSecData / findLeewardPartner` unchanged in place. All edits are confined to the `PlanSketcher` view/interaction layer (state + refs, pointer/wheel handlers, the canvas menu branch, three CSS rules, the help line) above the shear module.
- **Verification:** TypeScript TSX parse clean (no syntax diagnostics) · single-declaration check for every new identifier (`panMode/zoomEnabled/panCursor/panModeRef/zoomEnabledRef/beginPan/togglePanMode`) · engine tail byte-identical guard passed.

## 4u. Rev 21 — Canvas menu reachable mid-draw (user-requested)

Rev 20 left the empty-area Canvas menu unreachable while in Draw mode, because `onBgContextMenu` short-circuited to `endDrawChain()` on every right-click in Draw. User asked to make the menu reachable mid-draw **without** losing the right-click-ends-the-chain behavior.

- **Two-stage right-click in Draw mode.** `onBgContextMenu` now branches on `drawAnchorRef.current`: if a chain is **active** (anchor ≠ null) the first right-click ends it exactly as before (muscle memory preserved); if **no chain is active** (anchor null — you just ended one, or haven't started) the right-click opens `openMenu(e,{kind:"canvas"})`. So a quick double-right-click = end chain → menu, and right-clicking before drawing anything opens the menu immediately. The non-Draw path (clear selection → open menu) is unchanged.
- **In-Draw the menu is self-consistent.** The Canvas branch already renders **✏ Draw** with the active ✓ tint, so opening it mid-draw shows Draw lit and one click toggles Draw off; picking **✋ Pan** swaps Draw→Pan (mutually exclusive); the **Zoom** light still flips in place. Nothing new in the menu render — only the gate that reaches it.
- **No engine/geometry/statics touched.** Tail-diff from `function calcSegment` to EOF is **byte-identical** vs rev 20. The whole change is the `onBgContextMenu` branch + one help-line word; 11 changed lines total, all in the `PlanSketcher` view layer.
- **Verification:** TypeScript TSX parse clean · engine-tail byte-identical guard passed · change scope = 11 lines.

## 4v. Rev 22 — Full session restore: a reopened `.wps` looks like where you left off (user-requested)

User: *"if I load a save file, it looks like when I just left the last time I was working on it."* Rev 21 and earlier saved **inputs + geometry only** and threw away the working view on load — `onFileChosen` forced `setTab("plan")`, and the sketcher's `set()` nulled `userView` (re-fit) and cleared selection/mode. So reopening dropped you on the Plan tab, auto-framed, nothing selected, regardless of where you were. This rev makes the file a **full session snapshot** while staying byte-compatible with old files.

- **Schema bumped to `version:2`** (additive). New pieces: a top-level `ui:{ tab, hlSel }` slice; `design.selLine`; and the sketcher slice now also carries the camera + working state. Full v2 shape: `sketcher:{ graph, wallProps, noSupport[], sections, nextId, view, selected, drawMode, panMode, zoomEnabled, snapOn, ortho, dims }`, `design:{ lines, shape, segsByLine, d, selLine }`, `calc:{ g, segments }`, `ui:{ tab, hlSel }`.
- **`registerProject.get()`** now also emits `view:viewRef.current` (the live viewBox = exact zoom/pan), `selected:selRef.current` (highlighted node), `drawMode/panMode/zoomEnabled` (nav mode) and the `snapOn/ortho/dims` toolbar toggles.
- **`registerProject.set()`** restores them **feature-detected**: `setUserView(s.view || null)` (present ⇒ exact camera; absent ⇒ the old auto-fit), `setFrozenView(null)`, `setSelected("selected" in s ? … : null)`, `setDrawMode/​setPanMode`, `setZoomEnabled("zoomEnabled" in s ? … : true)`, and `if("snapOn"/"ortho"/"dims" in s)` for the toggles. v1 files (and **New**, whose `set()` payload has no `view`) therefore behave exactly as before — auto-fit, defaults — so nothing regressed.
- **Tab/selection restored last, not forced.** `onFileChosen` now ends with `setHlSel(p.ui&&"hlSel"in p.ui?…:null)` then `setTab(p.ui&&p.ui.tab?p.ui.tab:"plan")` — v2 lands on the saved tab, v1 still lands on Plan. Design state is set before the tab in the same handler so React batches them and the Design tab paints with its lines already present (no empty-flash).
- **`selLine` lifted from `DesignTab` to `App`.** It was local `useState` in `DesignTab`, which **unmounts** on every tab switch (only `PlanSketcher` stays mounted via `display:none`; Design/Calc are `{tab===… && …}`), so the selected line couldn't survive a save/load. Now `App` owns `selLine/setSelLine`, passes them as props, and the sketcher→design handoff seeds it (`setSelLine(prev => lines.find(l=>l.id===prev) ? prev : lines[0]?.id ?? null)` — keeps a still-valid selection, else first line). `DesignTab`'s existing validity effect is unchanged.
- **Deliberately NOT restored** (transient/edit-in-progress, jarring to auto-reopen): the modal **wind line-load window** (`activeWall`) and the inline **dimension editor** (`dimEdit`) — both stay closed, their underlying data is fully restored, one click reopens. **Undo/redo history** is still cleared on load (a loaded file is a fresh history root) — cross-session undo is out of scope.
- **Engine untouched.** No calc/statics/optimizer code changed; the byte-identity guard over `calcSegment, generateDesign, evaluateCandidate, lineResults, withUtil, buildSecData, lineReactions` is **CLEAN**. Change is confined to App save/open + the sketcher `get/set` + the `selLine` lift.
- **Verification:** esbuild bundle clean · engine guard CLEAN · render smoke (plan) + SSR mount on all three tab variants pass · new `test_savestate.cjs` contract suite **24/24** (asserts the save shape, every `get()` field, the feature-detected `set()` restores + v1 fallbacks, the open-time tab/selLine restore, and that `selLine` is lifted). *Env note: this session's box had no network, so the §6b `npm install react@18` step wasn't possible; react/react-dom **19** (already present globally) were used for the SSR smokes via `NODE_PATH` — fine for landmark/mount checks. A normal §6b setup with react@18 is still the intended harness.*

## 4w. Rev 23 — Save-file forward-compat hardening (user question: "is there any chance an old save file won't load correctly into an updated version of the app?")

The honest answer was *yes, for one class of change*: the loader **replaces** `g`/`d`/`segments`/per-wall props wholesale (`setG(p.calc.g)`, `setD(p.design.d)`, `setSegments(p.calc.segments)`, `setWallProps(s.wallProps||{})`), so a field ADDED to any of those in a future rev would come back `undefined` on an OLD file (a latent NaN / blank-control risk). The sketcher's *UI-state* restore was already feature-detected and safe (rev 22); this rev fixes the wholesale-replaced **data** objects. Three moves, all additive, **behavior byte-identical for every existing v1 AND v2 file** and the save shape is unchanged.

- **(1) Merge onto named defaults.** The inline `useState` literals for `g` and `d`, and the per-segment shape inside `mkSeg`, were hoisted verbatim to module-scope `DEFAULT_G` / `DEFAULT_D` / `SEG_DEFAULTS` (values + key order proven identical to the prior literals — a "hoist fidelity" test, 6/6). The loader now merges: `setG({...DEFAULT_G, ...calc.g})`, `setD({...DEFAULT_D, ...design.d})`, `setSegments(calc.segments.map(s=>({...SEG_DEFAULTS, ...s})))`. For a *complete* current object the merge is a no-op (it overrides every default key); it only fills keys an OLD file lacks. **Per-wall props** get the same treatment via a new module-scope `mergeWallProps(p)` that subsumes the old legacy-`parW` shim and then merges onto `DEF_SECTION`; `propsFor` is now a one-liner calling it. *Sections* (`{axis,sign}`) are identity-only objects (always fully constructed) so they need no merge — left as-is. *`g.grade` was deliberately NOT added to `DEFAULT_G`*: the engine treats a falsy grade as "rated", so omitting it keeps the save shape unchanged and current files byte-identical (a one-line change if you later want new saves to carry `grade:"rated"` explicitly).
- **(2) Real `version` gate + migration ladder.** The `version` tag was written but never read. Added `CURRENT_VERSION = 2`, a `MIGRATIONS` step table (`MIGRATIONS[k]` takes a project at version k → k+1; `1→2` is a no-op stamp since v2 is purely additive), a `migrateProject(raw)` that walks the version up one step at a time and reports `newer` when the file was saved by a future build, and a **"saved by a newer version — some data may not load correctly"** `window.alert` on that case. `onSave` now stamps `version:CURRENT_VERSION`. The 1→2 step does no data transform on purpose (the additive loader already tolerates absent v2 fields) — the ladder exists so the NEXT (possibly breaking) change has a home: `MIGRATIONS[2] = p => ({...rewrite, version:3})`.
- **(3) Pure `loadProject(raw)` + fixture-based load-regression test.** The migrate→merge logic lives in a module-scope pure `loadProject(raw)` that returns ready-to-dispatch slices (`{newer, project, calc:{g,segments}, design:{lines,shape,segsByLine,d,selLine}, ui:{tab,hlSel}}`) **preserving the loader's exact present-checks** (g/segments/d applied only when present; tab/hlSel/selLine keep their prior fallbacks). `onFileChosen` is now a thin dispatcher over it (sketcher still restored by the sketcher's own `set()`). Because `loadProject` is pure and module-scope, the new **`test_loadstate.cjs`** loads real checked-in **`fixture_v1.wps`** + **`fixture_v2.wps`** through it and asserts the resolved state — including the previously-untestable "real file" behavior the rev-22 contract suite couldn't reach.
- **Engine untouched.** Byte-identity guard over `calcSegment, generateDesign, evaluateCandidate, baseDesignSeg, lineResults, withUtil, buildSecData, lineReactions, findLeewardPartner, pointInRing, computeCut` is **CLEAN** (all 11 identical). `propsFor` and `mkSeg` changed by design (neither is a guarded engine fn; `buildSecData`, which *consumes* `propsFor`, is unchanged in text). Net +70 lines, all in the project-file layer + comments.
- **Verification:** esbuild bundle clean · comment-lexer clean (no stray `*/`) · render smoke PASS with the **plan-tab render byte-identical to baseline** (27041 chars) · design + calc tabs SSR-mount · engine guard CLEAN (11/11) · **`test_loadstate.cjs` 31/31** (v2 round-trip == saved values; v1 lands on Plan w/ null ui fallbacks; a synthetic *future-field* file fills `g.wallDL`/`d.maxType`/`seg.ftgThick` from defaults instead of `undefined`; `version:99` flags `newer`; migrate ladder stamps & preserves payload; `mergeWallProps` legacy-`parW` + missing-field + no-entry cases) · hoist-fidelity 6/6 (DEFAULT_* == prior literals, values+order; no `grade` key). *Env note: react/react-dom **18** installed via npm this session (network available) — the intended §6b harness.*
- **To rebuild the load test in a fresh chat:** append `export { loadProject, migrateProject, DEFAULT_G, DEFAULT_D, SEG_DEFAULTS, mergeWallProps, CURRENT_VERSION };` to a *copy* of the jsx, bundle it to `work/exp.cjs` (esbuild, `--external:react --external:react-dom`), then `node work/test_loadstate.cjs` (it `require`s `work/exp.cjs` + reads the two fixtures from `work/`).

## 4x. Rev 24 — Design-data forward-compat + a stale-line recovery path + schema guards (user: "how can we address these limits?" → chose **flag the Design tab stale + prompt a re-run from the saved plan** over a silent drop)

Rev 23 left two honest gaps (§7): (i) `design.lines` and `segsByLine` placed segments were restored verbatim — not merged onto defaults — so a future per-line / per-placed-segment field would land `undefined`; (ii) the only thing that catches a *rename* or *unit* change (which merge-on-defaults can't) is discipline, which needs tooling to be reliable. This rev closes (i) and builds the tooling for (ii). **Engine byte-identical** (guard CLEAN, 11/11, vs the rev-23 baseline); all changes are in the project-file layer + a new Design-tab banner.

- **`DEFAULT_LINE` / `DEFAULT_PLACED` merge (the (i) fix).** A design LINE is `{id, key, windAxis, o, a, b, lengthFt, heightFt, forceLbs}`. Only the SCALARs are defaultable: `DEFAULT_LINE = {lengthFt:0, heightFt:13, forceLbs:0}`. The GEOMETRY (`id/key/windAxis/o/a/b`) is **deliberately NOT in a default** — it can't be invented. Placed segments `{start, length, ov?}` merge onto `DEFAULT_PLACED = {start:0, length:0}` (`ov` rides the spread, already `(s.ov||{})`-tolerant). `loadProject` now does `lines = design.lines.map(l=>({...DEFAULT_LINE, ...l})).filter(hasGeom)` and `segsByLine[k] = arr.map(s=>({...DEFAULT_PLACED, ...s}))`, keeping **all** `segsByLine` keys (even for a filtered line, by id, so a rebuild restores its layout).
- **Stale detection + recovery (the user's choice).** `hasGeom(l)` requires a non-null `id`, two `Number.isFinite` endpoints, AND `lengthFt > 0` (lineGeom divides by `lengthFt`, so a defaulted `0` would render `NaN/∞` — this is the §6b "line lacking geometry throws on `ln.a.x`" gotcha, now caught instead of crashing). Any line failing it is **excluded**, and `loadProject` returns `design.stale = (lines.length < merged.length)`. `App` holds `designStale` (set from `L.design.stale` on open; cleared by `onDesignShearWalls` since a fresh handoff is always geometry-complete; cleared by New). `designStale` is **NOT serialized** — a re-save after a stale load heals to the valid subset (the dropped lines were unrenderable anyway and the plan regenerates them). `DesignTab` shows an amber **"↻ Rebuild from plan"** banner (rendered at the top of BOTH return paths). The button → `onRebuildDesign`: if the restored plan still has a wind reaction it calls the sketcher's `rerun` (= `runDesignHandoff`, regenerates geometry-complete lines → `onDesignShearWalls` clears stale); otherwise it routes to the Plan with an alert to place a cut. `runDesignHandoff` + a live `hasReactions` flag are exposed to the shell on the existing `registerProject({...})` api object (the effect has no dep array, so both are captured fresh each render).
- **Schema tripwire (`test_schema.cjs` + `schema.expected.json`) — the (ii) tooling.** Freezes the key-sets of `DEFAULT_G/D`, `SEG_DEFAULTS`, `DEF_SECTION`, `DEFAULT_LINE/PLACED` + `CURRENT_VERSION` + the `MIGRATIONS` step list. A rename/removal of a defaulted field (which flows silently through merge-on-defaults) makes the test FAIL and prints the migration ritual. Low-noise: it only fires on a deliberate shape change. (Verified it *bites*: a simulated `wWind→windForce` rename is flagged removed+added.) **Limit it can't cover:** line geometry fields aren't in any default object, so a *geometry* rename isn't auto-caught — that leans on the migration discipline + the stale fixture.
- **Migration-mechanism test (`test_migrate_ladder.cjs`).** `migrateProject(raw, migrations=MIGRATIONS, target=CURRENT_VERSION)` now takes injectable `migrations`/`target`, so a SYNTHETIC 3-step ladder proves the mechanism the real `MIGRATIONS[1]` (a no-op stamp) can't: steps run one-at-a-time **in order**, transform values **cumulatively** (`5 → ×2 → +10 = 20`), stop at `target`, enter mid-ladder for a vN file, halt cleanly on a missing step, and compute `newer` against `target`. A worked **unit-conversion + rename template** is in the `MIGRATIONS` comment for when the first real breaking change lands.
- **Frozen fixtures.** `fixture_v1.wps` / `fixture_v2.wps` (from rev 23) are now treated as **frozen, hand-edited, never regenerated** (regenerating from new defaults after a migration would make a *fake* old file). Added `fixture_v2_design.wps` (a geometry-complete line + 2-segment layout — exercises the lines/placed merge) and `fixture_v2_stale.wps` (one valid + one geometry-less line — exercises the stale path + the keep-layout-by-id behavior).
- **Verification:** esbuild bundle clean · comment-lexer clean · render smoke PASS with the **plan-tab render byte-identical to baseline** (27041 chars) · design + calc SSR-mount · **stale banner renders in-context** (App on the Design tab with `designStale` forced true → banner copy + "Rebuild from plan" present) · engine guard CLEAN (11/11) · `test_loadstate.cjs` **46/46** (rev-23 cases + design-merge + stale-path + lengthFt:0/missing-id drop) · `test_schema.cjs` **8/8 frozen** (+ a negative test confirming it detects a rename) · `test_migrate_ladder.cjs` **12/12**.

### Migration checklist — RUN THIS whenever you change the MEANING, UNIT, NAME, or PRESENCE of a saved field

merge-on-defaults (rev 23–24) silently handles **added** fields. It does **NOT** handle renames, removals, or unit/semantics changes — those load with *no error* and a *wrong value*. So, before shipping any such change:

1. **Bump `CURRENT_VERSION`** (e.g. 2 → 3).
2. **Add the `MIGRATIONS[oldV]` step** that transforms an old project into the new shape (rename the key, convert the unit, drop the obsolete field). Template is in the `MIGRATIONS` comment.
3. **Freeze a fixture at the OLD version** — hand-author or copy an existing pre-change `.wps`; never regenerate it from new defaults.
4. **Add a load assertion** in `test_loadstate.cjs` that the OLD fixture loads to the NEW correct value (this is the *only* thing that catches a botched unit conversion — the engine guard can't, it guards code not data interpretation).
5. **Update `schema.expected.json`** so `test_schema.cjs` goes green again (this is also the prompt that reminded you to do steps 1–4).

## 4y. Rev 25 — User-facing app version in the top bar (user-requested)

User asked for a version number at the top that reads "Version 1.00" and counts up 1.01, 1.02, … per update, rolling 1.99 → 2.00.

- **Two module-scope constants at the very top of the jsx** (placed first for discoverability, since they're bumped every release): `const APP_BUILD = 100;` (integer hundredths, the single thing you bump) and `const APP_VERSION = \`${Math.floor(APP_BUILD/100)}.${String(APP_BUILD%100).padStart(2,"0")}\`;` → `"1.00"`. Integer math (floor + `%` + `padStart`), so the rollover is correct **by construction**: 100→"1.00", 101→"1.01", 110→"1.10", 199→"1.99", 200→"2.00", 1099→"10.99" (all unit-tested).
- **Displayed** as `Version {APP_VERSION}` at the right end of the sticky suite tab bar (`marginLeft:"auto"` pushes it past the three tabs), in mono/`SW.faint` to match the drafting eyebrow type. It's inside the `no-print tbar`, so it shows on screen but not on printed calc sheets (offer to also stamp it into the calc/design title blocks if the user wants it on output — deliberately NOT done here to avoid changing the calc sheet).
- **THREE independent version counters now exist — do not couple them.** `APP_VERSION` (this, user-facing UI) · `CURRENT_VERSION = 2` (save-file schema, drives `.wps` migrations) · the handoff "rev" number (dev changelog). The header comment over `APP_BUILD` spells this out. Bumping the display version must never touch `CURRENT_VERSION`.
- **UI-only.** No engine/loader/schema/serialization touched: the byte-identity guard is CLEAN (11/11), and all three save-file suites (`test_loadstate` 46/46, `test_schema` 8/8, `test_migrate_ladder` 12/12) pass unchanged. `APP_BUILD`/`APP_VERSION` are intentionally NOT in `schema.expected.json` (they aren't save-file schema).
- **Verification:** esbuild bundle clean · engine guard CLEAN · version-format rollover 8/8 boundary cases · render smoke shows "Version 1.00" in the top bar + all three tabs still present · design + calc tabs SSR-mount · save-file suites unaffected.



1. **South-wall 80 ft cap**: typed lengths extended from the lower-ID node and clamped at x=0 → world is now **symmetric ±WORLD** at *all 6 clamp sites* (typed len ×2, split, node drag ×2, wall drag dx/dy).
2. **~80 ft drag reach**: frozen view capped gestures → `expandViewTo` live zoom-out.
3. **Design tab empty after handoff**: `buildSecData`'s reaction aggregation dropped `key` (`agg[rr.key]={kips,ax,ay}`) → now `{key:rr.key,...}`. Button finds edges by `r.key`.
4. **`SRef` TDZ crash on mount**: render-body `SRef.current=S` ran before the `const SRef` declaration → declaration moved up with view refs. **Lesson: dep arrays & render-body assignments evaluate at definition time.**
5. On-plan red force tags in Design tab removed (interfered with shear graphics; values live in the chips/header). Dashed line still click-selects.

## 4z. Rev 26 — TWO-STORY WOOD SHEAR WALL DESIGN (multi-step, in progress)

User-requested simple two-story option. **Model decision:** the two floors share ONE footprint + ONE shear-wall layout, so they are identical and vertically aligned by construction (no second graph to keep in sync; alignment for stacking is just "same segment index, same line"). Per-wall heights: existing `H`/`leeH` = 1st-story windward/leeward; new `H2`/`leeH2` = 2nd-story windward/leeward. **Engine invariant:** the 7 guarded fns (`calcSegment`, `generateDesign`, `evaluateCandidate`, `lineResults`, `withUtil`, `buildSecData`, `lineReactions`) stay byte-identical — every new structural quantity is derived OUTSIDE them (the `withUtil` pattern). Built step-by-step, user previews each before the next.

**The structural model (confirmed with the user):**
- **Roof diaphragm line load** (designs the **2nd-floor** shear walls) = `½·H₂·pw + parapets`. Equivalently `buildSecData`'s 1-story `w.total` with H→H₂: `roofLL = w.total + ½·(H₂−H)·pw` (parapets are height-independent so they cancel in the delta). Example: 374 + ½(10−13)16 = **350 plf**.
- **2nd-floor diaphragm line load** (designs the **1st-floor** shear walls) = `½·H₂·pw + ½·H·pw + roofLL` (2nd-story wall's lower half + 1st-story wall's upper half + the whole roof load transferred down). Example: 80 + 104 + 350 = **534 plf**. The ½·H₂·pw appears in both loads but for DIFFERENT halves of the 2nd-story wall (upper→roof, lower→2nd-floor) — not a double-count.
- **Vertical load stacking (Step 6, statics note — IMPORTANT):** stacking is by **overturning moment with the correct arm**, NOT a flat sum of chord reactions. The roof reaction sits a full story higher, so at the 1st-floor base it acts at `H₁+H₂`. The user corrected the illustrative "11k = 6k+5k": e.g. roof 5k×20ft + floor 6k×10ft, over a 10ft wall = (100+60)/10 = **16k**. So Step 6 accumulates `ΣRᵢ·hᵢ` (hᵢ from this wall's base) and re-derives end-post/holdown from the combined moment — done in a post-process wrapper, engine untouched.

**Step log (each = one preview-and-approve increment):**
- **Step 1 (build 101→102, UI scaffold).** App-level `twoStory`/`activeFloor` state (persisted in the `ui` slice, feature-detected on load; old files default to single-story; `CURRENT_VERSION` untouched). A **sliding 1-Story/2-Story pill** in a "Stories" ribbon group (`.storypill`/`.storythumb`/`.storyopt`, drafting blue, white thumb) — replaced the first-cut button at the user's request (screenshot of a segmented toggle). Floor selector moved **out of the canvas into its own `.floorbar` below the stage** (was an absolute overlay; clicks were intercepted by the SVG pointer handlers — the fix was to stop overlapping the canvas). `.canvascol` wraps the stage + floorbar.
- **Step 2 (build 103, data model).** `H2` added to `DEF_SECTION` (default `null`) and resolved in `mergeWallProps` (null → equals that wall's `H`), so toggling on changes nothing until edited; old files + new walls resolve correctly; legacy `parW`→`par` still migrates; the line-load inputs `buildSecData` reads are unchanged. `H2` rides in `wallProps` so save/load round-trips for free. A "Floor N" badge (pointer-events:none) marks the canvas in 2-story mode.
- **Step 3 (build 104, the two line loads).** Formulas above computed in the wind window (UI, outside the engine) and shown as a two-value readout (roof → 2nd-floor walls; 2nd-floor → 1st-floor walls) with itemized components, live as `H₂` is edited. 1-story mode shows the original single "Total wall line load". Degenerate `H₂=H` falls back to the familiar 1-story number (no surprise on toggle).
- **Step 4 (build 105→106, section-cut graphics).** New `SecDiagram2` component (sibling to `SecDiagram`, which is left byte-identical) draws the stacked two-story elevation: parapets, 2nd story (H₂) + 1st story (H) split by a dashed 2nd-floor diaphragm line, windward wall pressure over both stories, leeward parapet pressure, gold callouts labeling both diaphragm line loads, "1st floor · foundation" base. The Step-2 stopgap `H2` text field was removed (the diagram's red box is now the editor). **Leeward parity (build 106, user-requested):** the two-story diagram shows its own leeward 1st/2nd-story heights (`leeH`/`leeH2`) on the right, editable, exactly like the single-story diagram's leeward height — roof and 2nd-floor lines slope if windward≠leeward. `leeH2` forwarded via `activeSection`, seeded in the window, routed in `upd` (`prop==="leeH2"` → `setVals("lee",{H2})`). Leeward heights are display-only for the loads (which use the windward side).
- **Step 5 — part 1 (build 107, on-plan loads go floor-aware; user report: "loads on the plan don't change when I switch floors").** `propsForActive` wraps `propsFor` with a floor-specific EFFECTIVE wall height and feeds it to the `secH`/`secV` `buildSecData` calls (engine reads `pr.H` ONLY in the line-load term — verified — so the substitution scales line loads AND reactions with no geometric distortion): 2nd-floor plan → `H_eff = H₂` (roof diaphragm, 350-level); 1st-floor plan → `H_eff = H + 2·H₂` (2nd-floor diaphragm, 534-level; `½(H+2H₂)pw = ½H·pw + H₂·pw`, parapets ride along height-independently). 1-story mode passes through unchanged (byte-identical). Now the on-plan plf labels, reactions, and base shear all reflect the selected floor.
- **Step 5 — part 2 (build 108, both floors designed + Design-tab switcher).** `runDesignHandoff` now builds BOTH floors' lines in 2-story mode (`buildFloor(2)` from roof reactions @ design height `H₂`; `buildFloor(1)` from 2nd-floor reactions @ design height `H` — the `heightFt` is now floor-correct, previously always `H`) by re-running the frozen `buildSecData` with each floor's effective-height props. Handoff payload changed `lines` → `byFloor = {1:[…],2:[…]}`. App stores `designLinesByFloor`; `designLines` is now a DERIVED memo (`designLinesByFloor[activeFloor]`) so the Design tab + everything downstream is unchanged. `segsByLine` is SHARED across floors (shear walls are vertically aligned → same positions; only the per-floor forces/heights differ, so the auto-design results differ per floor). A **floor switcher** ("Designing 1st/2nd Floor") sits in the Design-tab constraints header, greyed until 2-story, and sets `activeFloor` (synced with the plan selector — one "current floor" concept). Switching floors re-derives the active lines with no recompute of the wind analysis. **Save/load:** `design.linesByFloor` (canonical); `loadProject` accepts either the new object OR a legacy `design.lines` array (→ `{1:[…]}`), validates each floor's geometry, and keeps the stale-recovery flag. KNOWN LIMITATION (acceptable for now, flagged to user): per-segment manual overrides (holdown/nailing/post) in `segsByLine` are shared across floors; the AUTO design already differs per floor.

**New/changed identifiers:** state `twoStory`,`activeFloor` (App) · `propsForActive` (floor-specific effective height) · `designLinesByFloor` (per-floor design store; `designLines` now derived) · `DEF_SECTION.H2` · `mergeWallProps` H2 resolution · `activeSection.{H2,leeH2}` · WindWindow `roofLL`/`floorLL`/`wallRes2` + `twoStory` prop + `leeH2` seed/route · `SecDiagram2` · CSS `.storypill/.storythumb/.storyopt/.canvascol/.floorbar/.floorsel/.floortab/.floorbadge` (and now-unused `.h2row*`).

**Verification each step:** esbuild compile + comment-balance + cjs bundle · App render smoke (1-story default unchanged, version ticks) · focused `SecDiagram2` render via a throwaway temp-export copy (callouts 350/534, four height boxes, sloped case no-NaN) · headless formula test (350/534 + degenerate) · headless `mergeWallProps` test (H2 resolution + backward-compat) · **engine byte-identity guard CLEAN every step**. (The original `.mjs`/`.cjs` harness files from §6/§6b were not in this session's zip; the substantive protections — engine guard + targeted headless tests — were reproduced inline. Step 7 will re-establish the checked-in fixtures + schema tripwire for the added fields.)

## 4aa. Rev 27 — Step 6: arm-aware vertical load stacking (1st-floor overturning)

The 1st-floor shear walls now resist the upper story's overturning with the **correct moment arm**. This is the one structurally substantive step of the two-story feature, and it lands **without touching the engine** — the 7 guarded fns (`calcSegment`, `generateDesign`, `evaluateCandidate`, `lineResults`, `withUtil`, `buildSecData`, `lineReactions`) are byte-identical (engine guard CLEAN), exactly like Steps 1–5. All new logic is a post-process wrapper, the `withUtil` pattern.

- **The statics (clean result).** Stacking is by **overturning moment with the right arm**, not a flat sum of chord reactions. The roof reaction sits a full upper story higher, so at the 1st-floor base it acts at `H₁+H₂`. Because **Step 5 already gave each floor the correct force AND design height** (1st floor = combined 534-level reaction @ `H`; 2nd floor = roof reaction @ `H₂`), the arm-aware base moment is **exactly the sum of the two floors' engine overturning moments for the same vertically-aligned segment**: `M_base = MotW(1st) + MotW(2nd)` (and likewise seismic). Worked: roof 5k @ 20ft + 2nd-floor 6k @ 10ft over a 10ft wall → MotW(1st)=11k·10=110, MotW(2nd)=5k·10=50, sum **160 k·ft** → `T = 160000/(L−0.125) ≈ 16,203 lbs` (the user's "16k, not 11k"). The reason the sum works: the 1st-floor `forceLbs` is the combined reaction (incl. the roof transferred down), and its engine moment already counts the WHOLE combined shear at arm `H₁`; adding the 2nd-floor engine moment (roof shear at arm `H₂`) supplies exactly the missing `R_roof·H₂` so the roof's effective arm becomes `H₁+H₂`. No new arm bookkeeping needed.
- **Where it lives.** Three new module-level helpers next to `lineResults` (NOT inside it): `upliftStk` (mirror of `calcSegment`'s local `upliftFn`), `stackSeg(r1, r2, L, hdDist, thickness, isWood)` (combines the two floors' `MotW`/`MotS`, then recomputes `compW`/`compS`/`upHD_*`/`maxComp`/`maxUplift` and re-runs the engine's **own** end-post ladder + `HD_TABLE` lookup from `r1.Pa`/`r1.wdl`/`r1.AwDL`/`r1.CwDL`/`r1.BwDL`), and `stackedLineResults(line1, line2, segs, g, d)` (runs `lineResults` for BOTH floors on the shared segments, stacks per segment, then re-derives `ovBad`/`dispHd`/`dispPost`/`failed` from the stacked numbers). All of these reuse the existing `xMax`/`HD_TABLE`/`postAllowable`/`hdCapacity` — no engine code copied that isn't a pure formula shape.
- **Wiring.** `DesignTab` gained a `linesByFloor` prop (App passes `designLinesByFloor`); its `resultsByLine` memo now stacks **only when `twoStory && activeFloor===1`** by matching each 1st-floor line to its 2nd-floor twin via the shared `id` (`ax|key`) and shared `segsByLine[id]`. The 2nd-floor view and 1-story mode keep calling plain `lineResults` (byte-identical behavior). The stacked results flow into BOTH the on-plan holdown bubbles and the selected-line table for free (single source).
- **What shear is NOT.** Stacking changes **only overturning** (post/holdown). The in-plane **shear/nailing** were already correct from Step 5 (the 534-level load carries the combined shear), so `status`/`selType`/`vW`/`vS`/`autoType` pass through unchanged — verified in the test (`stk.vW === r1.vW`, `stk.selType === r1.selType`).
- **UI.** When viewing the 1st floor in 2-story mode the selected-line table shows (a) a blue **note** explaining the arm-aware stacking and listing what is/isn't stacked, and (b) a new **"Overturning M · stacked"** row (governing `max(MotW,MotS)` in k·ft, accent-colored). Both are gated on `stacking` and absent on the 2nd floor / 1-story.
- **Scope note (flagged to the user + in the UI).** End post + max uplift + holdown are stacked; **anchor / strap / deflection / footing rows still reflect the single-floor 1st-story demand.** Those are secondary detailing keyed off the holdown; wiring them to the stacked uplift means mirroring `calcSegment`'s `anchorFor`/`embedFor`/`strapFor`/deflection/footing math outside the engine (≈40+ branchy lines). **User-confirmed (rev 27 session): do this together in Step 7** — i.e. Step 7 bundles (a) anchor/strap/footing/deflection re-derived from the stacked uplift/moment with (b) persistence/regression/finalize. A stacked holdown that reads `NG!` (uplift > HDU14 cap) correctly signals the demand even while the anchor row is unstacked, so the interim state is safe to test on the live deploy.
- **Verification:** esbuild compile + comment-lexer clean · engine guard CLEAN (7 fns byte-identical vs the session baseline) · App render smoke OK · new `work/test_stacking.cjs` (12 asserts: `MotW(stk)=MotW1+MotW2`; the 160 k·ft / ~16,203-lb example; uplift > single-floor; single-floor `HDU14` vs stacked `NG!`; shear/selType unchanged; 2nd-floor carries no `stacked` flag) · new `work/test_design_2story_ssr.cjs` (7 asserts: stacking note + overturning row + `160.0` render on the 1st floor; both absent on the 2nd). **New identifiers:** `upliftStk`, `stackSeg`, `stackedLineResults` · `DesignTab` prop `linesByFloor` · `resultsByLine` `stacking` flag · table "Overturning M · stacked" row + note. `APP_BUILD = 109` ("Version 1.09").

## 4bb. Rev 28 — Step 7a/7c: secondary detailing wired to the stacked demand + regression lock

Step 6 stacked only the **primary** overturning items (end post + uplift + holdown). Step 7a finishes the 1st-floor design by re-deriving the **secondary detailing** from the SAME arm-aware combined moment, so a stacked 1st-floor line is now internally consistent end-to-end. As with Steps 1–6, **the 7 guarded engine fns are byte-identical (guard CLEAN)** — every new quantity is a formula-shape mirror living in the `stackSeg` wrapper, never in `calcSegment`/`lineResults`.

- **What's now stacked (added in 7a).** Inside `stackSeg`: **anchor** `anchorSel`/`anchorEnd` (mirror of `calcSegment.anchorFor`, keyed off the stacked `hd`/`maxUplift` + `d.anchor`), **embedment** `embed`/`embedEnd` (mirror of `embedFor`), **straps** `altStrap`/`strapCorner` (mirror of `strapFor`, driven by a new stacked `upStrap_W`/`upStrap_S`/`maxStrap` computed with the E56/E57 **denominator of 3″** — distinct from the holdown denominator `1.5+hdDist`), **deflection** `deflW`/`deflS` (mirror of `defl`), and **footing** `reqFtgLen`/`LminS`/`LminW` (mirror of the `quad` + `P65`/`P70` footing block). Combined with the Step-6 `MotW`/`MotS`/`compW`/`compS`/`upHD_*`/`post`/`hd`, the stacked return object now overrides every detailing field.
- **Signature change.** `stackSeg(r1, r2, L, hdDist, thickness, isWood)` → **`stackSeg(r1, r2, L, g, d, h)`**. It now derives `sp`/`SCHED` from `g`, `anchor`/`hdDist`/`thickness`/`ftgWidth`/`ftgThick` from `d`, and takes the design height `h` (= `line1.heightFt`, for the deflection term). `stackedLineResults` passes `line1.heightFt`. No other call sites.
- **Dead-load + shear convention (kept from Step 6).** The stacked footing/uplift/compression use the **1st-floor's own** `wdl`/`B`/`BwDL`/`CwDL`/`AwDL` and base shear `Fs`/`Fw` (`r1.*`) with the **summed** moments. This matches Step 6's choice (combined moment + 1st-floor stabilizing dead load; conservative for uplift). If a future step wants the upper story's tributary dead load to add stabilizing weight at the 1st-floor base, that's a deliberate change to revisit with the user — not done here.
- **Deflection subtlety (flagged in the UI).** `v` (`r1.vW`/`r1.vS`) is unchanged — the 1st-floor story shear was already the combined 534-level shear from Step 5. Only the bending term's chord area uses the **stacked** end post. Since stacking only adds moment, the stacked post is ≥ the single-floor post, so the stacked Δ is ≤ the single-floor Δ (monotone). The Design-tab note explains this so a smaller stacked Δ isn't read as an error.
- **UI.** The blue stacking note in the selected-line table was rewritten: it no longer claims anchor/strap/deflection/footing are unstacked; it now says every row reflects the stacked demand and explains the Δ-with-stiffer-post behavior. The "Overturning M · stacked" row is unchanged.
- **Calc-sheet interaction (unchanged).** `applyToCalc` ("Send line to calculation sheet") still forwards only geometry + `selType` + `forceLbs`; the Calculation tab recomputes via `calcSegment` and is a single-line/single-floor view with NO moment stacking. Stacking is a Design-tab-only concept (`resultsByLine`). Documented so nobody "fixes" the calc sheet to stack.
- **Verification:** esbuild compile + comment-lexer balanced (72/72) · engine guard CLEAN (7 fns byte-identical vs the session baseline) · App render smoke 6/6 · engine golden 22/22 unchanged · note text confirmed in the built bundle (new note present, old caveat removed) · new checked-in `work/test_stacking_step7.cjs` (**25 asserts**): (A) §4aa 160 k·ft / ~16,203-lb example + NG! holdown + shear/selType unchanged; (B) exact discrete buckets on a 5000-lb stacked uplift → `HDU5` → anchor `SSTB24` → embed `Simpson`, strap uplift 5064.1 lbs (denom 3) → `altStrap STHD14` / `strapCorner None`, deflection finite>0, footing ≥ L+1; (C) end-to-end via `stackedLineResults` with real engine floors → moment = sum, uplift/comp/footing ≥ single-floor, Δ ≤ single-floor, shear/selType unchanged, valid anchor string, 1st-floor `stacked` flag set, top floor (no twin) NOT stacked. **New identifiers:** `stackSeg` stacked fields `upStrap_W`/`upStrap_S`/`maxStrap`/`anchorSel`/`anchorEnd`/`embed`/`embedEnd`/`altStrap`/`strapCorner`/`deflW`/`deflS`/`LminS`/`LminW`/`reqFtgLen`. `APP_BUILD = 110` ("Version 1.10").

## 4cc. Rev 28 — Step 7b: two-story persistence regression lock (fixtures + round-trip + schema tripwire)

The final Step-7 sub-task. It re-establishes the §4w/§4x save-file protections, now extended to cover the two-story fields, and proves a two-story project survives a `.wps` save/open. **No app code changed** — the persistence already worked end-to-end (it was built incrementally in Steps 1–5); 7b is checked-in test/fixture infrastructure that LOCKS it. The jsx stays at build 110.

- **Why it's testable without App surgery.** `loadProject`, `migrateProject`, and `mergeWallProps` are all **module-level pure functions** (not React closures): `loadProject(raw)` returns ready-to-dispatch slices and the `onFileChosen` handler just dispatches them. So the `work/exp.cjs` save/load-core bundle the older handoff referenced is rebuilt by appending one export line and esbuild-bundling (`export { loadProject, migrateProject, mergeWallProps, MIGRATIONS, CURRENT_VERSION, DEF_SECTION, DEFAULT_G, DEFAULT_D, SEG_DEFAULTS, DEFAULT_LINE, DEFAULT_PLACED };`).
- **How two-story state persists (confirmed by the test).** `H2` rides inside `sketcher.wallProps[key].H2` (restored verbatim by `projectRef.current.set`, then resolved at render by `mergeWallProps`: explicit value kept, `null` → that wall's `H`). The per-floor design is `design.linesByFloor` `{1:[…],2:[…]}` (loader normalizes a legacy single `design.lines` array → `{1:[…]}`). Mode is `ui.twoStory` / `ui.activeFloor` (old files lack them → `false` / `1`). The save `proj` shape (`onSave`): `{ app, version:2, savedAt, sketcher, design:{ linesByFloor, shape, segsByLine, d, selLine }, calc:{ g, segments }, ui:{ tab, hlSel, twoStory, activeFloor } }`.
- **Fixture.** `work/fixtures/fixture_v2_2story.wps` — a hand-built v2 two-story project matching that exact `onSave` shape: a 40×24 plan, two `wallProps` entries (one `H2:10`, one `H2:null`), `linesByFloor` floors 1 (combined `forceLbs` 16000) and 2 (roof 7000) sharing line id `h|A` and `segsByLine`, full `d`/`g`/`segments`, `ui.twoStory:true`.
- **Round-trip test.** `work/test_loadstate_2story.cjs` (**31 asserts**): (A) the fixture loads with `twoStory`/`activeFloor`/`tab` restored, both floors' lines kept (no false stale drop), geometry + per-floor forces preserved, shared `segsByLine` intact, `g`/`d`/`segments` merged onto defaults, `sketcher.wallProps` preserved verbatim; (B) `mergeWallProps` resolves `H2` (explicit kept, `null`→`H`, missing props→default `H`, legacy `parW`→`par`); (C) v1 back-compat (no `ui`, single `design.lines` array → `linesByFloor[1]`, defaults applied, migrates to v2); (D) a `version:99` file sets `newer:true`; (E) stale-line recovery (a geometry-less line is dropped + `stale` raised, its `segsByLine` entry KEPT for rebuild, two-story `ui` still restored).
- **Schema tripwire.** `work/test_schema.cjs` + `work/fixtures/schema.expected.json` (**15 asserts**) re-derive the live key-sets of `DEF_SECTION`/`DEFAULT_G`/`DEFAULT_D`/`SEG_DEFAULTS`/`DEFAULT_LINE`/`DEFAULT_PLACED` and the `loadProject` output `ui`/`design`/`calc` shapes, compare to the frozen expected, and FAIL on any add/remove/rename — plus hardcoded presence checks for `H2`/`twoStory`/`activeFloor`/`linesByFloor` that survive a careless expected-file regen. **Verified to fire** on a simulated `H2`→`h2` rename (negative control). This is the guard that forces a future rename to ship with a `CURRENT_VERSION` bump + a `MIGRATIONS` step + a fixture — merge-on-defaults silently mis-loads renamed fields, so without this they'd pass unnoticed. **Caveat (unchanged from §4x):** line GEOMETRY-field renames (`id`/`a`/`b`/`lengthFt` — not in a default object) are NOT auto-caught; they rely on discipline.
- **Save-file status:** still no real `.wps` files in the wild (Save-Open hasn't been used in anger — the app is deployed as of rev 29, but no real save has been made yet), so 7b is pre-emptive insurance. If a breaking schema change ever lands, freeze a fixture at the OLD version and add a load-assertion (the migration checklist in §4x / §7). **New checked-in artifacts:** `work/exp.cjs`, `work/fixtures/fixture_v2_2story.wps`, `work/fixtures/schema.expected.json`, `work/test_loadstate_2story.cjs`, `work/test_schema.cjs` (+ the rev-28a `work/sw_stack.cjs`, `work/test_stacking_step7.cjs`). No app change; `APP_BUILD = 110`.






## 4dd. Rev 29 — Deployed to Vercel (Vite host scaffold; NO app-code change)

The app went live on Vercel. The single-file React component is byte-identical — a thin Vite host shell was added AROUND it so a static build can mount it. **`APP_BUILD` stays 110 ("Version 1.10"); engine + the 7 guarded fns untouched; the jsx was not edited.** This is an infrastructure rev, so there is no version bump (the version display tracks app-code changes, and there were none).

- **The deployable repo (FLAT layout — all files at root).** The delivered zip is the source of truth:
  ```
  (repo root)
  ├─ index.html                 ← Vite entry
  ├─ main.jsx                   ← mounts <App/>
  ├─ plan-sketcher-suite.jsx    ← the app, UNCHANGED
  ├─ package.json
  ├─ vite.config.js
  ├─ .gitignore
  └─ PLAN_SKETCHER_SUITE_HANDOFF.md   ← this file (added rev 29)
  ```
  **⚠ Layout note:** the rev-29 chat *prose* described a `src/`-nested layout (`src/main.jsx`, `src/plan-sketcher-suite.jsx`). The actual delivered files are FLAT — `index.html` loads `./main.jsx`, and `main.jsx` imports `./plan-sketcher-suite.jsx`, both root-relative. If you re-issue the scaffold, match the flat layout that's live (or move both into `src/` AND update the two relative import paths together — don't half-do it).
- **`index.html`** — `#root` div + `<script type="module" src="./main.jsx">`. Carries a **4-line host reset**: `html,body{margin:0;padding:0}` + `#root{min-height:100vh}`. Reason: the app injects all its own styling but never resets the default body margin, and its roots size to `calc(100vh − 46px)` — without the reset you get a gutter. **This reset lives in the SHELL, not in the app file** (keeps the app byte-identical and portable).
- **`main.jsx`** — `import React from "react"` + `import ReactDOM from "react-dom/client"` + `import App from "./plan-sketcher-suite.jsx"`; `createRoot(#root).render(<React.StrictMode><App/></React.StrictMode>)`. The app's `export default function App()` is exactly what this expects.
- **`package.json`** — `"version":"1.10.0"`, `"type":"module"`; deps `react`/`react-dom` `^18.3.1`; devDeps `vite ^5.4.10` + `@vitejs/plugin-react ^4.3.4`; scripts `dev`/`build`/`preview`.
- **`vite.config.js`** — just `react()` plugin.
- **`.gitignore`** — `node_modules`, `dist`, `dist-ssr`, `.DS_Store`, `*.local`, `.vercel`, `npm-debug.log*`.
- **Why a bare mount suffices (re-verified against the source).** The only real `import` is `react` (the `…xlsx` grep hits are all inside comments, lines ~1962/1968/1969). No CSS-file imports (styling = injected `<style>` strings; IBM Plex from Google Fonts at runtime). No `import.meta`, no `process.env`, no `ReactDOM` inside the app file. So the shell's whole job is: provide React + react-dom and mount `<App/>`.
- **No `vercel.json`.** Navigation is internal tab state (no react-router / no URL routes) → nothing to rewrite, no SPA-fallback rule needed.
- **Vercel project settings (auto-detected Vite, no overrides):** Framework Preset **Vite** · Build `npm run build` · Output `dist` · Install `npm install`. Every push to `main` auto-redeploys.
- **Handoff-in-repo:** the first push omitted this MD; rev 29 adds it to the repo so the handoff travels with the code (per the §0 "handoff tracks code" rule, now also "handoff ships in the repo").
- **OPEN — the one live sign-off (unchanged target, now actionable on the live URL):** preview the stacked 1st-floor detailing and a two-story `.wps` save/open on the deployed Vercel site, then sign off to close the Step-7 two-story feature.

## 4ee. Rev 30 — Text Scale control on the Plan Sketcher toolbar (user-requested)

**The problem.** On-plan label text is sized `fontSize = 1.35·S`, where `S = Math.max(view.w, view.h)/110` (line ~1004). `S` grows as you zoom out (the viewBox widens), which keeps the label at a roughly **constant screen size** at any zoom. Great for a normal plan; bad for a large plan zoomed way out — the building shrinks but the labels don't, so they blanket the drawing. The user asked for a scaler to shrink them.

**The control.** A new ribbon group **Text** (a `<div className="rgroup">` with `rlabel` "Text"), placed **between View and Stories**, holding a single `<select className="rsel">` with options `1×` / `0.75×` / `0.5×` / `0.25×` (default `1×`). `value={textScale} onChange={e=>setTextScale(parseFloat(e.target.value))}` — state stays numeric so the components can multiply by it directly. New CSS class `.rsel` (added right after `.rbtn:disabled`) mirrors `.rbtn`'s look (white, ink, hover→accent, focus ring); it is a native select so it's keyboard/AX-friendly and needs no popover code.

**State.** `const [textScale,setTextScale]=useState(1);` declared in `PlanSketcher` immediately after `dims` (line ~911). Default `1` ⇒ no behavioral change from rev 29.

**Where it applies (the COMPLETE set of sketcher-canvas text — nothing in the wind-window modal / `SecDiagram*`, which are fixed-size in their own panel):**
- `Tag({…, ts=1})` — used by **dimension labels** and the **reaction rocket chip**. Scales `fs=1.35·S·ts` AND the box (`w` padding term, `h` via fs, `rx`, the text y-nudge) so the whole chip shrinks, not just the glyphs (a shrunk glyph in a full-size box wouldn't reduce obstruction).
- `WindLoad({…, ts=1})` — the `… plf` label (`fontSize={1.35*S*ts}`). Arrows/lines/offsets unchanged.
- `Reaction({…, ts=1})` — threads `ts` straight into its `<Tag … ts={ts}/>`.
- Two inline canvas texts in `PlanSketcher`: the **draw-mode live length** `{L}′` and the **`⚠ imbalance`** flag — each multiplied by `*textScale`.
- Mount sites pass `ts={textScale}`: `<WindLoad …>` (×2, h/v), `<Reaction …>` (×2), and the dimension `<Tag …>`.

**`ts` defaults to 1 on every component**, so all pre-existing call sites (and the SSR smokes, and any future re-use) render byte-identically. Only text size + the `Tag` box that wraps text respond to the control; **no drawing geometry** (strokes, arrows, nodes, grid, divides, box *positions*) moves.

**Persistence.** `textScale` is added to the sketcher session `get()` snapshot (`…, dims, textScale }`) and restored in `set()` via `if("textScale" in s) setTextScale(Number(s.textScale)||1);` — forward-compatible (old `.wps` lacking the field default to `1`). **This is sketcher session-UI, not part of `loadProject`'s `ui`/`design`/`calc` shapes, so the schema tripwire (`test_schema.cjs`) is unaffected** — no `schema.expected.json` regen needed.

**Engine guard CLEAN.** All app-code changes are in: the `APP_BUILD` const, the `CSS` template (`.rsel`), the three module-scope sketcher visuals (`Tag`/`WindLoad`/`Reaction`), and `PlanSketcher` (state + ribbon JSX + two inline texts + session get/set). The engine and the 10 engine/stacking functions verified this rev (`calcSegment`, `generateDesign`, `lineReactions`, `buildSecData`, `findLeewardPartner`, `lineResults`, `stackSeg`, `stackedLineResults`, `upliftStk`, `withUtil` — a superset of the canonical "7 guarded fns") are byte-identical — verified by extract-and-diff against `.engine-baseline.jsx` (all 10 IDENTICAL).

**Verification.** esbuild compile OK; comment-lexer clean; SSR render smoke (asserts the **Text** group, all four options, default value 1, and that the **View** Fit button + **Stories** pill survive); focused component test exporting `Tag`/`Reaction`: `Tag` fontSize `13.5→6.75` at `ts .5`, box `width` shrinks, **omitted-`ts` ≡ `ts:1`**, `Reaction` label `3.375` at `ts .25`. Render length 30,940 → 31,769 (the added dropdown). Build `APP_BUILD = 111` ("Version 1.11").

**Judgment call (reversible).** The draw-mode **live length** readout also obeys `textScale`, so at `0.25×` it gets small while drawing. Included for consistency (it's on-plan text like the rest); exempting it is a one-line change (drop `*textScale` on that single inline `<text>`) if the user prefers it always full-size.

## 6. Verification workflow (run the FULL sweep once at session start; minimal guard per edit)

**Cadence (rev 27):** run the full sweep below **once, at the beginning of the chat**, to establish a clean baseline (and snapshot the engine baseline before the first edit). After that, **don't re-run the whole sweep on every edit** — it burns tokens. The minimal per-edit guard is: (1) esbuild compile, (2) the engine byte-identity check (cheap), (3) one focused render/headless smoke for the specific thing you changed. Run the full sweep again only before handing back a finished increment (or when you touched something broad).

esbuild lives at `/home/claude/node_modules/.bin/esbuild`; react/react-dom 18 installed in `/home/claude`.

```bash
# 1) compile (syntax only — NOT sufficient alone)
./node_modules/.bin/esbuild work/plan-sketcher-suite.jsx --bundle --external:react --format=esm > /dev/null

# 2) RENDER SMOKE (catches TDZ/runtime mount errors — bug #4 class)
./node_modules/.bin/esbuild work/plan-sketcher-suite.jsx --bundle --format=cjs \
  --outfile=/tmp/suite.cjs --external:react --external:react-dom
node work/test_render_smoke.cjs   # renderToString(App); asserts tab bar, canvas, ribbon, status bar

# 3) logic suite (all in /home/claude/work, replicate engine logic + golden values)
for t in test_reactions test_reentrant_reactions test_cut test_model test_subload test_integration \
         test_viewexpand test_walllen test_drawlen test_handoff; do node $t.mjs; done
```

Test coverage: beam reactions vs CAD screenshots to the kip (incl. 3.18/3.07/0.75k 3-support case, split-invariance, cantilever, **re-entrant interior-wall supports — L-shape step wall dominant + totals balance, N–S/rectangle unchanged**); cut segment-pick + 2-wall gate; parapet anchoring/back-wall tracking; per-region plf (210/148/190/160) + divides; per-line shear engine + optimizer + override NG; view expansion; LENGTHEN end-pick; draw-chain (ortho/snap/loop-close/dupe-reject); handoff seam (incl. regression: key-less agg ⇒ 0 lines).

**Working methodology (established):** flag any app-vs-reference discrepancy, verify against the actual standard/screenshot before deciding which is wrong; reproduce the bug in a Node test *first*, fix, keep the test as regression; audit downstream dependents before touching shared code; never trust "compiles" — run the render smoke.

## 6b. Reproducing the FULL test harness from scratch (self-contained — no external files needed)

The tests below are NOT bundled with the app; this section is their complete source plus the exact build steps so any fresh environment can recreate and run them. Everything assumes the app file is at `work/plan-sketcher-suite.jsx` (adjust paths if different). Tabs/SSR notes: `renderToString` inserts `<!-- -->` between adjacent JSX text nodes — always `.replace(/<!-- -->/g,"")` before substring checks. Some suites need the app mounted on a non-default tab or with a synthetic design line, and two suites import internals via a temporary `export {…}` appended to a copy of the file. Engine functions must stay byte-identical across UI revs — the `diff` check at the end enforces that.

### Step 1 — one-time environment setup
```bash
cd /home/claude            # or your project root
npm install esbuild react@18 react-dom@18      # esbuild → ./node_modules/.bin/esbuild
```

### Step 2 — build every bundle the suites consume (rebuild only the bundle a suite needs; full set at session start)
```bash
cd /home/claude
ESB=./node_modules/.bin/esbuild
SRC=work/plan-sketcher-suite.jsx

# (a) plain app bundle — used by render_smoke, ribbon_pin, rev7, rev9, rev10
$ESB $SRC --bundle --format=cjs --outfile=work/suite.cjs --external:react --external:react-dom --log-level=error

# (b) design tab mounted WITH a synthetic line that has plan geometry (a/b points + windAxis),
#     else DesignPlan.lineGeom throws on ln.a.x — used by rev7, rev9, rev11
sed 's/useState("plan")/useState("design")/; s/const \[designLines, setDesignLines\] = useState(\[\]);/const [designLines, setDesignLines] = useState([{id:"L1", a:{x:0,y:0}, b:{x:40,y:0}, windAxis:"h", lengthFt:40, heightFt:12, forceLbs:14040}]);/' $SRC > /tmp/design_lines.jsx
$ESB /tmp/design_lines.jsx --bundle --format=cjs --outfile=work/design_lines.cjs --external:react --external:react-dom --log-level=error

# (c) calc tab mounted — used by rev10 (gauges)
sed 's/useState("plan")/useState("calc")/' $SRC > /tmp/calc_tab.jsx
$ESB /tmp/calc_tab.jsx --bundle --format=cjs --outfile=work/calc_tab.cjs --external:react --external:react-dom --log-level=error

# (d) Reaction component exported — used by rev12 (rocket)
cp $SRC /tmp/rk.jsx; printf '\nexport { Reaction };\n' >> /tmp/rk.jsx
$ESB /tmp/rk.jsx --bundle --format=cjs --outfile=work/rk.cjs --external:react --external:react-dom --log-level=error

# (e) engine functions exported — used by the two .mjs golden suites
cp $SRC /tmp/sw_test.jsx; printf '\nexport { calcSegment, generateDesign, schedFor, SCHEDULE, SCHEDULE_STR1, withUtil };\n' >> /tmp/sw_test.jsx
$ESB /tmp/sw_test.jsx --bundle --format=cjs --outfile=work/sw_test.cjs --external:react --external:react-dom --log-level=error

# (f) wind-field engine exported — used by test_reentrant_reactions (rev 18)
cp $SRC /tmp/secdata.jsx; printf '\nexport { buildSecData, keyOf };\n' >> /tmp/secdata.jsx
$ESB /tmp/secdata.jsx --bundle --format=cjs --outfile=work/secdata.cjs --external:react --external:react-dom --log-level=error
```

### Step 3 — run everything
```bash
cd /home/claude
for t in test_render_smoke test_ribbon_pin test_rev7 test_rev8_compact \
         test_rev9_design test_rev10_polish test_rev11_panel test_rev12_rocket \
         test_reentrant_reactions; do
  node work/$t.cjs >/dev/null 2>&1 && echo "  $t OK" || { echo "  $t FAIL"; node work/$t.cjs; }
done
node work/test_str1_golden.mjs && node work/test_str1_design.mjs

# Engine guard: prove no UI edit changed the math.
# ONE-TIME, before your first edit this session, snapshot the baseline:
#     cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx
# Then after any edit, run this to confirm the 7 engine fns are byte-identical to that baseline:
python3 - <<'PY'
import os, sys
BASE='work/.engine-baseline.jsx'
if not os.path.exists(BASE):
    sys.exit("no baseline yet — run: cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx (do this BEFORE your first edit)")
def fn(src,name):
    i=src.find('function '+name+'(');d=0;k=src.find('{',i)
    while True:
        if src[k]=='{':d+=1
        elif src[k]=='}':
            d-=1
            if d==0:break
        k+=1
    return src[i:k+1]
prev=open(BASE).read(); new=open('work/plan-sketcher-suite.jsx').read()
fns=['calcSegment','generateDesign','evaluateCandidate','lineResults','withUtil','buildSecData','lineReactions']
bad=[f for f in fns if fn(prev,f)!=fn(new,f)]
print('ENGINE', 'CLEAN' if not bad else 'DIRTY — changed: '+', '.join(bad))
PY
# NOTE: refresh the baseline only when the user EXPLICITLY approves an engine/formula change,
# i.e. after that change lands: cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx
```

### Step 4 — the test sources (write each verbatim to `work/<name>`)

<details><summary><code>work/test_render_smoke.cjs</code></summary>

```js
// Render smoke — mounts App via renderToString, asserts key UI landmarks.
const React = require("react");
const { renderToString } = require("react-dom/server");
const App = require("/home/claude/work/suite.cjs").default;
if (!App) { console.error("FAIL: no default export App"); process.exit(1); }
let html;
try { html = renderToString(React.createElement(App)); }
catch (e) { console.error("FAIL: render threw:", e.message); process.exit(1); }
const clean = html.replace(/<!-- -->/g, "");
const checks = [
  ["tab bar - Plan Sketcher", /Plan Sketcher/], ["tab bar - Calculation", /Calculation/],
  ["tab bar - Design", /Design/], ["svg canvas", /<svg/],
  ["ribbon Draft group or Draw button", /Draw|Draft/], ["status bar SNAP flag", /SNAP/],
];
let fail = 0;
for (const [name, re] of checks) { if (re.test(clean)) console.log("PASS:", name); else { console.error("FAIL:", name); fail++; } }
process.exit(fail ? 1 : 0);
```
</details>

<details><summary><code>work/test_ribbon_pin.cjs</code> (rev 5)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
const html = renderToString(React.createElement(require("/home/claude/work/suite.cjs").default)).replace(/<!-- -->/g, "");
const count = (s) => (html.split(s).length - 1);
let fail = 0; const t = (n, ok) => { console.log((ok?"PASS":"FAIL")+": "+n); if(!ok) fail++; };
t("ribbon sticky CSS", /\.ribbon\{[^}]*position:sticky;top:var\(--tabbar-h,42px\);z-index:30/.test(html.replace(/\n/g,"")));
t("no Options card", !html.includes("<h4>Options</h4>"));
t("Snap only on ribbon", count("Snap to grid") === 1);
t("Ortho only on ribbon", count("Orthogonal (90°)") === 1);
t("Dims toggle only on ribbon", !html.includes(">Dimensions <"));
t("Draw button only on ribbon", count(">✏ Draw</button>") === 1); t("hint card kept", html.includes("✏ Draw walls</b>"));
for (const b of ["✏ Draw","⌗ Snap","∟ Ortho","⟷ Dims"]) t("ribbon btn "+b, html.includes(b));
t("no ribbon Presets group", !html.includes('class="rlabel">Presets'));
t("side panel Presets kept", html.includes("<h4>Presets</h4>"));
t("preset buttons in side panel", /class="btn">Rectangle/.test(html));
for (const g of ["File","Edit","Draft","Analyze"]) t("ribbon group "+g, html.includes('class="rlabel">'+g));
process.exit(fail?1:0);
```
</details>

<details><summary><code>work/test_rev7.cjs</code> (Clear→ribbon, grouped pinned panel, shared dead loads)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
let fail = 0; const t = (n, ok) => { console.log((ok?"PASS":"FAIL")+": "+n); if(!ok) fail++; };
{
  const h = renderToString(React.createElement(require("/home/claude/work/suite.cjs").default)).replace(/<!-- -->/g, "");
  t("ribbon has Clear", h.includes(">🗑 Clear</button>"));
  t("ribbon Clear in Edit group", /Edit[\s\S]{0,600}🗑 Clear/.test(h));
  t("side panel Clear removed", (h.split('class="btn"').length-1) > 0 && !/class="btn"[^>]*>Clear</.test(h));
  t("side panel Undo kept", /class="btn"[^>]*>Undo</.test(h));
}
{
  const h = renderToString(React.createElement(require("/home/claude/work/design_lines.cjs").default)).replace(/<!-- -->/g, "");
  for (const grp of ["Loads","Dimensions","Plywood","Other constraints"]) t("group card: "+grp, h.includes(">"+grp+"</div>"));
  for (const f of ["Roof DL","Floor DL","Wall self","Roof trib","Floor trib"]) t("Loads field: "+f, h.includes(">"+f+"</span>"));
  for (const f of ["Min segment","Max segment","Max segs","Snap","Thickness","HD dist"]) t("Dimensions field: "+f, h.includes(">"+f+"</span>"));
  t("Plywood holds Sheathing + Max SW type", /Plywood[\s\S]{0,900}Sheathing[\s\S]{0,900}Max SW type/.test(h));
  t("Other holds Objective + Anchored + Optimize", /Other constraints[\s\S]{0,1500}Objective[\s\S]{0,1500}Anchored into[\s\S]{0,1500}Optimize design/.test(h));
  t("panel is sticky below tab bar", /position:sticky;top:var\(--tabbar-h,42px\);z-index:30[\s\S]{0,520}Design constraints/.test(h.replace(/\n/g,"")));
  t("hint says dead loads shared", h.includes("dead loads and sheathing grade are shared with it"));
  t("dead-load values render (20/0/15)", h.includes('value="20"') && h.includes('value="15"'));
}
process.exit(fail ? 1 : 0);
```
</details>

<details><summary><code>work/test_rev8_compact.cjs</code> (stub — superseded by rev 11)</summary>

```js
// rev-8 (conSel/conNum 24px panel) superseded by rev-11 (pinNumS/pinSelS 22px inline grids).
// Old DOM markers gone; coverage now in test_rev11_panel.cjs. Kept as a runnable stub.
console.log("PASS: rev-8 panel superseded by rev-11 (see test_rev11_panel.cjs)");
process.exit(0);
```
</details>

<details><summary><code>work/test_rev9_design.cjs</code> (design system: type, desk, title block, micro-interactions)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
const h0 = renderToString(React.createElement(require("/home/claude/work/suite.cjs").default)).replace(/<!-- -->/g, "");
let f = 0; const ok = (n,c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) f++; };
ok("Plex fonts imported once", (h0.split("fonts.googleapis.com/css2?family=IBM+Plex+Mono").length-1) === 1);
ok("MONO stack leads with Plex Mono", h0.includes("IBM Plex Mono"));
ok("UI stack leads with Plex Sans", h0.includes("IBM Plex Sans"));
ok("paper-desk grid (4 gradients, 110/22 rhythm)", /\.paper-desk\{[\s\S]*?110px 110px, 110px 110px, 22px 22px, 22px 22px/.test(h0));
ok("sketcher .r carries the same grid", /\.r\{[\s\S]*?background-size:110px 110px[\s\S]*?22px 22px/.test(h0));
ok("App root on the desk (plan tab)", (h0.split('class="paper-desk').length-1) >= 1);
const hD = renderToString(React.createElement(require("/home/claude/work/design_lines.cjs").default)).replace(/<!-- -->/g, "");
ok("design wrapper on desk + scoped sw-root", hD.includes('class="paper-desk sw-root"'));
ok("print strips the grid", h0.includes("@media print{ .paper-desk{ background-image:none !important"));
ok("brand block sub-line", h0.includes("STRUCTURAL SUITE"));
ok("sheet-number eyebrows S-1/2/3", ["S-1","S-2","S-3"].every(x => new RegExp('class="teye"[^>]*>'+x+'<').test(h0)));
ok("tab hover styles present", h0.includes(".ttab:hover"));
ok("focus-visible ring", h0.includes("button:focus-visible, select:focus-visible, input:focus-visible{ outline:2px solid #23577F"));
ok("reduced motion respected", h0.includes("prefers-reduced-motion: reduce"));
ok("ribbon stuck-shadow appended after z-index", /z-index:30;box-shadow:0 2px 10px -7px/.test(h0));
ok("rbtn transitions + active press", h0.includes(".rbtn:active{box-shadow:inset"));
ok("faded separators", h0.includes(".rsep{width:1px;background:linear-gradient"));
ok("tabular numerals scoped", h0.includes("font-variant-numeric:tabular-nums"));
ok("desk tone #EFEDE6 in .r vars", h0.includes("--bg:#EFEDE6"));
ok("drafting tick before section titles (design tab)", /width:6px;height:6px;background:rgb\(35, 87, 127\)|width:6px;height:6px;background:#23577F/.test(hD));
ok("pinned constraints backdrop is sheet-white", /position:sticky;top:var\(--tabbar-h,42px\);z-index:30;background:#FFFFFF/.test(hD.replace(/\n/g,"")));
process.exit(f ? 1 : 0);
```
</details>

<details><summary><code>work/test_rev10_polish.cjs</code> (refined D/C gauges + signature legibility)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
let f = 0; const ok = (n,c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) f++; };
{
  const calc = require("/home/claude/work/calc_tab.cjs").default;
  const h = renderToString(React.createElement(calc)).replace(/<!-- -->/g, "");
  ok("gauge track is pill + inset shadow", h.includes("box-shadow:inset 0 1px 1.5px rgba(28,39,51,0.12)"));
  ok("over-capacity gauge is hatched", h.includes("repeating-linear-gradient(135deg, #B23A2A"));
  ok("over-capacity shows ▲ marker", h.includes("▲"));
  ok("gauge fill has width transition", h.includes("transition:width .3s cubic-bezier"));
  ok("legend updated to hatch wording", h.includes("hatched red &gt; 100%") || h.includes("hatched red > 100%"));
  ok("100% marker present", h.includes('title="100% capacity"'));
}
{
  const h = renderToString(React.createElement(require("/home/claude/work/suite.cjs").default)).replace(/<!-- -->/g, "");
  ok("grid lifted to .12/.06 (4 strong lines)", (h.split("rgba(35,87,127,.12)").length-1) === 4);
  ok("refined floating shadow on sheets", h.includes("0 10px 24px -14px rgba(28,39,51,.30), 4px 4px 0 rgba(28,39,51,.10)"));
  ok("refined shadow on plan stage too", h.includes("0 10px 24px -14px rgba(28,39,51,.30), 4px 4px 0 rgba(28,39,51,.10);"));
}
process.exit(f ? 1 : 0);
```
</details>

<details><summary><code>work/test_rev11_panel.cjs</code> (inline aligned constraints panel — 35 asserts)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
const h = renderToString(React.createElement(require("/home/claude/work/design_lines.cjs").default)).replace(/<!-- -->/g, "");
const i = h.indexOf(">Design constraints<"), j = h.indexOf("Line force and wall height");
const P = h.slice(i, j);
let f = 0; const ok = (n,c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) f++; };
const grids = (P.match(/grid-template-columns:repeat\((\d)/g)||[]);
ok("four card grids", grids.length === 4);
ok("Loads+Dimensions are 2-col", (P.match(/repeat\(2,/g)||[]).length === 2);
ok("Plywood+Other are 1-col", (P.match(/repeat\(1,/g)||[]).length === 2);
ok("all controls at uniform 22px (16)", (P.match(/height:22px/g)||[]).length === 16);
ok("number inputs fixed 46px", (P.match(/width:46px/g)||[]).length >= 6);
ok("labels are inline + truncate-safe", (P.match(/text-overflow:ellipsis/g)||[]).length >= 11);
ok("no stacked column fields", !P.includes("flex-direction:column"));
ok("field labels at 8.5px", P.includes("font-size:8.5px"));
ok("card titles compact 9px", (P.match(/font-size:9px/g)||[]).length >= 4);
for (const u of ["psf","ft","in"]) ok("unit gutter "+u, P.includes(">"+u+"</span>"));
ok("labels carry no unit parens", !/Roof DL \(psf\)|Min segment \(ft\)/.test(P));
for (const l of ["Roof DL","Floor DL","Wall self","Roof trib","Floor trib","Min segment","Max segment","Max segs","Snap","Thickness","HD dist","Sheathing","Max SW type","Objective","Anchored into"])
  ok("field: "+l, P.includes(">"+l+"</span>"));
ok("Roof DL bound to 20", P.includes('value="20"'));
ok("Wall self bound to 15", P.includes('value="15"'));
ok("Plywood readout W/S", P.includes("Allow. W (plf)") && P.includes("435/645/840") && P.includes("Allow. S (plf)") && P.includes("310/460/600"));
ok("Objective short labels, no 'Minimize'", P.includes("Min. wall length") && P.includes("Min. nailing (type)") && !P.includes("Minimize"));
ok("uneven flex weights", P.includes("flex:1.4 1 280px") && P.includes("flex:1 1 210px"));
ok("Optimize button present", P.includes("⚡ Optimize design"));
process.exit(f ? 1 : 0);
```
</details>

<details><summary><code>work/test_rev12_rocket.cjs</code> (reaction label rotation)</summary>

```js
const React = require("react");
const { renderToString } = require("react-dom/server");
const { Reaction } = require("/home/claude/work/rk.cjs");
const S = 10;
let f = 0; const ok = (n,c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) f++; };
const rot = s => { const m = s.match(/rotate\(([-\d.]+)/); return m ? +m[1] : null; };
const horiz = renderToString(React.createElement(Reaction, { r:{ax:40,ay:18,kips:7.29,key:"0-1"}, tdir:{x:1,y:0}, S }));
const vDown = renderToString(React.createElement(Reaction, { r:{ax:20,ay:31,kips:11.22,key:"0-3"}, tdir:{x:0,y:1}, S }));
const vUp   = renderToString(React.createElement(Reaction, { r:{ax:20,ay:31,kips:3.0,key:"0-3"}, tdir:{x:0,y:-1}, S }));
ok("horizontal reaction label NOT rotated", rot(horiz) === null);
ok("vertical-down reaction label rotated -90", rot(vDown) === -90);
ok("vertical-up reaction label also rotated", rot(vUp) === -90);
ok("vertical rocket keeps arrowhead nose", vDown.includes("url(#reactArr)"));
ok("vertical rocket keeps its value text", vDown.includes("11.22k"));
ok("horizontal rocket keeps arrowhead + text", horiz.includes("url(#reactArr)") && horiz.includes("7.29k"));
process.exit(f ? 1 : 0);
```
</details>

<details><summary><code>work/test_str1_golden.mjs</code> (engine vs Structural I spreadsheet — golden values)</summary>

```js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const M = require("/home/claude/work/sw_test.cjs");
const { calcSegment, schedFor, SCHEDULE, SCHEDULE_STR1 } = M;
const g = { code:4, species:1, vSeismic:0, sds:0, R:6.5, wWind:23400, roofDL:20, floorDL:0, wallDL:18 };
const seg = { length:32, height:16, roofTrib:33, floorTrib:0, hdDist:6.88, thickness:5.5,
              anchor:"Concrete", selType:1, ftgWidth:1.33, ftgThick:12 };
let fail = 0; const ok = (n, c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) fail++; };
const close = (a, b, tol=1e-6) => Math.abs(a-b) <= tol * Math.max(1, Math.abs(b));
ok("str1 wind 475/715/930", JSON.stringify(SCHEDULE_STR1.map(t=>t.wind))==="[475,715,930]");
ok("str1 seismic 340/510/665", JSON.stringify(SCHEDULE_STR1.map(t=>t.seismic))==="[340,510,665]");
ok("str1 Ga 19.2/24/26.4", SCHEDULE_STR1.map(t=>t.ga).every((v,i)=>close(v,[19.2,24,26.4][i])));
ok("rated unchanged", JSON.stringify(SCHEDULE.map(t=>[t.wind,t.seismic]))==="[[435,310],[645,460],[840,600]]");
const r1 = calcSegment(seg, { ...g, grade:"str1" }, 32);
ok("vW = 438.75", close(r1.vW, 438.75));
ok("sugW = 1 (438.75 <= 475)", r1.sugW === 1);
ok("sugS = 1, allowS = 340", r1.sugS === 1 && r1.allowS === 340);
ok("compS = 2907.4490", close(r1.compS, 2907.4490176241948));
ok("compW = 9917.5479 (E42 quirk)", close(r1.compW, 9917.547871319102));
ok("post = 6x6", r1.post === "6x6");
ok("maxUplift = 0, hd = None", r1.maxUplift === 0 && r1.hd === "None");
ok("straps None/None", r1.altStrap === "None" && r1.strapCorner === "None");
ok("deflW = 0.59896641 (Ga 19.2)", close(r1.deflW, 0.5989664108618654));
ok("deflS = 0.0625", close(r1.deflS, 0.0625));
ok("reqFtgLen = 33", close(r1.reqFtgLen, 33));
const r0 = calcSegment(seg, { ...g, grade:"rated" }, 32);
ok("rated sugW = 2 (438.75 > 435)", r0.sugW === 2);
ok("rated status FAILED at selType 1", r0.status === "FAILED!!!");
ok("str1 status OK at selType 1", r1.status === "OK");
const rU = calcSegment(seg, g, 32);
ok("undefined grade === rated (sugW)", rU.sugW === r0.sugW && close(rU.deflW, r0.deflW));
ok("schedFor default", schedFor(undefined) === SCHEDULE && schedFor("str1") === SCHEDULE_STR1);
const half = { ...seg, length:16 };
const a = calcSegment(half, { ...g, grade:"str1" }, 32), b = calcSegment(half, { ...g, grade:"str1" }, 32);
ok("split halves equal (str1)", close(a.vW, b.vW) && close(a.Fw + b.Fw, r1.Fw));
process.exit(fail ? 1 : 0);
```
</details>

<details><summary><code>work/test_str1_design.mjs</code> (optimizer benefits from Structural I)</summary>

```js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { generateDesign } = require("/home/claude/work/sw_test.cjs");
let fail = 0; const ok = (n, c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) fail++; };
const g = { code:4, species:1, vSeismic:0, sds:0, R:6.5, wWind:14800, roofDL:20, floorDL:0, wallDL:15 };
const d = { lineLength:40, height:10, roofTrib:10, floorTrib:0, hdDist:6.88, thickness:5.5, anchor:"Concrete",
            minSegLen:4, maxSegLen:12, maxSegments:4, maxType:3, snap:0.5, objective:"nailing", ftgWidth:1.33, ftgThick:12 };
const rRated = generateDesign({ ...g, grade:"rated" }, d);
const rStr1  = generateDesign({ ...g, grade:"str1"  }, d);
ok("both grades find a design", !!rRated && !!rStr1);
ok("str1 type <= rated type", rStr1.meta.type <= rRated.meta.type);     // NOTE: optimizer returns {segs, meta:{type}}
const totLen = (r) => r.segs.reduce((a,s)=>a+s.length,0);
ok("str1 needs <= wall length of rated", totLen(rStr1) <= totLen(rRated));
process.exit(fail?1:0);
```
</details>

<details><summary><code>work/test_reentrant_reactions.cjs</code> (rev 18 — re-entrant interior-wall point loads + equal-plf label merge; needs bundle <code>(f)</code>)</summary>

```js
// Regression: re-entrant interior walls take point-load reactions (like full-depth interior walls),
// and a windward wall's on-plan plf label merges where the load is equal along it.
const { buildSecData, keyOf } = require("./secdata.cjs");
let fail=0; const ok=(n,c)=>{console.log((c?"PASS":"FAIL")+": "+n); if(!c)fail++;};
const close=(a,b,t=0.05)=>Math.abs(a-b)<=t;
const DEF={H:13,pw:16,qWind:32,qLee:22,par:5};
function build(nodes,edgePairs,ringN,sec){
  const N=nodes.map((p,i)=>({id:i,...p}));
  const E=edgePairs.map(([a,b])=>a<b?{a,b}:{a:b,b:a});
  const d=buildSecData(sec,{nodes:N,edges:E},{ring:N.slice(0,ringN)},()=>true,()=>({...DEF}));
  const R={}; d.reactions.forEach(r=>R[r.key]=r.kips);
  return {d,R};
}
// ---- L-shape ----
const L=[{x:20,y:15},{x:60,y:15},{x:60,y:38},{x:80,y:38},{x:80,y:60},{x:20,y:60}];
const LE=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
let {d:dEW,R:REW}=build(L,LE,6,{axis:"h",sign:1});
ok("L/E-W: 20ft step wall 2-3 takes a point load", REW["2-3"]>0);
ok("L/E-W: step wall is the dominant reaction", REW["2-3"]>REW["0-1"] && REW["2-3"]>REW["4-5"]);
ok("L/E-W: total reaction balances the line load (~16.83k)",
   close((REW["0-1"]||0)+(REW["2-3"]||0)+(REW["4-5"]||0),16.83,0.1));
ok("L/E-W: step~8.41, top~4.30, bottom~4.11",
   close(REW["2-3"],8.41,0.05)&&close(REW["0-1"],4.30,0.05)&&close(REW["4-5"],4.11,0.05));
const w05=dEW.windLoads.find(w=>w.key==="0-5");
ok("L/E-W: left wall sub-loads are equal plf (will merge to one label)",
   w05 && w05.subLoads.length>=2 && close(w05.subLoads[0].plf,w05.subLoads[1].plf,0.5));
let {R:RNS}=build(L,LE,6,{axis:"v",sign:1});
ok("L/N-S unchanged: 23ft wall 1-2 ~11.22k", close(RNS["1-2"],11.22,0.05));
ok("L/N-S unchanged: left 0-5 ~7.48k, right 3-4 ~3.74k", close(RNS["0-5"],7.48,0.05)&&close(RNS["3-4"],3.74,0.05));
// ---- Rectangle + interior wall @x=45 : must be UNCHANGED ----
const Rn=[{x:20,y:15},{x:80,y:15},{x:80,y:60},{x:20,y:60},{x:45,y:15},{x:45,y:60}];
let {R:RR}=build(Rn,[[0,1],[1,2],[2,3],[3,0],[4,5]],4,{axis:"v",sign:1});
ok("Rect+interior: interior wall 4-5 ~11.22k (unchanged)", close(RR["4-5"],11.22,0.05));
ok("Rect+interior: exterior 0-3 ~4.67k, 1-2 ~6.54k (unchanged)", close(RR["0-3"],4.67,0.05)&&close(RR["1-2"],6.54,0.05));
process.exit(fail?1:0);
```
</details>

**Harness gotchas (learned the hard way):**
- Build a fresh `sw_test.cjs`/`rk.cjs` AFTER every source edit before running the .mjs/rev12 suites, or you test stale code.
- The design-tab bundle MUST inject a line with `a/b` points + `windAxis` (Step 2b); a line lacking geometry makes `DesignPlan.lineGeom` throw on `ln.a.x`.
- `conSel`/`conNum` markers (158px/24px) are from the retired rev-8 panel; do NOT assert them — rev-11 uses `pinNumS`/`pinSelS` at 22px.
- When a panel/DOM is rebuilt, migrate panel-specific asserts to the new owning suite rather than letting old ones silently fail.
- **Single React instance:** keep the test files AND the built `*.cjs` bundles under ONE project root and run `node` from there. If a test resolves `require("react")` from a different tree than its bundle, you get a dual-React crash (`Cannot read properties of null (reading 'useState')`). Don't run tests from `/tmp` against bundles in the project (verified: reconstructing this whole §6b harness from the .md and running it under one root passes all 10 suites).

## 7. Known judgment calls / open items

- **Text Scale (rev 30, §4ee):** the **View ▸ Text** dropdown (`textScale`, default `1×`) shrinks ALL on-plan label text, including the draw-mode live length readout — so at `0.25×` the length gets small while drawing. Reversible if the user wants it always full-size (drop `*textScale` on that one inline `<text>`). The `Tag` chip box shrinks with its text by design (so a smaller label actually frees up canvas). `textScale` is persisted in the `.wps` sketcher session (forward-compat default `1`); it is NOT in `loadProject`'s schema, so the schema tripwire doesn't cover it.
- Design constraints global across lines (per-line = future option).
- Split support wall with differing H per segment → line uses **max H** (conservative).
- Dashed tributary divide drawn only where plf actually changes (not at every node); rev 18 makes the on-plan plf *label* match (equal-plf sub-spans merge to one label).
- Re-entrant interior walls (L step, notch walls) act as point-load supports when at/downwind of the windward face (rev 18). A U-shape in cross-wind now loads its notch-bottom wall — flagged to user as reversible if a stricter "must reach the windward face" rule is preferred.
- Canvas navigation is now manual+persistent (rev 19): wheel-zoom, middle-drag pan, ⊡ Fit. Auto-fit only seeds the view and returns via Fit / preset-load / New / file-open. **Rev 20** adds a left-drag **Pan** tool and a **wheel-zoom on/off** toggle, both on the empty-area right-click **Canvas** menu (Draw · Pan · Zoom-with-green-light). "Mobile ergonomics of on-diagram inputs" (touch pinch-zoom / two-finger pan) is still open — wheel / middle-drag / the Pan tool are desktop gestures (the Pan tool is the closest thing to touch-pannable so far, since it's a plain left-drag).
- `DEF_SECTION = {H:13, pw:16, qWind:32, qLee:22, par:5}` — fresh pairs reverse symmetrically by design.
- Parapet "anchoring across reverse" relies on per-wall `par`; works through splits inherently now.
- §10-style wishlist not yet built: PDF/report export of plan + loads + design; footings UI (user mentioned; likely belongs near the calc sheet's footing rows — **ask user**); mobile ergonomics of on-diagram inputs; per-line design constraints; dash highlight only on selected design line (offered, not requested).
- Calc sheet footer text + Excel quirks (E42 denominator, `uplift<625 → "neglect"`) are intentional — preserved verbatim.
- **Two-story stacking conventions (rev 27–28, judgment calls worth remembering):** (a) the stacked footing/uplift/compression use the **1st-floor's own** dead load + base shear with the **summed** moments — the upper story's tributary dead weight is NOT added as stabilizing load at the 1st-floor base (conservative for uplift). (b) stacked **deflection** keeps the 1st-floor's own (combined) shear `v` and only swaps in the **stacked end post** for the chord term, so the stacked Δ is ≤ the single-floor Δ — correct as-built, but counterintuitive; the UI note explains it. Both are reversible if the user wants a different model. (c) the Calculation tab is intentionally single-floor — stacking lives only in the Design tab.
- **Step 7b (DONE, rev 28):** the checked-in fixtures + schema tripwire for the two-story fields were re-established and the two-story `.wps` round-trip is proven (`fixture_v2_2story.wps` + `test_loadstate_2story.cjs` + `test_schema.cjs` + `schema.expected.json`; the load core `loadProject`/`migrateProject`/`mergeWallProps` is module-level/pure, so `work/exp.cjs` is a one-line-export rebuild). Two-story save scope note still holds: **no real `.wps` files exist in the wild yet** — this is pre-emptive insurance. If a breaking schema change lands, freeze an OLD-version fixture + add a load-assertion (migration checklist in §4x).
- **`.wps` save scope:** **Rev 22** added full session-UI restore; **rev 23** made the loader **forward-compatible** for `g`/`d`/`segments`/per-wall props (merge onto named defaults), read the `version` tag (`migrateProject` ladder + newer-version warning), and added `test_loadstate.cjs`; **rev 24** extended the merge to `design.lines` (`DEFAULT_LINE`, scalar fields only) and placed segments (`DEFAULT_PLACED`), added the **stale-line recovery path** (a geometry-less line is dropped + the Design tab shows a "↻ Rebuild from plan" banner that regenerates from the saved plan), and added the **schema tripwire** (`test_schema.cjs`) + **migration-mechanism test** (`test_migrate_ladder.cjs`) + frozen design/stale fixtures (§4x). What's still **not** serialized: the computed numbers (all results stay live-recomputed on load — Design `resultsByLine` via `lineResults(...)`, Calc `results`/`resultsU` via `calcSegment`/`withUtil`; the optimizer keeps only its output segments, discarding `meta{type,N,Ls}` and per-line required type, re-derived). Round-trips identically because the engine is byte-identical and `d` is saved. **Still open:** (a) persist derived results and/or optimizer `meta`/required types so a `.wps` is an engine-independent record of what passed; (b) the migration ladder's only step is the `1→2` no-op stamp — a genuinely breaking change (rename/unit shift) is the case that needs a real `MIGRATIONS` body, a frozen old-version fixture, and a load assertion (the **migration checklist** at the end of §4x). **Renames and unit/semantics changes are NOT covered by merge-on-defaults** — they load with no error and a wrong value, so they require an explicit migration step + fixture; the schema tripwire fires to remind you. Note line GEOMETRY-field renames aren't auto-caught by the tripwire (geometry isn't in a default object) — they rely on that discipline. Note `onNew` resets sketcher+design (incl. `designStale`) but **not** `calc{g,segments}` — decide if that's intended when touching this.

## 8. How to resume

1. User uploads this MD + `plan-sketcher-suite.jsx` (zip).
2. `unzip` to `/home/claude/work`, **read the relevant regions before editing** (file is large; use targeted `view`/grep).
3. **Preview the app in chat right away** — copy `plan-sketcher-suite.jsx` to `/mnt/user-data/outputs/` and present it so it renders as a live artifact. Do this after reading the MD and before waiting for a task (§0 standing rule).
4. `npm install esbuild react@18 react-dom@18` in `/home/claude` if the env is fresh; recreate `test_render_smoke.cjs` from §6 if tests weren't uploaded.
5. Make minimal `str_replace` edits → compile → render smoke → logic tests → copy to `/mnt/user-data/outputs/` → present.
6. **Update this handoff in the same session as any app change** (§0 standing rule) — bump the top rev line, add a `§4*`-style rev subsection, update the rev number in the §0 resume prompt, refresh "Where rev N left off" / "Open items". Code + handoff ship together.
7. Anything that changes documented behavior in §3–§5: confirm with the user first.
8. **Deploy sync (rev 29+):** the repo is the app + the Vite scaffold (§4dd) + this handoff, FLAT at root, on GitHub → Vercel. When you change the app, the user re-uploads the changed jsx via GitHub web UI; the scaffold (`index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`) only needs re-issuing if you touch the host shell, the dep list, or the build config — NOT for ordinary app-code edits. If you DO re-issue the scaffold, keep the flat layout live on the repo (or move to `src/` and fix both relative imports together). Always re-commit this handoff with the code so the repo copy stays current.
