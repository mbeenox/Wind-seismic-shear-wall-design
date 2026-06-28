/* theme.js — palettes, fonts, and CSS strings (presentation only).
   Phase-1 module split (rev 75): moved VERBATIM from plan-sketcher-suite.jsx.
   No React, no logic — relocation only. (Some explanatory comments for the
   small color/STALE_BTN/WARN consts traveled with their declarations.) */

const CSS = `
.r{ --bg:#EFEDE6;--panel:#FFFFFF;--line:#D8D4C8;--ink:#1C2733;--muted:#586470;--accent:#23577F;--hot:#9A6B1F;--pink:#B23A2A;
  font-family:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:var(--ink);
  background-color:var(--bg);
  background-image:
    linear-gradient(rgba(35,87,127,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(35,87,127,.12) 1px, transparent 1px),
    linear-gradient(rgba(35,87,127,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(35,87,127,.06) 1px, transparent 1px);
  background-size:110px 110px, 110px 110px, 22px 22px, 22px 22px;
  min-height:100%;box-sizing:border-box;padding:18px; }
.r *{box-sizing:border-box;}
.hd{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.htitle{font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;font-weight:800;font-size:19px;letter-spacing:.01em;margin:0;color:var(--ink);}
.htag{font-size:11px;color:var(--muted);}
.layout{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:760px){.layout{grid-template-columns:1fr 248px;}}
.stage{position:relative;border:1.5px solid var(--ink);border-radius:0;overflow:hidden;
  background:#FFFFFF;
  box-shadow:0 1px 1px rgba(28,39,51,.04), 0 10px 24px -14px rgba(28,39,51,.30), 4px 4px 0 rgba(28,39,51,.10);
  animation:rise .5s ease both;}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cvs{display:block;width:100%;height:auto;touch-action:none;cursor:crosshair;background:#FFFFFF;border-radius:0;}
.panel{display:flex;flex-direction:column;gap:12px;}
.card{border:1px solid var(--line);border-radius:4px;background:var(--panel);padding:12px 13px;}
.card h4{margin:0 0 9px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;}
.row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;}
.row span{color:var(--muted);font-size:12px;}
.row b{font-weight:600;font-size:14px;font-variant-numeric:tabular-nums;}
.row b small{color:var(--muted);font-weight:400;font-size:11px;margin-left:3px;}
.brow{display:flex;flex-wrap:wrap;gap:6px;}
.btn{font-family:inherit;font-size:11.5px;color:var(--ink);cursor:pointer;
  background:#FFFFFF;border:1px solid var(--line);border-radius:4px;padding:6px 9px;
  transition:.15s;flex:1 1 auto;min-width:60px;text-align:center;}
.btn:hover{border-color:var(--accent);color:var(--accent);background:#E8EFF4;}
.btn:disabled{opacity:.35;cursor:default;}
.btn.pink:hover{border-color:var(--pink);color:var(--pink);background:#F8E9E5;}
.tog{display:flex;align-items:center;justify-content:space-between;padding:5px 0;font-size:12px;color:var(--muted);cursor:pointer;user-select:none;}
.sw{width:34px;height:19px;border-radius:99px;background:#EDEBE3;border:1px solid var(--line);position:relative;transition:.18s;flex:none;}
.sw.on{background:var(--accent);}
.sw i{position:absolute;top:1.5px;left:1.5px;width:14px;height:14px;border-radius:50%;background:#FFFFFF;transition:.18s;box-shadow:0 1px 2px rgba(28,39,51,.25);}
.sw.on i{left:16px;background:#FFFFFF;}
.hint{font-size:11px;color:var(--muted);line-height:1.6;}
.hint b{color:var(--accent);font-weight:600;}
.cmenu{position:absolute;z-index:30;min-width:148px;background:#FFFFFF;
  border:1px solid var(--line);border-radius:4px;padding:5px;
  box-shadow:0 12px 32px -8px rgba(28,39,51,.28);display:flex;flex-direction:column;gap:2px;animation:pop .12s ease;}
@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.cmh{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:5px 8px 3px;}
.cmi{font-family:inherit;font-size:12px;text-align:left;color:var(--ink);background:transparent;
  border:0;border-radius:3px;padding:7px 8px;cursor:pointer;width:100%;
  display:flex;align-items:center;gap:8px;justify-content:space-between;}
.cmi:hover{background:#E8EFF4;color:var(--accent);}
.cmi.del:hover{background:#F8E9E5;color:var(--pink);}
.cmi.act{background:#E8EFF4;color:var(--accent);font-weight:600;}
.cmlbl{flex:1 1 auto;}
.cmck{flex:0 0 auto;color:var(--accent);font-weight:700;}
.cmzoom:hover{background:#E8EFF4;color:var(--accent);}
.cmlight{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:#C9D2DA;
  box-shadow:inset 0 0 0 1px rgba(28,39,51,.18);transition:background .15s ease,box-shadow .15s ease;}
.cmlight.on{background:#34C759;box-shadow:0 0 0 1px rgba(52,199,89,.30),0 0 6px rgba(52,199,89,.65);}
.ribbon{display:flex;align-items:stretch;gap:10px;padding:6px 10px;margin:0 0 10px;border:1px solid var(--line);
  border-radius:4px;background:var(--panel);overflow-x:auto;
  position:sticky;top:var(--tabbar-h,42px);z-index:30;box-shadow:0 2px 10px -7px rgba(28,39,51,.35);}
.rgroup{display:flex;flex-direction:column;gap:3px;}
.rlabel{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding-left:2px;}
@media print{ .r{background-image:none;background-color:#FFF;} .ribbon{box-shadow:none;} }
.rbtns{display:flex;gap:4px;}
.rbtn{border:1px solid var(--line);background:#FFFFFF;color:var(--ink);font-size:11.5px;font-weight:600;
  padding:5px 9px;border-radius:4px;cursor:pointer;white-space:nowrap;
  transition:border-color .14s ease,color .14s ease,background .14s ease,box-shadow .14s ease;}
.rbtn:hover{border-color:var(--accent);color:var(--accent);background:#F6F9FB;}
.rbtn:active{box-shadow:inset 0 1px 3px rgba(28,39,51,.18);}
.rbtn.ron{background:#E8EFF4;border-color:var(--accent);color:var(--accent);}
.rbtn.raccent{border-color:var(--accent);color:var(--accent);}
/* (rev 153) rprimary = the ONE elevated primary action per tab: a filled accent button so the
   eye lands on the next step, vs. the many equal-weight outline buttons. Defined AFTER .raccent so
   it wins on equal specificity. A stale STALE_BTN inline style still overrides it (amber > primary). */
.rbtn.rprimary{border-color:var(--accent);background:var(--accent);color:#FFFFFF;}
.rbtn.rprimary:hover{background:#1B466A;border-color:#1B466A;color:#FFFFFF;}
.rbtn:disabled{opacity:.35;cursor:default;border-color:var(--line);color:var(--muted);}
.rsel{border:1px solid var(--line);background:#FFFFFF;color:var(--ink);font-size:11.5px;font-weight:600;
  padding:5px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;font-family:inherit;
  transition:border-color .14s ease,color .14s ease,background .14s ease;}
.rsel:hover{border-color:var(--accent);color:var(--accent);background:#F6F9FB;}
.rsel:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(35,87,127,.15);}
.rsep{width:1px;background:linear-gradient(180deg,transparent,var(--line) 22%,var(--line) 78%,transparent);margin:0;}
.statusbar{display:flex;align-items:center;gap:14px;margin-top:8px;padding:5px 12px;border:1px solid var(--line);
  border-radius:4px;background:var(--panel);font-size:11px;color:var(--muted);
  font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;}
.stcoord{min-width:150px;color:var(--ink);}
.stmode{font-weight:700;color:var(--muted);}
.stmode.draw{color:var(--accent);}
.stmode.pan{color:var(--accent);}
.stflag{cursor:pointer;letter-spacing:.08em;opacity:.45;}
.stflag.on{opacity:1;color:var(--accent);font-weight:700;}
.stright{margin-left:auto;}
/* Sliding 1-Story / 2-Story pill (ribbon) — segmented control with a white thumb that slides. */
.storypill{position:relative;display:grid;grid-template-columns:1fr 1fr;background:var(--accent);
  border-radius:99px;cursor:pointer;user-select:none;box-shadow:inset 0 1px 3px rgba(28,39,51,.25);}
.storythumb{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);
  background:#FFFFFF;border-radius:99px;box-shadow:0 1px 2px rgba(28,39,51,.3);
  transition:transform .22s cubic-bezier(.4,0,.2,1);}
.storypill.two .storythumb{transform:translateX(100%);}
.storyopt{position:relative;z-index:1;border:0;background:transparent;font-family:inherit;
  font-size:11px;font-weight:700;letter-spacing:.02em;padding:5px 14px;cursor:pointer;
  color:#FFFFFF;transition:color .2s ease;white-space:nowrap;text-align:center;}
.storyopt.on{color:var(--accent);}
/* Floor selector — its own bar directly BELOW the drawing area (never over the canvas, so clicks land). */
.canvascol{display:flex;flex-direction:column;min-width:0;}
.floorbar{display:flex;justify-content:center;margin-bottom:8px;}   /* rev 64: switcher moved ABOVE the canvas */
.floorsel{display:inline-flex;border:1.5px solid var(--ink);border-radius:4px;overflow:hidden;background:#FFFFFF;
  box-shadow:4px 4px 0 rgba(28,39,51,.10);font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;}
.floorbar.off .floorsel{opacity:.5;border-color:var(--line);box-shadow:none;}
.floortab{border:0;background:#FFFFFF;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.03em;
  padding:5px 14px;cursor:pointer;transition:background .14s ease,color .14s ease;}
.floortab+.floortab{border-left:1px solid var(--line);}
.floortab:hover:not(:disabled){background:#F6F9FB;color:var(--accent);}
.floortab.act{background:var(--accent);color:#FFFFFF;}
.floortab:disabled{cursor:default;}
.floorbar.off .floortab.act{background:#EDEBE3;color:var(--muted);}
/* Floor badge — top-left of the canvas (2-story mode); pointer-events:none so it never blocks the SVG. */
.floorbadge{position:absolute;top:8px;left:8px;z-index:4;pointer-events:none;
  background:rgba(35,87,127,.92);color:#FFFFFF;font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  padding:4px 9px;border-radius:3px;box-shadow:0 2px 6px -2px rgba(28,39,51,.4);}
.floorbadge span{font-weight:500;opacity:.78;}
.allonestory-warn{position:absolute;top:8px;right:8px;z-index:5;pointer-events:none;max-width:62%;
  background:rgba(154,107,31,.95);color:#FFFFFF;font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  font-size:11px;font-weight:600;letter-spacing:.02em;line-height:1.3;
  padding:5px 10px;border-radius:3px;box-shadow:0 2px 6px -2px rgba(28,39,51,.4);}
/* (rev 68) one-time "stray edge healed on load" toast — top-center, click to dismiss, auto-clears. */
.healtoast{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:6;cursor:pointer;max-width:80%;
  background:rgba(34,108,74,.96);color:#FFFFFF;font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  font-size:11px;font-weight:700;letter-spacing:.02em;line-height:1.3;
  padding:5px 11px;border-radius:3px;box-shadow:0 2px 6px -2px rgba(28,39,51,.4);}
.healtoast span{font-weight:500;opacity:.85;}
.h2row{border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:4px;padding:9px 11px;margin-bottom:12px;background:#F6F9FB;}
.h2top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.h2top label{font-size:12px;font-weight:600;color:var(--ink);}
.h2inp{display:flex;align-items:center;gap:4px;background:#FFFFFF;border:1.5px solid var(--accent);border-radius:4px;padding:3px 8px;}
.h2inp input{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:14px;font-weight:700;color:var(--accent);
  background:transparent;border:0;outline:none;width:56px;text-align:right;}
.h2inp span{font-size:11px;color:var(--muted);}
.h2hint{font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:6px;}
.dim-input-wrap{position:absolute;transform:translate(-50%,-50%);z-index:25;display:flex;align-items:center;gap:3px;
  background:#FFFFFF;border:1.5px solid var(--hot);border-radius:4px;padding:4px 7px;box-shadow:0 8px 24px -6px rgba(28,39,51,.3);animation:pop .1s ease;}
.dim-inp{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:13px;color:var(--hot);background:transparent;border:0;outline:none;width:52px;text-align:right;font-weight:700;}
.dim-unit{font-size:11px;color:var(--muted);}
/* wind window modal */
.ovl{position:fixed;inset:0;z-index:60;background:rgba(28,39,51,.35);display:flex;align-items:center;justify-content:center;padding:14px;animation:pop .14s ease;}
.win{width:min(580px,97vw);max-height:94vh;overflow:auto;background:#FFFFFF;border:1.5px solid var(--ink);border-radius:0;box-shadow:6px 6px 0 rgba(28,39,51,.15);}
.win-h{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1.5px solid var(--ink);position:sticky;top:0;background:#FFFFFF;z-index:2;}
.win-t{font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;font-weight:800;font-size:15px;color:var(--ink);}
.win-x{background:#FFFFFF;border:1px solid var(--line);color:var(--ink);border-radius:4px;width:30px;height:30px;cursor:pointer;font-size:16px;line-height:1;}
.win-x:hover{border-color:var(--pink);color:var(--pink);}
.win-b{padding:14px 16px;}
.seg{border:1px solid var(--line);border-radius:4px;padding:11px 12px;margin-bottom:10px;background:#FFFFFF;}
.seg h5{margin:0 0 9px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;}
.seg.wall h5{color:var(--accent);} .seg.par h5{color:var(--hot);}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.fld{display:flex;flex-direction:column;gap:3px;}
.fld label{font-size:10.5px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;}
.fld input{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:13px;color:var(--accent);font-weight:600;background:#FDFDFB;border:1px solid var(--line);border-radius:4px;padding:7px 9px;outline:none;}
.fld input:focus{border-color:var(--accent);}
.rev{font-family:inherit;font-size:12px;color:var(--ink);background:#FFFFFF;border:1px solid var(--line);border-radius:4px;padding:9px 12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;}
.rev:hover{border-color:var(--pink);color:var(--pink);background:#F8E9E5;}
.tot{margin-top:4px;background:#E8EFF4;border:1px solid var(--line);border-radius:4px;padding:14px 16px;}
.tot .lbl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);}
.tot .v{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:30px;font-weight:600;line-height:1.1;margin-top:3px;color:var(--accent);}
.tot .v small{font-size:15px;color:var(--muted);font-weight:400;}
.brk{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);padding:2px 0;font-variant-numeric:tabular-nums;}
.brk b{color:var(--ink);font-weight:500;}
`;

