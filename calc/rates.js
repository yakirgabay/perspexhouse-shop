// All rates in one place. ILS, before VAT.
// status stays "estimate" until Meir (Beit HaPerspect) confirms each line — docs/rates-meir-HE.md.
// Material lines are CANON (docs/03). Every other line is back-solved from the 3 CANON worked
// examples (riser 94 / DJ stand 208 / pharmacy 392 ILS) — see the comments and calc/check.js.
var RATES = {
  status: "estimate", // -> "confirmed" once Meir's answers replace the estimates below

  material_ils_per_sqm_mm: 28, // CANON
  waste: 0.15,                 // CANON default (10-20%)
  material_mult: { clear: 1.0, smoked: 1.3, colored: 1.3, frosted: 1.3 }, // CANON band +20-40%, midpoint until Meir

  cnc_ils_per_m_per_mm: 1.0,    // riser 4.1 m cut @5mm -> 20.5 (CANON 20)
  hole_ils: 2,                  // per drilled hole, on top of its cut length
  polish_ils_per_m_per_mm: 0.7, // riser 4.1 m @5mm -> 14.4 (CANON 15)
  glue_ils_per_m: 10,           // structural seam
  watertight_mult: 1.5,         // vases: sealed seam
  bend_ils: 10,                 // DJ stand: 2 bends -> 20 (CANON)
  engrave_setup_ils: 10,
  engrave_ils_per_cm2: 0.08,
  design_ils: 30,               // custom/POD only (docs/03 component 7)
  hinge_ils: 5,
  standoff_ils: 6,
  labor_base_ils: 10,           // setup + QC (CANON riser 10)
  labor_per_part_ils: 2.5,      // per glued/assembled part
  packaging: [[0.3, 8], [0.6, 15], [1.5, 25], [Infinity, 40]], // [max total sqm, ILS] — CANON 8 / 15 / 25
  overhead_ils: 0,              // CANON examples carry none; set from Meir's answers

  // --- added 2026-11-03 (consultant part 3.1, kept where it holds) ---
  floor_ils: 30,                // production floor: setup + QC + packaging even for a tiny part
  // reprint premium: a personalized part that fails is a 100% loss (nobody else buys it). Custom only.
  // shipping is a separate column, by the longest panel side (cm) = package size, not by price.
  shipping: [[40, 25], [80, 35], [130, 45], [Infinity, null]], // null -> quote (freight)
  pickup_ils: 0,
  free_shipping_over_ils: 400,  // custom channel only, inc VAT
  payment_fee: { pct: 0.025, fixed_ils: 1 }, // Israeli card acquiring, estimate; shown separately, never hidden in price

  // docs/03 multipliers + margin bands. b2b 2.35 = midpoint of 2.3-2.4 (reproduces CANON riser wholesale 220).
  // vat_inc: consumer prices are displayed inc VAT (law); business prices ex VAT with a note.
  channel: {
    b2b: { mult: 2.35, band: [0.55, 0.65], reprint: 0, vat_inc: false },
    custom: { mult: 3.0, band: [0.65, 0.75], reprint: 0.04, vat_inc: true },
    // cut-from-file lane (docs/00, 2026-11-03): makers/designers, order floor on the PRICE, not on COGS
    file: { mult: 2.35, band: [0.55, 0.65], reprint: 0, vat_inc: false, min_price_ex: 150 }
  },

  // --- cut-from-file lane, all estimates until Meir answers rows 24-27 and 32-33 ---
  sheet_cm: [305, 205],          // machine table, from the common full sheet. Estimate
  engrave_line_ils_per_m: 3,     // vector engraving line (blue layer)
  kerf_mm: { 3: 0.1, 5: 0.17, 8: 0.2, 10: 0.22 }, // for the production file later, not for price
  open_path_tol_mm: 0.5,
  round_to: 10,
  vat: 0.18
};
if (typeof module === "object" && module.exports) module.exports = RATES;
