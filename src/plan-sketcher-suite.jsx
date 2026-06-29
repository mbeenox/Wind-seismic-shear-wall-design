import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
// Shear-wall calculation engine (verbatim Struware port) lives in its own module
// as of the rev-33 split — see calcCore.js. Behavior is byte-identical; this file
// imports the engine rather than defining it inline.
import {
  calcSegment, generateDesign, baseDesignSeg, schedFor,
  HD_TABLE, NAIL_EDGE, CODES, isNum, xMax, numOr0,
} from "./calcCore.js";
import {
  VB_W, VB_H, GRID, WORLD, niceStep, PRESETS,
  clamp, dist, edgeAxis, norm, same, keyOf, fmt1, fmt2, fmtHalf,
  buildFrom, sanitizeGraph, loopInfo, pointInRing,
} from "./geometry.js";
import {
  CSS, LT_CSS, APP_CSS,
  C_BG, C_GRID, C_WALL, C_NODE, C_LOAD, C_REACT, C_DIMBOX, C_REACTBOX, C_DRAFT, C_ONESTORY,
  SW, MONO, STALE_BTN, WARN, LT,
} from "./theme.js";
import {
  calcPushSig, optimizeSig, withUtil,
  lineResults, stackedLineResults, snapSegsToRuns, generateStackedDesign,
} from "./designEngine.js";
import {
  seismicWeight1Story, seismicWeight2Story, seismicDistribute2Story,
  findLeewardPartner, lineReactions, WIND_LOAD,
  buildSecData, buildSecDataF1, nearestTwoStoryBehind, sectionSequence,
} from "./loadEngine.js";
import {
  PlanSketcher,
} from "./PlanSketcher.jsx";
import {
  selStyle, DesignTab,
} from "./DesignTab.jsx";
import {
  fmt, HL, LtCollapse, ltSel, CalcSheet,
} from "./CalcSheet.jsx";
import {
  Tag, WindLoad, Reaction, WindWindow, DLTributaryWindow, GlobalInputsWindow,
} from "./planParts.jsx";

// ── APP DISPLAY VERSION (user-facing build number shown in the top bar) ──────
// Bump APP_BUILD by 1 on every app update. Rendered as major.minor with a 2-digit minor that
// rolls over at 99 → next major: 100→"1.00", 101→"1.01", … 199→"1.99", 200→"2.00". Integer math
// (no float formatting), so the rollover is correct by construction.
// NOTE — this is ONE OF THREE independent counters; keep them distinct:
//   • APP_VERSION (here)      — human-facing build number in the UI ("Version 1.00").
//   • CURRENT_VERSION (~below)— save-file SCHEMA version; drives .wps migrations. Do NOT couple.
//   • handoff "rev" number    — the dev changelog in PLAN_SKETCHER_SUITE_HANDOFF.md.
const APP_BUILD = 158;                                                                 // +1 per release
const APP_VERSION = `${Math.floor(APP_BUILD / 100)}.${String(APP_BUILD % 100).padStart(2, "0")}`;  // "1.00"
// ── App-level design system (rev 9): Plex type, grid-paper signature, focus rings, micro-interactions ──

// ── PROJECT-FILE DEFAULTS + VERSIONING ──────────────────────────────────────
// These are the single source of truth for the shapes the loader REPLACES wholesale
// (calc.g, design.d, calc.segments). Both the useState inits below and loadProject() below
// consume them, so any field ADDED here in the future auto-fills its default on an OLD file
// (the dominant forward-compat risk: a wholesale setG/setD/setSegments leaving a new field
// `undefined`). Keep these byte-faithful to the prior inline inits — a value change here is a
// behavior change for current files. NOTE: `g.grade` defaults to "str1" (Structural I) — rev 65, by
// request. It now rides in DEFAULT_G, so new sessions default to Structural I AND a toggled grade
// round-trips through save/load via the {...DEFAULT_G, ...calc.g} merge. An OLD file with no stored
// grade reopens as "str1" (no live .wps files predate this; the engine still reads a falsy grade as
// "rated"). To revert the default, set grade:"rated" here.
const DEFAULT_G   = { code:4, species:1, line:"1", vSeismic:5, sds:1, R:6.5, wWind:26000, roofDL:20, floorDL:0, wallDL:15, Cs:0.05, grade:"str1" };
const DEFAULT_D   = { thickness:5.5, anchor:"Concrete", roofTrib:2, floorTrib:0, hdDist:5,
                      minSegLen:4, maxSegLen:12, maxSegments:4, maxType:3, snap:0.5,
                      objective:"length", ftgWidth:1.33, ftgThick:12, height:15, lineLength:40 };
const SEG_DEFAULTS= { length:0, height:15, roofTrib:10, floorTrib:0, hdDist:5, thickness:5.5, anchor:"Concrete", selType:1, ftgWidth:1.33, ftgThick:12 };
// Design-tab collections (rev 24). A design LINE is { id, key, windAxis, o, a, b, lengthFt, heightFt,
// forceLbs }. Only the SCALAR fields are defaultable — the GEOMETRY (id/key/windAxis/o/a/b) cannot be
// invented, so it is NOT in DEFAULT_LINE; a line missing geometry is filtered + flagged stale in
// loadProject (it's regenerable from the saved plan). A PLACED shear-wall segment is { start, length,
// ov? } — ov rides along in the spread and is already (s.ov||{})-tolerant downstream.
const DEFAULT_LINE   = { lengthFt:0, heightFt:13, forceLbs:0, forceLbsSeismic:0 };
const DEFAULT_PLACED = { start:0, length:0 };

