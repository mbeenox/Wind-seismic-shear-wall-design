/* designEngine.js — per-line + stacked shear-wall DESIGN logic (pure).
   Phase-2 module split (rev 76): moved VERBATIM from plan-sketcher-suite.jsx.
   Composes the calcCore engine primitives; no React, no geometry/theme.
   GUARDED fns (withUtil, lineResults, stackSeg, stackedLineResults) are
   byte-for-byte the originals — relocation only, zero behavior change. */

import {
  calcSegment, baseDesignSeg, schedFor, HD_TABLE, isNum, xMax, numOr0,
} from "./calcCore.js";

function calcPushSig(line, segs, res, dC){
  return JSON.stringify({
    f: Math.round((line && line.forceLbs) || 0),
    h: line ? line.heightFt : null,
    rt: (line && line.roofTrib != null)  ? line.roofTrib  : (dC ? dC.roofTrib  : null),
    ft: (line && line.floorTrib != null) ? line.floorTrib : (dC ? dC.floorTrib : null),
    segs: (segs || []).map(s => s.length),
    types: (res || []).map(r => (r && isNum(r.selType)) ? Math.min(r.selType, 6) : 1),
    d: dC ? [dC.hdDist, dC.thickness, dC.anchor, dC.ftgWidth, dC.ftgThick] : [],
  });
}

// Signature of the inputs the Design-tab "⚡ Optimize design" optimizer (optimizeAll) consumes, so the
// button can go red when re-optimizing would produce a different design. Covers every line's
// force/height/length/tributary across BOTH floors + the framing/code (g) + the design constraints (d).
// g.wWind is EXCLUDED — optimizeAll overrides it per-line with the line's own force (so a calc-sheet
// push that sets g.wWind must NOT mark Optimize stale); g.line is a cosmetic label, also excluded.
function optimizeSig(linesByFloor, lines, twoStory, g, d){
  const f1 = (linesByFloor && linesByFloor[1]) || (twoStory ? [] : (lines || [])) || [];
  const f2 = (twoStory && linesByFloor && linesByFloor[2]) || [];
  const key = (l) => [l.id, Math.round(l.forceLbs || 0), Math.round(l.forceLbsSeismic || 0), l.heightFt, l.lengthFt, l.roofTrib, l.floorTrib];
  const gKey = { ...(g || {}) }; delete gKey.wWind; delete gKey.line;
  return JSON.stringify({ f1: f1.map(key), f2: f2.map(key), g: gKey, d: d || {} });
}

// Utilization (UI layer) — derives D/C ratios + pass verdict from an engine
// result WITHOUT touching calcSegment (engine stays verbatim per handoff §2).
function withUtil(r, seg, grade) {
  if (!r || !r.active) return r;
  const selT = schedFor(grade)[Math.max(0, Math.min(5, (seg.selType || 1) - 1))];
  const utilW = r.vW / selT.wind;
  const utilS = r.vS / (r.factor * selT.seismic);
  const { Pa224, Pa44, Pa226, Pa46, Pa66, Pa68 } = r.Pa;
  const postCap =
    r.post === "(2) 2x4" ? Pa224 : r.post === "4x4" ? Pa44 : r.post === "(2) 2x6" ? Pa226
    : r.post === "4x6" ? Pa46 : r.post === "6x6" ? Pa66 : r.post === "6x8" ? Pa68
    : seg.thickness <= 4 ? (Pa46 * 3.5) / 5.5 : Pa68; // NG! → largest available
  const utilPost = r.maxComp / postCap;
  const hdEntry = HD_TABLE.find((x) => r.hd.includes(x.name));
  const utilHD = r.maxUplift === 0 ? 0 : hdEntry ? r.maxUplift / hdEntry.cap : r.maxUplift / HD_TABLE[5].cap;
  const pass = r.status === "OK" && !r.aspectNG && r.post !== "NG!" && r.hd !== "NG!" && r.anchorSel !== "NG!!";
  return { ...r, utilW, utilS, utilPost, utilHD, pass };
}

// override validation against the engine's own capacities
const postAllowable = (r, t, name) => {
  const P = r.Pa;
  if (t <= 4) return name==="(2) 2x4" ? P.Pa224 : name==="4x4" ? P.Pa44 : name==="4x6" ? (P.Pa46*3.5)/5.5 : 0;
  return name==="(2) 2x6" ? P.Pa226 : name==="4x6" ? P.Pa46 : name==="6x6" ? P.Pa66 : name==="6x8" ? P.Pa68 : 0;
};
const hdCapacity = (name) => { const m = HD_TABLE.find(h => name.endsWith(h.name)); return m ? m.cap : 0; };

