# PLAN SKETCHER SUITE — SESSION HANDOFF

*Updated: 2026-06-26 · **rev 65 / APP_BUILD 144**. Current frontier: DOUBLE-SIDED SHEAR WALLS (sanctioned engine change) + two UI/default tweaks. rev 65 adds **double-sided shear-wall marks 4/5/6** = exactly **2×** the single-sided 1/2/3 capacity (wind, seismic, AND Ga), carrying the "BOTH SIDES OF WALL" callout. The optimizer treats them as a **LAST RESORT** — single-sided 1–3 is searched first; doubles are reached only when NO single-sided design passes (a genuine `mark ≥ 4` requirement, never a cap-limited single-sided one). The Calc-sheet "Selected shearwall type" dropdown gains options **4/5/6 (2-sided)** and both the Wind and Seismic columns pull the doubled allowable; **Structural I is now the default sheathing** in the Design tab (`DEFAULT_G.grade="str1"`, round-trips through save/load); and the **Global Inputs button moved into the Plan-Sketcher command ribbon** (its own "Inputs" group) with a native `title` hover tooltip matching every other ribbon button. Engine output is byte-identical to rev 64 for any demand a single-sided design satisfies — the new marks change output ONLY above single-sided capacity (where the engine previously returned "FAILED!!!"). Proven this session by a 34,560-case `calcSegment` invariant (0 violations; 19,584 former-FAILED→4/5/6 transitions) + a 10,368-case `generateDesign` invariant (**0 divergences** where rev 64 returned a result; 3,232 previously-infeasible lines now rescued by double-sided, all `meta.type ≥ 4`). **This rev changes the engine — deploy BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx`.** Full detail: §4zzn. Before that, rev 64 (§4zzm) — PLAN-SKETCHER DRAFTING UX (0.5-ft precision, T-intersection auto-split, plan-switcher relocation; no engine change).*

*This handoff was condensed on 2026-06-24: the old top rev-log digest was removed (it duplicated §4*), and rev 2–55 were collapsed into the §4-log table. rev 56–60 remain in full prose (§4zze–§4zzi). No standing rule, invariant, data-model, open-item, harness, or resume content was dropped.*

## 0. START HERE — how to resume this project (read me first)

**This project = the app + the engine module + this handoff + the engine guards + the deploy scaffold:** `plan-sketcher-suite.jsx` (the app) · `calcCore.js` (the shear-wall engine module, rev-33 split — §4-log) · this handoff · `test_str1_golden.mjs` + `test_str1_design.mjs` (engine guards) · the rev-29 Vite host shell (`index.html` · `main.jsx` · `package.json` · `vite.config.js` · `.gitignore`, see §4-log) that makes it deployable · and separately `STRUCTURAL_SUITE_UI_THEME.md` (a *different* task — see bottom). **The whole repo (app + engine module + scaffold + this handoff) is what's committed to GitHub → Vercel; `src/` now holds `main.jsx`, `plan-sketcher-suite.jsx`, AND `calcCore.js`.**

**Standing rules for every session (do these automatically, without being asked):**
- **Preview on resume.** As soon as you've read this handoff, preview the current `plan-sketcher-suite.jsx` in chat — copy it to `/mnt/user-data/outputs/` and present it so it renders as a live artifact — *before* writing the state summary and waiting for a task. The user wants to see the live app at the start of every session.
- **Do NOT auto-run the test harness at session start (policy updated 2026-06-25).** The full harness burns tokens, so do NOT set it up and run it automatically when a chat begins. Running tests is the **user's decision** — they'll ask when they want a sweep. Claude MAY *suggest* a run when a change genuinely warrants it (a guarded-engine/formula edit, a broad refactor, or before handing back a finished increment) but waits for the user's go-ahead rather than running unprompted. When you DO run (because asked, or with the user's agreement), set up the harness per §6b and snapshot the engine baseline before the first edit (`cp work/plan-sketcher-suite.jsx work/.engine-baseline.jsx`, keeping `calcCore.js` alongside). For routine per-edit checking the cheap **focused guard** is enough and needs no permission: esbuild compile, the engine byte-identity check (pure-Python), and a focused render/headless smoke for the *specific* thing you touched.
- **Handoff tracks code.** Any time the app is updated, update this MD in the **same session/response** as the code. That means: bump the rev line at the very top, add a new `§4*`-style rev subsection describing the change (additive/invariant tone, like the existing ones), update the rev number inside the §0 resume prompt, and adjust "Where rev N left off" / "Open items". Never hand back updated code with a stale handoff — the two always ship together.
- **Version bump.** On every app update, increment `APP_BUILD` by 1 at the top of the jsx (rev 25 introduced it at 100 = "Version 1.00", shown in the top bar). It rolls 199→"2.00" by construction. This is the user-facing version ONLY — never touch `CURRENT_VERSION` (save-file schema) to bump the display.

**Save-file status (as of rev 29):** the app is now **deployed to Vercel (rev 29)**, but the Save/Open (`.wps`) feature **has not been used in anger yet** — so **no real save files exist in the wild that could break.** The rev 23–24 forward-compat work and the save-file regression guards are therefore *pre-emptive insurance*, not protecting live data. Practical consequence: when adding fields, you still want the merge-on-defaults discipline so a future save round-trips, but you do **not** need to treat "an old `.wps` won't load" as a live-fire risk yet. (This stops being true the moment someone saves a real `.wps` from the live site — once the two-story sign-off below happens, assume real files may start to exist.)

**To keep building:**
1. **Push the latest code to GitHub** (web UI → Vercel auto-deploys) so your live app matches this file's rev. The repo holds the app + the rev-29 Vite scaffold (§4-log) + THIS handoff — commit all three together (the handoff was missing from the first push; rev 29 closes that gap). Every push to `main` auto-redeploys on Vercel.
2. **Open a NEW Claude chat, attach `plan-sketcher-suite.jsx` + `calcCore.js` + this handoff** (zip the `src/` files together), and paste:
   > Continuing development of my Plan Sketcher / Shear Wall Suite. Attached: the current app (`plan-sketcher-suite.jsx`, rev 65), the engine module (`calcCore.js`), and `PLAN_SKETCHER_SUITE_HANDOFF.md`. Read the handoff fully first. **Most recent: rev 65 (§4zzn) — DOUBLE-SIDED SHEAR WALLS (sanctioned engine change) + str1-default-sheathing + Global-Inputs-to-ribbon. ENGINE: `SCHEDULE`/`SCHEDULE_STR1` (in `calcCore.js`) gain three DERIVED rows — `dblSide(t,mark)` clones each single-sided row with `wind*2`, `seismic*2`, `ga*2`, `mark` 4/5/6, `doubleSided:true`, and the "ONE SIDE OF WALL"→"BOTH SIDES OF WALL" callout; `withDbl(rows)` appends them so the single-sided rows stay byte-identical to the verbatim workbook (the doubles can't drift — they're computed). `NAIL_EDGE` gains 4/5/6 = the 1/2/3 nailing + "(2 sides)". `calcSegment`'s `sugS`/`sugW`/`allowS` ladders + the deflection `Ga` index now span all 6 marks (`sV=SCHED.map(t=>t.seismic)`, `wV=SCHED.map(t=>t.wind)`, `Ga=SCHED[clamp(selType-1,0,len-1)].ga`). `generateDesign` is refactored into an inner `sweep(Tlo,Thi,minMark)`: it runs `sweep(1,singleCap,1)` first (`singleCap=clamp(maxType,1,3)` — single-sided ONLY) and only if that returns NOTHING falls to `sweep(4,6,4)` (the `minMark=4` gate guarantees the fallback admits a genuine double-sided design, never a single-sided one excluded merely by the user's Max-SW-type cap). LAST-RESORT proven: for any line a single-sided design satisfies, both `calcSegment` and `generateDesign` are byte-identical to rev 64; the doubles change output only where the engine used to return "FAILED!!!"/null. Ga doubling is a deliberate, REVERSIBLE judgment call (SDPWS 4.3.3.4 — both faces sheathed ≈ 2× unit-shear stiffness; affects deflection only, never strength sizing). CALC SHEET: the "Selected shearwall type" dropdown gains `4/5/6 (2-sided)`; because every app-file `selType` clamp was widened from 3→6 (`calcPushSig`, `withUtil`, `lineResults`, `_govShearCase`, stacked-Ga, the Send-to-calc snapshot), selecting 4/5/6 pulls the doubled allowable in BOTH the Wind and Seismic columns. DEFAULT SHEATHING: `DEFAULT_G` gains `grade:"str1"` so new sessions default to Structural I and a toggled grade round-trips via the `{...DEFAULT_G,...calc.g}` merge (additive; an old `.wps` with no grade reopens as str1 — acceptable, no live files). UI: the **Global Inputs button moved from the side panel into the command ribbon** as its own "Inputs" `rgroup` (`className="rbtn"`, `title=` hover tooltip exactly like Undo/Redo/Clear). The "Type 1/2/3 (plf)" grade readouts got `.slice(0,3)` so they keep showing the three single-sided values despite the 6-row schedule; the full `SwScheduleRef` tables now correctly render all 6 rows incl. "BOTH SIDES". "Max SW type" stays 1/2/3 (it caps single-sided only — double-sided is automatic, not user-selected there). `APP_BUILD=144`. **Deploy: replace BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx` — this rev changes the engine (sanctioned).** Verified this session: modular + preview compile CLEAN (esbuild); engine invariants — `calcSegment` 34,560/34,560 (0 violations, only former-FAILED→4/5/6), `generateDesign` 10,368 (identical-where-base-nonnull, 0 divergences, 3,232 new double-sided rescues all type≥4), capacity doubling exact in all 4 schedules, deflection drops for double-sided (Ga active). NEXT: open — see §7 (touch/pinch ergonomics; PDF/report export; footings UI; per-line constraints; a per-tab seismic for the calc sheet). Before that, rev 64 (§4zzm) — PLAN-SKETCHER DRAFTING UX (no engine change; all UI/geometry/helpers). Three things. (1) PRECISION TO 0.5 FT: `niceStep`'s finest grid/snap step is now `0.5` (was `1`), so when zoomed in the grid/snap/draw resolution reaches half a foot; the length editor (`dim-inp`) is `min="0.5" step="0.5"`; and both the persistent on-canvas wall-length label and the editor's prefill round to the nearest 0.5 ft via a new top-level `fmtHalf(n)=Math.round(n*2)/2` (so a 10.5-ft wall reads/edits as 10.5, not 11). The rubber-band preview already used `fmt1` (0.1) so it was fine. (2) AUTO-SPLIT ON A T-INTERSECTION: on node-drag release, the new `bindNodeToWall(nodeId)` (a component fn, right after `splitWall`) checks whether the dragged node landed on the BODY of another wall — using a new top-level `projToSeg(p,a,b)` (foot of perpendicular: returns `{pt,t,dist}`, UNclamped `t`) — within the draw-tool pick radius `2.4*SRef.current` and with interior `t` (`1e-3 < t < 1-1e-3`, so endpoints/corners are skipped). If so it snaps the node exactly onto the wall (`best.pt`), splits the target edge `(a,b)` into `(a,node)`+`(node,b)`, and propagates the parent's per-edge state to BOTH halves — `noSupport`, `oneStory`, and `wallProps` — exactly like `splitWall`, except the split vertex is the EXISTING dragged node (not a fresh id), so the incoming wall stays attached and the node now joins all three walls (moving it later drags the split wall with it). No extra `snapshot()` — the drag already pushed one history entry, so one undo reverts the whole gesture. Wired in `onUp`: `if(nd.moved) bindNodeToWall(nd.id)` (deps gained `bindNodeToWall`). IMPORTANT: this produces the IDENTICAL graph the old manual workaround produced (split node + two halves carrying the parent's props), so all downstream wind/seismic/design behavior is unchanged by construction. (3) PLAN SWITCHER: the `.floorbar` moved from BELOW the `.stage` to ABOVE it inside `.canvascol` (CSS `margin-top:8px`→`margin-bottom:8px`); the two buttons are relabeled `Level 1`/`Level 2` (were `1st Floor`/`2nd Floor`); the in-canvas `.floorbadge` indicator now reads `Level {activeFloor} Plan` (was `Floor {activeFloor} plan`). `calcCore.js` BYTE-IDENTICAL and every guarded fn untouched (verified vs the rev-63 baseline — only UI/geometry/helper lines changed). `APP_BUILD=143`. Deploy: replace `src/plan-sketcher-suite.jsx` ONLY (calcCore unchanged). Verified this session: modular + preview compile CLEAN (esbuild); render smoke PASS (mounts, Level 1/Level 2 present, old floor labels gone, v1.43); `projToSeg` geometry 4/4; `bindNodeToWall` topology+propagation 3/3 (T-onto-body splits + carries props/noSupport, node joins 3 walls; no-bind when far; no-split at an endpoint). NEXT: open — see §7 (e.g. a touch/pinch-friendly drafting pass; the persistent length label still hides below 4 ft — lower if short jogs need labels). Before that, rev 63 (§4zzl) — 2-STORY SEISMIC STACKING + UPPER-STORY-DL CORRECTION + CUMULATIVE FOOTING SHEAR (sanctioned guarded `stackSeg` change). `computeHandoff` now feeds per-floor seismic: `seisMapFor(F, graph, loop, extent)` builds a seismic reaction map for a floor, with the 2-story split using the rev-60 vertical distribution — `F_roof` (`seis2.Froof`) on the 2-story sub-plan (`twoStoryGraph`/`twoStoryLoop`/new `twoStoryExtent`) for floor 2, `F_floor` (`seis2.Ffloor`) on the full plan for floor 1 — computed UNCONDITIONALLY (view-independent). `buildFloor` picks the floor's map; `forceLbsSeismic` is preserved through the rev-48 geometric pairing (via `...l`). In guarded `stackSeg`: the seismic moment `MotS = r1.MotS+r2.MotS` was already summed — it just comes alive now. The UPPER-STORY DL is added as stabilizing to BOTH uplift (`+r2.CwDL` wind, `+r2.BwDL` seismic) and post-compression (`+r2.wdl` wind, `+r2.AwDL` seismic), plus the footing `P65`/`P70`; the footing base-shear term is now CUMULATIVE (`r1.Fs+r2.Fs`, `r1.Fw+r2.Fw`). Net: smaller holdowns, larger end posts (the physically-correct two-way effect). `stackSeg` guard is now golden-OUTPUT (re-baselined). `calcCore.js` BYTE-IDENTICAL. `APP_BUILD=142`. Deploy: replace `src/plan-sketcher-suite.jsx` ONLY (calcCore unchanged). SEISMIC is now complete through 2-story. Before that, rev 62 (§4zzk) — SEISMIC INTO THE DESIGN TAB (1-story). Each design line carries its own seismic reaction: `computeHandoff` computes the 1-story `V = Cs·W_total` distribution (rev-59 mechanism) UNCONDITIONALLY (independent of the Wind/Seismic view toggle) and joins the per-wall seismic reaction onto each line as `forceLbsSeismic` (`DEFAULT_LINE` gains it, additive). `lineResults` + the optimizer feed `vSeismic: line.forceLbsSeismic` alongside `wWind` (post-R reduced, per rev 61), so the engine's existing `max(sugS,sugW)` type pick + per-element `xMax` envelopes design each line for the heavier of wind/seismic. NEW per-element governing notation: a small W/S badge on the nailing, end-post, holdown, and footing rows (display-layer helpers `_govShearCase`/`_govBy` + `CaseTag`, outside all guarded fns). `S_DS` is now editable on the Design Seismic card; the selected-line title shows both wind + seismic force. Stale-push covers seismic (`forceLbsSeismic` in the handoff signature + the `optimizeSig` line-key). `calcCore.js` BYTE-IDENTICAL (the envelope was already native to `calcSegment` — this rev is wiring + display). 2-Story seismic stays 0 until rev 63. `APP_BUILD=141`. Deploy: replace `src/plan-sketcher-suite.jsx` ONLY (calcCore unchanged). NEXT (rev 63): 2-story seismic stacking (`stackSeg` per-floor `F_roof`/`F_floor`) + upper-story DL added to both uplift-resist and post-compression + cumulative footing base-shear (guarded `stackSeg`/`stackedLineResults`, approval on record). Before that, rev 61 (§4zzj) — SEISMIC ENGINE CONVENTION (sanctioned guarded change + migration). Dropped the `/R` from `calcSegment`'s `E_seis` (`calcCore.js`): `g.vSeismic` is now the post-R (ASCE 7 reduced) seismic base shear in lbs, parallel to `wWind` — the engine applies only the ×0.7 ASD factor; `g.R` is no longer read by the engine (kept reference-only). Calc-sheet seismic input relabeled `(lbs·R)`→`(lbs)`, readout `E = 0.70·V/R`→`E = 0.70·V`. Save schema `CURRENT_VERSION` 2→3 with a `MIGRATIONS[2]` step that converts any old stored `vSeismic` by ÷ the stored `R`. The engine guard for `calcSegment` is now golden-OUTPUT (re-baselined), like rev-58's `buildSecData`. This rev does NOT change Design-tab behavior yet — it's the prerequisite so seismic can feed the Design tab cleanly. `APP_BUILD=140`. **Deploy: replace BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx` — this rev changes the engine (sanctioned).** NEXT (rev 62): wire each Design line's seismic reaction in as `vSeismic` (the engine already envelopes wind vs seismic per element + max-type optimizer), with per-element governing W/S badges. Before that, rev 60 (§4zzi) — SEISMIC 2-STORY MODULE (per-diaphragm weight + vertical force distribution; uniform + mixed-height C/D). New pure `seismicWeight2Story(graph, loop, twoStoryLoop, propsFor, isOne, roofDL, floorDL, wallDL)` splits the tributary WALL weight: roof (L2) trib `par + H₂/2` over the 2-story walls only; floor (L1) trib `H₂/2 + H₁/2` (2-story wall) or `par + H₁/2` (1-story-tagged wall, C/D); area DL by level via `twoStoryLoop.area` (floorDL at L1 + roofDL at L2 under the 2-story footprint, roofDL at L1 over any 1-story-only footprint); `h_floor=H₁`, `h_roof=H₁+H₂`. New `seismicDistribute2Story(sw2, Cs)` → `V=Cs·W_total`, `F_level=V·(W·h)/Σ(W·h)`. The seismic plan distribution now uses the ACTIVE-floor force: roof view distributes `F_roof` on `twoStoryGraph`/`twoStoryLoop` (roof exists only on 2-story walls), floor view distributes `F_floor` on the full graph; `w = F/(diaphragm bbox extent ⟂ force)` via the rev-58 generalized `buildSecData` + guarded `lineReactions` (force conserved). The Load-case Wind|Seismic toggle + the floor selector drive it. The 2-Story Seismic Weight card now shows per-level W/V/F + per-level plan plf; `wTotal` lift covers 2-story too. VIEW-ONLY (reactions don't yet drive design demand). `calcCore.js` + all 8 app-file guarded fns BYTE-IDENTICAL (new helpers are pure, outside the engine; `buildSecData` unchanged since rev 58). Phase-5 test EXACT: W_total 243,990, V 12,199.5, F_roof 5,985/F_floor 6,214, plan plf 153.46/99.75 (roof) + 159.35/103.58 (floor); pipeline conservation 14/14, mixed-height C/D 5/5, SSR mount PASS wind+2story-seismic. `APP_BUILD=139`. Deploy: replace `src/plan-sketcher-suite.jsx` ONLY. NEXT: wire the seismic reactions into the Design-tab demand (wind-vs-seismic envelope per line); refine the mixed-height roof-area fallback for open 2-story regions. Just before that, rev 59 (§4zzh) — SEISMIC MODULE STEP 3 of 3 (1-story COMPLETE): base-shear distribution to the plan boundary + reactions + a Wind/Seismic view toggle; the Cs input moved to the Plan tab. `V = Cs·W_total` is spread as a uniform plf along the boundary faces perpendicular to each direction (`w = V/extent`, extent = bounding-box D/B) by calling the rev-58 generalized `buildSecData` with `{base:()=>w, lee:()=>0}` per axis (`secSeisH`/`secSeisV`); the guarded `lineReactions` then makes the wall reactions. A **Load case** ribbon toggle (Wind | Seismic) switches the canvas between the wind section loads and the seismic boundary loads+reactions (`dispH`/`dispV`); `WindLoad` gained a `prec` prop for 2-dp seismic labels. Cs is now an input on the Plan **Dead Loads** card (Design Seismic card shows Cs+V read-only). VIEW-ONLY (seismic reactions don't yet drive the design demand); 1-story only (2-Story shows "—"). `calcCore.js` + the 7 must-hold guarded fns byte-identical; `buildSecData` unchanged since rev 58, wind re-confirmed identical (`work/_golden.cjs`). Step-3 test = X-dir 113.5 plf / Y-dir 73.79 plf, baseShear = V = 4,427.1 lbs both dirs, reactions present; SSR smoke PASS wind + seismic. The 1-story seismic module (W_total → V → distribution/viz) is COMPLETE; 2-story is next (pending the user's 2-story schematics). Just before that, rev 58 (§4zzg) — SEISMIC STEP 2: base shear V + Option B. The entire Loads box left the Design tab (Floor DL too); all three DL psf inputs are on the Plan Dead Loads card (shared `g`, uplift byte-identical). New `g.Cs`; `W_total` lifted to App (`wTotal`). `buildSecData` generalized to take a `loadModel` (default `WIND_LOAD` = exact wind arithmetic). The 7 other guarded fns + `calcCore.js` byte-identical; `buildSecData` wind output proven identical by `work/_golden.cjs` — RE-BASELINE the engine guard for `buildSecData` (its wind-neutrality is locked by the golden test, not byte-identity). Just before that, rev 57 (§4zzf) — SEISMIC STEP 1: 1-story effective seismic weight W_total (`seismicWeight1Story`: W_roof = area×roofDL, per-wall H_trib = par + H/2, W_wall = Σ H_trib·len·wallDL); Roof+Wall DL moved to a Plan Dead Loads card; Phase-4 test = 88,542 lbs. Just before that, rev 56 (§4zze) — GLOBAL INPUTS: a side-panel button sets wall height, parapet height, and the three wind pressures for the whole building at once (maps onto existing per-wall props; 2-Story routes the two parapet heights to the single `par` by the 1-story tag; no `.wps` schema change). Just before that, rev 55 (§4-log) — refinement of rev 54’s selection highlight: selecting a Design-tab line now turns ONLY its dashed centerline yellow (`SEL_STROKE`); the shear-wall band keeps its pass/fail blue/red so a failing selected wall still shows red. Just before that, rev 54 (§4-log) — (1) selected-wall highlight (now line-only per rev 55); (2) the calc sub-tab bar is now truly pinned (sticky inside one tall maxWidth wrapper holding the bar + the sheet); (3) the first tab on a fresh session is "Wall-1 (default)"; (4) renaming a manual tab is INLINE (double-click → editable input, no pop-up). Just before that, rev 53 (§4-log) — the Calculation Sheet is now a Chrome-style SUB-TAB surface, with wall names consistent across the Design and Calc tabs (per-direction line names "E–W-1/N–S-1 …" that also title the calc sub-tab; Send opens-or-updates a sub-tab matched by line.id; a "+" adds a manual calc; SW-marks now match across tabs; per-tab `{id,name,lineId,marks,segments,wWind}`, shared `g` minus per-tab `wWind`; additive `.wps` `calc.tabs`). Just before that, rev 52 (§4-log) — follow-up to the stale-push indicator: a caution sign (⚠, red text triangle, inline so it can't obstruct the label) is added to every stale button, AND the Design-tab ⚡ Optimize design button now gets the same red + ⚠ when a design input changed since the last Optimize (`optimizeSig` over the lines + g + d, excluding g.wWind/g.line; `optimizePush` lives in App so it survives a tab switch). Just before that, rev 51 (§4-log) — a "push data" button (Plan→Design ⚡ Design shear walls; Design→Calc Send line to calculation sheet) masks its text RED when, after a push, an upstream edit would change what a re-push produces; pushing again clears it. Signature-of-the-push vs a live signature (pure-view edits never trip it; edit-then-revert clears it); reset on New/Open; `calcCore.js` byte-identical, all 12 guarded fns byte-identical. Just before that, rev 50 (§4-log) — the DL Tributary window greys out Level 2 for a wall tagged 1-story. Before that, rev 49 (§4-log) — DL tributary is now a PER-WALL, PER-FLOOR plan input (right-click wall → "DL Tributary"), replacing the old global Design-tab Roof/Floor trib boxes; flows per-line per-floor into the Design tab and the Calc sheet. `calcCore.js` byte-identical; `lineResults` changed only by the trib input-source swap.** Before that, the mixed-height two-story feature (one-story walls inside 2-Story mode) is COMPLETE — Steps 1–4 (§4-log–§4-log) + §4-log (stepped cut) + §4-log (SEQUENCE-BASED overall section cut: the window tracks the ordered run of walls the cut crosses → Section A/B/C/C-reverse, floor-independent) + §4-log (the section cut now DRAWS the Level-2/roof block pressures + shows the Level-2 diaphragm value; the diaphragms are renamed **Level 1 / Level 2** — display-only) + §4-log (every wall in the section cut, including the interior block walls, is now fully editable for height + pressure — `setVals` takes an explicit key, `SecDiagramSeq` commits by key) + §4-log (the section-cut diaphragms are now CONNECTED polylines through each wall's own top with a node at each, so a height edit deforms the shape like the 1-story sloping roof; values update live on height/pressure edits) + §4-log (the leeward-most wall's height is editable for geometry though it carries no load, like the 1-story `HR`; default wall height is now 10ft, parapet 5ft). Guarded engines stayed byte-identical; covered by `test_step2/3/4/5.cjs` + a focused rev-41 render check + the `_rev42_edit.cjs` jsdom interaction test + the `_rev43_connect.cjs` connect/live test + the `_rev44_lee.cjs` leeward/defaults test + the engine guard. The section drawing (`SecDiagramSeq`, §4-log/§4-log/§4-log) proportions are tuned but still open to the user's visual sign-off.** Key points: React 18 + Vite app, default export `App` in `plan-sketcher-suite.jsx`; **as of rev 33 the shear-wall calc engine lives in a separate `src/calcCore.js`** (`calcSegment`/`generateDesign`/`baseDesignSeg`/`schedFor`/`HD_TABLE`/`NAIL_EDGE`/`CODES`/`isNum`/`xMax`/`numOr0`, imported at the top of the app file) — the wind engine + design/stacking logic are still in the app file pending a later split. Deployed to Vercel via a thin host scaffold (§4-log — `index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`) that wraps the app WITHOUT touching it; the calc engine is a faithful port of a Struware-style spreadsheet and must stay byte-identical unless I explicitly approve a formula change; my workflow is GitHub web UI → Vercel (no terminal), so give me complete copy-paste-ready files. §6b has the full test harness, but **do NOT run it by default at the start of the session** (it burns tokens) — running tests is my call; only set it up and run it when I ask, or suggest it when a change genuinely needs it (then snapshot the engine baseline before your first edit, `cp work/src/plan-sketcher-suite.jsx work/.engine-baseline.jsx` AND keep `calcCore.js` alongside). The engine guard now extracts the moved fns from `calcCore.js` and the rest from the app file (§6b). For routine edits just use the focused guard — compile + the engine byte-identity check + a focused smoke for what you touched. Per the §0 standing rules: after reading the handoff, preview the current app in chat (bundle `calcCore.js` + `plan-sketcher-suite.jsx` into one temp jsx and render THAT as a live artifact — a multi-file app no longer renders as a standalone artifact), and update this handoff in the same response as any code change. Confirm you've read the handoff, preview the current app, give me a one-paragraph summary of the current state, then wait for my task.
