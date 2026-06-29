/* loadEngine.js — wind + seismic STATIC load engine (pure).
   Phase-3 module split (rev 78): moved VERBATIM from plan-sketcher-suite.jsx.
   Pure beam/diaphragm statics — no React, no theme, no calcCore/designEngine.
   GUARDED fns (findLeewardPartner, lineReactions, buildSecData) are byte-for-byte
   the originals — relocation only, zero behavior change.
   Depends only on geometry.js primitives (dependency direction geometry → loadEngine). */

import { keyOf, edgeAxis, pointInRing } from "./geometry.js";

// (rev 57) SEISMIC EFFECTIVE WEIGHT — 1-STORY.  W_total = roof + walls (lbs).
//   W_roof  = enclosed plan area (ft²) × Roof DL (psf)
//   per wall: H_trib = par + H/2  — the full parapet (above the diaphragm) + half the story height
//             below it (the lower half spans to the foundation); W = H_trib × length × Wall DL (psf).
//   W_wall  = Σ over every wall.  Pure + 1-STORY ONLY (the 2-story per-diaphragm tributary split lands
//   in a later step). Reads each wall's own par/H via propsFor, so it tracks Global Inputs / section cuts.
//   `profiles` groups equal (par,H) walls for a per-profile readout — the sum is identical either way.
function seismicWeight1Story(graph, loop, propsFor, roofDL, wallDL){
  const area = (loop && loop.area) ? loop.area : 0;
  const Wroof = area * (roofDL||0);
  let Wwall = 0; const byProfile = new Map();
  for(const e of graph.edges){
    const a = graph.nodes.find(n=>n.id===e.a), b = graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    const len = Math.hypot(b.x-a.x, b.y-a.y);
    const p = propsFor(keyOf(e)); const par = p.par||0, H = p.H||0;
    const htrib = par + H/2; const w = htrib * len * (wallDL||0);
    Wwall += w;
    const k = `${par}|${H}`;
    const g = byProfile.get(k) || { par, H, htrib, len:0, w:0 };
    g.len += len; g.w += w; byProfile.set(k, g);
  }
  return { area, Wroof, Wwall, Wtotal: Wroof + Wwall, profiles:[...byProfile.values()] };
}

// (rev 60) SEISMIC EFFECTIVE WEIGHT — 2-STORY.  The tributary wall weight SPLITS between the floor
// diaphragm (level 1) and the roof diaphragm (level 2); each level is tracked independently so the
// base shear V = Cs·W_total can be distributed vertically (Phase 3).  Per SECTION-B (2 STORY):
//   Level 2 (roof):   area×roofDL  +  Σ over 2-STORY walls of (par + H₂/2)·len·wallDL
//                     (full parapet above + the UPPER half of story 2).      e.g. 6 + 10/2 = 11 ft
//   Level 1 (floor):  area×floorDL +  Σ over walls of H_trib·len·wallDL where
//                       2-story wall → H₂/2 + H₁/2  (lower half of story 2 + upper half of story 1)
//                                                                            e.g. 5 + 6.5 = 11.5 ft
//                       1-story wall → par + H₁/2   (its own parapet + upper half — its roof sits at
//                                                    the floor-diaphragm level; mixed-height C/D)
//   The remaining bottom half of story 1 (H₁/2) dumps to the foundation and is excluded.
// Area DL by level (handles mixed height): the 2-story footprint (twoStoryLoop) carries a real FLOOR
// at level 1 (floorDL) and a ROOF at level 2 (roofDL); any 1-story-only footprint carries its ROOF at
// level 1 (roofDL).  Uniform 2-story → roofArea==floorArea, so floor = floorDL·area, roof = roofDL·area.
// Diaphragm elevations above grade: h_floor = H₁, h_roof = H₁ + H₂ (representative story heights from
// the 2-story walls).  isOne(key) = wall tagged 1-story.  Pure; reads each wall's par/H/H₂ via propsFor.
function seismicWeight2Story(graph, loop, twoStoryLoop, propsFor, isOne, roofDL, floorDL, wallDL){
  const floorArea = (loop && loop.area) ? loop.area : 0;
  const roofArea  = (twoStoryLoop && twoStoryLoop.area) ? twoStoryLoop.area
                  : ((loop && loop.area) ? loop.area : 0);           // closed 2-story sub-loop, else full
  const oneStoryArea = Math.max(0, floorArea - roofArea);            // footprint that is 1-story only
  const WroofArea  = roofArea  * (roofDL||0);
  const WfloorArea = floorArea===0 ? 0 : (roofArea*(floorDL||0) + oneStoryArea*(roofDL||0));
  let WroofWall=0, WfloorWall=0, H1rep=0, H2rep=0; const byProfile = new Map();
  for(const e of graph.edges){
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    const len=Math.hypot(b.x-a.x, b.y-a.y);
    const k=keyOf(e); const p=propsFor(k);
    const par=p.par||0, H1=p.H||0, H2=(p.H2!=null?p.H2:p.H)||0;
    const one = isOne ? isOne(k) : false;
    let htR=0, htF=0;
    if(one){ htF = par + H1/2; }                                     // 1-story wall → floor diaphragm only
    else   { htR = par + H2/2; htF = H2/2 + H1/2;                    // 2-story wall → both diaphragms
             H1rep=Math.max(H1rep,H1); H2rep=Math.max(H2rep,H2); }
    WroofWall  += htR*len*(wallDL||0);
    WfloorWall += htF*len*(wallDL||0);
    const pk=`${one?"1":"2"}|${par}|${H1}|${H2}`;
    const g=byProfile.get(pk)||{one,par,H1,H2,htR,htF,len:0,wR:0,wF:0};
    g.len+=len; g.wR+=htR*len*(wallDL||0); g.wF+=htF*len*(wallDL||0); byProfile.set(pk,g);
  }
  if(H1rep===0){ for(const e of graph.edges){ const p=propsFor(keyOf(e)); H1rep=Math.max(H1rep,p.H||0); H2rep=Math.max(H2rep,(p.H2!=null?p.H2:p.H)||0); } }
  const Wroof=WroofArea+WroofWall, Wfloor=WfloorArea+WfloorWall;
  const hFloor=H1rep, hRoof=H1rep+H2rep;
  return { floorArea, roofArea, WroofArea, WfloorArea, WroofWall, WfloorWall,
           Wroof, Wfloor, Wtotal:Wroof+Wfloor, hFloor, hRoof, profiles:[...byProfile.values()] };
}

