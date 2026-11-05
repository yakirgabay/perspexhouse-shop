// Live SVG preview, 1:1 in millimetres, from the same geometry calc/pricing.js prices.
// Preview.render(svg, productId, inputs) -> { ok, msg, engrave_ratio? , letter_mm? }
var Preview = (function () {
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // colors = site/design-tokens.json "preview". class glass (fill) / cut (line) let motion.css wipe and fill them.
  var GLASS = { fill: "rgba(28,179,207,0.14)", stroke: "#1cb3cf", "stroke-width": 1.2, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round", "class": "glass" };
  var LID = { fill: "rgba(8,72,93,0.08)", stroke: "#1cb3cf", "stroke-width": 1, "vector-effect": "non-scaling-stroke", "class": "cut" };
  var HOLE = "#ffffff", INK = "#08485d";
  function shape(tag, attrs, parent, base) { return el(tag, Object.assign({}, base || GLASS, attrs), parent); }
  function pts(a) { return a.map(function (p) { return p[0] + "," + p[1]; }).join(" "); }
  function frame(svg, w, h) { // viewBox around a w x h mm drawing, with room for dimension labels
    var pad = Math.max(w, h) * 0.3 + 24; // room for a 5-character label beside a vertical dimension line
    svg.setAttribute("viewBox", (-pad) + " " + (-pad) + " " + (w + 2 * pad) + " " + (h + 2 * pad));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    return Math.max(w, h) * 0.055 + 2; // label font size in mm
  }
  function dim(parent, x1, y1, x2, y2, label, fs, side) {
    el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "#626262", "stroke-width": 1, "stroke-dasharray": "4 3", "vector-effect": "non-scaling-stroke" }, parent);
    var vertical = x1 === x2; // vertical labels sit to the left of the line, horizontal ones below it
    var t = el("text", {
      x: vertical ? x1 - fs * 0.6 : (x1 + x2) / 2, y: vertical ? (y1 + y2) / 2 : y1 + fs * 1.3,
      "font-size": fs, "text-anchor": vertical ? "end" : "middle", "dominant-baseline": vertical ? "middle" : "auto", "class": "dim", direction: "ltr"
    }, parent);
    if (side === "top") t.setAttribute("y", y1 - fs * 0.5);
    t.textContent = label;
  }
  function cm(v) { return (Math.round(v * 10) / 10) + " ס״מ"; }
  function highlight(parent, x1, y1, x2, y2) {
    el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "rgba(255,255,255,0.9)", "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" }, parent);
  }

  var R = {};

  // Counter unit, oblique view: front face + top face with a lid per cell + right side.
  R.candy_dispenser = function (svg, i) {
    var n = +i.cells, cw = i.w * 10, D = i.d * 10, H = i.h * 10, W = n * cw;
    var ox = D * 0.38, oy = -D * 0.38;
    var fs = frame(svg, W + ox, H - oy);
    var g = el("g", { transform: "translate(0 " + (-oy) + ")" }, svg);
    shape("polygon", { points: pts([[W, 0], [W + ox, oy], [W + ox, H + oy], [W, H]]) }, g);          // right side
    shape("polygon", { points: pts([[0, 0], [ox, oy], [W + ox, oy], [W, 0]]) }, g);                   // top rim
    for (var c = 0; c < n; c++) {                                                                     // lids, hinged at the back
      var x0 = c * cw + cw * 0.06, x1 = (c + 1) * cw - cw * 0.06;
      shape("polygon", { points: pts([[x0 + ox * 0.15, oy * 0.15], [x0 + ox * 0.9, oy * 0.9], [x1 + ox * 0.9, oy * 0.9], [x1 + ox * 0.15, oy * 0.15]]) }, g, LID);
    }
    shape("rect", { x: 0, y: 0, width: W, height: H }, g);                                            // front face
    for (c = 1; c < n; c++) {                                                                         // dividers
      el("line", { x1: c * cw, y1: 0, x2: c * cw, y2: H, stroke: "#1cb3cf", "stroke-width": 1, "vector-effect": "non-scaling-stroke", opacity: .8, "class": "cut" }, g);
      el("line", { x1: c * cw, y1: 0, x2: c * cw + ox, y2: oy, stroke: "#1cb3cf", "stroke-width": 1, "vector-effect": "non-scaling-stroke", opacity: .5, "class": "cut" }, g);
    }
    highlight(g, 2, H * 0.1, 2, H * 0.9);
    dim(g, 0, H + fs * 1.2, W, H + fs * 1.2, cm(W / 10), fs);
    dim(g, -fs * 1.2, 0, -fs * 1.2, H, cm(H / 10), fs);
    dim(g, W + fs * 0.8, H + fs * 0.9, W + ox + fs * 0.8, H + oy + fs * 0.9, cm(D / 10), fs);
    return { ok: true, msg: n + " תאים · " + cm(W / 10) + " רוחב" };
  };

  // Table cover, top view: rounded corners above 30 cm, cable holes along the back edge.
  R.table_cover = function (svg, i) {
    var W = i.w * 10, D = i.d * 10, holes = +i.holes, r = i.hole_d * 5;
    var fs = frame(svg, W, D);
    shape("rect", { x: 0, y: 0, width: W, height: D, rx: W > 300 ? 20 : 4 }, svg);
    highlight(svg, W * 0.04, D * 0.08, W * 0.3, D * 0.08);
    for (var k = 0; k < holes; k++)
      shape("circle", { cx: W * (k + 1) / (holes + 1), cy: Math.max(r + 25, D * 0.14), r: r, fill: HOLE }, svg);
    dim(svg, 0, D + fs * 1.2, W, D + fs * 1.2, cm(i.w), fs);
    dim(svg, -fs * 1.2, 0, -fs * 1.2, D, cm(i.d), fs);
    return { ok: true, msg: holes ? holes + " חורים לכבלים בקוטר " + cm(i.hole_d) : "בלי חורים" };
  };

  // Stepped display riser, side view: base plate + one L-shaped step per tier (flat-pack).
  R.display_stand = function (svg, i) {
    var n = +i.tiers, D = i.d * 10, t = i.t, stepH = 50, H = n * stepH, stepD = D / (n + 1);
    var fs = frame(svg, D, H);
    shape("rect", { x: 0, y: H - t, width: D, height: t }, svg);                 // base plate
    for (var k = 1; k <= n; k++) {                                                // staircase: front edge at the right
      var y = H - k * stepH, xFront = D - (k - 1) * stepD, xBack = xFront - stepD;
      shape("rect", { x: xBack, y: y, width: stepD, height: t }, svg);           // shelf
      shape("rect", { x: xFront - t, y: y, width: t, height: stepH }, svg);      // riser down to the step below
      highlight(svg, xBack + 3, y + 1, xFront - 3, y + 1);
    }
    shape("rect", { x: 0, y: 0, width: t, height: H }, svg);                     // back wall
    dim(svg, 0, H + fs * 1.2, D, H + fs * 1.2, cm(i.d) + " עומק", fs);
    dim(svg, -fs * 1.2, 0, -fs * 1.2, H, cm(H / 10) + " גובה", fs);
    var t2 = el("text", { x: D, y: -fs * 0.6, "font-size": fs, "text-anchor": "end", "class": "dim", direction: "rtl", "font-family": "Assistant, sans-serif" }, svg);
    t2.textContent = "רוחב " + cm(i.w) + " · " + n + " מדרגות";
    return { ok: true, msg: n + " מדרגות · " + cm(i.w) + " רוחב" };
  };

  // Square vase, front elevation with the open top.
  // Vase: a square box with an open top (priced as a square box in calc/pricing.js), drawn oblique like the candy dispenser.
  R.vase = function (svg, i) {
    var W = i.w * 10, H = i.h * 10, t = i.t, ox = W * 0.38, oy = -W * 0.38;
    var fs = frame(svg, W + ox, H - oy);
    var g = el("g", { transform: "translate(0 " + (-oy) + ")" }, svg);
    shape("polygon", { points: pts([[W, 0], [W + ox, oy], [W + ox, H + oy], [W, H]]) }, g);           // right side
    shape("polygon", { points: pts([[0, 0], [ox, oy], [W + ox, oy], [W, 0]]), fill: "rgba(255,255,255,0.7)" }, g); // open top
    shape("polygon", { points: pts([[t, -t * 0.4], [ox + t * 0.6, oy + t * 0.4], [W + ox - t, oy + t * 0.4], [W - t * 0.6, -t * 0.4]]), fill: "rgba(28,179,207,0.06)" }, g); // wall thickness
    shape("rect", { x: 0, y: 0, width: W, height: H }, g);                                             // front face
    highlight(g, W * 0.08, H * 0.12, W * 0.08, H * 0.85);
    dim(g, 0, H + fs * 1.2, W, H + fs * 1.2, cm(i.w), fs);
    dim(g, -fs * 1.2, 0, -fs * 1.2, H, cm(i.h), fs);
    dim(g, W + fs * 0.8, H + fs * 0.9, W + ox + fs * 0.8, H + oy + fs * 0.9, cm(i.w), fs);
    return { ok: true, msg: "מרובע · תפרים אטומים למים" };
  };

  // Judaica sign: engraved Hebrew text, fitted to the plate. Returns the real engraved area + letter height.
  var ALLOWED = /^[א-תְ-ׇ 0-9.,!?'"׳״\-\n]*$/, NIKUD = /[ְ-ׇ]/;
  R.judaica_sign = function (svg, i) {
    var W = i.w * 10, H = i.h * 10, text = (i.text || "").replace(/\r/g, ""), fs = frame(svg, W, H);
    shape("rect", { x: 0, y: 0, width: W, height: H, rx: 6 }, svg);
    highlight(svg, W * 0.04, H * 0.07, W * 0.35, H * 0.07);
    if (+i.standoffs === 4) [[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]].forEach(function (p) {
      shape("circle", { cx: p[0], cy: p[1], r: 4, fill: HOLE }, svg);
    });
    dim(svg, 0, H + fs * 1.2, W, H + fs * 1.2, cm(i.w), fs);
    dim(svg, -fs * 1.2, 0, -fs * 1.2, H, cm(i.h), fs);

    var out = { ok: true, msg: "", engrave_ratio: 0.05, letter_mm: 0 };
    var lines = text.split("\n").filter(function (l) { return l.trim(); });
    if (!text.trim()) { out.msg = "כתבו שם, ברכה או פסוק"; placeholder(svg, W, H, fs); return out; }
    if (!ALLOWED.test(text)) return fail(out, "רק אותיות בעברית, מספרים וסימני פיסוק");
    if (text.replace(/\n/g, "").length > 40) return fail(out, "עד 40 תווים");
    if (lines.length > 2) return fail(out, "עד שתי שורות");

    var margin = Math.max(10, W * 0.08), maxW = W - 2 * margin, maxH = H - 2 * margin;
    var size = Math.min(maxH / (lines.length * 1.25), maxW);
    var g = el("g", { "font-family": "Assistant, sans-serif", "font-weight": 700, fill: INK, direction: "rtl" }, svg);
    var nodes = lines.map(function (l, k) {
      var t = el("text", { x: W / 2, "text-anchor": "middle", "font-size": size }, g); t.textContent = l; return t;
    });
    // Ink measurements on canvas: actualBoundingBox = the glyph itself. SVG getBBox() returns the font box,
    // ~2.5x taller than the letter in Assistant 700, which let 1.2 mm letters pass the 3 mm gate (synthesis 3.11 §4).
    var widest = 0; lines.forEach(function (l) { widest = Math.max(widest, ink(l, size).w); });
    if (widest > maxW) { size *= maxW / widest; nodes.forEach(function (t) { t.setAttribute("font-size", size); }); }
    var lineH = size * 1.25, top = (H - lines.length * lineH) / 2;
    nodes.forEach(function (t, k) { t.setAttribute("y", top + (k + 0.82) * lineH); });
    out.letter_mm = Math.round(ink("א", size).h * 10) / 10;           // real letter height in mm (1 unit = 1 mm)
    var area = 0; lines.forEach(function (l) { var m = ink(l, size); area += m.w * m.h; });
    out.engrave_ratio = Math.min(0.9, Math.max(0.05, area / (W * H)));
    if (out.letter_mm < 3) return fail(out, "האותיות יוצאות " + out.letter_mm + " מ״מ. מינימום לחריטה 3 מ״מ: קצרו את הטקסט או הגדילו את השלט");
    if (NIKUD.test(text) && out.letter_mm < 12) return fail(out, "ניקוד רק מגובה אות 12 מ״מ. עכשיו " + out.letter_mm + " מ״מ: הגדילו את השלט או הורידו את הניקוד");
    out.msg = "גובה אות " + out.letter_mm + " מ״מ";
    return out;
  };
  var ctx = null;
  function ink(text, size) { // ink box of `text` at font-size `size` (same units as the viewBox)
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    ctx.font = "700 " + size + "px Assistant, sans-serif";
    var m = ctx.measureText(text);
    var h = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0);
    return { w: m.width, h: h || size * 0.6 }; // fallback only for browsers without actualBoundingBox
  }
  function placeholder(svg, W, H, fs) {
    var t = el("text", { x: W / 2, y: H / 2, "font-size": fs * 1.6, "text-anchor": "middle", "dominant-baseline": "middle", fill: "rgba(98,98,98,0.35)", "font-family": "Assistant, sans-serif", direction: "rtl" }, svg);
    t.textContent = "השם שלכם";
  }
  function fail(out, msg) { out.ok = false; out.msg = msg; return out; }

  function render(svg, id, inputs) {
    if (!R[id]) { frame(svg, 100, 60); return { ok: true, msg: "" }; }
    return R[id](svg, inputs);
  }
  return { render: render, supports: function (id) { return !!R[id]; } };
})();