// evaluate one line's segments through the engine (auto type unless overridden)
function lineResults(line, segs, g, d) {
  const gL = { ...g, wWind: line.forceLbs, vSeismic: line.forceLbsSeismic || 0 };  // rev 62: per-line seismic demand (post-R reduced reaction, fed like wWind; engine envelopes W vs S)
  const totalL = segs.reduce((a, s) => a + s.length, 0);
  return segs.map((s) => {
    // (rev 49) DL tributary now rides on the LINE (per wall, per floor — set in runDesignHandoff from
    // wallProps), replacing the old global d.roofTrib/d.floorTrib. Only the INPUT SOURCE changed; the
    // engine's dead-load formula (calcCore.js: wdl = roofTrib·roofDL + floorTrib·floorDL + wallDL·h) is
    // byte-identical. ?? d.* keeps any pre-rev-49 / trib-less line working. Per-floor matters for stacked
    // walls: stackedLineResults runs floor 1 and floor 2 each through here with their own line.*.
    const base = { ...baseDesignSeg({ ...d, height: line.heightFt,
                     roofTrib:  line.roofTrib  ?? d.roofTrib,
                     floorTrib: line.floorTrib ?? d.floorTrib }), length: s.length };
    const r1 = calcSegment({ ...base, selType: 1 }, gL, totalL);
    let autoType = 1;
    if (r1.active && isNum(r1.sugS) && isNum(r1.sugW)) autoType = Math.max(r1.sugS, r1.sugW);
    const selType = s.ov && s.ov.type ? s.ov.type : Math.min(autoType, 6);
    const r = calcSegment({ ...base, selType }, gL, totalL);
    const ovBad = {
      type: s.ov && s.ov.type ? r.status !== "OK" : false,
      hd:   s.ov && s.ov.hd ? (s.ov.hd === "None" ? r.maxUplift !== 0 : r.maxUplift >= hdCapacity(s.ov.hd)) : false,
      post: s.ov && s.ov.post ? r.maxComp > postAllowable(r, d.thickness, s.ov.post) : false,
    };
    const dispHd   = s.ov && s.ov.hd   ? s.ov.hd   : r.hd;
    const dispPost = s.ov && s.ov.post ? s.ov.post : r.post;
    const failed = !r.active || r.status !== "OK" || r.aspectNG || r.post === "NG!" || r.hd === "NG!" || ovBad.type || ovBad.hd || ovBad.post;
    return { ...r, autoType: r1.active && (r1.sugS === "FAILED!!!" || r1.sugW === "FAILED!!!") ? "FAILED!!!" : r1.aspectNG ? "NG!" : autoType,
             selType, dispHd, dispPost, ovBad, failed };
  });
}