3. **Describe what you want changed.** For visual tweaks, paste a screenshot of the live UI — that gets the best results.

**Tests:** the two `.mjs` engine guards are kept as ready-to-run files (they protect the calculations). **Checked-in save-file guards (rev 23–24):** `test_loadstate.cjs` (real-file load regression) · `test_schema.cjs` + `schema.expected.json` (a tripwire that fails if a defaulted field is renamed/removed) · `test_migrate_ladder.cjs` (proves the version-migration mechanism) · frozen fixtures `fixture_v1.wps` / `fixture_v2.wps` / `fixture_v2_design.wps` / `fixture_v2_stale.wps`. They all `require` a `work/exp.cjs` bundle built from a temp-export copy of the app (see §4-log/§4-log for the one-liner). The 8 UI/SSR `.cjs` suites aren't shipped as files — their full source is in **§6b** and a new chat regenerates them on demand.

**Where rev 65 left off (DOUBLE-SIDED SHEAR WALLS — marks 4/5/6 = 2× single-sided, optimizer last-resort; + Structural-I default sheathing; + Global-Inputs button into the ribbon):** SANCTIONED guarded change to `calcCore.js` plus app-file wiring. **Engine (`calcCore.js`):** the two schedules are now built as `SCHEDULE = withDbl(SCHEDULE_1S)` / `SCHEDULE_STR1 = withDbl(SCHEDULE_STR1_1S)`, where `SCHEDULE_1S`/`SCHEDULE_STR1_1S` hold the verbatim single-sided rows (byte-identical to the source workbooks) and `withDbl(rows)=[...rows, dblSide(rows[0],4), dblSide(rows[1],5), dblSide(rows[2],6)]`; `dblSide(t,mark)` spreads the single-sided row with `wind:t.wind*2`, `seismic:t.seismic*2`, `ga:t.ga*2`, `mark`, `doubleSided:true`, and `sheathing` "ONE SIDE OF WALL"→"BOTH SIDES OF WALL". The doubles are DERIVED, so the ×2 can never drift from the singles. `NAIL_EDGE` gains `4/5/6` = the `1/2/3` callout + " (2 sides)". `calcSegment` now reads `sV=SCHED.map(t=>t.seismic)` / `wV=SCHED.map(t=>t.wind)` and its `allowS`/`sugS`/`sugW` ternary ladders extend to 6 marks (was 3); the deflection `Ga` became `SCHED[Math.max(0,Math.min(SCHED.length-1, seg.selType-1))].ga` (so marks 4–6 carry the 2× combined Ga). `generateDesign` is refactored into an inner `sweep(Tlo,Thi,minMark)` helper and now runs `let solutions = sweep(1, singleCap, 1); if(!solutions.length) solutions = sweep(4,6,4);` with `singleCap = clamp(maxType,1,3)`. The first sweep (`minMark=1`, `Thi≤3`) is byte-for-byte the prior single-sided optimizer; the fallback's `minMark=4` gate means a line that fails single-sided *only because of the user's Max-SW-type cap* is NOT silently upgraded to double-sided — the fallback admits a solution only when its required mark is genuinely ≥4. **Ga doubling is a deliberate, REVERSIBLE judgment call** (SDPWS 4.3.3.4: sheathing both faces ≈ doubles unit-shear stiffness; it affects deflection only — never any strength sizing — so removing it later would change only the reported `deflS`/`deflW`, not pass/fail). **App-file wiring (`plan-sketcher-suite.jsx`):** every place that clamped `selType` to 3 was widened to 6 — `calcPushSig` (`Math.min(r.selType,6)`), `withUtil`/`_govShearCase` (`Math.min(5, selType-1)`), `lineResults` (`Math.min(autoType,6)`), the stacked-Ga read (`SCHED[clamp(0,len-1,r1.selType-1)]`), and the Send-to-calc snapshot (`Math.min(res[i].selType,6)`). The Calc-sheet "Selected shearwall type" `<select>` gained `4 (2-sided)`/`5 (2-sided)`/`6 (2-sided)`, so both the Wind and Seismic columns pull the doubled allowable. `DEFAULT_G` gained `grade:"str1"` (Structural I is the default sheathing now; round-trips via `{...DEFAULT_G,...calc.g}`; old grade-less `.wps` reopen as str1 — acceptable, no live files). The "Type 1/2/3 (plf)" grade readouts got `.slice(0,3)` so they keep showing three single-sided values against the 6-row schedule; the full `SwScheduleRef` tables now show all six rows (incl. "BOTH SIDES"). "Max SW type" stays 1/2/3 (caps single-sided only — double-sided is automatic, not a user pick there). The Global Inputs button moved from the side panel into the command ribbon as its own "Inputs" `rgroup` (`className="rbtn"`, native `title=` hover tooltip identical to Undo/Redo/Clear); no duplicate remains. `APP_BUILD=144`. **Deploy: replace BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx` — this rev changes the engine (sanctioned).** Verified this session: modular + preview compile CLEAN (esbuild). Engine invariants vs the rev-64 baseline (`work/invariant_test.cjs`, esbuild→CJS): `calcSegment` 34,560 cases, **0 violations** — the only changes for selType 1–3 are 19,584 instances of a former "FAILED!!!" becoming a numeric 4/5/6 in `sugS`/`sugW`/`allowS`; every sizing/status field byte-identical. `generateDesign` 10,368 cases — **0 divergences** where rev 64 returned a result (3,472 identical), 3,232 previously-infeasible lines now rescued by double-sided (ALL `meta.type ≥ 4`), 3,664 infeasible even doubled. Capacity doubling exact in all 4 schedules (rated wind 435/645/840→870/1290/1680, seis 310/460/600→620/920/1200; str1 wind 475/715/930→950/1430/1860, seis 340/510/665→680/1020/1330); double-sided deflection drops vs single (Ga active). **Re-baseline note:** when the §6b harness is next run, re-snapshot the golden baselines for `calcSegment` and `generateDesign` (their guards become golden-OUTPUT, like rev-58's `buildSecData` and rev-61's `calcSegment`); all prior ≤mark-3 goldens still hold by construction. **Next:** open — see §7 (touch/pinch drafting ergonomics; PDF/report export; footings UI; per-line design constraints; a per-tab seismic so a seismic-governed line carries onto the calc sheet).

**Where rev 64 left off (PLAN-SKETCHER DRAFTING UX — precision to 0.5 ft, T-intersection auto-split, plan-switcher relocation/relabel; NO engine change):** three Plan-tab improvements, all in UI/geometry/helper code. **(1) 0.5-ft precision:** `niceStep`'s step ladder gained a leading `0.5`, so the adaptive grid/snap/draw resolution now bottoms out at half a foot when zoomed in (it reaches 0.5 once the view span ≤ ~11 ft; coarser steps unchanged at fit-zoom). The length editor input is `min="0.5" step="0.5"` (the live commit gate is still `v>0`, so 0.5 passes). New top-level `fmtHalf(n)=Math.round(n*2)/2`; the persistent on-canvas wall-length `Tag` and the editor prefill (`setDimEdit … val`) both use it, so a 10.5-ft wall reads and edits as `10.5`. The rubber-band length preview already used `fmt1` (0.1 ft) and was left as-is. **(2) Auto-split on a T:** new top-level `projToSeg(p,a,b)` → `{pt,t,dist}` (foot of perpendicular, UNclamped `t`); new component fn `bindNodeToWall(nodeId)` placed right after `splitWall`. On node-drag release `onUp` calls it when `nd.moved`: it finds the nearest non-incident wall whose body the dropped node is within `2.4*SRef.current` of (interior `t` only — `1e-3<t<1-1e-3`, so endpoints/corners never trigger a split), snaps the node EXACTLY onto that wall (`best.pt`), splits the target edge into `(a,node)`+`(node,b)`, and copies the parent edge's `noSupport`/`oneStory`/`wallProps` onto both halves — the same three-way propagation as `splitWall`, but reusing the dragged node as the split vertex so the incoming wall stays attached and the node now joins all three walls. No second `snapshot()` (the drag already pushed one), so one undo reverts the whole gesture. **Key invariant:** this yields the IDENTICAL graph topology the existing manual workaround produced (split node + two halves carrying the parent's props), so every downstream wind/seismic/design path is unaffected by construction — the loop/area machinery already handles the resulting 3-way node exactly as it does a manually-split wall. **(3) Plan switcher:** the `.floorbar` was moved from below `.stage` to above it inside `.canvascol` (still outside the SVG, so clicks can't hit the canvas; CSS `margin-top`→`margin-bottom`); buttons relabeled `Level 1`/`Level 2`; the in-canvas `.floorbadge` now reads `Level {activeFloor} Plan`. `calcCore.js` BYTE-IDENTICAL; every guarded fn untouched (the full app-file diff vs the rev-63 baseline is only the lines above — no `buildSecData`/`lineReactions`/`stackSeg`/`stackedLineResults`/etc. change). `APP_BUILD=143`. **Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.** Verified this session: modular + preview compile CLEAN (esbuild); SSR render smoke PASS (mounts; `Level 1`/`Level 2` present; `1st Floor`/`2nd Floor` gone; version 1.43); `projToSeg` 4/4 (mid-T, vertical-T, past-end rejection, dist); `bindNodeToWall` topology+propagation 3/3 (T-onto-body splits + carries props & noSupport, node ends with 3 incident walls; no-bind when released far; no-split at an endpoint). The engine baseline did NOT need re-snapshotting (no guarded fn changed). **Next:** open — see §7 (e.g. touch/pinch drafting ergonomics; the persistent length label still hides below 4 ft — lower the threshold if labels on short jogs are wanted; optionally also node-snap a dragged node to an existing node, not just to a wall body).

 two pieces. **(A) Per-floor seismic feed (handoff, not guarded):** `computeHandoff` gained a `seisMapFor(F, fGraph, fLoop, ext)` helper that distributes a floor force `F` on its plan (`buildSecData` uniform model, reactions keyed `axis|key`). 1-story = one map (`Cs·W_total`, full plan). 2-story = per-floor: `seisMap2 = F_roof` (`seis2.Froof`) on the **2-story sub-plan** (`twoStoryGraph`/`twoStoryLoop`, new memo `twoStoryExtent` = its bbox — the roof exists only there); `seisMap1 = F_floor` (`seis2.Ffloor`) on the **full plan**. `buildFloor(floor)` selects the map (`floor===2 ? seisMap2 : seisMap1`); `forceLbsSeismic` survives the rev-48 geometric stack-pairing (carried via `...l`). Deps gained `seis2`, `twoStoryExtent`. **(B) Guarded `stackSeg` change (SANCTIONED — user-approved, golden-OUTPUT re-baseline):** the arm-aware `MotS = r1.MotS + r2.MotS` was already there → comes alive once per-floor seismic is non-zero. The **upper-story dead load** now stacks onto the 1st-floor base through each case's factored bucket — compression `+r2.wdl` (wind) / `+r2.AwDL` (seismic A=1+0.14·Sds); uplift+strap `+r2.CwDL` (wind 0.6·D) / `+r2.BwDL` (seismic (0.6−0.14·Sds)·D); footing `P65`/`P70` likewise — so it RESISTS uplift (smaller holdowns) while ADDING to end-post compression (larger posts), the physically-correct two-way effect. Footing base-shear term is now CUMULATIVE (`r1.Fs+r2.Fs`, `r1.Fw+r2.Fw`) to match the summed moments; `aF` unchanged (it's the `B` factor on footing self-weight, and `r1.B==r2.B`). r2's factored buckets already exist on the 2nd-floor `calcSegment` result. The 2-story stacking banner updated to say seismic is live + upper DL stacks. `calcCore.js` BYTE-IDENTICAL; `APP_BUILD=142`. **Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.** Verified this session: modular + preview compile CLEAN; comment-lexer balanced; render smoke PASS (36,899); **stackSeg before/after 9/9** — extracted rev-62 vs rev-63 `stackSeg`, fed identical engine-built floor results (r2 with live DL + seismic): `MotS=r1.MotS+r2.MotS` holds; both wind+seismic holdown uplifts **decreased** with the upper DL; both end-post compressions **increased**; footing `Lmin` shifted (cumulative shear + DL). KNOWN: full §6b golden numbers for `stackSeg` should be re-snapshotted when the harness is regenerated (the focused test confirmed change DIRECTION + that the rest is intact, not exact goldens); a 2-story regression vs the rev-60 Section-B seismic targets is the natural addition. **Next:** open — see §7 (e.g. carrying per-line seismic into the calc sheet via a per-tab vSeismic; visual sign-off on badges/stacking on real geometry).

**Where rev 62 left off (SEISMIC INTO THE DESIGN TAB — 1-story):** each design line now carries its own **seismic** demand. `computeHandoff` (PlanSketcher) computes the 1-story seismic distribution `V = Cs·sw.Wtotal` spread on the full plan via the rev-59 mechanism (`buildSecData` with `{base:()=>w, lee:()=>0}` per axis on `seisExtent` = full-plan bbox), but **UNCONDITIONALLY** — independent of the Wind/Seismic view toggle and active floor — building a `seisByKey["h|"+key]/["v|"+key]` map, and attaches `forceLbsSeismic` to each line (joined by `axis|key`, the same key as the wind reaction). `DEFAULT_LINE` gains `forceLbsSeismic:0` (additive — old `.wps` merge to 0, no version bump; the schema tripwire will flag the new defaulted name as a reminder, like rev-58's `g.Cs`). `lineResults` (`gL`) + the single-line optimizer feed `vSeismic: line.forceLbsSeismic||0` next to `wWind` — and since `stackedLineResults`/`generateStackedDesign` route through `lineResults`, the stacked path inherits it (0 for now in 2-Story). The engine designs each line for the heavier case automatically — **no engine change**: `calcSegment` already picks `type = max(sugS, sugW)` (`evaluateCandidate`) and envelopes every element via `xMax` (`maxComp`/`maxUplift`/`maxStrap`/`reqFtgLen`). NEW **per-element governing badges** (Q3): display-layer helpers `_govShearCase(r,grade)` (shear: compares `vW/wind` vs `vS/(factor·seismic)` at the selected type) and `_govBy(s,w)` (end post `compS`/`compW`, holdown `upHD_S`/`upHD_W`, footing `LminS`/`LminW`) + a `CaseTag` W/S chip on the nailing, end-post, holdown, footing rows — all OUTSIDE the guarded fns (withUtil pattern). `S_DS` is now an editable input on the Design Seismic card (drives E_v: `B=0.6−0.14·S_DS` uplift, `A=1+0.14·S_DS` comp — already in the engine, just surfaced here); the selected-line title shows wind + seismic force. Stale-push: `forceLbsSeismic` is in the `computeHandoff` signature (deps now include `g`, `sw`, `seisExtent`) and in the `optimizeSig` line-key, so editing Cs / dead loads / geometry re-arms both ⚡ buttons. `calcCore.js` BYTE-IDENTICAL; `APP_BUILD=141`. **Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.** Verified this session: modular + preview compile CLEAN; render smoke 2/2 (36,899); functional envelope 8/8 (wind-only line → govShear W; `vSeismic 5000` → `sugS=2`, enveloped `selType=2` vs wind-only `1`, govShear S; per-element envelope grows with seismic; `_govBy` picks larger / null on none). KNOWN FOLLOW-UPS: (a) "Send line to calculation sheet" still uses the GLOBAL manual `g.vSeismic` (the calc sheet has no per-tab seismic, unlike per-tab `wWind`) — a line that's seismic-governed in the Design tab won't show that on the calc sheet until a future per-tab-seismic rev; (b) 2-Story seismic is rev 63. **Next:** rev 63 (§4zzk lists the plan) — 2-story seismic stacking + upper-DL-to-both + cumulative footing shear. See §4zzk.

**Where rev 61 left off (SEISMIC ENGINE CONVENTION — prerequisite for wiring seismic into the Design tab):** `calcSegment`'s `E_seis = (0.7·vSeismic)/R` became `E_seis = 0.7·vSeismic` (`calcCore.js`) — `g.vSeismic` is now the **post-R (ASCE 7 reduced) seismic base shear in lbs**, exactly parallel to `wWind` (engine applies only the ×0.7 ASD factor). `g.R` is no longer used by the engine (kept in `g`, shown reference-only). Calc-sheet display mirrored: input `(lbs·R)`→`(lbs)`, readout `E = 0.70·V/R`→`E = 0.70·V`. Save schema `CURRENT_VERSION` 2→3; `MIGRATIONS[2]` divides any old stored `vSeismic` by the stored `R` (DEFAULT_G.R=6.5 when absent). **Engine guard for `calcSegment` is now golden-OUTPUT (re-baselined)** — sanctioned change, like rev-58's `buildSecData`. Verified this session: modular + preview compile CLEAN; render smoke 3/3 (36,899 chars); focused engine check 6/6 (E=0.7·V no /R, wind path untouched at 0.6·wWind, S_DS E_v intact via A=1+0.14·sds / B=0.6−0.14·sds); migration ladder 6/6 (v2 6500/6.5→1000, R preserved, v1 no-R uses 6.5, v3 untouched, no-calc safe). `APP_BUILD=140`. **Deploy: replace BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx` (this rev changes the engine) — and the handoff.** No Design-tab behavior change yet. **Next:** rev 62 — feed each line's seismic reaction (from `secSeisH`/`secSeisV`, post-R) directly as `vSeismic` in `lineResults` + the optimizer; the engine's existing `max(sugS,sugW)` + per-element `xMax` envelopes do the governing; add per-element W/S badges + `S_DS` on the Design Seismic card; fold seismic into the stale-push signature; per-line `forceLbsSeismic` → schema touch (§4-mig). See §4zzj.