// Save-file schema version. WRITTEN by onSave and now READ by the loader (it used to be
// decorative). Bump this on every schema change and add the matching MIGRATIONS step.
const CURRENT_VERSION = 3;
// Step migrations: MIGRATIONS[k] takes a project AT version k and returns it AT version k+1.
// 1→2 is purely ADDITIVE — v2 only adds optional ui/camera/selection fields the loader already
// feature-detects — so there is no data transform, we only stamp the version. This ladder exists
// so the NEXT (possibly breaking) change has a home. Merge-on-defaults below handles ADDED fields
// automatically; RENAMES and UNIT/SEMANTICS changes do NOT — they need an explicit step here, e.g.:
//
//   2: (p) => ({                                 // hypothetical v2 → v3
//     ...p,
//     design: { ...p.design, lines: (p.design?.lines||[]).map(l => ({
//       ...l,
//       forceN:  l.forceLbs * 4.4482216,         // UNIT change: lbs → newtons (same datum, new meaning)
//       // forceLbs intentionally dropped after the rename
//     })) },
//     version: 3,
//   }),
//
// Whenever you add a step: bump CURRENT_VERSION, FREEZE a fixture at the OLD version, and add a
// test asserting that old fixture loads to the NEW correct value (the only thing that catches a
// botched unit conversion — see the migration checklist in the handoff §4x / §7).
const MIGRATIONS = {
  1: (p) => ({ ...p, version:2 }),
  // 2→3 (rev 61): UNIT/SEMANTICS change. The engine dropped the /R from E_seis, so g.vSeismic
  // now means the post-R (ASCE 7 reduced) seismic base shear in lbs — it used to be stored as
  // "lbs·R" (un-reduced). Convert by dividing the OLD value by the stored R (DEFAULT_G.R when the
  // file predates an R field). g.R itself is preserved (now reference-only). This runs BEFORE
  // merge-onto-defaults, so guard for a missing calc/g.
  2: (p) => {
    const g = p && p.calc && p.calc.g;
    if (g && Number.isFinite(g.vSeismic)) {
      const R = Number.isFinite(g.R) && g.R !== 0 ? g.R : DEFAULT_G.R;
      return { ...p, calc: { ...p.calc, g: { ...g, vSeismic: g.vSeismic / R } }, version:3 };
    }
    return { ...p, version:3 };
  },
};
// Walk a loaded project up to `target` one step at a time. `migrations`/`target` are injectable so a
// test can prove the MECHANISM (ordering + value transforms) with a synthetic ladder even while the
// real MIGRATIONS[1] is a no-op stamp. Returns the migrated project + `newer` (file from a future build).
function migrateProject(raw, migrations = MIGRATIONS, target = CURRENT_VERSION){
  const p = raw || {};
  let v = (typeof p.version === "number") ? p.version : 1;   // pre-version / junk → treat as v1
  const newer = v > target;
  let out = p;
  while(v < target && migrations[v]){ out = migrations[v](out); v = out.version; }
  return { project: out, newer };
}
// Pure load normalizer: migrate, then merge every wholesale-replaced object onto its DEFAULT_*
// so missing fields fill in. PRESERVES the loader's exact present-checks (g/segments/d are only
// applied when present in the file; tab/hlSel/selLine keep their prior fallbacks) so current v1
// AND v2 files resolve to byte-identical state. Returns ready-to-dispatch slices + the migrated
// project (for the same `if(project.design)`/`if(project.calc)` guards the handler always used).
function loadProject(raw){
  const { project, newer } = migrateProject(raw);
  const calc   = project.calc   || {};
  const design = project.design || {};
  const ui     = project.ui     || {};
  // design lines: merge scalar/future fields onto DEFAULT_LINE, but NEVER invent geometry. A line
  // missing a/b can't be rendered or designed, so it is EXCLUDED and the design is flagged STALE —
  // the saved plan is intact, so a rebuild regenerates every line (the "flag + prompt re-run" choice,
  // not a silent drop). placed segments merge onto DEFAULT_PLACED; ALL segsByLine keys are kept (even
  // for a filtered line) so a rebuild can restore that line's layout by id.
  // Back-compat: old files stored a single `design.lines` array (1-story); newer files store
  // `design.linesByFloor` ({1:[...],2:[...]}). Normalize either into linesByFloor.
  const hasGeom  = (l) => !!(l && l.id != null && Number.isFinite(l.lengthFt) && l.lengthFt > 0 &&
                             l.a && Number.isFinite(l.a.x) && Number.isFinite(l.a.y) &&
                             l.b && Number.isFinite(l.b.x) && Number.isFinite(l.b.y));
  const rawByFloor = (design.linesByFloor && typeof design.linesByFloor === "object")
    ? design.linesByFloor
    : { 1: (Array.isArray(design.lines) ? design.lines : []) };   // legacy single-array → floor 1
  const linesByFloor = {};
  let stale = false;
  for(const fk in rawByFloor){
    const merged = (Array.isArray(rawByFloor[fk]) ? rawByFloor[fk] : []).map(l => ({ ...DEFAULT_LINE, ...l }));
    const valid  = merged.filter(hasGeom);
    if(valid.length < merged.length) stale = true;                 // some saved line lacked geometry
    linesByFloor[fk] = valid;
  }
  if(!linesByFloor[1]) linesByFloor[1] = [];                       // always have a floor-1 slot
  const sblIn    = design.segsByLine || {};
  const segsByLine = {};
  for(const k in sblIn) segsByLine[k] = (Array.isArray(sblIn[k]) ? sblIn[k] : []).map(s => ({ ...DEFAULT_PLACED, ...s }));
  // calc sub-tabs (rev 132): prefer the tab model; fall back to a legacy single `calc.segments` wrapped
  // into one tab; else null (handler keeps the running state). Each tab's segments are merged onto
  // SEG_DEFAULTS and padded to 6 columns (the sheet's fixed width). wWind defaults to the saved g.wWind.
  const seg6 = (arr) => Array.from({ length:6 }, (_, i) => ({ ...SEG_DEFAULTS, ...((Array.isArray(arr) ? arr : [])[i] || {}) }));
  const gW = (calc.g && Number.isFinite(calc.g.wWind)) ? calc.g.wWind : DEFAULT_G.wWind;
  let calcTabs = null, activeCalcId = null;
  if (Array.isArray(calc.tabs) && calc.tabs.length) {
    calcTabs = calc.tabs.map((t, i) => ({
      id:      (t && t.id) || ("calc-" + (i + 1)),
      name:    (t && typeof t.name === "string" && t.name) || ("Wall " + (i + 1)),
      lineId:  (t && t.lineId != null) ? t.lineId : null,
      marks:   (t && Array.isArray(t.marks)) ? t.marks : null,
      segments: seg6(t && t.segments),
      wWind:   (t && Number.isFinite(t.wWind)) ? t.wWind : gW,
    }));
    activeCalcId = calcTabs.find((t) => t.id === calc.activeCalcId) ? calc.activeCalcId : calcTabs[0].id;
  } else if (Array.isArray(calc.segments)) {
    calcTabs = [{ id:"calc-1", name:"Wall 1", lineId:null, marks:null, segments: seg6(calc.segments), wWind: gW }];
    activeCalcId = "calc-1";
  }
  return {
    newer, project,
    calc: {
      g:        calc.g        ? { ...DEFAULT_G, ...calc.g }                    : undefined,
      segments: calc.segments ? calc.segments.map(s => ({ ...SEG_DEFAULTS, ...s })) : undefined,
      tabs: calcTabs, activeCalcId,
    },
    design: {
      linesByFloor, stale, segsByLine,
      shape:      design.shape || null,
      d:          design.d ? { ...DEFAULT_D, ...design.d } : undefined,
      selLine:    design.selLine !== undefined ? design.selLine : null,
    },
    ui: { tab: ui.tab || "plan", hlSel: ("hlSel" in ui) ? ui.hlSel : null,
          twoStory: ("twoStory" in ui) ? !!ui.twoStory : false,   // old files lack it → single story
          activeFloor: ui.activeFloor === 2 ? 2 : 1 },
  };
}