// (rev 60) Phase 3 — vertical distribution of base shear V across the two diaphragm levels by
// F_level = V·(W_level·h_level)/Σ(W·h).  Returns V + the roof/floor forces (lbs).
function seismicDistribute2Story(sw2, Cs){
  if(!sw2) return null;
  const V = (Cs||0) * sw2.Wtotal;
  const whR = sw2.Wroof*sw2.hRoof, whF = sw2.Wfloor*sw2.hFloor, sum = whR+whF;
  return { V, Froof: sum>0 ? V*whR/sum : 0, Ffloor: sum>0 ? V*whF/sum : 0, sumWh:sum };
}

// The leeward (back) exterior wall a windward wall looks across to, for the leeward-parapet term:
// same orientation, downwind, overlapping the lookup position, and the FARTHEST downwind such wall
// (the exterior back face). The lookup position is `sAt` when given (the across-wind location of
// the section cut) else the windward wall's center — so when the back is one wall every front
// segment resolves to it (shared parapet), and when the back is split the specific segment behind
// THIS cut is returned. Returns an edge key or null.
const findLeewardPartner = (windKey, axis, sign, graph, sAt) => {
  if(sign==null) return null;
  const travel = axis==="v" ? {x:0,y:sign} : {x:sign,y:0};
  const wEdge = graph.edges.find(e=>keyOf(e)===windKey); if(!wEdge) return null;
  const wa=graph.nodes.find(n=>n.id===wEdge.a), wb=graph.nodes.find(n=>n.id===wEdge.b); if(!wa||!wb) return null;
  const sOf  = p=> axis==="v"?p.x:p.y;                 // across-wind position
  const along= p=> p.x*travel.x + p.y*travel.y;        // downwind depth (bigger = further downwind)
  const sC = (sAt!=null) ? sAt : (sOf(wa)+sOf(wb))/2;  // lookup at the cut, else the wall's center
  const dW = (along(wa)+along(wb))/2;
  const recv = axis==="v" ? "h" : "v";                 // across-wind walls (windward/leeward faces)
  let best=null, bestAlong=-Infinity;
  for(const e of graph.edges){
    if(keyOf(e)===windKey) continue;
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b); if(!a||!b) continue;
    if(edgeAxis(a,b)!==recv) continue;
    const s0=Math.min(sOf(a),sOf(b)), s1=Math.max(sOf(a),sOf(b));
    if(sC < s0-0.6 || sC > s1+0.6) continue;           // must sit behind the lookup position
    const d=(along(a)+along(b))/2;
    if(d <= dW+0.6) continue;                           // must be downwind
    if(d > bestAlong){ bestAlong=d; best=keyOf(e); }    // farthest downwind = exterior back
  }
  return best;
};

