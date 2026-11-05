// One footer for every page, filled from SITE (config.js). Fields Meir hasn't given yet stay hidden.
// Copy: docs/copy-HE.md "פוטר". The made-to-order line is the disclosure for custom items (Meir approved, via Yakir 5.11).
(function () {
  var f = document.getElementById("foot"); if (!f) return;
  var tel = SITE.phone.replace(/-/g, "");
  var li = function (html) { return html ? "<li>" + html + "</li>" : ""; };
  f.innerHTML =
    '<div class="wrap foot-grid">' +
      '<div><h2>' + SITE.brand + '</h2><p>מפעל לתכנון וייצור מוצרי פרספקס. באשקלון מ‑2007, ולפני כן 18 שנה בהולנד.</p>' +
        (SITE.business_id ? '<p>ע.מ. <span class="num">' + SITE.business_id + '</span></p>' : '') + '</div>' +
      '<div><h2>צרו קשר</h2><ul>' +
        li('<a href="tel:' + tel + '">טלפון <span class="num">' + SITE.phone + '</span></a>') +
        li('<a href="https://wa.me/' + SITE.whatsapp + '" target="_blank" rel="noopener">וואטסאפ <span class="num">' + SITE.whatsapp_display + '</span></a>') +
        li('<a href="mailto:' + SITE.email + '">' + SITE.email + '</a>') +
        li(SITE.hours ? 'שעות: ' + SITE.hours : '') +
      '</ul></div>' +
      '<div><h2>איך מגיעים</h2><ul>' +
        li('<a href="' + SITE.waze + '" target="_blank" rel="noopener">' + SITE.address + ' · ניווט ב‑Waze</a>') +
        li('איסוף עצמי מהמפעל') +
      '</ul></div>' +
    '</div>' +
    '<div class="wrap foot-legal">' +
      '<p>מוצרים בהתאמה אישית מיוצרים במיוחד עבורכם, ולכן אין ביטול אחרי אישור ההדמיה. מחיר סופי והדמיה לאישור לפני כל חיוב.</p>' +
      '<p>' + (SITE.accessibility_url ? '<a href="' + SITE.accessibility_url + '">הצהרת נגישות</a> · ' : '') + '© 2026 ' + SITE.brand + '</p>' +
    '</div>';
})();