const C_BG="#FFFFFF", C_GRID="#E9E7DE", C_WALL="#1C2733", C_NODE="#23577F",
      C_LOAD="#23577F", C_REACT="#B23A2A", C_DIMBOX="#23577F", C_REACTBOX="#B23A2A", C_DRAFT="#9A6B1F";
const C_ONESTORY="#2E6B4F";   // (2-story mode) wall tagged as 1-story only — drawn green to stand out

// (rev 77) Shared raw color tokens — single source of truth so each hex is defined ONCE.
// SW (dark-tab drafting view) and LT (calc-sheet view) below are thin ALIAS maps over C; they
// keep their existing key vocabularies (SW.accent / LT.blue, SW.page / LT.paper …) so NO call
// site changes and the resolved values stay byte-identical to the prior literal palettes. To
// retune a color suite-wide, edit it once in C.
const C = {
  ink:"#1C2733", paper:"#EFEDE6", white:"#FFFFFF", faint:"#586470", rule:"#D8D4C8",
  blue:"#23577F", blueSoft:"#E8EFF4", red:"#B23A2A", redSoft:"#F8E9E5",
  green:"#2E6B4F", greenSoft:"#E7F1EB", amber:"#8A5E16", amberSoft:"#F7EEDC",
  zebra:"#FAF9F5", hover:"#F1F4F6", input:"#FDFDFB",
};
const SW = {  // light drafting palette — matches the Calculation Sheet (LT) scheme
  page:C.paper, sheet:C.white, panel:C.white, ink:C.ink, faint:C.faint,
  rule:C.rule, accent:C.blue, accentSoft:C.blueSoft,
  red:C.red, redSoft:C.redSoft, green:C.green, greenSoft:C.greenSoft,
  amber:C.amber, amberSoft:C.amberSoft, wall:C.ink, input:C.input,
};
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/* ── STALE-PUSH INDICATOR (rev 130) ──────────────────────────────────────────
   A "push data" button (Plan→Design ⚡, Design→Calc →) goes red when the upstream
   inputs have changed since the LAST time you pushed, so re-pushing would change
   the downstream tab. (rev 153) Recolored RED → AMBER so "needs re-run" no longer
   collides with the engineering-FAIL red used by capacity chips/hatching — red now
   means failure ONLY; amber means "stale, click to refresh". Pale-amber wash + amber
   border keep the amber text (AA 5.0 on the wash) legible over any base fill. Applied
   inline so it overrides whatever base style/class the button already carries. */
