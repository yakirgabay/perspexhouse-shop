// Order sheet + payment adapters. Price lines come from Pricing.total() only.
// Adapter contract: PAY[provider](order) -> { url } to redirect to, or { copy } to show. Add grow/payplus/cardcom here
// once SITE.payment.provider changes; nothing else in the site needs to change.
var Order = (function () {
  var PAY = {
    whatsapp: function (o) {
      var text = encodeURIComponent(o.message);
      return SITE.whatsapp ? { url: "https://wa.me/" + SITE.whatsapp + "?text=" + text } : { copy: o.message };
    },
    grow: function () { throw new Error("סליקה טרם הופעלה: ממלאים את המתאם אחרי אישור התעריפים"); },
    payplus: function () { throw new Error("סליקה טרם הופעלה"); },
    cardcom: function () { throw new Error("סליקה טרם הופעלה"); }
  };
  var ils = function (n) { return "₪" + n.toLocaleString("he-IL"); };
  var state = {};

  function open(q, qty, svgMarkup) {
    state = { q: q, qty: qty, svg: svgMarkup };
    var sheet = document.getElementById("sheet");
    document.getElementById("o-title").textContent = q.name;
    document.getElementById("o-delivery").onchange = lines;
    lines();
    sheet.setAttribute("open", "");
    track("order_open", { product: q.product, price: q.display_price });
  }
  function lines() {
    var delivery = document.getElementById("o-delivery").value === "delivery";
    var t = Pricing.total(state.q, state.qty, delivery), q = state.q, box = document.getElementById("o-lines"), h = "";
    state.t = t;
    // everything inc VAT (brand brief §4); business products carry a small ex-VAT line
    h += row(q.name + " × " + t.qty, ils(q.price_inc_vat * t.qty) + (q.vat_inc ? "" : ' <small class="muted">לפני מע״מ ' + ils(t.goods) + "</small>"));
    if (t.quote_only) { h += row("משלוח", "לפי הצעה (פריט גדול)"); }
    else {
      if (delivery) h += row("משלוח", t.shipping ? ils(Math.round(t.shipping * (1 + Pricing.RATES.vat))) : "חינם");
      h += '<div class="total"><span>סה״כ כולל מע״מ</span><span class="num">' + ils(t.inc_vat) + "</span></div>";
    }
    box.innerHTML = h;
    document.getElementById("o-est").style.display = q.estimate ? "" : "none";
  }
  function row(a, b) { return "<div><span>" + a + '</span><span class="num">' + b + "</span></div>"; }

  function submit(ev) {
    ev.preventDefault();
    var f = ev.target, q = state.q, t = state.t;
    if (!f.confirm.checked) { f.confirm.focus(); return; }
    var spec = Object.keys(q.inputs).map(function (k) { return k + ": " + q.inputs[k]; }).join(", ");
    var o = {
      id: "PLX-" + Date.now().toString(36).toUpperCase(),
      product: q.product, name: q.name, inputs: q.inputs, qty: t.qty, totals: t, estimate: q.estimate,
      customer: { name: f.cname.value.trim(), phone: f.phone.value.trim(), city: f.city.value.trim() },
      delivery: f.delivery.value, svg: state.svg, created: new Date().toISOString()
    };
    o.message = ["הזמנה " + o.id, q.name + " × " + t.qty, spec,
      t.quote_only ? "משלוח לפי הצעה" : "סה״כ כולל מע״מ " + ils(t.inc_vat) + (q.estimate ? " (משוער)" : ""),
      o.customer.name + ", " + o.customer.phone + ", " + o.customer.city + (o.delivery === "delivery" ? " · משלוח" : " · איסוף")].join("\n");
    try { var all = JSON.parse(localStorage.getItem("plx_orders") || "[]"); all.push(o); localStorage.setItem("plx_orders", JSON.stringify(all)); } catch (e) {}
    track("order_submit", { product: q.product, total: t.inc_vat, provider: SITE.payment.provider });
    var r;
    try { r = PAY[SITE.payment.provider](o); } catch (e) { alert(e.message); return; }
    if (r.url) { location.href = r.url; return; }
    var box = document.getElementById("o-copy"); box.textContent = r.copy; box.style.display = "block";
    document.getElementById("o-copy-hint").style.display = "block";
  }
  function close() { document.getElementById("sheet").removeAttribute("open"); }
  return { open: open, submit: submit, close: close, PAY: PAY };
})();
