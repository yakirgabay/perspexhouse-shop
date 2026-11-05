// Motion helpers for the two allowed effects. Preview.render() marks shapes with class="glass" (fill) or "cut" (line).
// The hover/drag tilt was removed 5.11 (round 3): it pushed the drawing out of its frame and only jumped on phones.
var Motion = {
  // build (clip wipe) + fill on an <svg>. Call on first render and when the product changes, not on every slider tick.
  build: function (svg) {
    svg.classList.remove("build"); void svg.getBoundingClientRect(); svg.classList.add("build");
  }
};