// Reaction engine — treats a windward wall LINE (all collinear windward segments at one depth)
// as a beam carried by the walls parallel to the wind. Each segment contributes a distributed
// load (plf) over its span; the line is split into simply-supported bays between consecutive
// supports; a load crossing an interior support is split at it; each bay distributes by statics
// (reference-side support takes W·(TL−X)/TL, far side W·X/TL); load outside the outermost
// supports cantilevers onto the nearest support. Reactions are independent of how the line is
// segmented when the segment plf values match — so adding a node never changes the point loads.
// `line` = { depth, segs:[{s0,s1,plf}], smin, smax }; s is the across-wind coord (ref = min s).
function lineReactions(line, graph, isSup, travel, sOf, along){
  const tol=0.8;
  const sup=[];
  for(const e of graph.edges){
    if(!isSup(keyOf(e))) continue;
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    const ex=b.x-a.x, ey=b.y-a.y, el=Math.hypot(ex,ey)||1;
    if(Math.abs((ex*travel.x+ey*travel.y)/el) < 0.5) continue;        // must run PARALLEL to wind
    const s=(sOf(a)+sOf(b))/2;
    if(s < line.smin-tol || s > line.smax+tol) continue;             // within the line's span
    const aMin=Math.min(along(a),along(b)), aMax=Math.max(along(a),along(b));
    // A parallel wall supports this windward LINE if it lies at or downwind of the windward face.
    // (It need NOT span all the way back to the windward depth: a re-entrant interior wall — e.g.
    // the step wall of an L — is tied to the windward face by the diaphragm and acts as an interior
    // support, just like a full-depth interior wall does. Only walls entirely UPWIND of the windward
    // face are rejected — those belong to a deeper windward line in a concave footprint.)
    if(aMax < line.depth - tol) continue;     // support is at or downwind of the windward face
    const upwind = along(a) <= along(b) ? a : b;                     // toward the windward side
    const downwind = upwind===a ? b : a;
    const ax=upwind.x+(downwind.x-upwind.x)/3, ay=upwind.y+(downwind.y-upwind.y)/3;
    sup.push({ s, key:keyOf(e), ax, ay, alen:el });
  }
  if(!sup.length) return { reactions:[], imbalance:true };
  // cluster collinear supports (a support split by a node is ONE support line); keep the longest
  sup.sort((u,v)=>u.s-v.s);
  const cl=[];
  for(const x of sup){
    const c=cl[cl.length-1];
    if(c && Math.abs(x.s-c.s)<0.75){ if(x.alen>c.alen){ c.s=x.s; c.key=x.key; c.ax=x.ax; c.ay=x.ay; c.alen=x.alen; } }
    else cl.push({...x});
  }
  const R={}; cl.forEach(c=>R[c.key]=0);
  const first=cl[0], last=cl[cl.length-1];
  for(const seg of line.segs){
    // left / right cantilever → nearest support
    if(seg.s0 < first.s-1e-9){ const c1=Math.min(seg.s1,first.s); if(c1>seg.s0) R[first.key]+=seg.plf*(c1-seg.s0); }
    if(seg.s1 > last.s +1e-9){ const c0=Math.max(seg.s0,last.s ); if(seg.s1>c0) R[last.key ]+=seg.plf*(seg.s1-c0); }
    // interior bays (simply supported, load split at each interior support)
    for(let i=0;i<cl.length-1;i++){
      const sa=cl[i].s, sb=cl[i+1].s, TL=sb-sa; if(TL<=1e-9) continue;
      const c0=Math.max(seg.s0,sa), c1=Math.min(seg.s1,sb); if(c1<=c0) continue;
      const W=seg.plf*(c1-c0), X=((c0+c1)/2)-sa;
      R[cl[i].key]   += W*(TL-X)/TL;
      R[cl[i+1].key] += W*X/TL;
    }
  }
  const reactions=cl.filter(c=>Math.abs(R[c.key])>1e-9)
                    .map(c=>({ key:c.key, kips:R[c.key]/1000, ax:c.ax, ay:c.ay }));
  return { reactions, imbalance:false };
}