// ── Two-story vertical stacking (rev 27 / Step 6) ────────────────────────────
// At the 1st-floor base the overturning is ARM-AWARE: the roof reaction sits a
// full upper story higher, so its moment arm is H₁+H₂, not H₁. Because Step 5
// already handed each floor the correct force AND design height, the arm-aware
// base moment is exactly the SUM of the two floors' engine overturning moments
// for the same vertically-aligned segment:  M_base = Mot(1st) + Mot(2nd).
//   e.g. roof 5k @ 20ft + 2nd-floor 6k @ 10ft over a 10ft wall →
//        (5·20 + 6·10)/10 = 16k  (NOT a flat (5+6)=11k).
// End post + holdown are re-derived from that combined moment using the engine's
// OWN formula shapes — calcSegment / lineResults are never touched (the withUtil
// pattern). Shear capacity (status/selType/v) is unaffected: stacking changes
// only overturning, and the shear was already carried by Step 5's combined load.
// Step 7 (rev 28): the secondary detailing — anchor, embedment, strap, deflection
// and footing — is now ALSO re-derived from the stacked demand, by mirroring
// calcSegment's anchorFor / embedFor / strapFor / defl / footing formula shapes
// here (the engine's 7 guarded fns stay byte-identical). Deflection's shear v is
// unchanged (the 1st-floor story shear was already carried by Step 5's combined
// load); only its chord (bending) term uses the STACKED end post, so a stacked
// wall with a bigger required chord reports a smaller in-plane Δ — the as-built
// behavior.
// rev 63 (SANCTIONED guarded change — user-approved; stackSeg guard is now
// golden-OUTPUT, re-baselined): the UPPER-STORY dead load now stacks onto the
// 1st-floor base, because the 2nd-floor + roof gravity travels down through the
// 1st-floor end posts. It is added through EACH case's factored bucket — wind
// compression +r2.wdl, seismic compression +r2.AwDL (A=1+0.14·Sds); wind uplift
// +r2.CwDL (0.6·D), seismic uplift +r2.BwDL ((0.6−0.14·Sds)·D, E_v-consistent) —
// so it REDUCES net uplift (smaller holdowns) and RAISES post compression (the
// physically-correct two-way effect). The footing base-shear term is now CUMULATIVE
// (r1.F+r2.F) to match the summed moments. r2's factored buckets already exist on
// the 2nd-floor calcSegment result; r1.B==r2.B (shared Sds), so aF is unchanged.
const upliftStk = (Mot, w, L, denomIn) => {            // mirror of calcSegment's local upliftFn
  const u = (Mot - w*L*(L/2 - 1.5/12)) / (L - denomIn/12);
  return u < 0 ? 0 : u < 625 ? "neglect" : u;
};
function stackSeg(r1, r2, L, g, d, h) {
  if (!r1 || !r1.active || !r2 || !r2.active) return r1;   // top-floor / inactive → no stacking
  const sp = g.species === 1, SCHED = schedFor(g.grade);
  const anchor = d.anchor, hdDist = d.hdDist, thickness = d.thickness, ftgW = d.ftgWidth, ftgT = d.ftgThick;
  const isWood = anchor === "Wood";
  // ── ARM-AWARE combined overturning (= sum of the two floors' engine moments) ──
  const MotW = r1.MotW + r2.MotW;                          // arm-aware combined wind moment @ 1st-floor base
  const MotS = r1.MotS + r2.MotS;                          // …and seismic
  const minL = Math.min(3, L/2);
  const compW = (MotW + (r1.wdl  + r2.wdl ) * L * minL) / (L - (1.5 + hdDist/12) / 12);  // E42 quirk preserved · (rev 63) +upper-story DL onto the post
  const compS = (MotS + (r1.AwDL + r2.AwDL) * L * minL) / (L - (1.5 + hdDist)   / 12);   // (rev 63) +upper-story DL (seismic A=1+0.14·Sds bucket)
  const upHD_W = upliftStk(MotW, r1.CwDL + r2.CwDL, L, 1.5 + hdDist);   // (rev 63) +upper-story DL resists uplift (wind C=0.6·D bucket)
  const upHD_S = upliftStk(MotS, r1.BwDL + r2.BwDL, L, 1.5 + hdDist);   // (rev 63) +upper-story DL (seismic B=(0.6−0.14·Sds)·D bucket, E_v consistent)
  const upStrap_W = upliftStk(MotW, r1.CwDL + r2.CwDL, L, 3);        // E56/E57 strap uplift: denominator is 3", not 1.5+hdDist
  const upStrap_S = upliftStk(MotS, r1.BwDL + r2.BwDL, L, 3);
  const maxComp   = xMax(compS, compW);
  const maxUplift = xMax(upHD_S, upHD_W);
  const maxStrap  = xMax(upStrap_S, upStrap_W);
  // ── End post (engine's own ladder, same Pa as the 1st-floor segment) ──
  const P = r1.Pa;
  const post = thickness <= 4
    ? maxComp <= P.Pa224 ? "(2) 2x4" : maxComp <= P.Pa44 ? "4x4" : maxComp <= (P.Pa46*3.5)/5.5 ? "4x6" : "NG!"
    : maxComp <= P.Pa226 ? "(2) 2x6" : maxComp <= P.Pa46 ? "4x6" : maxComp <= P.Pa66 ? "6x6" : maxComp <= P.Pa68 ? "6x8" : "NG!";
  // ── Holdown (HD_TABLE lookup on the stacked uplift) ──
  let hd;
  if (maxUplift === 0) hd = "None";
  else { const found = HD_TABLE.find((x) => maxUplift < x.cap); hd = found ? (isWood ? `(2) ${found.name}` : found.name) : "NG!"; }
  // ── Anchor + embedment (mirror of calcSegment.anchorFor / embedFor on the stacked hd/uplift) ──
  const anchorFor = (variant) => {
    if (maxUplift === 0 || hd === "None") return "None";
    if (anchor === "Concrete") {
      if (hd === "HDU2") return maxUplift < 4780 ? "SSTB16" : "5/8'' A.B.";
      if (hd === "HDU4") return maxUplift < 4780 ? "SSTB16" : "5/8'' A.B.";
      if (hd === "HDU5") return maxUplift < 5175 ? "SSTB24" : "5/8'' A.B.";
      if (hd === "HDU8") return maxUplift < 10100 ? "SSTB28" : "7/8'' A.B.";
      return "1'' A.B.";
    }
    if (anchor === "Masonry") {
      const lim = variant === "interior" ? { a:4780, b:4780, c:6385 } : { a:1850, b:1850, c:4815 };
      if (hd === "HDU2" || hd === "HDU4") return maxUplift < lim.a ? "SSTB16" : "5/8'' A.B.";
      if (hd === "HDU5") return maxUplift < lim.b ? "SSTB24" : "5/8'' A.B.";
      if (hd === "HDU8") return maxUplift < lim.c ? "SSTB28" : "7/8'' A.B.";
      return "1'' A.B.";
    }
    if (["(2) HDU2", "(2) HDU4", "(2) HDU5"].includes(hd)) return "5/8'' Rod";
    if (hd === "(2) HDU8") return "7/8'' Rod";
    if (hd === "(2) HHDQ11" || hd === "(2) HHDQ14") return "1'' Rod";
    return "NG!!";
  };
  const anchorSel = anchorFor("interior");
  const anchorEnd = anchor === "Masonry" ? anchorFor("end") : anchorFor("interior");
  const embedFor = (anchorName, atEnd) => {
    if (anchorName === "None") return "None";
    if (["SSTB16","SSTB24","SSTB28"].includes(anchorName)) return "Simpson";
    if (anchor === "Concrete") return Math.max(16, Math.floor(maxUplift / (atEnd ? 876 : 1752) + 5));
    if (anchor === "Masonry") return Math.max(16, Math.floor(maxUplift / (atEnd ? 254 : 508) + 5));
    return "Threaded";
  };
  const embed = embedFor(anchorSel, false);
  const embedEnd = embedFor(anchorEnd, true);
  // ── Straps (mirror of calcSegment.strapFor on the stacked maxStrap/uplift) ──
  const strapFor = (lims) => {
    if (maxUplift === 0) return "None";
    if (anchor === "Concrete") { for (const [lim, name] of lims) if (maxStrap < lim) return name; return "None"; }
    if (anchor === "Wood") {
      const woodLims = [[2010,"MST37"],[3105,"MST48"],[4800,"MST60"],[5660,"MSTC78"],[9235,"CMST12"]];
      for (const [lim, name] of woodLims) if (maxStrap < lim) return name; return "None";
    }
    return "None";
  };
  const altStrap = strapFor([[3195,"STHD8"],[3730,"STHD10"],[5785,"STHD14"]]);
  const strapCorner = strapFor([[2370,"STHD8"],[3730,"STHD10"],[5025,"STHD14"]]);
  // ── Deflection (engine's defl shape; shear v unchanged, chord uses the STACKED post) ──
  const Epost = ["(2) 2x4","4x4","(2) 2x6","4x6"].includes(post) ? (sp ? 1400000 : 1600000) : (sp ? 1500000 : 1300000);
  const Apost = post === "(2) 2x4" ? 10.5 : post === "4x4" ? 12.25 : post === "(2) 2x6" ? 16.5 : post === "4x6" ? 19.25 : post === "6x6" ? 30.25 : 39.875;
  const Ga = SCHED[Math.max(0, Math.min(SCHED.length - 1, r1.selType - 1))].ga;  // marks 1–6; 4–6 carry 2× combined Ga
  const defl = (v) => (8*(v/0.7)*Math.pow(h,3))/(Epost*Apost*L) + ((v/0.7)*h)/(1000*Ga) + (h/L)*0.125;
  const deflS = defl(r1.vS);
  const deflW = defl(r1.vW);
  // ── Footing (engine's quad; stacked moments + uplifts, 1st-floor dead load + base shear) ──
  const quad = (qa, qb, qc) => { const disc = qb*qb - 4*qa*qc; if (disc < 0 || qa === 0) return NaN; return (-qb + Math.sqrt(disc)) / (2*qa); };
  const aF = (Math.min(0.6, r1.B) * 150 * ftgW * ftgT) / 24;   // footing self-weight (B factor only; r1.B==r2.B, no DL sum)
  const P65 = (MotS + (r1.BwDL+r2.BwDL)*L*(L/2 - hdDist/12)) / (L - (1.5 + hdDist)/12);   // (rev 63) +upper-story DL
  const uS = numOr0(upHD_S);
  const LminS = quad(aF, (P65-uS)/2, uS*(hdDist/12 - L/2) + P65*(1.5/12 - L/2) - ((r1.Fs+r2.Fs)*ftgT)/12);   // (rev 63) cumulative seismic base shear
  const P70 = (MotW + (r1.CwDL+r2.CwDL)*L*(L/2 - hdDist/12)) / (L - (1.5 + hdDist/12)/12);   // (rev 63) +upper-story DL
  const uW = numOr0(upHD_W);
  const LminW = quad(aF, (P70-uW)/2, uW*(hdDist/12 - L/2) + P70*(1.5/12 - L/2) - ((r1.Fw+r2.Fw)*ftgT)/12);   // (rev 63) cumulative wind base shear
  const reqFtgLen = xMax(L + 1, LminS, LminW);
  return { ...r1, MotW, MotS, compW, compS, upHD_W, upHD_S, upStrap_W, upStrap_S,
           maxComp, maxUplift, maxStrap, post, hd,
           anchorSel, anchorEnd, embed, embedEnd, altStrap, strapCorner,
           deflS, deflW, LminS, LminW, reqFtgLen, stacked:true };
}
// Stacks a 1st-floor line onto its vertically-aligned 2nd-floor line (same id, shared segments),
// then re-derives override validation + display + pass/fail from the stacked numbers.
function stackedLineResults(line1, line2, segs, g, d) {
  const r1arr = lineResults(line1, segs, g, d);
  const r2arr = lineResults(line2, segs, g, d);
  return r1arr.map((r1, i) => {
    const stk = stackSeg(r1, r2arr[i], segs[i].length, g, d, line1.heightFt);
    const s = segs[i];
    const ovBad = {
      type: s.ov && s.ov.type ? stk.status !== "OK" : false,   // shear unaffected by stacking
      hd:   s.ov && s.ov.hd ? (s.ov.hd === "None" ? stk.maxUplift !== 0 : stk.maxUplift >= hdCapacity(s.ov.hd)) : false,
      post: s.ov && s.ov.post ? stk.maxComp > postAllowable(stk, d.thickness, s.ov.post) : false,
    };
    const dispHd   = s.ov && s.ov.hd   ? s.ov.hd   : stk.hd;
    const dispPost = s.ov && s.ov.post ? s.ov.post : stk.post;
    const failed = !stk.active || stk.status !== "OK" || stk.aspectNG || stk.post === "NG!" || stk.hd === "NG!" || ovBad.type || ovBad.hd || ovBad.post;
    return { ...stk, dispHd, dispPost, ovBad, failed };
  });
}

