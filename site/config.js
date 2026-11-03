// Site switches. One place, no rebuild. Brand per docs/brand-brief-HE.md (Meir agreed, 3.11).
var SITE = {
  brand: "בית הפרספקס",
  sub: "הזמנה אונליין",
  logo: "assets/logo-perspexhouse.png",
  hero: "candy_dispenser",           // what lives above the fold; change after the research verdict
  whatsapp: "972524518540",          // Beit HaPerspect's WhatsApp, from perspexhouse.co.il
  phone: "053-9369330",
  address: "הפנינים 21, אשקלון",
  payment: { provider: "whatsapp" }, // "whatsapp" now; "grow" | "payplus" | "cardcom" once Meir's rates are confirmed (site/order.js adapters)
  trust: {
    factory_line: true,              // "מפעל באשקלון מ‑2007" — Meir agreed to the brand, so the line is on
    lead_time: ""                    // e.g. "עד 3 ימי עבודה" — only after Meir answers row 15. Empty = not shown
  }
};