**Where rev 60 left off (SEISMIC — 2-STORY MODULE: per-diaphragm weight + vertical distribution):** the seismic module now handles 2-story buildings. `seismicWeight2Story(graph, loop, twoStoryLoop, propsFor, isOne, roofDL, floorDL, wallDL)` splits the tributary wall weight — roof (L2) trib `par + H₂/2` over the 2-story walls only, floor (L1) trib `H₂/2 + H₁/2` (2-story) or `par + H₁/2` (1-story-tagged, C/D); area DL by level (floorDL+roofDL under the 2-story footprint via `twoStoryLoop.area`, roofDL over any 1-story-only footprint); `h_floor=H₁`, `h_roof=H₁+H₂`. `seismicDistribute2Story(sw2,Cs)` → `V`, `F_roof`, `F_floor` (`F=V·(W·h)/Σ(W·h)`). The plan distribution uses the ACTIVE-floor force on the right graph (roof → `twoStoryGraph`, floor → full), `w=F/(diaphragm bbox ⟂ force)` via the generalized `buildSecData`+`lineReactions`. The 2-Story Seismic Weight card shows per-level W/V/F + per-level plan plf; `wTotal` lift covers 2-story. VIEW-ONLY. `calcCore.js` + 8 app-file guarded fns BYTE-IDENTICAL. **Phase-5 EXACT** (W_total 243,990 / V 12,199.5 / F_roof 5,985 / F_floor 6,214 / plf 153.46·99.75 roof + 159.35·103.58 floor); `work/_test_seis2.cjs` 17/17, `work/_test_pipeline.cjs` 14/14 (conservation), `work/_test_mixed.cjs` 5/5 (C/D); compile + guard CLEAN; SSR mount PASS wind (36,899) + 2story-seismic (43,951). `APP_BUILD = 139`. **Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.** Preview: 2-Story pill, draw 60×39, set H 13/H₂ 10/par 6 + Roof 20/Floor 50/Wall 18/Cs 0.05 → Seismic Weight card reads W_total 243,990, V 12,199.5, F_roof 5,985/F_floor 6,214; flip **Load case → Seismic** and toggle the floor selector — Level 2 draws the roof plf (153.46/99.75), Level 1 the floor plf (159.35/103.58) with reactions. **Next:** wire the seismic reactions into the Design-tab seismic demand (envelope wind vs seismic per line); refine the mixed-height roof-area fallback for an open (non-closing) 2-story region. See §4zzi.

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
| ~1500–1810 | shear-wall module: **the engine — `SCHEDULE/SCHEDULE_STR1/schedFor/CODES/NAIL_EDGE/HD_TABLE`, `calcSegment`, `baseDesignSeg`, `evaluateCandidate`, `generateDesign`, `isNum/xMax/numOr0/CP` — moved to `src/calcCore.js` in rev 33 (§4-log) and imported at the top of the app file; treat `calcCore.js` as verbatim/don't-touch**. Still in THIS file: dark theme `SW`, `Chip/Row/SectionTitle/NumInput/SwField/selStyle/swBtn` (**used by Design tab only now**), dark `Elevation` (currently unused, kept) |
| ~1810–2130 | **LIGHT calc-sheet module** (namespaced `Lt*`/`LT` — collision-free with dark set): `withUtil(r,seg)` (derives `utilW/utilS/utilPost/utilHD/pass` WITHOUT touching the engine), `LT` palette, `LT_CSS` (`.sw-table` sticky/zebra/hover/`.sw-hl`, focus rings, `@media print .no-print`), `LtChip/LtUtilBar/LtRow/LtSegHeader/LtCollapse/LtNumInput/ltSel/LtComplianceBanner/LtElevation`, `HL` context (`React.createContext` — react import not widened), `CalcSheet` (light, 1:1 body from standalone rev; consumes **util-augmented** results) |
| ~1950–2400 | Design tab: `lineResults` (auto type + override validation: `postAllowable`, `hdCapacity`), `DesignPlan` (plan canvas, drag, ctx menu trigger), `SwCtxMenu`, `DesignTab` |
| ~2780–end | **`App` shell**: tabs (Calculation tab now carries a green/red pass dot from `calcOK`), shear globals `g` + calc `segments`, `resultsU = results.map(withUtil)` + `hlSel` column-highlight state, **`calcSheetPage`** (light page: `LT.paper` bg, white sheet, light title block + Print, `<style>{LT_CSS}</style>`, `HL.Provider` wrapping `CalcSheet results={resultsU}`) and **`designSheet`** (dark wrapper, unchanged styling, DesignTab only) replacing the old shared `sheetTab`; **.wps save/open/new**, `applyToCalc`, sketcher kept mounted (`display:none`) so plan survives tab switches. Suite tab bar has `className="no-print"`. |

## 3. Core data model (critical to not regress)

- **Wall props** `wallProps[edgeKey] = { H, pw, qWind, qLee, par, H2, floorTrib, roofTrib, floorTrib2, roofTrib2 }` — **one parapet `par` per physical wall** (legacy `parW` auto-migrated in `propsFor`). **(rev 56) GLOBAL INPUTS** can set `H`/`par`/`pw`/`qWind`/`qLee` (and `H2` in 2-story) on EVERY wall at once from the side panel — it writes these same fields on each edge's `wallProps`; in 2-story mode the two parapet-height inputs route to the single `par` by the 1-story tag (no new field). See §4zze / §7. **(rev 49) DL TRIBUTARY is per wall, per floor:** `floorTrib`/`roofTrib` = 1st-floor (and 1-story) tributary widths, `floorTrib2`/`roofTrib2` = 2nd-floor — entered on the plan (right-click wall → "DL Tributary"), defaulting to roof 2 ft / floor 0 ft (= the old global default). `runDesignHandoff` puts the floor-appropriate pair on each design line; `lineResults` reads `line.* ?? d.*`; `applyToCalc` sends them to the calc sheet. The leeward parapet term is **read live from the actual back wall** via `findLeewardPartner(windKey, axis, sign, graph, sAt)`; `sAt` = across-wind cut position so split back walls resolve to the segment behind *this* cut. **(rev 14) The leeward *wall height* is handled the same way**: it is the back wall's own `H`, surfaced in the section-cut window as `activeSection.leeH` and edited via `setVals("lee",{H})`. No new stored field — each physical wall keeps one `H`, so reversing the wind/cutting from the other side just swaps roles and the heights stick. The leeward wall height feeds the **elevation diagram only** (sloping roof); it does **not** enter this wall's plf (the windward `H` drives the line load — the back wall's `H` drives *its* line load when it is the windward face).
- **plf formula** per windward region: `0.5·H·pw + par·qWind + leePar(region)·qLee`. A windward wall is **subdivided where the back wall changes** (`buildSecData` → `w.subLoads`, dashed `divides`, true `baseShear`). The dashed `divides` are drawn only where plf actually changes; **rev 18** makes the on-plan plf *label* match — `WindLoad` coalesces consecutive equal-plf sub-spans into ONE label, so two values appear only when the load genuinely differs (e.g. a 374|462 south wall), never as a duplicated 374|374.
- **Reactions**: collinear windward segments group into a *line*; the line is a beam on the point-load (support) walls; per-bay simply-supported statics (`W·(TL−X)/TL`), loads split at interior supports, **overhangs → nearest support**. Splitting a wall with equal props never changes reactions (invariant, tested). A wall qualifies as a support if it runs parallel to the wind, sits within the line's across-wind span, and is **at or downwind of the windward face** (`lineReactions`, rev 18) — it need NOT span all the way back to the windward depth, so a **re-entrant interior wall** (the step wall of an L, a notch wall) acts as an interior support exactly like a full-depth interior wall. Only walls entirely *upwind* of the windward face are rejected (they belong to a deeper windward line in a concave footprint).
- **Elevation window**: opens on the exact windward segment the cut crosses (lowest-`t` hit); a valid cut must cross **≥2 across-wind walls**. Reverse flips sign and re-opens the segment at the same across-wind position. `setVals("self"|"lee", patch)` writes to the wall the value physically belongs to.
- **Design handoff** (`runDesignHandoff`, shared by card + ribbon buttons): per reaction (kips>0) → line `{id:"ax|key", key, windAxis, o, a, b, lengthFt (full collinear extent), heightFt (max H along it), forceLbs (kips×1000)}` + a frozen copy of the footprint. Parapets are **not** sent.
- **Design engine per line**: `lineResults(line, segs, g, d)` runs `calcSegment` with `gLine={...g, wWind:line.forceLbs}`, `totalL = Σ seg lengths on the line`. Overrides per seg `s.ov = {type?, hd?, post?}`; NG flags via `hdCapacity` (uplift ≥ cap) and `postAllowable` (comp > Pa, thin-wall 4x6 = `Pa46·3.5/5.5`). Constraints `d` are **global across lines** (deliberate; per-line constraints = possible future ask).
- **(rev 65) Schedule shape + default grade**: each schedule (`SCHEDULE` rated, `SCHEDULE_STR1` Structural I) now has **6 rows** — single-sided marks 1/2/3 (verbatim workbook values) plus DERIVED double-sided marks 4/5/6 = exactly 2× the corresponding single-sided `wind`/`seismic`/`ga`, flagged `doubleSided:true` with a "BOTH SIDES OF WALL" callout. `selType` therefore ranges 1–6 everywhere it's used (all app-file index clamps widened to 6). `g.grade` now **defaults to `"str1"`** (`DEFAULT_G.grade="str1"`) — new sessions use Structural I; the value rides in `.wps` `calc.g` and round-trips via the `{...DEFAULT_G,...calc.g}` merge (an old grade-less save reopens as str1; additive, no `CURRENT_VERSION` bump). The optimizer's `d.maxType` still caps **single-sided** nailing 1–3 only; double-sided is an automatic last resort inside `generateDesign`, not a stored/selectable ceiling. See §4zzn / §7.

## 4. UI features added this session (all additive)

- **Ribbon toolbar** (in PlanSketcher, above canvas): File (New/Open/Save), Edit (Undo/**Redo**/Clear), Draft (✏ Draw / ⌗ Snap / ∟ Ortho / ⟷ Dims toggles), View (⊡ Fit / + In / − Out), **Markup (on-plan markup-scale dropdown 1× / 0.75× / 0.5× / 0.25× — scales text + arrows + nodes together; rev 32 §4-log, was "Text" rev 30)**, Stories (1-Story/2-Story pill), Analyze (⚡ Design shear walls — disabled until reactions exist). Presets live in the side panel (deduped out of the ribbon, rev 5). Side-panel cards otherwise intentionally duplicated, not removed.
- **Status bar** (below canvas): live cursor X/Y in ft (gated setState), mode badge `SELECT` / `DRAW · chaining`, clickable SNAP/ORTHO flags, right side = walls · total ft · E–W/N–S base shears.
- **Draw mode**: polyline clicking; node snap (radius `2.4·S`, cyan ring, **beats ortho** — CAD osnap) closes loops exactly; ortho locks H/V from anchor; grid snap; yellow dashed rubber band with live length; right-click ends chain, Esc ends chain then exits mode; duplicate edges rejected; each placement undoable. While ON, all clicks place points (drag/cut/dim-edit suspended).
- **LENGTHEN dim editing**: end nearest the click moves (`t` projection, ±10% midband → anchor the **higher-degree** node); `applyWallLength(edge, len, moveEnd)`; ortho propagation follows the moved end.
- **View**: auto-fit; frozen during drags; **auto-expands** (`expandViewTo`, pointer+5% margin) so one gesture reaches any distance; pointer capture keeps drags alive outside the SVG.
- **Shortcuts**: Ctrl+S/O save/open, Ctrl+Z undo, Ctrl+Shift+Z or Ctrl+Y redo, Esc/Delete as before.
- **.wps project file** (version 1): `{app:"plan-sketcher-suite", version:1, savedAt, sketcher:{graph, wallProps, noSupport[], sections, nextId}, design:{lines, shape, segsByLine, d}, calc:{g, segments}}`. Sketcher registers `get/set` via `registerProject`; shell owns Blob download / FileReader open / New (confirm). Open restores everything and clears undo/redo.