const STALE_BTN = { color:"#8A5E16", background:"#FBF0D8", border:"1.5px solid #C08A2A", borderColor:"#C08A2A", fontWeight:700 };

// rev 130b — the caution sign prefixed to a stale button's label. U+FE0E (text-presentation
// selector) forces a MONOCHROME triangle that inherits the button's text color — now the rev-153
// AMBER stale color (rather than the yellow emoji), so it reads as part of the "stale" styling. It sits INLINE to the left of the
// label with a trailing space, so it never overlaps or obstructs the text (swap to "⚠️ " for the
// classic yellow emoji if preferred).
const WARN = "\u26A0\uFE0E ";

const LT = {
  paper: C.paper, sheet: C.white, ink: C.ink, faint: C.faint,
  rule: C.rule, blue: C.blue, blueSoft: C.blueSoft,
  red: C.red, redSoft: C.redSoft, green: C.green, greenSoft: C.greenSoft,
  amber: C.amber, amberSoft: C.amberSoft, zebra: C.zebra, hover: C.hover,
};

const LT_CSS = `
  .sw-table { border-collapse: collapse; width: 100%; min-width: 760px; }
  .sw-table td, .sw-table th { background: ${LT.sheet}; }
  .sw-table td:first-child, .sw-table th:first-child {
    position: sticky; left: 0; z-index: 2;
    box-shadow: 2px 0 0 ${LT.rule};
  }
  .sw-table thead th { background: #F7F6F1; border-bottom: 1.5px solid ${LT.ink}; }
  .sw-table td { transition: background .12s ease; }
  .sw-table tbody tr:nth-child(even) td { background: ${LT.zebra}; }
  .sw-table tbody tr:hover td { background: ${LT.hover}; }
  .sw-table td.sw-hl, .sw-table th.sw-hl { background: ${LT.blueSoft} !important; }
  .sw-scroll { overflow-x: auto; border: 1px solid ${LT.rule}; }
  button:focus-visible, input:focus-visible, select:focus-visible, svg:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid ${LT.blue}; outline-offset: 1px;
  }
  @media (prefers-reduced-motion: no-preference) {
    .sw-collapse-body { animation: swFade 0.15s ease-out; }
    @keyframes swFade { from { opacity: 0.4; } to { opacity: 1; } }
  }
  /* rev 132 — Calculation Sheet sub-tab bar (Chrome-style) */
  .calctab { transition: background .12s, color .12s; }
  .calctab:not(.is-active):hover { background: #F1F4F6; color: #1C2733; }
  .calctab-x { opacity: 0; transition: opacity .12s, background .12s; }
  .calctab:hover .calctab-x, .calctab.is-active .calctab-x { opacity: .6; }
  .calctab-x:hover { opacity: 1 !important; background: #E2E6E9; color: #1C2733; }
  .calc-add { transition: background .12s; }
  .calc-add:hover { background: #EDF1F4; }
  @media print {
    .no-print { display: none !important; }
    .sw-scroll { overflow: visible; border: none; }
    body { background: #FFF !important; }
  }
`;

