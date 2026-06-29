/* PlanSketcher.jsx — the Plan-Sketcher tab: SVG plan editor, draw/snap/dimension tooling,
   wind/seismic section handoff pipeline, and its geometry helpers (DEF_SECTION, segInt, projToSeg,
   pointAtLength, clampPtToView, pinchTransform, INIT, mergeWallProps).
   Phase-4 module split (rev 79): moved VERBATIM from plan-sketcher-suite.jsx. The nested
   computeHandoff/buildFloor pipeline is carried INTACT (Phase-5 decouple stays deferred).
   Imports the presentational pieces from planParts.jsx + the load/design engines. */
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { VB_W, VB_H, WORLD, niceStep, PRESETS, clamp, dist, edgeAxis, norm, same, keyOf, fmt1, fmt2, fmtHalf, buildFrom, sanitizeGraph, loopInfo } from "./geometry.js";
import { CSS, C_BG, C_GRID, C_WALL, C_NODE, C_LOAD, C_REACT, C_DIMBOX, C_DRAFT, C_ONESTORY, STALE_BTN, WARN } from "./theme.js";
import { seismicWeight1Story, seismicWeight2Story, seismicDistribute2Story, findLeewardPartner, buildSecData, buildSecDataF1, nearestTwoStoryBehind, sectionSequence } from "./loadEngine.js";
import { Tag, WindLoad, Reaction, WindWindow, DLTributaryWindow, GlobalInputsWindow } from "./planParts.jsx";




// a section now stores its own shared values (per wind direction)
const DEF_SECTION = { H:10, pw:16, qWind:32, qLee:22, par:5, H2:null,
                      // (rev 49) DEAD-LOAD TRIBUTARY — now a per-wall, per-floor property entered on the
                      // plan (right-click wall → "DL Tributary"), replacing the old GLOBAL Design-tab
                      // Roof/Floor trib boxes. floorTrib/roofTrib = 1st-floor (and 1-story) values;
                      // floorTrib2/roofTrib2 = 2nd-floor values (used when designing/viewing floor 2 of a
                      // 2-story building, so a stacked wall can carry a different trib on each floor).
                      // Defaults match the old global default (roof 2 ft, floor 0 ft) → untouched walls
                      // behave exactly as before. mergeWallProps fills these from DEF_SECTION, so old .wps
                      // files inherit them automatically (not part of the loadProject schema tripwire).
                      roofTrib:2, floorTrib:0, roofTrib2:2, floorTrib2:0 };  // (rev 44) default wall H=10ft, parapet=5ft. `par` = this wall's own parapet; `H2` = 2nd-story wall ht (2-story mode), null → equals H
// Normalize one stored wall-prop entry: migrate the legacy `parW` field, then MERGE ONTO
// DEF_SECTION so a saved entry that predates a future field still resolves every key (no NaN
// from an `undefined` pressure term). Behavior-identical for current entries (they override
// every DEF_SECTION key); the merge only fills keys an OLD file happens to lack. `propsFor`
// is the sole caller; kept module-scope (pure) so the load-robustness test can exercise it.
const mergeWallProps = (p) => {
  if(!p) return { ...DEF_SECTION, H2:DEF_SECTION.H };          // no saved props → H2 defaults to H
  const base = ("par" in p) ? p : { ...p, par:(p.parW!=null?p.parW:DEF_SECTION.par) };  // legacy parW → par
  const out  = { ...DEF_SECTION, ...base };
  if(out.H2==null) out.H2 = out.H;                            // unset 2nd-story ht → equals 1st-story H (old files + new walls)
  return out;
};

// segment p1p2 ∩ segment p3p4 → {pt,t} (t = param along p1→p2) or null
const segInt = (p1,p2,p3,p4) => {
  const d1x=p2.x-p1.x, d1y=p2.y-p1.y, d2x=p4.x-p3.x, d2y=p4.y-p3.y;
  const den=d1x*d2y - d1y*d2x;
  if (Math.abs(den)<1e-9) return null;
  const t=((p3.x-p1.x)*d2y-(p3.y-p1.y)*d2x)/den;
  const u=((p3.x-p1.x)*d1y-(p3.y-p1.y)*d1x)/den;
  if (t<-1e-6||t>1+1e-6||u<-1e-6||u>1+1e-6) return null;
  return { pt:{x:p1.x+t*d1x, y:p1.y+t*d1y}, t };
};

// (rev 64) Foot of the perpendicular from point p onto the segment a–b.
//   t  = parameter along a→b (UNclamped: 0..1 means the foot lies on the body; ≤0 / ≥1 means
//        it falls beyond an endpoint — the caller rejects those so we only split the body).
//   dist = perpendicular distance from p to the infinite line (the value the caller compares to
//        the snap tolerance; meaningful exactly when 0<t<1, which is the only case we accept).
const projToSeg = (p, a, b) => {
  const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
  if(L2<1e-12) return { pt:{x:a.x,y:a.y}, t:0, dist:Math.hypot(p.x-a.x,p.y-a.y) };
  const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/L2;
  const fx=a.x+t*dx, fy=a.y+t*dy;
  return { pt:{x:fx,y:fy}, t, dist:Math.hypot(p.x-fx,p.y-fy) };
};

// (rev 71) Point a fixed distance `len` from `anchor` along direction `dir` ({dx,dy}). Used by the
// Tab/dynamic-length draw input (AutoCAD-style: type a length, the next node lands exactly that far
// along the current rubber-band heading). Degenerate dir → returns the anchor unchanged.
const pointAtLength = (anchor, dir, len) => {
  const L=Math.hypot(dir.dx,dir.dy);
  if(!(L>1e-9)) return { x:anchor.x, y:anchor.y };
  return { x:anchor.x+(dir.dx/L)*len, y:anchor.y+(dir.dy/L)*len };
};

// (rev 71) Clamp a world point into the visible viewBox (minus a margin) so a label anchored to it
// can never sit off-screen. Used to keep the rubber-band length label at the edge of the view when
// the segment's midpoint scrolls out of frame (AutoCAD keeps the dynamic dimension on-screen).
const clampPtToView = (pt, view, margin=0) => ({
  x: clamp(pt.x, view.x+margin, view.x+view.w-margin),
  y: clamp(pt.y, view.y+margin, view.y+view.h-margin),
});

// (rev 71) Two-finger pinch/zoom-pan transform. Given the viewBox at gesture start (view0), the SVG
// client rect, the WORLD point under the start midpoint (midWorld), the CURRENT screen midpoint of
// the two touches, and the start/current finger spreads (d0,d), returns the new viewBox. Spreading
// the fingers (d>d0) zooms IN (smaller viewBox); the midpoint translation gives two-finger pan in
// the same gesture. Aspect is preserved; the span is clamped to [vmin,vmax]. Pure → unit-testable.
const pinchTransform = (view0, rect, midWorld, curMid, d0, d, vmin, vmax) => {
  const f = (d0>0 && d>0) ? d0/d : 1;
  const aspect = view0.h/view0.w;
  const w = clamp(view0.w*f, vmin, vmax);
  const h = w*aspect;
  const fx = rect.width  ? (curMid.x-rect.left)/rect.width  : 0.5;
  const fy = rect.height ? (curMid.y-rect.top )/rect.height : 0.5;
  return { x: midWorld.x - fx*w, y: midWorld.y - fy*h, w, h };
};

// outermost two walls a cut line crosses → {front,back} each {edge,pt} (front = lower t)
const computeCut = (line, graph) => {
  const p1={x:line.x1,y:line.y1}, p2={x:line.x2,y:line.y2};
  const hits=[];
  for (const e of graph.edges) {
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    if(!a||!b) continue;
    const r=segInt(p1,p2,a,b);
    if(r) hits.push({edge:e, t:r.t, pt:r.pt});
  }
  if(hits.length<2) return null;
  hits.sort((x,y)=>x.t-y.t);
  return { front:hits[0], back:hits[hits.length-1] };
};




const INIT = buildFrom(PRESETS.Rectangle, 0);