## 4-log. Condensed change log (rev 2 → rev 55)

*Shipped-and-stable history, one line per rev. Full prose for rev 56+ is below (§4zze–§4zzi). Operative judgment calls for older revs live in §7. Every rev kept all of `calcCore.js` + the guarded app-file fns byte-identical unless noted.*

| Rev | Change |
|---|---|
| 2 | Calc-sheet restyle — Calculation Sheet to light theme; `withUtil` added (D/C ratios *outside* the engine). Engine + Design tab byte-identical. |
| 3 | Whole-app light "drafting-paper" theme across all three tabs. Styling only; all logic byte-identical. |
| 4 | Design-tab readability — wall marks SW-A/B…, "Shear wall nailing" row, schedule reference on Design tab, label capitalization. |
| 5 | Pinned ribbon (sticky below tab bar); Draft toggles deduped to ribbon only; Presets moved to side panel. |
| 6 | Structural I sheathing option — `SCHEDULE_STR1`, `g.grade`; `calcSegment` gains `schedFor(g.grade)` (formula byte-identical). Rides in `.wps` `calc.g`. |
| 7 | Clear → ribbon; Design constraints panel pinned + grouped (`ConGroup`); dead loads editable on Design tab (shared `g`). |
| 8 | Pinned-constraints cleanup — uniform control sizing (`CON_H=24`), vertical compaction. |
| 9 | Design-system elevation — IBM Plex fonts, `.paper-desk` quad-rule signature, title-block tab bar, micro-interactions. |
| 10 | Screenshot-driven polish — Plywood card capacity readout, Objective dropdown unclip, D/C gauge refinement, legible desk grid. |
| 11 | Design-constraints panel rebuilt — `PinCard`/`PinRow` inline grid; ~40% shorter; aligned controls (ConGroup/SwField now unused-but-defined). |
| 12 | Reaction "rocket" label rotates -90° on vertical walls (presentational only; math untouched). |
| 13 | Shear-wall plan symbol redrawn as a drafting detail-bubble. |
| 14 | Leeward wall height + sloping roof line in the section cut. |
| 15 | Wall height H row added to the Design tab. |
| 16 | Design height label H→h; section-cut parapet redrawn as line-with-node. |
| 17 | Tab order set to Plan · Design · Calculation (S-1/S-2/S-3). |
| 18 | Re-entrant interior walls take point loads; equal-plf sub-span labels merge (on-plan label matches dashed divides). |
| 19 | CAD navigation — mouse-wheel zoom; Draw mode stops auto-zooming the canvas. |
| 20 | Pan tool + wheel-zoom on/off toggle on the empty-area right-click Canvas menu. |
| 21 | Canvas right-click menu reachable mid-draw. |
| 22 | Full session restore — a reopened `.wps` looks like where you left off (session-UI saved). |
| 23 | Save-file forward-compat hardening — merge-onto-defaults, `version` tag, `migrateProject` ladder, `test_loadstate.cjs`. |
| 24 | Design-data forward-compat + stale-line recovery + schema guards (`test_schema.cjs`/`schema.expected.json`). Migration checklist → §4-mig. |
| 25 | User-facing "Version X.XX" in top bar; introduced `APP_BUILD` (=100). Never touch `CURRENT_VERSION` to bump display. |
| 26 | TWO-STORY wood shear wall design, Steps 1–5 — `H2` per wall, two line loads, `SecDiagram2`, floor-aware on-plan loads, per-floor design storage. |
| 27 | Two-story Step 6 — arm-aware vertical load stacking (1st-floor overturning = summed moments with correct arm). |
| 28 | Two-story Step 7a/7c — secondary detailing (anchor/embedment/etc.) wired to the stacked demand + regression lock. |
| 28b | Two-story Step 7b — persistence regression lock: `fixture_v2_2story.wps`, `test_loadstate_2story.cjs`, schema tripwire. |
| 29 | Deployed to Vercel — Vite host scaffold (`index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`); app jsx byte-identical, no app-code change. |
| 30 | Text Scale control on the Plan toolbar (`textScale`). |
| 31 | Plan glyphs halved (nodes/arrows) — SUPERSEDED by rev 32. |
| 32 | Unified "Markup" scale dropdown (`markScale`) — text + arrows + nodes scale together; rev-31 halving reverted to original base sizes. |
| 33 | Shear-wall engine extracted to `src/calcCore.js` (first file split; exports `calcSegment`/`generateDesign`/`SCHEDULE`/… ; byte-identical). |
| 34 | Floor diaphragm stops double-counting the roof load (2-story display fix; 1st-floor line load = ½·H·pw + ½·H₂·pw). |
| 35 | Mixed-height 2-story Step 1/4 — one-story wall tagging (right-click → "Switch to 1-story", turns green; persists in `.wps`, survives splits). |
| 36 | Mixed-height Step 2/4 — 2nd-floor (roof) diaphragm excludes 1-story walls (no load/shadow/reaction up there). |
| 37 | Mixed-height Step 3/4 — 1st-floor (floor) diaphragm accumulation ("the 454"): windward wall picks up ½·H₂·pw from the nearest 2-story wall behind it. |
| 38 | Mixed-height Step 4/4 (FINAL) — section cuts; a 1-story wall cuts as a single-story elevation (`WindWindow` routes `SecDiagram` vs `SecDiagram2`). |
| 39 | Mixed-height — stepped section cut (short windward + taller 2-story block behind + leeward). |
| 40 | Mixed-height — sequence-based overall section cut: `sectionSequence` (A 1·2·2·1 / B 1·1 / C 1·2·2 / C-rev), drawn by `SecDiagramSeq`; floor-independent. |
| 41 | Mixed-height — section cut draws Level-2 (roof) pressures + value; "floor/roof diaphragm" renamed Level 1 / Level 2. |
| 42 | Mixed-height — interior block walls in the section cut fully editable (height + pressure) via key-aware `commit`/`setVals`. |
| 43 | Mixed-height — section-cut diaphragms are polylines through each wall's own top (`floorY(i)`/`roofY(i)`), deform on height edit. |
| 44 | Mixed-height — leeward-most wall HEIGHT editable (geometry-only); `DEF_SECTION.H` default 13→10. |
| 45 | Duplicate-key esbuild warning removed (the floating edit `<input>` in `SecDiagram`, not `Elevation`). Display-only. |
| 46 | Design tab — ⚡ Optimize now designs both floors + handles merges (fixed mixed wall vanishing on Level switch). |
| 47 | Stacked walls aligned to the 2-story segment + 1st-floor-controlled optimization (`generateStackedDesign`). |
| 48 | Stacked floors paired geometrically — the two floors of a stacked wall are treated as one wall even when ids differ. |
| 49 | DL tributary is a per-wall, per-floor PLAN input (right-click → "DL Tributary…"); the two global Design-tab trib boxes removed. |
| 50 | DL Tributary window is 1-/2-story aware — a 1-story wall greys/disables the Level-2 control, pins to Level 1. |
| 51 | Stale-push indicator — a push-data button turns its text RED when an upstream edit would change the downstream tab on re-push; pushing clears it. |
| 52 | Caution triangle (⚠, U+FE0E red glyph) added to every stale push button + the Design-tab ⚡ Optimize stale indicator. |
| 53 | Calculation Sheet → Chrome-style tabbed surface; design lines named per-direction ("E–W-1", "N–S-1", …); `.wps` gains `calc.tabs`. |
| 54 | Selected-wall highlight — clicking a Design line paints its walls yellow on the plan. SUPERSEDED/refined by rev 55. |
| 55 | Selected-wall highlight refined — ONLY the dashed centerline turns yellow; the shear-wall band keeps pass/fail blue/red (a failing selected wall still reads red). |

## 4-mig. Save-file migration checklist (rev 24) — RUN when you change the MEANING, UNIT, NAME, or PRESENCE of a saved field

merge-on-defaults (rev 23–24) silently handles **added** fields. It does **NOT** handle renames, removals, or unit/semantics changes — those load with *no error* and a *wrong value*. So, before shipping any such change:

