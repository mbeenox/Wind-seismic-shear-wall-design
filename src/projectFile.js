/* projectFile.js — project-file (.wps) defaults, schema versioning + the pure load/migrate path.
   Phase-6 module split (rev 80): moved VERBATIM from plan-sketcher-suite.jsx. Pure (no React).
   Owns DEFAULT_G/DEFAULT_D/SEG_DEFAULTS/DEFAULT_LINE/DEFAULT_PLACED, CURRENT_VERSION, MIGRATIONS,
   migrateProject, loadProject. App imports the defaults + loadProject back. */

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

export {
  DEFAULT_G, DEFAULT_D, SEG_DEFAULTS, DEFAULT_LINE, DEFAULT_PLACED, CURRENT_VERSION, MIGRATIONS, migrateProject, loadProject,
};
