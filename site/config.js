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
  // "In reality" photos, only once approved. id -> { panel: 4:3 image, more: [{ src, alt }] up to 2 extra 4:3, card: 16:10 image, alt, by: "meir" | "ai" }.
  // by "meir" = Meir's own work ("עבודה של בית הפרספקס"); by "ai" = studio visualization ("הדמיה להמחשה"), never shown as a customer photo. Never mix the two in one entry.
  // Sources: perspexhouse.co.il (docs/research/2026-11-05_perspexhouse-inventory.md). Studio series 1S8A: rights are Meir's (Yakir 11.11).
  real: {
    // Meir's install photo, cropped (no bottles, no brands). OK via Yakir 5.11. No card: this home card plays a loop.
    candy_dispenser: { panel: "media/real-candy_dispenser-panel.webp", alt: "מתקני פרספקס עם מכסים על ציר, מלאים בממתקים, בחנות ממתקים", by: "meir",
      more: [{ src: "media/real-candy_dispenser-2.webp", alt: "ארבעה מתקני ממתקים שקופים בגדלים עולים, עם מכסה על ציר" },
             { src: "media/real-candy_dispenser-3.webp", alt: "שני מתקני ממתקים שקופים, מכסה מעוגל ומכסה משופע" }] },
    // Catering event photos from Meir's site (kt series). Gallery OK by Yakir 11.11. No card: this home card plays a loop.
    display_stand: { panel: "media/real-display_stand-1.webp", alt: "מדרגות פרספקס שקופות עם קינוחים באירוע", by: "meir",
      more: [{ src: "media/real-display_stand-2.webp", alt: "שולחן קינוחים באירוע עם מדרגות ומעמדים שקופים" },
             { src: "media/real-display_stand-3.webp", alt: "מדרגות שקופות עם עוגיות וקינוחים בשולחן אירוע" }] },
    // Studio photo (1S8A2196): a multi-pocket holder, cut and glued. Home card only (cut.html has no panel).
    cutfile: { card: "media/real-cutfile-card.webp", alt: "מעמד פרספקס שקוף עם תאים, חתוך ומודבק", by: "meir" }
  },
  analytics: { cloudflare_token: "" }, // Cloudflare Web Analytics (decided 4.11). Paste the site token here; empty = nothing loads
  payment: { provider: "whatsapp" }, // "whatsapp" now; "grow" | "payplus" | "cardcom" once Meir's rates are confirmed (site/order.js adapters)
  trust: {
    lead_time: ""                    // e.g. "עד 3 ימי עבודה" — only after Meir answers row 15. Empty = not shown
  }
};