1. **Bump `CURRENT_VERSION`** (e.g. 2 → 3).
2. **Add the `MIGRATIONS[oldV]` step** that transforms an old project into the new shape (rename the key, convert the unit, drop the obsolete field). Template is in the `MIGRATIONS` comment.
3. **Freeze a fixture at the OLD version** — hand-author or copy an existing pre-change `.wps`; never regenerate it from new defaults.
4. **Add a load assertion** in `test_loadstate.cjs` that the OLD fixture loads to the NEW correct value (this is the *only* thing that catches a botched unit conversion — the engine guard can't, it guards code not data interpretation).
5. **Update `schema.expected.json`** so `test_schema.cjs` goes green again (this is also the prompt that reminded you to do steps 1–4).

## 4zzn. Rev 65 — Double-sided shear walls (marks 4/5/6 = 2× single-sided, optimizer last-resort) · Structural-I default sheathing · Global-Inputs button into the ribbon (SANCTIONED engine change)

**User request (verbatim intent), in four parts:** (1) move the Global Input button into the Plan-Sketcher top toolbar with a hover tooltip matching the other ribbon buttons; (2) add double-sided variants of every single-sided shear-wall option, each providing **exactly 2×** the single-sided shear capacity, indexed **4/5/6**, with the optimizer treating double-sided as a **last resort** (only when all single-sided options are exhausted and fail); (3) expand the Calculation-Sheet type dropdown to include the three double-sided options, fully integrated into BOTH the Seismic and Wind modules so the doubled value is pulled; (4) make Structural I the default sheathing in the Design tab. This is a **sanctioned guarded change** to `calcCore.js` — the engine byte-identity guard for the affected fns (`calcSegment`, `generateDesign`) becomes golden-OUTPUT, re-baselined on the next full harness run.

**Why doubling stays clean / why marks 4–6 sort after 1–3 automatically.** In all four schedules (rated/str1 × wind/seismic), `2×(mark 1) ≥ (mark 3)` — e.g. str1 wind `2×475 = 950 ≥ 930`, str1 seis `2×340 = 680 ≥ 665`. So appending the three doubled rows keeps the capacity ladder **monotonic**, and a demand that exceeds mark-3 capacity naturally lands on mark 4/5/6 in the `sugS`/`sugW` ternary ladder. BUT for the length-minimizing optimizer the monotonic ladder alone is NOT enough to guarantee "last resort" — a shorter double-sided wall could out-score a longer single-sided one on total length — so `generateDesign` enforces last-resort *explicitly* (below), independent of the ladder ordering.

**Engine — `calcCore.js` (all additive; single-sided rows byte-identical to the verbatim workbooks):**
- **Schedules refactored, doubles DERIVED.** The verbatim single-sided rows were extracted into `SCHEDULE_1S` and `SCHEDULE_STR1_1S` (same content, byte-for-byte). Then `const dblSide = (t, mark) => ({ ...t, mark, sheathing: t.sheathing.replace("ONE SIDE OF WALL","BOTH SIDES OF WALL"), wind: t.wind*2, seismic: t.seismic*2, ga: t.ga*2, doubleSided: true });` and `const withDbl = (rows) => [ ...rows, dblSide(rows[0],4), dblSide(rows[1],5), dblSide(rows[2],6) ];`, with `SCHEDULE = withDbl(SCHEDULE_1S)` / `SCHEDULE_STR1 = withDbl(SCHEDULE_STR1_1S)`. Because the doubles are *computed* from the singles, the ×2 relationship can never drift under future edits and the single-sided values remain the untouched source-of-truth.
- **`NAIL_EDGE`** gains keys `4/5/6` = the `1/2/3` nailing callouts + " (2 sides)" (same nailing applied to both faces).
- **`calcSegment` ladders → 6 marks.** `const sV = SCHED.map(t => t.seismic);` and `const wV = SCHED.map(t => t.wind);` replace the old 3-element literals; `allowS`/`sugS`/`sugW` extend their ternary chains to `…: vS<=factor*sV[3] ? … : vS<=factor*sV[4] ? … : vS<=factor*sV[5] ? … : "FAILED!!!"` (and 4/5/6 for `sug*`). The deflection stiffness became `const Ga = SCHED[Math.max(0, Math.min(SCHED.length-1, seg.selType-1))].ga;` — byte-identical for selType 1/2/3, and marks 4–6 carry the **2× combined Ga** (the reversible judgment call; deflection-only).
- **`generateDesign` — last-resort via an inner `sweep`.** Refactored to `const sweep = (Tlo, Thi, minMark) => { … inner gate: if (ev && ev.type <= T && ev.type >= minMark) … };` then `const singleCap = Math.max(1, Math.min(3, Math.floor(d.maxType))); let solutions = sweep(1, singleCap, 1); if (!solutions.length) solutions = sweep(4, 6, 4);`. The first sweep (`minMark=1`, `Thi=singleCap≤3`) reproduces the prior optimizer **exactly** (its gate `ev.type<=T && ev.type>=1` ≡ the old `ev.type<=T`, and `evaluateCandidate` only yields type≤3 there because the gate rejects any 4/5/6). The fallback's **`minMark=4`** is the key correctness gate: it admits a solution only if its *required* mark is ≥4 — so a line that fails single-sided merely because the user capped Max-SW-type at, say, 2 is NOT silently promoted to double-sided; the fallback fires only for genuine double-sided demand. "Max SW type" therefore continues to cap single-sided nailing (1–3) only; double-sided is an automatic last resort, never a user-selected ceiling there.

**App-file — `plan-sketcher-suite.jsx`:**
- Every `selType`→schedule-index clamp widened 3→6: `calcPushSig` (`Math.min(r.selType, 6)`), `withUtil`'s `selT` and `_govShearCase`'s `t` (`schedFor(grade)[Math.max(0, Math.min(5, selType-1))]`), `lineResults` (`Math.min(autoType, 6)`), the in-app stacked-Ga read (`SCHED[Math.max(0, Math.min(SCHED.length-1, r1.selType-1))].ga`), and the **Send-to-calc snapshot** (`Math.min(res[i].selType, 6)`) — this last one is what makes a double-sided design carry the right mark onto the calc sheet.
- **Calc-sheet dropdown (request 3):** the "Selected shearwall type" `<select>` adds `<option value={4}>4 (2-sided)</option>` + 5 + 6. Because the calc sheet calls the same `calcSegment` (which now reads the 6-row schedule for both `vS` and `vW`), choosing 4/5/6 pulls the doubled allowable in **both** the Seismic and the Wind rows.
- **Default sheathing (request 4):** `DEFAULT_G` gains `grade:"str1"`. New sessions default to Structural I; a toggled grade round-trips through save/load via the existing `{...DEFAULT_G, ...calc.g}` merge. Side effect (acceptable — no live `.wps` exist): an old grade-less save reopens as str1. No `CURRENT_VERSION` bump (additive merge-on-defaults); the schema tripwire may flag the new defaulted field, which is the expected reminder.
- **Grade readouts** "Type 1/2/3 wind/seismic (plf)" got `.slice(0,3)` (two spots: the calc-sheet info table and the Design grade card) so they still print three single-sided values against the now-6-row schedule. The full `SwScheduleRef` schedule TABLES (two spots) intentionally render all six rows now, including the "BOTH SIDES" double-sided entries — a desirable reference, left as-is.
- **UI (request 1):** the Global Inputs button lives in the `.ribbon` command bar (the mini-ribbon pinned below the suite tab bar) inside its own `rgroup` labeled "Inputs", as `<button className="rbtn" … title={…} onClick={openGlobalInputs}>⚙ Global inputs…</button>`. It uses the SAME native `title` hover-tooltip mechanism as every other ribbon button (New, Undo, Redo, Clear, etc.), and its `disabled`/tooltip text reflects whether any wall is drawn yet. The old side-panel button was removed (no duplicate — a single occurrence remains).

**Invariant (the whole point):** for any demand a single-sided design satisfies, BOTH `calcSegment` and `generateDesign` are **output-identical to rev 64**. The double-sided marks change output only above single-sided capacity — exactly where the engine previously returned `"FAILED!!!"` (calcSegment) or `null` (generateDesign). Single-sided schedule rows 1–3 are byte-identical to the source workbooks.

**Verification this session (focused guard — no full harness, per the §0 policy):** modular pair + combined preview both compile CLEAN (esbuild, browser/esm, React external). Engine invariants via `work/invariant_test.cjs` (esbuild-bundles baseline + new engine to CJS, then diffs outputs over a dense grid): **I1 `calcSegment`** — 34,560 cases across grade×code×species×vSeismic×wWind×sds×L×h for selType∈{1,2,3}, **0 violations**; the only field changes are 19,584 instances of a former `"FAILED!!!"` becoming a numeric mark 4/5/6 in `sugS`/`sugW`/`allowS`; every other field (status, post, holdown, footing, comp, uplift, deflection inputs) byte-identical. **I2 `generateDesign`** — 10,368 cases; `base-nonnull-diverge = 0` (3,472 byte-identical where rev 64 returned a result), `new-double = 3,232` (previously-infeasible lines now solved by double-sided, **all `meta.type ≥ 4`** — nothing single-sided smuggled in by the fallback), `both-null = 3,664` (infeasible even doubled). **I3 doubling** — exact in all four schedules; single-sided rows byte-identical to baseline; "BOTH SIDES" + `doubleSided` flag + `mark` 4/5/6 present. Functional smoke: `schedFor` returns 6 rows with the right doubles (rated 870/1290/1680 wind, 620/920/1200 seis; str1 950/1430/1860 wind, 680/1020/1330 seis — str1 950 matches the user's worked example `2×475`); optimizer escalates to type-6 only under high demand; double-sided deflection drops vs single-sided (`Ga` doubling confirmed active, str1 mark1 ga 19.2 → mark4 ga 38.4). **Re-baseline reminder:** on the next §6b run, re-snapshot golden baselines for `calcSegment` + `generateDesign` (now golden-OUTPUT guards); all prior ≤mark-3 goldens still pass by construction.

## 4zzm. Rev 64 — Plan-sketcher drafting UX: 0.5-ft precision · T-intersection auto-split · plan-switcher relocation/relabel (NO engine change)


Three Plan-tab improvements, all additive and confined to UI / geometry / display helpers. **No calc-engine touch:** `calcCore.js` is byte-identical and every guarded app-file fn is unchanged; the entire app-file diff vs the rev-63 baseline is the lines listed here.

**(1) Drafting precision to 0.5 ft.** `niceStep`'s step ladder `[1,2,5,…]` became `[0.5,1,2,5,…]`, so the adaptive grid/snap/draw step can now reach **0.5 ft** (it does so once the view span ≤ ~11 ft — `niceStep` returns the first step ≥ `span/22`; coarser zoom levels are unchanged). The length editor input `dim-inp` is now `min="0.5" step="0.5"` (the actual commit gate stays `v>0`, so any 0.5 multiple passes). New top-level helper `fmtHalf(n) = Math.round(n*2)/2`; the persistent on-canvas wall-length `Tag` (`${fmtHalf(L)}'`) and the editor's prefill (`setDimEdit({… val:String(fmtHalf(dist(a,b)))})`) both round to the nearest 0.5 ft, so a 10.5-ft wall reads/edits as `10.5` rather than rounding to 11. The draw-mode rubber-band length already used `fmt1` (0.1 ft) and was left as-is. **Note (unchanged):** the persistent label still suppresses below 4 ft (`if(L<4) return null`) — a visibility threshold, not a length cap; short jogs draw fine and show their length live on the rubber band.

**(2) Auto-split a wall on a T-intersection.** New top-level `projToSeg(p,a,b)` returns `{pt,t,dist}` — the foot of the perpendicular from `p` onto segment `a→b`, with `t` UNclamped so the caller can require an interior hit. New component fn `bindNodeToWall(nodeId)` sits immediately after `splitWall` and is invoked from `onUp` when a node drag actually moved (`if(nd.moved) bindNodeToWall(nd.id)`). It scans every wall the node is NOT already joined to, takes the nearest whose body the dropped node lies within `2.4*SRef.current` of (the same pick radius the draw tool uses for node snapping) with interior `t` (`1e-3 < t < 1-1e-3`, so a drop at/near an endpoint or corner never splits), then:
   1. snaps the dragged node EXACTLY onto that wall at the perpendicular foot (`best.pt`) — the precise intersection point;
   2. splits the target edge `(a,b)` into `(a,node)` + `(node,b)`, dropping the original;
   3. carries the parent edge's per-edge state — `noSupport`, `oneStory`, and `wallProps` — onto BOTH halves (delete the parent key, set the two child keys), exactly as `splitWall` does.

Because the split vertex is the EXISTING dragged node rather than a fresh id, the incoming wall stays attached and the node ends with three incident walls — so moving it later drags the split wall along with it (the requested binding). No second `snapshot()` is taken (the drag already pushed one history entry), so a single undo reverts the whole drag-and-bind as one gesture. **Invariant worth stating:** the resulting graph is identical to what the pre-rev-64 manual workaround produced (drop a node on the wall via the wall menu's split, then snap the incoming node to it) — a split node plus two halves carrying the parent's props. So all downstream wind/seismic/design/area behavior is unchanged by construction; the existing interior-wall / loop machinery already handles the 3-way node. **Judgment calls:** tolerance is zoom-adaptive (tighter when zoomed in, looser when zoomed out — matches the draw-snap idiom); on multiple candidates the nearest wins; the foot must be strictly interior (no zero-length stubs at corners). It does NOT node-snap a dragged node to an existing node (only to a wall body) — that's a possible future addition (§7).

**(3) Plan switcher — relocation + Level terminology.** The `.floorbar` block moved from directly below `.stage` to directly above it, still inside `.canvascol` and still outside the SVG (so its clicks can't reach the canvas); its CSS spacing flipped `margin-top:8px`→`margin-bottom:8px` to sit above the drawing. The two segmented buttons are relabeled **`Level 1` / `Level 2`** (were `1st Floor` / `2nd Floor`), and the in-canvas top-left active-plan indicator `.floorbadge` now reads **`Level {activeFloor} Plan`** (was `Floor {activeFloor} plan`; the uppercase styling renders it `LEVEL N PLAN`). Behavior of `activeFloor`/`setActiveFloor` and the disabled-until-2-Story gating is unchanged — this is positioning + wording only.

**Verification (this session):** modular + single-file preview both compile CLEAN under esbuild; SSR render smoke mounts the app (Level 1/Level 2 buttons present, old floor labels gone, build shows 1.43); `projToSeg` unit 4/4; `bindNodeToWall` topology+propagation 3/3 (T-onto-body splits and carries `wallProps`+`noSupport`, dragged node ends with 3 incident walls; no bind when released beyond tolerance; no split when the foot is at an endpoint). Engine byte-identity holds without a re-baseline (no guarded fn changed). **`.wps` schema:** untouched — no new saved fields (the auto-split only edits geometry/props that already serialize).

## 4zzl. Rev 63 — 2-story seismic stacking + upper-story dead load (both uplift & compression) + cumulative footing base shear

Completes seismic through 2-story. Two parts: a per-floor seismic feed in the handoff (not guarded), and the resolved Q5 corrections inside the guarded `stackSeg` (sanctioned, golden-OUTPUT re-baseline).

**(A) Per-floor seismic feed — `computeHandoff` (not guarded).** rev 62's single 1-story seismic map generalized to a `seisMapFor(F, fGraph, fLoop, ext)` helper (distributes a floor force `F` on its plan via `buildSecData` with `{base:()=>w, lee:()=>0}` per axis, `w = F/extent`, reactions keyed `axis|key`). Maps, computed UNCONDITIONALLY (view-toggle/floor-independent): **1-story** → `seisMap1 = seisMapFor(Cs·sw.Wtotal, graph, loop, seisExtent)` (unchanged from rev 62). **2-story** → `seisMap1 = seisMapFor(seis2.Ffloor, graph, loop, seisExtent)` (floor diaphragm, full plan) and `seisMap2 = seisMapFor(seis2.Froof, twoStoryGraph, twoStoryLoop, twoStoryExtent)` (roof diaphragm — exists only on the 2-story sub-plan). New memo `twoStoryExtent = bbox(twoStoryGraph.nodes)`. `buildFloor(floor)` selects `floor===2 ? seisMap2 : seisMap1` and sets `forceLbsSeismic` per line — preserved through the rev-48 geometric stack-pairing because the pairing spreads `...l` (it overwrites only id/key/a/b/lengthFt). `computeHandoff` deps gained `seis2`, `twoStoryExtent`. `seis2 = seismicDistribute2Story(sw2, Cs)` (rev 60) already supplies `Froof`/`Ffloor` (post-R, since `Cs` includes R). Seismic uses the plain (uniform) distribution on each floor's plan — NOT the mixed-height `buildSecDataF1` wind accumulation — matching the rev-60 Plan-tab seismic view (inertial/mass distribution).

**(B) `stackSeg` corrections (GUARDED — sanctioned, golden-OUTPUT re-baseline).** With per-floor seismic now non-zero, the arm-aware `MotS = r1.MotS + r2.MotS` (already present since rev 27) comes alive. Resolving Q5 (user-confirmed):
- **Upper-story DL added as stabilizing to BOTH paths, via each case's factored bucket** (the buckets already exist on the 2nd-floor result `r2`): compression `(r1.wdl+r2.wdl)` (wind) / `(r1.AwDL+r2.AwDL)` (seismic, A=1+0.14·Sds); uplift+strap stabilizing DL `(r1.CwDL+r2.CwDL)` (wind, 0.6·D) / `(r1.BwDL+r2.BwDL)` (seismic, (0.6−0.14·Sds)·D — E_v-consistent); footing `P65`/`P70` use the same summed factored DL.
- **Footing base-shear cumulative** (your call): the `Lmin` shear term is now `(r1.Fs+r2.Fs)`/`(r1.Fw+r2.Fw)` to match the summed moments. `aF` is unchanged — it's the `Math.min(0.6,r1.B)` factor on the footing's OWN concrete self-weight, and `r1.B==r2.B` (shared `Sds`).
- **Two-way effect (correct):** more resisting DL → net uplift DOWN (smaller holdowns), but the same DL loads the post → compression UP (larger end posts). Both wind and seismic.
- The 2-story stacking explainer banner (Design tab) updated: seismic is live per-floor and the upper DL stacks.

**Scope / boundaries.** `calcCore.js` byte-identical (no engine change — `calcSegment` already returns every needed `r2` bucket). The other 7 guarded app-file fns untouched; only `stackSeg` changed (its guard becomes golden-OUTPUT, the 1st guarded-app-fn deviation logged the same way the engine ones were in rev 58/61). 1-story design path unchanged from rev 62 (`seisMap1` for `!twoStory` is identical).

**Verification.** `calcCore.js` byte-identical vs the rev-62 deliverable. Modular + single-file preview compile CLEAN; comment-lexer balanced; render smoke PASS (`renderToString(App)` = 36,899). **Focused `stackSeg` before/after test 9/9** (the appropriate guarded-change check): extract rev-62 (before) and rev-63 (after) `stackSeg` + `upliftStk` source, bind them to the real `calcCore` exports, and feed identical engine-built floor results (`r1`/`r2` from `calcSegment` with non-zero DL + per-floor wind+seismic, short 4 ft wall so uplift is real). Asserted: `r2` carries DL + live seismic; `MotS = r1.MotS+r2.MotS`; both wind and seismic **holdown uplifts decreased** with the upper DL; both **end-post compressions increased**; footing `LminW` shifted (cumulative shear + DL). (Full §6b golden numbers not re-snapshotted — harness files weren't in the upload; when regenerated, re-baseline the `stackSeg` golden and add a 2-story regression against the rev-60 Section-B seismic targets. Direction + structural integrity are confirmed; exact-number goldens are the deferred piece.)

**Deliverables = THREE** (calcCore unchanged): `src/plan-sketcher-suite.jsx`, the single-file preview bundle, this handoff. Deploy: replace `src/plan-sketcher-suite.jsx` ONLY.

## 4zzk. Rev 62 — Seismic into the Design tab: per-line seismic demand + wind/seismic per-element envelope (1-story)

Wires the seismic reaction into the Design tab so a line controlled by seismic gets designed for seismic while wind-controlled lines stay on wind — per element. The key finding from the rev-61 investigation made this small: **the envelope is already native to the engine.** `calcSegment` computes both cases and `evaluateCandidate` picks `type = max(sugS, sugW)`; `maxComp`/`maxUplift`/`maxStrap`/`reqFtgLen` are already `xMax(seismic, wind)`. So the only gap was that `lineResults` fed `wWind` but left `vSeismic` at the global default. This rev feeds it per line. **No guarded change** — `calcCore.js` byte-identical; all wiring + display sit outside the 8 guarded fns.

**(1) Per-line seismic reaction (handoff).** In `computeHandoff` (PlanSketcher), a new `seisByKey` map computes the **1-story** seismic distribution `V = Cs·sw.Wtotal` exactly as the rev-59 Plan-tab Seismic view — `buildSecData({axis,sign:-1}, graph, loop, isSup, propsFor, {base:()=>w, lee:()=>0})` with `wX = V/seisExtent.dy`, `wY = V/seisExtent.dx` (`seisExtent` = full-plan bbox) — but **UNCONDITIONALLY** (not gated on the `loadCase` view toggle or `activeFloor`, unlike the top-level `secSeisH`/`secSeisV`), so each line carries its seismic demand even while the canvas shows wind. The per-wall reactions (keyed `keyOf(edge)`) populate `seisByKey["h|"+key]`/`["v|"+key]`, and each handoff line gets `forceLbsSeismic: seisByKey[ax+"|"+r.key] || 0` — joined by the SAME `axis|key` as its wind reaction (same `isSup` support set ⇒ keys match). `computeHandoff` deps gained `g`, `sw`, `seisExtent`. 2-Story: `forceLbsSeismic` stays 0 (per-floor `F_roof`/`F_floor` is rev 63).

**(2) Schema (additive).** `DEFAULT_LINE` gains `forceLbsSeismic:0`. Old `.wps` lines merge to 0 via the loader's `{...DEFAULT_LINE, ...l}` — **no `CURRENT_VERSION` bump** (merge-on-defaults handles ADDED fields, per the `§4-mig` rule). New saves include it. The schema tripwire (`schema.expected.json`/`test_schema.cjs`) should add `forceLbsSeismic` when the harness is regenerated (reminder-only, like rev-58's `g.Cs`).

**(3) Feed (the whole behavioral change).** `lineResults`' `gL = {...g, wWind: line.forceLbs, vSeismic: line.forceLbsSeismic || 0}`; the single-line optimizer `generateDesign({...g, wWind: ln.forceLbs, vSeismic: ln.forceLbsSeismic || 0}, …)`. `stackedLineResults`/`generateStackedDesign` route through `lineResults`, so the stacked path inherits `vSeismic` from the line (0 in 2-Story for now). The manual **Calculation-sheet** path (per-tab `wWind`, global `g.vSeismic`) is intentionally untouched — its seismic is still the manual global.

**(4) Per-element governing notation (Q3 — per-element, not a single line badge).** Display-layer helpers (module-level, outside the engine, withUtil pattern): `_govShearCase(r, grade)` returns "W"/"S"/null by comparing `vW/t.wind` vs `vS/(factor·t.seismic)` at the selected type; `_govBy(s, w)` returns the larger (or null) for end post (`compS`/`compW`), holdown (`upHD_S`/`upHD_W`), footing (`LminS`/`LminW`). A small `CaseTag` chip (blue W = `SW.accent`, amber S = `SW.amber`) is appended to the nailing, end-post, holdown, and footing rows in the selected-line results table. Anchor/embed/strap follow the holdown case (derived from `maxUplift`).

**(5) UI.** `S_DS` is now an editable input on the Design **Seismic** `PinCard` (drives E_v: `B=0.6−0.14·S_DS` uplift / `A=1+0.14·S_DS` comp — already in `calcSegment`, just surfaced); an `R (ref)` row notes it's reference-only (rev 61). The selected-line title shows `wind {…}k · seismic {…}k`. The tab footnote rewritten: seismic is per-line, `S_DS` editable here.

**(6) Stale-push.** `forceLbsSeismic` rides in the `computeHandoff` signature (deps include `g`/`sw`/`seisExtent`) so a Cs / dead-load / geometry edit re-arms the Plan→Design ⚡; the `optimizeSig` line-key gained `forceLbsSeismic` so it re-arms the Design ⚡ Optimize too (also covered via `gKey` since Cs/S_DS/DL live in `g`).

**Scope / judgment.** **1-story only** this rev (2-Story seismic = 0 until rev 63). The optimizer auto-sizes for the governing case because `generateDesign`→`evaluateCandidate` already enveloped — feeding `vSeismic` is sufficient. **Known follow-up:** "Send line to calculation sheet" carries only `wWind` per tab; the calc sheet's seismic remains the global manual `g.vSeismic`, so a seismic-governed Design line won't reflect that on the calc sheet until a per-tab-seismic rev (deferred — the calc sheet is the manual verification surface).

**Verification.** `calcCore.js` byte-identical vs the rev-61 deliverable. Modular + single-file preview compile CLEAN; comment-lexer balanced. Render smoke 2/2 (`renderToString(App)` = 36,899). Focused functional envelope test **8/8** (extracting the shipped `calcSegment`, mirroring `lineResults`' `type=max(sugS,sugW)` + selType attach): a wind-only line (`vSeismic 0`) → `_govShearCase` "W"; a seismic-governing line (`vSeismic 5000` → `vS 350`, `sugS 2`; `wWind 2000` → `sugW 1`) → enveloped `selType 2` (raised from the wind-only `1`) and `_govShearCase` "S"; seismic overturning/compression grow with `vSeismic`; `_govBy` picks the larger and returns null when neither acts. (Full §6b sweep not reproduced — harness files weren't in the upload; the handoff-join integration — feed a known plan, assert each line's `forceLbsSeismic` and the per-element governing — should be added when the harness is regenerated. The rev-59 `_step3.cjs` already proved the underlying seismic reaction mechanism — X 113.5 / Y 73.79 plf, baseShear = V, reactions present.)

## 4zzj. Rev 61 — Seismic engine convention: vSeismic is now the post-R reduced base shear (sanctioned guarded change + migration)

Prerequisite for wiring seismic into the Design tab. The user confirmed their `Cs` already includes R (standard ASCE 7 `Cs = S_DS·Ie/R`), so the per-line seismic reaction off the Plan tab (`V = Cs·W`, distributed) is **post-R strength level**. The engine's seismic path, however, divided by `R` internally (`E_seis = (0.7·vSeismic)/R`) and the calc-sheet input was labeled `(lbs·R)` (un-reduced). To make seismic mirror wind — feed a strength force, engine applies only the ASD factor — the `/R` is dropped. The user explicitly approved this engine change (the "cleaner conceptually" path over feeding `reaction·R`).

**(1) Engine (guarded — sanctioned).** `calcCore.js`: `const E_seis = (0.7 * g.vSeismic) / g.R;` → `const E_seis = 0.7 * g.vSeismic;`. Now `g.vSeismic` means the **post-R (ASCE 7 reduced) seismic base shear in lbs**, exactly parallel to `wWind` (whose ASD factor is `0.6` for code ≥ 3). `g.R` is **no longer read by the engine** (kept in `g` for save-file stability + reference display). This is the 2nd sanctioned engine deviation after rev-58's `buildSecData`: the byte-identity guard for `calcSegment` is **re-baselined to golden-OUTPUT** — its correctness invariant is now "produces the documented seismic numbers," not "byte-matches the pre-rev-61 text." The calcCore header records the deviation. Everything else in `calcSegment` (wind path, `sds`-driven E_v on compression `A = 1+0.14·sds` and uplift `B = 0.6−0.14·sds`, posts/holdowns/straps/footing/deflection) is untouched.

**(2) Calc-sheet display (mirrors the engine; not guarded).** In `CalcSheet` (`plan-sketcher-suite.jsx`): the duplicate `E_seis` display const drops its `/R` too; the seismic input relabels `V_SEISMIC (lbs·R)` → `V_SEISMIC (lbs)`; the readout `E = 0.70 · V / R` → `E = 0.70 · V`; the `R` row stays but is annotated `(ref)` (reference-only — no longer in the formula). **UX upshot:** the manual calc sheet now takes the actual ASCE 7 reduced base shear directly, consistent with the Plan-tab `Cs·W`, and parallel to the wind `W_WIND (lbs)` field right beside it.

**(3) Save schema migration (`§4-mig`).** The MEANING of `g.vSeismic` changed (was "lbs·R" un-reduced, now "lbs" reduced), so `CURRENT_VERSION` 2 → 3 with a new `MIGRATIONS[2]` step that divides any old stored `calc.g.vSeismic` by the stored `calc.g.R` (falling back to `DEFAULT_G.R = 6.5` for files predating an `R` field, and guarding a missing `calc`/`g`). `g.R` itself is preserved. Real-world risk is low (no `.wps` in the wild per §0), but the version ladder + migration are correct for any saved manual calc state. `DEFAULT_G.vSeismic`/`.R` unchanged (the default `vSeismic:5` now reads as 5 lbs reduced → `E = 3.5`).

**(4) Design tab — explicitly unchanged this rev.** `lineResults`/`generateDesign` still feed only `wWind` per line, leaving `vSeismic` at the global default, so no Design-tab line changes. rev 62 adds the per-line seismic feed; rev 61 only makes that feed clean (reaction in directly, ×0.7, no R reconciliation).

**Verification.** Modular compile CLEAN; single-file preview-bundle compile CLEAN; render smoke 3/3 (`renderToString(App)` = 36,899 chars, matches the rev-60 SSR baseline, seismic input confirmed relabeled — no `lbs·R` in output). Focused engine check **6/6**: `E_seis = 0.7·1000 = 700` (NOT `/R = 107.69`); `vS` correct; wind path untouched (`Fw = 0.6·10000 = 6000`); E_v intact (`A = 1.14`, `B = 0.46` at `sds = 1`). Migration ladder **6/6**: v2 `6500/6.5 → 1000`, `R` preserved, version → 3; pre-version file with no `R` uses 6.5; v3 file untouched; no-`calc` file stamps to v3 without error. (Full §6b sweep not reproduced — the harness `.mjs`/`.cjs` files weren't in the upload; the golden seismic assertions in `test_str1_golden.mjs` and `schema.expected.json` should be re-pointed to the new convention when the harness is regenerated. Specifically: any test feeding a fixed `vSeismic` and asserting a seismic output now expects the value `×R` larger; `schema.expected.json` keeps `vSeismic` as a known field but the load fixture must be authored at v2 and assert `÷R` on load.)

**Deliverables this rev = FOUR (calcCore.js changed):** `src/calcCore.js`, `src/plan-sketcher-suite.jsx`, the single-file preview bundle, and this handoff. **Deploy note for rev 61 ONLY: replace BOTH `src/calcCore.js` AND `src/plan-sketcher-suite.jsx`** (the standing "calcCore.js UNCHANGED" note does not apply to this rev). Subsequent revs revert to app-file-only unless they touch the engine again.

## 4zzi. Rev 60 — Seismic 2-story module: per-diaphragm weight + vertical force distribution (user-requested)

The 1-story seismic module (rev 57–59) is extended to **two-story** buildings. Seismic mass and the resulting lateral force are now tracked **per diaphragm level** (Roof = Level 2, Floor = Level 1), the tributary wall weight splits between the floors above/below each diaphragm (per the user's SECTION-B / C / D schematics), the base shear is distributed vertically, and each level's force is mapped to the plan boundary as plf — all reusing the rev-58 generalized `buildSecData` so **no guarded engine code changed**.

**(1) Per-level effective weight — `seismicWeight2Story(graph, loop, twoStoryLoop, propsFor, isOne, roofDL, floorDL, wallDL)`** (new pure module fn, right after `seismicWeight1Story`). The tributary WALL weight splits:
- **Level 2 (roof):** `area×roofDL + Σ (par + H₂/2)·len·wallDL` over the **2-story walls only** (a 1-story-tagged wall has no roof up here). `par + H₂/2` = full parapet (above the roof diaphragm) + the UPPER half of story 2. Per schematic: `6 + 10/2 = 11 ft`.
- **Level 1 (floor):** `area×floorDL + Σ H_trib·len·wallDL` where a **2-story** wall → `H₂/2 + H₁/2` (lower half of story 2 + upper half of story 1; per schematic `5 + 6.5 = 11.5 ft`) and a **1-story** wall (`isOne(key)`, mixed-height C/D) → `par + H₁/2` (its own parapet + upper half — its roof sits at the floor-diaphragm level). The remaining bottom half of story 1 (`H₁/2`) dumps to the foundation, excluded.
- **Area DL by level (mixed-height aware):** the 2-story footprint (`twoStoryLoop.area`, the closed 2-story sub-loop) carries a real FLOOR at L1 (`floorDL`) and a ROOF at L2 (`roofDL`); any 1-story-only footprint (`floorArea − roofArea`) carries its ROOF at L1 (`roofDL`). Uniform 2-story → `roofArea == floorArea`, so floor = `floorDL·area`, roof = `roofDL·area`.
- **Diaphragm elevations:** `h_floor = H₁`, `h_roof = H₁ + H₂` (representative story heights = max over the 2-story walls). Returns `{ floorArea, roofArea, Wroof, Wfloor, Wtotal, hFloor, hRoof, WroofArea/WfloorArea/WroofWall/WfloorWall, profiles }`.

**(2) Vertical distribution (Phase 3) — `seismicDistribute2Story(sw2, Cs)`** (new pure fn). `V = Cs·W_total`; `F_level = V·(W_level·h_level)/Σ(W·h)` → `{ V, Froof, Ffloor, sumWh }`.

**(3) Floor-aware plan distribution + viz (Phase 4).** In `PlanSketcher` the seismic block now computes `sw2`/`seis2` (2-story) alongside `sw` (1-story), and distributes the **active-floor** force: `Vview = twoStory ? (activeFloor===2 ? Froof : Ffloor) : Cs·sw.Wtotal`. The diaphragm graph/loop switch by view — roof view (Level 2) uses `twoStoryGraph`/`twoStoryLoop` (the roof exists only on the 2-story walls), floor view (Level 1) + 1-story use the full `graph`/`loop`. `w = Vview / (bbox extent ⟂ the force)`, where the bbox is the **diaphragm's own** `seisViewExtent` (so a mixed building's roof spreads over the 2-story footprint, not the full plan). `secSeisH`/`secSeisV` call the generalized `buildSecData({axis,sign:-1}, seisGraph, seisLoop, isSup, propsFor, {base:()=>w,lee:()=>0})` → the windward-collection + shadow + guarded `lineReactions` conserve `Vview` and yield the wall reactions. The existing **Load case** Wind|Seismic toggle + the floor selector then drive everything: flip to Seismic, switch Level 1 ↔ Level 2, and the canvas shows that diaphragm's plf line loads + reactions. (1-story path unchanged: `Vview = Cs·sw.Wtotal`, full graph — byte-equivalent to rev 59.)

**(4) Display + lift.** The 2-Story Seismic Weight card (was a "coming in a later step" placeholder) now shows per-level W (area + wall split), W_total, V, the story forces `F_roof`/`F_floor`, and the per-level plan plf for the **selected** floor (X-dir ⟂ the Y-span, Y-dir ⟂ the X-span). `wTotal` lifted to App now covers 2-story too (`twoStory ? sw2.Wtotal : sw.Wtotal`), so the Design-tab Seismic card shows `V = Cs·W` in 2-story mode (was "—").

**Scope / judgment.** **VIEW-ONLY** — the seismic reactions are computed + drawn but still do NOT drive the Design-tab seismic demand (manual `g.vSeismic`); wiring that is the next phase. **Mixed-height (C/D):** handled via the existing `isOneStory` tags + `twoStoryLoop`; if the 2-story region does NOT close into a sub-loop (an open step-up, some Section-D arrangements), `twoStoryLoop` is null → roof area falls back to the full `loop.area` (over-counts the roof area) — the same open-region limitation the mixed-height wind feature carries; flag for a centroid/area refinement if a real open case needs it. **Representative heights** `H₁`/`H₂` = max over the 2-story walls (exact when uniform). **Bidirectional sign:** both seismic sections use `sign:-1` (mirror faces are identical in magnitude). **Rounding:** the spec's `F_roof 5,984.8` / `F_floor 6,214.7` are hand-rounding of an intermediate ratio; the exact values are **5,985.2 / 6,214.3 lbs**, and the plan plf land on the spec's 153.46/99.75 + 159.35/103.58.

**Guarded engine UNTOUCHED.** `calcCore.js` BYTE-IDENTICAL; all 8 app-file guarded fns (`findLeewardPartner`, `lineReactions`, `buildSecData`, `lineResults`, `stackSeg`, `stackedLineResults`, `upliftStk`, `withUtil`) BYTE-IDENTICAL — the two new helpers are pure and outside the engine; `buildSecData` is unchanged since rev 58.

**Verification.** esbuild compile CLEAN; engine guard CLEAN (calcCore byte-identical, 8/8 app fns identical); SSR mount PASS in wind (36,899) + forced 2-story-seismic (43,951). **`work/_test_seis2.cjs` 17/17** — the Phase-5 case EXACT: W_roof 86,004 (46,800 area + 39,204 wall), W_floor 157,986 (117,000 + 40,986), W_total 243,990, V 12,199.5, Σ(W·h) 4,031,910, F_roof 5,985.2 / F_floor 6,214.3, plan plf 153.46/99.75 (roof) + 159.35/103.58 (floor). **`work/_test_pipeline.cjs` 14/14** — end-to-end weight→distribute→`buildSecData`→reactions on the 60×39 case: each level's base shear conserves its force (roof 5,985, floor 6,214), reactions present, the drawn face plf equals `F/extent`. **`work/_test_mixed.cjs` 5/5** — Sections C/D: a 1-story-tagged wall contributes **0** roof trib (`htR=0`) and `par + H₁/2` (=12.5 ft) floor trib; profiles split 1-story vs 2-story. `APP_BUILD = 139` ("Version 1.39"). **Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.** Preview: Plan tab → 2-Story pill, draw the 60×39 box, set H 13 / H₂ 10 / par 6 (Global Inputs), Roof DL 20 / Floor DL 50 / Wall DL 18 / Cs 0.05; the Seismic Weight card reads W_total 243,990, V 12,199.5, F_roof 5,985 / F_floor 6,214; flip **Load case → Seismic** and use the floor selector — Level 2 draws the roof plf (153.46/99.75), Level 1 the floor plf (159.35/103.58), with wall reactions. **Next: wire the seismic reactions into the Design-tab demand** (envelope of wind vs seismic per line); and refine the mixed-height roof-area fallback for open 2-story regions.

## 4zzh. Rev 59 — Seismic Step 3 of 3: base-shear distribution + reactions + Wind/Seismic toggle; Cs moved to the Plan tab (1-story module complete)

Final step of the 1-story seismic module. Distributes `V` to the plan boundary as a plf line load, generates the wall reactions through the guarded engine, draws it all on the plan, and adds the view toggle. No guarded code changed (it reuses the rev-58 Option-B seam).

**(1) Cs relocated (user-requested).** The `Cs` number input moved from the Design tab to the Plan-tab **Dead Loads** card (now: Roof DL, Floor DL, Wall DL, then **Seismic Cs**). The Design tab's **Seismic** `PinCard` now shows `Cs` and `V = Cs·W` **read-only**. All seismic/dead-load INPUTS are now on the Plan tab; values stay in shared `g`.

**(2) Distribution model.** `Cs = Number(g.Cs)||0`; `Vfull = !twoStory ? Cs·sw.Wtotal : 0` (lbs). `seisExtent` = the plan's bounding-box extents `{dx,dy}` from `graph.nodes`. Per-direction uniform line load: `wSeisX = Vfull/dy` (force X, applied to the Y-running faces — the `dy`-spanning ones), `wSeisY = Vfull/dx` (force Y, X-running faces). These are surfaced in the Seismic Weight card ("X-dir / Y-dir face load … plf").

**(3) Seismic sections via the generalized engine.** `seisModelH = {base:()=>wSeisX, lee:()=>0}`, `seisModelV = {base:()=>wSeisY, lee:()=>0}`; `secSeisH = buildSecData({axis:"h",sign:-1}, graph, loop, isSup, propsFor, seisModelH)` and `secSeisV` likewise (axis "v"). `seisOn = loadCase==="seismic" && Vfull>0 && !!loop` gates the memos (no seismic compute in wind view / 2-story / open plan). Because the load model is uniform and `lee=()=>0`, `buildSecData`'s back-wall subdivision collapses to one plf per face and the across-wind shadow filter keeps a face set whose transverse projections tile the extent once → the uniform `V/extent` integrates back to exactly `V`. The reactions come straight out of the guarded `lineReactions` — **no new reaction code**.

**(4) Plan viz + toggle.** New `loadCase` state ("wind"|"seismic") + a **Load case** segmented toggle (Wind | Seismic) in the top ribbon (same `storypill` control as the 1/2-Story pill). `showSeis = loadCase==="seismic"`; `dispH = showSeis ? secSeisH : secH` (and `dispV`). The canvas load/reaction maps now use `dispH`/`dispV`: in seismic view they draw both directions' plf loads + reactions and skip the section-cut `onOpen` (seismic isn't section-edited) and the floor-1 `displayPlf` override. `WindLoad` gained a `prec` prop (seismic passes `prec={2}` → 2-decimal plf labels; wind stays `fmt1`). `loadCase` persists in the sketcher session (`get`/`set`, additive — old files default to "wind").

**Scope / judgment.** **View-only:** the seismic reactions are computed + drawn but do NOT yet feed the Design-tab seismic demand (still the manual `g.vSeismic`) — wiring that is a later step (likely with 2-story). **1-story only:** `Vfull=0` in 2-Story (W_total is 1-story), so seismic view shows nothing there yet. **Sign:** both seismic sections use `sign:-1` (loads the min-coordinate faces); seismic is bidirectional, so the opposite sign mirrors the faces with identical magnitude/reactions — flip if the other faces should be drawn. **Display rounding:** the true face loads are 113.515 / 73.785 plf (on the 60×39 case); the canvas rounds to 2 dp → 113.52 / 73.79 (the schematic's "73.78" was a truncation of 73.785) — switch to truncation or 1-dp if an exact CAD match is wanted.

**Verification.** compile CLEAN; `calcCore.js` + the 7 must-hold guarded fns BYTE-IDENTICAL; `buildSecData` unchanged since rev 58 and its wind output re-confirmed IDENTICAL by `work/_golden.cjs` (rect + L, 4 dirs). `work/_step3.cjs`: on the 60×39 rectangle, X-dir plf 113.5 / Y-dir plf 73.79, **secH & secV baseShear = V = 4,427.1 lbs**, reactions present in both. SSR render smoke PASS in wind (36,696 chars) and forced-seismic (42,933) views — the seismic render path mounts without error. `APP_BUILD = 138` ("Version 1.38"). Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.

## 4zzg. Rev 58 — Seismic Step 2 of 3: base shear V + the Option-B engine generalization; all dead loads moved to the Plan tab

Second of the three seismic steps. Lands the scalar base shear and the one approved guarded-engine change, and finishes relocating the dead-load inputs.

**(1) Dead-load inputs fully relocated.** Per the user, the **entire** "Loads" `PinCard` is removed from the Design tab. **Floor DL** now sits with Roof DL + Wall DL in the Plan-tab **Dead Loads** card (all three psf inputs together; Floor DL is there for the upcoming 2-story seismic). The values remain shared `g` fields, so the Design/Calc **uplift path is byte-identical** — only the editing UI moved. (The Design tab's Loads slot is now the Seismic card below.)

**(2) `Cs` input + base shear `V`.** New `g.Cs` (Seismic Response Coefficient; `DEFAULT_G.Cs = 0.05`). A new **Seismic** `PinCard` on the Design tab carries the `Cs` number input and a read-only `V = Cs·W` (lbs) row; the Plan-tab Seismic Weight card shows the same `V` row under W_total. To make `V` available on the Design tab, the 1-story `W_total` is **lifted from `PlanSketcher` to `App`** as `wTotal` via a one-line effect (`useEffect(()=>setWtotal(twoStory?null:sw.Wtotal), [twoStory, sw.Wtotal, setWtotal])`); it's `null` in 2-Story mode so both tabs render "—" (pending). `PlanSketcher` is always mounted (hidden via `display:none`), so the lift stays live; while on the Design tab only `Cs` changes `V` (geometry/DL are Plan-tab inputs), so a stale-but-correct `wTotal` is fine.

**(3) Option B — `buildSecData` generalized (the one guarded change, user-approved).** A new module const `WIND_LOAD = { base:(pr)=>0.5·H·pw + par·qWind, lee:(pr,leePar)=>leePar·qLee }`, and `buildSecData(section, graph, loop, isSup, propsFor, loadModel)` now uses `const LM = loadModel || WIND_LOAD` at its three plf sites — the windward-label `w.total` (= `LM.base(pr) + LM.lee(pr,cPar)`), the per-wall `base` (= `LM.base(pr)`), and the per-sub-span `plf` (= `base + LM.lee(pr,leePar)`). The default reproduces the **exact** prior arithmetic (same operations, same order), so the wind path is unchanged. A seismic caller (Step 3) passes `{ base:()=>V/extent, lee:()=>0 }` — the existing windward-collection + across-wind shadow + `lineReactions` geometry then distributes a uniform seismic line load and conserves V (the shadow filter keeps a face set whose transverse projections tile the extent once). **`lineReactions` is untouched** — it already consumes `segs[].plf` regardless of source.

**Guard / verification.** `calcCore.js` BYTE-IDENTICAL; the other 7 app-file guarded fns (`findLeewardPartner`, `lineReactions`, `lineResults`, `stackSeg`, `stackedLineResults`, `upliftStk`, `withUtil`) BYTE-IDENTICAL. `buildSecData` is **intentionally** changed — **re-baseline the engine guard for `buildSecData`**; its wind-neutrality is now locked by the golden regression, not byte-identity. **`work/_golden.cjs`:** runs the upload-baseline `buildSecData` vs the rev-58 one over a 60×39 rectangle AND the L-shape (re-entrant) in all 4 section directions — **wind output IDENTICAL** (windLoads + reactions + baseShear + divides, JSON-equal). Seismic seam: the generalized `buildSecData` with `{base:()=>V/39,lee:()=>0}` on the rectangle gives **baseShear = V = 4,427.1 lbs**. Scalar: `V = 0.05 × 88,542 = 4,427.1 lbs`. esbuild bundle-compile CLEAN (modular + preview). `APP_BUILD = 137` ("Version 1.37"). Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.

**Schema note:** `g.Cs` is a new field in the shared `g` (saved in `calc.g`). Additive — old `.wps` files lack it → `g.Cs ?? 0` renders 0 until set; new saves include it. The schema tripwire (`test_schema.cjs`) may flag the new `g.Cs` name as a reminder — intentional, like the rev-53 `calc.tabs` addition.

## 4zzf. Rev 57 — Seismic module, Step 1 of 3: effective seismic weight W_total (1-story, user-requested)

First of three steps building the seismic module (the user chose **Option B** for the engine — a generalized `buildSecData` load provider — to land in Step 2; 1-story first, 2-story later). This step is weight only and touches no guarded code.

**Plan of record (user-confirmed):** Step 1 = seismic weight W_total (this rev). Step 2 = `Cs` input + `V = Cs·W_total` + the Option-B generalization of `buildSecData` (per-face load provider, wind path byte-identical) gated behind a golden-output regression. Step 3 = seismic line-load distribution (`w = V / projected extent`) through the generalized engine + the guarded `lineReactions`, plan visualization (plf), and a Wind/Seismic view toggle at the top of the drawing area. Working assumptions for 2–3 (open to correction): `V` is visualize-only at first (manual seismic demand in the design checks stays until 2-story); the toggle is a view switch that auto-applies seismic to both directions (no drag); `D`/`B` are the plan bounding-box extents; `Cs` in Design params, `V` on the Plan tab.

**(1) Dead-load inputs relocated to the Plan tab.** The Roof DL and Wall DL (psf) inputs moved from the Design-tab "Loads" `PinCard` to a new **Dead Loads** card in the Plan Sketcher side panel — they drive the seismic weight, which is a geometry-phase quantity. Implementation: `g` + `setGl` are now passed from `App` into `PlanSketcher`; the two inputs write `g.roofDL` / `g.wallDL` exactly as before (shared state), so the uplift dead-load formula in `calcCore.js` (`wdl = roofTrib·roofDL + floorTrib·floorDL + wallDL·h`) reads the same values — **no engine or behavior change to uplift.** Floor DL stays on the Design tab (uplift / future 2-story); the Design "Loads" card now shows a "set on Plan tab" pointer where the two inputs were.

**(2) Pure helper `seismicWeight1Story(graph, loop, propsFor, roofDL, wallDL)`** (module-level, near `keyOf`). `area = loop.area` (0 if the plan isn't closed); `W_roof = area × roofDL`. Per wall: `H_trib = par + H/2` — the full parapet (entirely above the diaphragm, tributary to the roof) plus half the story height below it (the lower half spans to the foundation) — `W = H_trib × length × wallDL`; summed over **every** edge to `W_wall`. `W_total = W_roof + W_wall`. It reads each wall's own `par`/`H` through `propsFor`, so the relocated Global-Inputs / section-cut values flow straight in. Returns `{ area, Wroof, Wwall, Wtotal, profiles }` where `profiles` groups equal `(par,H)` walls (the per-profile sum equals the per-wall sum identically). **1-STORY ONLY** — the 2-story per-diaphragm split is deferred; in 2-Story mode the card shows a "coming in a later step" note rather than a wrong number. (Open assumption: it sums over ALL edges, so an interior wall contributes `(H/2)·len·wallDL`; the test footprints are bare perimeters so this is moot for now — switchable to loop-only if desired.)

**(3) Display.** A new **Seismic Weight** card on the Plan side panel (below Dead Loads): roof area, W_roof, W_wall, the accented W_total (all in lbs with thousands separators), and a "By parapet profile" breakdown (`par′ · H′ · len′ → Hₜ′ … W lbs`). Shows a "close the plan boundary" hint when there's no enclosed loop.

**Verification.** esbuild bundle-compile CLEAN (modular + preview); `calcCore.js` byte-identical vs the upload; all 8 app-file guarded fns extract-and-diff IDENTICAL. **Phase-4 unit test PASS:** extracting the shipped `seismicWeight1Story` and running the standard case (60×39, roofDL 20, wallDL 18, H 13, par 6 on the two 60′ walls / par 4 on the two 39′ walls) gives area 2,340 ft², W_roof 46,800, W_wall 41,742 (profiles 27,000 + 14,742), **W_total = 88,542 lbs** — exact. `APP_BUILD = 136` ("Version 1.36"). Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.

## 4zze. Rev 56 — Global Inputs: define wall/parapet heights + pressures once and apply to every wall (user-requested)

The user wanted a way to set the wall height, parapet height, and pressures for the WHOLE building at once, instead of opening a section cut and editing every wall — useful whenever those parameters are uniform. New **Global Inputs** button in the Plan Sketcher side panel; clicking it opens a window whose values are applied to every wall in one action.

**Where it lives.** A new `.card` titled **Global Inputs** in the side panel, placed right under **Live Metrics** (so it sits above the conditional Wind Line Loads card and is always visible). The button (`⚙ Global inputs…`) is disabled when the plan has no walls. Opening calls `openGlobalInputs`, which seeds the window; the window mounts next to `WindWindow`/`DLTributaryWindow`.

**Field → prop mapping (maps onto EXISTING per-wall props — no new field).**
- **1-Story mode:** Wall Height→`H` · Parapet Height→`par` · Wall Pressure→`pw` · Windward Parapet Pressure→`qWind` · Leeward Parapet Pressure→`qLee`. All applied to every wall; `H2` is left untouched (there is no 2nd level).
- **2-Story mode:** 1st Level Wall Height→`H` and 2nd Level Wall Height→`H2`, both on every wall. The three pressures are NOT split by level (`pw`/`qWind`/`qLee`, every wall). The two parapet HEIGHTS route by the 1-story tag: **1st Level Parapet Height → `par` on walls where `oneStory.has(key)`**, **2nd Level Parapet Height → `par` on the full-height (non-tagged, 2-story) walls.** Each physical wall still has exactly ONE `par`; this is a routing of the existing field, deliberately NOT a new `par2` (adding a per-level parapet would touch the wind/section engine + the `.wps` schema, which the user didn't ask for). A 1-story wall's parapet is physically at its own (level-1) roof, a 2-story wall's at the level-2 roof, so the routing is correct.

**Component `GlobalInputsWindow({ seed, twoStory, hasOneStory, onApply, onClose })`** — modeled on `DLTributaryWindow`: same `.ovl`/`.win`/`.win-h`/`.win-b` chrome, the same `inputS` field style, per-field string buffers (so a partial decimal like "10." survives typing). Two grouped sub-sections, **Wall & parapet heights** and **Wind pressures**, rendered by an inline `FieldRows(rows)` map (NOT a nested component, to avoid input remount/focus-loss). Unlike the DL window it does NOT write live per keystroke — it has an explicit **Apply to all walls** button (+ Cancel), because it is a deliberate building-wide overwrite. The 1st-level parapet field shows a hint ("Applied to walls tagged 1-story" / "… (none yet)") so its routing is clear even when no 1-story walls exist.

**Seeding (`openGlobalInputs`).** Each field is seeded from the building-wide CONSENSUS: a small `cons(get, keys)` returns the common value across the given edge keys, or null if they differ / there are none, in which case it falls back to the `DEF_SECTION` default. `par1` is seeded from the 1-story-tagged walls (2-story mode) or all walls (1-story mode); `par2` from the 2-story walls. So reopening the window reflects what's actually applied when the building is uniform.

**Apply (`applyGlobalInputs(vals)`).** One `setWallProps` over `graphRef.current.edges`: for each edge key it spreads the current entry first (`...(next[k] || DEF_SECTION)`) so per-wall DL tributary and any other field survive, then overwrites the height/parapet/pressure fields per the mapping above; 2-story routes `par` by the 1-story tag. Closes the window on apply. Non-undoable, exactly like the existing section-cut/DL edits (`snapshot()` only captures `{graph, sel}`, never `wallProps`).

**Reactivity / no engine touch.** `secH`/`secV`, `propsForActive`, the design handoff, and the rev-51/52 stale-push signatures all derive live from `wallProps`, so the on-plan loads, reactions, section-cut values, and Design tab update automatically; a global apply also (correctly) re-arms the ⚡ stale indicators if the plan had been pushed, since the handoff signature changes. **NO guarded engine fn, `calcCore.js`, `DEF_SECTION`, or `.wps` schema change** — the diff is one new component + one state (`globalInputs`) + two callbacks (`openGlobalInputs`/`applyGlobalInputs`) + the side-panel card + the mount. No persistence field was added (the applied values live in `wallProps`, already serialized; the window re-seeds from consensus on open), so the schema tripwire is untouched.

**Verification.** esbuild bundle-compile CLEAN for both the modular app and the single-file preview bundle; `calcCore.js` byte-identical vs the upload; all 8 app-file guarded fns extract-and-diff IDENTICAL vs the upload. **Per the user's instruction this session, the full SSR render-smoke + logic suites were NOT run** — verification was compile + engine byte-identity only (re-run §6/§6b at the next session start, or now if a fuller guard is wanted). `APP_BUILD = 135` ("Version 1.35"). Deploy: replace `src/plan-sketcher-suite.jsx` ONLY — `calcCore.js` UNCHANGED.

## 6. Verification workflow (run ON REQUEST / when warranted — NOT auto at session start; focused guard per edit)

**Cadence (updated 2026-06-25):** do NOT run the full sweep automatically at the start of a chat — it burns tokens, and whether/when to run is the **user's decision**. Claude may *suggest* a sweep when a change warrants it (guarded-engine/formula edits, broad refactors, or before handing back a finished increment) and run it once the user agrees, or run it when the user explicitly asks. When you do run a sweep, snapshot the engine baseline before the first edit. For everything else, the **focused per-edit guard** stands on its own and needs no sweep: (1) esbuild compile, (2) the engine byte-identity check (cheap), (3) one focused render/headless smoke for the specific thing you changed.

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

# (e) engine functions — as of rev 33 calcCore.js ALREADY exports them, so bundle it DIRECTLY
#     (calcSegment/generateDesign/schedFor/SCHEDULE/SCHEDULE_STR1 live in calcCore.js now;
#      `withUtil` still lives in the app file — export it from a copy of $SRC if a suite needs it).
$ESB work/src/calcCore.js --bundle --format=cjs --outfile=work/sw_test.cjs --log-level=error

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
# rev 60/63 seismic goldens (need work/tests/exp_app.cjs + work/tests/sw_test.cjs — see §6b Step 2 + the new sources below):
node work/tests/_test_seis2.cjs && node work/tests/_test_stackseg_golden.cjs

# Engine guard: prove no UI edit changed the math.
# ONE-TIME, before your first edit this session, snapshot the baseline (the app file alone is fine
# as the baseline ONLY if you snapshot it before splitting; post-rev-33 the engine lives in calcCore.js,
# so snapshot BOTH or — simplest — snapshot a concatenation. The script below diffs each guarded fn
# from wherever it currently lives (calcCore.js for the moved engine fns, the app file for the rest)
# against the baseline. As of rev 33 the baseline must contain the engine text too; if you split further,
# extend SRCS with the new module files.):
#     cp work/src/plan-sketcher-suite.jsx work/.engine-baseline.jsx   # (pre-rev-33 monolith baseline)
#     # post-rev-33: the baseline is the rev-32 monolith; the guard finds moved fns in calcCore.js.
# Then after any edit, run this to confirm the guarded fns are byte-identical to that baseline:
python3 - <<'PY'
import os, sys
BASE='work/.engine-baseline.jsx'
# the guarded fns may now live across multiple files; search them in order:
SRCS=['work/src/calcCore.js','work/src/plan-sketcher-suite.jsx']
if not os.path.exists(BASE):
    sys.exit("no baseline yet — snapshot the current (rev-32 monolith) jsx as work/.engine-baseline.jsx BEFORE your first edit")
def fn(src,name):
    # handles `function name(` and `const name =` (arrow with block body, e.g. upliftStk)
    i=-1
    for pat in ('function '+name+'(','const '+name+' ='):
        i=src.find(pat)
        if i!=-1: break
    if i==-1: return None
    k=src.find('{',i); d=0; j=k
    while j<len(src):
        if src[j]=='{': d+=1
        elif src[j]=='}':
            d-=1
            if d==0: return src[i:j+1]
        j+=1
    return None
prev=open(BASE).read()
cur={p:open(p).read() for p in SRCS if os.path.exists(p)}
def find_cur(name):
    for p in SRCS:
        if p in cur:
            t=fn(cur[p],name)
            if t is not None: return t
    return None
fns=['calcSegment','generateDesign','evaluateCandidate','baseDesignSeg','lineReactions','buildSecData',
     'findLeewardPartner','lineResults','withUtil','stackSeg','stackedLineResults','upliftStk']
bad=[f for f in fns if fn(prev,f)!=find_cur(f)]
print('ENGINE', 'CLEAN' if not bad else 'DIRTY — changed/missing: '+', '.join(bad))
PY
# NOTE: refresh the baseline only when the user EXPLICITLY approves an engine/formula change,
# i.e. after that change lands: cp the relevant current source over work/.engine-baseline.jsx
# (or re-derive a fresh monolith baseline).
# BASELINE STATUS (rev 63): re-snapshotted at rev 63 as `cat calcCore.js plan-sketcher-suite.jsx > work/.engine-baseline.jsx`.
# THREE guarded fns have intentionally diverged from the original upload and are now GOLDEN-OUTPUT, not
# byte-identity — their correctness is locked by the goldens, and the rev-63 baseline locks them forward:
#   • calcSegment (rev 61, /R dropped)      → test_str1_golden.mjs (wind/DL; vSeismic 0 so unaffected) + the seismic convention
#   • lineResults (rev 62, per-line vSeismic feed)  → covered by the Design-tab seismic wiring
#   • stackSeg    (rev 63, upper-story DL + cumulative footing shear) → _test_stackseg_golden.cjs (exact + direction)
# Verified rev 60→63: a guard run with the rev-60 upload as baseline showed EXACTLY these three changed; the
# other 9 (generateDesign, evaluateCandidate, baseDesignSeg, lineReactions, buildSecData, findLeewardPartner,
# stackedLineResults, upliftStk, withUtil) were byte-identical. 2-story distribution locked by _test_seis2.cjs.
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

<details><summary><code>work/tests/_test_seis2.cjs</code> (rev 60/63 — 2-story seismic Section-B regression; needs the app-export bundle <code>exp_app.cjs</code>)</summary>

```js
// Build: cp the app to work/_exp_app.jsx, append `export { seismicWeight2Story, seismicDistribute2Story };`,
// esbuild --bundle --format=cjs --external:react --external:react-dom → work/tests/exp_app.cjs
const { seismicWeight2Story, seismicDistribute2Story } = require("./exp_app.cjs");
let fail = 0; const ok = (n, c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) fail++; };
const close = (a, b, t=0.1) => Math.abs(a-b) <= t;
// 60×39 rectangle, all walls 2-story; H 13 / H₂ 10 / par 6; roof DL 20 / floor DL 50 / wall DL 18; Cs 0.05
const graph = { nodes:[{id:0,x:0,y:0},{id:1,x:60,y:0},{id:2,x:60,y:39},{id:3,x:0,y:39}],
                edges:[{a:0,b:1},{a:1,b:2},{a:2,b:3},{a:3,b:0}] };
const sw2 = seismicWeight2Story(graph, {area:2340}, {area:2340}, ()=>({par:6,H:13,H2:10}), ()=>false, 20, 50, 18);
ok("W_roof 86,004 (46,800 area + 39,204 wall)", close(sw2.Wroof,86004)&&close(sw2.WroofArea,46800)&&close(sw2.WroofWall,39204));
ok("W_floor 157,986 (117,000 + 40,986)",        close(sw2.Wfloor,157986)&&close(sw2.WfloorArea,117000)&&close(sw2.WfloorWall,40986));
ok("W_total 243,990", close(sw2.Wtotal,243990));
ok("h_floor 13 / h_roof 23", sw2.hFloor===13 && sw2.hRoof===23);
const dist = seismicDistribute2Story(sw2, 0.05);
ok("V 12,199.5", close(dist.V,12199.5));
ok("Σ(W·h) 4,031,910", close(dist.sumWh,4031910));
ok("F_roof 5,985.2", close(dist.Froof,5985.2,0.2));
ok("F_floor 6,214.3", close(dist.Ffloor,6214.3,0.2));
ok("F_roof+F_floor = V (conservation)", close(dist.Froof+dist.Ffloor,dist.V,1e-6));
process.exit(fail?1:0);
```
</details>

<details><summary><code>work/tests/_test_stackseg_golden.cjs</code> (rev 63 — stacked-segment golden: locks the upper-story-DL + cumulative footing shear; needs <code>exp_app.cjs</code> + <code>sw_test.cjs</code>)</summary>

```js
// Build: exp_app.cjs must also `export { stackSeg }`; sw_test.cjs = esbuild work/src/calcCore.js → cjs.
const { stackSeg } = require("./exp_app.cjs");
const { calcSegment, isNum } = require("./sw_test.cjs");
let fail = 0; const ok = (n,c) => { console.log((c?"PASS":"FAIL")+": "+n); if(!c) fail++; };
const close = (a,b,t=1e-6) => Math.abs(a-b) <= t*Math.max(1,Math.abs(b));
const seg = { length:8, height:9, roofTrib:6, floorTrib:4, hdDist:0, thickness:5.5, anchor:"Concrete", selType:2 };
const G = o => ({ grade:"rated", species:1, sds:1, R:6.5, code:4, roofDL:15, floorDL:10, wallDL:15, ...o });
const r1 = Object.assign({active:true}, calcSegment({...seg}, G({wWind:4000,vSeismic:3000}), 8));
const r2 = Object.assign({active:true}, calcSegment({...seg}, G({wWind:2500,vSeismic:2000}), 8));
const d = { anchor:"Concrete", hdDist:0, thickness:5.5, ftgWidth:1.5, ftgThick:12 };
const s = stackSeg(r1, r2, 8, G({wWind:4000,vSeismic:3000}), d, 9);
// (1) EXACT golden (rev 63)
ok("MotW 35,100", close(s.MotW,35100)); ok("MotS 31,500", close(s.MotS,31500));
ok("compW 6072.380952", close(s.compW,6072.380952380952)); ok("compS 5841.371428", close(s.compS,5841.371428571429));
ok("upHD_W 3205.333", close(s.upHD_W,3205.3333333333335)); ok("upHD_S 3040.279", close(s.upHD_S,3040.279365079365));
ok("maxComp 6072.380952", close(s.maxComp,6072.380952380952)); ok("maxUplift 3205.333", close(s.maxUplift,3205.3333333333335));
ok("post (2) 2x6", s.post==="(2) 2x6"); ok("hd HDU4", s.hd==="HDU4");
ok("anchorSel SSTB16", s.anchorSel==="SSTB16"); ok("altStrap STHD10", s.altStrap==="STHD10");
ok("LminW 17.78777", close(s.LminW,17.78777326003547)); ok("LminS 18.23834", close(s.LminS,18.23834129373669));
ok("reqFtgLen 18.23834", close(s.reqFtgLen,18.23834129373669));
// (2) DIRECTION: zero the upper-story (r2) DL → confirm the rev-63 correction is doing its job
const s0 = stackSeg(r1, {...r2, wdl:0,AwDL:0,BwDL:0,CwDL:0,Fs:0,Fw:0}, 8, G({wWind:4000,vSeismic:3000}), d, 9);
const num = x => isNum(x)?x:0;
ok("upper DL ⇒ wind uplift DOWN", num(s.upHD_W)<num(s0.upHD_W));
ok("upper DL ⇒ seismic uplift DOWN", num(s.upHD_S)<num(s0.upHD_S));
ok("upper DL ⇒ wind comp UP", s.compW>s0.compW); ok("upper DL ⇒ seismic comp UP", s.compS>s0.compS);
ok("cumulative footing shear shifts Lmin", Math.abs(s.LminW-s0.LminW)>1e-9);
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

- **Double-sided shear walls (rev 65 §4zzn):** marks 4/5/6 are exactly 2× the single-sided 1/2/3 capacity (wind, seismic, Ga), DERIVED from the single-sided rows so they cannot drift; the optimizer reaches them only as a last resort (`generateDesign` runs single-sided `sweep(1,singleCap,1)` first, then `sweep(4,6,4)` with a `minMark=4` gate so a cap-limited single-sided line is never silently doubled). **REVERSIBLE judgment call:** the deflection stiffness `Ga` is also doubled for marks 4–6 (SDPWS 4.3.3.4 — both faces sheathed ≈ 2× unit-shear stiffness). This affects the reported `deflS`/`deflW` ONLY — never any strength sizing (post/holdown/footing/nailing are demand-driven). If the user prefers a more conservative (un-doubled) Ga, drop the `ga: t.ga*2` term in `dblSide` and nothing else changes. **Possible future:** a distinct nailing pattern per face (the current model applies the same 1/2/3 nailing to both sides); surfacing the "BOTH SIDES" callout on the plan/section drawings; an explicit double-sided indicator on the Design-tab chips.
- **Default sheathing = Structural I (rev 65 §4zzn):** `DEFAULT_G.grade="str1"`. New sessions start on Structural I; a toggled grade round-trips via the `{...DEFAULT_G,...calc.g}` merge. An OLD grade-less `.wps` reopens as str1 (acceptable — no live files exist yet; the moment real `.wps` are saved this becomes a visible default, not a data risk since grade only selects a schedule). No `CURRENT_VERSION` bump (additive). The schema tripwire may flag the new defaulted `grade` on the next harness run — expected, add it to `schema.expected.json` then.
- **Global Inputs in the ribbon (rev 65 §4zzn):** the button now lives in the `.ribbon` command bar (its own "Inputs" group) with a native `title` hover tooltip like every other ribbon button; it's `disabled` (with an explanatory tooltip) until at least one wall is drawn. The old side-panel button was removed.
- **Plan-sketcher drafting UX (rev 64 §4zzm):** (1) grid/snap/draw and dimension labels reach **0.5 ft** now (finest `niceStep` step + `fmtHalf` labels + `min/step=0.5` editor). The persistent length label still hides below 4 ft — a visibility threshold, easily lowered if labels on short jogs are wanted. (2) **T-intersection auto-split** (`bindNodeToWall` on node-drop, using `projToSeg`) binds a dragged node onto a wall body, splits it, and carries `noSupport`/`oneStory`/`wallProps` to both halves — same end-topology as the old manual split, so no downstream change. Tolerance is the zoom-adaptive draw pick radius (`2.4*S`); foot must be strictly interior. **Possible future:** also node-snap a DRAGGED node to an existing node (not just to a wall body), and/or surface an undo-friendly visual cue at the moment of binding. (3) plan switcher moved above the canvas + relabeled **Level 1/Level 2** with a **Level N Plan** indicator. No engine/schema touch this rev.
- **Seismic in the Design tab (rev 62 §4zzk + rev 63 §4zzl):** COMPLETE through 2-story. 1-story (rev 62): each line carries `forceLbsSeismic` (view-independent), fed to `lineResults`+optimizer as `vSeismic`; the engine's native envelope designs for the heavier case; per-element W/S badges + `S_DS` on the Design Seismic card. 2-story (rev 63): per-floor `F_roof`/`F_floor` feed via `seisMapFor`; guarded `stackSeg` now adds the upper-story DL as stabilizing to BOTH uplift-resist and post-compression (each case's factored bucket) and uses cumulative footing base-shear — net smaller holdowns, larger posts. `calcCore.js` untouched throughout; `stackSeg` guard is golden-OUTPUT. **Remaining follow-ups (none blocking):** (a) ✓ DONE — the §6b harness was regenerated and run against rev 63: engine wind/DL golden `test_str1_golden.mjs` PASS (vSeismic 0 → unaffected by rev 61), optimizer PASS, **`_test_seis2.cjs` 9/9** (exact rev-60 Section-B targets: W_roof 86,004 / W_floor 157,986 / W_total 243,990 / V 12,199.5 / F_roof 5,985.2 / F_floor 6,214.3), **`_test_stackseg_golden.cjs` 21/21** (exact rev-63 stacked outputs + the upper-DL direction: uplift↓, comp↑, cumulative footing shear), engine guard PASS (only `calcSegment`/`lineResults`/`stackSeg` changed vs the rev-60 upload), render smoke PASS; engine baseline re-snapshotted at rev 63. Both new suites are now in §6b.  (b) **"Send line to calculation sheet" still uses the GLOBAL manual `g.vSeismic`** (the calc sheet has no per-tab seismic, unlike per-tab `wWind`) — a seismic-governed Design line won't carry its seismic onto the calc sheet until a per-tab-`vSeismic` rev; (c) schema tripwire should add `forceLbsSeismic` to `schema.expected.json` when the harness is regenerated (additive, no migration); (d) visual sign-off on the per-element badges + the stacking results on real plan geometry (logic is verified; on-screen placement is the user's eyeball check).

