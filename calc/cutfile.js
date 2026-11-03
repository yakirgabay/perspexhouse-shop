// Cut-file reader: SVG or DXF text -> flattened polylines in mm + checks + measurements.
// Runs in Node (calc/check.js) and in the browser (site/cut.html). No DOM needed.
// CutFile.parse(text, filename, unitHint?) ->
//   { ok, errors[], warnings[], units, paths:[{pts:[[x,y]..], closed, engrave}], cut_m, engrave_m,
//     bbox_cm:{w,h}, loops, parts, open_ends, duplicates }
(function (root) {
  var R = typeof module === "object" && module.exports ? require("./rates.js") : root.RATES;
  var TOL = (R && R.open_path_tol_mm) || 0.5, SHEET = (R && R.sheet_cm) || [305, 205], N = 24;
  var UNIT_MM = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96, "": null };

  // ---------- geometry helpers ----------
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function flattenCubic(p0, p1, p2, p3, out) {
    for (var k = 1; k <= N; k++) { var t = k / N, u = 1 - t;
      out.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); }
  }
  function flattenQuad(p0, p1, p2, out) {
    for (var k = 1; k <= N; k++) { var t = k / N, u = 1 - t;
      out.push([u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]]); }
  }
  function arcPts(cx, cy, r, a0, a1, out, includeStart) { // angles in radians, a1 may be < a0 (clockwise)
    var n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 12)));
    for (var k = includeStart ? 0 : 1; k <= n; k++) { var a = a0 + (a1 - a0) * k / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  }
  function bulgeArc(p1, p2, b, out) { // DXF bulge: tan(theta/4); b>0 counter-clockwise
    var c = dist(p1, p2); if (!c || !b) { out.push(p2); return; }
    var th = 4 * Math.atan(b), r = c / (2 * Math.sin(Math.abs(th) / 2)), s = Math.abs(b) * c / 2;
    var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, nx = -(p2[1] - p1[1]) / c, ny = (p2[0] - p1[0]) / c;
    var sign = b > 0 ? 1 : -1, cx = mx + sign * nx * (r - s), cy = my + sign * ny * (r - s);
    arcPts(cx, cy, r, Math.atan2(p1[1] - cy, p1[0] - cx), Math.atan2(p1[1] - cy, p1[0] - cx) + th, out, false);
  }

  // ---------- SVG ----------
  function attr(tag, name) { var m = tag.match(new RegExp("\\s" + name + "\\s*=\\s*[\"']([^\"']*)[\"']")); return m ? m[1] : null; }
  function isEngrave(tag) {
    var s = (attr(tag, "stroke") || "") + " " + (attr(tag, "style") || "") + " " + (attr(tag, "id") || "") + " " + (attr(tag, "class") || "");
    return /#0000ff|#00f\b|\bblue\b|rgb\(0,\s*0,\s*255\)|engrave|חריט/i.test(s);
  }
  function parsePathD(d, errors) {
    var toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [], i = 0, cmd = "", cur = [0, 0], start = [0, 0], prevC = null, prevQ = null;
    var paths = [], pts = null;
    function n() { return parseFloat(toks[i++]); }
    function begin(p) { if (pts && pts.length > 1) paths.push({ pts: pts, closed: false }); pts = [p]; start = p; }
    function close() { if (pts && pts.length > 1) { paths.push({ pts: pts, closed: true }); } pts = null; cur = start; }
    while (i < toks.length) {
      if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
      var rel = cmd === cmd.toLowerCase(), c = cmd.toUpperCase(), p, p1, p2, p3;
      if (c === "M") { p = [n(), n()]; if (rel) p = [cur[0] + p[0], cur[1] + p[1]]; begin(p); cur = p; cmd = rel ? "l" : "L"; prevC = prevQ = null; continue; }
      if (c === "Z") { close(); if (!pts) pts = null; prevC = prevQ = null; continue; }
      if (!pts) begin(cur);
      if (c === "L") { p = [n(), n()]; if (rel) p = [cur[0] + p[0], cur[1] + p[1]]; pts.push(p); cur = p; prevC = prevQ = null; }
      else if (c === "H") { var x = n(); p = [rel ? cur[0] + x : x, cur[1]]; pts.push(p); cur = p; prevC = prevQ = null; }
      else if (c === "V") { var y = n(); p = [cur[0], rel ? cur[1] + y : y]; pts.push(p); cur = p; prevC = prevQ = null; }
      else if (c === "C" || c === "S") {
        if (c === "C") { p1 = [n(), n()]; if (rel) p1 = [cur[0] + p1[0], cur[1] + p1[1]]; }
        else p1 = prevC ? [2 * cur[0] - prevC[0], 2 * cur[1] - prevC[1]] : cur;
        p2 = [n(), n()]; if (rel) p2 = [cur[0] + p2[0], cur[1] + p2[1]];
        p3 = [n(), n()]; if (rel) p3 = [cur[0] + p3[0], cur[1] + p3[1]];
        flattenCubic(cur, p1, p2, p3, pts); cur = p3; prevC = p2; prevQ = null;
      } else if (c === "Q" || c === "T") {
        if (c === "Q") { p1 = [n(), n()]; if (rel) p1 = [cur[0] + p1[0], cur[1] + p1[1]]; }
        else p1 = prevQ ? [2 * cur[0] - prevQ[0], 2 * cur[1] - prevQ[1]] : cur;
        p2 = [n(), n()]; if (rel) p2 = [cur[0] + p2[0], cur[1] + p2[1]];
        flattenQuad(cur, p1, p2, pts); cur = p2; prevQ = p1; prevC = null;
      } else if (c === "A") { errors.push("קשתות (A) בנתיב לא נתמכות עדיין. המירו את הנתיב לקווים או לעקומות"); i += 7; }
      else { errors.push("פקודת נתיב לא מוכרת: " + cmd); break; }
    }
    if (pts && pts.length > 1) paths.push({ pts: pts, closed: false });
    return paths;
  }
  function parseSVG(text, unitHint) {
    var errors = [], warnings = [], paths = [], scale = 1, units = "mm";
    var svgTag = (text.match(/<svg[^>]*>/i) || [""])[0];
    var vb = (attr(svgTag, "viewBox") || "").trim().split(/[\s,]+/).map(parseFloat), w = attr(svgTag, "width") || "";
    var wm = w.match(/^([\d.]+)\s*(mm|cm|in|pt|px)?$/);
    if (vb.length === 4 && wm && wm[2] && wm[2] !== "px") scale = parseFloat(wm[1]) * UNIT_MM[wm[2]] / vb[2];
    else if (unitHint && UNIT_MM[unitHint]) { scale = UNIT_MM[unitHint]; units = unitHint; }
    else { units = "unknown"; warnings.push("קנה מידה לא ברור בקובץ (אין רוחב ביחידות). הנחנו 1 יחידה = 1 מ״מ. בדקו את המידות למטה"); }
    if (/<text[\s>]/i.test(text)) errors.push("יש טקסט חי בקובץ. המירו את הטקסט לקווי מתאר (Outline) ושמרו שוב");
    if (/<image[\s>]/i.test(text)) errors.push("יש תמונה בקובץ. חיתוך עובד רק על קווים");
    if (/\stransform\s*=/i.test(text)) warnings.push("יש הזזות או סיבובים (transform) בקובץ. המידות עלולות להיות שגויות: עדיף לשטח את הקובץ לפני השמירה");
    var tags = text.match(/<(path|rect|circle|ellipse|line|polyline|polygon)\b[^>]*>/gi) || [];
    tags.forEach(function (tag) {
      var kind = tag.match(/<(\w+)/)[1].toLowerCase(), eng = isEngrave(tag), out = [], f = function (k) { return parseFloat(attr(tag, k) || 0); };
      if (kind === "path") parsePathD(attr(tag, "d") || "", errors).forEach(function (p) { p.engrave = eng; paths.push(p); });
      else if (kind === "rect") { var x = f("x"), y = f("y"), rw = f("width"), rh = f("height"); paths.push({ pts: [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]], closed: true, engrave: eng }); }
      else if (kind === "circle" || kind === "ellipse") { var cx = f("cx"), cy = f("cy"), rx = kind === "circle" ? f("r") : f("rx"), ry = kind === "circle" ? f("r") : f("ry");
        for (var k = 0; k < 48; k++) { var a = 2 * Math.PI * k / 48; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } paths.push({ pts: out, closed: true, engrave: eng }); }
      else if (kind === "line") paths.push({ pts: [[f("x1"), f("y1")], [f("x2"), f("y2")]], closed: false, engrave: eng });
      else { var nums = (attr(tag, "points") || "").match(/-?\d*\.?\d+/g) || []; for (var j = 0; j + 1 < nums.length; j += 2) out.push([parseFloat(nums[j]), parseFloat(nums[j + 1])]);
        if (out.length > 1) paths.push({ pts: out, closed: kind === "polygon", engrave: eng }); }
    });
    paths.forEach(function (p) { p.pts = p.pts.map(function (q) { return [q[0] * scale, q[1] * scale]; }); });
    return { paths: paths, errors: errors, warnings: warnings, units: units };
  }

  // ---------- DXF ----------
  function parseDXF(text, unitHint) {
    var errors = [], warnings = [], paths = [], lines = text.split(/\r?\n/), pairs = [];
    for (var i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i], 10), lines[i + 1].trim()]);
    var units = "mm", scale = 1, insunits = null, section = "", ents = [], cur = null;
    pairs.forEach(function (pr, idx) {
      var code = pr[0], v = pr[1];
      if (code === 2 && pairs[idx - 1] && pairs[idx - 1][0] === 0 && pairs[idx - 1][1] === "SECTION") section = v;
      if (code === 9 && v === "$INSUNITS") insunits = parseInt(pairs[idx + 1][1], 10);
      if (section !== "ENTITIES") return;
      if (code === 0) { cur = { type: v, g: {}, pts: [], bulges: [] }; ents.push(cur); return; }
      if (!cur) return;
      if (code === 10) { cur.pts.push([parseFloat(v), 0]); cur.bulges.push(0); }
      else if (code === 20 && cur.pts.length) cur.pts[cur.pts.length - 1][1] = parseFloat(v);
      else if (code === 42 && cur.pts.length) cur.bulges[cur.pts.length - 1] = parseFloat(v);
      else cur.g[code] = v;
    });
    if (insunits === 5) scale = 10; else if (insunits === 1) scale = 25.4;
    else if (insunits !== 4) { if (unitHint && UNIT_MM[unitHint]) { scale = UNIT_MM[unitHint]; units = unitHint; } else { units = "unknown"; warnings.push("הקובץ לא מציין יחידות. הנחנו מ״מ. בדקו את המידות למטה"); } }
    var poly = null;
    ents.forEach(function (e) {
      var layer = (e.g[8] || "") + " " + (e.g[62] || ""), eng = /engrav|חריט|\b5\b/i.test(layer), out = [];
      switch (e.type) {
        case "LINE": paths.push({ pts: [e.pts[0], [parseFloat(e.g[11]), parseFloat(e.g[21])]], closed: false, engrave: eng }); break;
        case "LWPOLYLINE": out.push(e.pts[0]); for (var k = 0; k + 1 < e.pts.length; k++) bulgeArc(e.pts[k], e.pts[k + 1], e.bulges[k], out);
          var closed = (parseInt(e.g[70] || 0, 10) & 1) === 1; if (closed) bulgeArc(e.pts[e.pts.length - 1], e.pts[0], e.bulges[e.pts.length - 1], out);
          paths.push({ pts: out, closed: closed, engrave: eng }); break;
        case "POLYLINE": poly = { pts: [], bulges: [], closed: (parseInt(e.g[70] || 0, 10) & 1) === 1, engrave: eng }; break;
        case "VERTEX": if (poly) { poly.pts.push(e.pts[0]); poly.bulges.push(e.bulges[0]); } break;
        case "SEQEND": if (poly && poly.pts.length > 1) { out.push(poly.pts[0]); for (var q = 0; q + 1 < poly.pts.length; q++) bulgeArc(poly.pts[q], poly.pts[q + 1], poly.bulges[q], out);
          if (poly.closed) bulgeArc(poly.pts[poly.pts.length - 1], poly.pts[0], poly.bulges[poly.pts.length - 1], out); paths.push({ pts: out, closed: poly.closed, engrave: poly.engrave }); } poly = null; break;
        case "CIRCLE": arcPts(e.pts[0][0], e.pts[0][1], parseFloat(e.g[40]), 0, 2 * Math.PI, out, true); paths.push({ pts: out, closed: true, engrave: eng }); break;
        case "ARC": var a0 = parseFloat(e.g[50]) * Math.PI / 180, a1 = parseFloat(e.g[51]) * Math.PI / 180; if (a1 <= a0) a1 += 2 * Math.PI;
          arcPts(e.pts[0][0], e.pts[0][1], parseFloat(e.g[40]), a0, a1, out, true); paths.push({ pts: out, closed: false, engrave: eng }); break;
        case "TEXT": case "MTEXT": case "ATTRIB": errors.push("יש טקסט חי בקובץ (" + e.type + "). המירו את הטקסט לקווי מתאר ושמרו שוב"); break;
        case "SPLINE": case "ELLIPSE": errors.push(e.type + " לא נתמך. המירו לקווים או לפוליליין (Explode / Flatten)"); break;
        case "INSERT": errors.push("יש בלוקים (INSERT) בקובץ. פרקו אותם (Explode) ושמרו שוב"); break;
        case "HATCH": case "DIMENSION": case "POINT": case "SOLID": warnings.push("ישות " + e.type + " לא נחתכת ולא נספרה"); break;
      }
    });
    paths.forEach(function (p) { p.pts = p.pts.map(function (q) { return [q[0] * scale, q[1] * scale]; }); });
    return { paths: paths, errors: errors, warnings: warnings, units: units };
  }

  // ---------- checks + measurements (shared) ----------
  function measure(res) {
    var paths = res.paths, errors = res.errors, warnings = res.warnings;
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, cut = 0, eng = 0, keys = {}, dup = 0, ends = {}, loops = [];
    paths.forEach(function (p) {
      var len = 0;
      for (var k = 0; k + 1 < p.pts.length; k++) len += dist(p.pts[k], p.pts[k + 1]);
      if (!p.closed && dist(p.pts[0], p.pts[p.pts.length - 1]) <= TOL) p.closed = true;
      if (p.closed) len += dist(p.pts[p.pts.length - 1], p.pts[0]);
      p.len = len;
      p.pts.forEach(function (q) { minx = Math.min(minx, q[0]); miny = Math.min(miny, q[1]); maxx = Math.max(maxx, q[0]); maxy = Math.max(maxy, q[1]); });
      var a = p.pts[0], b = p.pts[p.pts.length - 1], key = [a, b].map(function (q) { return Math.round(q[0] * 20) + "," + Math.round(q[1] * 20); }).sort().join("|") + "|" + Math.round(len * 10);
      if (keys[key]) { dup++; p.dup = true; return; } keys[key] = 1;   // exact duplicate: counted once, flagged
      if (p.engrave) eng += len; else cut += len;
      if (!p.closed && !p.engrave) [a, b].forEach(function (q) { var kk = Math.round(q[0] / TOL) + "," + Math.round(q[1] / TOL); ends[kk] = (ends[kk] || 0) + 1; }); // engraving lines may stay open
      else if (!p.engrave) { var bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; p.pts.forEach(function (q) { bb.x0 = Math.min(bb.x0, q[0]); bb.y0 = Math.min(bb.y0, q[1]); bb.x1 = Math.max(bb.x1, q[0]); bb.y1 = Math.max(bb.y1, q[1]); }); loops.push(bb); }
    });
    var openEnds = 0; for (var k in ends) if (ends[k] % 2) openEnds++;
    var parts = loops.filter(function (b) { return !loops.some(function (o) { return o !== b && o.x0 <= b.x0 && o.y0 <= b.y0 && o.x1 >= b.x1 && o.y1 >= b.y1 && (o.x1 - o.x0) * (o.y1 - o.y0) > (b.x1 - b.x0) * (b.y1 - b.y0); }); }).length;
    var w = paths.length ? (maxx - minx) / 10 : 0, h = paths.length ? (maxy - miny) / 10 : 0;
    if (!paths.length) errors.push("לא נמצאו קווים לחיתוך בקובץ");
    if (openEnds) errors.push("יש " + openEnds + " קצוות פתוחים (נתיב שלא נסגר, פער מעל " + TOL + " מ״מ). סגרו את הצורות ושמרו שוב");
    if (dup) warnings.push(dup + " קווים כפולים נמצאו ונספרו פעם אחת. כדאי למחוק אותם לפני הייצור");
    if (w > SHEET[0] || h > SHEET[1]) errors.push("הקובץ " + w.toFixed(1) + "×" + h.toFixed(1) + " ס״מ גדול משולחן החיתוך (" + SHEET[0] + "×" + SHEET[1] + " ס״מ). חלקו לכמה קבצים");
    return Object.assign(res, { ok: errors.length === 0, cut_m: Math.round(cut) / 1000, engrave_m: Math.round(eng) / 1000,
      bbox_cm: { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 }, origin: [minx, miny], loops: loops.length, parts: parts, open_ends: openEnds, duplicates: dup });
  }

  function parse(text, filename, unitHint) {
    var isDxf = /\.dxf$/i.test(filename || "") || /^\s*0\s*\r?\n\s*SECTION/.test(text);
    if (!isDxf && !/<svg[\s>]/i.test(text)) return { ok: false, errors: ["הקובץ חייב להיות SVG או DXF"], warnings: [], paths: [], bbox_cm: { w: 0, h: 0 }, cut_m: 0, engrave_m: 0, parts: 0 };
    return measure(isDxf ? parseDXF(text, unitHint) : parseSVG(text, unitHint));
  }
  var api = { parse: parse };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CutFile = api;
})(typeof self !== "undefined" ? self : this);
