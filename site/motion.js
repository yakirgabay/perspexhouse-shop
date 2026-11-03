// Motion helpers for the three allowed effects. Preview.render() marks shapes with class="glass" (fill) or "cut" (line).
var Motion = {
  // 1+2: replay the build (clip wipe) + fill on an <svg>. Call on first render and when the product changes, not on every slider tick.
  build: function (svg) {
    svg.classList.remove("build"); void svg.getBoundingClientRect(); svg.classList.add("build");
  },
  // 3: tilt an element up to `deg` degrees from the pointer position while dragging (or hovering on desktop).
  tilt: function (el, deg) {
    deg = deg || 10; el.classList.add("tilt");
    var active = false;
    function set(e) {
      var r = el.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1..1
      el.style.transform = "rotate(" + (-x * deg).toFixed(2) + "deg)";
    }
    el.addEventListener("pointerdown", function (e) { active = true; el.classList.add("dragging"); el.setPointerCapture(e.pointerId); set(e); });
    el.addEventListener("pointermove", function (e) { if (active || e.pointerType === "mouse") set(e); });
    function reset() { active = false; el.classList.remove("dragging"); el.style.transform = ""; }
    el.addEventListener("pointerup", reset); el.addEventListener("pointercancel", reset); el.addEventListener("pointerleave", reset);
  }
};