// 1st-floor-CONTROLLED stacked optimizer (rev 47). A stacked wall shares ONE segment layout across
// both floors, so its length is governed by the heavier 1st-floor COMBINED (arm-aware) demand, not the
// lighter 2nd floor. This mirrors generateDesign's (N, Ls) search but scores every candidate through
// the SAME validators the Design tab displays — stackedLineResults (1st-floor combined) AND the 2nd
// floor's own lineResults — and BOUNDS every layout to the 2-story segment (cap = the shared
// reconciled extent). It returns the shortest passing layout, so when the 2nd floor alone would take
// 6 ft but the stacked holdown/post can't pass at 6 ft, it grows the wall (e.g. 10 ft, up to the
// segment) — and that one length is used on both floors. If nothing passes within the segment it
// returns null → the line reports FAIL (never spills past the 2-story segment). calcCore.js is
// untouched: this only composes its exported primitives (calcSegment/baseDesignSeg via lineResults).
// (rev 73) Snap shear-wall segments so each sits INSIDE a solid wall run, instead of defaulting into an
// opening between two collinear walls. PLACEMENT-only and engine-neutral: the structural calc reads a
// segment's LENGTH and the line's total segment length (lineResults/calcSegment), never its `start`, so
// re-positioning changes nothing about the design result. A segment already fully inside a run is left
// where the engine placed it (so a continuous wall keeps the engine's even spacing); only a segment that
// overlaps a gap is shifted to the nearest run that can host it, packed left→right so placements never
// overlap. `runs` are line-local [start,end] pairs (0 = the line's `a` end). The user can still freely
// drag any placed segment along or across the walls afterward — this only sets the INITIAL position.
function snapSegsToRuns(segs, runs, lineLen) {
  if (!Array.isArray(runs) || runs.length === 0) return segs;                  // no wall geometry → leave as-is
  const solid = runs.reduce((a, r) => a + Math.max(0, r[1] - r[0]), 0);
  if (solid >= lineLen - 1e-3) return segs;                                    // wall is continuous → nothing to snap
  const inRun = (st, len) => runs.some(([s, e]) => st >= s - 1e-3 && st + len <= e + 1e-3);
  let lastEnd = 0;
  return segs.map((seg) => {
    const Ls = seg.length;
    let start = seg.start;
    if (!inRun(start, Ls)) {
      let best = null;
      for (const [s, e] of runs) {
        if (e - s < Ls - 1e-3) continue;                                       // run too short to host this segment
        let p = Math.min(Math.max(seg.start, s), e - Ls);                      // closest spot in this run to the original
        p = Math.max(p, lastEnd);                                             // don't overlap an earlier-placed segment
        if (p + Ls > e + 1e-3) continue;                                       // can't fit after lastEnd within this run
        const dist = Math.abs(p - seg.start);
        if (!best || dist < best.dist) best = { p, dist };
      }
      if (best) start = best.p;                                                // no run can host it → keep engine's start
    } else {
      start = Math.max(start, lastEnd);                                        // already in a wall; just guard overlap
    }
    lastEnd = start + Ls;
    return { ...seg, start: +start.toFixed(2) };
  });
}