const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');

/* Engineer's quad-ruled paper: faint 22px grid, heavier rule every 5th line (110px) */
.paper-desk{
  background-color:#EFEDE6;
  background-image:
    linear-gradient(rgba(35,87,127,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(35,87,127,.12) 1px, transparent 1px),
    linear-gradient(rgba(35,87,127,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(35,87,127,.06) 1px, transparent 1px);
  background-size:110px 110px, 110px 110px, 22px 22px, 22px 22px;
}
/* Suite tab bar as a drawing title block */
.tbar{ box-shadow:0 1px 0 rgba(28,39,51,.06); }
/* (rev 69) persistent file toolbar — sits above the tab bar inside the sticky header; reachable on every tab */
.apphdr{ box-shadow:0 2px 10px -7px rgba(28,39,51,.35); }
.filebar{ display:flex; align-items:center; gap:6px; padding:5px 16px; background:#ECEAE2; border-bottom:1px solid #D8D4C8; }
.filebar .fblabel{ font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.22em;
  color:#586470; font-weight:600; text-transform:uppercase; margin-right:8px; }
.filebtn{ border:1px solid #D8D4C8; background:#FFFFFF; color:#1C2733; font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  font-size:11.5px; font-weight:600; padding:4px 12px; border-radius:4px; cursor:pointer;
  transition:border-color .14s ease, color .14s ease, background .14s ease; }
.filebtn:hover{ border-color:#23577F; color:#23577F; background:#F6F9FB; }
.filebtn:active{ box-shadow:inset 0 1px 3px rgba(28,39,51,.18); }
/* (rev 70) project-name input, group separator, and last-saved status in the file bar */
.fbname{ border:1px solid #D8D4C8; background:#FFFFFF; color:#1C2733; font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:4px; width:170px; margin-right:4px;
  transition:border-color .14s ease, box-shadow .14s ease; }
.fbname:focus{ outline:none; border-color:#23577F; box-shadow:0 0 0 2px rgba(35,87,127,.15); }
.fbname::placeholder{ color:#6B7480; font-weight:500; }
.fbsep{ width:1px; align-self:stretch; margin:2px 6px; background:#D8D4C8; }
.fbstatus{ margin-left:auto; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; font-weight:600;
  letter-spacing:.04em; color:#586470; white-space:nowrap; }
@media print{ .filebar{ display:none; } }
.tbrand{ border-right:1px solid #DAD6CA; align-self:stretch; display:flex; flex-direction:column; justify-content:center; }
.tbrand small{ font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.22em; color:#586470; font-weight:500; }
.ttab{ position:relative; transition:color .14s ease, background .14s ease; }
.ttab:hover{ color:#23577F !important; background:#F1F5F8 !important; }
.ttab .teye{ font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.18em; font-weight:500;
  color:inherit; opacity:.65; display:block; text-align:left; margin-bottom:1px; }
/* Quality floor: visible keyboard focus, calm motion, honest print */
button:focus-visible, select:focus-visible, input:focus-visible{ outline:2px solid #23577F; outline-offset:1.5px; border-radius:4px; }
.sw-root button, .lt-root button{ transition:filter .14s ease, border-color .14s ease, box-shadow .14s ease; }
.sw-root button:hover, .lt-root button:hover{ filter:brightness(.965); }
.sw-root select, .sw-root input[type=number], .lt-root select, .lt-root input[type=number]{ transition:border-color .14s ease, box-shadow .14s ease; }
.sw-root select:hover, .sw-root input[type=number]:hover, .lt-root select:hover, .lt-root input[type=number]:hover{ border-color:#23577F !important; }
.sw-root input[type=number]:focus, .lt-root input[type=number]:focus{ border-color:#23577F !important; box-shadow:0 0 0 2.5px #E8EFF4; }
.sw-root, .lt-root{ font-variant-numeric:tabular-nums; }
@media (prefers-reduced-motion: reduce){ .ttab, .sw-root button, .lt-root button{ transition:none; } }
@media print{ .paper-desk{ background-image:none !important; background-color:#FFF !important; } }
`;

export {
  CSS, LT_CSS, APP_CSS,
  C_BG, C_GRID, C_WALL, C_NODE, C_LOAD, C_REACT, C_DIMBOX, C_REACTBOX, C_DRAFT, C_ONESTORY,
  SW, MONO, STALE_BTN, WARN, LT,
};
