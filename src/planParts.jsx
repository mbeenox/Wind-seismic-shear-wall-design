/* planParts.jsx — Plan-sketcher presentational pieces (section diagrams + dialog windows).
   Phase-4 module split (rev 79): React components moved VERBATIM from plan-sketcher-suite.jsx.
   Pure presentation — depends only on geometry + theme. No engine logic. */
import React, { useState, useEffect } from "react";
import { clamp, fmt1, fmt2 } from "./geometry.js";
import { C_BG, C_NODE, C_LOAD, C_REACT, C_DIMBOX, C_REACTBOX } from "./theme.js";







// ── styles ─────────────────────────────────────────────────────────────────

/* ═══════════════ SECTION ELEVATION DIAGRAM ═══════════════ */
function SecDiagram({ v, upd }) {
  const [edit,setEdit]=useState(null);   // {field,prop,l,t}
  const num=s=>Math.max(0,parseFloat(s)||0);
  const HL=num(v.H), HR=num(v.leeH), pw=num(v.pw), parW=num(v.wH), qW=num(v.wQ), parL=num(v.lH), qL=num(v.lQ);
  const VBW=330, VBH=250, padTop=18, padBot=20, availH=VBH-padTop-padBot;
  // scale to the taller side-stack (wall + its own parapet) so a sloping roof + both parapets fit;
  // identical to the old flat-roof scaling when HL===HR.
  const maxFt=Math.max(HL+parW, HR+parL, 1), pxPerFt=availH/maxFt;
  const wallBot=padTop+availH;                          // common foundation baseline (both walls)
  const wallLX=95, wallRX=250;
  const roofYL=wallBot - HL*pxPerFt;                    // windward roof point (left,  height HL)
  const roofYR=wallBot - HR*pxPerFt;                    // leeward  roof point (right, height HR)
  const parWTop=roofYL - parW*pxPerFt, parLTop=roofYR - parL*pxPerFt;
  const maxPsf=Math.max(pw,qW,qL,1), aS=42/maxPsf;
  const aWall=pw>0?Math.max(pw*aS,6):0, aWind=qW>0?Math.max(qW*aS,6):0, aLee=qL>0?Math.max(qL*aS,6):0;
  const rows=(yTop,yBot)=>{ const n=Math.max(1,Math.round((yBot-yTop)/8)); return Array.from({length:n+1},(_,i)=>yTop+(yBot-yTop)*i/n); };
  const CY="#23577F", YEL="#1C2733";
  const open=(field,prop,cx,cy)=>setEdit({field,prop,l:cx/VBW*100,t:cy/VBH*100});
  const Box=({cx,cy,text,color,field,prop,rot=0})=>{
    const w=text.length*4.1+6, h=11;
    return (
      <g style={{cursor:"pointer"}} onClick={()=>open(field,prop,cx,cy)} transform={rot?`rotate(${rot},${cx},${cy})`:undefined}>
        <rect x={cx-w/2} y={cy-h/2} width={w} height={h} rx={1.5} fill={color}/>
        <text x={cx} y={cy+0.4} fill="#fff" fontSize={7} fontWeight={700} textAnchor="middle" dominantBaseline="middle" style={{userSelect:"none"}}>{text}</text>
      </g>
    );
  };
  const wMid=(parWTop+roofYL)/2, hMidL=(roofYL+wallBot)/2, hMidR=(roofYR+wallBot)/2, lMid=(parLTop+roofYR)/2;
  const roofMidX=(wallLX+wallRX)/2, roofMidY=(roofYL+roofYR)/2;
  const roofAng=Math.atan2(roofYR-roofYL, wallRX-wallLX)*180/Math.PI;   // 0 when flat
  return (
    <div style={{position:"relative"}}>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{width:"100%",height:"auto",display:"block"}}>
        <defs>
          <marker id="dArr" markerWidth="6" markerHeight="6" refX="4.6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={CY}/></marker>
        </defs>
        <rect x="0" y="0" width={VBW} height={VBH} fill={C_BG} rx="6"/>

        {/* WALL SECTION — trapezoid: left edge = windward height, right edge = leeward height, top = roof line (slopes when heights differ) */}
        <polygon points={`${wallLX},${roofYL} ${wallRX},${roofYR} ${wallRX},${wallBot} ${wallLX},${wallBot}`} fill="none" stroke={YEL} strokeWidth="1.4"/>
        <text x={roofMidX} y={roofMidY-3} fill="#6B7684" fontSize="7" letterSpacing=".25em" textAnchor="middle"
              transform={`rotate(${roofAng},${roofMidX},${roofMidY})`}>ROOF LINE</text>

        {/* parapet walls — a single line rising from each side's own roof point (continues the wall face up) */}
        {parW>0 && <line x1={wallLX} y1={roofYL} x2={wallLX} y2={parWTop} stroke={YEL} strokeWidth="1.4"/>}
        {parL>0 && <line x1={wallRX} y1={roofYR} x2={wallRX} y2={parLTop} stroke={YEL} strokeWidth="1.4"/>}
        {/* node where each parapet starts (top of wall / roof point) — repositions live as heights are typed */}
        {parW>0 && <circle cx={wallLX} cy={roofYL} r="2.4" fill={C_NODE} stroke="#FFFFFF" strokeWidth="1"/>}
        {parL>0 && <circle cx={wallRX} cy={roofYR} r="2.4" fill={C_NODE} stroke="#FFFFFF" strokeWidth="1"/>}

        {/* windward WALL pressure — left edge, arrows point right */}
        {HL>0&&pw>0&&<g>
          <line x1={wallLX-aWall} y1={roofYL} x2={wallLX-aWall} y2={wallBot} stroke={CY} strokeWidth="1"/>
          {rows(roofYL,wallBot).map((y,i)=><line key={i} x1={wallLX-aWall} y1={y} x2={wallLX} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr)"/>)}
        </g>}
        {/* windward PARAPET pressure — left, arrows point right */}
        {parW>0&&qW>0&&<g>
          <line x1={wallLX-aWind} y1={parWTop} x2={wallLX-aWind} y2={roofYL} stroke={CY} strokeWidth="1"/>
          {rows(parWTop,roofYL).map((y,i)=><line key={i} x1={wallLX-aWind} y1={y} x2={wallLX} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr)"/>)}
        </g>}
        {/* leeward PARAPET pressure — right edge, arrows point right (left→right, with the wind) */}
        {parL>0&&qL>0&&<g>
          <line x1={wallRX} y1={parLTop} x2={wallRX} y2={roofYR} stroke={CY} strokeWidth="1"/>
          {rows(parLTop,roofYR).map((y,i)=><line key={i} x1={wallRX} y1={y} x2={wallRX+aLee} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr)"/>)}
        </g>}

        {/* WINDWARD / LEEWARD labels — vertical, beside each parapet line */}
        {parW>0&&<text x={wallLX+8} y={wMid} fill="#6B7684" fontSize="6" letterSpacing=".12em"
              textAnchor="middle" transform={`rotate(-90,${wallLX+8},${wMid})`}>WINDWARD</text>}
        {parL>0&&<text x={wallRX-8} y={lMid} fill="#6B7684" fontSize="6" letterSpacing=".12em"
              textAnchor="middle" transform={`rotate(-90,${wallRX-8},${lMid})`}>LEEWARD</text>}

        {/* pressure boxes (blue, vertical, over the arrows) */}
        <Box cx={wallLX-aWind/2} cy={wMid} text={`${fmt1(qW)} psf`} color={C_DIMBOX} field="wQ" prop="qWind" rot={-90}/>
        <Box cx={wallLX-aWall/2} cy={hMidL} text={`${fmt1(pw)} psf`} color={C_DIMBOX} field="pw" prop="pw"   rot={-90}/>
        <Box cx={wallRX+aLee/2} cy={lMid} text={`${fmt1(qL)} psf`} color={C_DIMBOX} field="lQ" prop="qLee" rot={-90}/>
        {/* height boxes (red, horizontal, beside each element) — windward wall HL, leeward wall HR, both parapets */}
        <Box cx={wallLX+30} cy={wMid} text={`${fmt1(parW)} ft`} color={C_REACTBOX} field="wH"   prop="parW"/>
        <Box cx={wallLX+22}      cy={hMidL} text={`${fmt1(HL)} ft`}  color={C_REACTBOX} field="H"    prop="H"/>
        <Box cx={wallRX-22}      cy={hMidR} text={`${fmt1(HR)} ft`}  color={C_REACTBOX} field="leeH" prop="leeH"/>
        <Box cx={wallRX-30} cy={lMid} text={`${fmt1(parL)} ft`} color={C_REACTBOX} field="lH"   prop="parL"/>
      </svg>

      {edit && (
        <input autoFocus type="number" inputMode="decimal" value={v[edit.field] ?? ""}
          onChange={upd(edit.field, edit.prop)} onBlur={()=>setEdit(null)}
          onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Escape") setEdit(null); }}
          style={{ position:"absolute", left:`${edit.l}%`, top:`${edit.t}%`, transform:"translate(-50%,-50%)",
                   width:58, padding:"4px 6px", textAlign:"center",
                   background:"#FFFFFF", color:"#9A6B1F", border:"1.5px solid #9A6B1F", borderRadius:3, font:"700 13px ui-monospace,Menlo,monospace", outline:"none", zIndex:6 }}/>
      )}
    </div>
  );
}

/* ═══════════════ TWO-STORY SECTION ELEVATION (Step 4) ═══════════════
   Stacked flat-roof elevation: 1st story (H) + 2nd story (H₂) split by the 2nd-floor diaphragm,
   parapets on top, windward wall pressure over both stories, and both diaphragm line-load callouts.
   SecDiagram (1-story) is left untouched; the wind window picks this variant in 2-story mode. */
function SecDiagram2({ v, upd, roofLL, floorLL }) {
  const [edit,setEdit]=useState(null);
  const num=s=>Math.max(0,parseFloat(s)||0);
  const H1=num(v.H),   H2=num(v.H2),   pw=num(v.pw), parW=num(v.wH), qW=num(v.wQ);   // windward 1st/2nd-story + parapet
  const LH1=num(v.leeH), LH2=num(v.leeH2),            parL=num(v.lH), qL=num(v.lQ);   // leeward  1st/2nd-story + parapet
  const VBW=362, VBH=300, padTop=22, padBot=26, availH=VBH-padTop-padBot;
  const maxFt=Math.max(H1+H2+parW, LH1+LH2+parL, 1), pxPerFt=availH/maxFt;
  const wallBot=padTop+availH;                          // 1st floor / foundation baseline (shared)
  const wallLX=106, wallRX=236;
  const yF2L=wallBot - H1*pxPerFt,  yRoofL=yF2L - H2*pxPerFt;    // windward 2nd-floor + roof points
  const yF2R=wallBot - LH1*pxPerFt, yRoofR=yF2R - LH2*pxPerFt;   // leeward  2nd-floor + roof points (may differ → sloped)
  const parWTop=yRoofL - parW*pxPerFt, parLTop=yRoofR - parL*pxPerFt;
  const maxPsf=Math.max(pw,qW,qL,1), aS=40/maxPsf;
  const aWall=pw>0?Math.max(pw*aS,6):0, aWind=qW>0?Math.max(qW*aS,6):0, aLee=qL>0?Math.max(qL*aS,6):0;
  const rows=(yTop,yBot)=>{ const n=Math.max(1,Math.round((yBot-yTop)/8)); return Array.from({length:n+1},(_,i)=>yTop+(yBot-yTop)*i/n); };
  const CY="#23577F", YEL="#1C2733", GOLD="#9A6B1F";
  const open=(field,prop,cx,cy)=>setEdit({field,prop,l:cx/VBW*100,t:cy/VBH*100});
  const Box=({cx,cy,text,color,field,prop,rot=0})=>{
    const w=text.length*4.1+6, h=11;
    return (
      <g style={{cursor:"pointer"}} onClick={()=>open(field,prop,cx,cy)} transform={rot?`rotate(${rot},${cx},${cy})`:undefined}>
        <rect x={cx-w/2} y={cy-h/2} width={w} height={h} rx={1.5} fill={color}/>
        <text x={cx} y={cy+0.4} fill="#fff" fontSize={7} fontWeight={700} textAnchor="middle" dominantBaseline="middle" style={{userSelect:"none"}}>{text}</text>
      </g>
    );
  };
  const mid2L=(yRoofL+yF2L)/2, mid1L=(yF2L+wallBot)/2;          // windward story mids (left height boxes)
  const mid2R=(yRoofR+yF2R)/2, mid1R=(yF2R+wallBot)/2;          // leeward  story mids (right height boxes)
  const wMid=(parWTop+yRoofL)/2, lMid=(parLTop+yRoofR)/2;
  const cx=(wallLX+wallRX)/2, calloutX=VBW-90;
  const lblY2=(mid2L+mid2R)/2, lblY1=(mid1L+mid1R)/2;          // story labels centered between the (possibly sloped) lines
  return (
    <div style={{position:"relative"}}>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{width:"100%",height:"auto",display:"block"}}>
        <defs>
          <marker id="dArr2" markerWidth="6" markerHeight="6" refX="4.6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={CY}/></marker>
        </defs>
        <rect x="0" y="0" width={VBW} height={VBH} fill={C_BG} rx="6"/>

        {/* building outline — two stories; roof & 2nd-floor lines slope if windward/leeward heights differ */}
        <line x1={wallLX} y1={yRoofL} x2={wallLX} y2={wallBot} stroke={YEL} strokeWidth="1.4"/>
        <line x1={wallRX} y1={yRoofR} x2={wallRX} y2={wallBot} stroke={YEL} strokeWidth="1.4"/>
        <line x1={wallLX} y1={wallBot} x2={wallRX} y2={wallBot} stroke={YEL} strokeWidth="1.4"/>
        <line x1={wallLX} y1={yRoofL} x2={wallRX} y2={yRoofR} stroke={YEL} strokeWidth="1.4"/>{/* roof diaphragm */}
        <line x1={wallLX} y1={yF2L}   x2={wallRX} y2={yF2R}   stroke={YEL} strokeWidth="1.1" strokeDasharray="4 3"/>{/* 2nd-floor diaphragm */}

        {/* parapets */}
        {parW>0 && <line x1={wallLX} y1={yRoofL} x2={wallLX} y2={parWTop} stroke={YEL} strokeWidth="1.4"/>}
        {parL>0 && <line x1={wallRX} y1={yRoofR} x2={wallRX} y2={parLTop} stroke={YEL} strokeWidth="1.4"/>}
        {parW>0 && <circle cx={wallLX} cy={yRoofL} r="2.2" fill={C_NODE} stroke="#FFFFFF" strokeWidth="1"/>}
        {parL>0 && <circle cx={wallRX} cy={yRoofR} r="2.2" fill={C_NODE} stroke="#FFFFFF" strokeWidth="1"/>}

        {/* windward WALL pressure — both stories, arrows point right */}
        {pw>0&&(H1+H2)>0&&<g>
          <line x1={wallLX-aWall} y1={yRoofL} x2={wallLX-aWall} y2={wallBot} stroke={CY} strokeWidth="1"/>
          {rows(yRoofL,wallBot).map((y,i)=><line key={i} x1={wallLX-aWall} y1={y} x2={wallLX} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr2)"/>)}
        </g>}
        {/* windward PARAPET pressure */}
        {parW>0&&qW>0&&<g>
          <line x1={wallLX-aWind} y1={parWTop} x2={wallLX-aWind} y2={yRoofL} stroke={CY} strokeWidth="1"/>
          {rows(parWTop,yRoofL).map((y,i)=><line key={i} x1={wallLX-aWind} y1={y} x2={wallLX} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr2)"/>)}
        </g>}
        {/* leeward PARAPET pressure — right side */}
        {parL>0&&qL>0&&<g>
          <line x1={wallRX} y1={parLTop} x2={wallRX} y2={yRoofR} stroke={CY} strokeWidth="1"/>
          {rows(parLTop,yRoofR).map((y,i)=><line key={i} x1={wallRX} y1={y} x2={wallRX+aLee} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArr2)"/>)}
        </g>}

        {/* WINDWARD / LEEWARD vertical labels beside each parapet */}
        {parW>0 && <text x={wallLX+9} y={wMid} fill="#6B7684" fontSize="6" letterSpacing=".12em" textAnchor="middle" transform={`rotate(-90,${wallLX+9},${wMid})`}>WINDWARD</text>}
        {parL>0 && <text x={wallRX-9} y={lMid} fill="#6B7684" fontSize="6" letterSpacing=".12em" textAnchor="middle" transform={`rotate(-90,${wallRX-9},${lMid})`}>LEEWARD</text>}

        {/* story + floor labels */}
        <text x={cx} y={lblY2+2} fill="#6B7684" fontSize="8" letterSpacing=".14em" textAnchor="middle">2ND STORY</text>
        <text x={cx} y={lblY1+2} fill="#6B7684" fontSize="8" letterSpacing=".14em" textAnchor="middle">1ST STORY</text>
        <text x={cx} y={wallBot+13} fill="#6B7684" fontSize="6.5" letterSpacing=".1em" textAnchor="middle">1ST FLOOR · FOUNDATION</text>

        {/* diaphragm load callouts (gold leaders to the right, anchored at the leeward points) */}
        <line x1={wallRX} y1={yRoofR} x2={calloutX-2} y2={yRoofR} stroke={GOLD} strokeWidth=".7" strokeDasharray="2 2"/>
        <text x={calloutX} y={yRoofR-2.5} fill={GOLD} fontSize="7" fontWeight="700">Level 2 diaphragm</text>
        <text x={calloutX} y={yRoofR+7}  fill={GOLD} fontSize="9" fontWeight="700">{fmt1(roofLL)} plf</text>
        <line x1={wallRX} y1={yF2R} x2={calloutX-2} y2={yF2R} stroke={GOLD} strokeWidth=".7" strokeDasharray="2 2"/>
        <text x={calloutX} y={yF2R-2.5} fill={GOLD} fontSize="7" fontWeight="700">Level 1 diaphragm</text>
        <text x={calloutX} y={yF2R+7}  fill={GOLD} fontSize="9" fontWeight="700">{fmt1(floorLL)} plf</text>

        {/* pressure boxes (blue) */}
        <Box cx={wallLX-aWall/2} cy={(yRoofL+wallBot)/2} text={`${fmt1(pw)} psf`} color={C_DIMBOX} field="pw" prop="pw" rot={-90}/>
        {parW>0&&<Box cx={wallLX-aWind/2} cy={wMid} text={`${fmt1(qW)} psf`} color={C_DIMBOX} field="wQ" prop="qWind" rot={-90}/>}
        {parL>0&&<Box cx={wallRX+aLee/2} cy={lMid} text={`${fmt1(qL)} psf`} color={C_DIMBOX} field="lQ" prop="qLee" rot={-90}/>}
        {/* height boxes (red) — windward H₂/H (left), leeward H₂/H (right), parapets */}
        <Box cx={wallLX+20} cy={mid2L} text={`${fmt1(H2)} ft`}  color={C_REACTBOX} field="H2"    prop="H2"/>
        <Box cx={wallLX+20} cy={mid1L} text={`${fmt1(H1)} ft`}  color={C_REACTBOX} field="H"     prop="H"/>
        <Box cx={wallRX-20} cy={mid2R} text={`${fmt1(LH2)} ft`} color={C_REACTBOX} field="leeH2" prop="leeH2"/>
        <Box cx={wallRX-20} cy={mid1R} text={`${fmt1(LH1)} ft`} color={C_REACTBOX} field="leeH"  prop="leeH"/>
        {parW>0&&<Box cx={wallLX+22} cy={wMid} text={`${fmt1(parW)} ft`} color={C_REACTBOX} field="wH" prop="parW"/>}
        {parL>0&&<Box cx={wallRX-22} cy={lMid} text={`${fmt1(parL)} ft`} color={C_REACTBOX} field="lH" prop="parL"/>}
      </svg>

      {edit && (
        <input autoFocus type="number" inputMode="decimal" value={v[edit.field] ?? ""}
          onChange={upd(edit.field, edit.prop)} onBlur={()=>setEdit(null)}
          onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Escape") setEdit(null); }}
          style={{ position:"absolute", left:`${edit.l}%`, top:`${edit.t}%`, transform:"translate(-50%,-50%)",
                   width:58, padding:"4px 6px", textAlign:"center",
                   background:"#FFFFFF", color:"#9A6B1F", border:"1.5px solid #9A6B1F", borderRadius:3, font:"700 13px ui-monospace,Menlo,monospace", outline:"none", zIndex:6 }}/>
      )}
    </div>
  );
}

/* ── CAD palette ── */



/* (rev 39) STEPPED MIXED-height section — a 1-story windward wall WITH a 2-story portion behind it
   (the user's "1ST FLOOR PLAN" SECTION A). Short green windward wall + parapet in front, the taller
   2-story block behind rising to the roof, the leeward wall, the floor diaphragm at the 1-story level
   and the roof diaphragm over the block. The floor-diaphragm line load picks up ½·H₂·pw from the block
   → the 454. The block height is display-only (it comes from the 2-story wall on the plan); the
   windward wall's own fields stay editable. SecDiagram / SecDiagram2 are untouched. */
/* (rev 40) GENERAL OVERALL-BUILDING SECTION — draws whatever ordered run of walls the cut crosses,
   front (windward) → back (leeward), each at its own story height. This single renderer covers all
   of the schematic's section types from the wall SEQUENCE alone:
     1→2→2→1  = Section A   ·   1→1 = Section B (handled by SecDiagram)   ·   1→2→2 = Section C
     2→2→1    = Section C reverse.
   `seq` = [{one,H,H2,par,pw,qWind,qLee}, …] front→back (one = tagged 1-story). The floor diaphragm
   runs across every wall at the 1-story top; the roof diaphragm spans the contiguous 2-story block.
   The front & back walls are editable through the live `v`/`upd` buffer; interior walls are display
   only (their props come from the plan). SecDiagram / SecDiagram2 are untouched. */
function SecDiagramSeq({ seq, v, upd, floorLL, roofLL, commit }){
  const [edit,setEdit]=useState(null);
  const [ebuf,setEbuf]=useState({});          // (rev 42) raw-string buffer for INTERIOR-wall inputs (key-based), so "13." survives typing
  const num=s=>Math.max(0,parseFloat(s)||0);
  const N=Math.max(seq.length,1), last=N-1;
  const propOf=(i)=>{ const w=seq[i]||{};
    if(i===0)    return { one:w.one, H:num(v.H),    H2:num(v.H2 ?? w.H2), par:num(v.wH), pw:num(v.pw),  q:num(v.wQ) };
    if(i===last) return { one:w.one, H:num(v.leeH), H2:num(v.leeH2 ?? w.H2), par:num(v.lH), pw:num(w.pw), q:num(v.lQ) };
    return { one:w.one, H:num(w.H), H2:num(w.H2), par:num(w.par), pw:num(w.pw), q:num(w.qWind) };
  };
  const W=seq.map((_,i)=>propOf(i));
  const H1=Math.max(1,...W.map(w=>w.H));
  const H2box=Math.max(0,...W.filter(w=>!w.one).map(w=>w.H2));
  const VBW=380, VBH=300, padTop=22, padBot=30, availH=VBH-padTop-padBot, wallBot=padTop+availH;  // (rev 41) wider → room for the right-side callouts
  const maxFt=Math.max(1,...W.map(w=>(w.one?w.H:w.H+w.H2)+w.par));
  const pxPerFt=availH/maxFt;
  const leftX=70, rightX=250, sp=rightX-leftX;   // (rev 41) walls pulled left so the diaphragm callouts no longer overlap the leeward wall line
  const xAt=(i)=> N<=1?leftX:(leftX + i*sp/(N-1));
  const topY=(w)=> wallBot - (w.one? w.H : w.H+w.H2)*pxPerFt;
  // (rev 43) PER-WALL diaphragm levels so the diaphragm lines CONNECT to each wall's own top and the
  // section DEFORMS as a connected shape when a height changes (the 1-story's sloping ROOF LINE,
  // generalized to N walls), instead of a flat line pinned at the max height. floorY = a wall's
  // 1st-story top (Level-1/floor node); roofY = a 2-story wall's full top (Level-2/roof node). When the
  // heights all match these collapse to the old flat lines, so a uniform building looks unchanged.
  const floorY=(i)=> wallBot - W[i].H*pxPerFt;
  const roofY =(i)=> wallBot - (W[i].H + (W[i].one?0:W[i].H2))*pxPerFt;
  const yF2 = wallBot - H1*pxPerFt;                 // max 1-story top (kept for scale/label fallback)
  const yRoof= wallBot - (H1+H2box)*pxPerFt;        // max block top
  const CY="#23577F", YEL="#1C2733", GOLD="#9A6B1F", GRN="#2E6B4F", GRY="#6B7684";
  const pw0=W[0].pw, q0=W[0].q, qL=W[last].q;
  // (rev 41) scale the arrows over EVERY wall's pressures (incl. the 2-story block), so the block's
  // windward/parapet/leeward arrows are proportional and fit the 30px budget.
  const maxPsf=Math.max(pw0,q0,qL,1,...seq.map(w=>Math.max(num(w.pw),num(w.qWind),num(w.qLee)))), aS=30/maxPsf;
  const aOf=(psf)=> psf>0?Math.max(psf*aS,6):0;
  const aWall=aOf(pw0), aWind=aOf(q0), aLee=aOf(qL);
  const rows=(yTop,yBot)=>{ const n=Math.max(1,Math.round((yBot-yTop)/8)); return Array.from({length:n+1},(_,i)=>yTop+(yBot-yTop)*i/n); };
  // (rev 42) `open` carries an optional edge `key`: when set, the floating input edits THAT wall's props
  // directly via `commit(key,prop,val)` (interior block walls); when absent it uses the v/upd front-back path.
  const open=(field,prop,cx,cy,key)=>setEdit({field,prop,key,l:cx/VBW*100,t:cy/VBH*100});
  const seqVal=(key,prop)=>{ const w=seq.find(s=>s.key===key)||{}; return num(w[prop]); };   // current value for a keyed input
  const Box=({cx,cy,text,color,field,prop,rot=0,ed=true,wkey})=>{ const w=text.length*4.1+6,h=11;
    return (<g style={{cursor:ed?"pointer":"default"}} onClick={ed?()=>open(field,prop,cx,cy,wkey):undefined} transform={rot?`rotate(${rot},${cx},${cy})`:undefined}>
      <rect x={cx-w/2} y={cy-h/2} width={w} height={h} rx={1.5} fill={color}/>
      <text x={cx} y={cy+0.4} fill="#fff" fontSize={7} fontWeight={700} textAnchor="middle" dominantBaseline="middle" style={{userSelect:"none"}}>{text}</text></g>); };
  const twoIdx=W.map((w,i)=>w.one?-1:i).filter(i=>i>=0);   // indices of 2-story walls (the block)
  const calloutX=300;   // (rev 41) right of rightX(250)+leeward arrows → no overlap with the wall line
  const cFloorY=floorY(last);                                   // (rev 43) anchor the Level-1 callout to the floor diaphragm's leeward END
  const cRoofY = twoIdx.length ? roofY(twoIdx[twoIdx.length-1]) : yRoof;   // Level-2 callout → roof diaphragm's leeward end
  return (
   <div style={{position:"relative"}}>
    <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{width:"100%",height:"auto",display:"block"}}>
      <defs><marker id="dArrM" markerWidth="6" markerHeight="6" refX="4.6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={CY}/></marker></defs>
      <rect x="0" y="0" width={VBW} height={VBH} fill={C_BG} rx="6"/>
      {/* foundation */}
      <line x1={xAt(0)} y1={wallBot} x2={xAt(last)} y2={wallBot} stroke={YEL} strokeWidth="1.4"/>
      {/* (rev 43) LEVEL-1 (floor) diaphragm — a POLYLINE through every wall's own 1st-story top with a NODE
          at each, so changing any wall's H makes the diaphragm slope/step and the section deforms as one
          connected shape (like the 1-story sloping ROOF LINE). Flat when all 1st-story heights match. */}
      <polyline points={W.map((w,i)=>`${xAt(i)},${floorY(i)}`).join(" ")} fill="none" stroke={GOLD} strokeWidth="1.3" strokeDasharray="5 3"/>
      {W.map((w,i)=><circle key={"fn"+i} cx={xAt(i)} cy={floorY(i)} r="2" fill={GOLD} stroke="#fff" strokeWidth="1"/>)}
      {/* (rev 43) LEVEL-2 (roof) diaphragm — polyline through the 2-story block walls' full tops + nodes */}
      {twoIdx.length>0 && <polyline points={twoIdx.map(i=>`${xAt(i)},${roofY(i)}`).join(" ")} fill="none" stroke={YEL} strokeWidth="1.4"/>}
      {twoIdx.map(i=><circle key={"rn"+i} cx={xAt(i)} cy={roofY(i)} r="2" fill={YEL} stroke="#fff" strokeWidth="1"/>)}
      {/* each wall in the cut, front → back (its top coincides with its diaphragm node, so they connect) */}
      {W.map((w,i)=>{ const x=xAt(i), ty=topY(w), pty=ty-w.par*pxPerFt, col=w.one?GRN:YEL;
        return (<g key={i}>
          <line x1={x} y1={ty} x2={x} y2={wallBot} stroke={col} strokeWidth={w.one?1.8:1.6}/>
          {w.par>0 && <line x1={x} y1={ty} x2={x} y2={pty} stroke={col} strokeWidth={w.one?1.8:1.6}/>}
          {w.par>0 && <circle cx={x} cy={pty} r="1.7" fill={col} stroke="#fff" strokeWidth=".8"/>}
          <text x={x} y={wallBot+11} fill={w.one?GRN:GRY} fontSize="5.6" fontWeight="700" textAnchor="middle">{w.one?"1-STY":"2-STY"}</text>
        </g>); })}
      {/* windward pressure (front wall: full height + parapet) */}
      {(()=>{ const x=xAt(0), w=W[0], ty=topY(w), pty=ty-w.par*pxPerFt; return (<g>
        {w.pw>0&&<g><line x1={x-aWall} y1={ty} x2={x-aWall} y2={wallBot} stroke={CY} strokeWidth="1"/>
          {rows(ty,wallBot).map((y,k)=><line key={k} x1={x-aWall} y1={y} x2={x} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g>}
        {w.par>0&&w.q>0&&<g><line x1={x-aWind} y1={pty} x2={x-aWind} y2={ty} stroke={CY} strokeWidth="1"/>
          {rows(pty,ty).map((y,k)=><line key={k} x1={x-aWind} y1={y} x2={x} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g>}
      </g>); })()}
      {/* leeward parapet pressure (back wall) */}
      {(()=>{ const x=xAt(last), w=W[last], ty=topY(w), pty=ty-w.par*pxPerFt; return (w.par>0&&w.q>0?
        <g><line x1={x} y1={pty} x2={x} y2={ty} stroke={CY} strokeWidth="1"/>
          {rows(pty,ty).map((y,k)=><line key={k} x1={x} y1={y} x2={x+aLee} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g> : null); })()}
      {/* (rev 41) 2-STORY BLOCK pressures — the windward upper-story + parapet (and the leeward parapet)
          that feed the LEVEL-2 (roof) diaphragm. These were missing: the block walls drew as bare lines.
          Windward face = the front-most 2-story wall (only its UPPER story + parapet see wind; the lower
          story is shadowed by whatever is in front of it). Leeward face = the back-most 2-story wall
          (parapet). When a block end coincides with the sequence front/back it is already drawn above. */}
      {twoIdx.length>0 && (()=>{
        const bw=twoIdx[0], bl=twoIdx[twoIdx.length-1];
        const fw=W[bw], fx=xAt(bw), fTop=topY(fw), fFloor=wallBot-fw.H*pxPerFt, fpTop=fTop-fw.par*pxPerFt;
        const fQ=num((seq[bw]||{}).qWind), aFp=aOf(fQ);          // block-front windward parapet pressure
        const bwl=W[bl], bx=xAt(bl), bTop=topY(bwl), bpTop=bTop-bwl.par*pxPerFt;
        const bQ=num((seq[bl]||{}).qLee), aBp=aOf(bQ);           // block-back leeward parapet pressure
        return (<g>
          {bw!==0 && fw.pw>0 && <g>{/* windward UPPER story (roof→floor of the block) — lower story shadowed */}
            <line x1={fx-aWall} y1={fTop} x2={fx-aWall} y2={fFloor} stroke={CY} strokeWidth="1"/>
            {rows(fTop,fFloor).map((y,k)=><line key={"bfu"+k} x1={fx-aWall} y1={y} x2={fx} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g>}
          {bw!==0 && fw.par>0 && fQ>0 && <g>{/* windward parapet */}
            <line x1={fx-aFp} y1={fpTop} x2={fx-aFp} y2={fTop} stroke={CY} strokeWidth="1"/>
            {rows(fpTop,fTop).map((y,k)=><line key={"bfp"+k} x1={fx-aFp} y1={y} x2={fx} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g>}
          {bl!==last && bwl.par>0 && bQ>0 && <g>{/* leeward parapet (arrows to the right) */}
            <line x1={bx} y1={bpTop} x2={bx} y2={bTop} stroke={CY} strokeWidth="1"/>
            {rows(bpTop,bTop).map((y,k)=><line key={"bbp"+k} x1={bx} y1={y} x2={bx+aBp} y2={y} stroke={CY} strokeWidth=".7" markerEnd="url(#dArrM)"/>)}</g>}
        </g>);
      })()}
      {/* labels + diaphragm callouts */}
      <text x={(xAt(0)+xAt(last))/2} y={wallBot+22} fill={GRY} fontSize="6.5" letterSpacing=".1em" textAnchor="middle">1ST FLOOR · FOUNDATION</text>
      {twoIdx.length>0 && <g>
        <line x1={xAt(twoIdx[twoIdx.length-1])} y1={cRoofY} x2={calloutX-2} y2={cRoofY} stroke={GOLD} strokeWidth=".7" strokeDasharray="2 2"/>
        <text x={calloutX} y={cRoofY-2.5} fill={GOLD} fontSize="6.8" fontWeight="700">Level 2 diaphragm</text>
        <text x={calloutX} y={cRoofY+7.5} fill={GOLD} fontSize="9.5" fontWeight="700">{fmt1(roofLL)} plf</text></g>}
      <line x1={xAt(last)} y1={cFloorY} x2={calloutX-2} y2={cFloorY} stroke={GOLD} strokeWidth=".7" strokeDasharray="2 2"/>
      <text x={calloutX} y={cFloorY-2.5} fill={GOLD} fontSize="6.8" fontWeight="700">Level 1 diaphragm</text>
      <text x={calloutX} y={cFloorY+7.5} fill={GOLD} fontSize="9.5" fontWeight="700">{fmt1(floorLL)} plf</text>
      {/* editable FRONT (windward) wall boxes */}
      {(()=>{ const x=xAt(0), w=W[0], ty=topY(w), pty=ty-w.par*pxPerFt, y2=wallBot-w.H*pxPerFt; return (<g>
        {w.pw>0&&<Box cx={x-aWall/2} cy={(ty+wallBot)/2} text={`${fmt1(w.pw)} psf`} color={C_DIMBOX} field="pw" prop="pw" rot={-90}/>}
        <Box cx={x+13} cy={(y2+wallBot)/2} text={`${fmt1(w.H)} ft`} color={C_REACTBOX} field="H" prop="H"/>
        {!w.one&&w.H2>0&&<Box cx={x+13} cy={(ty+y2)/2} text={`${fmt1(w.H2)} ft`} color={C_REACTBOX} field="H2" prop="H2"/>}
        {w.par>0&&<Box cx={x-aWind/2} cy={(pty+ty)/2} text={`${fmt1(w.q)} psf`} color={C_DIMBOX} field="wQ" prop="qWind" rot={-90}/>}
        {w.par>0&&<Box cx={x+13} cy={(pty+ty)/2} text={`${fmt1(w.par)} ft`} color={C_REACTBOX} field="wH" prop="parW"/>}
      </g>); })()}
      {/* (rev 44) editable BACK (leeward-most) wall — its HEIGHT (and H₂ if 2-story) is ALWAYS editable
          for correct geometry, even though this wall carries no diaphragm load (mirrors the 1-story's
          editable leeward HR, which tilts the roof line without contributing to the wall load). Its
          parapet height + leeward parapet pressure stay editable too. leeH/leeH2 route to the back wall. */}
      {(()=>{ const x=xAt(last), w=W[last], ty=topY(w), pty=ty-w.par*pxPerFt, y2=wallBot-w.H*pxPerFt; return (<g>
        <Box cx={x-13} cy={(y2+wallBot)/2} text={`${fmt1(w.H)} ft`} color={C_REACTBOX} field="leeH" prop="leeH"/>
        {!w.one && w.H2>0 && <Box cx={x-13} cy={(ty+y2)/2} text={`${fmt1(w.H2)} ft`} color={C_REACTBOX} field="leeH2" prop="leeH2"/>}
        {w.par>0 && w.q>0 && <Box cx={x+aLee/2} cy={(pty+ty)/2} text={`${fmt1(w.q)} psf`} color={C_DIMBOX} field="lQ" prop="qLee" rot={-90}/>}
        {w.par>0 && <Box cx={x-13} cy={(pty+ty)/2} text={`${fmt1(w.par)} ft`} color={C_REACTBOX} field="lH" prop="parL"/>}
      </g>); })()}
      {/* (rev 42) editable INTERIOR 2-story BLOCK walls — height + pressure, written straight to each wall's
          own props by key (front block = windward face: pw·H·H₂·par·qWind; back block = leeward face:
          qLee·par·H·H₂). Only for block ends that are NOT the sequence front/back (those use the boxes above). */}
      {twoIdx.length>0 && (()=>{
        const bw=twoIdx[0], bl=twoIdx[twoIdx.length-1];
        const fr = bw!==0 && (()=>{ const x=xAt(bw), w=W[bw], k=(seq[bw]||{}).key, ty=topY(w), fFloor=wallBot-w.H*pxPerFt, pty=ty-w.par*pxPerFt, qW=num((seq[bw]||{}).qWind);
          return (<g>
            {w.pw>0 && <Box cx={x-aWall/2} cy={(ty+fFloor)/2} text={`${fmt1(w.pw)} psf`} color={C_DIMBOX} prop="pw" wkey={k} rot={-90}/>}
            <Box cx={x+13} cy={(fFloor+wallBot)/2} text={`${fmt1(w.H)} ft`} color={C_REACTBOX} prop="H" wkey={k}/>
            <Box cx={x+13} cy={(ty+fFloor)/2}     text={`${fmt1(w.H2)} ft`} color={C_REACTBOX} prop="H2" wkey={k}/>
            {w.par>0 && <Box cx={x+13}      cy={(pty+ty)/2} text={`${fmt1(w.par)} ft`} color={C_REACTBOX} prop="par" wkey={k}/>}
            {w.par>0 && <Box cx={x-aOf(qW)/2} cy={(pty+ty)/2} text={`${fmt1(qW)} psf`} color={C_DIMBOX} prop="qWind" wkey={k} rot={-90}/>}
          </g>); })();
        const bk = bl!==last && (()=>{ const x=xAt(bl), w=W[bl], k=(seq[bl]||{}).key, ty=topY(w), fFloor=wallBot-w.H*pxPerFt, pty=ty-w.par*pxPerFt, qLv=num((seq[bl]||{}).qLee);
          return (<g>
            {w.par>0 && qLv>0 && <Box cx={x+aOf(qLv)/2} cy={(pty+ty)/2} text={`${fmt1(qLv)} psf`} color={C_DIMBOX} prop="qLee" wkey={k} rot={-90}/>}
            {w.par>0 && <Box cx={x-13} cy={(pty+ty)/2} text={`${fmt1(w.par)} ft`} color={C_REACTBOX} prop="par" wkey={k}/>}
            <Box cx={x-13} cy={(fFloor+wallBot)/2} text={`${fmt1(w.H)} ft`} color={C_REACTBOX} prop="H" wkey={k}/>
            <Box cx={x-13} cy={(ty+fFloor)/2}     text={`${fmt1(w.H2)} ft`} color={C_REACTBOX} prop="H2" wkey={k}/>
          </g>); })();
        return (<g>{fr||null}{bk||null}</g>);
      })()}
    </svg>
    {edit && (
      <input autoFocus type="number" inputMode="decimal"
        value={ edit.key ? (ebuf[`${edit.key}:${edit.prop}`] ?? String(seqVal(edit.key,edit.prop))) : (v[edit.field] ?? "") }
        onChange={ edit.key
          ? (e)=>{ const raw=e.target.value; setEbuf(p=>({ ...p, [`${edit.key}:${edit.prop}`]:raw })); commit(edit.key, edit.prop, num(raw)); }
          : upd(edit.field, edit.prop) }
        onBlur={()=>{ if(edit&&edit.key){ const kk=`${edit.key}:${edit.prop}`; setEbuf(p=>{ const n={...p}; delete n[kk]; return n; }); } setEdit(null); }}
        onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Escape") e.target.blur(); }}
        style={{ position:"absolute", left:`${edit.l}%`, top:`${edit.t}%`, transform:"translate(-50%,-50%)",
                 width:58, padding:"4px 6px", textAlign:"center",
                 background:"#FFFFFF", color:"#9A6B1F", border:"1.5px solid #9A6B1F", borderRadius:3, font:"700 13px ui-monospace,Menlo,monospace", outline:"none", zIndex:6 }}/>
    )}
   </div>
  );
}

/* masked label box (blue for dimensions, red for reactions) — readable over any line */
function Tag({ x, y, text, box, S, rot=0, ts=1 }) {
  const fs=1.35*S*ts, w=text.length*fs*0.64+0.9*S*ts, h=fs*1.35;
  return (
    <g transform={rot?`rotate(${rot},${x},${y})`:undefined}>
      <rect x={x-w/2} y={y-h/2} width={w} height={h} rx={0.3*S*ts} fill={box}/>
      <text x={x} y={y+0.15*S*ts} fill="#fff" fontSize={fs} fontWeight="700"
            textAnchor="middle" dominantBaseline="middle">{text}</text>
    </g>
  );
}

/* stable field — defined at module scope so it never remounts (keeps focus) */
function Field({ label, unit, value, onChange }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <div style={{ position:"relative" }}>
        <input type="number" min="0" step="0.1" value={value ?? ""} onChange={onChange}
               style={{ width:"100%", paddingRight:36 }}/>
        <span style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#7e8db5" }}>{unit}</span>
      </div>
    </div>
  );
}

/* ═══════════════ WINDWARD LINE-LOAD (static, CAD style) ═══════════════ */
function WindLoad({ load, onOpen, S=1, ts=1, displayPlf=null, prec=1 }) {
  const { nx, ny } = load;
  // one group per leeward sub-region (split where the back wall's parapet changes). Adjacent
  // sub-regions that resolve to the SAME plf are merged into one span here so the wall shows a
  // single load label — two labels appear ONLY where the line load actually changes along the wall
  // (matching the dashed tributary divide, which is likewise drawn only where plf differs).
  const raw = (load.subLoads && load.subLoads.length)
    ? load.subLoads
    : [{ a:load.wa, b:load.wb, plf:load.total }];
  let segs = [];
  if(displayPlf!=null){
    // rev 34 — 2-story FLOOR-1 view: the floor diaphragm load (½·H·pw + ½·H₂·pw) is uniform along the
    // wall (the leeward-parapet term lives only in the ROOF diaphragm, which transfers down through the
    // shear walls, not the floor diaphragm), so collapse to ONE span showing the floor-only plf.
    segs = [{ a:load.wa, b:load.wb, plf:displayPlf }];
  } else {
    for(const sg of raw){
      const prev = segs[segs.length-1];
      if(prev && Math.abs(prev.plf - sg.plf) < 0.5) prev.b = sg.b;   // same plf → extend the span
      else segs.push({ a:sg.a, b:sg.b, plf:sg.plf });
    }
  }
  return (
    <g style={{cursor:"pointer"}} onPointerDown={e=>e.stopPropagation()} onClick={onOpen}>
      {segs.map((sg,si)=>{
        const wa=sg.a, wb=sg.b, total=sg.plf;
        const len=Math.hypot(wb.x-wa.x, wb.y-wa.y);
        const aLen = clamp(total/55, 3, 8) * 0.5 * S * ts;   // rev 32: scales with Markup (ts); base *0.5 (original)
        const n = Math.max(2, Math.round(len/(5.5*S)));
        const tip = 0.3*S*ts;                               // rev 32: scales with Markup; base 0.3 (original)
        const b1={x:wa.x+nx*aLen, y:wa.y+ny*aLen}, b2={x:wb.x+nx*aLen, y:wb.y+ny*aLen};
        const arrows=[];
        for(let i=0;i<=n;i++){
          const f=i/n, px=wa.x+(wb.x-wa.x)*f, py=wa.y+(wb.y-wa.y)*f;
          arrows.push({k:i, x1:px+nx*aLen, y1:py+ny*aLen, x2:px+nx*tip, y2:py+ny*tip});
        }
        const wallVert = Math.abs(wb.y-wa.y) > Math.abs(wb.x-wa.x);
        const mx=(wa.x+wb.x)/2, my=(wa.y+wb.y)/2;
        const lx=mx+nx*(aLen+2.2*S*ts), ly=my+ny*(aLen+2.2*S*ts);
        return (
          <g key={si}>
            <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke={C_LOAD} strokeWidth={0.2*S*ts}/>
            {arrows.map(a=>(
              <line key={a.k} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={C_LOAD} strokeWidth={0.16*S*ts} markerEnd="url(#loadArr)"/>
            ))}
            <text x={lx} y={ly} fill={C_LOAD} fontSize={1.35*S*ts} fontWeight="600" textAnchor="middle" dominantBaseline="central"
                  transform={wallVert?`rotate(-90,${lx},${ly})`:undefined}>{(prec===2?fmt2:fmt1)(total)} plf</text>
          </g>
        );
      })}
    </g>
  );
}

/* aggregated reaction on a (possibly shared) support — drawn as a compact "rocket": the bold
   arrowhead (nose) terminates AT the support node and the label box is the body, trailing to the
   windward side along the load direction (tdir). On vertical walls the load runs down the wall, so
   the label is rotated to lie ALONG the shaft — text + arrowhead read as one rocket (matching the
   horizontal case) instead of a horizontal chip with an arrow poking out of it. */
function Reaction({ r, tdir, S, ts=1 }) {
  const dx=tdir.x, dy=tdir.y;
  const vert = Math.abs(dy) > Math.abs(dx);               // vertical rocket → rotate label to lie along the shaft
  const shaft=2.1*S*ts;                                   // rev 32: scales with Markup (ts); base 2.1 (original)
  const hx=r.ax, hy=r.ay;                                  // nose tip at the support node
  const tx=r.ax-dx*shaft, ty=r.ay-dy*shaft;                // shaft tail (windward side)
  const lx=r.ax-dx*(shaft+1.55*S*ts), ly=r.ay-dy*(shaft+1.55*S*ts); // label body behind the shaft (gap scales too)
  return (
    <g>
      <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={C_REACT} strokeWidth={0.42*S*ts} strokeLinecap="round" markerEnd="url(#reactArr)"/>
      <Tag x={lx} y={ly} text={`${fmt2(r.kips)}k`} box={C_REACTBOX} S={S} ts={ts} rot={vert ? -90 : 0}/>
    </g>
  );
}

/* ═══════════════ WIND INPUT WINDOW ═══════════════ */
function WindWindow({ section, setVals, onReverse, onClose, onRemove, twoStory, oneStory=false }) {
  // STEP 4: a wall tagged 1-story (in 2-story mode) reaches only the floor diaphragm, so its section
  // cut is a SINGLE-story elevation + a single total line load — not the 2-story roof/floor split.
  const twoStoryView = twoStory && !oneStory;
  const [v, setV] = useState({});
  // seed once per open (key carries section + leeward-partner identity) → decimals survive typing
  useEffect(() => {
    const s = section || {};
    setV({ H:String(s.H||0), pw:String(s.pw||0), leeH:String(s.leeH||0),  // leeH = leeward (back) wall height
           H2:String(s.H2||0), leeH2:String(s.leeH2||0),                  // 2nd-story heights (windward / leeward)
           wH:String(s.par||0),    wQ:String(s.qWind||0),   // windward parapet = THIS wall's own
           lH:String(s.leePar||0), lQ:String(s.qLee||0) }); // leeward parapet = BACK wall's own
  }, []); // eslint-disable-line
  const num = (s) => Math.max(0, parseFloat(s) || 0);
  const upd = (field, prop) => (e) => {
    const raw = e.target.value;
    setV((p) => ({ ...p, [field]: raw }));
    // route each value to the wall it physically belongs to:
    if(prop==="parL")      setVals("lee",  { par:num(raw) });   // leeward parapet ht → back wall
    else if(prop==="parW") setVals("self", { par:num(raw) });   // windward parapet ht → this wall
    else if(prop==="leeH") setVals("lee",  { H:num(raw) });     // leeward WALL ht → back wall (sloping roof)
    else if(prop==="leeH2")setVals("lee",  { H2:num(raw) });    // leeward 2nd-story ht → back wall (2-story)
    else                   setVals("self", { [prop]:num(raw) });// H, pw, qWind, qLee → this wall
  };
  const wallRes = 0.5 * num(v.H) * num(v.pw);
  const windPar = num(v.wH) * num(v.wQ);
  const leePar  = num(v.lH) * num(v.lQ);
  const total = wallRes + windPar + leePar;
  // ── two-story diaphragm line loads (Step 3) — derived here in the UI, outside the frozen engine ──
  // (rev 41) The UI now LABELS these "Level 2" (the upper/roof diaphragm — designs the level-2 walls) and
  // "Level 1" (the lower/floor a.k.a. 2nd-floor diaphragm — designs the level-1 walls). The variable
  // names keep the physical roof/floor terms; only the displayed labels changed (no value/engine change).
  // The 2nd-story wall (H₂) splits: upper ½ → Level 2 (roof) diaphragm, lower ½ → Level 1 (floor) diaphragm.
  const wallRes2 = 0.5 * num(v.H2) * num(v.pw);        // ½·H₂·pw
  const roofLL   = wallRes2 + windPar + leePar;        // LEVEL 2 diaphragm = ½·H₂·pw + parapets  → designs level-2 (upper) walls
  // Level 1 diaphragm carries ONLY the half-walls directly above and below it (½·H·pw + ½·H₂·pw).
  // The Level 2 (roof) diaphragm + parapets do NOT pour into the Level 1 diaphragm — that load transfers
  // DOWN through the level-2 shear wall into the level-1 shear wall as a POINT load (stacked overturning
  // / holdown, unchanged). So this is the floor-only line load, not roof+floor combined. (rev 34)
  const floorLL  = wallRes + wallRes2;                 // LEVEL 1 diaphragm = ½·H·pw + ½·H₂·pw  → designs level-1 (lower) walls
  // (rev 40) OVERALL-BUILDING section from the ordered wall sequence the cut crosses. The type falls
  // out of the 1/2-story pattern: 1·2·2·1 = A, 1·1 = B, 1·2·2 = C, 2·2·1 = C-reverse. Floor-independent.
  const seq = (section && section.seq) || [];
  const hasOne = seq.some(w=>w.one), hasTwo = seq.some(w=>!w.one);
  const mixedSeq = !!(twoStory && hasOne && hasTwo && seq.length>=2);
  // floor-diaphragm line load on the windward (front) wall — matches buildSecDataF1's baseOf:
  //   1-story front → ½·H·pw + own parapet + ½·H₂·pw of the nearest 2-story behind (one face)
  //   2-story front → ½·H·pw + ½·H₂·pw (its own)        … plus the leeward parapet if the BACK wall is 1-story.
  const w0 = seq[0]||{}, wL = seq[seq.length-1]||{};
  const seqAcc = w0.one ? (()=>{ const box=seq.find((w,i)=>i>0&&!w.one); return box?0.5*num(box.H2)*num(box.pw):0; })()
                        : 0.5*num(v.H2)*num(v.pw);
  const seqBase = 0.5*num(v.H)*num(v.pw) + (w0.one ? windPar : 0);
  const seqLeePar = (wL && wL.one) ? num(v.lH)*num(v.lQ) : 0;
  const floorLLmix = seqBase + seqLeePar + seqAcc;          // e.g. 478  (Level 1 diaphragm)
  // (rev 41) LEVEL 2 (roof) diaphragm of the 2-story BLOCK — same shape as the uniform roofLL above,
  // but read from the block's front/back walls (the schematic SECTION A's middle stack): ½·H₂·pw of the
  // block + the block's windward parapet + its leeward parapet. The block's end walls usually come from
  // the plan (interior, display-only); where a block end coincides with the editable sequence front/back
  // (Section C / C-reverse) the live `v` value is used so edits flow through.
  const twoIxSeq = seq.map((w,i)=>w.one?-1:i).filter(i=>i>=0);
  const bfI = twoIxSeq[0], bbI = twoIxSeq[twoIxSeq.length-1];
  const bf = (bfI!=null) ? seq[bfI] : null, bb = (bbI!=null) ? seq[bbI] : null;
  const blkH2  = bfI===0 ? num(v.H2) : num((bf||{}).H2);
  const blkPw  = bfI===0 ? num(v.pw) : num((bf||{}).pw);
  const blkWPar= bfI===0 ? num(v.wH)*num(v.wQ) : num((bf||{}).par)*num((bf||{}).qWind);
  const blkLPar= bbI===(seq.length-1) ? num(v.lH)*num(v.lQ) : num((bb||{}).par)*num((bb||{}).qLee);
  const roofLLseq = bf ? (0.5*blkH2*blkPw + blkWPar + blkLPar) : 0;   // Level 2 diaphragm (block)
  const reverse = () => { onReverse(); };
  return (
    <div className="ovl" onPointerDown={(e)=>{ if(e.target.classList.contains("ovl")) onClose(); }}>
      <div className="win">
        <div className="win-h">
          <div className="win-t">Wind Line Load — {section&&section.axis==="v"?"N–S":"E–W"}</div>
          <button className="win-x" onClick={onClose} title="Close">×</button>
        </div>
        <div className="win-b">
          <div style={{ marginBottom:12 }}>{
            mixedSeq ? <SecDiagramSeq seq={seq} v={v} upd={upd} floorLL={floorLLmix} roofLL={roofLLseq} commit={(key,prop,val)=>setVals(key,{[prop]:val})}/>
            : twoStoryView ? <SecDiagram2 v={v} upd={upd} roofLL={roofLL} floorLL={floorLL}/>
            : <SecDiagram v={v} upd={upd} />
          }</div>

          <button className="rev" onClick={reverse} style={{ marginBottom:12 }}>
            ⇄ Reverse wind direction
          </button>

          {mixedSeq ? (
            <div className="tot">
              <div className="lbl">Level 1 diaphragm line load <small>→ designs this {w0.one?"1-story":"2-story"} wall</small></div>
              <div className="v">{fmt1(floorLLmix)} <small>plf</small></div>
              <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.08)" }}>
                <div className="brk"><span>½·H·pw — front wall</span><b>{fmt1(0.5*num(v.H)*num(v.pw))} plf</b></div>
                <div className="brk"><span>windward + leeward parapet</span><b>{fmt1((w0.one?windPar:0)+seqLeePar)} plf</b></div>
                {seqAcc>0 && <div className="brk"><span>½·H₂·pw — 2-story block {w0.one?"behind (poured fwd)":"(own upper wall)"}</span><b>{fmt1(seqAcc)} plf</b></div>}
              </div>
              {roofLLseq>0 && <>
                <div className="lbl" style={{ marginTop:14 }}>Level 2 diaphragm line load <small>→ designs the level-2 (2-story block) walls</small></div>
                <div className="v">{fmt1(roofLLseq)} <small>plf</small></div>
                <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.08)" }}>
                  <div className="brk"><span>½·H₂·pw — 2-story block (upper ½)</span><b>{fmt1(0.5*blkH2*blkPw)} plf</b></div>
                  <div className="brk"><span>windward + leeward parapet (block)</span><b>{fmt1(blkWPar+blkLPar)} plf</b></div>
                </div>
              </>}
            </div>
          ) : twoStoryView ? (
            <div className="tot">
              <div className="lbl">Level 2 diaphragm line load <small>→ designs the level-2 (upper) shear walls</small></div>
              <div className="v">{fmt1(roofLL)} <small>plf</small></div>
              <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.08)" }}>
                <div className="brk"><span>½·H₂·pw — 2nd-story wall (upper ½)</span><b>{fmt1(wallRes2)} plf</b></div>
                <div className="brk"><span>windward + leeward parapet</span><b>{fmt1(windPar+leePar)} plf</b></div>
              </div>
              <div className="lbl" style={{ marginTop:14 }}>Level 1 diaphragm line load <small>→ designs the level-1 (lower) shear walls</small></div>
              <div className="v">{fmt1(floorLL)} <small>plf</small></div>
              <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.08)" }}>
                <div className="brk"><span>½·H₂·pw — 2nd-story wall (lower ½)</span><b>{fmt1(wallRes2)} plf</b></div>
                <div className="brk"><span>½·H·pw — 1st-story wall (upper ½)</span><b>{fmt1(wallRes)} plf</b></div>
              </div>
            </div>
          ) : (
            <div className="tot">
              <div className="lbl">Total wall line load</div>
              <div className="v">{fmt1(total)} <small>plf</small></div>
              <div style={{ marginTop:10, borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:8 }}>
                <div className="brk"><span>Wall (H/2·pw)</span><b>{fmt1(wallRes)} plf</b></div>
                <div className="brk"><span>Windward parapet (hₗ·qₗ)</span><b>{fmt1(windPar)} plf</b></div>
                <div className="brk"><span>Leeward parapet (hᵣ·qᵣ)</span><b>{fmt1(leePar)} plf</b></div>
              </div>
            </div>
          )}

          <button className="btn pink" onClick={onRemove} style={{ marginTop:12, width:"100%" }}>
            Remove section cut
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DL TRIBUTARY WINDOW (rev 49) ─────────────────────────────────────────────
// A small plan-side modal for entering a wall's DEAD-LOAD tributary widths (the
// values that feed the gravity self-weight resisting uplift). Opened from the wall
// right-click menu. In 2-story mode it carries an in-window Level 1 / Level 2 switch
// so the user can enter DIFFERENT trib for the 1st- and 2nd-floor walls of the same
// (stacked) wall without leaving the window; the header always names the level. The
// values are written straight onto wallProps[key] via setVals(key, patch) (rev-42
// explicit-key path), so they persist in the .wps session and flow to the Design tab
// (per line, per floor) and on to the Calculation sheet.
function DLTributaryWindow({ wprops, twoStory, activeFloor, oneStory, onSet, onClose }) {
  // (rev 50) oneStory = this wall is tagged 1-story inside 2-Story mode → it reaches the floor diaphragm
  // but never the roof, so it has NO 2nd-floor wall. The Level 2 control is greyed/disabled and the
  // level is pinned to 1 so no 2nd-floor trib can be entered for it.
  const [lvl, setLvl] = React.useState(!oneStory && twoStory && activeFloor === 2 ? 2 : 1);
  const isF2  = twoStory && !oneStory && lvl === 2;
  const rKey  = isF2 ? "roofTrib2"  : "roofTrib";
  const fKey  = isF2 ? "floorTrib2" : "floorTrib";
  const num   = (s) => Math.max(0, parseFloat(s) || 0);
  // string buffers so a partial decimal (e.g. "2.") survives typing; re-seed on level switch
  const [buf, setBuf] = React.useState({});
  React.useEffect(() => {
    setBuf({ f: String(wprops[fKey] ?? 0), r: String(wprops[rKey] ?? 0) });
  }, [lvl]); // eslint-disable-line react-hooks/exhaustive-deps
  const write = (which, raw) => {
    setBuf((b) => ({ ...b, [which]: raw }));
    onSet({ [which === "f" ? fKey : rKey]: num(raw) });
  };
  const lvlLabel = !twoStory ? "single-story wall"
                 : oneStory  ? "Level 1 · 1-story wall"
                 : (lvl === 2 ? "Level 2 · 2nd-floor wall" : "Level 1 · 1st-floor wall");
  const inputS = { width:96, padding:"6px 8px", border:"1px solid var(--line)", borderRadius:4,
                   fontSize:13, textAlign:"right", color:"var(--ink)" };
  return (
    <div className="ovl" onPointerDown={(e)=>{ if(e.target.classList.contains("ovl")) onClose(); }}>
      <div className="win" style={{ width:"min(380px,97vw)" }}>
        <div className="win-h">
          <div className="win-t">DL Tributary — {lvlLabel}</div>
          <button className="win-x" onClick={onClose} title="Close">×</button>
        </div>
        <div className="win-b">
          {twoStory && (
            <div style={{ display:"flex", gap:6, marginBottom: oneStory ? 6 : 12 }}>
              {[1,2].map((L)=>{
                const dis = oneStory && L === 2;        // a 1-story wall has no 2nd floor
                const on  = lvl === L;
                return (
                  <button key={L} disabled={dis} onClick={()=>{ if(!dis) setLvl(L); }}
                    title={dis ? "This wall is tagged 1-story — it has no 2nd floor" : undefined}
                    style={{ flex:1, padding:"7px 0", borderRadius:0, fontWeight:700, fontSize:12,
                             cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.65 : 1,
                             border:`1.5px solid ${on && !dis ? "var(--accent)" : "var(--line)"}`,
                             background: dis ? "var(--bg)" : (on ? "var(--accent)" : "#FFFFFF"),
                             color: dis ? "var(--muted)" : (on ? "#FFFFFF" : "var(--ink)") }}>
                    {L === 1 ? "1st floor" : "2nd floor"}
                  </button>
                );
              })}
            </div>
          )}
          {twoStory && oneStory && (
            <div style={{ fontSize:11, color:"var(--hot)", marginBottom:12, lineHeight:1.4 }}>
              This wall is tagged <b>1-story</b> — Level 2 is greyed out (it has no 2nd floor).
            </div>
          )}
          <div style={{ fontSize:11, color:"var(--muted)", marginBottom:12, lineHeight:1.4 }}>
            Dead-load tributary widths for this wall{twoStory && !oneStory ? ` on the ${lvl === 2 ? "2nd" : "1st"} floor` : ""}.
            They combine with the global Roof / Floor DL (psf) to set the wall self-weight that resists
            uplift. These feed the Design tab and are sent to the Calculation sheet.
          </div>
          {[["f","Floor tributary"],["r","Roof tributary"]].map(([w,label])=>(
            <div key={w} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:10 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{label}</label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="number" step={0.5} min={0} value={buf[w] ?? ""}
                       onChange={(e)=>write(w, e.target.value)} style={inputS}/>
                <span style={{ fontSize:12, color:"var(--muted)" }}>ft</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// (rev 56) GLOBAL INPUTS — define wall/parapet height + wind pressures once and apply them to EVERY
// wall in the model, so a building with uniform walls doesn't need a section cut per wall. Opened from
// a side-panel button. The fields map onto the existing per-wall props (no new data-model field):
//   1-Story:  Wall Height→H · Parapet Height→par · Wall Pressure→pw · Windward/Leeward parapet→qWind/qLee
//   2-Story:  1st/2nd Wall Height→H/H2 · Wall/Windward/Leeward pressures→pw/qWind/qLee · and the two
//             parapet heights route by level — 1st-Level→par on walls tagged 1-story, 2nd-Level→par on
//             the full-height (2-story) walls (each physical wall still has exactly ONE `par`). Apply
//             writes wallProps for all edges; everything downstream (loads, reactions, section cuts,
//             design handoff) is already reactive to wallProps, so no engine touch. Seed values are the
//             building-wide consensus per field (uniform → that value; mixed → the default).
function GlobalInputsWindow({ seed, twoStory, hasOneStory, onApply, onClose }) {
  const [buf, setBuf] = React.useState(()=>{
    const s = {}; for(const k of Object.keys(seed)) s[k] = String(seed[k]); return s;
  });
  const write = (w, raw)=> setBuf(b=>({ ...b, [w]: raw }));
  const inputS = { width:96, padding:"6px 8px", border:"1px solid var(--line)", borderRadius:4,
                   fontSize:13, textAlign:"right", color:"var(--ink)" };
  const subH   = { fontSize:11, fontWeight:800, letterSpacing:".04em", textTransform:"uppercase",
                   color:"var(--muted)", margin:"2px 0 9px" };
  // [key, label, unit, step, hint]
  const heightFields = twoStory
    ? [["H",   "1st Level Wall Height",    "ft", 0.5, null],
       ["H2",  "2nd Level Wall Height",    "ft", 0.5, null],
       ["par1","1st Level Parapet Height", "ft", 0.5, hasOneStory ? "Applied to walls tagged 1-story" : "Applied to walls tagged 1-story (none yet)"],
       ["par2","2nd Level Parapet Height", "ft", 0.5, "Applied to the full-height 2-story walls"]]
    : [["H",   "Wall Height",    "ft", 0.5, null],
       ["par1","Parapet Height", "ft", 0.5, null]];
  const pressureFields = [
    ["pw",    "Wall Pressure",              "psf", 1, null],
    ["qWind", "Windward Parapet Pressure",  "psf", 1, null],
    ["qLee",  "Leeward Parapet Pressure",   "psf", 1, null],
  ];
  const FieldRows = (rows)=> rows.map(([w,label,unit,step,hint])=>(
    <div key={w} style={{ marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        <label style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{label}</label>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <input type="number" step={step} min={0} value={buf[w] ?? ""}
                 onChange={(e)=>write(w, e.target.value)} style={inputS}/>
          <span style={{ fontSize:12, color:"var(--muted)", width:26 }}>{unit}</span>
        </div>
      </div>
      {hint && <div style={{ fontSize:10.5, color:"var(--muted)", marginTop:2, lineHeight:1.35 }}>{hint}</div>}
    </div>
  ));
  return (
    <div className="ovl" onPointerDown={(e)=>{ if(e.target.classList.contains("ovl")) onClose(); }}>
      <div className="win" style={{ width:"min(420px,97vw)" }}>
        <div className="win-h">
          <div className="win-t">Global Inputs{twoStory ? " — 2-Story" : ""}</div>
          <button className="win-x" onClick={onClose} title="Close">×</button>
        </div>
        <div className="win-b">
          <div style={{ fontSize:11, color:"var(--muted)", marginBottom:14, lineHeight:1.45 }}>
            Set wall height, parapet height, and wind pressures for the whole building at once. Applying
            overwrites these fields on every wall — open a section cut afterward to fine-tune one wall.
            {twoStory && <> Parapet heights route by level: the 1st-Level value goes to walls tagged <b>1-story</b>, the 2nd-Level value to the full-height 2-story walls.</>}
          </div>
          <div style={subH}>Wall &amp; parapet heights</div>
          {FieldRows(heightFields)}
          <div style={{ ...subH, marginTop:14 }}>Wind pressures</div>
          {FieldRows(pressureFields)}
          <div style={{ display:"flex", gap:8, marginTop:14, paddingTop:12, borderTop:"1px solid var(--line)" }}>
            <button onClick={onClose}
              style={{ flex:"0 0 auto", padding:"8px 14px", border:"1px solid var(--line)", background:"#FFFFFF",
                       color:"var(--ink)", borderRadius:4, fontWeight:600, cursor:"pointer" }}>Cancel</button>
            <button onClick={()=>onApply(buf)}
              style={{ flex:1, padding:"8px 14px", border:"1.5px solid var(--accent)", background:"var(--accent)",
                       color:"#FFFFFF", borderRadius:4, fontWeight:700, cursor:"pointer" }}>Apply to all walls</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  SecDiagram, SecDiagram2, SecDiagramSeq, Tag, Field, WindLoad, Reaction, WindWindow, DLTributaryWindow, GlobalInputsWindow,
};