function PlanSketcher({ onDesignShearWalls, fileOps, registerProject, twoStory, setTwoStory, activeFloor, setActiveFloor, g, setGl, setWtotal }) {
  const [graph,    setGraph]    = useState(INIT.graph);
  const [selected, setSelected] = useState(null);
  const [menu,     setMenu]     = useState(null);
  const [dlEdit,   setDlEdit]   = useState(null);   // (rev 49) edge key whose DL-tributary window is open, or null
  const [globalInputs,setGlobalInputs]=useState(null); // (rev 56) Global Inputs window: null = closed; {H,H2,par1,par2,pw,qWind,qLee} seed = open
  const [dimEdit,  setDimEdit]  = useState(null);
  const [sections, setSections] = useState({h:null, v:null}); // {axis,sign} per orientation
  const [wallProps,setWallProps]= useState({});      // edge key -> {H,pw,qWind,qLee,parW,parL}
  const [activeWall,setActiveWall]=useState(null);   // {axis,key} | null — wall being edited
  const [draft,    setDraft]    = useState(null);    // live cut line being drawn
  const [noSupport,setNoSupport]= useState(()=>new Set()); // edge keys NOT taking point load
  const [oneStory, setOneStory] = useState(()=>new Set()); // (2-story mode) edge keys that are ONLY 1 story — they
                                                           // touch the floor diaphragm but not the roof diaphragm.
  const [snapOn,   setSnapOn]   = useState(true);
  const [ortho,    setOrtho]    = useState(true);
  const [dims,     setDims]     = useState(true);
  const [markScale,setMarkScale]= useState(1);       // on-plan MARKUP scale (toolbar ▸ Markup): scales text labels, load/reaction arrows, AND nodes together — 1 / .75 / .5 / .25 — so markup doesn't blanket a zoomed-out plan
  const [loadCase, setLoadCase] = useState("wind");  // (rev 59) on-plan load VIEW: "wind" (section-cut wind loads) or "seismic" (V/extent boundary loads, both directions)
  const [panMode,  setPanMode]  = useState(false);   // left-drag "hand" pan tool (from canvas menu)
  const [zoomEnabled,setZoomEnabled]=useState(true); // wheel-zoom master switch (canvas-menu light)
  const [panCursor,setPanCursor]=useState(false);    // true while a pan gesture is live (grab cursor)

  const svgRef   = useRef(null);
  const stageRef = useRef(null);
  const menuRef  = useRef(null);
  const idc      = useRef(INIT.nextId);
  const history  = useRef([]);
  const future   = useRef([]);   // redo stack

  const nodeDrag = useRef(null);
  const wallDrag = useRef(null);
  const secDraw  = useRef(null);   // {sx,sy,su,moved}
  const panRef   = useRef(null);   // middle-button pan gesture {sx,sy,view}
  const panModeRef = useRef(panMode);
  const zoomEnabledRef = useRef(zoomEnabled);
  const dimWrapRef = useRef(null);
  const pendingOpen = useRef(null); // axis to open after a fresh cut
  const activeWin = activeWall ? activeWall.axis : null;

  const graphRef = useRef(graph);
  const selRef   = useRef(selected);
  const sectionsRef = useRef(sections);
  useEffect(()=>{graphRef.current=graph;},[graph]);
  useEffect(()=>{selRef.current=selected;},[selected]);
  useEffect(()=>{sectionsRef.current=sections;},[sections]);
  useEffect(()=>{panModeRef.current=panMode;},[panMode]);
  useEffect(()=>{zoomEnabledRef.current=zoomEnabled;},[zoomEnabled]);

  const nodeById  = useCallback(id => graphRef.current.nodes.find(n=>n.id===id), []);
  const snapshot  = useCallback(()=>{
    history.current.push({graph:graphRef.current, sel:selRef.current});
    if (history.current.length>60) history.current.shift();
    future.current=[];                                   // a new action invalidates redo
  },[]);
  const undo = useCallback(()=>{
    const h=history.current.pop();
    if(h){ future.current.push({graph:graphRef.current, sel:selRef.current});
           setGraph(h.graph);setSelected(h.sel);setDimEdit(null); }
  },[]);
  const redo = useCallback(()=>{
    const f=future.current.pop();
    if(f){ history.current.push({graph:graphRef.current, sel:selRef.current});
           setGraph(f.graph);setSelected(f.sel);setDimEdit(null); }
  },[]);
  const toUser = useCallback(e=>{
    const svg=svgRef.current, pt=svg.createSVGPoint();
    pt.x=e.clientX; pt.y=e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  },[]);
  // ── dynamic drawing space: viewBox auto-fits the plan; sizes scale with it ──
  const fit = useMemo(()=>{
    const ns=graph.nodes;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    ns.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
    if(draft){ minX=Math.min(minX,draft.x1,draft.x2); minY=Math.min(minY,draft.y1,draft.y2);
               maxX=Math.max(maxX,draft.x1,draft.x2); maxY=Math.max(maxY,draft.y1,draft.y2); }
    if(!isFinite(minX)) return {x:0,y:0,w:VB_W,h:VB_H};
    const span=Math.max(maxX-minX, maxY-minY, 20);
    const pad=Math.max(span*0.32, 10);   // margin leaves room for load arrows + labels
    return {x:minX-pad, y:minY-pad, w:(maxX-minX)+2*pad, h:(maxY-minY)+2*pad};
  },[graph,draft]);
  const draggingRef = useRef(false);
  const SRef = useRef(1);   // graphic scale, kept fresh each render (used by draw-mode hit radius)
  const [frozenView, setFrozenView] = useState(null);   // held steady during a drag
  // userView = an explicit, persistent viewBox the user has set (wheel-zoom, middle-drag pan, or by
  // drawing). null ⇒ auto-fit to the plan. While idle it takes precedence over auto-fit, so adding
  // nodes no longer re-frames/zooms the canvas on every click. The "Fit" button clears it (auto-fit).
  const [userView, setUserView] = useState(null);
  const fitRef = useRef(fit);
  useEffect(()=>{ fitRef.current=fit; if(!draggingRef.current) setFrozenView(null); },[fit]);
  const view = frozenView || userView || fit;
  const viewRef = useRef(view); viewRef.current = view;             // current viewBox, fresh each render
  const userViewRef = useRef(userView); useEffect(()=>{userViewRef.current=userView;},[userView]);
  // freeze the CURRENT view (including any manual zoom/pan) for the duration of a drag gesture
  const freezeView = useCallback(()=>{ draggingRef.current=true; setFrozenView(viewRef.current); },[]);
  const thawView   = useCallback(()=>{ draggingRef.current=false; setFrozenView(null); },[]);
  // While dragging, if the pointer nears/passes the frozen view's edge, grow the view to keep it
  // in frame (live zoom-out). Without this the viewport caps how far one gesture can reach —
  // e.g. a wall couldn't be drawn past ~80 ft from the default preset. Self-stabilizing: each
  // event expands only enough to contain the pointer + margin.
  const expandViewTo = useCallback((u)=>{
    if(!draggingRef.current) return;
    setFrozenView(v=>{
      const cur = v || viewRef.current;
      const m = Math.max(cur.w, cur.h) * 0.05;
      const x0=Math.min(cur.x, u.x-m),       y0=Math.min(cur.y, u.y-m);
      const x1=Math.max(cur.x+cur.w, u.x+m), y1=Math.max(cur.y+cur.h, u.y+m);
      if(x0===cur.x && y0===cur.y && x1===cur.x+cur.w && y1===cur.y+cur.h) return v;
      return { x:x0, y:y0, w:x1-x0, h:y1-y0 };
    });
  },[]);
  const S = Math.max(view.w, view.h)/110;            // 1 ⇒ original feel; grows with plan
  SRef.current = S;                                   // draw-mode hit radius tracks zoom
  const gridStep = useMemo(()=>niceStep(Math.max(view.w,view.h)),[view]);
  const gridStepRef = useRef(gridStep);
  useEffect(()=>{gridStepRef.current=gridStep;},[gridStep]);

  // ── CAD-style navigation: wheel = zoom toward the cursor, "Fit" = zoom-to-extents ──
  // Both write to userView (the persistent manual view). Zoom limits keep the plan from
  // collapsing to a point or vanishing into the distance.
  const VMIN = 6, VMAX = WORLD * 3;                   // smallest / largest viewBox span (ft)
  const zoomAt = useCallback((cx, cy, factor)=>{
    const svg = svgRef.current; if(!svg) return;
    const pt = svg.createSVGPoint(); pt.x=cx; pt.y=cy;
    const u = pt.matrixTransform(svg.getScreenCTM().inverse());   // world point under the cursor
    const cur = viewRef.current;
    const aspect = cur.h / cur.w;
    let w = clamp(cur.w * factor, VMIN, VMAX);
    let h = w * aspect;                                            // preserve aspect exactly
    const fx = (u.x - cur.x) / cur.w, fy = (u.y - cur.y) / cur.h;  // cursor's fractional position
    setUserView({ x: u.x - fx*w, y: u.y - fy*h, w, h });          // keep that world point fixed
  },[]);
  // native non-passive wheel listener (React's onWheel is passive → can't preventDefault page scroll);
  // also swallow the middle-button mousedown so the browser's autoscroll puck doesn't appear on pan.
  useEffect(()=>{
    const svg = svgRef.current; if(!svg) return;
    const onWheel = (e)=>{ if(!zoomEnabledRef.current) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY>0 ? 1.12 : 1/1.12); };
    const onMid   = (e)=>{ if(e.button===1) e.preventDefault(); };
    svg.addEventListener("wheel", onWheel, { passive:false });
    svg.addEventListener("mousedown", onMid);
    return ()=>{ svg.removeEventListener("wheel", onWheel); svg.removeEventListener("mousedown", onMid); };
  },[zoomAt]);
  const zoomToFit = useCallback(()=>{ setUserView(null); },[]);   // back to auto-fit (zoom extents)
  // grow the persistent view just enough to contain a point (grow only — never recenters or zooms
  // in), so a node placed/dragged toward the edge while drawing stays visible without a jump.
  const growUserViewTo = useCallback((px,py)=>{
    setUserView(v=>{
      const cur = v || viewRef.current;
      const m = Math.max(cur.w, cur.h) * 0.06;
      const x0=Math.min(cur.x, px-m),       y0=Math.min(cur.y, py-m);
      const x1=Math.max(cur.x+cur.w, px+m), y1=Math.max(cur.y+cur.h, py+m);
      if(x0===cur.x && y0===cur.y && x1===cur.x+cur.w && y1===cur.y+cur.h) return v;
      return { x:x0, y:y0, w:x1-x0, h:y1-y0 };
    });
  },[]);

  const snap = useCallback(v=>{ const g=gridStepRef.current; return snapOn?Math.round(v/g)*g:Math.round(v*10)/10; },[snapOn]);
  const closeMenu = useCallback(()=>setMenu(null),[]);

  // Write values to the wall they physically belong to. target "self" = the active windward wall;
  // target "lee" = its back (leeward) wall, resolved live so a split back wall takes the segment
  // sitting behind this cut. One parapet per wall means no cross-syncing is needed.
  const setVals = useCallback((target, patch)=>{
    // (rev 49) An EXPLICIT edge key (the DL-tributary window, or a section-cut interior block wall)
    // edits that wall directly and does NOT require an open section cut. "self"/"lee" are relative to
    // the active windward wall, so they still do. (Pre-rev-49 this early-returned on no activeWall,
    // which would have silently dropped the DL writes opened straight from the wall menu.)
    const explicit = target && target!=="self" && target!=="lee";
    if(!explicit && !activeWall) return;
    let key = explicit ? target : activeWall.key;
    if(target==="lee"){
      const sign = sectionsRef.current[activeWall.axis] && sectionsRef.current[activeWall.axis].sign;
      key = findLeewardPartner(activeWall.key, activeWall.axis, sign, graphRef.current, activeWall.sAcross);
    }
    if(!key) return;
    setWallProps(m=>({ ...m, [key]:{ ...(m[key]||DEF_SECTION), ...patch } }));
  },[activeWall]);

  // ── set wall length (LENGTHEN semantics) ──
  // moveEnd "a"|"b": which endpoint moves; the other anchors. Chosen by which side of the
  // dimension the user clicked (nearest end moves, like AutoCAD's LENGTHEN); ties broken by
  // anchoring the better-connected end so the rest of the plan stays put.
  const applyWallLength = useCallback((edge, newLen, moveEnd="b")=>{
    if(!(newLen>0)) return;
    const g=graphRef.current;
    const a=g.nodes.find(n=>n.id===edge.a), b=g.nodes.find(n=>n.id===edge.b);
    if(!a||!b) return;
    const fixed = moveEnd==="a" ? b : a;          // anchored end
    const moved = moveEnd==="a" ? a : b;          // end that slides along the wall direction
    let dx=moved.x-fixed.x, dy=moved.y-fixed.y, L=Math.hypot(dx,dy);
    if(L<1e-6){dx=1;dy=0;L=1;}
    const nx=clamp(fixed.x+(dx/L)*newLen,-WORLD,WORLD);
    const ny=clamp(fixed.y+(dy/L)*newLen,-WORLD,WORLD);
    const movedId = moved.id;
    snapshot();
    setGraph(g=>{
      const nodes=g.nodes.map(n=>n.id===movedId?{...n,x:nx,y:ny}:n);
      if(ortho){
        for(const ed of g.edges){
          if(same(ed,edge)) continue;
          if(ed.a!==movedId&&ed.b!==movedId) continue;
          const othId=ed.a===movedId?ed.b:ed.a;
          const oth=g.nodes.find(n=>n.id===othId);
          const axis=edgeAxis(moved,oth);
          const i=nodes.findIndex(n=>n.id===othId);
          if(i>=0){nodes[i]={...nodes[i]};if(axis==="h")nodes[i].y=ny;else nodes[i].x=nx;}
        }
      }
      return{...g,nodes};
    });
    setDimEdit(null);
  },[snapshot,ortho]);

  // ── DRAW MODE — click to place straight wall segments (no curves) ──
  // First click anchors a node; each next click adds a node + wall, chaining like a polyline.
  // Clicking an existing node snaps to it (node snap beats ortho, CAD-style) so loops close
  // exactly. Ortho constrains each segment to H/V from the anchor; grid snap applies as usual.
  // Right-click ends the chain (stays in draw mode); Esc ends the chain, then exits the mode.
  const [drawMode, setDrawMode] = useState(false);
  const [drawAnchor, setDrawAnchor] = useState(null);   // node id the next wall starts from
  const [drawPrev, setDrawPrev] = useState(null);       // rubber-band preview point
  const [drawLenEdit, setDrawLenEdit] = useState(null); // (rev 71) Tab dynamic-length input {px,py,dir,val}
  const [cursorFt, setCursorFt] = useState(null);       // status-bar coordinates (ft)
  const [healNote, setHealNote] = useState(null);       // (rev 68) #stray edges repaired on the last load (toast), else null
  useEffect(()=>{ if(healNote==null) return; const t=setTimeout(()=>setHealNote(null), 7000); return ()=>clearTimeout(t); },[healNote]);
  const cursorRef = useRef(null);
  const drawModeRef = useRef(drawMode);   useEffect(()=>{drawModeRef.current=drawMode;},[drawMode]);
  const drawAnchorRef = useRef(drawAnchor); useEffect(()=>{drawAnchorRef.current=drawAnchor;},[drawAnchor]);
  const drawPrevRef = useRef(drawPrev);   useEffect(()=>{drawPrevRef.current=drawPrev;},[drawPrev]);          // (rev 71) Tab reads the live rubber-band heading off a ref (keydown closure stays stable)
  const drawLenEditRef = useRef(drawLenEdit); useEffect(()=>{drawLenEditRef.current=drawLenEdit;},[drawLenEdit]);
  // (rev 71) TOUCH / PINCH bookkeeping — all of this is gated on pointerType==="touch", so the mouse
  // path is byte-unchanged. touchPts tracks live touch points (id→client xy); pinchRef holds the
  // gesture frame once a 2nd finger lands; pendingTapRef defers draw-placement to lift (so a 2nd
  // finger can promote a tap into a pinch instead of dropping a stray node).
  const touchPts = useRef(new Map());
  const pinchRef = useRef(null);
  const pendingTapRef = useRef(null);

  // resolve a pointer event to a draw target, in priority order:
  //   1. an existing node within the pick radius → snap to it (closes loops exactly, beats ortho);
  //   2. (rev 66) the BODY of an existing wall within the pick radius → snap to the foot of the
  //      perpendicular and flag that wall for auto-split (so a click directly on a wall creates an
  //      intersection node there and splits the wall — same end-topology as the rev-64 drag bind);
  //   3. a free point, with ortho + grid snap as usual.
  const resolveDrawPoint = useCallback((e)=>{
    const u=toUser(e), g=graphRef.current;
    const R=2.4*SRef.current;
    // 1) existing-node snap — highest priority
    let nearest=null, best=R*R;
    g.nodes.forEach(n=>{ const d=(n.x-u.x)**2+(n.y-u.y)**2; if(d<best){best=d; nearest=n;} });
    if(nearest) return { node:nearest, x:nearest.x, y:nearest.y, snapped:true, splitEdge:null };
    // 2) wall-body snap — click landed on a wall line, not a node: target it for auto-split.
    //    Skip any wall the current anchor already joins (splitting one would make a sliver chain
    //    edge) — mirrors bindNodeToWall's incident-edge exclusion. Foot must be strictly interior
    //    (endpoints are node-snap territory, handled in step 1).
    const anchorId=drawAnchorRef.current;
    let bestW=null;
    for(const ed of g.edges){
      if(anchorId!==null && (ed.a===anchorId||ed.b===anchorId)) continue;
      const a=g.nodes.find(n=>n.id===ed.a), b=g.nodes.find(n=>n.id===ed.b);
      if(!a||!b) continue;
      const pr=projToSeg(u,a,b);
      if(pr.t<=1e-3||pr.t>=1-1e-3) continue;
      if(pr.dist>R) continue;
      if(!bestW||pr.dist<bestW.dist) bestW={edge:ed, pt:pr.pt, dist:pr.dist};
    }
    if(bestW) return { node:null, x:bestW.pt.x, y:bestW.pt.y, snapped:true, splitEdge:bestW.edge };
    // 3) free point — ortho + grid snap
    let x=u.x, y=u.y;
    const anchor = anchorId!==null ? g.nodes.find(n=>n.id===anchorId) : null;
    if(ortho && anchor){ if(Math.abs(u.x-anchor.x)>=Math.abs(u.y-anchor.y)) y=anchor.y; else x=anchor.x; }
    x=clamp(snap(x),-WORLD,WORLD); y=clamp(snap(y),-WORLD,WORLD);
    return { node:null, x, y, snapped:false, splitEdge:null };
  },[toUser,ortho,snap]);

  const placeDrawPoint = useCallback((e)=>{
    const pt=resolveDrawPoint(e);
    const anchorId=drawAnchorRef.current;
    growUserViewTo(pt.x, pt.y);          // keep the placed node in frame (grow only, never recenter)
    snapshot();
    // (rev 66) AUTO-SPLIT on draw: the click landed on a wall body. Create the intersection node
    // exactly on that wall, split the wall into two halves at the node, propagate the wall's
    // per-edge state to BOTH halves, and chain the anchor → new node — all in ONE setGraph (one
    // undo reverts the whole gesture). The new node now joins the two halves + the incoming wall,
    // so moving it later drags all of them. Mirrors bindNodeToWall's split/propagation, but the
    // split vertex is a fresh node placed by the draw click (not a dragged existing node).
    if(pt.splitEdge){
      const se=pt.splitEdge;
      const newId=idc.current++;
      setGraph(g=>{
        const edge=g.edges.find(ed=>same(ed,se));   // re-find in the live graph
        let nodes=[...g.nodes,{id:newId,x:pt.x,y:pt.y}];
        let edges=g.edges;
        if(edge){
          const e1=norm(edge.a,newId), e2=norm(newId,edge.b);
          edges=edges.filter(ed=>!same(ed,edge));
          if(!edges.some(ed=>same(ed,e1))) edges=[...edges,e1];
          if(!edges.some(ed=>same(ed,e2))) edges=[...edges,e2];
        }
        if(anchorId!==null && anchorId!==newId){
          const ne=norm(anchorId,newId);
          if(!edges.some(ed=>same(ed,ne))) edges=[...edges,ne];
        }
        return { nodes, edges };
      });
      const e1=norm(se.a,newId), e2=norm(newId,se.b);
      const pk=keyOf(se), k1=keyOf(e1), k2=keyOf(e2);
      setNoSupport(s=>{ if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(k1); n.add(k2); return n; });
      setOneStory(s=>{ if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(k1); n.add(k2); return n; });
      setWallProps(m=>{ if(!m[pk]) return m; const v=m[pk]; const n={...m}; n[k1]={...v}; n[k2]={...v}; delete n[pk]; return n; });
      setDrawAnchor(newId);
      return;
    }
    setGraph(g=>{
      let nodes=g.nodes, edges=g.edges, targetId;
      if(pt.node) targetId=pt.node.id;
      else { targetId=idc.current++; nodes=[...nodes,{id:targetId,x:pt.x,y:pt.y}]; }
      if(anchorId!==null && anchorId!==targetId){
        const ne=norm(anchorId,targetId);
        if(!edges.some(ed=>same(ed,ne))) edges=[...edges,ne];
      }
      setDrawAnchor(targetId);
      return { nodes, edges };
    });
  },[resolveDrawPoint,snapshot,growUserViewTo]);

  const endDrawChain = useCallback(()=>setDrawAnchor(null),[]);

  // (rev 71) DYNAMIC LENGTH (AutoCAD-style): while drawing, Tab opens a length box; Enter commits the
  // next node EXACTLY `len` ft from the anchor along the captured rubber-band heading (a typed length
  // overrides osnap, like AutoCAD). Mirrors placeDrawPoint's non-split chaining branch, but the
  // endpoint is computed from anchor+dir·len instead of the cursor, and it never auto-splits a wall.
  const commitDrawLength = useCallback((len)=>{
    const le = drawLenEditRef.current;
    const anchorId = drawAnchorRef.current;
    if(!le || anchorId==null || !(len>0)){ setDrawLenEdit(null); return; }
    const g = graphRef.current;
    const anchor = g.nodes.find(n=>n.id===anchorId);
    if(!anchor){ setDrawLenEdit(null); return; }
    const p = pointAtLength(anchor, le.dir, len);
    const nx = clamp(p.x,-WORLD,WORLD), ny = clamp(p.y,-WORLD,WORLD);
    growUserViewTo(nx,ny);             // keep the new node in frame (grow only)
    snapshot();
    const newId = idc.current++;
    setGraph(gg=>{
      const nodes=[...gg.nodes,{id:newId,x:nx,y:ny}];
      let edges=gg.edges;
      const ne=norm(anchorId,newId);
      if(!edges.some(ed=>same(ed,ne))) edges=[...edges,ne];
      return { nodes, edges };
    });
    setDrawAnchor(newId);              // chain continues from the new node
    setDrawLenEdit(null);
  },[snapshot,growUserViewTo]);

  // ── PROJECT SERIALIZATION — the shell saves/loads the whole suite; we expose our slice ──
  useEffect(()=>{
    if(!registerProject) return;
    registerProject({
      get: ()=>({ graph:sanitizeGraph(graphRef.current),   // (rev 68) never write an orphan/duplicate/self-loop edge to disk
                  wallProps, noSupport:[...noSupport], oneStory:[...oneStory], sections, nextId:idc.current,
                  // v2: the camera + working state, so a reopened file looks like where you left it
                  view:viewRef.current, selected:selRef.current,
                  drawMode:drawModeRef.current, panMode:panModeRef.current,
                  zoomEnabled:zoomEnabledRef.current, snapOn, ortho, dims, markScale, loadCase }),
      set: (s)=>{
        if(!s||!s.graph) return;
        const cleanGraph = sanitizeGraph(s.graph);   // (rev 67) self-heal orphan/duplicate/self-loop edges from any older save
        const healed = (Array.isArray(s.graph.edges)?s.graph.edges.length:0) - cleanGraph.edges.length;
        setGraph(cleanGraph);
        setHealNote(healed>0 ? healed : null);        // (rev 68) one-time toast when a loaded file was repaired

        setWallProps(s.wallProps||{});
        setNoSupport(new Set(s.noSupport||[]));
        setOneStory(new Set(s.oneStory||[]));   // old files lack it → no 1-story walls (unchanged behavior)
        setSections(s.sections||{h:null,v:null});
        idc.current = s.nextId || (Math.max(0,...s.graph.nodes.map(n=>n.id))+1);
        // transient editors never auto-reopen (modal wind window + inline dim editor)
        setActiveWall(null); setDimEdit(null); setMenu(null); setDrawPrev(null); setDrawAnchor(null); setDlEdit(null);
        setDrawLenEdit(null); pendingTapRef.current=null; pinchRef.current=null; touchPts.current.clear();   // (rev 71) drop any transient draw/touch state on load
        // v2 restores the saved camera + toggles + selection; v1/New (no view) reverts to auto-fit + defaults
        setUserView(s.view || null); setFrozenView(null);
        setSelected("selected" in s ? s.selected : null);
        setDrawMode(!!s.drawMode);
        setPanMode(!!s.panMode);
        setZoomEnabled("zoomEnabled" in s ? !!s.zoomEnabled : true);
        if("snapOn" in s) setSnapOn(!!s.snapOn);
        if("ortho" in s) setOrtho(!!s.ortho);
        if("dims" in s) setDims(!!s.dims);
        if("markScale" in s) setMarkScale(Number(s.markScale)||1);
        if("loadCase" in s) setLoadCase(s.loadCase==="seismic"?"seismic":"wind");
        else if("textScale" in s) setMarkScale(Number(s.textScale)||1);   // rev 30 key — back-compat
        history.current=[]; future.current=[];
        setPushedSig(null);                          // rev 130: New/Open → no stale-push warning until the next push (a loaded file is in sync with its own saved design)
      },
      // rev 24: let the Design tab rebuild geometry-less (stale) lines straight from the restored
      // plan. `rerun` is runDesignHandoff (regenerates geometry-complete lines from the live graph);
      // `hasReactions` says whether a rerun would actually produce any (a cut must exist). Both are
      // captured fresh because this effect has no dep array and re-registers on every render.
      rerun: runDesignHandoff,
      hasReactions: !!((secH && secH.reactions && secH.reactions.length) || (secV && secV.reactions && secV.reactions.length)),
      undo, redo,   // (rev 70) promoted to the app-level toolbar; re-registered every render so they stay current
    });
  });
  const toggleDrawMode = useCallback(()=>{
    const turningOn = !drawModeRef.current;
    // entering Draw freezes the current framing (seed userView) so each click stops re-fitting the
    // canvas; the view then only grows when you draw past its edge, or when you wheel-zoom / pan.
    if(turningOn && userViewRef.current==null) setUserView(viewRef.current);
    if(turningOn) setPanMode(false);                 // Draw and Pan are mutually exclusive
    setDrawMode(turningOn); setDrawAnchor(null); setDrawPrev(null); setMenu(null); setDimEdit(null);
  },[]);
  // PAN tool: a left-drag hand tool (complements middle-drag pan, for trackpad/no-middle-button
  // users). Mutually exclusive with Draw. Reached from the empty-area right-click "Canvas" menu.
  const togglePanMode = useCallback(()=>{
    const turningOn = !panModeRef.current;
    if(turningOn){ setDrawMode(false); setDrawAnchor(null); setDrawPrev(null); }
    setPanMode(turningOn); setMenu(null); setDimEdit(null);
  },[]);

  // ── DELETE ── (sections recompute from geometry; nothing to unbind)
  const deleteNode = useCallback(id=>{
    snapshot();
    setGraph(g=>({ nodes:g.nodes.filter(n=>n.id!==id), edges:g.edges.filter(e=>e.a!==id&&e.b!==id) }));
    setSelected(s=>s===id?null:s);
    setDimEdit(null);
  },[snapshot]);

  const deleteEdge = useCallback(edge=>{
    snapshot();
    setGraph(g=>({...g, edges:g.edges.filter(e=>!same(e,edge))}));
    setDimEdit(null);
  },[snapshot]);

  // ── SPLIT a wall ──
  const splitWall = useCallback((edge, u)=>{
    const g=graphRef.current;
    const a=g.nodes.find(n=>n.id===edge.a), b=g.nodes.find(n=>n.id===edge.b);
    if(!a||!b) return;
    let x=clamp(snap(u.x),-WORLD,WORLD), y=clamp(snap(u.y),-WORLD,WORLD);
    if(edgeAxis(a,b)==="h") y=a.y; else x=a.x;
    const id=idc.current++;
    const e1=norm(edge.a,id), e2=norm(id,edge.b);
    const newGraph={ nodes:[...g.nodes,{id,x,y}], edges:g.edges.filter(e=>!same(e,edge)).concat([e1,e2]) };
    snapshot();
    setGraph(newGraph);
    setNoSupport(s=>{ const pk=keyOf(edge); if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(keyOf(e1)); n.add(keyOf(e2)); return n; });
    setOneStory(s=>{ const pk=keyOf(edge); if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(keyOf(e1)); n.add(keyOf(e2)); return n; });
    setWallProps(m=>{ const pk=keyOf(edge); if(!m[pk]) return m; const v=m[pk]; const n={...m}; n[keyOf(e1)]={...v}; n[keyOf(e2)]={...v}; delete n[pk]; return n; });
    setSelected(id);
  },[snap,snapshot]);

  // ── (rev 64) AUTO-SPLIT on a T-intersection ──
  // When a dragged node is dropped on the BODY of another wall, bind it there: snap the node
  // exactly onto that wall, split the wall into two segments at the node, and carry the wall's
  // per-edge state (support flag, 1-story tag, section props) onto BOTH halves. The node then
  // joins all three walls, so moving it later drags the split wall with it. Mirrors splitWall's
  // three-way propagation, but the split vertex is the EXISTING dragged node (not a fresh id), so
  // the incoming wall stays attached. No extra snapshot() — the drag already pushed one history
  // entry, so a single undo reverts the whole drag-and-bind gesture.
  const bindNodeToWall = useCallback((nodeId)=>{
    const g=graphRef.current;
    const node=g.nodes.find(n=>n.id===nodeId);
    if(!node) return;
    const tol=2.4*SRef.current;          // same pick radius the draw tool uses for node snapping
    let best=null;
    for(const e of g.edges){
      if(e.a===nodeId||e.b===nodeId) continue;      // can't split a wall this node already joins
      const a=g.nodes.find(n=>n.id===e.a), b=g.nodes.find(n=>n.id===e.b);
      if(!a||!b) continue;
      const pr=projToSeg(node,a,b);
      if(pr.t<=1e-3||pr.t>=1-1e-3) continue;         // foot must be on the body, not at an endpoint
      if(pr.dist>tol) continue;
      if(!best||pr.dist<best.dist) best={edge:e, pt:pr.pt, dist:pr.dist};
    }
    if(!best) return;
    const e1=norm(best.edge.a,nodeId), e2=norm(nodeId,best.edge.b);
    if(same(e1,e2)) return;                          // degenerate guard (excluded by the t test anyway)
    const nodes=g.nodes.map(n=>n.id===nodeId?{...n,x:best.pt.x,y:best.pt.y}:n);
    let edges=g.edges.filter(e=>!same(e,best.edge));
    if(!edges.some(e=>same(e,e1))) edges=[...edges,e1];
    if(!edges.some(e=>same(e,e2))) edges=[...edges,e2];
    setGraph({nodes,edges});
    const pk=keyOf(best.edge), k1=keyOf(e1), k2=keyOf(e2);
    setNoSupport(s=>{ if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(k1); n.add(k2); return n; });
    setOneStory(s=>{ if(!s.has(pk)) return s; const n=new Set(s); n.delete(pk); n.add(k1); n.add(k2); return n; });
    setWallProps(m=>{ if(!m[pk]) return m; const v=m[pk]; const n={...m}; n[k1]={...v}; n[k2]={...v}; delete n[pk]; return n; });
  },[]);

  const connectTo = useCallback((fromId, toId)=>{
    if(graphRef.current.edges.some(e=>same(e,norm(fromId,toId)))) return;
    snapshot();
    setGraph(g=>({...g, edges:[...g.edges, norm(fromId,toId)]}));
  },[snapshot]);

  const loadPreset = name=>{
    snapshot();
    const r=buildFrom(PRESETS[name],idc.current);
    idc.current=r.nextId;
    setGraph(r.graph); setSelected(null); setDimEdit(null); setSections({h:null,v:null}); setActiveWall(null); setWallProps({}); setDlEdit(null);
    setUserView(null);   // frame the new preset (zoom-to-extents)
  };
  const clearAll=()=>{ snapshot(); setGraph({nodes:[],edges:[]}); setSelected(null); setDimEdit(null); setSections({h:null,v:null}); setActiveWall(null); setWallProps({}); setUserView(null); setDlEdit(null); };

  const removeSection = ()=>{ if(activeWin){ setSections(s=>({...s,[activeWin]:null})); setActiveWall(null); } };
  // reverse wind: flip the section's travel direction and re-point the elevation window to the
  // NEW windward wall — identical to dragging a fresh cut the other way. Each wall owns its own
  // parapet height, so values persist and simply swap windward/leeward roles (no copying).
  const reverseWind = ()=>{
    if(!activeWin) return;
    // remember the across-wind position of the current cut so the flip re-opens the segment that
    // sits at that same position on the new windward side (the old leeward, which may be split).
    let sAcross=null;
    if(activeWall){
      const e=graphRef.current.edges.find(x=>keyOf(x)===activeWall.key);
      if(e){ const a=graphRef.current.nodes.find(n=>n.id===e.a), b=graphRef.current.nodes.find(n=>n.id===e.b);
        if(a&&b) sAcross = activeWin==="v" ? (a.x+b.x)/2 : (a.y+b.y)/2; }
    }
    setSections(s=> s[activeWin]?{...s,[activeWin]:{...s[activeWin],sign:-s[activeWin].sign}}:s);
    pendingOpen.current = { axis:activeWin, sAcross };   // re-open matching segment after recompute
  };

  // ── CONTEXT MENU ──
  const openMenu = useCallback((e, payload)=>{
    e.preventDefault(); e.stopPropagation();
    setDimEdit(null);
    const r=stageRef.current.getBoundingClientRect();
    let x=e.clientX-r.left, y=e.clientY-r.top;
    x=Math.min(x, r.width-160); y=Math.min(y, r.height-100);
    const u=toUser(e);
    setMenu({...payload, x:Math.max(4,x), y:Math.max(4,y), u});
  },[toUser]);

  useEffect(()=>{
    if(!dimEdit) return;
    const h=e=>{
      if(dimWrapRef.current&&dimWrapRef.current.contains(e.target)) return;
      if(e.button===2){ setDimEdit(null); return; }
      const v=parseFloat(dimEdit.val);
      if(v>0) applyWallLength(dimEdit.edge,v,dimEdit.moveEnd); else setDimEdit(null);
    };
    window.addEventListener("pointerdown",h,true);
    return()=>window.removeEventListener("pointerdown",h,true);
  },[dimEdit, applyWallLength]);

  useEffect(()=>{
    if(!menu) return;
    const h=e=>{ if(menuRef.current&&menuRef.current.contains(e.target)) return; setMenu(null); };
    window.addEventListener("pointerdown",h);
    return()=>window.removeEventListener("pointerdown",h);
  },[menu]);

  useEffect(()=>{
    const h=e=>{
      if(e.key==="Escape"){
        if(drawLenEditRef.current){ setDrawLenEdit(null); return; }   // (rev 71) Esc closes the length box first (chain stays)
        if(drawModeRef.current){
          if(drawAnchorRef.current!==null) setDrawAnchor(null);
          else { setDrawMode(false); setDrawPrev(null); }
          return;
        }
        setSelected(null);setMenu(null);setDimEdit(null);setActiveWall(null);setPanMode(false);setDlEdit(null);
      }
      // (rev 71) Tab while drawing → open the dynamic-length box, seeded with the live rubber-band
      // length + heading. Requires an active chain (anchor placed) and a preview point. preventDefault
      // stops Tab from moving focus. Guarded so Tab inside the open box doesn't reopen it.
      else if(e.key==="Tab" && drawModeRef.current && drawAnchorRef.current!==null
              && drawPrevRef.current && !drawLenEditRef.current){
        e.preventDefault();
        const g=graphRef.current;
        const anchor=g.nodes.find(n=>n.id===drawAnchorRef.current);
        const pv=drawPrevRef.current;
        if(!anchor||!pv) return;
        const dir={dx:pv.x-anchor.x, dy:pv.y-anchor.y};
        const L=Math.hypot(dir.dx,dir.dy);
        if(!(L>1e-6)) return;                                // no heading yet (cursor on the anchor)
        let px=0, py=0;
        try{
          const m=svgRef.current.getScreenCTM(), r=stageRef.current.getBoundingClientRect();
          const sx=m.a*pv.x+m.c*pv.y+m.e, sy=m.b*pv.x+m.d*pv.y+m.f;
          px=sx-r.left; py=sy-r.top-22;
        }catch(_){}
        setDrawLenEdit({ px, py, dir, val:String(fmtHalf(L)) });
      }
      else if((e.key==="Delete"||e.key==="Backspace")&&selRef.current!==null){ e.preventDefault(); deleteNode(selRef.current); }
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"&&e.shiftKey){e.preventDefault();redo();}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"){e.preventDefault();undo();}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();fileOps&&fileOps.onSave();}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="o"){e.preventDefault();fileOps&&fileOps.onOpen();}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[deleteNode,undo,redo,fileOps]);

  // ── POINTER handlers ──
  // start a left-drag pan gesture (hand tool / pan mode). Reuses panRef (same path as middle-drag).
  const beginPan = useCallback(e=>{
    e.preventDefault(); e.stopPropagation();
    svgRef.current.setPointerCapture(e.pointerId);
    panRef.current={ sx:e.clientX, sy:e.clientY, view:viewRef.current };
    setPanCursor(true);
  },[]);
  // (rev 71) TOUCH: record a touch pointer; when a 2nd finger lands, promote to a pinch (abort any
  // in-flight single-finger gesture + pending tap, freeze the gesture frame). Returns true when the
  // event was consumed by entering pinch — every touch-capable down handler bails on true. Mouse/pen
  // events (pointerType!=="touch") return false instantly, so the desktop path is byte-unchanged.
  const touchTrack = useCallback(e=>{
    if(e.pointerType!=="touch") return false;
    touchPts.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touchPts.current.size===2){
      nodeDrag.current=null; wallDrag.current=null; secDraw.current=null; setDraft(null);
      pendingTapRef.current=null;
      if(draggingRef.current) thawView();
      const pts=[...touchPts.current.values()];
      const mid={clientX:(pts[0].x+pts[1].x)/2, clientY:(pts[0].y+pts[1].y)/2};
      pinchRef.current={ view0:viewRef.current, d0:Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y), midWorld:toUser(mid) };
      setPanCursor(false);
      return true;
    }
    return false;
  },[toUser,thawView]);
  // (rev 71) Draw-mode placement entry: a mouse click places immediately (unchanged); a touch TAP is
  // deferred to lift (pendingTapRef) with a live preview, so a quickly-following 2nd finger becomes a
  // pinch instead of dropping a stray node. Commit happens in onUp on a clean single-finger lift.
  const drawDown = useCallback(e=>{
    if(e.pointerType==="touch"){ pendingTapRef.current={x:e.clientX,y:e.clientY}; setDrawPrev(resolveDrawPoint(e)); }
    else placeDrawPoint(e);
  },[placeDrawPoint,resolveDrawPoint]);
  const onNodeLDown = useCallback((id,e)=>{
    if(e.button!==0) return;
    e.stopPropagation(); closeMenu();
    if(touchTrack(e)) return;                                // (rev 71) 2nd finger → pinch
    if(panModeRef.current){ beginPan(e); return; }          // pan tool: drag anywhere pans the view
    if(drawModeRef.current){ drawDown(e); return; }         // node snap: connect to this node (touch defers to lift)
    svgRef.current.setPointerCapture(e.pointerId);
    const me=graphRef.current.nodes.find(n=>n.id===id);
    const meta=ortho
      ? graphRef.current.edges.filter(ed=>ed.a===id||ed.b===id).map(ed=>{
          const oth=graphRef.current.nodes.find(n=>n.id===(ed.a===id?ed.b:ed.a));
          return{id:oth.id, axis:edgeAxis(me,oth)};
        })
      : [];
    nodeDrag.current={id, moved:false, sx:e.clientX, sy:e.clientY, meta};
    freezeView();
  },[closeMenu,ortho,freezeView,placeDrawPoint,beginPan,touchTrack,drawDown]);

  const onWallLDown = useCallback((edge,e)=>{
    if(e.button!==0) return;
    e.stopPropagation(); closeMenu();
    if(touchTrack(e)) return;                                // (rev 71) 2nd finger → pinch
    if(panModeRef.current){ beginPan(e); return; }          // pan tool: drag anywhere pans the view
    if(drawModeRef.current){ drawDown(e); return; }         // place a point even over a wall (touch defers to lift)
    svgRef.current.setPointerCapture(e.pointerId);
    const g=graphRef.current;
    const a=g.nodes.find(n=>n.id===edge.a), b=g.nodes.find(n=>n.id===edge.b);
    const u=toUser(e);
    wallDrag.current={aId:edge.a,bId:edge.b,ax:a.x,ay:a.y,bx:b.x,by:b.y, axis:edgeAxis(a,b), sux:u.x,suy:u.y, moved:false};
    freezeView();
  },[closeMenu,toUser,freezeView,placeDrawPoint,beginPan,touchTrack,drawDown]);

  // background drag = draw a section cut; middle-button drag (or pan tool) = pan (CAD-style)
  const onBgLDown = useCallback(e=>{
    if(e.button===1){                                       // middle button → pan the view
      e.preventDefault(); closeMenu();
      svgRef.current.setPointerCapture(e.pointerId);
      panRef.current={ sx:e.clientX, sy:e.clientY, view:viewRef.current };
      setPanCursor(true);
      return;
    }
    if(e.button!==0) return;
    closeMenu();
    if(touchTrack(e)) return;                                // (rev 71) 2nd finger → pinch
    if(panModeRef.current){ beginPan(e); return; }          // pan tool: left-drag pans the view
    if(drawModeRef.current){ drawDown(e); return; }         // draw mode: click places a node (touch defers to lift)
    svgRef.current.setPointerCapture(e.pointerId);
    secDraw.current={ su:toUser(e), sx:e.clientX, sy:e.clientY, moved:false };
    freezeView();
  },[closeMenu,toUser,freezeView,placeDrawPoint,beginPan,touchTrack,drawDown]);

  const onBgContextMenu = useCallback(e=>{
    e.preventDefault();
    if(drawModeRef.current){
      // Mid-draw: a first right-click still ends the active chain (unchanged muscle memory). Once
      // the chain is ended — or before one is started — right-click opens the Canvas menu, so
      // Draw / Pan / Zoom are reachable without leaving Draw mode.
      if(drawAnchorRef.current!==null){ endDrawChain(); return; }
      openMenu(e, { kind:"canvas" });
      return;
    }
    setSelected(null); setDimEdit(null);                    // right-click clears the selection (as before)
    openMenu(e, { kind:"canvas" });                         // …and opens the canvas tool menu
  },[endDrawChain,openMenu]);

  const onMove = useCallback(e=>{
    // (rev 71) TWO-FINGER PINCH/ZOOM-PAN — runs before every other gesture. Keeps the touch point
    // map fresh and, while a pinch is active, drives the view from the live finger spread + midpoint
    // (zoom) and the midpoint translation (pan), then bails so no single-finger logic runs.
    if(e.pointerType==="touch" && touchPts.current.has(e.pointerId)){
      touchPts.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    }
    if(pinchRef.current && touchPts.current.size>=2){
      const svg=svgRef.current; if(!svg) return;
      const pts=[...touchPts.current.values()];
      const d=Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
      const cur={x:(pts[0].x+pts[1].x)/2, y:(pts[0].y+pts[1].y)/2};
      const p=pinchRef.current;
      setUserView(pinchTransform(p.view0, svg.getBoundingClientRect(), p.midWorld, cur, p.d0, d, VMIN, VMAX));
      return;
    }
    if(panRef.current){                                   // middle-button pan: translate the view
      const p=panRef.current, svg=svgRef.current; if(!svg) return;
      const r=svg.getBoundingClientRect();
      const dx=(e.clientX-p.sx)/r.width  * p.view.w;
      const dy=(e.clientY-p.sy)/r.height * p.view.h;
      setUserView({ x:p.view.x-dx, y:p.view.y-dy, w:p.view.w, h:p.view.h });
      return;
    }
    { const u=toUser(e);                                 // status-bar cursor readout
      const cx=Math.round(u.x*10)/10, cy=Math.round(u.y*10)/10;
      if(!cursorRef.current||cursorRef.current.x!==cx||cursorRef.current.y!==cy){
        cursorRef.current={x:cx,y:cy}; setCursorFt({x:cx,y:cy});
      } }
    if(drawModeRef.current && !nodeDrag.current && !wallDrag.current && !secDraw.current){
      setDrawPrev(resolveDrawPoint(e));                     // rubber-band / snap preview
      return;
    }
    if(nodeDrag.current||wallDrag.current||secDraw.current) expandViewTo(toUser(e));
    if(nodeDrag.current){
      const nd=nodeDrag.current;
      if(!nd.moved){ const dx=e.clientX-nd.sx, dy=e.clientY-nd.sy; if(dx*dx+dy*dy>36){nd.moved=true; snapshot();} }
      if(nd.moved){
        const u=toUser(e);
        const nx=clamp(snap(u.x),-WORLD,WORLD), ny=clamp(snap(u.y),-WORLD,WORLD);
        setGraph(g=>{
          const nodes=g.nodes.map(n=>n.id===nd.id?{...n,x:nx,y:ny}:n);
          if(ortho) for(const m of nd.meta){ const i=nodes.findIndex(n=>n.id===m.id); if(i>=0){nodes[i]={...nodes[i]};if(m.axis==="h")nodes[i].y=ny;else nodes[i].x=nx;} }
          return{...g,nodes};
        });
      }
      return;
    }
    if(wallDrag.current){
      const w=wallDrag.current, u=toUser(e);
      let dx=u.x-w.sux, dy=u.y-w.suy;
      if(ortho){if(w.axis==="h") dx=0; else dy=0;}
      if(snapOn){const g=gridStepRef.current; dx=Math.round(dx/g)*g; dy=Math.round(dy/g)*g;}
      dx=clamp(dx, -WORLD-Math.min(w.ax,w.bx), WORLD-Math.max(w.ax,w.bx));
      dy=clamp(dy, -WORLD-Math.min(w.ay,w.by), WORLD-Math.max(w.ay,w.by));
      if(!w.moved&&(dx||dy)){w.moved=true; snapshot();}
      if(w.moved) setGraph(g=>({...g, nodes:g.nodes.map(n=>
        n.id===w.aId?{...n,x:w.ax+dx,y:w.ay+dy}: n.id===w.bId?{...n,x:w.bx+dx,y:w.by+dy}:n)}));
      return;
    }
    if(secDraw.current){
      const sd=secDraw.current;
      if(!sd.moved){ const dx=e.clientX-sd.sx, dy=e.clientY-sd.sy; if(dx*dx+dy*dy>20) sd.moved=true; }
      if(sd.moved){ const u=toUser(e); setDraft({x1:sd.su.x,y1:sd.su.y,x2:u.x,y2:u.y}); }
    }
  },[snapshot,toUser,snap,ortho,snapOn,expandViewTo,resolveDrawPoint]);

  const onUp = useCallback(e=>{
    // (rev 71) TOUCH lift: drop the point; if a pinch was active, end it once <2 fingers remain (don't
    // resume a drag from the surviving finger). Otherwise, a deferred draw tap commits on a clean
    // single-finger lift (small movement). All touch-only — mouse falls straight through.
    if(e.pointerType==="touch"){
      touchPts.current.delete(e.pointerId);
      svgRef.current?.releasePointerCapture?.(e.pointerId);
      if(pinchRef.current){ if(touchPts.current.size<2) pinchRef.current=null; return; }
      if(pendingTapRef.current){
        const t=pendingTapRef.current; pendingTapRef.current=null;
        if(drawModeRef.current && Math.hypot(e.clientX-t.x, e.clientY-t.y) < 12) placeDrawPoint(e);
        return;
      }
    }
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    if(panRef.current){ panRef.current=null; setPanCursor(false); return; }    // end pan (no thaw — pan doesn't freeze)
    thawView();
    if(nodeDrag.current){ const nd=nodeDrag.current; nodeDrag.current=null; if(nd.moved) bindNodeToWall(nd.id); return; }
    if(wallDrag.current){ wallDrag.current=null; return; }
    if(secDraw.current){
      const sd=secDraw.current; secDraw.current=null; setDraft(null);
      if(sd.moved){
        const u=toUser(e);
        const line={x1:sd.su.x,y1:sd.su.y,x2:u.x,y2:u.y};
        if(dist({x:line.x1,y:line.y1},{x:line.x2,y:line.y2})>4){
          const axis = Math.abs(line.x2-line.x1) >= Math.abs(line.y2-line.y1) ? "h" : "v";
          // wind travels in the drag direction (drag down = N→S, drag right = W→E)
          const sign = axis==="v" ? (line.y2>=line.y1?1:-1) : (line.x2>=line.x1?1:-1);
          // A valid section must pass through ≥2 across-wind (exterior) walls. The FIRST one the
          // cut crosses (lowest t — the drag starts on the windward side) is the EXACT windward
          // segment to open, so a cut through a split wall opens the segment it actually passes
          // through instead of always defaulting to the first segment of the line.
          const g=graphRef.current, p1={x:line.x1,y:line.y1}, p2={x:line.x2,y:line.y2};
          const recv = axis==="v" ? "h" : "v";          // across-wind walls = windward/leeward faces
          const hits=[];
          for(const ed of g.edges){
            const a=g.nodes.find(n=>n.id===ed.a), b=g.nodes.find(n=>n.id===ed.b);
            if(!a||!b||edgeAxis(a,b)!==recv) continue;
            const r=segInt(p1,p2,a,b);
            if(r) hits.push({ key:keyOf(ed), t:r.t, pt:r.pt });
          }
          if(hits.length>=2){                            // crossed windward + leeward → valid cut
            hits.sort((x,y)=>x.t-y.t);
            const sAcross = axis==="v" ? hits[0].pt.x : hits[0].pt.y;  // where the cut meets windward
            setSections(s=>({...s, [axis]:{ axis, sign }}));
            pendingOpen.current = { axis, key:hits[0].key, sAcross };
          }
          // fewer than 2 exterior walls crossed → not a section; do nothing
        }
      }
    }
  },[toUser,thawView,bindNodeToWall,placeDrawPoint]);

  const onLeave = useCallback(e=>{ onUp(e); },[onUp]);

  const onDimClick = useCallback((edge,e)=>{
    e.stopPropagation();
    if(panModeRef.current) return;                          // pan tool active → don't open dim editor
    if(touchTrack(e)) return;                               // (rev 71) 2nd finger → pinch
    if(drawModeRef.current){ drawDown(e); return; }         // draw mode: a tap over a dim label places a node (touch defers to lift)
    const g=graphRef.current;
    const a=g.nodes.find(n=>n.id===edge.a), b=g.nodes.find(n=>n.id===edge.b);
    if(!a||!b) return;
    // LENGTHEN semantics: the end nearest the click is the one that moves; when the click is
    // ambiguous (near the middle), anchor the better-connected end so the plan stays put.
    const u=toUser(e);
    const L2=(b.x-a.x)**2+(b.y-a.y)**2 || 1;
    const t=((u.x-a.x)*(b.x-a.x)+(u.y-a.y)*(b.y-a.y))/L2;     // 0 at a, 1 at b
    let moveEnd;
    if(Math.abs(t-0.5) >= 0.10) moveEnd = t<0.5 ? "a" : "b";
    else{
      const deg=(id)=>g.edges.reduce((c,ed)=>c+(ed.a===id||ed.b===id?1:0),0);
      moveEnd = deg(edge.a) <= deg(edge.b) ? "a" : "b";       // move the less-connected end
    }
    const r=stageRef.current.getBoundingClientRect();
    const m=svgRef.current.getScreenCTM();
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const sx=m.a*mx+m.c*my+m.e, sy=m.b*mx+m.d*my+m.f;
    setDimEdit({edge, moveEnd, px:sx-r.left, py:sy-r.top-18, val:String(fmtHalf(dist(a,b)))});
    setMenu(null);
  },[toUser,placeDrawPoint,touchTrack,drawDown]);

  // ── DERIVED ──
  const loop = useMemo(()=>loopInfo(graph.nodes,graph.edges),[graph]);
  const totalLen = useMemo(()=>graph.edges.reduce((s,e)=>{
    const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
    return a&&b ? s+dist(a,b) : s;
  },0),[graph]);

  const gridLines=[];
  { const x0=Math.floor(view.x/gridStep)*gridStep, xe=view.x+view.w;
    const y0=Math.floor(view.y/gridStep)*gridStep, ye=view.y+view.h;
    for(let x=x0;x<=xe;x+=gridStep) gridLines.push({x1:x,y1:view.y,x2:x,y2:ye});
    for(let y=y0;y<=ye;y+=gridStep) gridLines.push({x1:view.x,y1:y,x2:xe,y2:y}); }

  const selNode = selected!==null ? graph.nodes.find(n=>n.id===selected) : null;

  // per-orientation section render data + line load
  const isSup = useCallback((key)=>!noSupport.has(key),[noSupport]);
  // (2-story mode) a wall tagged 1-story rises only to the floor diaphragm; it never reaches the roof.
  // Step 1 is the tag + appearance only — the load/floor-view effects land in the following steps.
  const isOneStory = useCallback((key)=> twoStory && oneStory.has(key), [twoStory, oneStory]);
  const propsFor = useCallback((key)=> mergeWallProps(wallProps[key]), [wallProps]);
  // (rev 57) live 1-story seismic effective weight (W_total) from the plan geometry + the relocated
  // Roof DL / Wall DL. Reactive to graph, wall props (par/H), and g.roofDL/g.wallDL.
  const sw = useMemo(()=> seismicWeight1Story(graph, loop, propsFor, g&&g.roofDL, g&&g.wallDL),
                     [graph, loop, propsFor, g]);
  // (rev 60) lift W_total to App for the Design-tab Seismic card: 2-story now has a real per-diaphragm
  // total (sw2), so V = Cs·W shows on both tabs in either mode (was null/"—" in 2-Story before).
  // In 2-story mode the on-plan loads/reactions reflect the SELECTED floor, by feeding buildSecData a
  // floor-specific EFFECTIVE wall height (engine untouched — it reads pr.H only in the line-load term):
  //   2nd-floor plan → roof diaphragm:  H_eff = H₂            → ½·H₂·pw + parapets               (designs 2nd-floor walls)
  //   1st-floor plan → 2nd-floor diaph.: H_eff = H + 2·H₂     → ½·H·pw + H₂·pw + parapets         (designs 1st-floor walls)
  // 1-story mode passes props through unchanged (byte-identical to before).
  const propsForActive = useCallback((key)=>{
    const p = propsFor(key);
    if(!twoStory) return p;
    const H=p.H||0, H2=p.H2||0;
    return { ...p, H: activeFloor===2 ? H2 : H + 2*H2 };
  },[propsFor, twoStory, activeFloor]);
  // rev 34 — 2-story FLOOR-1 ON-PLAN LABEL (display only). The 2nd-floor diaphragm carries ONLY the
  // half-walls above and below it (½·H·pw + ½·H₂·pw); the roof diaphragm + parapets do NOT pour into
  // it — that load transfers down through the 2nd-story shear wall into the 1st-story wall as a POINT
  // load. The combined load above (H+2·H₂ via propsForActive) still drives the REACTIONS/point loads
  // (unchanged), so this floor-only value is purely what the plan LABEL shows. Uniform along a wall
  // (no leeward-parapet term → it cancels), and uses the REAL H/H₂ (not the propsForActive substitution).
  const floorDiaphragmPlf = useCallback((key)=>{
    const p = propsFor(key);
    return 0.5*(p.pw||0)*((p.H||0)+(p.H2||0));
  },[propsFor]);
  // (rev 56) GLOBAL INPUTS — open seeds each field from the building-wide CONSENSUS: if every relevant
  // wall already shares a value, show it; if walls differ (or there are none), fall back to the default.
  // par1/par2 are seeded from walls tagged 1-story / 2-story respectively (in 2-story mode), so reopening
  // reflects what's actually applied.
  const openGlobalInputs = useCallback(()=>{
    const D = DEF_SECTION;
    const keys = graphRef.current.edges.map(keyOf);
    const oneKeys = keys.filter(k=>oneStory.has(k));
    const twoKeys = keys.filter(k=>!oneStory.has(k));
    const cons = (get, ks)=>{                       // common value across ks, else null
      let v=null, first=true;
      for(const k of ks){ const val=get(propsFor(k)); if(first){ v=val; first=false; } else if(val!==v) return null; }
      return first ? null : v;
    };
    setGlobalInputs({
      H:     cons(p=>p.H,     keys)                       ?? D.H,
      H2:    cons(p=>p.H2,    keys)                       ?? D.H,            // H2 default mirrors H
      par1:  cons(p=>p.par,   twoStory ? oneKeys : keys)  ?? D.par,
      par2:  cons(p=>p.par,   twoKeys)                    ?? D.par,
      pw:    cons(p=>p.pw,    keys)                       ?? D.pw,
      qWind: cons(p=>p.qWind, keys)                       ?? D.qWind,
      qLee:  cons(p=>p.qLee,  keys)                       ?? D.qLee,
    });
  },[propsFor, oneStory, twoStory]);
  // Apply the entered values to EVERY wall's props in one setState. 1-story mode leaves H2 untouched
  // (there is no 2nd level); 2-story mode sets H + H2 on all walls and routes the parapet height by the
  // 1-story tag. Spreading the current entry first preserves per-wall DL tributary + any other fields.
  const applyGlobalInputs = useCallback((vals)=>{
    const num = (s)=> Math.max(0, parseFloat(s)||0);
    const H=num(vals.H), H2=num(vals.H2), pw=num(vals.pw), qWind=num(vals.qWind), qLee=num(vals.qLee);
    const par1=num(vals.par1), par2=num(vals.par2);
    setWallProps(prev=>{
      const next={...prev};
      for(const e of graphRef.current.edges){
        const k=keyOf(e);
        const cur = next[k] || DEF_SECTION;
        next[k] = twoStory
          ? { ...cur, H, H2, par:(oneStory.has(k) ? par1 : par2), pw, qWind, qLee }
          : { ...cur, H,      par:par1,                            pw, qWind, qLee };
      }
      return next;
    });
    setGlobalInputs(null);
  },[twoStory, oneStory]);
  const toggleSupport = useCallback((edge)=>{
    const k=keyOf(edge);
    setNoSupport(s=>{ const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  },[]);
  const toggleOneStory = useCallback((edge)=>{
    const k=keyOf(edge);
    setOneStory(s=>{ const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  },[]);
  // ── STEP 2: 2nd-floor (roof diaphragm) excludes 1-story walls ──
  // A 1-story wall stops at the floor diaphragm, so it does NOT exist on the 2nd-floor (roof) plan.
  // We feed buildSecData a FILTERED graph (full graph minus the 1-story walls + their now-orphaned
  // nodes) for the 2nd-floor view. This drops 1-story walls from windward collection, the overlap-
  // shadow test, AND lineReactions supports in ONE move — the guarded engine is untouched, it just
  // receives a smaller graph. The full graph still RENDERS every wall (green ones drawn, load-less).
  // Zeroing via propsFor would NOT work: a 1-story wall geometrically in front of the box would
  // wrongly shadow it — removing the wall from the graph is the correct fix.
  const twoStoryGraph = useMemo(()=>{
    if(!twoStory || oneStory.size===0) return graph;
    const keepE = graph.edges.filter(e=>!oneStory.has(keyOf(e)));
    const used = new Set(); keepE.forEach(e=>{ used.add(e.a); used.add(e.b); });
    return { nodes: graph.nodes.filter(n=>used.has(n.id)), edges: keepE };
  },[twoStory, oneStory, graph]);
  const twoStoryLoop = useMemo(()=>loopInfo(twoStoryGraph.nodes, twoStoryGraph.edges),[twoStoryGraph]);
  // 2nd-floor (roof) → filtered graph; 1st-floor + 1-story mode → full graph (unchanged).
  const roofView = twoStory && activeFloor===2;
  // STEP 3: 1st-floor view with ≥1 tagged 1-story wall → the mixed-height accumulation builder.
  const mixed1 = twoStory && activeFloor===1 && oneStory.size>0;
  const secGraph = roofView ? twoStoryGraph : graph;
  const secLoop  = roofView ? twoStoryLoop : loop;
  const secH = useMemo(()=> mixed1
        ? buildSecDataF1(sections.h, graph, loop, isSup, propsFor, isOneStory)
        : buildSecData(sections.h, secGraph, secLoop, isSup, propsForActive),
      [mixed1,sections.h,graph,loop,secGraph,secLoop,isSup,propsFor,propsForActive,isOneStory]);
  const secV = useMemo(()=> mixed1
        ? buildSecDataF1(sections.v, graph, loop, isSup, propsFor, isOneStory)
        : buildSecData(sections.v, secGraph, secLoop, isSup, propsForActive),
      [mixed1,sections.v,graph,loop,secGraph,secLoop,isSup,propsFor,propsForActive,isOneStory]);
  // (2-story mode) warn when EVERY wall has been tagged 1-story — then the 2nd floor has no walls.
  const allOneStory = useMemo(()=> twoStory && graph.edges.length>0
        && graph.edges.every(e=>oneStory.has(keyOf(e))), [twoStory, graph.edges, oneStory]);
  // SEISMIC distribution.  A diaphragm force F is spread as a uniform line load along the boundary
  // faces perpendicular to each direction: w = F / (projected extent ⟂ the force). Force X (axis "h")
  // → extent = Y-span (D), loads the Y-running faces; Force Y (axis "v") → extent = X-span (B), loads
  // the X-running faces. Reuses the generalized buildSecData (Option B) with a uniform load model
  // { base:()=>w, lee:()=>0 }, so the windward-collection + across-wind shadow + lineReactions geometry
  // distributes F (conserving it — the shadow filter keeps a face set whose transverse projections
  // tile the extent once) and yields wall reactions exactly like wind.
  //   1-story (rev 59): one diaphragm, F = V = Cs·W_total.
  //   2-story (rev 60): per-level weights → vertical distribution F_roof / F_floor (Phase 3), then the
  //     ACTIVE-floor force is distributed: roof view (level 2) on the 2-story-only walls (twoStoryGraph,
  //     the roof exists only there), floor view (level 1) on the full graph.
  const Cs = Number(g&&g.Cs)||0;
  const sw2 = useMemo(()=> twoStory
        ? seismicWeight2Story(graph, loop, twoStoryLoop, propsFor, isOneStory, g&&g.roofDL, g&&g.floorDL, g&&g.wallDL)
        : null, [twoStory, graph, loop, twoStoryLoop, propsFor, isOneStory, g]);
  const seis2 = useMemo(()=> seismicDistribute2Story(sw2, Cs), [sw2, Cs]);
  useEffect(()=>{ if(setWtotal) setWtotal(twoStory ? (sw2?sw2.Wtotal:null) : sw.Wtotal); },
    [twoStory, sw.Wtotal, sw2, setWtotal]);
  // the diaphragm force to distribute on the CURRENT plan view
  const Vview = twoStory ? (seis2 ? (activeFloor===2 ? seis2.Froof : seis2.Ffloor) : 0)
                         : Cs*sw.Wtotal;
  // the graph/loop the seismic diaphragm spans on this view (roof = 2-story walls only)
  const seisGraph = (twoStory && activeFloor===2) ? twoStoryGraph : graph;
  const seisLoop  = (twoStory && activeFloor===2) ? twoStoryLoop  : loop;
  const bbox = (ns)=>{ if(!ns.length) return {dx:0,dy:0};
    let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
    ns.forEach(p=>{mnX=Math.min(mnX,p.x);mnY=Math.min(mnY,p.y);mxX=Math.max(mxX,p.x);mxY=Math.max(mxY,p.y);});
    return { dx:mxX-mnX, dy:mxY-mnY }; };
  const seisExtent     = useMemo(()=> bbox(graph.nodes),      [graph.nodes]);      // full-plan bbox (1-story card)
  const twoStoryExtent = useMemo(()=> bbox(twoStoryGraph.nodes), [twoStoryGraph]); // (rev 63) 2-story sub-plan bbox — F_roof spans only this
  const seisViewExtent = useMemo(()=> bbox(seisGraph.nodes),  [seisGraph]);        // bbox of the diaphragm being drawn
  const wSeisX = seisViewExtent.dy>0 ? Vview/seisViewExtent.dy : 0;   // force-X plf (on the Y-running faces)
  const wSeisY = seisViewExtent.dx>0 ? Vview/seisViewExtent.dx : 0;   // force-Y plf (on the X-running faces)
  const seisOn = loadCase==="seismic" && Vview>0 && !!seisLoop;
  const seisModelH = useMemo(()=>({ base:()=>wSeisX, lee:()=>0 }),[wSeisX]);
  const seisModelV = useMemo(()=>({ base:()=>wSeisY, lee:()=>0 }),[wSeisY]);
  const secSeisH = useMemo(()=> seisOn ? buildSecData({axis:"h",sign:-1}, seisGraph, seisLoop, isSup, propsFor, seisModelH) : null,
        [seisOn, seisGraph, seisLoop, isSup, propsFor, seisModelH]);
  const secSeisV = useMemo(()=> seisOn ? buildSecData({axis:"v",sign:-1}, seisGraph, seisLoop, isSup, propsFor, seisModelV) : null,
        [seisOn, seisGraph, seisLoop, isSup, propsFor, seisModelV]);
  // what the canvas draws: wind sections, or the seismic ones when the Load-case toggle is on Seismic
  const showSeis = loadCase==="seismic";
  const dispH = showSeis ? secSeisH : secH;
  const dispV = showSeis ? secSeisV : secV;
  useEffect(()=>{
    const po=pendingOpen.current; if(!po) return; pendingOpen.current=null;
    const ax=po.axis; const sc=ax==="h"?secH:secV;
    const sign = sectionsRef.current[ax] && sectionsRef.current[ax].sign;
    // The section is an OVERALL-BUILDING cut: anchor its windward wall to the FULL graph at the cut
    // position, so the SAME section shows on the 1st-floor and 2nd-floor plans (rev 40). Before, the
    // 2nd-floor view's filtered windLoads dropped the 1-story windward wall → a different section.
    const seq = sectionSequence(po.sAcross, ax, sign, graphRef.current, propsFor, isOneStory);
    let key = po.key;
    if((!key || !seq.some(w=>w.key===key)) && seq.length) key = seq[0].key;   // true windward wall
    if(!key && sc && sc.windLoads.length) key = sc.windLoads[0].key;          // last-resort fallback
    if(key) setActiveWall({axis:ax, key, sAcross:po.sAcross});
  },[secH,secV]);

  // The active windward wall's leeward (back) partner — resolves the specific back segment behind
  // this cut, so the leeward parapet shown is that wall's own height (shared when the back is one
  // wall, distinct when it's split).
  const activeLeeKey = useMemo(()=> activeWall
      ? findLeewardPartner(activeWall.key, activeWall.axis, sections[activeWall.axis]&&sections[activeWall.axis].sign, graph, activeWall.sAcross)
      : null,
    [activeWall, sections, graph]);

  const activeSection = activeWall ? (()=>{
    const self = propsFor(activeWall.key);
    const lee  = activeLeeKey ? propsFor(activeLeeKey) : null;
    const sign = sections[activeWall.axis]&&sections[activeWall.axis].sign;
    // (rev 39) for a 1-story cut wall, the nearest 2-story portion DOWNWIND of it (the box) → drives
    // the stepped section drawing + the ½·H₂·pw accumulation shown in the window.
    const behind = isOneStory(activeWall.key)
      ? nearestTwoStoryBehind(activeWall.key, activeWall.axis, sign, graph, propsFor, (k)=>oneStory.has(k))
      : null;
    // (rev 40) the full ordered run of walls this overall-building cut crosses → drives SecDiagramSeq
    // + the section type (A/B/C/C-rev). Floor-independent (always the full graph at the cut position).
    const sAt = activeWall.sAcross!=null ? activeWall.sAcross
              : (()=>{ const e=graph.edges.find(x=>keyOf(x)===activeWall.key); if(!e) return null;
                       const a=graph.nodes.find(n=>n.id===e.a), b=graph.nodes.find(n=>n.id===e.b);
                       return a&&b ? (activeWall.axis==="v"?(a.x+b.x)/2:(a.y+b.y)/2) : null; })();
    const seq = sectionSequence(sAt, activeWall.axis, sign, graph, propsFor, isOneStory);
    return { H:self.H, pw:self.pw, qWind:self.qWind, qLee:self.qLee,
             par:self.par,                       // windward parapet = this wall's own
             H2:self.H2,                          // 2nd-story wall height (resolves to H when unset)
             leePar: lee ? lee.par : 0,          // leeward parapet  = back wall's own
             leeH:  lee ? lee.H   : 0,           // leeward wall height = back wall's own H (sloping roof)
             leeH2: lee ? lee.H2  : 0,           // leeward 2nd-story height = back wall's own H2 (2-story)
             behind,                              // {H2,pw,par,…} of the nearest 2-story wall behind, or null
             seq,                                 // ordered walls front→back (overall-building section)
             axis:activeWall.axis,
             sign };
  })() : null;

  // Build one shear-wall design line per point-load support wall and hand off to the Design tab:
  // full collinear extent (even when the support is split), max wall height H along it, and the
  // reaction kips it carries. Parapets are irrelevant to the shear-wall calc and are not sent.
  // rev 130 — STALE-PUSH INDICATOR (Plan→Design). `pushedSig` = the handoff signature
  // captured the last time the user pressed "Design shear walls". It is null until a push
  // (so the button is only ever red AFTER a push, per spec) and is reset on New/Open below.
  const [pushedSig, setPushedSig] = useState(null);
  // `computeHandoff` is the OLD runDesignHandoff body with NO side effect — it just returns
  // `byFloor`. The actual push (runDesignHandoff) calls it then hands off; the live signature
  // memo calls it on every relevant plan change to detect divergence. (Not a guarded engine fn.)
  const computeHandoff = useCallback(()=>{
    // rev 62/63: per-line SEISMIC reaction, computed UNCONDITIONALLY (independent of the Wind/Seismic
    // view toggle + active floor) so each design line carries its own seismic demand while the canvas
    // shows wind. vSeismic is the post-R reduced base shear (rev 61), fed straight to the engine.
    //   1-story: one map — V = Cs·W_total distributed on the full plan (rev-59 mechanism).
    //   2-story (rev 63): per-floor — F_roof on the 2-story sub-plan (the roof exists only on 2-story
    //     walls), F_floor on the full plan, using the rev-60 vertical distribution seis2.Froof/Ffloor.
    // The per-floor force is read in buildFloor and joined by axis|key (same key as the wind reaction).
    const seisMapFor = (F, fGraph, fLoop, ext) => {
      const m = {}; if(!(F>0) || !fLoop) return m;
      const wX = ext.dy>0 ? F/ext.dy : 0;   // force-X plf on the Y-running faces
      const wY = ext.dx>0 ? F/ext.dx : 0;   // force-Y plf on the X-running faces
      const sH = buildSecData({axis:"h",sign:-1}, fGraph, fLoop, isSup, propsFor, { base:()=>wX, lee:()=>0 });
      const sV = buildSecData({axis:"v",sign:-1}, fGraph, fLoop, isSup, propsFor, { base:()=>wY, lee:()=>0 });
      (sH ? sH.reactions : []).forEach(rr=>{ if(rr.kips>0) m["h|"+rr.key]=rr.kips*1000; });
      (sV ? sV.reactions : []).forEach(rr=>{ if(rr.kips>0) m["v|"+rr.key]=rr.kips*1000; });
      return m;
    };
    const Cs = Number(g&&g.Cs)||0;
    const seisMap1 = !twoStory                                       // floor-1 (or the only floor)
          ? seisMapFor(Cs*(sw?sw.Wtotal:0), graph, loop, seisExtent)
          : seisMapFor(seis2?seis2.Ffloor:0, graph, loop, seisExtent);
    const seisMap2 = twoStory                                        // floor-2 (roof) — 2-story sub-plan only
          ? seisMapFor(seis2?seis2.Froof:0, twoStoryGraph, twoStoryLoop, twoStoryExtent)
          : {};
    // Build the design lines for ONE floor: re-run the frozen wind engine with that floor's effective
    // wall height (same substitution as propsForActive), and tag each line with the floor's DESIGN
    // height (floor 2 walls are H₂ tall, floor 1 walls are H tall) and its reaction.
    const buildFloor=(floor)=>{
      const seisMap = (twoStory && floor===2) ? seisMap2 : seisMap1;   // rev 63: floor-2 → roof force map, else floor-1/1-story map
      const fg = (twoStory && floor===2) ? twoStoryGraph : graph;   // step 2: roof floor excludes 1-story walls
      const fl = (twoStory && floor===2) ? twoStoryLoop  : loop;
      const mixedF1 = twoStory && floor===1 && oneStory.size>0;       // step 3: mixed-height 1st-floor accumulation
      const pf=(key)=>{ const p=propsFor(key); if(!twoStory) return p; const H=p.H||0,H2=p.H2||0; return {...p, H: floor===2 ? H2 : H+2*H2}; };
      const scH = mixedF1 ? buildSecDataF1(sections.h, fg, fl, isSup, propsFor, isOneStory) : buildSecData(sections.h, fg, fl, isSup, pf);
      const scV = mixedF1 ? buildSecDataF1(sections.v, fg, fl, isSup, propsFor, isOneStory) : buildSecData(sections.v, fg, fl, isSup, pf);
      const lines=[];
      [["h",scH],["v",scV]].forEach(([ax,sc])=>{
        if(!sc) return;
        sc.reactions.forEach(r=>{
          if(!(r.kips>0)) return;
          const e=fg.edges.find(x=>keyOf(x)===r.key); if(!e) return;
          const ea=fg.nodes.find(n=>n.id===e.a), eb=fg.nodes.find(n=>n.id===e.b); if(!ea||!eb) return;
          const o=edgeAxis(ea,eb);
          const fixed = o==="h" ? ea.y : ea.x;
          let lo=Infinity, hi=-Infinity, Hmax=0; const ivals=[];
          fg.edges.forEach(e2=>{
            if(!isSup(keyOf(e2))) return;
            const a2=fg.nodes.find(n=>n.id===e2.a), b2=fg.nodes.find(n=>n.id===e2.b); if(!a2||!b2) return;
            if(edgeAxis(a2,b2)!==o) return;
            const f2 = o==="h" ? (a2.y+b2.y)/2 : (a2.x+b2.x)/2;
            if(Math.abs(f2-fixed)>0.75) return;
            const v0 = o==="h" ? Math.min(a2.x,b2.x) : Math.min(a2.y,b2.y);
            const v1 = o==="h" ? Math.max(a2.x,b2.x) : Math.max(a2.y,b2.y);
            lo=Math.min(lo,v0); hi=Math.max(hi,v1); ivals.push([v0,v1]);   // (rev 73) record each solid wall span
            const pp=propsFor(keyOf(e2));
            Hmax=Math.max(Hmax, (twoStory && floor===2 ? (pp.H2||0) : (pp.H||0)));   // design height per floor
          });
          if(!(hi>lo)) return;
          // (rev 73) merge the collinear support edges into SOLID RUNS in line-local coords (0 = the `a`
          // end), so the Design tab can snap a shear-wall segment INTO a real wall instead of a gap
          // (an opening between two collinear walls). Display/placement only — never read by the engine.
          ivals.sort((p,q)=>p[0]-q[0]);
          const runs=[];
          ivals.forEach(([s,e])=>{ const last=runs[runs.length-1];
            if(last && s <= last[1] + 1e-6) last[1]=Math.max(last[1], e);
            else runs.push([s, e]); });
          const runsLocal = runs.map(([s,e])=>[+(s-lo).toFixed(4), +(e-lo).toFixed(4)]);
          const a = o==="h" ? {x:lo,y:fixed} : {x:fixed,y:lo};
          const b = o==="h" ? {x:hi,y:fixed} : {x:fixed,y:hi};
          // (rev 49) carry this line's DEAD-LOAD tributary from the keyed support wall, picking the
          // floor-appropriate pair so a stacked wall can use a different trib on each floor. The rev-48
          // geometric pairing below spreads ...l, so a 1st-floor line keeps ITS trib after adopting the
          // 2nd floor's geometry. ?? falls back to the base pair for any wall missing the 2nd-floor keys.
          const wp = propsFor(r.key);
          const f2 = twoStory && floor===2;
          const roofTrib  = f2 ? (wp.roofTrib2  ?? wp.roofTrib)  : wp.roofTrib;
          const floorTrib = f2 ? (wp.floorTrib2 ?? wp.floorTrib) : wp.floorTrib;
          lines.push({ id:ax+"|"+r.key, key:r.key, windAxis:ax, o, a, b,
                       lengthFt:hi-lo, heightFt:Hmax||13, forceLbs:r.kips*1000,
                       forceLbsSeismic: seisMap[ax+"|"+r.key] || 0,   // rev 62/63: per-line seismic demand (1-story, or per-floor for 2-story)
                       roofTrib, floorTrib, runs:runsLocal });        // rev 73: solid wall runs (line-local) for default-placement snapping
        });
      });
      return lines;
    };
    const floors = twoStory ? [2,1] : [1];          // 2nd floor (roof load) + 1st floor (2nd-floor load)
    const byFloor={}; floors.forEach(f=> byFloor[f]=buildFloor(f));
    // STACK ALIGNMENT (rev 47 → rev 48): a stacked wall's 1st-floor line spans the FULL wall (built on
    // the full graph) while its 2nd-floor line spans only the 2-story sub-segment (twoStoryGraph). They
    // do NOT necessarily share an id: the collinear-support cluster (see ~line 201) keys each line to
    // its LONGEST collinear edge, which for the 1st floor is often the 1-STORY portion — so id-based
    // pairing (rev 47) missed them and left TWO independent lines. Result the user saw: the two floors'
    // shear walls didn't share a segment array (length/position edits on one floor didn't reach the
    // other) and centered in different spans (the wall "shifted" on a floor switch). Pair them
    // GEOMETRICALLY instead — each 2nd-floor line adopts the collinear 1st-floor line that contains it
    // (same orientation + wind axis + fixed coordinate; tightest span that covers the 2-story segment)
    // — then that 1st-floor line takes the 2nd floor's id + extent (a/b/lengthFt) while KEEPING its own
    // 1st-floor reaction + design height. Both floors then share ONE id (→ one segsByLine entry, so they
    // move + stretch together) and ONE geometry (→ aligned, centered identically, confined to the 2-story
    // segment). Uniform 2-story walls already coincide → pairing is an identity; 1-story-only lines find
    // no 2-story partner and are left untouched.
    if(twoStory && byFloor[1] && byFloor[2]){
      const fixedOf=(l)=> l.o==="h" ? l.a.y : l.a.x;
      const spanOf =(l)=> l.o==="h" ? [Math.min(l.a.x,l.b.x),Math.max(l.a.x,l.b.x)]
                                    : [Math.min(l.a.y,l.b.y),Math.max(l.a.y,l.b.y)];
      const claimed=new Set(), paired=new Map();
      byFloor[2].forEach(u=>{
        const [ulo,uhi]=spanOf(u);
        let best=null, bestScore=-Infinity;
        byFloor[1].forEach(l=>{
          if(claimed.has(l) || l.o!==u.o || l.windAxis!==u.windAxis) return;
          if(Math.abs(fixedOf(l)-fixedOf(u))>0.75) return;
          const [llo,lhi]=spanOf(l);
          const overlap=Math.min(lhi,uhi)-Math.max(llo,ulo);
          if(overlap<=0.5) return;
          const contains = llo<=ulo+0.5 && lhi>=uhi-0.5;
          const score=(contains?1e6:0) + overlap - l.lengthFt*0.001;   // prefer a containing, tightest line
          if(score>bestScore){ best=l; bestScore=score; }
        });
        if(best){ claimed.add(best); paired.set(best,u); }
      });
      byFloor[1]=byFloor[1].map(l=>{ const u=paired.get(l);
        return u ? { ...l, id:u.id, key:u.key, a:u.a, b:u.b, lengthFt:u.lengthFt } : l; });
    }
    return byFloor;
  },[sections, graph, loop, isSup, propsFor, twoStory, twoStoryGraph, twoStoryLoop, oneStory, isOneStory, g, sw, seisExtent, seis2, twoStoryExtent]);

  // Live signature of what a push WOULD send right now. Recomputes whenever any handoff input
  // changes (computeHandoff's identity changes with its deps). Pure-view edits (zoom, markup
  // scale, selection, snap/ortho/dims) are NOT in computeHandoff's deps, so they never trip it.
  const liveHandoffSig = useMemo(()=> JSON.stringify(computeHandoff()), [computeHandoff]);
  // RED when: we have pushed at least once AND re-pushing would change the Design tab's lines.
  const designStaleHint = pushedSig !== null && liveHandoffSig !== pushedSig;
  // The actual push: build the lines, hand them to the Design tab, and snapshot the signature
  // so the button returns to normal until the next upstream edit that would change the result.
  const runDesignHandoff = useCallback(()=>{
    if(!onDesignShearWalls) return;
    const byFloor = computeHandoff();
    onDesignShearWalls(byFloor, {nodes:graph.nodes.map(n=>({...n})), edges:graph.edges.map(e=>({...e}))});
    setPushedSig(JSON.stringify(byFloor));
  },[onDesignShearWalls, computeHandoff, graph]);

  return (
    <div className="r">
      <style>{CSS}</style>

      <div className="hd">
        <h1 className="htitle">Plan Sketcher</h1>
        <span className="htag">
          Left-drag nodes &amp; walls · Drag across empty space to cut a section · Right-click for actions
        </span>
      </div>

      {/* ── COMMAND BAR (mini-ribbon, pinned below the suite tab bar) ──
          Draft toggles (Draw/Snap/Ortho/Dims) live here ONLY; Presets live in the side panel ONLY.
          File (New/Open/Save) moved to the persistent app-level toolbar (rev 69) — accessible from every tab. ── */}
      <div className="ribbon">
        <div className="rgroup">
          <div className="rlabel">Edit</div>
          <div className="rbtns">
            {/* Undo/Redo promoted to the app-level file toolbar (rev 70); Clear stays (plan-specific). */}
            <button className="rbtn" title="Clear the plan" onClick={clearAll}>🗑 Clear</button>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Inputs</div>
          <div className="rbtns">
            <button className="rbtn"
              disabled={graph.edges.length===0}
              title={graph.edges.length===0 ? "Draw at least one wall first" : "Apply wall/parapet heights and pressures to the whole building"}
              onClick={openGlobalInputs}>⚙ Global inputs…</button>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Draft</div>
          <div className="rbtns">
            <button className={"rbtn"+(drawMode?" ron":"")} title="Draw walls — click to chain segments" onClick={toggleDrawMode}>✏ Draw</button>
            <button className={"rbtn"+(snapOn?" ron":"")} title="Snap to grid" onClick={()=>setSnapOn(v=>!v)}>⌗ Snap</button>
            <button className={"rbtn"+(ortho?" ron":"")} title="Orthogonal (90°)" onClick={()=>setOrtho(v=>!v)}>∟ Ortho</button>
            <button className={"rbtn"+(dims?" ron":"")} title="Show dimensions" onClick={()=>setDims(v=>!v)}>⟷ Dims</button>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">View</div>
          <div className="rbtns">
            <button className="rbtn" title="Zoom to fit the whole plan (resets manual zoom)" onClick={zoomToFit}>⊡ Fit</button>
            <button className="rbtn" title="Zoom in" onClick={()=>{ const r=svgRef.current?.getBoundingClientRect(); if(r) zoomAt(r.left+r.width/2, r.top+r.height/2, 1/1.25); }}>+ In</button>
            <button className="rbtn" title="Zoom out — or scroll the mouse wheel over the canvas; middle-drag to pan" onClick={()=>{ const r=svgRef.current?.getBoundingClientRect(); if(r) zoomAt(r.left+r.width/2, r.top+r.height/2, 1.25); }}>− Out</button>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Markup</div>
          <div className="rbtns">
            <select className="rsel" title="On-plan markup scale — shrink the labels, the load/reaction arrows, AND the nodes together so the markup doesn't cover a zoomed-out plan"
                    value={markScale} onChange={e=>setMarkScale(parseFloat(e.target.value))}>
              <option value="1">1×</option>
              <option value="0.75">0.75×</option>
              <option value="0.5">0.5×</option>
              <option value="0.25">0.25×</option>
            </select>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Stories</div>
          <div className="rbtns">
            <div className={"storypill"+(twoStory?" two":"")}
                 title="Switch between single-story and two-story design">
              <span className="storythumb"/>
              <button className={"storyopt"+(!twoStory?" on":"")} onClick={()=>setTwoStory(false)}>1 Story</button>
              <button className={"storyopt"+(twoStory?" on":"")} onClick={()=>setTwoStory(true)}>2 Story</button>
            </div>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Load case</div>
          <div className="rbtns">
            <div className={"storypill"+(loadCase==="seismic"?" two":"")}
                 title="Show wind loads or the seismic base-shear loads on the plan">
              <span className="storythumb"/>
              <button className={"storyopt"+(loadCase==="wind"?" on":"")} onClick={()=>setLoadCase("wind")}>Wind</button>
              <button className={"storyopt"+(loadCase==="seismic"?" on":"")} onClick={()=>setLoadCase("seismic")}>Seismic</button>
            </div>
          </div>
        </div>
        <div className="rsep"/>
        <div className="rgroup">
          <div className="rlabel">Analyze</div>
          <div className="rbtns">
            <button className="rbtn rprimary"
              title={designStaleHint ? "Plan changed since you last sent it — click to update the Design tab" : "Send point-load walls to the shear-wall designer"}
              disabled={!((secH&&secH.reactions.length)||(secV&&secV.reactions.length))}
              style={(designStaleHint && ((secH&&secH.reactions.length)||(secV&&secV.reactions.length))) ? STALE_BTN : undefined}
              onClick={runDesignHandoff}>
              {designStaleHint && WARN}⚡ Design shear walls
            </button>
          </div>
        </div>
      </div>

      <div className="layout">
        <div className="canvascol">
        {/* ── PLAN SELECTOR — directly ABOVE the drawing area (outside the canvas, so clicks never hit the SVG). Greyed/disabled until 2-Story is on. ── */}
        <div className={"floorbar"+(twoStory?"":" off")}>
          <div className="floorsel"
               title={twoStory?"Choose which plan to view":"Turn on 2 Story (top toolbar) to enable plan switching"}>
            <button className={"floortab"+(activeFloor===1?" act":"")} disabled={!twoStory}
                    onClick={()=>twoStory&&setActiveFloor(1)}>Level 1</button>
            <button className={"floortab"+(activeFloor===2?" act":"")} disabled={!twoStory}
                    onClick={()=>twoStory&&setActiveFloor(2)}>Level 2</button>
          </div>
        </div>
        <div className="stage" ref={stageRef}>
          {twoStory && (<div className="floorbadge">Level {activeFloor} <span>Plan</span></div>)}
          {healNote!=null && (<div className="healtoast" onClick={()=>setHealNote(null)} title="Click to dismiss">
            ✓ Repaired {healNote} stray edge{healNote===1?"":"s"} on load <span>— the plan boundary is now consistent</span>
          </div>)}
          {allOneStory && (<div className="allonestory-warn">⚠ All walls are 1-story — the 2nd floor has no walls.</div>)}
          <svg ref={svgRef} className="cvs" style={drawMode?{cursor:"crosshair"}:(panMode||panCursor)?{cursor:panCursor?"grabbing":"grab"}:undefined}
               viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
               onPointerDown={onBgLDown} onPointerMove={onMove} onPointerUp={onUp}
               onPointerLeave={onLeave} onContextMenu={onBgContextMenu}>
            <defs>
              <marker id="loadArr" markerWidth="6" markerHeight="6" refX="4.6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={C_LOAD}/>
              </marker>
              <marker id="reactArr" markerWidth="6.5" markerHeight="6.5" refX="5" refY="3.25" orient="auto">
                <path d="M0,0 L6.5,3.25 L0,6.5 Z" fill={C_REACT}/>
              </marker>
            </defs>

            <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={C_BG}/>
            {gridLines.map((l,i)=>(<line key={i} {...l} stroke={C_GRID} strokeWidth={0.2*S} opacity=".55"/>))}

            {/* walls */}
            {graph.edges.map(ed=>{
              const a=graph.nodes.find(n=>n.id===ed.a), b=graph.nodes.find(n=>n.id===ed.b);
              if(!a||!b) return null;
              const L=dist(a,b), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
              const editing=dimEdit&&same(dimEdit.edge,ed);
              const noPL=!isSup(keyOf(ed));
              const oneSty=isOneStory(keyOf(ed));   // (2-story mode) 1-story-only wall → green
              return(
                <g key={`e${ed.a}-${ed.b}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={oneSty?C_ONESTORY:C_WALL} strokeWidth={0.55*S} strokeLinecap="round"
                        strokeDasharray={noPL?`${1.6*S} ${1.4*S}`:undefined} opacity={noPL?0.55:1}/>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={4*S} style={{cursor:"grab"}}
                        onPointerDown={e=>onWallLDown(ed,e)} onContextMenu={e=>openMenu(e,{kind:"wall",edge:ed})}/>
                </g>
              );
            })}

            {/* draw-mode rubber band: anchor → preview, edge-pinned length, ghost node, distinct snap cue */}
            {drawMode && drawPrev && (()=>{
              const anchor = drawAnchor!==null ? graph.nodes.find(n=>n.id===drawAnchor) : null;
              const r = 1.4*S;
              return (
                <g pointerEvents="none">
                  {anchor && <line x1={anchor.x} y1={anchor.y} x2={drawPrev.x} y2={drawPrev.y}
                                   stroke={C_WALL} strokeWidth={0.45*S} strokeDasharray={`${1.6*S} ${1.2*S}`} opacity="0.85"/>}
                  {/* (rev 71) length label is CLAMPED into the visible view (minus a margin) so a long
                      line's midpoint can't scroll the dimension off-screen — it slides to the edge. */}
                  {anchor && (()=>{ const L=dist(anchor,drawPrev); if(L<0.5) return null;
                    const mx=(anchor.x+drawPrev.x)/2, my=(anchor.y+drawPrev.y)/2;
                    const vert=Math.abs(drawPrev.y-anchor.y)>Math.abs(drawPrev.x-anchor.x);
                    const lp=clampPtToView({x:mx, y:my-1.6*S}, view, Math.max(view.w,view.h)*0.05);
                    return <text x={lp.x} y={lp.y} textAnchor="middle" fontSize={1.35*S*markScale} fontWeight="700"
                                 fill={C_NODE} fontFamily="ui-monospace,Menlo,monospace"
                                 transform={vert?`rotate(-90,${lp.x},${lp.y})`:undefined}>{fmt1(L)}′</text>; })()}
                  {/* (rev 71) DISTINCT SNAP CUE — node-snap = blue square (endpoint), wall-snap = gold X
                      (point on a wall body, will auto-split), free point = the ghost node it'll place. */}
                  {drawPrev.node
                    ? <g>
                        <rect x={drawPrev.x-r} y={drawPrev.y-r} width={2*r} height={2*r} fill="none" stroke={C_NODE} strokeWidth={0.34*S}/>
                        <circle cx={drawPrev.x} cy={drawPrev.y} r={0.4*S} fill={C_NODE}/>
                      </g>
                    : drawPrev.splitEdge
                    ? <g stroke={C_DRAFT} strokeWidth={0.34*S} strokeLinecap="round">
                        <circle cx={drawPrev.x} cy={drawPrev.y} r={r} fill="none" strokeWidth={0.26*S}/>
                        <line x1={drawPrev.x-r*0.7} y1={drawPrev.y-r*0.7} x2={drawPrev.x+r*0.7} y2={drawPrev.y+r*0.7}/>
                        <line x1={drawPrev.x-r*0.7} y1={drawPrev.y+r*0.7} x2={drawPrev.x+r*0.7} y2={drawPrev.y-r*0.7}/>
                      </g>
                    : <circle cx={drawPrev.x} cy={drawPrev.y} r={0.8*S*markScale} fill={C_NODE} opacity="0.55"/>}{/* rev 32: ghost preview matches the (scaled) placed node */}
                </g>
              );
            })()}

            {/* live draft cut */}
            {draft&&(<line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke={C_DRAFT} strokeWidth={0.5*S} strokeDasharray={`${2*S} ${1.5*S}`} opacity=".7"/>)}

            {/* dashed tributary divides — where the line load changes (front node or projected
                back-wall node) — drawn from the windward face across to the leeward face.
                rev 34: hidden in 2-story FLOOR-1 view — the floor diaphragm load is uniform along
                each wall there (the parapet/leeward variation lives in the ROOF diaphragm only). */}
            {!(twoStory&&activeFloor===1&&!mixed1) && [secH,secV].filter(Boolean).flatMap(sc=>(sc.divides||[]).map((d,i)=>(
              <line key={(sc.axis)+"div"+i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                    stroke={C_LOAD} strokeWidth={0.18*S} strokeDasharray={`${1.4*S} ${1.4*S}`} opacity=".55"/>
            )))}

            {/* windward line-load graphics — one per windward wall (all legs). rev 34: in 2-story
                FLOOR-1 view the label shows the FLOOR-only diaphragm plf (½·H·pw + ½·H₂·pw); the roof
                load reaches the 1st floor through the shear walls as a point load, not the diaphragm. */}
            {dispH&&dispH.windLoads.map((wl,i)=><WindLoad key={(showSeis?"shL":"hL")+wl.key} load={wl} S={S} ts={markScale}
                 prec={showSeis?2:1}
                 displayPlf={!showSeis && twoStory&&activeFloor===1&&!mixed1 ? floorDiaphragmPlf(wl.key) : null}
                 onOpen={showSeis ? undefined : ()=>setActiveWall({axis:"h",key:wl.key})}/>)}
            {dispV&&dispV.windLoads.map((wl,i)=><WindLoad key={(showSeis?"svL":"vL")+wl.key} load={wl} S={S} ts={markScale}
                 prec={showSeis?2:1}
                 displayPlf={!showSeis && twoStory&&activeFloor===1&&!mixed1 ? floorDiaphragmPlf(wl.key) : null}
                 onOpen={showSeis ? undefined : ()=>setActiveWall({axis:"v",key:wl.key})}/>)}

            {/* aggregated reactions (a shared support wall sums contributions into one arrow) */}
            {dispH&&dispH.reactions.map((r,i)=><Reaction key={(showSeis?"shR":"hR")+i} r={r} tdir={dispH.tdir} S={S} ts={markScale}/>)}
            {dispV&&dispV.reactions.map((r,i)=><Reaction key={(showSeis?"svR":"vR")+i} r={r} tdir={dispV.tdir} S={S} ts={markScale}/>)}

            {/* load-imbalance flags */}
            {[dispH,dispV].filter(Boolean).flatMap(sc=>(sc.windLoads||[]).filter(w=>w.imbalance).map((w,i)=>{
              const mx=(w.wa.x+w.wb.x)/2, my=(w.wa.y+w.wb.y)/2;
              return <text key={(sc.axis)+i} x={mx+w.nx*4*S} y={my+w.ny*4*S} fill="#B23A2A" fontSize={1.35*S*markScale}
                           fontWeight="700" textAnchor="middle" dominantBaseline="middle">⚠ imbalance</text>;
            }))}

            {/* nodes */}
            {graph.nodes.map(p=>{
              const isSel=p.id===selected;
              return(
                <g key={p.id} style={{cursor:"grab"}} onPointerDown={e=>onNodeLDown(p.id,e)} onContextMenu={e=>openMenu(e,{kind:"node",id:p.id})}>
                  <circle cx={p.x} cy={p.y} r={3.5*S} fill="transparent"/>{/* hit-target kept full size (NOT scaled) so small nodes stay easy to click/grab */}
                  {isSel&&<circle cx={p.x} cy={p.y} r={1.8*S*markScale} fill="rgba(35,87,127,.18)"/>}
                  <circle cx={p.x} cy={p.y} r={(isSel?1.05:0.85)*S*markScale} fill={C_NODE} stroke={C_BG} strokeWidth={0.25*S*markScale}/>{/* rev 32: node dot scales with Markup (base = original pre-rev-31 size) */}
                </g>
              );
            })}

            {/* dimension labels — drawn last so the masked boxes read over any line */}
            {dims&&graph.edges.map(ed=>{
              const a=graph.nodes.find(n=>n.id===ed.a), b=graph.nodes.find(n=>n.id===ed.b);
              if(!a||!b) return null;
              const L=dist(a,b); if(L<4) return null;
              const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, isV=edgeAxis(a,b)==="v";
              const editing=dimEdit&&same(dimEdit.edge,ed);
              return(
                <g key={`d${ed.a}-${ed.b}`} style={{cursor:panMode?"grab":"text"}} onPointerDown={e=>{ if(panMode&&e.button===0){ beginPan(e); return; } e.stopPropagation(); }} onClick={e=>onDimClick(ed,e)}>
                  <Tag x={mx} y={my} text={`${fmtHalf(L)}'`} box={editing?"#9A6B1F":C_DIMBOX} S={S} ts={markScale} rot={isV?-90:0}/>
                </g>
              );
            })}
          </svg>

          {menu&&(
            <div ref={menuRef} className="cmenu" style={{left:menu.x,top:menu.y}}>
              {menu.kind==="canvas"?(
                <>
                  <div className="cmh">Canvas</div>
                  <button className={"cmi"+(drawMode?" act":"")} onClick={()=>{ toggleDrawMode(); closeMenu(); }}>
                    <span className="cmlbl">✏ Draw</span>{drawMode&&<span className="cmck">✓</span>}
                  </button>
                  <button className={"cmi"+(panMode?" act":"")} onClick={()=>{ togglePanMode(); closeMenu(); }}>
                    <span className="cmlbl">✋ Pan</span>{panMode&&<span className="cmck">✓</span>}
                  </button>
                  <button className="cmi cmzoom" onClick={()=>setZoomEnabled(v=>!v)}
                          title={zoomEnabled?"Mouse-wheel zoom is ON — click to turn off":"Mouse-wheel zoom is OFF — click to turn on"}>
                    <span className="cmlbl">🔍 Zoom (wheel)</span>
                    <span className={"cmlight"+(zoomEnabled?" on":"")}/>
                  </button>
                </>
              ):menu.kind==="node"?(
                <>
                  <div className="cmh">Node</div>
                  <button className="cmi" onClick={()=>{
                    const isSel=selRef.current===menu.id;
                    if(isSel) setSelected(null);
                    else { if(selRef.current!==null) connectTo(selRef.current,menu.id); setSelected(menu.id); }
                    closeMenu();
                  }}>{selected===menu.id?"Deselect":"Select"+(selected!==null?" & connect":"")}</button>
                  <button className="cmi del" onClick={()=>{deleteNode(menu.id);closeMenu();}}>Delete node</button>
                </>
              ):(
                <>
                  <div className="cmh">Wall</div>
                  <button className="cmi" onClick={()=>{toggleSupport(menu.edge);closeMenu();}}>
                    {isSup(keyOf(menu.edge)) ? "✓ Takes point load" : "✕ No point load"}
                  </button>
                  {twoStory && (
                    <button className="cmi" onClick={()=>{toggleOneStory(menu.edge);closeMenu();}}>
                      {oneStory.has(keyOf(menu.edge)) ? "↥ Switch to 2-story" : "↧ Switch to 1-story"}
                    </button>
                  )}
                  <button className="cmi" onClick={()=>{ setDlEdit(keyOf(menu.edge)); closeMenu(); }}>⬚ DL Tributary…</button>
                  <button className="cmi" onClick={()=>{splitWall(menu.edge,menu.u);closeMenu();}}>Add node here</button>
                  <button className="cmi del" onClick={()=>{deleteEdge(menu.edge);closeMenu();}}>Delete wall</button>
                </>
              )}
            </div>
          )}

          {dimEdit&&(
            <div ref={dimWrapRef} className="dim-input-wrap" style={{left:dimEdit.px,top:dimEdit.py}}>
              <input className="dim-inp" type="number" min="0.5" step="0.5" value={dimEdit.val} autoFocus
                     onChange={e=>setDimEdit(d=>({...d,val:e.target.value}))}
                     onKeyDown={e=>{ if(e.key==="Enter"){applyWallLength(dimEdit.edge,parseFloat(dimEdit.val),dimEdit.moveEnd);} if(e.key==="Escape"){setDimEdit(null);} }}/>
              <span className="dim-unit">ft</span>
            </div>
          )}
          {/* (rev 71) Tab dynamic-length editor: type the next segment's length; Enter commits it
              exactly along the captured rubber-band heading. Same chrome as the LENGTHEN editor. */}
          {drawLenEdit&&(
            <div className="dim-input-wrap" style={{left:drawLenEdit.px,top:drawLenEdit.py}}>
              <input className="dim-inp" type="number" min="0.5" step="0.5" value={drawLenEdit.val} autoFocus
                     onChange={e=>setDrawLenEdit(d=>({...d,val:e.target.value}))}
                     onKeyDown={e=>{
                       if(e.key==="Enter"){ const v=parseFloat(drawLenEdit.val); if(v>0) commitDrawLength(v); else setDrawLenEdit(null); }
                       else if(e.key==="Escape"){ setDrawLenEdit(null); }
                       else if(e.key==="Tab"){ e.preventDefault(); }   // keep focus in the box
                     }}/>
              <span className="dim-unit">ft</span>
            </div>
          )}
        </div>{/* /stage */}

        </div>{/* /canvascol */}

        {/* side panel */}
        <div className="panel">
          <div className="card">
            <h4>Live Metrics</h4>
            <div className="row"><span>Nodes</span><b>{graph.nodes.length}</b></div>
            <div className="row"><span>Walls</span><b>{graph.edges.length}</b></div>
            <div className="row"><span>Total wall</span><b>{Math.round(totalLen)}<small>ft</small></b></div>
            <div className="row"><span>Enclosed area</span><b>{loop?Math.round(loop.area):"—"}{loop&&<small>ft²</small>}</b></div>
          </div>

          <div className="card">
            <h4>Dead Loads</h4>
            <div className="row">
              <span>Roof DL</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" step={1} min={0} value={g?g.roofDL:0}
                  onChange={(e)=>setGl&&setGl("roofDL",parseFloat(e.target.value)||0)}
                  style={{width:64,padding:"4px 6px",border:"1px solid var(--line)",borderRadius:4,fontSize:13,textAlign:"right",color:"var(--ink)",background:"#FFFFFF"}}/>
                <small style={{color:"var(--muted)"}}>psf</small>
              </span>
            </div>
            <div className="row">
              <span>Floor DL</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" step={1} min={0} value={g?g.floorDL:0}
                  onChange={(e)=>setGl&&setGl("floorDL",parseFloat(e.target.value)||0)}
                  style={{width:64,padding:"4px 6px",border:"1px solid var(--line)",borderRadius:4,fontSize:13,textAlign:"right",color:"var(--ink)",background:"#FFFFFF"}}/>
                <small style={{color:"var(--muted)"}}>psf</small>
              </span>
            </div>
            <div className="row">
              <span>Wall DL</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" step={1} min={0} value={g?g.wallDL:0}
                  onChange={(e)=>setGl&&setGl("wallDL",parseFloat(e.target.value)||0)}
                  style={{width:64,padding:"4px 6px",border:"1px solid var(--line)",borderRadius:4,fontSize:13,textAlign:"right",color:"var(--ink)",background:"#FFFFFF"}}/>
                <small style={{color:"var(--muted)"}}>psf</small>
              </span>
            </div>
            <div className="row" style={{borderTop:"1px solid var(--line)",marginTop:4,paddingTop:6}}>
              <span>Seismic C<sub>s</sub></span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" step={0.005} min={0} value={g?(g.Cs ?? 0):0}
                  onChange={(e)=>setGl&&setGl("Cs",parseFloat(e.target.value)||0)}
                  style={{width:64,padding:"4px 6px",border:"1px solid var(--line)",borderRadius:4,fontSize:13,textAlign:"right",color:"var(--ink)",background:"#FFFFFF"}}/>
                <small style={{color:"var(--muted)",width:26}}>coef</small>
              </span>
            </div>
            <p className="hint" style={{marginTop:6,marginBottom:0}}>Roof/Floor/Wall DL feed the seismic weight (this tab) and wall uplift resistance (Design/Calc). C<sub>s</sub> sets the base shear V = C<sub>s</sub>·W.</p>
          </div>

          {!twoStory ? (
            <div className="card">
              <h4>Seismic Weight</h4>
              <div className="row"><span>Roof area</span><b>{loop?Math.round(sw.area).toLocaleString():"—"}{loop&&<small>ft²</small>}</b></div>
              <div className="row"><span>W roof</span><b>{Math.round(sw.Wroof).toLocaleString()}<small>lbs</small></b></div>
              <div className="row"><span>W wall</span><b>{Math.round(sw.Wwall).toLocaleString()}<small>lbs</small></b></div>
              <div className="row" style={{borderTop:"1px solid var(--line)",marginTop:4,paddingTop:6}}>
                <span style={{fontWeight:800}}>W total</span>
                <b style={{color:"var(--accent)"}}>{Math.round(sw.Wtotal).toLocaleString()}<small>lbs</small></b>
              </div>
              <div className="row" style={{marginTop:2}}>
                <span>Base shear V = Cs·W <span style={{color:"var(--muted)"}}>(Cs {Number(g&&g.Cs)||0})</span></span>
                <b style={{color:"var(--hot)"}}>{Math.round((Number(g&&g.Cs)||0)*sw.Wtotal).toLocaleString()}<small>lbs</small></b>
              </div>
              <div className="row" style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                <span>X-dir face load (⟂ {Math.round(seisExtent.dy)}′)</span><b style={{color:"var(--ink)"}}>{fmt2(wSeisX)}<small>plf</small></b>
              </div>
              <div className="row" style={{fontSize:11,color:"var(--muted)"}}>
                <span>Y-dir face load (⟂ {Math.round(seisExtent.dx)}′)</span><b style={{color:"var(--ink)"}}>{fmt2(wSeisY)}<small>plf</small></b>
              </div>
              <p className="hint" style={{marginTop:6,marginBottom:0}}>Toggle <b>Load case → Seismic</b> (top toolbar) to map these onto the plan boundary as plf line loads + wall reactions.</p>
              {sw.profiles.length>0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:10.5,fontWeight:800,letterSpacing:".04em",textTransform:"uppercase",color:"var(--muted)",marginBottom:4}}>By parapet profile</div>
                  {sw.profiles.map((p,i)=>(
                    <div key={i} className="row" style={{fontSize:11}}>
                      <span style={{color:"var(--muted)"}}>{fmt1(p.par)}′ par · H{fmt1(p.H)}′ · {Math.round(p.len)}′ → Hₜ {fmt1(p.htrib)}′</span>
                      <b>{Math.round(p.w).toLocaleString()}<small>lbs</small></b>
                    </div>
                  ))}
                </div>
              )}
              {!loop && <p className="hint" style={{marginTop:6,marginBottom:0}}>Close the plan boundary to get the roof area.</p>}
            </div>
          ) : (
            <div className="card">
              <h4>Seismic Weight <span style={{fontSize:10,fontWeight:600,color:"var(--muted)"}}>· 2-Story</span></h4>
              {sw2 ? (<>
                {/* per-level effective weights (area DL + tributary wall DL) */}
                <div className="row" style={{fontSize:10.5,fontWeight:800,letterSpacing:".04em",textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}><span>Level</span><span>W · h</span></div>
                <div className="row"><span>Roof (L2) <span style={{color:"var(--muted)"}}>h {fmt1(sw2.hRoof)}′</span></span><b>{Math.round(sw2.Wroof).toLocaleString()}<small>lbs</small></b></div>
                <div className="row" style={{fontSize:11,color:"var(--muted)",marginTop:-2}}>
                  <span>area {Math.round(sw2.WroofArea).toLocaleString()} + wall {Math.round(sw2.WroofWall).toLocaleString()}</span>
                </div>
                <div className="row" style={{marginTop:3}}><span>Floor (L1) <span style={{color:"var(--muted)"}}>h {fmt1(sw2.hFloor)}′</span></span><b>{Math.round(sw2.Wfloor).toLocaleString()}<small>lbs</small></b></div>
                <div className="row" style={{fontSize:11,color:"var(--muted)",marginTop:-2}}>
                  <span>area {Math.round(sw2.WfloorArea).toLocaleString()} + wall {Math.round(sw2.WfloorWall).toLocaleString()}</span>
                </div>
                <div className="row" style={{borderTop:"1px solid var(--line)",marginTop:4,paddingTop:6}}>
                  <span style={{fontWeight:800}}>W total</span>
                  <b style={{color:"var(--accent)"}}>{Math.round(sw2.Wtotal).toLocaleString()}<small>lbs</small></b>
                </div>
                <div className="row" style={{marginTop:2}}>
                  <span>Base shear V = Cs·W <span style={{color:"var(--muted)"}}>(Cs {Cs})</span></span>
                  <b style={{color:"var(--hot)"}}>{Math.round(Cs*sw2.Wtotal).toLocaleString()}<small>lbs</small></b>
                </div>
                {/* Phase 3 — vertical distribution F_x = V·(W·h)/Σ(W·h) */}
                {seis2 && (<>
                  <div className="row" style={{fontSize:10.5,fontWeight:800,letterSpacing:".04em",textTransform:"uppercase",color:"var(--muted)",marginTop:8,marginBottom:2}}><span>Story force F<sub>x</sub></span><span></span></div>
                  <div className="row"><span>F roof (L2)</span><b style={{color:"var(--ink)"}}>{Math.round(seis2.Froof).toLocaleString()}<small>lbs</small></b></div>
                  <div className="row"><span>F floor (L1)</span><b style={{color:"var(--ink)"}}>{Math.round(seis2.Ffloor).toLocaleString()}<small>lbs</small></b></div>
                  {/* Phase 4 — per-level plan plf (face load = F / extent ⟂ the force) */}
                  <div className="row" style={{fontSize:10.5,fontWeight:800,letterSpacing:".04em",textTransform:"uppercase",color:"var(--muted)",marginTop:8,marginBottom:2}}><span>Plan plf · {activeFloor===2?"Roof (L2)":"Floor (L1)"} view</span><span></span></div>
                  <div className="row" style={{fontSize:11,color:"var(--muted)"}}>
                    <span>X-dir face load (⟂ {Math.round(seisViewExtent.dy)}′)</span><b style={{color:"var(--ink)"}}>{fmt2(wSeisX)}<small>plf</small></b>
                  </div>
                  <div className="row" style={{fontSize:11,color:"var(--muted)"}}>
                    <span>Y-dir face load (⟂ {Math.round(seisViewExtent.dx)}′)</span><b style={{color:"var(--ink)"}}>{fmt2(wSeisY)}<small>plf</small></b>
                  </div>
                </>)}
                <p className="hint" style={{marginTop:6,marginBottom:0}}>The <b>Plan plf</b> follows the <b>floor selector</b> (below the canvas) — Level 2 shows the roof diaphragm, Level 1 the floor diaphragm. Toggle <b>Load case → Seismic</b> to map them onto the plan boundary as plf loads + wall reactions.</p>
                {!loop && <p className="hint" style={{marginTop:6,marginBottom:0}}>Close the plan boundary to get the diaphragm areas.</p>}
              </>) : (
                <p className="hint" style={{marginTop:0,marginBottom:0}}>Draw a closed plan to compute the per-diaphragm seismic weight.</p>
              )}
            </div>
          )}

          {(secH||secV)&&(
            <div className="card">
              <h4>Wind Line Loads</h4>
              {[["h","E–W",secH],["v","N–S",secV]].map(([o,lbl,sc])=> sc&&sc.windLoads.length?(
                <div key={o} style={{marginBottom:8}}>
                  <div className="row">
                    <span>{lbl} wind</span>
                    <b style={{color:"#9A6B1F"}}>{fmt2(sc.baseShear||0)}<small>k base shear</small></b>
                  </div>
                  <div className="row" style={{fontSize:11,color:"#6B7684"}}>
                    <span>{sc.windLoads.length} windward wall{sc.windLoads.length===1?"":"s"} · tap a load to edit</span>
                  </div>
                  {sc.imbalance && (
                    <div style={{fontSize:11,color:"#B23A2A",fontWeight:600,padding:"2px 0"}}>⚠ Load imbalance — no point-load walls</div>
                  )}
                  <div className="brow" style={{marginTop:4}}>
                    <button className="btn" onClick={()=>{ if(sc.windLoads[0]) setActiveWall({axis:o,key:sc.windLoads[0].key}); }}>Edit</button>
                    <button className="btn pink" onClick={()=>{ setSections(s=>({...s,[o]:null})); setActiveWall(a=>a&&a.axis===o?null:a); }}>Remove</button>
                  </div>
                </div>
              ):null)}
              {onDesignShearWalls && (secH&&secH.reactions.length || secV&&secV.reactions.length) ? (
                <button className="btn"
                  title={designStaleHint ? "Plan changed since you last sent it — click to update the Design tab" : undefined}
                  style={{width:"100%",marginTop:6,fontWeight:700,
                          ...(designStaleHint ? {background:STALE_BTN.background,borderColor:STALE_BTN.borderColor,color:STALE_BTN.color}
                                              : {background:"#23577F",borderColor:"#23577F",color:"#FFFFFF"})}}
                  onClick={runDesignHandoff}>
                  {designStaleHint && WARN}Design shear walls →
                </button>
              ):null}
            </div>
          )}

          <div className="card">
            <h4>Presets</h4>
            <div className="brow">{Object.keys(PRESETS).map(k=>(<button key={k} className="btn" onClick={()=>loadPreset(k)}>{k}</button>))}</div>
            <div className="brow" style={{marginTop:6}}>
              <button className="btn" onClick={undo}>Undo</button>
            </div>
          </div>

          <div className="card">
            <p className="hint">
              <b>✏ Draw walls</b>: click to chain straight walls; click an existing node to connect/close; right-click ends the chain, then right-click again opens the Canvas menu; Esc exits.<br/>
              <b>Left-drag</b> nodes/walls to move.<br/>
              <b>Drag across empty space</b> in a direction to set the wind — it loads every windward wall in that direction.<br/>
              <b>Right-click</b> a node (select/connect/delete) or wall (add node/delete); <b>right-click empty space</b> for the Canvas menu — Draw, Pan (left-drag hand tool), and a Zoom toggle (green light = wheel-zoom on).<br/>
              <b>Click a dimension</b> to edit length.<br/>
              <b>Navigate</b>: scroll the mouse wheel to zoom toward the cursor (toggle in the Canvas menu), middle-drag <i>or</i> the Pan tool to pan, <b>⊡ Fit</b> to frame the whole plan.
            </p>
          </div>
        </div>
      </div>

      {/* ── STATUS BAR — coordinates, mode, toggles, plan stats ── */}
      <div className="statusbar">
        <span className="stcoord">{cursorFt ? `X ${cursorFt.x.toFixed(1)}′  Y ${cursorFt.y.toFixed(1)}′` : "X —  Y —"}</span>
        <span className={"stmode"+(drawMode?" draw":panMode?" pan":"")}>{drawMode ? (drawAnchor!==null?"DRAW · chaining":"DRAW") : panMode ? "PAN" : "SELECT"}</span>
        <span className={"stflag"+(snapOn?" on":"")} onClick={()=>setSnapOn(v=>!v)}>SNAP</span>
        <span className={"stflag"+(ortho?" on":"")} onClick={()=>setOrtho(v=>!v)}>ORTHO</span>
        <span className="stright">
          {graph.edges.length} walls · {Math.round(totalLen)}′
          {secH&&secH.windLoads.length?` · E–W ${fmt2(secH.baseShear||0)}k`:""}
          {secV&&secV.windLoads.length?` · N–S ${fmt2(secV.baseShear||0)}k`:""}
        </span>
      </div>

      {activeWall&&activeSection&&(
        <WindWindow key={activeWall.key+"|"+(activeLeeKey||"")} section={activeSection}
                    setVals={setVals} onReverse={reverseWind}
                    onClose={()=>setActiveWall(null)} onRemove={removeSection}
                    twoStory={twoStory} oneStory={isOneStory(activeWall.key)}/>
      )}

      {dlEdit&&(
        <DLTributaryWindow key={dlEdit+"|"+activeFloor+"|"+(isOneStory(dlEdit)?"1s":"2s")} wprops={propsFor(dlEdit)}
                    twoStory={twoStory} activeFloor={activeFloor} oneStory={isOneStory(dlEdit)}
                    onSet={(patch)=>setVals(dlEdit, patch)} onClose={()=>setDlEdit(null)}/>
      )}

      {globalInputs&&(
        <GlobalInputsWindow key={twoStory?"gi2":"gi1"} seed={globalInputs} twoStory={twoStory}
                    hasOneStory={oneStory.size>0}
                    onApply={applyGlobalInputs} onClose={()=>setGlobalInputs(null)}/>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PLYWOOD SHEAR WALL MODULE (merged from shear-wall-calculator)
   Engine is a verbatim port of "Plywood Shear Wall - Wood Studs.xlsx" — as of
   the rev-33 split it lives in ./calcCore.js (calcSegment, generateDesign,
   baseDesignSeg, schedFor, HD_TABLE, NAIL_EDGE, CODES, isNum, xMax, numOr0,
   imported at the top of this file). The engine is byte-identical to before.
   Calculation Sheet tab: unchanged logic, restyled to the sketcher theme.
   Design tab: rebuilt around the sketcher plan — per-line optimization,
   drag-in-plan shear walls, right-click overrides (holdown/nailing/post).
   ════════════════════════════════════════════════════════════════════════ */

export {
  DEF_SECTION, mergeWallProps, segInt, projToSeg, pointAtLength, clampPtToView, pinchTransform, computeCut, INIT, PlanSketcher,
};