// (rev 58, Step 2 / Option B) buildSecData's per-wall LINE LOAD is supplied by a load MODEL, so the
// same windward-collection + across-wind shadow + reaction geometry can carry a SEISMIC load
// (uniform V / projected-extent) as well as wind. The DEFAULT model reproduces the exact wind
// arithmetic verbatim — `base` = ½·H·pw + par·qWind (uniform over a wall) and `lee` = leePar·qLee
// (the leeward-parapet term, taken per back-wall sub-span) — so the wind path is byte-identical
// (proven by a golden-output regression). A seismic caller (Step 3) passes { base:()=>V/extent, lee:()=>0 }.
const WIND_LOAD = {
  base: (pr)=> 0.5*(pr.H||0)*(pr.pw||0) + (pr.par||0)*(pr.qWind||0),
  lee:  (pr, leePar)=> leePar*(pr.qLee||0),
};

// wind field for one direction: loads EVERY windward-facing wall of that orientation
function buildSecData(section, graph, loop, isSup, propsFor, loadModel){
  if(!section) return null;
  const { axis, sign } = section;
  const LM = loadModel || WIND_LOAD;   // (rev 58) default = wind; seismic supplies a uniform model
  const travel = axis==="v" ? {x:0,y:sign} : {x:sign,y:0};
  const ring = loop?loop.ring:null;
  let cx=0,cy=0,cn=0;
  (ring||graph.nodes).forEach(p=>{cx+=p.x;cy+=p.y;cn++;}); if(cn){cx/=cn;cy/=cn;}
  const extN=(a,b)=>{                                     // exterior normal (robust for concave)
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
    let nx=-dy/len, ny=dx/len;
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    if(ring){ if(pointInRing(mx+nx*0.4,my+ny*0.4,ring)){ nx=-nx; ny=-ny; } }
    else { if((mx-cx)*nx+(my-cy)*ny<0){ nx=-nx; ny=-ny; } }
    return {nx,ny,len};
  };
  const windLoads=[];
  for(const e of graph.edges){
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    // receiving walls run across the wind: axis 'v' (N–S wind) → horizontal walls, etc.
    const wallAxis=edgeAxis(a,b);
    if(axis==="v" ? wallAxis!=="h" : wallAxis!=="v") continue;
    const {nx,ny,len}=extN(a,b);
    if(nx*travel.x + ny*travel.y >= -1e-6) continue;    // keep only windward (faces the wind)
    windLoads.push({ wa:a, wb:b, nx, ny, len, key:keyOf(e) });
  }
  {
    // across-wind overlap test: drop a windward wall only when another windward wall
    // sits directly in front of it (same wind direction) — avoids double-counting.
    const along=(p)=> p.x*travel.x + p.y*travel.y;        // bigger = further downwind
    const tran =(p)=> -p.y*travel.x + p.x*travel.y;       // across-wind position
    const ov=(a0,a1,b0,b1)=> Math.min(Math.max(a0,a1),Math.max(b0,b1)) - Math.max(Math.min(a0,a1),Math.min(b0,b1));
    const kept = windLoads.filter(w=>{
      const wa0=tran(w.wa), wa1=tran(w.wb), aw=along({x:(w.wa.x+w.wb.x)/2,y:(w.wa.y+w.wb.y)/2});
      const overlapShadow = windLoads.some(u=>{
        if(u===w) return false;
        const au=along({x:(u.wa.x+u.wb.x)/2,y:(u.wa.y+u.wb.y)/2});
        return au < aw-0.5 && ov(wa0,wa1,tran(u.wa),tran(u.wb)) > 0.5;
      });
      return !overlapShadow;
    });
    let anyImbalance=false;
    const sOf =(p)=> axis==="v" ? p.x : p.y;     // across-wind coord (reference = min: left / top)
    kept.forEach(w=>{
      const pr=propsFor(w.key);
      // representative plf for the on-plan label: leeward parapet from the back wall behind centre
      const cLee=findLeewardPartner(w.key, axis, sign, graph);
      const cPar=cLee ? (propsFor(cLee).par||0) : 0;
      w.total = LM.base(pr) + LM.lee(pr, cPar);
      w.tdir=travel;
    });
    const drawn = kept.filter(w=>w.total>0);

    // Group drawn windward segments into collinear LINES (same along-wind depth). Each windward
    // wall is subdivided where the back (leeward) wall behind it changes, so the leeward-parapet
    // term is taken per region from the actual back wall — e.g. a single front wall over a split
    // back loads with each back segment's own parapet. A wall split into front segments is still
    // one line, so splitting alone never changes the point loads.
    const recv = axis==="v" ? "h" : "v";
    let alMin=Infinity, alMax=-Infinity;
    graph.nodes.forEach(p=>{ const al=along(p); if(al<alMin)alMin=al; if(al>alMax)alMax=al; });
    const lines=[];
    drawn.forEach(w=>{
      const depth=(along(w.wa)+along(w.wb))/2;
      let L=lines.find(l=>Math.abs(l.depth-depth)<0.6);
      if(!L){ L={depth, segs:[], smin:Infinity, smax:-Infinity}; lines.push(L); }
      const ws0=Math.min(sOf(w.wa),sOf(w.wb)), ws1=Math.max(sOf(w.wa),sOf(w.wb));
      const pr=propsFor(w.key);
      const base = LM.base(pr);   // uniform over the wall (wind: ½·H·pw + par·qWind; seismic: V/extent)
      // back walls overlapping this windward wall (downwind), as {lo,hi,d,par}
      const backs=[];
      for(const e of graph.edges){
        if(keyOf(e)===w.key) continue;
        const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b); if(!a||!b) continue;
        if(edgeAxis(a,b)!==recv) continue;
        const d=(along(a)+along(b))/2; if(d<=depth+0.6) continue;          // downwind only
        const lo=Math.max(ws0,Math.min(sOf(a),sOf(b))), hi=Math.min(ws1,Math.max(sOf(a),sOf(b)));
        if(hi-lo>0.5) backs.push({ lo, hi, d, par:(propsFor(keyOf(e)).par||0) });
      }
      // subdivide the windward span at back-wall breakpoints; each sub-span uses the farthest
      // downwind back covering it (the exterior back face) for its leeward parapet
      const bps=new Set([ws0,ws1]);
      backs.forEach(bk=>{ if(bk.lo>ws0+1e-6&&bk.lo<ws1-1e-6)bps.add(bk.lo); if(bk.hi>ws0+1e-6&&bk.hi<ws1-1e-6)bps.add(bk.hi); });
      const pts=[...bps].sort((p,q)=>p-q);
      const interp=(s)=>{ const den=(sOf(w.wb)-sOf(w.wa))||1, f=(s-sOf(w.wa))/den;
        return { x:w.wa.x+(w.wb.x-w.wa.x)*f, y:w.wa.y+(w.wb.y-w.wa.y)*f }; };
      w.subLoads=[];
      for(let i=0;i<pts.length-1;i++){
        const a0=pts[i], a1=pts[i+1]; if(a1-a0<0.5) continue;
        const mid=(a0+a1)/2; let leePar=0, bestD=-Infinity;
        backs.forEach(bk=>{ if(mid>=bk.lo-1e-6&&mid<=bk.hi+1e-6&&bk.d>bestD){ bestD=bk.d; leePar=bk.par; } });
        const plf = base + LM.lee(pr, leePar);
        L.segs.push({ s0:a0, s1:a1, plf });
        w.subLoads.push({ plf, len:a1-a0, a:interp(a0), b:interp(a1) });   // for the on-plan display
        L.smin=Math.min(L.smin,a0); L.smax=Math.max(L.smax,a1);
      }
    });

    // dashed "tributary" lines wherever the load changes along a line (a real front node OR the
    // projection of a back-wall node), drawn from the windward wall across to the leeward face.
    const divides=[];
    lines.forEach(L=>{
      L.segs.sort((p,q)=>p.s0-q.s0);
      for(let i=0;i<L.segs.length-1;i++){
        const cur=L.segs[i], nxt=L.segs[i+1];
        if(Math.abs(cur.s1-nxt.s0)<0.6 && Math.abs(cur.plf-nxt.plf)>0.5){
          const a=(cur.s1+nxt.s0)/2;
          const Pw = axis==="v" ? {x:a, y:L.depth*sign} : {x:L.depth*sign, y:a};
          divides.push({ x1:Pw.x, y1:Pw.y, x2:Pw.x+travel.x*(alMax-L.depth), y2:Pw.y+travel.y*(alMax-L.depth) });
        }
      }
    });

    // a support shared by several windward lines sums their reactions into ONE arrow
    const agg={}; let baseShear=0;
    lines.forEach(L=>{
      L.segs.forEach(s=> baseShear += s.plf*(s.s1-s.s0)/1000);
      const r=lineReactions(L, graph, isSup, travel, sOf, along);
      if(r.imbalance) anyImbalance=true;
      r.reactions.forEach(rr=>{
        if(!agg[rr.key]) agg[rr.key]={ key:rr.key, kips:0, ax:rr.ax, ay:rr.ay };
        agg[rr.key].kips += rr.kips;
      });
    });
    return { axis, sign, tdir:travel, windLoads:drawn, reactions:Object.values(agg),
             divides, baseShear, imbalance:anyImbalance };
  }
}