function generateStackedDesign(line1, line2, g, d) {
  const cap = Math.max(0, Math.min(line2.lengthFt, line1.lengthFt));   // 2-story-segment length bound
  const snap = Math.max(0.25, d.snap || 0.5);
  const maxN = Math.max(1, Math.min(6, Math.floor(d.maxSegments)));
  const rnd = (x) => Math.round(x * 4) / 4;
  const mkSegs = (N, Ls) => { const gap = (cap - N*Ls)/(N+1);
    return Array.from({ length:N }, (_,i)=>({ start: rnd(gap + i*(Ls+gap)), length: Ls })); };
  const evalC = (segs) => {
    const stk = stackedLineResults(line1, line2, segs, g, d);   // combined 1st-floor demand (governs)
    const top = lineResults(line2, segs, g, d);                 // 2nd floor's own shear / aspect
    const ok = stk.length > 0 && stk.every(r=>!r.failed) && top.every(r=>!r.failed);
    const T = xMax(...stk.map(r=>isNum(r.selType) ? r.selType : 0));
    return { ok, T };
  };
  const solutions = [];
  for (let N = 1; N <= maxN; N++) {
    const maxLs = Math.min(d.maxSegLen, cap / N);
    if (maxLs < d.minSegLen - 1e-9) continue;
    const start = Math.ceil(d.minSegLen / snap) * snap;
    for (let Ls = start; Ls <= maxLs + 1e-9; Ls = +(Ls + snap).toFixed(4)) {
      const segs = mkSegs(N, Ls);
      const ev = evalC(segs);
      if (ev.ok) { solutions.push({ N, Ls, total: N*Ls, T: ev.T, segs }); break; }
    }
  }
  if (!solutions.length) return null;
  solutions.sort((a, b) => d.objective === "nailing"
    ? a.T - b.T || a.total - b.total || a.N - b.N
    : a.total - b.total || a.N - b.N || a.T - b.T);
  const best = solutions[0];
  return { segs: best.segs.map(s=>({...s})), meta:{ type: best.T, N: best.N, Ls: best.Ls, total: best.total, stacked:true } };
}

export {
  calcPushSig, optimizeSig, withUtil, postAllowable, hdCapacity,
  lineResults, upliftStk, stackSeg, stackedLineResults, snapSegsToRuns, generateStackedDesign,
};
