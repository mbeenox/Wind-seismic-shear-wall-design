/* CalcSheet.jsx — the LIGHT Calculation-sheet view (verbatim Struware-port layout) + its Lt* UI atoms.
   Phase-4 module split (rev 79): React components moved VERBATIM from plan-sketcher-suite.jsx.
   Owns the shared `fmt` formatter and the `HL` column-highlight context (imported by DesignTab + App).
   No engine logic beyond reading already-computed results. */
import React, { useState, useContext } from "react";
import { dist } from "./geometry.js";
import { SW, MONO, LT } from "./theme.js";
import { schedFor, isNum } from "./calcCore.js";


// ---------- Formatting + dark theme (sketcher palette first) ----------
const fmt = (v, d = 0) => {
  if (v === "neglect") return "neglect";
  if (!isNum(v)) return typeof v === "string" ? v : "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};


function LtChip({ v, d = 0 }) {
  let bg = "transparent", color = LT.ink, text = fmt(v, d);
  if (v === "FAILED!!!" || v === "NG!" || v === "NG!!") { bg = LT.redSoft; color = LT.red; }
  else if (v === "neglect") { bg = LT.amberSoft; color = LT.amber; }
  else if (v === "None" || v === "—" || v === "Simpson" || v === "Threaded") { color = LT.faint; }
  else if (v === "OK") { bg = LT.greenSoft; color = LT.green; }
  return (
    <span style={{ background: bg, color, fontFamily: MONO, fontSize: 12, padding: bg === "transparent" ? 0 : "1px 6px", borderRadius: 3, whiteSpace: "nowrap", fontWeight: bg !== "transparent" ? 600 : 400 }}>
      {text}
    </span>
  );
}

function LtUtilBar({ ratio }) {
  if (!isNum(ratio)) return <LtChip v="—" />;
  const over = ratio > 1;
  const pct = Math.min(ratio, 1.25) / 1.25 * 100;
  const color = over ? LT.red : ratio > 0.85 ? LT.amber : LT.green;
  const fillBg = over
    ? "repeating-linear-gradient(135deg, #B23A2A 0 6px, #C5503F 6px 12px)"   // hatched when exceeding capacity
    : `linear-gradient(180deg, ${color} 0%, ${color} 60%, rgba(0,0,0,0.08) 100%)`;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ position: "relative", width: 72, height: 9, background: "#E7E4DA", borderRadius: 99,
                     overflow: "hidden", flex: "none", boxShadow: "inset 0 1px 1.5px rgba(28,39,51,0.12)" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: fillBg,
                       borderRadius: 99, transition: "width .3s cubic-bezier(.22,.61,.36,1)" }} />
        <span style={{ position: "absolute", left: `${100 / 1.25}%`, top: -1, bottom: -1, width: 2,
                       background: LT.ink, opacity: 0.42, transform: "translateX(-1px)" }} title="100% capacity" />
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color, fontWeight: 700, minWidth: 38, textAlign: "right",
                     fontVariantNumeric: "tabular-nums" }}>{over ? "▲" : ""}{(ratio * 100).toFixed(0)}%</span>
    </span>
  );
}

const HL = React.createContext({ sel: null, setSel: () => {} });

function LtRow({ label, unit, tip, cells, render }) {
  const { sel } = React.useContext(HL);
  return (
    <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
      <td title={tip} style={{ padding: "5px 10px", fontSize: 12, color: LT.ink, whiteSpace: "nowrap", cursor: tip ? "help" : "default" }}>
        {label} {unit && <span style={{ color: LT.faint, fontSize: 11 }}>({unit})</span>}
      </td>
      {cells.map((r, i) => (
        <td key={i} className={sel === i ? "sw-hl" : ""} style={{ padding: "5px 8px", textAlign: "right" }}>
          {r.active ? render(r, i) : <span style={{ color: LT.rule }}>·</span>}
        </td>
      ))}
    </tr>
  );
}

