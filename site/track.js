// One metric: visitors who reach the designer and finish a preview. Events land in localStorage + console (per device).
// Cross-device: Cloudflare Web Analytics counts page views per page (home, each designer, cut) once SITE.analytics has a token.
// It has no custom events, so "order sent" is counted by the PLX-… numbers in Meir's WhatsApp.
(function () {
  var tok = typeof SITE !== "undefined" && SITE.analytics && SITE.analytics.cloudflare_token;
  if (!tok) return;
  var s = document.createElement("script"); s.defer = true; s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: tok })); document.head.appendChild(s);
})();
var track = (function () {
  var KEY = "plx_events";
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function sink(ev) { try { var a = read(); a.push(ev); localStorage.setItem(KEY, JSON.stringify(a.slice(-500))); } catch (e) {} }
  function t(name, props) {
    var ev = Object.assign({ e: name, t: Date.now(), p: location.pathname + location.search }, props || {});
    sink(ev); if (location.hostname === "localhost" || location.protocol === "file:") console.log("track", ev);
  }
  t.funnel = function () { // page_view -> designer_open -> preview_complete -> order_open -> order_submit
    var c = { page_view: 0, designer_open: 0, preview_complete: 0, order_open: 0, order_submit: 0 };
    read().forEach(function (ev) { if (ev.e in c) c[ev.e]++; });
    c.designer_to_preview = c.designer_open ? Math.round(100 * c.preview_complete / c.designer_open) + "%" : "n/a";
    return c;
  };
  return t;
})();
