// Copies each query parameter whose name starts with "--" onto the root element as a CSS custom
// property, so one template renders at several values: page.html?--c1=%23818181 sets --c1.
// render-thresholds.ts opens each template this way. Other parameters are ignored.
for (const [name, value] of new URLSearchParams(window.location.search)) {
  if (name.startsWith("--")) {
    document.documentElement.style.setProperty(name, value);
  }
}