// (rev 132) `marks` (when present) maps a segment index → the SAME wall mark the Design tab shows
// (e.g. "A","B"), so a wall pushed from Design reads identically here ("SW-A", not "SW-1"). A manual
// sub-tab has no Design line → marks is null → falls back to the 1-based numbering, unchanged.
const swMark = (marks, i) => "SW-" + ((marks && marks[i] != null && marks[i] !== "") ? marks[i] : i + 1);
function LtSegHeader({ segments, marks }) {
  const { sel, setSel } = React.useContext(HL);
  return (
    <thead>
      <tr style={{ borderBottom: `1.5px solid ${LT.ink}` }}>
        <th style={{ textAlign: "left", padding: "4px 10px", fontSize: 11 }}></th>
        {segments.map((s, i) => (
          <th
            key={i} className={sel === i ? "sw-hl" : ""}
            onClick={() => setSel(sel === i ? null : i)}
            style={{ padding: "4px 8px", fontSize: 11, fontFamily: MONO, cursor: "pointer", color: (s.length ?? s) > 0 ? LT.blue : LT.faint }}
            title="Click to highlight this wall in all tables"
          >
            {swMark(marks, i)}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function LtCollapse({ title, badge, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 8px" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <span style={{ fontSize: 10, color: LT.blue, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.12s", display: "inline-block" }}>▶</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: LT.blue }}>{title}</span>
          {badge}
        </button>
        <div style={{ flex: 1, height: 1, background: LT.rule }} />
        {right}
      </div>
      {open && <div className="sw-collapse-body">{children}</div>}
    </div>
  );
}

function LtNumInput({ value, onChange, step = 1, width = 64 }) {
  return (
    <input
      type="number" step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{ width, padding: "3px 6px", border: `1px solid ${LT.rule}`, borderRadius: 4, fontFamily: MONO, fontSize: 12, textAlign: "right", color: LT.blue, fontWeight: 600, background: "#FDFDFB", outline: "none" }}
    />
  );
}

const ltSel = { padding: "3px 4px", border: `1px solid ${LT.rule}`, borderRadius: 4, fontSize: 11, fontFamily: MONO, color: LT.blue, fontWeight: 600, background: "#FDFDFB", outline: "none" };

function LtComplianceBanner({ segments, results, marks }) {
  const { sel, setSel } = React.useContext(HL);
  const act = results.map((r, i) => ({ r, i })).filter((x) => x.r.active);
  if (!act.length) return null;
  const fails = act.filter((x) => !x.r.pass);
  const allOK = fails.length === 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 14, padding: "10px 14px", border: `1.5px solid ${allOK ? LT.green : LT.red}`, background: allOK ? LT.greenSoft : LT.redSoft }}>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: allOK ? LT.green : LT.red }}>
        {allOK ? "✓ ALL WALLS PASS" : `✕ ${fails.length} OF ${act.length} WALL${act.length > 1 ? "S" : ""} FAILING`}
      </span>
      <span style={{ flex: 1 }} />
      {act.map(({ r, i }) => (
        <button
          key={i} onClick={() => setSel(sel === i ? null : i)}
          title={r.pass ? "Passing — click to highlight" : `Failing: ${[r.aspectNG && "aspect", r.status !== "OK" && "shear/type", r.post === "NG!" && "post", r.hd === "NG!" && "holdown"].filter(Boolean).join(", ")} — click to highlight`}
          style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "3px 9px", cursor: "pointer", borderRadius: 3,
            border: `1.5px solid ${r.pass ? LT.green : LT.red}`,
            background: sel === i ? (r.pass ? LT.green : LT.red) : "#FFF",
            color: sel === i ? "#FFF" : r.pass ? LT.green : LT.red,
          }}
        >
          {swMark(marks, i)} {r.pass ? "✓" : "✕"}
        </button>
      ))}
    </div>
  );
}

