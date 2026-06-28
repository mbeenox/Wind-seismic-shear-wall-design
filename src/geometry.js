/* geometry.js — pure geometry / graph helpers + plan constants.
   Phase-1 module split (rev 75): moved VERBATIM from plan-sketcher-suite.jsx.
   No React, no engine math, no behavior change — relocation only. */

// ── geometry space: 1 unit = 1 ft ──────────────────────────────────────────
const VB_W = 100, VB_H = 75, GRID = 5, PAD = 2;
const WORLD = 4000;            // plan coords may span -WORLD..+WORLD (origin is arbitrary)
// pick a "nice" grid step so a plan of any size shows a sensible number of lines
const niceStep = (span) => {
  const steps=[0.5,1,2,5,10,25,50,100,250,500,1000];   // rev 64: 0.5 ft is now the finest grid/snap increment (was 1 ft)
  const target=span/22;        // aim for ~22 divisions across the view
  for(const s of steps) if(s>=target) return s;
  return 1000;
};

const PRESETS = {
  Rectangle: [{ x:20,y:18 },{ x:80,y:18 },{ x:80,y:57 },{ x:20,y:57 }],
  "L-shape":  [{ x:20,y:15 },{ x:60,y:15 },{ x:60,y:38 },{ x:80,y:38 },{ x:80,y:60 },{ x:20,y:60 }],
  "U-shape":  [{ x:20,y:15 },{ x:40,y:15 },{ x:40,y:45 },{ x:60,y:45 },{ x:60,y:15 },{ x:80,y:15 },{ x:80,y:60 },{ x:20,y:60 }],
  Triangle:   [{ x:50,y:15 },{ x:80,y:60 },{ x:20,y:60 }],
};

// ── helpers ────────────────────────────────────────────────────────────────
const clamp   = (v,lo,hi) => Math.min(hi, Math.max(lo, v));
const dist    = (a,b)     => Math.hypot(b.x-a.x, b.y-a.y);
const edgeAxis= (a,b)     => Math.abs(b.x-a.x) >= Math.abs(b.y-a.y) ? "h" : "v";
const norm    = (a,b)     => a < b ? {a,b} : {a:b,b:a};
const same    = (e1,e2)   => e1 && e2 && e1.a===e2.a && e1.b===e2.b;
const keyOf   = (e)       => `${e.a}-${e.b}`;
const fmt1    = (n)       => Math.round(n*10)/10;
const fmt2    = (n)       => Math.round(n*100)/100;
const fmtHalf = (n)       => Math.round(n*2)/2;   // rev 64: snap a dimension label to the nearest 0.5 ft (e.g. 10.5)
// text rotation that keeps labels parallel to a wall and upright (-90..90]
const wallAng = (dx,dy)=>{ let a=Math.atan2(dy,dx)*180/Math.PI; a=((a+90)%180+180)%180-90; return a; };

const buildFrom = (pts, startId) => ({
  graph: {
    nodes: pts.map((p,i)=>({ id:startId+i, ...p })),
    edges: pts.map((_,i)=>norm(startId+i, startId+(i+1)%pts.length)),
  },
  nextId: startId + pts.length,
});

// (rev 67) GRAPH SANITIZER — the perimeter tracer below (and the seismic roof area + plf that
// depend on it) hard-fail if the graph carries an ORPHAN edge (one whose endpoint node was deleted
// without the edge being removed), a duplicate edge, or a self-loop. Such a stray edge is invisible
// on the canvas but pushes a node off degree-2 / makes edges≠nodes, so loopInfo returns null and the
// roof area silently reads blank with W_roof=0. This pure helper drops exactly those defects and
// nothing else: a well-formed closed plan passes through UNCHANGED (so a valid graph's area is
// byte-identical to before). Applied (a) on .wps load, so any already-saved corrupt file self-heals
// and a re-save is clean, and (b) inside loopInfo, so even a transient in-session stray edge can't
// blank the area. It does NOT alter node positions or add geometry.
const sanitizeGraph = (graph) => {
  if(!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return graph;
  const ids = new Set(graph.nodes.map(n=>n.id));
  const seen = new Set();
  const edges = [];
  for(const e of graph.edges){
    if(!e || e.a===e.b) continue;                 // drop self-loops
    if(!ids.has(e.a) || !ids.has(e.b)) continue;  // drop orphan edges (endpoint node missing)
    const k = keyOf(norm(e.a,e.b));               // normalized key → dedupe undirected duplicates
    if(seen.has(k)) continue;
    seen.add(k); edges.push(e);
  }
  // preserve object identity when nothing changed (avoids needless re-renders / memo churn)
  return edges.length===graph.edges.length ? graph : { ...graph, edges };
};

const loopInfo = (nodes, edges) => {
  // (rev 67) heal an orphan/duplicate/self-loop edge before tracing, so a closed plan that carries
  // an invisible stray edge still yields its area. A clean ring is unaffected (sanitize is a no-op).
  ({ nodes, edges } = sanitizeGraph({ nodes, edges }));
  const n = nodes.length;
  if (n < 3 || edges.length !== n) return null;
  const adj = new Map(nodes.map(nd=>[nd.id,[]]));
  for (const e of edges) {
    if (!adj.has(e.a)||!adj.has(e.b)) return null;
    adj.get(e.a).push(e.b); adj.get(e.b).push(e.a);
  }
  for (const nd of nodes) if (adj.get(nd.id).length !== 2) return null;
  const order=[], byId = id => nodes.find(nd=>nd.id===id);
  let prev=null, cur=nodes[0].id;
  for (let k=0;k<n;k++) {
    order.push(cur);
    const nb=adj.get(cur), nxt=nb[0]!==prev?nb[0]:nb[1];
    prev=cur; cur=nxt;
  }
  if (cur!==nodes[0].id || new Set(order).size!==n) return null;
  const ring=order.map(byId);
  let a=0;
  for (let i=0;i<ring.length;i++) { const p=ring[i],q=ring[(i+1)%ring.length]; a+=p.x*q.y-q.x*p.y; }
  return { area:Math.abs(a)/2, ring };
};

// ray-cast point-in-polygon (works for concave rings like U / L shapes)
const pointInRing = (px,py,ring) => {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i].x, yi=ring[i].y, xj=ring[j].x, yj=ring[j].y;
    if(((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
};

export {
  VB_W, VB_H, GRID, PAD, WORLD, niceStep, PRESETS,
  clamp, dist, edgeAxis, norm, same, keyOf, fmt1, fmt2, fmtHalf, wallAng,
  buildFrom, sanitizeGraph, loopInfo, pointInRing,
};