// ── STEP 3: 1st-floor (floor diaphragm) load for the MIXED-height case ───────────────────────────
// Additive sibling of buildSecData (the guarded fn is UNTOUCHED). Used ONLY on the 1st-floor view /
// floor-1 design when ≥1 wall is tagged 1-story. A windward wall's floor-diaphragm plf VARIES along
// its length: at each across-wind station it sums the strips connected to the FLOOR diaphragm in its
// downwind shadow —
//   • own ½·H·pw      (the top half of its own wall)
//   • + its OWN parapet IF it is 1-story (a 1-story wall's roof sits at the floor-diaphragm level)
//     — a 2-story windward wall instead adds ½·H₂·pw (bottom half of ITS upper wall; no parapet,
//       whose load belongs to the roof diaphragm)
//   • + ½·H₂·pw of the NEAREST 2-story wall standing behind it (ONE face — its upper wall's bottom
//     half pours into this floor diaphragm; the top half already went to the roof)  ← "the 454"
//   • + leeward parapet of the exterior back wall IF that back wall is 1-story
// Same windward + overlap-shadow + line-grouping + subdivision machinery as buildSecData; reuses
// findLeewardPartner and lineReactions verbatim. isOne(key) = the wall is tagged 1-story.
function buildSecDataF1(section, graph, loop, isSup, propsFor, isOne){
  if(!section) return null;
  const { axis, sign } = section;
  const travel = axis==="v" ? {x:0,y:sign} : {x:sign,y:0};
  const ring = loop?loop.ring:null;
  let cx=0,cy=0,cn=0;
  (ring||graph.nodes).forEach(p=>{cx+=p.x;cy+=p.y;cn++;}); if(cn){cx/=cn;cy/=cn;}
  const extN=(a,b)=>{
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
    let nx=-dy/len, ny=dx/len;
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    if(ring){ if(pointInRing(mx+nx*0.4,my+ny*0.4,ring)){ nx=-nx; ny=-ny; } }
    else { if((mx-cx)*nx+(my-cy)*ny<0){ nx=-nx; ny=-ny; } }
    return {nx,ny,len};
  };
  const windLoads=[];
  for(const e of graph.edges){
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    const wallAxis=edgeAxis(a,b);
    if(axis==="v" ? wallAxis!=="h" : wallAxis!=="v") continue;
    const {nx,ny,len}=extN(a,b);
    if(nx*travel.x + ny*travel.y >= -1e-6) continue;
    windLoads.push({ wa:a, wb:b, nx, ny, len, key:keyOf(e) });
  }
  const along=(p)=> p.x*travel.x + p.y*travel.y;
  const tran =(p)=> -p.y*travel.x + p.x*travel.y;
  const ov=(a0,a1,b0,b1)=> Math.min(Math.max(a0,a1),Math.max(b0,b1)) - Math.max(Math.min(a0,a1),Math.min(b0,b1));
  const kept = windLoads.filter(w=>{
    const wa0=tran(w.wa), wa1=tran(w.wb), aw=along({x:(w.wa.x+w.wb.x)/2,y:(w.wa.y+w.wb.y)/2});
    const overlapShadow = windLoads.some(u=>{
      if(u===w) return false;
      const au=along({x:(u.wa.x+u.wb.x)/2,y:(u.wa.y+u.wb.y)/2});
      return au < aw-0.5 && ov(wa0,wa1,tran(u.wa),tran(u.wb)) > 0.5;
    });
    return !overlapShadow;
  });
  let anyImbalance=false;
  const sOf =(p)=> axis==="v" ? p.x : p.y;
  const recv = axis==="v" ? "h" : "v";
  // a windward wall's OWN floor-diaphragm contribution (no leeward parapet / no accumulation yet)
  const baseOf=(key)=>{
    const pr=propsFor(key); const half=0.5*(pr.H||0)*(pr.pw||0);
    const val = isOne(key) ? half + (pr.par||0)*(pr.qWind||0)   // 1-story: + own parapet (floor-level roof)
                           : half + 0.5*(pr.H2||0)*(pr.pw||0);  // 2-story: + bottom half of its own upper wall
    return { val, pr };
  };
  kept.forEach(w=>{
    const {val,pr}=baseOf(w.key);
    const cLee=findLeewardPartner(w.key, axis, sign, graph);
    const cPar=(cLee && isOne(cLee)) ? (propsFor(cLee).par||0) : 0;   // leeward parapet only if back wall is 1-story
    w.total = val + cPar*(pr.qLee||0);
    w.tdir=travel;
  });
  const drawn = kept.filter(w=>w.total>0);
  let alMin=Infinity, alMax=-Infinity;
  graph.nodes.forEach(p=>{ const al=along(p); if(al<alMin)alMin=al; if(al>alMax)alMax=al; });
  const lines=[];
  drawn.forEach(w=>{
    const depth=(along(w.wa)+along(w.wb))/2;
    let L=lines.find(l=>Math.abs(l.depth-depth)<0.6);
    if(!L){ L={depth, segs:[], smin:Infinity, smax:-Infinity}; lines.push(L); }
    const ws0=Math.min(sOf(w.wa),sOf(w.wb)), ws1=Math.max(sOf(w.wa),sOf(w.wb));
    const {val:base, pr}=baseOf(w.key);
    // back walls overlapping this windward wall (downwind): parapet (leeward, only if 1-story) +
    // the ½·H₂·pw accumulation (only if 2-story) + depth d.
    const backs=[];
    for(const e of graph.edges){
      if(keyOf(e)===w.key) continue;
      const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b); if(!a||!b) continue;
      if(edgeAxis(a,b)!==recv) continue;
      const d=(along(a)+along(b))/2; if(d<=depth+0.6) continue;
      const lo=Math.max(ws0,Math.min(sOf(a),sOf(b))), hi=Math.min(ws1,Math.max(sOf(a),sOf(b)));
      if(hi-lo>0.5){
        const bp=propsFor(keyOf(e)), one=isOne(keyOf(e));
        backs.push({ lo, hi, d,
                     par: one ? (bp.par||0) : 0,                  // → floor diaphragm only if 1-story
                     h2:  one ? 0 : 0.5*(bp.H2||0)*(bp.pw||0) }); // ½·H₂·pw accumulation only if 2-story
      }
    }
    const bps=new Set([ws0,ws1]);
    backs.forEach(bk=>{ if(bk.lo>ws0+1e-6&&bk.lo<ws1-1e-6)bps.add(bk.lo); if(bk.hi>ws0+1e-6&&bk.hi<ws1-1e-6)bps.add(bk.hi); });
    const pts=[...bps].sort((p,q)=>p-q);
    const interp=(s)=>{ const den=(sOf(w.wb)-sOf(w.wa))||1, f=(s-sOf(w.wa))/den;
      return { x:w.wa.x+(w.wb.x-w.wa.x)*f, y:w.wa.y+(w.wb.y-w.wa.y)*f }; };
    w.subLoads=[];
    for(let i=0;i<pts.length-1;i++){
      const a0=pts[i], a1=pts[i+1]; if(a1-a0<0.5) continue;
      const mid=(a0+a1)/2;
      let leePar=0, bestD=-Infinity;                                   // exterior (farthest) back parapet
      backs.forEach(bk=>{ if(mid>=bk.lo-1e-6&&mid<=bk.hi+1e-6&&bk.d>bestD){ bestD=bk.d; leePar=bk.par; } });
      let acc=0, nearD=Infinity;                                       // NEAREST 2-story back → one face
      backs.forEach(bk=>{ if(bk.h2>0&&mid>=bk.lo-1e-6&&mid<=bk.hi+1e-6&&bk.d<nearD){ nearD=bk.d; acc=bk.h2; } });
      const plf = base + leePar*(pr.qLee||0) + acc;
      L.segs.push({ s0:a0, s1:a1, plf });
      w.subLoads.push({ plf, len:a1-a0, a:interp(a0), b:interp(a1) });
      L.smin=Math.min(L.smin,a0); L.smax=Math.max(L.smax,a1);
    }
  });
  const divides=[];
  lines.forEach(L=>{
    L.segs.sort((p,q)=>p.s0-q.s0);
    for(let i=0;i<L.segs.length-1;i++){
      const cur=L.segs[i], nxt=L.segs[i+1];
      if(Math.abs(cur.s1-nxt.s0)<0.6 && Math.abs(cur.plf-nxt.plf)>0.5){
        const a=(cur.s1+nxt.s0)/2;
        const Pw = axis==="v" ? {x:a, y:L.depth*sign} : {x:L.depth*sign, y:a};
        divides.push({ x1:Pw.x, y1:Pw.y, x2:Pw.x+travel.x*(alMax-L.depth), y2:Pw.y+travel.y*(alMax-L.depth) });
      }
    }
  });
  const agg={}; let baseShear=0;
  lines.forEach(L=>{
    L.segs.forEach(s=> baseShear += s.plf*(s.s1-s.s0)/1000);
    const r=lineReactions(L, graph, isSup, travel, sOf, along);
    if(r.imbalance) anyImbalance=true;
    r.reactions.forEach(rr=>{
      if(!agg[rr.key]) agg[rr.key]={ key:rr.key, kips:0, ax:rr.ax, ay:rr.ay };
      agg[rr.key].kips += rr.kips;
    });
  });
  return { axis, sign, tdir:travel, windLoads:drawn, reactions:Object.values(agg),
           divides, baseShear, imbalance:anyImbalance };
}