function LtElevation({ segments, results, marks }) {
  const { sel, setSel } = React.useContext(HL);
  const active = segments.map((s, i) => ({ ...s, r: results[i], i })).filter((s) => s.length > 0);
  if (!active.length) return null;
  const totalL = active.reduce((a, s) => a + s.length, 0);
  const maxH = Math.max(...active.map((s) => s.height));
  const W = 700, H = 130, gap = 8;
  const scaleX = (W - gap * (active.length - 1)) / totalL;
  const scaleY = 100 / maxH;
  let x = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 760, display: "block" }}>
      <line x1="0" y1={H - 18} x2={W} y2={H - 18} stroke={LT.ink} strokeWidth="2" />
      {active.map((s) => {
        const w = s.length * scaleX, h = s.height * scaleY;
        const failed = !s.r.pass;
        const isSel = sel === s.i;
        const el = (
          <g key={s.i} transform={`translate(${x},0)`} style={{ cursor: "pointer" }} onClick={() => setSel(isSel ? null : s.i)}>
            <rect x="0" y={H - 18 - h} width={w} height={h} fill={failed ? LT.redSoft : LT.blueSoft} stroke={failed ? LT.red : LT.blue} strokeWidth={isSel ? 3 : 1.5} />
            <line x1="0" y1={H - 18 - h} x2={w} y2={H - 18} stroke={failed ? LT.red : LT.blue} strokeWidth="0.75" opacity="0.5" />
            <line x1={w} y1={H - 18 - h} x2="0" y2={H - 18} stroke={failed ? LT.red : LT.blue} strokeWidth="0.75" opacity="0.5" />
            <text x={w / 2} y={H - 18 - h / 2 - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={failed ? LT.red : LT.blue} fontFamily={MONO}>{swMark(marks, s.i)}</text>
            <text x={w / 2} y={H - 18 - h / 2 + 9} textAnchor="middle" fontSize="9" fill={LT.faint} fontFamily={MONO}>{s.length}′ × {s.height}′</text>
            <text x={w / 2} y={H - 5} textAnchor="middle" fontSize="9" fill={LT.faint} fontFamily={MONO}>{failed ? "✕" : "✓"} type {s.selType}</text>
          </g>
        );
        x += w + gap;
        return el;
      })}
    </svg>
  );
}

// (rev 77) Removed the dead dark `Elevation` component — it was never rendered (the calc tab
// uses the light `LtElevation`). Deletion only; no behavior change. Git history retains it if a
// future dark-elevation view is wanted.

