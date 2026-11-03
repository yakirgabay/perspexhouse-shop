// Deterministic price engine (docs/03). No AI anywhere in this path.
// Node: require("./pricing.js"). Browser: <script src="calc/rates.js"> then <script src="calc/pricing.js"> -> window.Pricing.
(function (root) {
  var R = typeof module === "object" && module.exports ? require("./rates.js") : root.RATES;

  // ---- input guards (the site passes customer input straight in) ----
  function num(v, name, min, max, int) {
    v = Number(v);
    if (!Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v)))
      throw new RangeError(name + " must be " + (int ? "a whole number " : "") + min + "-" + max);
    return v;
  }
  function oneOf(v, name, list) {
    var hit = list.filter(function (x) { return String(x) === String(v); })[0];
    if (hit === undefined) throw new RangeError(name + " must be one of " + list.join(", "));
    return hit;
  }
  function material(v) { return oneOf(v, "material", Object.keys(R.material_mult)); }

  // ---- core: geometry spec -> COGS line items ----
  // spec: { parts:[{w,h,qty}] (cm), t (mm), material, material_addon (ILS, before waste), polish_ratio (0-1),
  //         holes, hole_d (cm), glue_m, watertight, bends, engrave_cm2, design, hinges, standoffs,
  //         assembled_parts, extra_labor, fixed:{line: ILS} (CANON check / manual override) }
  function cogs(spec) {
    var sqm = 0, cut = 0, t = spec.t, holes = spec.holes || 0;
    (spec.parts || []).forEach(function (p) {
      var q = p.qty == null ? 1 : p.qty;
      sqm += q * p.w * p.h / 1e4;
      cut += q * 2 * (p.w + p.h) / 100;
    });
    cut += holes * Math.PI * (spec.hole_d || 0) / 100;
    if (spec.sqm != null) sqm = spec.sqm;     // cut-from-file: measured from the file, not from panels
    if (spec.cut_m != null) cut = spec.cut_m;

    var L = {
      material: (sqm * t * R.material_ils_per_sqm_mm * R.material_mult[spec.material || "clear"] + (spec.material_addon || 0)) * (1 + R.waste),
      cnc: cut * R.cnc_ils_per_m_per_mm * t + holes * R.hole_ils,
      finishing: cut * (spec.polish_ratio == null ? 1 : spec.polish_ratio) * R.polish_ils_per_m_per_mm * t,
      glue: (spec.glue_m || 0) * R.glue_ils_per_m * (spec.watertight ? R.watertight_mult : 1),
      bending: (spec.bends || 0) * R.bend_ils,
      engraving: (spec.engrave_cm2 ? R.engrave_setup_ils + spec.engrave_cm2 * R.engrave_ils_per_cm2 : 0)
        + (spec.engrave_m ? (spec.engrave_cm2 ? 0 : R.engrave_setup_ils) + spec.engrave_m * R.engrave_line_ils_per_m : 0),
      design: spec.design ? R.design_ils : 0,
      hardware: (spec.hinges || 0) * R.hinge_ils + (spec.standoffs || 0) * R.standoff_ils,
      labor: R.labor_base_ils + (spec.assembled_parts || 0) * R.labor_per_part_ils + (spec.extra_labor || 0),
      packaging: R.packaging.filter(function (r) { return sqm <= r[0]; })[0][1],
      overhead: R.overhead_ils
    };
    var fixed = spec.fixed || {}, k, total = 0;
    for (k in fixed) L[k] = fixed[k];
    for (k in L) total += L[k];
    return { sqm: sqm, cut_m: cut, lines: L, cogs: Math.round(total), overridden: Object.keys(fixed) };
  }

  // ---- COGS -> price: max(floor, cogs) x (1 + reprint) x multiplier, rounded, then verify the margin band ----
  function price(c, channel) {
    var ch = R.channel[channel];
    var base = Math.max(R.floor_ils, c) * (1 + ch.reprint);
    var ex = Math.round(base * ch.mult / R.round_to) * R.round_to;
    if ((ex - base) / ex < ch.band[0]) ex = Math.ceil(base * ch.mult / R.round_to) * R.round_to;
    if (ch.min_price_ex && ex < ch.min_price_ex) ex = ch.min_price_ex; // order floor on the price (file lane)
    var margin = (ex - base) / ex;
    return {
      channel: channel,
      price_ex_vat: ex,
      price_inc_vat: Math.round(ex * (1 + R.vat)),
      display_price: ch.vat_inc ? Math.round(ex * (1 + R.vat)) : ex,
      vat_inc: ch.vat_inc,
      margin: margin,
      in_band: margin >= ch.band[0] && margin <= ch.band[1]
    };
  }

  // ---- shipping by package size (longest panel side), separate from the product price ----
  function shipping(spec, channel) {
    var longest = 0;
    spec.parts.forEach(function (p) { longest = Math.max(longest, p.w, p.h); });
    var row = R.shipping.filter(function (r) { return longest <= r[0]; })[0];
    return { longest_cm: longest, delivery_ils: row[1], pickup_ils: R.pickup_ils,
      free_over_ils: channel === "custom" ? R.free_shipping_over_ils : null };
  }

  // ---- order total: product x qty + shipping; VAT and card fee shown as their own lines ----
  function total(q, qty, delivery) {
    qty = num(qty == null ? 1 : qty, "qty", 1, 500, true);
    var goods_ex = q.price_ex_vat * qty;
    var goods_disp = q.display_price * qty;
    var ship = delivery ? q.shipping.delivery_ils : 0;
    if (ship == null) return { qty: qty, goods: goods_disp, quote_only: true };
    if (delivery && q.shipping.free_over_ils && goods_disp >= q.shipping.free_over_ils) ship = 0;
    var ex = goods_ex + ship, vat = Math.round(ex * R.vat), inc = ex + vat;
    var fee = Math.round(inc * R.payment_fee.pct + R.payment_fee.fixed_ils);
    return { qty: qty, goods: goods_disp, shipping: ship, ex_vat: ex, vat: vat, inc_vat: inc, card_fee: fee };
  }

  // ---- the 5 launch products (docs/00, 2026-11-03) + windshield as quote-only ----
  var PRODUCTS = {
    candy_dispenser: {
      name: "מתקן ממתקים לפיצוציה", channel: "b2b",
      // one counter unit: a row of compartments, shared dividers, a hinged lid per compartment
      defaults: { cells: 4, w: 20, d: 25, h: 20, t: 4, material: "clear" },
      spec: function (i) {
        var n = num(i.cells, "cells", 1, 8, true), w = num(i.w, "w", 10, 40), d = num(i.d, "d", 15, 40), h = num(i.h, "h", 10, 40);
        var W = n * w;
        return {
          parts: [{ w: W, h: d }, { w: W, h: h, qty: 2 }, { w: d, h: h, qty: n + 1 }, { w: w, h: d, qty: n }],
          t: oneOf(i.t, "t", [3, 4, 5]), material: material(i.material),
          polish_ratio: 0.5, // only visible edges are polished
          glue_m: (2 * (W + d) + 4 * h + (n - 1) * (d + h)) / 100,
          hinges: n, assembled_parts: n + 4
        };
      }
    },
    table_cover: {
      name: "כיסוי שולחן", channel: "custom",
      defaults: { w: 120, d: 80, t: 5, holes: 0, hole_d: 6, material: "clear" },
      spec: function (i) {
        return {
          parts: [{ w: num(i.w, "w", 20, 300), h: num(i.d, "d", 20, 200) }], // max sheet ~305x205
          t: oneOf(i.t, "t", [3, 5, 8, 10]), material: material(i.material),
          holes: num(i.holes, "holes", 0, 6, true), hole_d: num(i.hole_d, "hole_d", 3, 10)
        };
      }
    },
    display_stand: {
      name: "מתקן תצוגה שקוף", channel: "b2b",
      // base + stacked tier shelves (flat-pack). Defaults = the CANON 3-Tier Riser geometry.
      defaults: { w: 30, d: 25, tiers: 3, t: 5, material: "clear" },
      spec: function (i) {
        var w = num(i.w, "w", 10, 100), d = num(i.d, "d", 10, 60);
        return {
          parts: [{ w: w, h: d }, { w: w, h: 0.8 * d, qty: num(i.tiers, "tiers", 1, 5, true) }],
          t: oneOf(i.t, "t", [3, 5, 8]), material: material(i.material)
        };
      }
    },
    vase: {
      name: "אגרטל מעוצב", channel: "custom",
      // square box vase: 4 walls + bottom, sealed seams, leak test
      defaults: { w: 12, h: 30, t: 5, material: "clear" },
      spec: function (i) {
        var w = num(i.w, "w", 6, 40), h = num(i.h, "h", 10, 80);
        return {
          parts: [{ w: w, h: h, qty: 4 }, { w: w, h: w }],
          t: oneOf(i.t, "t", [5, 8]), material: material(i.material),
          polish_ratio: 0.6, glue_m: (4 * h + 4 * w) / 100, watertight: true,
          assembled_parts: 5, extra_labor: 5
        };
      }
    },
    judaica_sign: {
      name: "שלט יודאיקה", channel: "custom",
      // engraved Hebrew name/verse; design time covers the Hebrew typesetting check (docs/04 in the studio)
      defaults: { w: 30, h: 20, t: 5, engrave_ratio: 0.4, standoffs: 4, material: "clear" },
      spec: function (i) {
        var w = num(i.w, "w", 10, 120), h = num(i.h, "h", 10, 90);
        return {
          parts: [{ w: w, h: h }],
          t: oneOf(i.t, "t", [3, 5, 8, 10]), material: material(i.material),
          engrave_cm2: w * h * num(i.engrave_ratio, "engrave_ratio", 0.05, 0.9),
          design: true, standoffs: oneOf(i.standoffs, "standoffs", [0, 4])
        };
      }
    },
    windshield: {
      name: "מגן רוח לאופנוע או טרקטורון", quote_only: true // thermoformed, mold per model -> manual quote
    }
  };

  function quote(id, inputs) {
    var P = PRODUCTS[id];
    if (!P) throw new RangeError("unknown product " + id);
    if (P.quote_only) return { product: id, name: P.name, quote_only: true };
    var i = Object.assign({}, P.defaults, inputs || {});
    var s = P.spec(i), c = cogs(s);
    return Object.assign({ product: id, name: P.name, inputs: i, spec: s, estimate: R.status !== "confirmed" },
      c, price(c.cogs, P.channel), { shipping: shipping(s, P.channel) });
  }

  // ---- cut-from-file: measured geometry (from calc/cutfile.js) -> quote on the "file" channel ----
  // m: { cut_m, engrave_m, bbox_cm:{w,h}, parts }  i: { t, material }
  function quoteFile(m, i) {
    i = Object.assign({ t: 3, material: "clear" }, i || {});
    var t = oneOf(i.t, "t", [3, 4, 5, 8, 10]), mat = material(i.material);
    num(m.cut_m, "cut_m", 0, 2000); num(m.bbox_cm.w, "w", 0.1, R.sheet_cm[0]); num(m.bbox_cm.h, "h", 0.1, R.sheet_cm[1]);
    var s = {
      parts: [{ w: m.bbox_cm.w, h: m.bbox_cm.h }], t: t, material: mat,
      sqm: m.bbox_cm.w * m.bbox_cm.h / 1e4, cut_m: m.cut_m, engrave_m: m.engrave_m || 0,
      polish_ratio: 0,                         // laser edge as cut; polishing is a separate add-on later
      assembled_parts: Math.max(0, (m.parts || 1) - 1), design: false
    };
    var c = cogs(s), p = price(c.cogs, "file");
    p.in_band = true; // the 150 floor breaks the band on tiny jobs by design
    return Object.assign({ product: "cutfile", name: "חיתוך לפי קובץ", inputs: i, measured: m, spec: s,
      estimate: R.status !== "confirmed" }, c, p, { shipping: shipping(s, "file") });
  }

  var api = { RATES: R, PRODUCTS: PRODUCTS, cogs: cogs, price: price, shipping: shipping, total: total, quote: quote, quoteFile: quoteFile };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Pricing = api;
})(typeof self !== "undefined" ? self : this);