// (rev 39) nearest 2-story wall standing DOWNWIND of a windward wall (one face), so a 1-story cut can
// draw the stepped section + the ½·H₂·pw it pours forward. Mirrors buildSecDataF1's `backs` scan.
function nearestTwoStoryBehind(key, axis, sign, graph, propsFor, isOne){
  const e0=graph.edges.find(x=>keyOf(x)===key); if(!e0) return null;
  const a0=graph.nodes.find(n=>n.id===e0.a), b0=graph.nodes.find(n=>n.id===e0.b); if(!a0||!b0) return null;
  const travel = axis==="v" ? {x:0,y:sign} : {x:sign,y:0};
  const along=(p)=> p.x*travel.x + p.y*travel.y;
  const sOf =(p)=> axis==="v" ? p.x : p.y;
  const recv = axis==="v" ? "h" : "v";
  const depth=(along(a0)+along(b0))/2;
  const ws0=Math.min(sOf(a0),sOf(b0)), ws1=Math.max(sOf(a0),sOf(b0));
  let best=null, bestD=Infinity;
  for(const e of graph.edges){
    if(keyOf(e)===key) continue;
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b); if(!a||!b) continue;
    if(edgeAxis(a,b)!==recv) continue;
    if(isOne(keyOf(e))) continue;                                  // only 2-story walls
    const d=(along(a)+along(b))/2; if(d<=depth+0.6) continue;       // downwind only
    const lo=Math.max(ws0,Math.min(sOf(a),sOf(b))), hi=Math.min(ws1,Math.max(sOf(a),sOf(b)));
    if(hi-lo>0.5 && d<bestD){ bestD=d; best=keyOf(e); }
  }
  return best ? propsFor(best) : null;
}