// ---------- CALCULATION SHEET TAB — logic & structure unchanged; dark restyle ----------
function CalcSheet({ g, setGl, segments, setSegments, results, totalL, marks }) {
  const setSeg = (i, key, val) =>
    setSegments((prev) => prev.map((s, j) => (j === i ? { ...s, [key]: val } : s)));
  const E_seis = 0.7 * g.vSeismic;  // rev 61: mirrors calcCore — vSeismic is the post-R reduced base shear; /R dropped
  const F_wind = g.code >= 3 ? 0.6 * g.wWind : g.wWind;

  const failBadge = (cond) =>
    cond ? <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: LT.red, background: LT.redSoft, padding: "1px 6px", borderRadius: 3 }}>✕</span> : null;
  const anyFail = {
    shear: results.some((r) => r.active && (r.status === "FAILED!!!" || r.aspectNG)),
    post: results.some((r) => r.active && r.post === "NG!"),
    hd: results.some((r) => r.active && (r.hd === "NG!" || r.anchorSel === "NG!!")),
  };

  return (
    <div>
      <LtComplianceBanner segments={segments} results={results} marks={marks} />

      <LtCollapse title="Design loads">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: "1 1 260px", border: `1px solid ${LT.rule}`, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Seismic</div>
            <table style={{ fontSize: 12, width: "100%" }}><tbody>
              <tr><td>V<sub>SEISMIC</sub> (lbs)</td><td style={{ textAlign: "right" }}><LtNumInput value={g.vSeismic} onChange={(v) => setGl("vSeismic", v)} /></td></tr>
              <tr><td>S<sub>DS</sub></td><td style={{ textAlign: "right" }}><LtNumInput value={g.sds} onChange={(v) => setGl("sds", v)} step={0.05} /></td></tr>
              <tr><td>R <span style={{ color: LT.faint, fontSize: 10 }}>(ref)</span></td><td style={{ textAlign: "right", fontFamily: MONO }}>{g.R}</td></tr>
              <tr><td style={{ paddingTop: 6 }}>E = 0.70 · V</td><td style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, paddingTop: 6 }}>{fmt(E_seis, 2)} lbs</td></tr>
            </tbody></table>
          </div>
          <div style={{ flex: "1 1 260px", border: `1px solid ${LT.rule}`, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Wind</div>
            <table style={{ fontSize: 12, width: "100%" }}><tbody>
              <tr><td>W<sub>WIND</sub> (lbs)</td><td style={{ textAlign: "right" }}><LtNumInput value={g.wWind} onChange={(v) => setGl("wWind", v)} /></td></tr>
              <tr><td style={{ paddingTop: 6 }}>{g.code >= 3 ? "F = 0.60 · W" : "F = W"}</td><td style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, paddingTop: 6 }}>{fmt(F_wind)} lbs</td></tr>
            </tbody></table>
          </div>
          <div style={{ flex: "1 1 260px", border: `1px solid ${LT.rule}`, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Dead loads</div>
            <table style={{ fontSize: 12, width: "100%" }}><tbody>
              <tr><td>Roof DL (psf)</td><td style={{ textAlign: "right" }}><LtNumInput value={g.roofDL} onChange={(v) => setGl("roofDL", v)} /></td></tr>
              <tr><td>Floor DL (psf)</td><td style={{ textAlign: "right" }}><LtNumInput value={g.floorDL} onChange={(v) => setGl("floorDL", v)} /></td></tr>
              <tr><td>Wall self (psf)</td><td style={{ textAlign: "right" }}><LtNumInput value={g.wallDL} onChange={(v) => setGl("wallDL", v)} /></td></tr>
            </tbody></table>
          </div>
          <div style={{ flex: "1 1 260px", border: `1px solid ${LT.rule}`, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Sheathing</div>
            <table style={{ fontSize: 12, width: "100%" }}><tbody>
              <tr><td>Grade</td><td style={{ textAlign: "right" }}>
                <select value={g.grade === "str1" ? "str1" : "rated"} onChange={(e) => setGl("grade", e.target.value)} style={ltSel}>
                  <option value="rated">1/2&Prime; rated sheathing</option>
                  <option value="str1">1/2&Prime; Structural I</option>
                </select>
              </td></tr>
              <tr><td style={{ paddingTop: 6 }}>Type 1/2/3 wind (plf)</td><td style={{ textAlign: "right", fontFamily: MONO, paddingTop: 6 }}>{schedFor(g.grade).slice(0,3).map((t) => t.wind).join(" / ")}</td></tr>
              <tr><td>Type 1/2/3 seismic (plf)</td><td style={{ textAlign: "right", fontFamily: MONO }}>{schedFor(g.grade).slice(0,3).map((t) => t.seismic).join(" / ")}</td></tr>
            </tbody></table>
          </div>
        </div>
      </LtCollapse>

      <LtCollapse title={`Wall line elevation — total length ${fmt(totalL, 1)} ft`}>
        <LtElevation segments={segments} results={results} marks={marks} />
        <div style={{ fontSize: 10, color: LT.faint, marginTop: 4 }}>Click a wall to highlight its column in every table below.</div>
      </LtCollapse>

      <LtCollapse title="Wall segments — inputs">
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              {[
                ["length", "Length", "ft", 0.5],
                ["height", "Height", "ft", 0.5],
                ["roofTrib", "Roof trib.", "ft", 0.5],
                ["floorTrib", "Floor trib.", "ft", 0.5],
                ["hdDist", "HD dist. to end of wall", "in", 0.5],
              ].map(([key, label, unit, step]) => (
                <tr key={key} style={{ borderBottom: `1px solid ${LT.rule}` }}>
                  <td style={{ padding: "5px 10px", fontSize: 12, whiteSpace: "nowrap" }}>{label} <span style={{ color: LT.faint, fontSize: 11 }}>({unit})</span></td>
                  {segments.map((s, i) => (
                    <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                      <LtNumInput value={s[key]} onChange={(v) => setSeg(i, key, v)} step={step} width={58} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
                <td style={{ padding: "5px 10px", fontSize: 12 }}>Wall thickness <span style={{ color: LT.faint, fontSize: 11 }}>(in)</span></td>
                {segments.map((s, i) => (
                  <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                    <select value={s.thickness} onChange={(e) => setSeg(i, "thickness", +e.target.value)} style={ltSel}>
                      <option value={3.5}>3.5</option><option value={5.5}>5.5</option><option value={7.25}>7.25</option>
                    </select>
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
                <td style={{ padding: "5px 10px", fontSize: 12 }}>Anchored into</td>
                {segments.map((s, i) => (
                  <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                    <select value={s.anchor} onChange={(e) => setSeg(i, "anchor", e.target.value)} style={ltSel}>
                      <option>Concrete</option><option>Masonry</option><option>Wood</option>
                    </select>
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
                <td style={{ padding: "5px 10px", fontSize: 12 }}>Selected shearwall type</td>
                {segments.map((s, i) => (
                  <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                    <select value={s.selType} onChange={(e) => setSeg(i, "selType", +e.target.value)} style={ltSel}>
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                      <option value={4}>4 (2-sided)</option><option value={5}>5 (2-sided)</option><option value={6}>6 (2-sided)</option>
                    </select>
                  </td>
                ))}
              </tr>
              <LtRow label="Aspect ratio h/L" tip="SW Calc!E22 — NG! if h/L > 3.5" cells={results} render={(r) => <LtChip v={r.aspectNG ? "NG!" : r.aspect} d={2} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="Demand / capacity summary" badge={failBadge(anyFail.shear || anyFail.post || anyFail.hd)}>
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <LtRow label="Wind shear D/C" tip="vW ÷ schedule wind allowable at the selected type" cells={results} render={(r) => <LtUtilBar ratio={r.utilW} />} />
              <LtRow label="Seismic shear D/C" tip="vS ÷ (2w/l factor × schedule seismic allowable at the selected type)" cells={results} render={(r) => <LtUtilBar ratio={r.utilS} />} />
              <LtRow label="End post D/C" tip="max compression ÷ NDS capacity of the recommended post" cells={results} render={(r) => <LtUtilBar ratio={r.utilPost} />} />
              <LtRow label="Holdown D/C" tip="max uplift ÷ capacity of the recommended HDU" cells={results} render={(r) => (r.maxUplift === 0 ? <LtChip v="—" /> : <LtUtilBar ratio={r.utilHD} />)} />
              <LtRow label="Verdict" cells={results} render={(r) => <LtChip v={r.pass ? "OK" : "FAILED!!!"} />} />
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: LT.faint, marginTop: 4 }}>Bar fills toward the 100% marker. Green &lt; 85% · amber 85–100% · hatched red &gt; 100% (▲ over capacity).</div>
      </LtCollapse>

      <LtCollapse title="Seismic design" badge={failBadge(results.some((r) => r.active && r.sugS === "FAILED!!!"))} defaultOpen={false}>
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <LtRow label="F" unit="lbs" tip="E23: F = E · L / ΣL" cells={results} render={(r) => <LtChip v={r.Fs} d={2} />} />
              <LtRow label="Shear v" unit="plf" tip="E24: v = F / L" cells={results} render={(r) => <LtChip v={r.vS} d={2} />} />
              <LtRow label="Seismic factor 2w/l" tip="E25: aspect ≥ 2 → 2L/h, else 1" cells={results} render={(r) => <LtChip v={r.factor} d={2} />} />
              <LtRow label="Allowable shear" unit="plf" tip="E26" cells={results} render={(r) => <LtChip v={r.allowS} d={1} />} />
              <LtRow label="Suggested shearwall #" tip="E27" cells={results} render={(r) => <LtChip v={r.sugS} />} />
              <LtRow label="Mot" unit="ft·lbs" tip="E28: Mot = F · h" cells={results} render={(r) => <LtChip v={r.MotS} d={0} />} />
              <LtRow label="DL factor A = 1+0.14·SDS" tip="E29" cells={results} render={(r) => <LtChip v={r.A} d={2} />} />
              <LtRow label="A × wDL" unit="plf" tip="E30" cells={results} render={(r) => <LtChip v={r.AwDL} d={1} />} />
              <LtRow label="End post compression" unit="lbs" tip="E31" cells={results} render={(r) => <LtChip v={r.compS} d={0} />} />
              <LtRow label="DL factor B = 0.6−0.14·SDS" tip="E32" cells={results} render={(r) => <LtChip v={r.B} d={2} />} />
              <LtRow label="End post uplift, HDs" unit="lbs" tip="E34 — < 625 lbs → neglect" cells={results} render={(r) => <LtChip v={r.upHD_S} d={0} />} />
              <LtRow label="End post uplift, straps" unit="lbs" tip="E35" cells={results} render={(r) => <LtChip v={r.upStrap_S} d={0} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="Wind design" badge={failBadge(results.some((r) => r.active && r.sugW === "FAILED!!!"))} defaultOpen={false}>
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <LtRow label="F" unit="lbs" tip="E37: F = Fwind · L / ΣL" cells={results} render={(r) => <LtChip v={r.Fw} d={0} />} />
              <LtRow label="Shear v" unit="plf" tip="E38" cells={results} render={(r) => <LtChip v={r.vW} d={1} />} />
              <LtRow label="Suggested shearwall #" tip="E39" cells={results} render={(r) => <LtChip v={r.sugW} />} />
              <LtRow label="Mot" unit="ft·lbs" tip="E40" cells={results} render={(r) => <LtChip v={r.MotW} d={0} />} />
              <LtRow label="wDL" unit="plf" tip="E41" cells={results} render={(r) => <LtChip v={r.wdl} d={1} />} />
              <LtRow label="End post compression" unit="lbs" tip="E42 (source-sheet denominator replicated verbatim)" cells={results} render={(r) => <LtChip v={r.compW} d={0} />} />
              <LtRow label="End post uplift, HDs" unit="lbs" tip="E45" cells={results} render={(r) => <LtChip v={r.upHD_W} d={0} />} />
              <LtRow label="End post uplift, straps" unit="lbs" tip="E46" cells={results} render={(r) => <LtChip v={r.upStrap_W} d={0} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="End posts & holdowns" badge={failBadge(anyFail.post || anyFail.hd)}>
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <LtRow label="Max end post compression" unit="lbs" tip="E47" cells={results} render={(r) => <LtChip v={r.maxComp} d={0} />} />
              <LtRow label="Recommended minimum end post" tip="E48 — vs NDS column capacities" cells={results} render={(r) => <LtChip v={r.post} />} />
              <LtRow label="Max holdown uplift" unit="lbs" tip="E49" cells={results} render={(r) => <LtChip v={r.maxUplift === 0 ? "—" : r.maxUplift} d={0} />} />
              <LtRow label="Recommended HD holdown" tip="E50 — Simpson HDU; doubled when anchored to wood" cells={results} render={(r) => <LtChip v={r.hd} />} />
              <LtRow label="Anchored with" tip="E51/E52" cells={results} render={(r) => (
                <span style={{ fontFamily: MONO, fontSize: 12 }}>
                  {r.anchorSel === "None" ? <LtChip v="None" /> : <>
                    <LtChip v={r.anchorSel} />
                    <div style={{ fontSize: 10, color: LT.faint }}>{isNum(r.embed) ? `${r.embed}″ embed` : r.embed}</div>
                  </>}
                </span>
              )} />
              <LtRow label="If anchored at end of FDN wall" tip="E53/E54" cells={results} render={(r) => (
                <span style={{ fontFamily: MONO, fontSize: 12 }}>
                  {r.anchorEnd === "None" ? <LtChip v="None" /> : <>
                    <LtChip v={r.anchorEnd} />
                    <div style={{ fontSize: 10, color: LT.faint }}>{isNum(r.embedEnd) ? `${r.embedEnd}″ embed` : r.embedEnd}</div>
                  </>}
                </span>
              )} />
              <LtRow label="Max strap uplift" unit="lbs" tip="E55" cells={results} render={(r) => <LtChip v={r.maxStrap === 0 ? "—" : r.maxStrap} d={0} />} />
              <LtRow label="Alternate strap holdown" tip="E56" cells={results} render={(r) => <LtChip v={r.altStrap} />} />
              <LtRow label="Strap at FDN corner / end" tip="E57" cells={results} render={(r) => <LtChip v={r.strapCorner} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="Deflection & type check">
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <LtRow label="Δ seismic" unit="in" tip="Q2: bending + nail slip (Ga) + rotation terms" cells={results} render={(r) => <LtChip v={isFinite(r.deflS) ? r.deflS : "—"} d={3} />} />
              <LtRow label="Δ wind" unit="in" tip="Q3" cells={results} render={(r) => <LtChip v={isFinite(r.deflW) ? r.deflW : "—"} d={3} />} />
              <LtRow label="Selected type vs. required" tip="E59" cells={results} render={(r) => <LtChip v={r.status} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="Holdown footing estimate" defaultOpen={false}>
        <div className="sw-scroll">
          <table className="sw-table">
            <LtSegHeader segments={segments} marks={marks} />
            <tbody>
              <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
                <td style={{ padding: "5px 10px", fontSize: 12 }}>Footing width <span style={{ color: LT.faint, fontSize: 11 }}>(ft)</span></td>
                {segments.map((s, i) => (
                  <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                    <LtNumInput value={s.ftgWidth} onChange={(v) => setSeg(i, "ftgWidth", v)} step={0.01} width={58} />
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LT.rule}` }}>
                <td style={{ padding: "5px 10px", fontSize: 12 }}>Footing thickness <span style={{ color: LT.faint, fontSize: 11 }}>(in)</span></td>
                {segments.map((s, i) => (
                  <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                    <LtNumInput value={s.ftgThick} onChange={(v) => setSeg(i, "ftgThick", v)} step={1} width={58} />
                  </td>
                ))}
              </tr>
              <LtRow label="Lmin, seismic" unit="ft" tip="E69 — quadratic bearing solve" cells={results} render={(r) => <LtChip v={isFinite(r.LminS) ? r.LminS : "—"} d={2} />} />
              <LtRow label="Lmin, wind" unit="ft" tip="E74" cells={results} render={(r) => <LtChip v={isFinite(r.LminW) ? r.LminW : "—"} d={2} />} />
              <LtRow label="Required footing length" unit="ft" tip="E62 = max(L+1, Lmin seismic, Lmin wind)" cells={results} render={(r) => <LtChip v={isFinite(r.reqFtgLen) ? r.reqFtgLen : "—"} d={2} />} />
            </tbody>
          </table>
        </div>
      </LtCollapse>

      <LtCollapse title="Shearwall schedule (reference)" defaultOpen={false}>
        <div className="sw-scroll">
          <table className="sw-table" style={{ fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${LT.ink}`, textAlign: "left" }}>
                {["MARK", "SHEATHING", "EDGE NAILING", "FIELD NAILING", "BOTTOM PLATE — CONCRETE", "BOTTOM PLATE — WOOD", "WIND (plf)", "SEISMIC (plf)", "Ga"].map((h) => (
                  <th key={h} style={{ padding: "4px 8px", fontSize: 10, letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedFor(g.grade).map((t) => (
                <tr key={t.mark} style={{ borderBottom: `1px solid ${LT.rule}` }}>
                  <td style={{ padding: "5px 8px", fontFamily: MONO, fontWeight: 700, color: LT.blue }}>{t.mark}</td>
                  <td style={{ padding: "5px 8px" }}>{t.sheathing}</td>
                  <td style={{ padding: "5px 8px" }}>{t.edge}</td>
                  <td style={{ padding: "5px 8px" }}>{t.field}</td>
                  <td style={{ padding: "5px 8px" }}>{t.concrete}</td>
                  <td style={{ padding: "5px 8px" }}>{t.wood}</td>
                  <td style={{ padding: "5px 8px", fontFamily: MONO, textAlign: "right" }}>{t.wind}</td>
                  <td style={{ padding: "5px 8px", fontFamily: MONO, textAlign: "right" }}>{t.seismic}</td>
                  <td style={{ padding: "5px 8px", fontFamily: MONO, textAlign: "right" }}>{t.ga.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LtCollapse>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DESIGN TAB — plan view fed by the Plan Sketcher
   Each point-load wall becomes a shear-wall LINE carrying its reaction
   (lbs) and wall height. Optimize fills every line; walls drag along
   their line with live recalc; right-click a wall to override holdown,
   edge nailing (type), or end post.
   ════════════════════════════════════════════════════════════════════════ */

export {
  fmt, LtChip, LtUtilBar, HL, LtRow, swMark, LtSegHeader, LtCollapse, LtNumInput, ltSel, LtComplianceBanner, LtElevation, CalcSheet,
};
