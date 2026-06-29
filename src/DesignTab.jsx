/* DesignTab.jsx — the Design (shear-wall placement) tab + its dark UI atoms.
   Phase-4 module split (rev 79): React components moved VERBATIM from plan-sketcher-suite.jsx.
   Owns the dark Design-view atoms (Chip/Row/SwField/PinCard/swBtn/selStyle…), the grid-letter
   helper colName, and DesignPlan/SwCtxMenu/DesignTab. Imports fmt + LtCollapse from CalcSheet.jsx. */
import React, { useState, useRef, useMemo, useEffect } from "react";
import { dist } from "./geometry.js";
import { C_BG, SW, MONO, STALE_BTN, WARN, LT } from "./theme.js";
import { schedFor, NAIL_EDGE, HD_TABLE, isNum, xMax, generateDesign } from "./calcCore.js";
import { calcPushSig, optimizeSig, lineResults, stackedLineResults, snapSegsToRuns, generateStackedDesign } from "./designEngine.js";
import { fmt, LtCollapse } from "./CalcSheet.jsx";


// (rev 72) Spreadsheet-style column name for a 1-based index: 1→A, 26→Z, 27→AA … Used to letter the
// E–W (horizontal) grid lines in the Design tab. Pure → unit-testable.
const colName = (n) => { let s=""; let k=Math.max(1,Math.floor(n)); while(k>0){ const r=(k-1)%26; s=String.fromCharCode(65+r)+s; k=Math.floor((k-1)/26); } return s; };

function Chip({ v, d = 0, suffix = "" }) {
  let bg = "transparent", color = SW.ink, text = fmt(v, d);
  if (v === "FAILED!!!" || v === "NG!" || v === "NG!!") { bg = SW.redSoft; color = SW.red; }
  else if (v === "neglect") { bg = SW.amberSoft; color = SW.amber; }
  else if (v === "None" || v === "—" || v === "Simpson" || v === "Threaded") { color = SW.faint; }
  else if (v === "OK") { bg = SW.greenSoft; color = SW.green; }
  return (
    <span style={{ background:bg, color, fontFamily:MONO, fontSize:12, padding:bg==="transparent"?0:"1px 6px", borderRadius:3, whiteSpace:"nowrap", fontWeight:bg!=="transparent"?600:400 }}>
      {text}{suffix && isNum(v) ? suffix : ""}
    </span>
  );
}
function Row({ label, unit, cells, render }) {
  return (
    <tr style={{ borderBottom: `1px solid ${SW.rule}` }}>
      <td style={{ padding:"5px 10px", fontSize:12, color:SW.ink, whiteSpace:"nowrap" }}>
        {label} {unit && <span style={{ color:SW.faint, fontSize:11 }}>({unit})</span>}
      </td>
      {cells.map((r, i) => (
        <td key={i} style={{ padding:"5px 8px", textAlign:"right" }}>
          {r.active ? render(r, i) : <span style={{ color:SW.rule }}>·</span>}
        </td>
      ))}
    </tr>
  );
}
function SectionTitle({ children, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"26px 0 8px" }}>
      <span style={{ width:6, height:6, background:SW.accent, display:"inline-block", flex:"none" }} aria-hidden="true"/>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:SW.accent }}>{children}</div>
      <div style={{ flex:1, height:1, background:SW.rule }} />
      {right}
    </div>
  );
}
function NumInput({ value, onChange, step = 1, width = 64, style }) {
  return (
    <input type="number" step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{ width, padding:"3px 6px", border:`1px solid ${SW.rule}`, borderRadius:4, fontFamily:MONO, fontSize:12,
               textAlign:"right", color:SW.accent, fontWeight:600, background:SW.input, outline:"none", ...style }} />
  );
}
// Grouped constraint card — visual twin of the calc sheet's "Design loads" cards (LtCollapse flex cards)
function ConGroup({ title, children }) {
  return (
    <div style={{ flex:"1 1 200px", border:`1px solid ${SW.rule}`, borderRadius:6, padding:"6px 10px 8px", background:SW.panel }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4, color:SW.ink }}>{title}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", alignItems:"flex-end" }}>{children}</div>
    </div>
  );
}
function SwField({ label, children }) {
  return (
    <label style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <span style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:SW.faint }}>{label}</span>
      {children}
    </label>
  );
}
const selStyle = { padding:"3px 4px", border:`1px solid ${SW.rule}`, borderRadius:4, fontSize:11, fontFamily:MONO,
                   color:SW.accent, fontWeight:600, background:SW.input, outline:"none" };
// Pinned-constraints panel: every control shares one height + font so the rows line up (rev 8)
const CON_H = 24;
const conNum = { height:CON_H, boxSizing:"border-box" };
const conSel = { ...selStyle, fontSize:12, padding:"2px 4px", height:CON_H, boxSizing:"border-box", minWidth:56, maxWidth:158 };

// ── Pinned-panel field system (rev 11) ──────────────────────────────────────
// Inline label-left / control-right rows inside a CSS grid. One line per field
// (half the height of stacked label-on-top), controls share a column edge so
// everything aligns, and a fixed unit gutter keeps numbers and units tidy.
const PIN_H = 22;
const pinCard = { border:`1px solid ${SW.rule}`, borderRadius:6, padding:"5px 9px 6px", background:SW.panel, minWidth:0 };
const pinTitle = { fontSize:10.5, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4, color:SW.ink };
const pinNumS = { width:46, height:PIN_H, boxSizing:"border-box", padding:"0 5px", border:`1px solid ${SW.rule}`, borderRadius:4,
                  fontFamily:MONO, fontSize:11, textAlign:"right", color:SW.accent, fontWeight:600, background:SW.input, outline:"none" };
const pinSelS = { height:PIN_H, boxSizing:"border-box", padding:"0 2px", border:`1px solid ${SW.rule}`, borderRadius:4,
                  fontFamily:MONO, fontSize:11, color:SW.accent, fontWeight:600, background:SW.input, outline:"none", minWidth:46 };