- **Seismic engine convention (rev 61, §4zzj):** `g.vSeismic` is the **post-R reduced** seismic base shear (lbs), not the old "lbs·R" — engine dropped `/R`, applies only ×0.7, mirroring wind. `g.R` is reference-only (kept in `g`/save files, unused by the math). `calcSegment` guard is golden-OUTPUT (re-baselined). KEY ENGINE FACTS (now exploited by rev 62): the optimizer is already case-aware (`type = max(sugS,sugW)`); `calcSegment` already envelopes every element via `xMax`; E_v is in the math via `g.sds` (`A=1+0.14·sds`, `B=0.6−0.14·sds`).

- **Seismic 2-story (rev 60, §4zzi):** the 2-story seismic module computes per-diaphragm weight + vertical force distribution and draws per-level plan plf + reactions. Judgment calls — (a) **VIEW-ONLY**: seismic reactions are drawn but do NOT yet drive the Design-tab seismic demand (still manual `g.vSeismic`); the next phase is an envelope (wind vs seismic) per design line. (b) **Mixed-height C/D:** a 1-story-tagged wall contributes 0 to the roof diaphragm and `par+H₁/2` to the floor; roof area = `twoStoryLoop.area` (the closed 2-story sub-loop). If the 2-story region does NOT close into a sub-loop (an open step-up / some Section-D layouts), `twoStoryLoop` is null → roof area falls back to the full `loop.area` (over-counts) — same open-region limitation the mixed-height WIND feature carries; refine with a centroid/area heuristic if a real open case appears. (c) **Representative heights** `H₁`/`H₂` = max over the 2-story walls (exact when uniform; a stepped-height building would need per-zone handling). (d) **Diaphragm extent** = the diaphragm's own bounding box (roof = 2-story footprint), so a mixed roof spreads `F_roof` over the box, not the full plan. (e) `F_roof`/`F_floor` are the EXACT distribution (5,985.2 / 6,214.3 on the test) — the spec's 5,984.8 / 6,214.7 are hand-rounded; the plan plf match.