// (rev 40) The ORDERED run of across-wind walls an overall-building section cut crosses at across-wind
// position `sAcross`, front (windward) → back (leeward) by downwind depth. Floor-INDEPENDENT (always
// the full graph). Drives both the section TYPE (from the 1/2-story pattern: 1·2·2·1=A, 1·1=B,
// 1·2·2=C, 2·2·1=C-rev) and the SecDiagramSeq drawing. Each entry carries the wall's own props.
function sectionSequence(sAcross, axis, sign, graph, propsFor, isOne){
  if(sAcross==null || sign==null) return [];
  const travel = axis==="v" ? {x:0,y:sign} : {x:sign,y:0};
  const along=(p)=> p.x*travel.x + p.y*travel.y;
  const sOf =(p)=> axis==="v" ? p.x : p.y;
  const recv = axis==="v" ? "h" : "v";
  const hits=[];
  for(const e of graph.edges){
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b); if(!a||!b) continue;
    if(edgeAxis(a,b)!==recv) continue;
    const s0=Math.min(sOf(a),sOf(b)), s1=Math.max(sOf(a),sOf(b));
    if(sAcross < s0-0.6 || sAcross > s1+0.6) continue;     // the cut line crosses this wall
    const p=propsFor(keyOf(e));
    hits.push({ key:keyOf(e), depth:(along(a)+along(b))/2, one:!!isOne(keyOf(e)),
                H:p.H, H2:p.H2, par:p.par, pw:p.pw, qWind:p.qWind, qLee:p.qLee });
  }
  hits.sort((a,b)=>a.depth-b.depth);                        // windward (front) → leeward (back)
  return hits;
}

export {
  seismicWeight1Story, seismicWeight2Story, seismicDistribute2Story,
  findLeewardPartner, lineReactions, WIND_LOAD,
  buildSecData, buildSecDataF1, nearestTwoStoryBehind, sectionSequence,
};