export default function App() {
  const [tab, setTab] = useState("plan");
  const [g, setG] = useState(DEFAULT_G);
  const [wTotal, setWtotal] = useState(null);   // (rev 58) 1-story seismic W_total lifted from PlanSketcher; null in 2-Story (pending)
  const setGl = (key, val) => setG((p) => ({ ...p, [key]: val }));

  const mkSeg = (length, roofTrib) => ({ ...SEG_DEFAULTS, length, roofTrib });
  // ── CALCULATION-SHEET SUB-TABS (rev 132) ──
  // The Calculation Sheet is now a Chrome-style tabbed surface: each sub-tab is one shear-wall LINE
  // (its own 6-segment layout + its own wind force `wWind`). A tab carries:
  //   { id, name, lineId, marks, segments, wWind }
  // `lineId` ties an auto sub-tab to the Design line it came from (re-pushing that line UPDATES the
  // same tab instead of duplicating). `lineId:null` = a MANUAL tab added with the "+" button, run
  // independently of the Design tab's Optimize. `marks` mirrors the Design tab's wall marks so the
  // per-segment "SW-A / SW-B" labels match across tabs. Building-wide config (code/species/grade/
  // seismic/dead loads) stays in the shared `g`; only `wWind` is per-tab (each wall a different force).
  const mkCalcSegs = () => [ mkSeg(5,2), mkSeg(5,2), mkSeg(0,10), mkSeg(0,10), mkSeg(0,10), mkSeg(0,10) ];
  const calcSeq = useRef(2);                                  // next manual id counter ("calc-2", …)
  const newCalcId = () => "calc-" + (calcSeq.current++);
  const [calcTabs, setCalcTabs] = useState(() => [
    { id:"calc-1", name:"Wall-1 (default)", lineId:null, marks:null, segments:mkCalcSegs(), wWind:DEFAULT_G.wWind },
  ]);
  const [activeCalcId, setActiveCalcId] = useState("calc-1");
  const activeCalc = calcTabs.find((t) => t.id === activeCalcId) || calcTabs[0] || null;
  const segments = activeCalc ? activeCalc.segments : mkCalcSegs();
  const calcMarks = activeCalc ? activeCalc.marks : null;
  // effective globals for the ACTIVE tab = shared g with this tab's own wind force spliced in
  const gEff = useMemo(() => (activeCalc ? { ...g, wWind: activeCalc.wWind } : g), [g, activeCalc]);
  // CalcSheet edits a segment in the ACTIVE tab; supports both function- and value-style updates.
  const setSegments = (updater) => setCalcTabs((prev) => prev.map((t) => t.id === activeCalcId
    ? { ...t, segments: typeof updater === "function" ? updater(t.segments) : updater } : t));
  // CalcSheet's globals editor: `wWind` is per-tab, everything else is the shared building config.
  const setGlCalc = (key, val) => {
    if (key === "wWind") setCalcTabs((prev) => prev.map((t) => t.id === activeCalcId ? { ...t, wWind: val } : t));
    else setGl(key, val);
  };
  const totalL = segments.reduce((a, s) => a + s.length, 0);
  const results = useMemo(() => segments.map((s) => calcSegment(s, gEff, totalL)), [segments, gEff, totalL]);
  // light calc sheet consumes util-augmented results (engine untouched)
  const resultsU = useMemo(() => results.map((r, i) => withUtil(r, segments[i], g.grade)), [results, segments, g.grade]);
  const actU = resultsU.filter((r) => r.active);
  const calcOK = actU.length > 0 && actU.every((r) => r.pass);
  // Per-tab pass/fail for the sub-tab dots: run the (untouched) engine once per tab with that tab's
  // own wind force. Tabs are few, so this is cheap. "none" = no active wall on that tab yet.
  const calcTabStatus = useMemo(() => {
    const m = {};
    calcTabs.forEach((t) => {
      const tl = t.segments.reduce((a, s) => a + s.length, 0);
      const ge = { ...g, wWind: t.wWind };
      const rs = t.segments.map((s) => withUtil(calcSegment(s, ge, tl), s, g.grade)).filter((r) => r.active);
      m[t.id] = rs.length ? (rs.every((r) => r.pass) ? "ok" : "fail") : "none";
    });
    return m;
  }, [calcTabs, g]);
  const [hlSel, setHlSel] = useState(null); // column highlight (calc sheet)
  // Switch the visible sub-tab (clears the cross-table column highlight, which is per-tab).
  const selectCalcTab = (id) => { setActiveCalcId(id); setHlSel(null); };
  // "+" button — a fresh manual calc, independent of the Design tab's Optimize.
  const addCalcTab = () => {
    const id = newCalcId();
    const n = calcTabs.filter((t) => !t.lineId).length + 1;
    setCalcTabs((prev) => [...prev, { id, name:`Custom ${n}`, lineId:null, marks:null, segments:mkCalcSegs(), wWind:DEFAULT_G.wWind }]);
    selectCalcTab(id);
    setTab("calc");
  };
  // Close a sub-tab; if it was active, fall to a neighbour. The bar always keeps ≥1 tab.
  const closeCalcTab = (id) => setCalcTabs((prev) => {
    if (prev.length <= 1) return prev;                        // never empty the bar
    const idx = prev.findIndex((t) => t.id === id);
    const next = prev.filter((t) => t.id !== id);
    if (id === activeCalcId) selectCalcTab((next[idx] || next[idx - 1] || next[0]).id);
    return next;
  });
  // Inline rename of a MANUAL tab (auto tabs mirror their Design line and are renamed on re-send).
  // Double-click → the tab title becomes an editable input (no pop-up); Enter/blur commits, Esc cancels.
  const [editingCalcId, setEditingCalcId] = useState(null);
  const [editName, setEditName] = useState("");
  const startRenameCalc = (id) => {
    const t = calcTabs.find((x) => x.id === id); if (!t || t.lineId) return;   // manual tabs only
    setEditName(t.name); setEditingCalcId(id);
  };
  const commitRenameCalc = () => {
    const nm = editName.trim();
    if (editingCalcId != null && nm) setCalcTabs((prev) => prev.map((x) => x.id === editingCalcId ? { ...x, name:nm } : x));
    setEditingCalcId(null);
  };
  const cancelRenameCalc = () => setEditingCalcId(null);
  // ── TWO-STORY MODE (Step 1: UI scaffold only — no second plan, no calc change yet) ──
  const [twoStory, setTwoStory]     = useState(false);   // false = single story (today's behavior, untouched)
  const [activeFloor, setActiveFloor] = useState(1);     // sketcher view: 1 = 1st floor, 2 = 2nd floor

  // Design state (fed from the sketcher). Two-story keeps BOTH floors' designs keyed by floor;
  // `designLines` is the active floor's lines (derived), so the Design tab + everything downstream is unchanged.
  const [designLinesByFloor, setDesignLinesByFloor] = useState({});  // { 1:[...], 2:[...] }  (1-story → { 1:[...] })
  const designLines = useMemo(()=> designLinesByFloor[activeFloor] || designLinesByFloor[1] || designLinesByFloor[2] || [],
                              [designLinesByFloor, activeFloor]);
  const [designShape, setDesignShape] = useState(null);
  const [segsByLine, setSegsByLine] = useState({});
  const [d, setD] = useState(DEFAULT_D);
  const setDk = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const [selLine, setSelLine] = useState(null);   // selected design line — lifted from DesignTab so save/load restores it
  const [designStale, setDesignStale] = useState(false);  // rev 24: a loaded file had geometry-less lines → prompt rebuild. Derived on load, NOT serialized (a re-save heals to the valid subset).
  // rev 130: what was last pushed to the Calculation Sheet — { lineId, sig }. Drives the red
  // "stale" look on the Design tab's "Send line to calculation sheet" button when the currently
  // selected line is the one in the sheet AND its pushable data has since changed. Live-session
  // only (NOT serialized): reset on New/Open so a loaded file is treated as in sync.
  const [calcPush, setCalcPush] = useState(null);
  // rev 130b: signature of the inputs the Design-tab ⚡ Optimize design optimizer last ran on. The
  // Optimize button (which produces the tab's design output) goes red when an input has changed since.
  // Lives in App (not DesignTab) so it survives the Design tab unmounting on a tab switch. Live-session
  // only; reset on New/Open. A Plan→Design re-push brings new lines → the signature diverges → red.
  const [optimizePush, setOptimizePush] = useState(null);

  const onDesignShearWalls = (byFloor, shape) => {
    setDesignLinesByFloor(byFloor);
    setDesignShape(shape);
    const allIds = new Set();
    Object.values(byFloor).forEach(arr => (arr||[]).forEach(ln => allIds.add(ln.id)));
    setSegsByLine(prev => {
      const next = {};
      allIds.forEach(id => { next[id] = prev[id] || []; });   // keep layouts for unchanged lines (shared across floors)
      return next;
    });
    const act = byFloor[activeFloor] || byFloor[1] || byFloor[2] || [];
    setSelLine(prev => act.find(l=>l.id===prev) ? prev : (act[0] ? act[0].id : null));
    setDesignStale(false);                          // a fresh handoff always yields geometry-complete lines
    setTab("design");
  };
  // ── PROJECT FILES (.wps = JSON: sketcher + design + calc, versioned) ──
  const projectRef = useRef(null);                       // sketcher get/set, registered below
  const fileInputRef = useRef(null);
  const registerProject = useCallback((api)=>{ projectRef.current=api; },[]);
  const [projectName, setProjectName] = useState("Untitled");   // (rev 70) editable name → save filename, round-trips in .wps
  const [lastSaved, setLastSaved] = useState(null);             // (rev 70) ms timestamp of last save (or the loaded file's savedAt)
  const onSave = useCallback(()=>{
    const sk = projectRef.current ? projectRef.current.get() : null;
    const now = new Date();
    const proj = { app:"plan-sketcher-suite", version:CURRENT_VERSION, savedAt:now.toISOString(), name:projectName,
                   sketcher:sk, design:{ linesByFloor:designLinesByFloor, shape:designShape, segsByLine, d, selLine },
                   // calc.tabs is the rev-132 sub-tab model; calc.segments is kept (= active tab) so a
                   // pre-132 build can still open the file and show at least the active wall.
                   calc:{ g, segments, tabs:calcTabs, activeCalcId }, ui:{ tab, hlSel, twoStory, activeFloor } };
    const blob = new Blob([JSON.stringify(proj,null,1)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const fname = (projectName||"").trim().replace(/[^\w.\- ]+/g,"_").replace(/\s+/g,"-") || "plan-project";
    a.download = fname.toLowerCase().endsWith(".wps") ? fname : fname + ".wps";
    a.click();
    URL.revokeObjectURL(a.href);
    setLastSaved(now.getTime());                                // (rev 70) update the "Saved …" status
  },[designLinesByFloor, designShape, segsByLine, d, g, segments, calcTabs, activeCalcId, tab, hlSel, selLine, twoStory, activeFloor, projectName]);
  const onOpen = useCallback(()=>{ fileInputRef.current && fileInputRef.current.click(); },[]);
  const onFileChosen = useCallback((e)=>{
    const f = e.target.files && e.target.files[0];
    e.target.value = "";                                  // allow re-opening the same file
    if(!f) return;
    const rd = new FileReader();
    rd.onload = ()=>{
      try{
        const raw = JSON.parse(rd.result);
        if(raw.app!=="plan-sketcher-suite") throw new Error("not a plan-sketcher-suite project");
        const L = loadProject(raw);                       // version ladder + merge-onto-defaults
        if(L.newer) window.alert("This project was saved by a newer version of the app — some data may not load correctly.");
        const p = L.project;                              // migrated project (version stamped up)
        if(p.sketcher && projectRef.current) projectRef.current.set(p.sketcher);
        if(p.design){ setDesignLinesByFloor(L.design.linesByFloor); setDesignShape(L.design.shape);
                      setSegsByLine(L.design.segsByLine); if(L.design.d) setD(L.design.d);
                      setSelLine(L.design.selLine); }
        if(p.calc){ if(L.calc.g) setG(L.calc.g);
                    if(L.calc.tabs){                       // rev 132: restore the sub-tab set
                      setCalcTabs(L.calc.tabs);
                      setActiveCalcId(L.calc.activeCalcId);
                      // reseed the id counter past any loaded "calc-N" so new tabs can't collide
                      let mx = 1; L.calc.tabs.forEach(t => { const m = /calc-(\d+)/.exec(t.id||""); if(m) mx = Math.max(mx, +m[1]); });
                      calcSeq.current = mx + 1;
                      setHlSel(null);
                    } else if(L.calc.segments) setSegments(L.calc.segments); }
        setDesignStale(L.design.stale);                   // rev 24: flag if any saved line lacked geometry
        setCalcPush(null);                                // rev 130: a loaded file's calc sheet is in sync; re-arms on the next send
        setOptimizePush(null);                            // rev 130b: a loaded file's design is in sync; re-arms on the next Optimize
        // v2 drops you back where you left; v1 files (no ui slice) open on the Plan tab as before
        setHlSel(L.ui.hlSel);
        setTwoStory(L.ui.twoStory);
        setActiveFloor(L.ui.activeFloor);
        setTab(L.ui.tab);
        setProjectName(typeof raw.name==="string" && raw.name.trim() ? raw.name : "Untitled");   // (rev 70)
        setLastSaved(raw.savedAt ? (Date.parse(raw.savedAt)||null) : null);                       // (rev 70) show the file's own save time
      }catch(err){ window.alert("Could not open project: "+err.message); }
    };
    rd.readAsText(f);
  },[]);
  const onNew = useCallback(()=>{
    if(!window.confirm("Start a new project? Unsaved work will be lost.")) return;
    if(projectRef.current) projectRef.current.set({ graph:{nodes:[],edges:[]}, wallProps:{},
      noSupport:[], sections:{h:null,v:null}, nextId:0 });
    setDesignLinesByFloor({}); setDesignShape(null); setSegsByLine({}); setDesignStale(false);
    setCalcPush(null);                              // rev 130: clear stale-calc memory on New
    setOptimizePush(null);                          // rev 130b: clear stale-optimize memory on New
    setTwoStory(false); setActiveFloor(1);
    setProjectName("Untitled"); setLastSaved(null);   // (rev 70) fresh project → fresh name + no save time
  },[]);
  // rev 24: the Design-tab stale banner rebuilds geometry-less lines from the restored plan. If the
  // saved plan still has a wind reaction, regenerate straight from it (rerun → onDesignShearWalls,
  // which clears stale); otherwise send the user to the Plan to place a cut.
  const onRebuildDesign = useCallback(()=>{
    const api = projectRef.current;
    if(api && api.hasReactions && api.rerun){ api.rerun(); }
    else { setTab("plan"); window.alert("This plan has no wind reaction yet. On the Plan, drag a wind section across the building and mark the point-load walls, then press “Design shear walls”."); }
  },[]);
  const fileOps = useMemo(()=>({onSave,onOpen,onNew}),[onSave,onOpen,onNew]);

  const ovSet = (lineId, idx, key, val) =>
    setSegsByLine(prev => ({ ...prev, [lineId]: prev[lineId].map((s,j)=> j!==idx ? s :
      key===null ? { start:s.start, length:s.length } : { ...s, ov:{ ...(s.ov||{}), [key]:val||undefined } }) }));

  // Design → calc sheet: this line's segments + force become a SUB-TAB. Pushing a line the sheet
  // already has (matched by `line.id`) UPDATES that tab in place (current optimized design + force +
  // name + marks); a new line opens a new tab. `name`/`marks` come from the Design tab so the sub-tab
  // title and the per-segment SW-marks read identically across both tabs. (rev 132)
  const applyToCalc = (line, segs, res, dC, name, marks) => {
    const next = Array.from({ length: 6 }, (_, i) => ({
      length: segs[i] ? segs[i].length : 0,
      // (rev 49) send THIS line's per-wall/per-floor DL trib to the calc sheet (was the global dC.*);
      // every sent segment seeds with it, still editable per-segment on the sheet afterward.
      height: line.heightFt, roofTrib: line.roofTrib ?? dC.roofTrib, floorTrib: line.floorTrib ?? dC.floorTrib,
      hdDist: dC.hdDist, thickness: dC.thickness, anchor: dC.anchor,
      selType: res[i] && isNum(res[i].selType) ? Math.min(res[i].selType, 6) : 1,
      ftgWidth: dC.ftgWidth, ftgThick: dC.ftgThick,
    }));
    const wWind = Math.round(line.forceLbs);
    const tabName = name || `${line.windAxis === "h" ? "E–W" : "N–S"} · ${fmt(line.forceLbs/1000,2)}k · ${fmt(line.lengthFt,0)}′`;
    const marksArr = Array.isArray(marks) ? marks : null;
    const existing = calcTabs.find((t) => t.lineId === line.id);
    if (existing) {
      setCalcTabs((prev) => prev.map((t) => t.id === existing.id
        ? { ...t, name:tabName, marks:marksArr, segments:next, wWind } : t));
      selectCalcTab(existing.id);
    } else {
      const id = newCalcId();
      setCalcTabs((prev) => [...prev, { id, name:tabName, lineId:line.id, marks:marksArr, segments:next, wWind }]);
      selectCalcTab(id);
    }
    setCalcPush({ lineId: line.id, sig: calcPushSig(line, segs, res, dC) });   // rev 130: remember what this push produced
    setTab("calc");
  };

  // Pinned-ribbon support: measure the sticky tab bar's height into a CSS var so the
  // sketcher ribbon can stick exactly below it (fallback 42px in the .ribbon rule).
  const tabBarRef = useRef(null);
  useEffect(() => {
    const setH = () => {
      if (tabBarRef.current)
        document.documentElement.style.setProperty("--tabbar-h", tabBarRef.current.offsetHeight + "px");
    };
    setH();
    window.addEventListener("resize", setH);
    return () => window.removeEventListener("resize", setH);
  }, []);

  const SHEET_NO = { plan:"S-1", design:"S-2", calc:"S-3" };
  const tabBtn = (id, label, dot) => (
    <button onClick={() => setTab(id)} className="ttab"
      style={{ display:"flex", alignItems:"center", gap:7,
               padding:"8px 22px 10px", fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
               border:"none", borderBottom: tab===id ? `3px solid ${SW.accent}` : "3px solid transparent",
               background: tab===id ? SW.accentSoft : "transparent",
               color: tab===id ? SW.accent : SW.faint, cursor:"pointer" }}>
      <span><span className="teye">{SHEET_NO[id]}</span>{label}</span>
      {dot !== undefined && (
        <span style={{ width:8, height:8, borderRadius:99, background: dot ? SW.green : SW.red, display:"inline-block" }}
              title={dot ? "All walls pass" : "Walls failing"} />
      )}
    </button>
  );

  // ── DARK SHEET — Design tab only (styling unchanged) ──
  const designSheet = (
    <div className="paper-desk sw-root" style={{ minHeight:"calc(100vh - 46px)", color:SW.ink, fontFamily:"'IBM Plex Sans','Helvetica Neue',Arial,sans-serif", padding:"20px 14px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", background:SW.sheet, border:`1.5px solid ${SW.ink}`, boxShadow:"0 1px 1px rgba(28,39,51,.04), 0 10px 24px -14px rgba(28,39,51,.30), 4px 4px 0 rgba(28,39,51,.10)" }}>
        {/* title block */}
        <div style={{ display:"flex", flexWrap:"wrap", borderBottom:`1.5px solid ${SW.ink}` }}>
          <div style={{ flex:"2 1 320px", padding:"16px 20px", borderRight:`1px solid ${SW.rule}` }}>
            <div style={{ fontSize:10, letterSpacing:"0.2em", color:SW.faint, textTransform:"uppercase" }}>Structural Calculation</div>
            <h1 style={{ margin:"4px 0 2px", fontSize:22, fontWeight:800, letterSpacing:"0.01em", color:SW.ink }}>
              Plywood Shear Walls{g.grade === "str1" ? " (Structural I)" : ""} <span style={{ fontWeight:400, color:SW.faint }}>w/ Wood Studs</span>
            </h1>
            <div style={{ fontSize:11, fontFamily:MONO, color:SW.accent }}>{CODES[g.code]} · Basic Load Combinations</div>
          </div>
          <div style={{ flex:"1 1 160px", padding:"16px 20px", borderRight:`1px solid ${SW.rule}` }}>
            <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:SW.faint, display:"block", marginBottom:4 }}>Building code</label>
            <select value={g.code} onChange={(e)=>setGl("code",+e.target.value)} style={{ ...selStyle, width:"100%" }}>
              <option value={1}>2006 IBC</option><option value={2}>2009 IBC</option>
              <option value={3}>2012 IBC</option><option value={4}>2015 IBC</option>
            </select>
            <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:SW.faint, display:"block", margin:"10px 0 4px" }}>Wood framing</label>
            <select value={g.species} onChange={(e)=>setGl("species",+e.target.value)} style={{ ...selStyle, width:"100%" }}>
              <option value={1}>Southern Pine</option><option value={2}>Douglas-Fir</option>
            </select>
          </div>
          <div style={{ flex:"0 1 120px", padding:"16px 20px" }}>
            <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:SW.faint, display:"block", marginBottom:4 }}>Shear line</label>
            <input value={g.line} onChange={(e)=>setGl("line",e.target.value)}
              style={{ width:60, padding:"4px 8px", border:`1px solid ${SW.rule}`, borderRadius:4, fontFamily:MONO, fontSize:18,
                       fontWeight:700, textAlign:"center", color:SW.accent, background:SW.input, outline:"none" }} />
          </div>
        </div>
        <div style={{ padding:"8px 20px 28px" }}>
          <DesignTab g={g} shape={designShape} lines={designLines} linesByFloor={designLinesByFloor}
                     wTotal={wTotal}
                     segsByLine={segsByLine} setSegsByLine={setSegsByLine} ovSet={ovSet}
                     d={d} setDk={setDk} applyToCalc={applyToCalc} setGl={setGl}
                     selLine={selLine} setSelLine={setSelLine}
                     twoStory={twoStory} activeFloor={activeFloor} setActiveFloor={setActiveFloor}
                     stale={designStale} onRebuild={onRebuildDesign} calcPush={calcPush}
                     optimizePush={optimizePush} setOptimizePush={setOptimizePush}/>
          <div style={{ marginTop:24, fontSize:10, color:SW.faint, lineHeight:1.6, borderTop:`1px solid ${SW.rule}`, paddingTop:10 }}>
            Faithful port of the source spreadsheet, including its exact formulas and thresholds (e.g. the wind end-post compression denominator and uplift &lt; 625 lbs → "neglect"). The Design tab optimizer verifies every candidate through this same engine. Allowable values per the embedded schedule; holdowns/anchors per Simpson HDU / SSTB / STHD / MST capacities tabulated in the workbook. END OF CALC.
          </div>
        </div>
      </div>
    </div>
  );

  // ── LIGHT SHEET — Calculation Sheet, 1:1 with the standalone calculator ──
  // rev 132 — Chrome-style sub-tab bar for the Calculation Sheet. One tab per shear-wall line (or
  // manual calc). rev 54: pinned via sticky INSIDE the tall page wrapper (which also holds the sheet),
  // so it stays visible the whole way down the page — mirroring the Plan Sketcher ribbon.
  const calcTabBar = (
    <div className="no-print" style={{ position:"sticky", top:"var(--tabbar-h,42px)", zIndex:35,
                  display:"flex", alignItems:"flex-end", gap:4, padding:"6px 2px 0",
                  background:LT.paper, borderBottom:`1px solid ${LT.rule}`, overflowX:"auto" }}>
        {calcTabs.map((t) => {
          const active = t.id === activeCalcId;
          const editing = editingCalcId === t.id;
          const st = calcTabStatus[t.id];
          const dot = st === "ok" ? LT.green : st === "fail" ? LT.red : LT.faint;
          return (
            <div key={t.id} className={"calctab" + (active ? " is-active" : "")}
              onClick={() => !editing && selectCalcTab(t.id)} onDoubleClick={() => startRenameCalc(t.id)}
              title={editing ? "" : (t.lineId ? "Sent from the Design tab — re-send that line to update this tab" : "Custom calc — double-click to rename")}
              style={{ display:"flex", alignItems:"center", gap:7, cursor: editing ? "text" : "pointer", flex:"0 0 auto",
                       padding:"7px 8px 8px 12px", maxWidth:260, marginBottom:-1,
                       border:`1px solid ${LT.rule}`, borderBottom:`1px solid ${active ? LT.sheet : LT.rule}`,
                       borderTopLeftRadius:9, borderTopRightRadius:9,
                       background: active ? LT.sheet : LT.zebra, color: active ? LT.ink : LT.faint,
                       fontFamily:MONO, fontSize:11.5, fontWeight: active ? 700 : 500, whiteSpace:"nowrap",
                       boxShadow: active ? `inset 0 2px 0 ${LT.blue}` : "none" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:dot, flex:"0 0 auto" }}
                    title={st === "ok" ? "All walls pass" : st === "fail" ? "Has a failing wall" : "No wall sized yet"} />
              {editing ? (
                <input autoFocus value={editName}
                  onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRenameCalc}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRenameCalc(); else if (e.key === "Escape") cancelRenameCalc(); }}
                  style={{ width:Math.max(80, Math.min(220, editName.length*7+24)), fontFamily:MONO, fontSize:11.5,
                           fontWeight:700, color:LT.ink, border:`1px solid ${LT.blue}`, borderRadius:4,
                           padding:"1px 4px", outline:"none", background:"#FFF" }} />
              ) : (
                <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{t.name}</span>
              )}
              {calcTabs.length > 1 && !editing && (
                <button className="calctab-x" onClick={(e) => { e.stopPropagation(); closeCalcTab(t.id); }}
                  title="Close this calc" aria-label="Close tab"
                  style={{ border:"none", background:"none", cursor:"pointer", color:LT.faint, fontSize:15,
                           lineHeight:1, padding:"0 3px", borderRadius:4, flex:"0 0 auto" }}>×</button>
              )}
            </div>
          );
        })}
        <button className="calc-add" onClick={addCalcTab} aria-label="Add calculation tab"
          title="New blank calculation (run a wall independently of the Design tab)"
          style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:"0 0 auto",
                   width:30, height:30, marginBottom:4, marginLeft:2, border:"none", borderRadius:7,
                   background:"transparent", color:LT.blue, fontSize:21, lineHeight:1, cursor:"pointer" }}>+</button>
    </div>
  );

  const calcSheetPage = (
    <div className="paper-desk lt-root" style={{ minHeight:"calc(100vh - 46px)", color:LT.ink, fontFamily:"'IBM Plex Sans','Helvetica Neue',Arial,sans-serif", padding:"10px 16px 24px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
      {calcTabBar}
      <div style={{ background:LT.sheet, border:`1.5px solid ${LT.ink}`, boxShadow:"0 1px 1px rgba(28,39,51,.04), 0 10px 24px -14px rgba(28,39,51,.30), 4px 4px 0 rgba(28,39,51,.10)" }}>
        {/* ===== TITLE BLOCK ===== */}
        <div style={{ display:"flex", flexWrap:"wrap", borderBottom:`1.5px solid ${LT.ink}` }}>
          <div style={{ flex:"2 1 320px", padding:"16px 20px", borderRight:`1px solid ${LT.rule}` }}>
            <div style={{ fontSize:10, letterSpacing:"0.2em", color:LT.faint, textTransform:"uppercase" }}>Structural Calculation</div>
            <h1 style={{ margin:"4px 0 2px", fontSize:22, fontWeight:800, letterSpacing:"0.01em", color:LT.ink }}>
              Plywood Shear Walls{g.grade === "str1" ? " (Structural I)" : ""} <span style={{ fontWeight:400, color:LT.faint }}>w/ Wood Studs</span>
            </h1>
            <div style={{ fontSize:11, fontFamily:MONO, color:LT.blue }}>{CODES[g.code]} · Basic Load Combinations</div>
          </div>
          <div style={{ flex:"1 1 160px", padding:"16px 20px", borderRight:`1px solid ${LT.rule}` }}>
            <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:LT.faint, display:"block", marginBottom:4 }}>Building code</label>
            <select value={g.code} onChange={(e)=>setGl("code",+e.target.value)} style={{ ...ltSel, width:"100%" }}>
              <option value={1}>2006 IBC</option><option value={2}>2009 IBC</option>
              <option value={3}>2012 IBC</option><option value={4}>2015 IBC</option>
            </select>
            <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:LT.faint, display:"block", margin:"10px 0 4px" }}>Wood framing</label>
            <select value={g.species} onChange={(e)=>setGl("species",+e.target.value)} style={{ ...ltSel, width:"100%" }}>
              <option value={1}>Southern Pine</option><option value={2}>Douglas-Fir</option>
            </select>
          </div>
          <div style={{ flex:"0 1 150px", padding:"16px 20px", display:"flex", flexDirection:"column", gap:8 }}>
            <div>
              <label style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:LT.faint, display:"block", marginBottom:4 }}>Shear line</label>
              <input value={g.line} onChange={(e)=>setGl("line",e.target.value)}
                style={{ width:60, padding:"4px 8px", border:`1px solid ${LT.rule}`, borderRadius:4, fontFamily:MONO, fontSize:18, fontWeight:700, textAlign:"center", color:LT.blue, background:"#FDFDFB", outline:"none" }} />
            </div>
            <button className="no-print" onClick={()=>window.print()}
              style={{ alignSelf:"flex-start", padding:"5px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.06em", border:`1.5px solid ${LT.blue}`, background:LT.blue, color:"#FFFFFF", cursor:"pointer", borderRadius:4 }}>
              ⎙ Print report
            </button>
          </div>
        </div>
        <div style={{ padding:"8px 20px 28px" }}>
          <HL.Provider value={{ sel: hlSel, setSel: setHlSel }}>
            <CalcSheet g={gEff} setGl={setGlCalc} segments={segments} setSegments={setSegments} results={resultsU} totalL={totalL} marks={calcMarks}/>
          </HL.Provider>
          <div style={{ marginTop:24, fontSize:10, color:LT.faint, lineHeight:1.6, borderTop:`1px solid ${LT.rule}`, paddingTop:10 }}>
            Faithful port of the source spreadsheet, including its exact formulas and thresholds (e.g. the wind end-post compression denominator and uplift &lt; 625 lbs → "neglect"). Hover a row label for its source-cell reference. The Design tab optimizer verifies every candidate through this same engine. Allowable values per the embedded schedule; holdowns/anchors per Simpson HDU / SSTB / STHD / MST capacities tabulated in the workbook. END OF CALC.
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  return (
    <div className="paper-desk" style={{ minHeight:"100vh" }}>
      <style>{LT_CSS}</style>
      {/* tab bar */}
      <style>{APP_CSS}</style>
      {/* persistent app-level header: file toolbar (rev 69) + suite tab bar, in ONE sticky wrapper so
          New/Open/Save are reachable from every tab and the Plan ribbon / Design constraints stick below
          the WHOLE header (tabBarRef now measures the wrapper, so --tabbar-h includes the file bar). */}
      <div ref={tabBarRef} className="no-print apphdr" style={{ position:"sticky", top:0, zIndex:40 }}>
        <div className="filebar">
          <div className="fblabel">Project</div>
          <input className="fbname" value={projectName} spellCheck={false}
                 onChange={e=>setProjectName(e.target.value)}
                 placeholder="Untitled" title="Project name — used as the saved file name"/>
          <button className="filebtn" title="New project" onClick={onNew}>🗋 New</button>
          <button className="filebtn" title="Open project (Ctrl+O)" onClick={onOpen}>📂 Open</button>
          <button className="filebtn" title="Save project (Ctrl+S)" onClick={onSave}>💾 Save</button>
          <div className="fbsep"/>
          <button className="filebtn" title="Undo (Ctrl+Z)" onClick={()=>projectRef.current&&projectRef.current.undo&&projectRef.current.undo()}>↶ Undo</button>
          <button className="filebtn" title="Redo (Ctrl+Y / Ctrl+Shift+Z)" onClick={()=>projectRef.current&&projectRef.current.redo&&projectRef.current.redo()}>↷ Redo</button>
          <div className="fbstatus" title={lastSaved!=null ? new Date(lastSaved).toLocaleString() : "This project has not been saved yet"}>
            {(()=>{ if(lastSaved==null) return "Not saved yet";
                    const d=new Date(lastSaved), now=new Date();
                    const t=d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
                    const sameDay = d.toDateString()===now.toDateString();
                    return "Saved "+(sameDay ? t : d.toLocaleDateString([], {month:"short", day:"numeric"})+", "+t); })()}
          </div>
        </div>
        <div className="tbar" style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${SW.rule}`, background:SW.sheet }}>
          <div className="tbrand" style={{ padding:"6px 16px" }}>
            <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.06em", color:SW.ink }}>
              PLAN<span style={{color:SW.accent}}>·</span>SKETCHER <span style={{color:SW.faint,fontWeight:400}}>+ Shear Walls</span>
            </div>
            <small>STRUCTURAL SUITE</small>
          </div>
          {tabBtn("plan","Plan Sketcher")}
          {tabBtn("design","Design")}
          {tabBtn("calc","Calculation Sheet", actU.length ? calcOK : undefined)}
          <div style={{ marginLeft:"auto", padding:"6px 16px", fontFamily:MONO, fontSize:11, fontWeight:700,
                        letterSpacing:"0.08em", color:SW.faint, whiteSpace:"nowrap" }}
               title="App version">
            Version {APP_VERSION}
          </div>
        </div>
      </div>
      {/* keep the sketcher mounted so the plan survives tab switches */}
      <input ref={fileInputRef} type="file" accept=".wps,.json" style={{display:"none"}} onChange={onFileChosen}/>
      <div style={{ display: tab==="plan" ? "block" : "none" }}>
        <PlanSketcher onDesignShearWalls={onDesignShearWalls} fileOps={fileOps} registerProject={registerProject}
                      twoStory={twoStory} setTwoStory={setTwoStory} activeFloor={activeFloor} setActiveFloor={setActiveFloor}
                      g={g} setGl={setGl} setWtotal={setWtotal}/>
      </div>
      {tab === "design" && designSheet}
      {tab === "calc" && calcSheetPage}
    </div>
  );
}