- **Seismic Step 3 (rev 59, §4zzh):** the 1-story seismic module is complete. Judgment calls — (a) `Cs` input now lives on the Plan **Dead Loads** card (per the user); Design Seismic card is read-only. (b) The seismic distribution is **view-only**: the reactions are drawn but do NOT yet drive the Design-tab seismic demand (still manual `g.vSeismic`) — wire that in a later step (now bundled with the 2-story envelope, rev 60). (c) Both seismic sections use `sign:-1` (loads the min-coordinate faces); seismic is bidirectional so the opposite sign mirrors with identical magnitude/reactions — flip if the other faces should be drawn, or compute an envelope when wiring the demand. (d) Extent `D`/`B` = plan bounding-box; for an L-shape the shadow filter tiles the perpendicular faces so `V/extent` still conserves V. (e) Canvas plf labels round to 2 dp (113.52 / 73.79 on the test); true values 113.515 / 73.785; switch to truncation/1-dp for an exact CAD match. (f) `loadCase` persists in the session (additive).

- **Seismic Step 2 / Option B (rev 58, §4zzg):** `buildSecData` is a GENERALIZED guarded fn — it takes a `loadModel` (default `WIND_LOAD`). **The engine guard must be RE-BASELINED for `buildSecData`** (it no longer byte-matches the pre-rev-58 baseline); its correctness invariant is now the golden regression `work/_golden.cjs` (wind output identical on rect + L across 4 directions), NOT byte-identity. `lineReactions` and the other 6 + `calcCore.js` stay byte-identical. The entire Loads box left the Design tab (Floor DL too); all DL psf inputs are on the Plan tab now, shared `g`, uplift unchanged. `g.Cs` is additive to the save (schema tripwire may flag it — intentional).

