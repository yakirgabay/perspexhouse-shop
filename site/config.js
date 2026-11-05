// Site switches. One place, no rebuild. Brand per docs/brand-brief-HE.md (Meir agreed, 3.11).
// Business facts from perspexhouse.co.il (inventory 5.11: docs/research/2026-11-05_perspexhouse-inventory.md).
var SITE = {
  brand: "בית הפרספקס",
  sub: "הזמנה אונליין",
  logo: "assets/logo-perspexhouse.png",
  hero: "candy_dispenser",           // what lives above the fold; change after the research verdict
  whatsapp: "972524518540",          // Beit HaPerspect's WhatsApp, from perspexhouse.co.il
  whatsapp_display: "052-451-8540",
  phone: "053-9369330",
  email: "perspexhouse@gmail.com",
  address: "הפנינים 21, אשקלון",
  waze: "https://www.waze.com/ul?ll=31.66314%2C34.59979&navigate=yes", // coordinates from Meir's site
  // Empty = hidden. Filled only from Meir's answers (draft message: docs/research/2026-11-05_review-round3-HE.md §5).
  business_id: "",                   // ע.מ. / ח.פ.
  hours: "",                         // e.g. "א׳–ה׳ 08:00–17:00"
  accessibility_url: "",             // our own statement page, after Meir / a lawyer
  // "In reality" photos, only once approved. id -> { panel: 4:3 image, card: 16:10 image, alt, by: "meir" | "ai" }.
  // by "meir" = Meir's own work ("עבודה של בית הפרספקס"); by "ai" = studio visualization ("הדמיה להמחשה"), never shown as a customer photo.
  real: {},
  analytics: { cloudflare_token: "" }, // Cloudflare Web Analytics (decided 4.11). Paste the site token here; empty = nothing loads
  payment: { provider: "whatsapp" }, // "whatsapp" now; "grow" | "payplus" | "cardcom" once Meir's rates are confirmed (site/order.js adapters)
  trust: {
    lead_time: ""                    // e.g. "עד 3 ימי עבודה" — only after Meir answers row 15. Empty = not shown
  }
};