function PinCard({ title, cols = 2, grow, children }) {
  return (
    <div style={pinCard}>
      <div style={pinTitle}>{title}</div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, columnGap:12, rowGap:5 }}>{children}</div>
    </div>
  );
}
// label truncates with ellipsis (full text in title) so no label can ever break the row; unit sits in a fixed right gutter.
function PinRow({ label, unit = "", full, grow, children }) {
  return (
    <label title={label} style={{ display:"flex", alignItems:"center", gap:6, minWidth:0, gridColumn: full ? "1 / -1" : "auto" }}>
      <span style={{ flex: grow ? "0 0 auto" : "1 1 auto", minWidth:0, fontSize:8.5, letterSpacing:"0.02em",
                     textTransform:"uppercase", color:SW.faint, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
      <span style={{ flex: grow ? "1 1 auto" : "none", display:"flex", alignItems:"center", gap:3, minWidth:0 }}>
        {children}
        <span style={{ width:13, flex:"none", fontSize:8.5, color:SW.faint, textAlign:"left" }}>{unit}</span>
      </span>
    </label>
  );
}
const swBtn = (primary) => ({
  padding:"8px 16px", fontSize:12, fontWeight:700, letterSpacing:"0.06em",
  border:`1.5px solid ${primary ? SW.accent : SW.rule}`, background: primary ? SW.accent : SW.panel,
  color: primary ? "#FFFFFF" : SW.ink, cursor:"pointer", borderRadius:4,
});


// Signature of exactly what `applyToCalc` would push to the Calculation Sheet for a
// given design line: the segment lengths, the line's force/height/tributary, the
// per-segment selected schedule types, and the constraint fields the sheet seeds
// from. Two calls are equal iff re-sending would produce the same sheet — so an edit
// that wouldn't change the push (or an edit-then-revert) leaves the signature alone.
// (g is App-level shared state, read live by the calc sheet, so it is NOT part of the
//  push and is intentionally excluded — except via selType, which the sheet snapshots.)



/* ────────────────────────────────────────────────────────────────────────
   LIGHT THEME — Calculation Sheet only. 1:1 port of the standalone
   shear-wall-calculator app (paper page, white sheet, compliance banner,
   D/C utilization bars, collapsible sections, sticky row labels, column
   highlight, formula tooltips, print). Namespaced Lt- / LT- so the dark
   Design tab components above are untouched.
   ──────────────────────────────────────────────────────────────────────── */


// Shearwall schedule reference table — shown at the bottom of the Design tab
// (same data as the Calculation Sheet's reference section)
function SwScheduleRef({ grade }) {
  return (
    <LtCollapse title="Shearwall schedule (reference)">
      <div className="sw-scroll">
        <table className="sw-table" style={{ fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1.5px solid ${LT.ink}`, textAlign:"left" }}>
              {["MARK", "SHEATHING", "EDGE NAILING", "FIELD NAILING", "BOTTOM PLATE — CONCRETE", "BOTTOM PLATE — WOOD", "WIND (plf)", "SEISMIC (plf)", "Ga"].map((h) => (
                <th key={h} style={{ padding:"4px 8px", fontSize:10, letterSpacing:"0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedFor(grade).map((t) => (
              <tr key={t.mark} style={{ borderBottom:`1px solid ${LT.rule}` }}>
                <td style={{ padding:"5px 8px", fontFamily:MONO, fontWeight:700, color:LT.blue }}>{t.mark}</td>
                <td style={{ padding:"5px 8px" }}>{t.sheathing}</td>
                <td style={{ padding:"5px 8px" }}>{t.edge}</td>
                <td style={{ padding:"5px 8px" }}>{t.field}</td>
                <td style={{ padding:"5px 8px" }}>{t.concrete}</td>
                <td style={{ padding:"5px 8px" }}>{t.wood}</td>
                <td style={{ padding:"5px 8px", fontFamily:MONO, textAlign:"right" }}>{t.wind}</td>
                <td style={{ padding:"5px 8px", fontFamily:MONO, textAlign:"right" }}>{t.seismic}</td>
                <td style={{ padding:"5px 8px", fontFamily:MONO, textAlign:"right" }}>{t.ga.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:10, color:LT.faint, marginTop:4 }}>"Type n" on the plan and in the results table refers to MARK n in this schedule.</div>
    </LtCollapse>
  );
}

// Wall mark letters: A..Z, AA, AB, … assigned in line order then segment order
const letterOf = (k) => { let s = ""; k += 1; while (k > 0) { k -= 1; s = String.fromCharCode(65 + (k % 26)) + s; k = Math.floor(k / 26); } return s; };

// rev 62 — per-element GOVERNING CASE (Wind vs Seismic), pure display derivation. The engine already
// envelopes both cases per element (calcSegment: type=max(sugS,sugW); maxComp/maxUplift/reqFtgLen via
// xMax). These helpers just read which case drove each element so the Design table can tag it. They
// touch NO guarded fn — same out-of-engine pattern as withUtil. Return "W"/"S" or null (neither acts).
const _govShearCase = (r, grade) => {
  if (!r || !isNum(r.selType)) return null;
  const t = schedFor(grade)[Math.max(0, Math.min(5, r.selType - 1))];
  const uW = t.wind ? r.vW / t.wind : 0;
  const uS = (r.factor * t.seismic) ? r.vS / (r.factor * t.seismic) : 0;
  if (uW <= 0 && uS <= 0) return null;
  return uS > uW ? "S" : "W";
};
const _govBy = (s, w) => {            // larger demand governs; both ≤0 → no tag ("neglect"/non-numbers → 0)
  const ns = isNum(s) ? s : 0, nw = isNum(w) ? w : 0;
  if (ns <= 0 && nw <= 0) return null;
  return ns > nw ? "S" : "W";
};
function CaseTag({ which }) {
  if (!which) return null;
  const seis = which === "S";
  return (
    <span title={seis ? "Seismic governs this element" : "Wind governs this element"}
      style={{ display:"inline-block", marginLeft:6, verticalAlign:"middle", fontFamily:MONO, fontSize:10.5,
               fontWeight:700, lineHeight:1, padding:"2px 4px", borderRadius:3,
               color: seis ? SW.amber : SW.accent,
               background: seis ? SW.amberSoft : SW.accentSoft,
               border:`1px solid ${seis ? SW.amber : SW.accent}` }}>{which}</span>
  );
}

// ---------- the plan canvas ----------
function DesignPlan({ shape, lines, segsByLine, setSegsByLine, resultsByLine, selLine, setSelLine, snap, maxSegLen, onCtx, marks, showTags, lineNames }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  // fit viewBox to footprint
  const vb = useMemo(() => {
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    (shape&&shape.nodes||[]).forEach(p=>{ x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y); });
    if(!(x1>x0)) { x0=0;y0=0;x1=100;y1=60; }
    const m=14; return { x:x0-m, y:y0-m, w:(x1-x0)+2*m, h:(y1-y0)+2*m };
  }, [shape]);
  const S = Math.max(vb.w, vb.h) / 110;   // graphic scale (matches sketcher's S idiom)
  const band = 1.2*S;                      // shear-wall band half-width (rev 13: halved — thin-band drafting symbol)
  // (rev 54/55) when a line is SELECTED in the Design tab, only its dashed CENTERLINE turns yellow as
  // an immediate "this is the selected wall" indicator. The shear-wall band keeps its pass/fail blue/red
  // so selection never masks a red FAIL.
  const SEL_STROKE = "#B8860B";            // selection gold/yellow — readable on the white plan

  const lineGeom = (ln) => {
    const ux=(ln.b.x-ln.a.x)/ln.lengthFt, uy=(ln.b.y-ln.a.y)/ln.lengthFt;     // along the line
    const nx=-uy, ny=ux;                                                       // across the line
    return { ux, uy, nx, ny };
  };
  const snapTo = (v) => Math.round(v / snap) * snap;
  const toPlan = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: vb.x + ((e.clientX - r.left)/r.width)*vb.w, y: vb.y + ((e.clientY - r.top)/r.height)*vb.h };
  };

  const onDown = (e, lineId, idx, mode) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSelLine(lineId);
    dragRef.current = { lineId, idx, mode, startPlan: toPlan(e), orig: { ...segsByLine[lineId][idx] } };
  };
  const onMove = (e) => {
    const dr = dragRef.current; if (!dr || !svgRef.current) return;
    const ln = lines.find(l => l.id === dr.lineId); if (!ln) return;
    const { ux, uy } = lineGeom(ln);
    const p = toPlan(e);
    const dxFt = (p.x - dr.startPlan.x)*ux + (p.y - dr.startPlan.y)*uy;        // movement along the line
    const segs = segsByLine[dr.lineId];
    const { idx, mode, orig } = dr;
    const prevEnd = idx > 0 ? segs[idx-1].start + segs[idx-1].length : 0;
    const nextStart = idx < segs.length-1 ? segs[idx+1].start : ln.lengthFt;
    let { start, length } = orig;
    if (mode === "M") {
      start = snapTo(Math.min(Math.max(orig.start + dxFt, prevEnd), nextStart - orig.length));
    } else if (mode === "R") {
      const end = snapTo(Math.min(Math.max(orig.start + orig.length + dxFt, orig.start + 1), Math.min(nextStart, orig.start + maxSegLen)));
      length = end - orig.start;
    } else if (mode === "L") {
      const ns = snapTo(Math.min(Math.max(orig.start + dxFt, Math.max(prevEnd, orig.start + orig.length - maxSegLen)), orig.start + orig.length - 1));
      start = ns; length = orig.start + orig.length - ns;
    }
    setSegsByLine(prev => ({ ...prev, [dr.lineId]: prev[dr.lineId].map((s, j) => j === idx ? { ...s, start, length } : s) }));
  };
  const onUp = () => { dragRef.current = null; };

  return (
    <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
         style={{ width:"100%", display:"block", background:C_BG, border:`1px solid ${SW.rule}`, borderRadius:8,
                  touchAction:"none", userSelect:"none", maxHeight:520 }}
         onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
         onContextMenu={(e)=>e.preventDefault()}>
      {/* footprint walls — no nodes (design view, not an editor) */}
      {(shape&&shape.edges||[]).map((ed,i)=>{
        const a=shape.nodes.find(n=>n.id===ed.a), b=shape.nodes.find(n=>n.id===ed.b);
        if(!a||!b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SW.wall} strokeWidth={0.55*S} strokeLinecap="round" opacity="0.8"/>;
      })}
      {/* design lines + shear walls */}
      {lines.map(ln=>{
        const { ux, uy, nx, ny } = lineGeom(ln);
        const segs = segsByLine[ln.id] || [];
        const res  = resultsByLine[ln.id] || [];
        const isSel = selLine === ln.id;
        const at = (ft, off=0) => ({ x: ln.a.x + ux*ft + nx*off, y: ln.a.y + uy*ft + ny*off });
        const vert = ln.o === "v";
        return (
          <g key={ln.id}>
            {/* line highlight (click selects) — force/length shown in the chips below the plan */}
            <line x1={ln.a.x} y1={ln.a.y} x2={ln.b.x} y2={ln.b.y}
                  stroke={isSel ? SEL_STROKE : SW.faint} strokeWidth={(isSel?0.5:0.3)*S}
                  strokeDasharray={`${1.6*S} ${1.2*S}`} opacity={isSel?0.9:0.45}
                  style={{cursor:"pointer"}} onClick={()=>setSelLine(ln.id)}/>
            {/* (rev 72) GRID BUBBLE at the line's `a` end — `a` is the min-coordinate end, i.e. the TOP
                for a vertical (N–S) line and the LEFT for a horizontal (E–W) line, so numbers land on
                top and letters on the left exactly like a plan grid. The bubble sits BEYOND the end
                along −(ux,uy) on an extension line; the label is always upright (no rotation). Black
                on white so it reads as drawing annotation, distinct from the blue/red wall callouts.
                (rev 73) the extension `stem` was lengthened ~4× (1.1→4.4·S) so the bubble sits well
                clear of the structural footprint — for the horizontal A/B lines this lifts the bubble
                completely off the corner wall-joints and outside the plan boundary. */}
            {(()=>{
              const rB=2.4*S, stem=4.4*S, gap=0.25*S, near={x:ln.a.x-ux*gap,y:ln.a.y-uy*gap};
              const cx=ln.a.x-ux*(stem+rB), cy=ln.a.y-uy*(stem+rB);
              return (
                <g pointerEvents="none">
                  <line x1={near.x} y1={near.y} x2={cx+ux*rB} y2={cy+uy*rB} stroke={SW.ink} strokeWidth={0.16*S}/>
                  <circle cx={cx} cy={cy} r={rB} fill={C_BG} stroke={SW.ink} strokeWidth={0.22*S}/>
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                        fontSize={2.0*S} fontWeight="800" fill={SW.ink} fontFamily={MONO}>{lineNames[ln.id]}</text>
                </g>
              );
            })()}
            {/* shear-wall segments — distinct hatched band over the wall line */}
            {segs.map((s,i)=>{
              const r=res[i]||{};
              // (rev 55) shear-wall band keeps its PASS/FAIL color (blue/red) even when selected — only
              // the dashed centerline turns yellow (below), so selection never masks a red FAIL.
              const stroke = r.failed ? SW.red : SW.accent;
              const fill   = r.failed ? SW.redSoft : SW.accentSoft;
              const p0=at(s.start), p1=at(s.start+s.length);
              const corners=[ at(s.start,-band), at(s.start+s.length,-band), at(s.start+s.length,band), at(s.start,band) ];
              const mid = s.start + s.length/2;
              const hdRaw = (r.dispHd && r.dispHd!=="None") ? String(r.dispHd) : null;   // holdown designation, e.g. "HDU4" / "(2) HDU4" / "NG!"
              const hdNum = hdRaw ? (hdRaw.match(/HDU(\d+)/)?.[1] ?? "!") : null;         // the hold-down NUMBER shown in the dot bubble
              const hatch=[]; const step=1.3*S;
              for(let f=step; f<s.length; f+=step) hatch.push(f);
              return (
                <g key={i}
                   onContextMenu={(e)=>{ e.preventDefault(); e.stopPropagation(); onCtx(e, ln.id, i); }}>
                  {/* body — hatched band (color scheme preserved), drag to slide */}
                  <polygon points={corners.map(c=>`${c.x},${c.y}`).join(" ")}
                           fill={fill} stroke={stroke} strokeWidth={0.28*S}
                           style={{cursor:"grab"}} onPointerDown={(e)=>onDown(e,ln.id,i,"M")}/>
                  {hatch.map((f,k)=>{
                    const h1=at(s.start+Math.max(0,f-step*0.7), band), h2=at(s.start+f, -band);
                    return <line key={k} x1={h1.x} y1={h1.y} x2={h2.x} y2={h2.y} stroke={stroke} strokeWidth={0.12*S} opacity="0.5" pointerEvents="none"/>;
                  })}
                  {/* detail-bubble callout above wall center: ▽ holds the shear-wall TYPE, LENGTH is dimensioned above it */}
                  {(()=>{
                    const tipOff=band+1.3*S, triH=2.3*S, triHalf=1.35*S;
                    const apex=at(mid,-tipOff), tl=at(mid-triHalf,-(tipOff+triH)), trr=at(mid+triHalf,-(tipOff+triH));
                    const wallTop=at(mid,-band), typePt=at(mid,-(tipOff+triH*0.56)), lenPt=at(mid,-(tipOff+triH+1.05*S));
                    const rot=(pt)=> vert?`rotate(-90,${pt.x},${pt.y})`:undefined;
                    return (
                      <g pointerEvents="none">
                        <line x1={wallTop.x} y1={wallTop.y} x2={apex.x} y2={apex.y} stroke={stroke} strokeWidth={0.14*S}/>
                        <polygon points={`${apex.x},${apex.y} ${tl.x},${tl.y} ${trr.x},${trr.y}`} fill={C_BG} stroke={stroke} strokeWidth={0.16*S}/>
                        <text x={typePt.x} y={typePt.y} textAnchor="middle" dominantBaseline="central"
                              fontSize={1.5*S} fontWeight="800" fill={stroke} fontFamily={MONO} transform={rot(typePt)}>
                          {isNum(r.selType) ? r.selType : "—"}
                        </text>
                        <text x={lenPt.x} y={lenPt.y} textAnchor="middle" dominantBaseline="central"
                              fontSize={1.15*S} fontWeight="600" fill={SW.ink} fontFamily={MONO} transform={rot(lenPt)}>
                          {fmt(s.length,2)}′
                        </text>
                      </g>
                    );
                  })()}
                  {/* end zones — boundary X-box + holdown dot bubble carrying the HD number (dot kept; now numbered) */}
                  {[p0,p1].map((p,k)=>{
                    const eb=band, rot = vert?`rotate(-90,${p.x},${p.y})`:undefined;
                    return (
                      <g key={k} pointerEvents="none">
                        <rect x={p.x-eb} y={p.y-eb} width={2*eb} height={2*eb} fill={C_BG} stroke={stroke} strokeWidth={0.16*S}/>
                        <line x1={p.x-eb} y1={p.y-eb} x2={p.x+eb} y2={p.y+eb} stroke={stroke} strokeWidth={0.14*S}/>
                        <line x1={p.x-eb} y1={p.y+eb} x2={p.x+eb} y2={p.y-eb} stroke={stroke} strokeWidth={0.14*S}/>
                        {hdNum && <>
                          <circle cx={p.x} cy={p.y} r={0.92*S} fill={stroke} stroke={C_BG} strokeWidth={0.12*S}/>
                          <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                                fontSize={hdNum.length>1?0.92*S:1.15*S} fontWeight="700" fill={C_BG} fontFamily={MONO} transform={rot}>
                            {hdNum}
                          </text>
                        </>}
                      </g>
                    );
                  })}
                  {/* end stretch handles — invisible hit area (the X-box is the visual) */}
                  {[["L",p0],["R",p1]].map(([mode,p])=>(
                    <circle key={mode} cx={p.x} cy={p.y} r={1.5*S} fill="transparent"
                            style={{cursor:"ew-resize"}} onPointerDown={(e)=>onDown(e,ln.id,i,mode)}/>
                  ))}
                  {/* optional SW mark tag — gated by the "wall tags" toggle (off by default) */}
                  {showTags && (()=>{ const tg=at(mid, band+1.5*S); return (
                    <text x={tg.x} y={tg.y} textAnchor="middle" dominantBaseline="central"
                          fontSize={1.2*S} fontWeight="700" fill={stroke} fontFamily={MONO} pointerEvents="none"
                          transform={vert?`rotate(-90,${tg.x},${tg.y})`:undefined}>
                      SW-{(marks && marks[ln.id + "|" + i]) || "?"}
                    </text>
                  );})()}
                </g>
              );
            })}
          </g>
        );
      })}
      <text x={vb.x+2*S} y={vb.y+3*S} fontSize={1.4*S} fill={SW.faint} fontFamily={MONO}>
        PLAN — drag wall to slide · drag ▭ handles to stretch · right-click to edit · click a line to select
      </text>
    </svg>
  );
}

// ---------- right-click override menu for a shear wall ----------
function SwCtxMenu({ ctx, lines, segsByLine, resultsByLine, setOv, onRemove, onClose, thickness }) {
  if (!ctx) return null;
  const segs = segsByLine[ctx.lineId]||[]; const s = segs[ctx.idx]; if (!s) return null;
  const r = (resultsByLine[ctx.lineId]||[])[ctx.idx] || {};
  const postOpts = thickness <= 4 ? ["(2) 2x4","4x4","4x6"] : ["(2) 2x6","4x6","6x6","6x8"];
  const row = { display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, padding:"4px 0", fontSize:12, color:SW.ink };
  const badge = (bad) => bad ? <span style={{color:SW.red,fontWeight:700,fontSize:11}}>NG</span> : null;
  return (
    <div style={{ position:"fixed", left:ctx.px, top:ctx.py, zIndex:60, background:SW.panel, border:`1px solid ${SW.rule}`,
                  borderRadius:8, padding:"10px 12px", minWidth:240, boxShadow:"0 12px 32px -8px rgba(28,39,51,0.28)" }}
         onContextMenu={(e)=>e.preventDefault()}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:SW.accent, marginBottom:6 }}>
        Shear wall · {fmt(s.length,2)}′
      </div>
      <div style={row}>
        <span>Edge nailing (type)</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {badge(r.ovBad&&r.ovBad.type)}
          <select style={selStyle} value={s.ov&&s.ov.type||0}
                  onChange={(e)=>setOv(ctx.lineId,ctx.idx,"type",+e.target.value||null)}>
            <option value={0}>Auto (T{isNum(r.autoType)?r.autoType:"—"})</option>
            <option value={1}>T1 · 6″ o.c.</option><option value={2}>T2 · 4″ o.c.</option><option value={3}>T3 · 3″ o.c.</option>
          </select>
        </span>
      </div>
      <div style={row}>
        <span>Holdown</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {badge(r.ovBad&&r.ovBad.hd)}
          <select style={selStyle} value={s.ov&&s.ov.hd||""}
                  onChange={(e)=>setOv(ctx.lineId,ctx.idx,"hd",e.target.value||null)}>
            <option value="">Auto ({r.hd||"—"})</option>
            <option value="None">None</option>
            {HD_TABLE.map(h=><option key={h.name} value={h.name}>{h.name} · {fmt(h.cap)} lbs</option>)}
          </select>
        </span>
      </div>
      <div style={row}>
        <span>End post</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {badge(r.ovBad&&r.ovBad.post)}
          <select style={selStyle} value={s.ov&&s.ov.post||""}
                  onChange={(e)=>setOv(ctx.lineId,ctx.idx,"post",e.target.value||null)}>
            <option value="">Auto ({r.post||"—"})</option>
            {postOpts.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </span>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button style={{...swBtn(false), padding:"5px 10px"}} onClick={()=>{ setOv(ctx.lineId,ctx.idx,null,null); }}>Reset to auto</button>
        <button style={{...swBtn(false), padding:"5px 10px", color:SW.red, borderColor:SW.red}} onClick={()=>{ onRemove(ctx.lineId,ctx.idx); onClose(); }}>Remove wall</button>
        <button style={{...swBtn(true), padding:"5px 10px", marginLeft:"auto"}} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ---------- DESIGN TAB ----------
function DesignTab({ g, setGl, shape, lines, linesByFloor, segsByLine, setSegsByLine, ovSet, d, setDk, applyToCalc, selLine, setSelLine, twoStory, activeFloor, setActiveFloor, stale, onRebuild, calcPush, optimizePush, setOptimizePush, wTotal }) {
  const [ctx, setCtx] = useState(null);
  const [genMsg, setGenMsg] = useState(null);
  const [showTags, setShowTags] = useState(false);   // rev 13: SW marks no longer auto-show on the plan
  useEffect(()=>{ if(lines.length && !lines.find(l=>l.id===selLine)) setSelLine(lines[0].id); },[lines]); // eslint-disable-line

  const resultsByLine = useMemo(()=>{
    const out={};
    // 2-story mode, viewing the 1st floor: re-derive each line's end-post/holdown from the
    // ARM-AWARE combined overturning of both stories (roof reaction acts at H₁+H₂). The
    // matching 2nd-floor line shares this line's id (ax|key) and its segments (shared layout).
    const upper = (twoStory && activeFloor===1 && linesByFloor && linesByFloor[2]) ? linesByFloor[2] : null;
    lines.forEach(ln=>{
      const segs = segsByLine[ln.id]||[];
      const ln2 = upper && upper.find(L=>L.id===ln.id);
      out[ln.id] = ln2 ? stackedLineResults(ln, ln2, segs, g, d) : lineResults(ln, segs, g, d);
    });
    return out;
  },[lines, linesByFloor, segsByLine, g, d, twoStory, activeFloor]);
  const stacking = !!(twoStory && activeFloor===1 && linesByFloor && linesByFloor[2]);  // drives the 1st-floor overturning note

  // unique wall marks (SW-A, SW-B, …) in line order then segment order
  const wallMarks = useMemo(()=>{
    const m={}; let k=0;
    lines.forEach(ln=>{ (segsByLine[ln.id]||[]).forEach((s,i)=>{ m[ln.id+"|"+i]=letterOf(k); k++; }); });
    return m;
  },[lines, segsByLine]);

  // (rev 72) Per-line display name follows the standard structural GRID convention — no direction
  // prefix. N–S (vertical, windAxis "v") lines are NUMBERED 1,2,3… ordered left→right by x; E–W
  // (horizontal, windAxis "h") lines are LETTERED A,B,C… ordered top→bottom by y (screen y grows
  // downward, so ascending y = top→bottom). Positional like the SW marks — it tracks each line's
  // place in THIS floor's grid, not a persisted id. This name titles the matching Calculation-Sheet
  // sub-tab (via lineLabel → applyToCalc), so the Design and Calc tabs identify a wall identically.
  const lineNames = useMemo(()=>{
    const m={};
    const ns = lines.filter(l=>l.windAxis==="v").slice().sort((p,q)=> p.a.x-q.a.x || p.a.y-q.a.y);
    const ew = lines.filter(l=>l.windAxis==="h").slice().sort((p,q)=> p.a.y-q.a.y || p.a.x-q.a.x);
    ns.forEach((l,i)=>{ m[l.id]=String(i+1); });          // N–S → 1, 2, 3 …
    ew.forEach((l,i)=>{ m[l.id]=colName(i+1); });         // E–W → A, B, C …
    return m;
  },[lines]);
  const lineLabel = (ln) => `${lineNames[ln.id]} · ${fmt(ln.forceLbs/1000,2)}k · ${fmt(ln.lengthFt,0)}′`;

  const optimizeAll = () => {
    // Design EVERY wall across BOTH floors and MERGE onto the existing layouts (never wipe another
    // floor's lines — rev 46). A wall that exists on BOTH floors (same id) is a STACKED wall: its one
    // shared layout is governed by the heavier 1st-floor COMBINED demand, so it goes through
    // generateStackedDesign (1st floor controls; the chosen length is reused on the 2nd floor, bounded
    // by the 2-story segment — rev 47). A wall on only one floor (a 1-story wall, or a single-story
    // building) keeps the standalone generateDesign on its own reaction/length/height.
    const f1 = (linesByFloor && linesByFloor[1]) || (twoStory ? [] : lines);
    const f2 = (twoStory && linesByFloor && linesByFloor[2]) || [];
    const lower = new Map(f1.map(l=>[l.id,l]));
    const upper = new Map(f2.map(l=>[l.id,l]));
    const ids = new Set([...lower.keys(), ...upper.keys()]);
    const next = { ...segsByLine };            // merge — never drop another floor's lines
    let okCount=0, failNames=[]; const total = ids.size;
    ids.forEach(id=>{
      const l1 = lower.get(id), l2 = upper.get(id);
      let out, label;
      if(l1 && l2){                            // stacked → 1st-floor-controlled, segment-bounded
        out = generateStackedDesign(l1, l2, g, d);
        label = `${fmt(l1.forceLbs/1000,1)}k/${fmt(Math.min(l1.lengthFt,l2.lengthFt),0)}′ stacked line`;
      } else {                                 // 1-story-only / single-story → standalone
        const ln = l1 || l2;
        out = generateDesign({ ...g, wWind: ln.forceLbs, vSeismic: ln.forceLbsSeismic || 0 }, { ...d, lineLength: ln.lengthFt, height: ln.heightFt,
                               roofTrib: ln.roofTrib ?? d.roofTrib, floorTrib: ln.floorTrib ?? d.floorTrib });  // (rev 49) per-wall trib · (rev 62) per-line seismic
        label = `${fmt(ln.forceLbs/1000,1)}k/${fmt(ln.lengthFt,0)}′ line`;
      }
      if(out){ const sl=l1||l2; next[id]=snapSegsToRuns(out.segs, sl.runs, sl.lengthFt).map(s=>({...s})); okCount++; }   // rev 73: default-place inside a wall, not a gap
      else { next[id]=[]; failNames.push(label); }
    });
    setSegsByLine(next);
    setOptimizePush && setOptimizePush(optimizeSig(linesByFloor, lines, twoStory, g, d));   // rev 130b: remember the inputs this Optimize ran on
    setGenMsg(failNames.length
      ? { ok:false, text:`Optimized ${okCount}/${total} lines. No passing configuration for: ${failNames.join(", ")} — relax max segment length/count or allow type 3.` }
      : { ok:true, text:`Optimized all ${total} line${total>1?"s":""}.` });
  };

  const setOv = (lineId, idx, key, val) => ovSet(lineId, idx, key, val);
  const removeSeg = (lineId, idx) => setSegsByLine(prev => ({ ...prev, [lineId]: prev[lineId].filter((_,j)=>j!==idx) }));
  const addSeg = (lineId) => {
    const ln=lines.find(l=>l.id===lineId); if(!ln) return;
    const segs=(segsByLine[lineId]||[]).slice().sort((a,b)=>a.start-b.start);
    // largest gap on the line
    let best={start:0,room:0}, cursor=0;
    [...segs,{start:ln.lengthFt,length:0}].forEach(s=>{ const room=s.start-cursor; if(room>best.room) best={start:cursor,room}; cursor=Math.max(cursor,s.start+s.length); });
    if(best.room < d.minSegLen) return;
    const Ls=d.minSegLen;
    let st=+(best.start+(best.room-Ls)/2).toFixed(2);
    // (rev 73) snap the new segment into a SOLID wall run if the largest inter-segment gap lands in a
    // wall opening — choosing the nearest run that can host it without overlapping an existing segment.
    const runs=ln.runs;
    if(Array.isArray(runs) && runs.length){
      const inRun=(p)=>runs.some(([s,e])=> p>=s-1e-3 && p+Ls<=e+1e-3);
      if(!inRun(st)){
        let bp=null;
        for(const [s,e] of runs){ if(e-s<Ls-1e-3) continue;
          const p=Math.min(Math.max(st,s), e-Ls);
          if(p+Ls>e+1e-3) continue;
          if(segs.some(o=> p < o.start+o.length-1e-3 && p+Ls > o.start+1e-3)) continue;   // would overlap an existing seg
          const dist=Math.abs(p-st); if(!bp||dist<bp.dist) bp={p,dist};
        }
        if(bp) st=+bp.p.toFixed(2);
      }
    }
    setSegsByLine(prev=>({ ...prev, [lineId]: [...(prev[lineId]||[]), {start:st, length:Ls}].sort((a,b)=>a.start-b.start) }));
  };

  const sel = lines.find(l=>l.id===selLine);
  const selSegs = sel ? (segsByLine[sel.id]||[]) : [];
  const selRes  = sel ? (resultsByLine[sel.id]||[]) : [];
  // rev 130: the "Send line to calculation sheet" button goes red when the line CURRENTLY in the
  // sheet (calcPush.lineId) is the one selected AND its pushable data has changed since it was sent.
  // Selecting a DIFFERENT line is not "stale" — that's a fresh push, so the button stays normal.
  const calcStaleHint = !!(calcPush && sel && calcPush.lineId === sel.id && calcPush.sig !== calcPushSig(sel, selSegs, selRes, d));
  // rev 130b: the ⚡ Optimize design button produces the tab's design output; it goes red when an input
  // it consumes (any line's force/height/length/trib across both floors, or g / d) has changed since the
  // last Optimize. optimizePush is null until the first Optimize (so it's only red AFTER you've optimized).
  const optimizeLiveSig = optimizeSig(linesByFloor, lines, twoStory, g, d);
  const optimizeStaleHint = optimizePush != null && optimizePush !== optimizeLiveSig;
  const allPass = lines.length>0 && lines.every(ln=>{
    const rs=resultsByLine[ln.id]||[]; return rs.length>0 && rs.every(r=>!r.failed);
  });

  // rev 24: shown when a loaded file had geometry-less lines (excluded on load). The saved plan is
  // intact, so one click rebuilds every line from it. Rendered at the top of BOTH return paths below.
  const staleBanner = stale ? (
    <div style={{ marginTop:12, marginBottom:4, padding:"10px 14px", borderRadius:8,
                  border:`1.5px solid ${SW.amber}`, background:SW.amberSoft,
                  display:"flex", alignItems:"center", gap:12 }}>
      <span style={{ fontSize:15, lineHeight:1 }} aria-hidden="true">⚠</span>
      <div style={{ flex:1, fontSize:12.5, lineHeight:1.5, color:SW.ink }}>
        This design was restored from a file with incomplete plan geometry, so it may be out of date.
        Rebuild it from the saved plan to restore every line.
      </div>
      <button onClick={onRebuild} style={{ ...swBtn(true), whiteSpace:"nowrap" }}>↻ Rebuild from plan</button>
    </div>
  ) : null;

  if (!lines.length) return (
    <div>
      {staleBanner}
      <div style={{ marginTop:30, padding:36, border:`1px dashed ${SW.rule}`, borderRadius:10, textAlign:"center", color:SW.faint, fontSize:13, lineHeight:1.7 }}>
        No shear-wall lines yet.<br/>
        In the <b style={{color:SW.ink}}>Plan Sketcher</b>, drag wind sections across the plan, mark the walls that take point loads,
        then press <b style={{color:SW.accent}}>Design shear walls →</b>. Each point-load wall arrives here as a line carrying its
        reaction (kips) and wall height — parapets are not part of the shear-wall calc.
      </div>
      <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:10 }}>
        <SwField label="Sheathing">
          <select value={g.grade === "str1" ? "str1" : "rated"} onChange={(e)=>setGl("grade",e.target.value)} style={selStyle}>
            <option value="rated">1/2&Prime; rated</option>
            <option value="str1">1/2&Prime; Structural I</option>
          </select>
        </SwField>
      </div>
      <SwScheduleRef grade={g.grade}/>
    </div>
  );

  return (
    <div onClick={()=>ctx&&setCtx(null)}>
      {/* Pinned constraints — sticks below the suite tab bar exactly like the sketcher ribbon (rev 5 --tabbar-h) */}
      <div style={{ position:"sticky", top:"var(--tabbar-h,42px)", zIndex:30, background:SW.sheet,
                    paddingTop:4, paddingBottom:6, boxShadow:`0 6px 8px -8px rgba(28,39,51,.25)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"0 0 6px" }}>
          <span style={{ width:6, height:6, background:SW.accent, display:"inline-block", flex:"none" }} aria-hidden="true"/>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:SW.accent }}>Design constraints</div>
          <div style={{ flex:1, height:1, background:SW.rule }} />
          {/* Floor switcher — flips which floor's design is shown (synced with the plan selector). Greyed until 2-story. */}
          <div title={twoStory ? "Switch which floor's design you're viewing" : "Two-story mode only"}
               style={{ display:"flex", alignItems:"center", gap:7, flex:"none", opacity: twoStory ? 1 : 0.45 }}>
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:SW.faint }}>Designing</span>
            <div style={{ display:"flex", border:`1.5px solid ${twoStory ? SW.accent : SW.rule}`, borderRadius:5, overflow:"hidden" }}>
              {[1,2].map(f=>(
                <button key={f} disabled={!twoStory} onClick={()=>twoStory&&setActiveFloor(f)}
                  style={{ border:0, padding:"4px 12px", fontFamily:MONO, fontSize:11, fontWeight:700, letterSpacing:"0.02em",
                           cursor: twoStory ? "pointer" : "default",
                           borderLeft: f===2 ? `1px solid ${SW.rule}` : "none",
                           background: (twoStory && activeFloor===f) ? SW.accent : "transparent",
                           color: (twoStory && activeFloor===f) ? "#fff" : SW.faint }}>
                  {f===1 ? "1st Floor" : "2nd Floor"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"flex-start" }}>
          <div style={{ flex:"1.4 1 280px", minWidth:240 }}>
            <PinCard title="Seismic" cols={2}>
              <PinRow label="Cs"><span style={{fontSize:12,fontWeight:600}}>{g.Cs ?? 0}</span></PinRow>
              <PinRow label="V = Cs·W" unit="lbs"><span style={{fontSize:12,fontWeight:700,color:SW.accent}}>{wTotal!=null ? Math.round((Number(g.Cs)||0)*wTotal).toLocaleString() : "—"}</span></PinRow>
              <PinRow label="S_DS"><input type="number" step={0.05} min={0} value={g.sds ?? 0} onChange={(e)=>setGl("sds",parseFloat(e.target.value)||0)} style={pinNumS}/></PinRow>
              <PinRow label="R" unit="ref"><span style={{fontSize:12,fontWeight:600,color:SW.faint}}>{g.R}</span></PinRow>
              {/* (rev 59) Cs is an INPUT on the Plan tab (side panel → Dead Loads); shown read-only here with
                  the design base shear V = Cs·W_total (W_total lifted from the Plan tab as `wTotal`, "—" in 2-Story).
                  (rev 61) g.vSeismic / g.R are now the post-R reduced convention — R is reference-only.
                  (rev 62) S_DS is editable here (drives E_v on uplift/compression, B=0.6−0.14·S_DS); seismic is now
                  applied PER LINE — each line carries its own seismic reaction from the plan, enveloped against wind
                  by the engine. The per-line seismic shear + governing case show in the selected-line results below. */}
            </PinCard>
          </div>
          <div style={{ flex:"1.4 1 280px", minWidth:240 }}>
            <PinCard title="Dimensions" cols={2}>
              <PinRow label="Min segment" unit="ft"><input type="number" step={0.5} value={d.minSegLen} onChange={(e)=>setDk("minSegLen",parseFloat(e.target.value)||0)} style={pinNumS}/></PinRow>
              <PinRow label="Max segment" unit="ft"><input type="number" step={0.5} value={d.maxSegLen} onChange={(e)=>setDk("maxSegLen",parseFloat(e.target.value)||0)} style={pinNumS}/></PinRow>
              <PinRow label="Max segs"><select value={d.maxSegments} onChange={(e)=>setDk("maxSegments",+e.target.value)} style={pinSelS}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></PinRow>
              <PinRow label="Snap" unit="ft"><select value={d.snap} onChange={(e)=>setDk("snap",+e.target.value)} style={pinSelS}><option value={0.25}>0.25</option><option value={0.5}>0.5</option><option value={1}>1.0</option></select></PinRow>
              <PinRow label="Thickness" unit="in"><select value={d.thickness} onChange={(e)=>setDk("thickness",+e.target.value)} style={pinSelS}><option value={3.5}>3.5</option><option value={5.5}>5.5</option><option value={7.25}>7.25</option></select></PinRow>
              <PinRow label="HD dist" unit="in"><input type="number" step={0.5} value={d.hdDist} onChange={(e)=>setDk("hdDist",parseFloat(e.target.value)||0)} style={pinNumS}/></PinRow>
            </PinCard>
          </div>
          <div style={{ flex:"1 1 210px", minWidth:200 }}>
            <PinCard title="Plywood" cols={1}>
              <PinRow label="Sheathing" grow><select value={g.grade === "str1" ? "str1" : "rated"} onChange={(e)=>setGl("grade",e.target.value)} style={{ ...pinSelS, width:"100%", flex:"1 1 auto", minWidth:0 }}><option value="rated">1/2&Prime; rated</option><option value="str1">1/2&Prime; Structural I</option></select></PinRow>
              <PinRow label="Max SW type" grow><select value={d.maxType} onChange={(e)=>setDk("maxType",+e.target.value)} style={{ ...pinSelS, width:"100%", flex:"1 1 auto", minWidth:0 }}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></PinRow>
              <div style={{ gridColumn:"1 / -1", marginTop:1, fontSize:10.5, color:SW.faint, lineHeight:1.55 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span>Allow. W (plf)</span><span style={{ fontFamily:MONO, color:SW.ink, fontWeight:600 }}>{schedFor(g.grade).slice(0,3).map((t)=>t.wind).join("/")}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span>Allow. S (plf)</span><span style={{ fontFamily:MONO, color:SW.ink, fontWeight:600 }}>{schedFor(g.grade).slice(0,3).map((t)=>t.seismic).join("/")}</span></div>
              </div>
            </PinCard>
          </div>
          <div style={{ flex:"1 1 230px", minWidth:210 }}>
            <PinCard title="Other constraints" cols={1}>
              <PinRow label="Objective" grow><select value={d.objective} onChange={(e)=>setDk("objective",e.target.value)} style={{ ...pinSelS, width:"100%", flex:"1 1 auto", minWidth:0 }}><option value="length">Min. wall length</option><option value="nailing">Min. nailing (type)</option></select></PinRow>
              <PinRow label="Anchored into" grow><select value={d.anchor} onChange={(e)=>setDk("anchor",e.target.value)} style={{ ...pinSelS, width:"100%", flex:"1 1 auto", minWidth:0 }}><option>Concrete</option><option>Masonry</option><option>Wood</option></select></PinRow>
              <button style={{ ...swBtn(true), gridColumn:"1 / -1", marginTop:2, padding:"0 12px", height:PIN_H, boxSizing:"border-box", fontSize:11, ...(optimizeStaleHint ? STALE_BTN : {}) }}
                title={optimizeStaleHint ? "Design inputs changed since you last optimized — re-optimize to update the design" : undefined}
                onClick={optimizeAll}>{optimizeStaleHint && WARN}⚡ Optimize design</button>
            </PinCard>
          </div>
        </div>
      </div>
      <div style={{ fontSize:11, color:SW.faint, marginTop:6 }}>
        Line force and wall height come from the Plan Sketcher: W<sub>WIND</sub> per line = its wind reaction, and (rev 62) each line also carries its own <b>seismic</b> reaction (V = C<sub>s</sub>·W_total distributed on the plan) — the engine designs each line for the heavier of the two, per element. C<sub>s</sub> is set on the Plan tab; S<sub>DS</sub> (E_v) is editable here; code &amp; species come from the Calculation sheet; dead loads and sheathing grade are shared. Demand shear = line force ÷ total wall length on that line.
      </div>

      {genMsg && (
        <div style={{ marginTop:12, padding:"8px 12px", fontSize:12, fontFamily:MONO, borderRadius:6,
                      background:genMsg.ok?SW.greenSoft:SW.redSoft, color:genMsg.ok?SW.green:SW.red,
                      border:`1px solid ${genMsg.ok?SW.green:SW.red}` }}>
          {genMsg.text}
        </div>
      )}

      <SectionTitle
        right={
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setShowTags(v=>!v)} style={{ ...swBtn(showTags), padding:"4px 12px", fontSize:11 }}
                    title="Show or hide the SW-A / SW-B wall marks on the plan">
              {showTags ? "Hide wall tags" : "Show wall tags"}
            </button>
            <div style={{ padding:"4px 10px", border:`1.5px solid ${allPass?SW.green:SW.red}`, borderRadius:6,
                          background:allPass?SW.greenSoft:SW.redSoft, color:allPass?SW.green:SW.red,
                          fontFamily:MONO, fontSize:11, fontWeight:700 }}>
              {allPass ? "✓ ALL LINES PASS" : "✕ NOT PASSING"}
            </div>
          </div>
        }>
        Plan — live recalculation
      </SectionTitle>

      <DesignPlan shape={shape} lines={lines} marks={wallMarks} showTags={showTags} lineNames={lineNames}
                  segsByLine={segsByLine} setSegsByLine={setSegsByLine}
                  resultsByLine={resultsByLine} selLine={selLine} setSelLine={setSelLine}
                  snap={d.snap} maxSegLen={d.maxSegLen}
                  onCtx={(e, lineId, idx)=>{ setSelLine(lineId); setCtx({ px:Math.min(e.clientX, window.innerWidth-280), py:Math.min(e.clientY, window.innerHeight-240), lineId, idx }); }}/>

      {/* per-line chips */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
        {lines.map(ln=>{
          const rs=resultsByLine[ln.id]||[]; const pass=rs.length>0&&rs.every(r=>!r.failed);
          const isSel=selLine===ln.id;
          return (
            <button key={ln.id} onClick={()=>setSelLine(ln.id)}
              style={{ padding:"6px 12px", fontFamily:MONO, fontSize:12, cursor:"pointer", borderRadius:6,
                       border:`1.5px solid ${isSel?SW.accent:SW.rule}`,
                       background:isSel?SW.accentSoft:SW.panel,
                       color: rs.length? (pass?SW.green:SW.red) : SW.faint }}>
              {lineNames[ln.id]} · {fmt(ln.forceLbs/1000,2)}k · {fmt(ln.lengthFt,0)}′ {rs.length? (pass?"✓":"✕") : "·"}
            </button>
          );
        })}
      </div>

      {sel && (
        <>
          <SectionTitle
            right={
              <div style={{ display:"flex", gap:8 }}>
                <button style={swBtn(false)} onClick={()=>addSeg(sel.id)} disabled={selSegs.length>=6}>+ Add wall</button>
                <button style={calcStaleHint ? {...swBtn(false), ...STALE_BTN} : swBtn(false)}
                  title={calcStaleHint ? "This line changed since you last sent it — click to update the Calculation Sheet" : undefined}
                  onClick={()=>applyToCalc(sel, selSegs, selRes, d, lineLabel(sel), selSegs.map((_,i)=>wallMarks[sel.id+"|"+i]))}>{calcStaleHint && WARN}Send line to calculation sheet →</button>
              </div>
            }>
            Selected line — {lineNames[sel.id]} · {sel.windAxis==="h"?"E–W":"N–S"} · wind {fmt(sel.forceLbs/1000,2)}k · seismic {fmt((sel.forceLbsSeismic||0)/1000,2)}k · {fmt(sel.lengthFt,1)} ft · H {fmt(sel.heightFt,1)} ft
          </SectionTitle>
          {selSegs.length === 0 ? (
            <div style={{ padding:20, border:`1px dashed ${SW.rule}`, borderRadius:8, color:SW.faint, fontSize:12 }}>
              No shear walls on this line yet — press ⚡ Optimize design, or + Add wall.
            </div>
          ) : (
          <>
          {stacking && (
            <div style={{ margin:"2px 0 10px", padding:"8px 12px", borderRadius:7,
                          border:`1px solid ${SW.accent}`, background:SW.accentSoft||"rgba(35,87,127,0.06)",
                          fontSize:11, lineHeight:1.5, color:SW.ink }}>
              <b style={{ color:SW.accent }}>2-story stacking active.</b> Every row below is re-derived from the
              <b> arm-aware</b> overturning of both stories — the roof reaction acts a full upper story higher
              (arm H₁+H₂), so its moment adds on top of the 2nd-floor moment
              (M<sub>base</sub> = M<sub>1st</sub> + M<sub>2nd</sub>), not a flat sum of the reactions. End post,
              uplift, holdown, anchor, strap, deflection and footing all reflect the stacked demand, now for
              <b> both wind and seismic</b> (each line carries its per-floor seismic force). The
              <b> upper-story dead load</b> stacks too (rev 63): it resists uplift (smaller holdowns) while adding
              to the end-post compression, through each case's factored bucket; the footing base shear is cumulative.
              Wind/seismic shear and nailing are unchanged (the combined story shear was already carried). Δ uses the
              stacked (stiffer) end post, so the 1st-floor inter-story drift can read smaller than the single-story value.
            </div>
          )}
          <div className="sw-scroll">
            <table className="sw-table" style={{ minWidth:700, color:SW.ink }}>
              <thead>
                <tr style={{ borderBottom:`1.5px solid ${SW.faint}` }}>
                  <th style={{ textAlign:"left", padding:"4px 10px", fontSize:11 }}></th>
                  {selSegs.map((_, i) => (
                    <th key={i} style={{ padding:"4px 8px", fontSize:11, fontFamily:MONO, color:SW.accent }}>SW-{wallMarks[selLine+"|"+i] || (i+1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Length / position" unit="ft" cells={selRes} render={(r, i) => (
                  <span style={{ fontFamily:MONO, fontSize:12 }}>{fmt(selSegs[i].length,2)} <span style={{ color:SW.faint, fontSize:10 }}>@ {fmt(selSegs[i].start,2)}</span></span>
                )} />
                <Row label="Wall height h" unit="ft" cells={selRes} render={() => (
                  <span style={{ fontFamily:MONO, fontSize:12 }}>{fmt(sel.heightFt,2)}</span>
                )} />
                <Row label="Aspect ratio h/L" cells={selRes} render={(r) => <Chip v={r.aspectNG ? "NG!" : r.aspect} d={2} />} />
                <Row label="Wind shear v" unit="plf" cells={selRes} render={(r) => <Chip v={r.vW} d={1} />} />
                <Row label="Seismic shear v" unit="plf" cells={selRes} render={(r) => <Chip v={r.vS} d={2} />} />
                <Row label="Shear wall nailing" cells={selRes} render={(r) => {
                  if (!isNum(r.selType)) return <Chip v={r.autoType} />;
                  const bad = r.ovBad && r.ovBad.type;
                  return (
                    <span style={{ fontFamily:MONO, fontSize:12, color: bad ? SW.red : SW.ink }}>
                      {NAIL_EDGE[r.selType]}<CaseTag which={_govShearCase(r, g.grade)} />
                      <div style={{ fontSize:10, color: bad ? SW.red : SW.faint }}>
                        Type {r.selType}{bad ? ` — requires Type ${r.autoType}` : ""}
                      </div>
                    </span>
                  );
                }} />
                <Row label="Allowable wind / seismic" unit="plf" cells={selRes} render={(r) => {
                  const t = isNum(r.selType) ? schedFor(g.grade)[r.selType-1] : null;
                  return t ? <span style={{ fontFamily:MONO, fontSize:12 }}>{t.wind} / {fmt(r.factor*t.seismic,0)}</span> : <Chip v="—" />;
                }} />
                {stacking && (
                  <Row label="Overturning M · stacked" unit="k·ft" cells={selRes} render={(r) => {
                    const m = xMax(r.MotW, r.MotS);
                    return <span style={{ fontFamily:MONO, fontSize:12, color:SW.accent, fontWeight:700 }}>{fmt(m/1000,1)}</span>;
                  }} />
                )}
                <Row label="End post" cells={selRes} render={(r) => <span><Chip v={r.ovBad&&r.ovBad.post?"NG!":r.dispPost} /><CaseTag which={_govBy(r.compS, r.compW)} /></span>} />
                <Row label="Max uplift" unit="lbs" cells={selRes} render={(r) => <Chip v={r.maxUplift === 0 ? "—" : r.maxUplift} d={0} />} />
                <Row label="Holdown" cells={selRes} render={(r) => <span><Chip v={r.ovBad&&r.ovBad.hd?"NG!":r.dispHd} />{r.maxUplift>0 && <CaseTag which={_govBy(r.upHD_S, r.upHD_W)} />}</span>} />
                <Row label="Anchor" cells={selRes} render={(r) => <Chip v={r.anchorSel} />} />
                <Row label="Strap alternative" cells={selRes} render={(r) => <Chip v={r.altStrap} />} />
                <Row label="Δ wind" unit="in" cells={selRes} render={(r) => <Chip v={isFinite(r.deflW) ? r.deflW : "—"} d={3} />} />
                <Row label="Req. footing length" unit="ft" cells={selRes} render={(r) => <span><Chip v={isFinite(r.reqFtgLen) ? r.reqFtgLen : "—"} d={2} />{isFinite(r.reqFtgLen) && <CaseTag which={_govBy(r.LminS, r.LminW)} />}</span>} />                <Row label="Status" cells={selRes} render={(r) => <Chip v={r.failed ? "FAILED!!!" : "OK"} />} />
              </tbody>
            </table>
          </div>
          </>
          )}
        </>
      )}

      <SwScheduleRef grade={g.grade}/>

      <SwCtxMenu ctx={ctx} lines={lines} segsByLine={segsByLine} resultsByLine={resultsByLine}
                 setOv={setOv} onRemove={removeSeg} onClose={()=>setCtx(null)} thickness={d.thickness}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   APP SHELL — Plan Sketcher · Calculation Sheet · Design
   The sketcher stays mounted (hidden) so the plan survives tab switches.
   ════════════════════════════════════════════════════════════════════════ */

export {
  colName, Chip, Row, SectionTitle, NumInput, ConGroup, SwField, selStyle, CON_H, conNum, conSel, PIN_H, pinCard, pinTitle, pinNumS, pinSelS, PinCard, PinRow, swBtn, SwScheduleRef, letterOf, _govShearCase, _govBy, CaseTag, DesignPlan, SwCtxMenu, DesignTab,
};