- **Seismic Step 1 (rev 57, §4zzf):** judgment calls — (a) Roof DL + Wall DL inputs were **moved** to the Plan tab (rev 58 completed this by moving Floor DL too and deleting the Design Loads card). Values stay in shared `g`, so uplift is unchanged. (b) `seismicWeight1Story` sums over ALL edges (an interior wall contributes `(H/2)·len·wallDL`); switch to loop-only if perimeter-only weight is wanted — the rectangle/L test footprints are bare perimeters so it's currently moot. (c) `H_trib = par + H/2` is the **1-story** rule; 2-story uses a per-diaphragm split (deferred), so the Seismic Weight card is gated to 1-story and shows a placeholder in 2-Story mode. (d) Roof area needs a closed loop (`loop.area`); an open plan reads 0 with a hint. Open for Step 3: whether computed `V` drives the seismic design demand (vs. the existing manual `g.vSeismic`), the toggle's exact scope, and confirmation that `D`/`B` are bounding-box extents.

- **Global Inputs (rev 56, §4zze):** the side-panel **Global Inputs** button applies wall height, parapet height, and the three wind pressures to EVERY wall at once. Judgment calls: (a) it maps onto the existing single `par` per wall — in 2-Story mode the "1st Level Parapet Height" writes `par` on walls tagged 1-story and "2nd Level Parapet Height" writes `par` on the 2-story walls, rather than adding a `par2` field (which would touch the wind/section engine + the `.wps` schema). If a wall ever needs two physical parapets, that's a real data-model change, not this. (b) Apply is a building-wide OVERWRITE of those fields on every wall (per-wall section-cut customizations to height/parapet/pressure are replaced; DL tributary and other fields are preserved by spreading the current entry first). (c) It is non-undoable, like the existing section-cut/DL edits (`snapshot()` never captures `wallProps`). (d) The window seeds from the building-wide consensus per field (uniform → that value; mixed/empty → the `DEF_SECTION` default); no separate persisted "global" object was added — the applied values live in `wallProps`, already serialized.

- **Selected-wall highlight (rev 54 → resolved in rev 55, §4-log):** clicking a line in the Design tab turns ONLY its dashed centerline yellow (`SEL_STROKE` in `DesignPlan`); the shear-wall band keeps its pass/fail blue/red, so a selected wall that is failing still shows red on the plan. (rev 54 had briefly turned the whole band yellow, masking the FAIL — reverted at the user's request.)

- **Markup scale (rev 32, §4-log — supersedes rev 30 §4-log + rev 31 §4-log):** the toolbar **Markup** dropdown (`markScale`, default `1×`; options `1×`/`0.75×`/`0.5×`/`0.25×`) scales the whole on-plan markup layer together — text labels, the load/reaction arrows, and the nodes. `1×` is the original plan; smaller values declutter a zoomed-out plan. Scales via the `ts` prop (= `markScale`) multiplied into both font size AND geometry in `Tag`/`WindLoad`/`Reaction`, and via `markScale` on the node circles + ghost preview. Deliberately NOT scaled: the node click/grab **hit-target** (`3.5·S`, so small nodes stay clickable), the **arrow count** (`n`/`5.5·S` — size not density), and the **snap ring**. Arrowheads auto-scale via `markerUnits="strokeWidth"`. Persisted under `markScale` in the `.wps` sketcher session (with a `textScale` rev-30 back-compat read); it's sketcher session-UI, NOT in `loadProject`'s schema, so the schema tripwire doesn't cover it. Note the draw-mode **live length** readout is text and also obeys the scale (small while drawing at `0.25×`) — exempting it is a one-line change if disliked.
- Design constraints global across lines (per-line = future option).
- Split support wall with differing H per segment → line uses **max H** (conservative).
- Dashed tributary divide drawn only where plf actually changes (not at every node); rev 18 makes the on-plan plf *label* match (equal-plf sub-spans merge to one label).
- Re-entrant interior walls (L step, notch walls) act as point-load supports when at/downwind of the windward face (rev 18). A U-shape in cross-wind now loads its notch-bottom wall — flagged to user as reversible if a stricter "must reach the windward face" rule is preferred.
- Canvas navigation is now manual+persistent (rev 19): wheel-zoom, middle-drag pan, ⊡ Fit. Auto-fit only seeds the view and returns via Fit / preset-load / New / file-open. **Rev 20** adds a left-drag **Pan** tool and a **wheel-zoom on/off** toggle, both on the empty-area right-click **Canvas** menu (Draw · Pan · Zoom-with-green-light). "Mobile ergonomics of on-diagram inputs" (touch pinch-zoom / two-finger pan) is still open — wheel / middle-drag / the Pan tool are desktop gestures (the Pan tool is the closest thing to touch-pannable so far, since it's a plain left-drag).
- `DEF_SECTION = {H:13, pw:16, qWind:32, qLee:22, par:5}` — fresh pairs reverse symmetrically by design.
- Parapet "anchoring across reverse" relies on per-wall `par`; works through splits inherently now.
- §10-style wishlist not yet built: PDF/report export of plan + loads + design; footings UI (user mentioned; likely belongs near the calc sheet's footing rows — **ask user**); mobile ergonomics of on-diagram inputs; per-line design constraints; dash highlight only on selected design line (offered, not requested).
- Calc sheet footer text + Excel quirks (E42 denominator, `uplift<625 → "neglect"`) are intentional — preserved verbatim.
- **Optimizer vs. stacked demand (rev 46 gap — CLOSED for stacked walls in rev 47):** `optimizeAll` originally sized each wall from its own per-floor `forceLbs` via single-floor `generateDesign`, NOT the arm-aware stacked overturning that `stackedLineResults` validates. Rev 47's `generateStackedDesign` closes this for STACKED walls (present on both floors): it scores candidates through `stackedLineResults` + the 2nd-floor `lineResults`, bounded by the 2-story segment, so the 1st floor governs and "optimizer passes" ≡ "tab shows pass." Remaining (minor): non-stacked 1-story / single-story lines still use single-floor `generateDesign` (correct — they have no stacked partner); and the optimizer assumes ONE uniform segment length per line (equal segs), as `generateDesign` always has.
- **Two-story stacking conventions (rev 27–28, judgment calls worth remembering):** (a) the stacked footing/uplift/compression use the **1st-floor's own** dead load + base shear with the **summed** moments — the upper story's tributary dead weight is NOT added as stabilizing load at the 1st-floor base (conservative for uplift). (b) stacked **deflection** keeps the 1st-floor's own (combined) shear `v` and only swaps in the **stacked end post** for the chord term, so the stacked Δ is ≤ the single-floor Δ — correct as-built, but counterintuitive; the UI note explains it. Both are reversible if the user wants a different model. (c) the Calculation tab is intentionally single-floor — stacking lives only in the Design tab.
- **Step 7b (DONE, rev 28):** the checked-in fixtures + schema tripwire for the two-story fields were re-established and the two-story `.wps` round-trip is proven (`fixture_v2_2story.wps` + `test_loadstate_2story.cjs` + `test_schema.cjs` + `schema.expected.json`; the load core `loadProject`/`migrateProject`/`mergeWallProps` is module-level/pure, so `work/exp.cjs` is a one-line-export rebuild). Two-story save scope note still holds: **no real `.wps` files exist in the wild yet** — this is pre-emptive insurance. If a breaking schema change lands, freeze an OLD-version fixture + add a load-assertion (migration checklist in §4-log).
- **`.wps` save scope:** **Rev 22** added full session-UI restore; **rev 23** made the loader **forward-compatible** for `g`/`d`/`segments`/per-wall props (merge onto named defaults), read the `version` tag (`migrateProject` ladder + newer-version warning), and added `test_loadstate.cjs`; **rev 24** extended the merge to `design.lines` (`DEFAULT_LINE`, scalar fields only) and placed segments (`DEFAULT_PLACED`), added the **stale-line recovery path** (a geometry-less line is dropped + the Design tab shows a "↻ Rebuild from plan" banner that regenerates from the saved plan), and added the **schema tripwire** (`test_schema.cjs`) + **migration-mechanism test** (`test_migrate_ladder.cjs`) + frozen design/stale fixtures (§4-log). What's still **not** serialized: the computed numbers (all results stay live-recomputed on load — Design `resultsByLine` via `lineResults(...)`, Calc `results`/`resultsU` via `calcSegment`/`withUtil`; the optimizer keeps only its output segments, discarding `meta{type,N,Ls}` and per-line required type, re-derived). Round-trips identically because the engine is byte-identical and `d` is saved. **Still open:** (a) persist derived results and/or optimizer `meta`/required types so a `.wps` is an engine-independent record of what passed; (b) the migration ladder's only step is the `1→2` no-op stamp — a genuinely breaking change (rename/unit shift) is the case that needs a real `MIGRATIONS` body, a frozen old-version fixture, and a load assertion (the **migration checklist** at the end of §4-log). **Renames and unit/semantics changes are NOT covered by merge-on-defaults** — they load with no error and a wrong value, so they require an explicit migration step + fixture; the schema tripwire fires to remind you. Note line GEOMETRY-field renames aren't auto-caught by the tripwire (geometry isn't in a default object) — they rely on that discipline. Note `onNew` resets sketcher+design (incl. `designStale`) but **not** `calc{g,segments}` — decide if that's intended when touching this.

## 8. How to resume

1. User uploads this MD + `plan-sketcher-suite.jsx` (zip).
2. `unzip` to `/home/claude/work`, **read the relevant regions before editing** (file is large; use targeted `view`/grep).
3. **Preview the app in chat right away** — since rev 33 the app is multi-file (`plan-sketcher-suite.jsx` + `calcCore.js`) and no longer renders as a standalone artifact, so **bundle the two into one temp single-file jsx** (concatenate `calcCore.js` minus its `export` + the app file minus its `./calcCore.js` import, or esbuild-bundle), copy that to `/mnt/user-data/outputs/`, and present it so it renders as a live artifact. Do this after reading the MD and before waiting for a task (§0 standing rule). The committed repo stays modular — the bundle is preview-only, not a deliverable.
4. `npm install esbuild react@18 react-dom@18` in `/home/claude` if the env is fresh; recreate `test_render_smoke.cjs` from §6 if tests weren't uploaded.
5. Make minimal `str_replace` edits → compile → focused render/headless smoke (+ engine byte-identity check) for what you touched → copy to `/mnt/user-data/outputs/` → present. Run the broader logic suites only when I ask or you flag a guarded/broad change (see §6 cadence) — not by default.
6. **Update this handoff in the same session as any app change** (§0 standing rule) — bump the top rev line, add a `§4*`-style rev subsection, update the rev number in the §0 resume prompt, refresh "Where rev N left off" / "Open items". Code + handoff ship together.
7. Anything that changes documented behavior in §3–§5: confirm with the user first.
8. **Deploy sync (rev 29+):** the repo is the app + the Vite scaffold (§4-log) + this handoff, FLAT at root, on GitHub → Vercel. When you change the app, the user re-uploads the changed jsx via GitHub web UI; the scaffold (`index.html`/`main.jsx`/`package.json`/`vite.config.js`/`.gitignore`) only needs re-issuing if you touch the host shell, the dep list, or the build config — NOT for ordinary app-code edits. If you DO re-issue the scaffold, keep the flat layout live on the repo (or move to `src/` and fix both relative imports together). Always re-commit this handoff with the code so the repo copy stays current.
