// The twenty throwaway page pairs for the dataviz pre-screen (crit-q25.17). Each pair is written
// once as a function of one switch, `defect`, so the positive page and the negative page differ
// only in the defect of one candidate criterion. Charts are hand-written inline SVG; no charting
// library is used. Disposable spike code: these pages are not fixtures and never go under packs/.

/** One page pair: the candidate it tests, a short name, and its HTML for either side. */
export type PrescreenPair = {
  candidate: string;
  name: string;
  html: (defect: boolean) => string;
};

/** The quiet palette of the clean charts: one blue, a second orange, and pale greys. */
const BLUE = "#3366cc";
const ORANGE = "#e08a1e";
const GRID_LIGHT = "#e6e8eb";
const AXIS_TEXT = "#5f6670";

/** The shared head: the Inter font from the packs renderer, and the page-wide reset. */
function head(extraCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 400; src: url("inter-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Inter"; font-weight: 700; src: url("inter-latin-700-normal.woff2") format("woff2"); font-display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1280px; height: 800px; overflow: hidden; }
body { font-family: "Inter"; color: #1f2328; background: #f5f6f8; font-size: 15px; }
.card { background: #ffffff; border: 1px solid #e3e6ea; border-radius: 10px; padding: 20px 24px; }
.card h2 { font-size: 16px; margin-bottom: 4px; }
.card .sub { font-size: 13px; color: ${AXIS_TEXT}; margin-bottom: 12px; }
svg text { font-family: "Inter"; }
${extraCss}
</style></head><body>`;
}

/**
 * A dashboard page: a dark sidebar with menu links, a top bar with the page title, and the given
 * main content. Every dashboard page in the spike uses this frame.
 */
function dashboard(product: string, pageTitle: string, links: string[], main: string): string {
  let linkHtml = "";
  for (let index = 0; index < links.length; index++) {
    let style = "padding:10px 14px;border-radius:6px;color:#c9d1d9;margin-bottom:2px";
    if (index === 0) {
      style = "padding:10px 14px;border-radius:6px;color:#ffffff;background:#2d333b;margin-bottom:2px";
    }
    linkHtml += `<div style="${style}">${links[index]}</div>`;
  }
  return `${head("")}
<div style="display:flex;height:800px">
<aside style="width:220px;background:#1c2128;padding:24px 14px;font-size:14px">
<div style="color:#ffffff;font-weight:700;font-size:18px;padding:0 14px 28px">${product}</div>
${linkHtml}
</aside>
<div style="flex:1;padding:28px 36px;overflow:hidden">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
<h1 style="font-size:24px">${pageTitle}</h1>
<div style="font-size:13px;color:${AXIS_TEXT};background:#ffffff;border:1px solid #e3e6ea;border-radius:6px;padding:8px 12px">Export</div>
</div>
${main}
</div>
</div></body></html>`;
}

/** A report page: a white top bar, a headline, a paragraph, and the given figure below them. */
function report(site: string, headline: string, paragraph: string, figure: string): string {
  return `${head("body { background: #ffffff; }")}
<header style="height:64px;display:flex;align-items:center;padding:0 64px;border-bottom:1px solid #e6e8eb">
<strong style="font-size:19px;margin-right:48px">${site}</strong>
<nav style="font-size:14px;color:${AXIS_TEXT}"><span style="margin-right:24px">Reports</span><span style="margin-right:24px">Data</span><span style="margin-right:24px">Methods</span><span>About</span></nav>
</header>
<main style="width:900px;margin:28px auto 0">
<h1 style="font-size:30px;line-height:1.2;margin-bottom:10px">${headline}</h1>
<p style="font-size:16px;line-height:1.55;color:#3d444d;margin-bottom:20px">${paragraph}</p>
${figure}
</main></body></html>`;
}

/** Options for a vertical bar chart. */
type BarOptions = {
  width: number;
  height: number;
  labels: string[];
  values: number[];
  axisMin: number;
  axisMax: number;
  tickStep: number;
  colours: string[];
  heavyGrid: boolean;
  threeD: boolean;
  junk: boolean;
  valueSuffix: string;
};

/** The default bar options: a clean chart in one blue with pale gridlines. */
function barDefaults(): Omit<BarOptions, "labels" | "values" | "axisMin" | "axisMax" | "tickStep"> {
  return {
    width: 940,
    height: 470,
    colours: [BLUE],
    heavyGrid: false,
    threeD: false,
    junk: false,
    valueSuffix: "",
  };
}

/** Pick the colour of bar number `index`, cycling when there are fewer colours than bars. */
function colourAt(colours: string[], index: number): string {
  return colours[index % colours.length];
}

/** Darken a hex colour by mixing it with black, for the sides of three-dimensional bars. */
function darken(hex: string, amount: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const scale = 1 - amount;
  const parts = [red, green, blue].map((channel) =>
    Math.round(channel * scale).toString(16).padStart(2, "0"),
  );
  return `#${parts.join("")}`;
}

/** The SVG definitions for the decoration of the chartjunk pages: a striped and a dotted fill. */
const JUNK_DEFS = `<defs>
<pattern id="stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#7fa7e8"/><rect width="5" height="10" fill="#3366cc"/></pattern>
<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#fff4d6"/><circle cx="7" cy="7" r="2.5" fill="#f2c94c"/></pattern>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#fff7e0"/></linearGradient>
</defs>`;

/** A cartoon coin stack drawn with ellipses, used as decoration that shows no data. */
function coinStack(x: number, y: number): string {
  let coins = "";
  for (let index = 0; index < 4; index++) {
    const coinY = y - index * 9;
    coins += `<ellipse cx="${x}" cy="${coinY}" rx="18" ry="7" fill="#f2c94c" stroke="#b8860b" stroke-width="1.5"/>`;
  }
  return coins;
}

/** A cartoon sun with rays, used as decoration that shows no data. */
function sun(x: number, y: number, radius: number): string {
  let rays = "";
  for (let index = 0; index < 12; index++) {
    const angle = (index * Math.PI) / 6;
    const x1 = x + Math.cos(angle) * (radius + 6);
    const y1 = y + Math.sin(angle) * (radius + 6);
    const x2 = x + Math.cos(angle) * (radius + 18);
    const y2 = y + Math.sin(angle) * (radius + 18);
    rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f2a93b" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `${rays}<circle cx="${x}" cy="${y}" r="${radius}" fill="#f9d54a" stroke="#f2a93b" stroke-width="3"/>`;
}

/** A cartoon cloud made of three circles, used as decoration that shows no data. */
function cloud(x: number, y: number): string {
  return `<g fill="#ffffff" stroke="#c8d6e5" stroke-width="2"><circle cx="${x}" cy="${y}" r="22"/><circle cx="${x + 26}" cy="${y - 10}" r="28"/><circle cx="${x + 56}" cy="${y}" r="22"/></g>`;
}

/**
 * Draw a vertical bar chart as SVG. The switches draw heavy dark gridlines and a frame, bars with
 * a depth and side, or decoration that shows no data, so a pair can turn one of them on.
 */
function barChart(options: BarOptions): string {
  const left = 64;
  const right = 16;
  const top = 16;
  const bottom = 40;
  const plotWidth = options.width - left - right;
  const plotHeight = options.height - top - bottom;
  const range = options.axisMax - options.axisMin;
  let parts = "";
  if (options.junk) {
    parts += JUNK_DEFS;
    parts += `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="url(#dots)"/>`;
  }
  for (let tick = options.axisMin; tick <= options.axisMax; tick += options.tickStep) {
    const y = top + plotHeight - ((tick - options.axisMin) / range) * plotHeight;
    if (options.heavyGrid) {
      parts += `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="#1f2328" stroke-width="2.5"/>`;
    } else {
      parts += `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="${GRID_LIGHT}" stroke-width="1"/>`;
    }
    parts += `<text x="${left - 10}" y="${y + 4}" font-size="12" fill="${AXIS_TEXT}" text-anchor="end">${tick.toLocaleString("en-US")}${options.valueSuffix}</text>`;
  }
  const slot = plotWidth / options.values.length;
  const barWidth = slot * 0.6;
  for (let index = 0; index < options.values.length; index++) {
    const value = options.values[index];
    const x = left + slot * index + (slot - barWidth) / 2;
    const barHeight = ((value - options.axisMin) / range) * plotHeight;
    const y = top + plotHeight - barHeight;
    const colour = colourAt(options.colours, index);
    if (options.heavyGrid) {
      parts += `<line x1="${left + slot * index}" y1="${top}" x2="${left + slot * index}" y2="${top + plotHeight}" stroke="#1f2328" stroke-width="2.5"/>`;
    }
    if (options.threeD) {
      const depth = 14;
      parts += `<polygon points="${x},${y} ${x + depth},${y - depth} ${x + barWidth + depth},${y - depth} ${x + barWidth},${y}" fill="${darken(colour, -0.0)}" opacity="0.75"/>`;
      parts += `<polygon points="${x + barWidth},${y} ${x + barWidth + depth},${y - depth} ${x + barWidth + depth},${y + barHeight - depth} ${x + barWidth},${y + barHeight}" fill="${darken(colour, 0.35)}"/>`;
      parts += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colour}"/>`;
    } else if (options.junk) {
      parts += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#stripes)" rx="4"/>`;
      parts += coinStack(x + barWidth / 2, y - 12);
    } else {
      parts += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colour}" rx="2"/>`;
    }
    parts += `<text x="${x + barWidth / 2}" y="${top + plotHeight + 22}" font-size="12" fill="${AXIS_TEXT}" text-anchor="middle">${options.labels[index]}</text>`;
  }
  if (options.heavyGrid) {
    parts += `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#1f2328" stroke-width="4"/>`;
    parts += `<rect x="2" y="2" width="${options.width - 4}" height="${options.height - 4}" fill="none" stroke="#1f2328" stroke-width="3"/>`;
  } else {
    parts += `<line x1="${left}" y1="${top + plotHeight}" x2="${left + plotWidth}" y2="${top + plotHeight}" stroke="#9aa1aa" stroke-width="1"/>`;
  }
  return `<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">${parts}</svg>`;
}

/** One line of a line chart: its name, its colour, and its values in x order. */
type Series = { name: string; colour: string; values: number[] };

/** Options for a line chart. */
type LineOptions = {
  width: number;
  height: number;
  labels: string[];
  series: Series[];
  axisMin: number;
  axisMax: number;
  tickStep: number;
  heavyGrid: boolean;
  junk: boolean;
  lineWidth: number;
  valueSuffix: string;
};

/**
 * Draw a line chart as SVG, with a legend row above it. The switches draw heavy dark gridlines
 * and a frame, or a sky, sun, and clouds behind the lines that show no data.
 */
function lineChart(options: LineOptions): string {
  const left = 70;
  const right = 20;
  const top = 40;
  const bottom = 36;
  const plotWidth = options.width - left - right;
  const plotHeight = options.height - top - bottom;
  const range = options.axisMax - options.axisMin;
  let parts = "";
  if (options.junk) {
    parts += JUNK_DEFS;
    parts += `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="url(#sky)"/>`;
    parts += sun(left + plotWidth - 70, top + 60, 28);
    parts += cloud(left + 90, top + 50);
    parts += cloud(left + plotWidth / 2, top + 36);
  }
  for (let tick = options.axisMin; tick <= options.axisMax; tick += options.tickStep) {
    const y = top + plotHeight - ((tick - options.axisMin) / range) * plotHeight;
    if (options.heavyGrid) {
      parts += `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="#1f2328" stroke-width="2.5"/>`;
    } else {
      parts += `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="${GRID_LIGHT}" stroke-width="1"/>`;
    }
    parts += `<text x="${left - 10}" y="${y + 4}" font-size="12" fill="${AXIS_TEXT}" text-anchor="end">${tick}${options.valueSuffix}</text>`;
  }
  const step = plotWidth / (options.labels.length - 1);
  for (let index = 0; index < options.labels.length; index++) {
    const x = left + step * index;
    if (options.heavyGrid) {
      parts += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotHeight}" stroke="#1f2328" stroke-width="2.5"/>`;
    }
    parts += `<text x="${x}" y="${top + plotHeight + 22}" font-size="12" fill="${AXIS_TEXT}" text-anchor="middle">${options.labels[index]}</text>`;
  }
  let legendX = left;
  for (const series of options.series) {
    const points: string[] = [];
    for (let index = 0; index < series.values.length; index++) {
      const x = left + step * index;
      const y = top + plotHeight - ((series.values[index] - options.axisMin) / range) * plotHeight;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    parts += `<polyline points="${points.join(" ")}" fill="none" stroke="${series.colour}" stroke-width="${options.lineWidth}" stroke-linejoin="round"/>`;
    parts += `<rect x="${legendX}" y="8" width="14" height="4" fill="${series.colour}"/><text x="${legendX + 20}" y="14" font-size="12" fill="#3d444d">${series.name}</text>`;
    legendX += 30 + series.name.length * 7;
  }
  if (options.heavyGrid) {
    parts += `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#1f2328" stroke-width="4"/>`;
    parts += `<rect x="2" y="2" width="${options.width - 4}" height="${options.height - 4}" fill="none" stroke="#1f2328" stroke-width="3"/>`;
  } else {
    parts += `<line x1="${left}" y1="${top + plotHeight}" x2="${left + plotWidth}" y2="${top + plotHeight}" stroke="#9aa1aa" stroke-width="1"/>`;
  }
  return `<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">${parts}</svg>`;
}

/** One slice of a pie: its label, its value, and its colour. */
type Slice = { label: string; value: number; colour: string };

/**
 * Draw a pie or donut chart as SVG with a legend beside it. With `threeD` the pie is squashed
 * into a tilted ellipse with a darker rim below it, the usual three-dimensional pie.
 */
function pieChart(slices: Slice[], donut: boolean, threeD: boolean): string {
  const width = 900;
  const height = 440;
  const centreX = 230;
  const centreY = 210;
  const radius = 180;
  let squash = 1;
  if (threeD) {
    squash = 0.55;
  }
  let total = 0;
  for (const slice of slices) {
    total += slice.value;
  }
  let parts = "";
  /** The point on the rim at a given angle, squashed for the tilted pie. */
  const rim = (angle: number, offsetY: number): string => {
    const x = centreX + Math.cos(angle) * radius;
    const y = centreY + offsetY + Math.sin(angle) * radius * squash;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  if (threeD) {
    const depth = 36;
    let angle = -Math.PI / 2;
    for (const slice of slices) {
      const sweep = (slice.value / total) * Math.PI * 2;
      const start = Math.max(angle, 0);
      const end = Math.min(angle + sweep, Math.PI);
      if (end > start) {
        let wall = `M ${rim(start, 0)} `;
        for (let step = 0; step <= 12; step++) {
          wall += `L ${rim(start + ((end - start) * step) / 12, 0)} `;
        }
        for (let step = 12; step >= 0; step--) {
          wall += `L ${rim(start + ((end - start) * step) / 12, depth)} `;
        }
        parts += `<path d="${wall}Z" fill="${darken(slice.colour, 0.3)}"/>`;
      }
      angle += sweep;
    }
  }
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweep = (slice.value / total) * Math.PI * 2;
    const largeArc = sweep > Math.PI ? 1 : 0;
    const start = rim(angle, 0);
    const end = rim(angle + sweep, 0);
    parts += `<path d="M ${centreX},${centreY} L ${start} A ${radius},${radius * squash} 0 ${largeArc} 1 ${end} Z" fill="${slice.colour}" stroke="#ffffff" stroke-width="1.5"/>`;
    angle += sweep;
  }
  if (donut) {
    parts += `<ellipse cx="${centreX}" cy="${centreY}" rx="${radius * 0.55}" ry="${radius * 0.55 * squash}" fill="#ffffff"/>`;
  }
  let legendY = 40;
  const legendGap = Math.min(30, 380 / slices.length);
  for (const slice of slices) {
    const percent = ((slice.value / total) * 100).toFixed(0);
    parts += `<rect x="480" y="${legendY - 11}" width="14" height="14" rx="3" fill="${slice.colour}"/><text x="504" y="${legendY}" font-size="13" fill="#3d444d">${slice.label}</text><text x="760" y="${legendY}" font-size="13" fill="${AXIS_TEXT}" text-anchor="end">${percent}%</text>`;
    legendY += legendGap;
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts}</svg>`;
}

/** A rainbow ramp from blue through green and yellow to red, for ordered values. */
const RAINBOW = ["#2b3fd4", "#1f9be0", "#20c2a0", "#5fd35a", "#e8e23a", "#f59a2b", "#e0322a"];

/** A single-hue ramp from pale to dark blue, for ordered values. */
const BLUES = ["#eef3fb", "#cfdcf3", "#a8c1ea", "#7ca1dd", "#4f7ecb", "#2f5fb3", "#1b3f85"];

/** Pick the ramp colour for a value between 0 and 1. */
function rampColour(ramp: string[], fraction: number): string {
  const index = Math.min(ramp.length - 1, Math.floor(fraction * ramp.length));
  return ramp[index];
}

/** A small legend strip for a colour ramp, labelled low and high at its ends. */
function rampLegend(ramp: string[], lowLabel: string, highLabel: string): string {
  let cells = "";
  for (const colour of ramp) {
    cells += `<span style="display:inline-block;width:34px;height:12px;background:${colour}"></span>`;
  }
  return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${AXIS_TEXT};margin-top:12px"><span>${lowLabel}</span><span style="display:flex">${cells}</span><span>${highLabel}</span></div>`;
}

/** A deterministic pseudo-random number in [0, 1) from two integers, so pages never change. */
function noise(a: number, b: number): number {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// ---------------------------------------------------------------------------------------------
// The pairs, two per candidate, in the order of questions.json.
// ---------------------------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SAAS_LINKS = ["Overview", "Revenue", "Customers", "Usage", "Billing", "Settings"];

const heavyGridDashboard: PrescreenPair = {
  candidate: "heavy-gridlines-and-frames",
  name: "heavy-grid-revenue",
  html: (defect) =>
    dashboard(
      "Ledgerly",
      "Revenue",
      SAAS_LINKS,
      `<div class="card"><h2>Monthly recurring revenue</h2><div class="sub">Thousands of US dollars, 2025</div>
${barChart({ ...barDefaults(), labels: MONTHS, values: [182, 190, 205, 199, 214, 226, 231, 244, 252, 249, 268, 281], axisMin: 0, axisMax: 300, tickStep: 50, heavyGrid: defect, height: 520 })}</div>`,
    ),
};

const heavyGridReport: PrescreenPair = {
  candidate: "heavy-gridlines-and-frames",
  name: "heavy-grid-rainfall",
  html: (defect) =>
    report(
      "Open Climate Desk",
      "Spring rainfall returned to its long-term average",
      "Monthly rainfall at the three city gauges, compared with the average for 1991 to 2020. The wet April made up for a dry February.",
      lineChart({
        width: 900,
        height: 500,
        labels: MONTHS,
        series: [
          { name: "2025", colour: BLUE, values: [62, 31, 58, 96, 71, 54, 40, 44, 59, 77, 88, 81] },
          { name: "1991 to 2020 average", colour: ORANGE, values: [68, 52, 57, 61, 63, 55, 45, 49, 58, 72, 80, 79] },
        ],
        axisMin: 0,
        axisMax: 120,
        tickStep: 20,
        heavyGrid: defect,
        junk: false,
        lineWidth: 3,
        valueSuffix: " mm",
      }),
    ),
};

const junkSavings: PrescreenPair = {
  candidate: "chartjunk-decoration",
  name: "junk-savings",
  html: (defect) =>
    dashboard(
      "Nestegg",
      "Savings",
      ["Savings", "Goals", "Accounts", "Transfers", "Profile"],
      `<div class="card"><h2>Money saved each month</h2><div class="sub">US dollars, last six months</div>
${barChart({ ...barDefaults(), labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"], values: [320, 410, 280, 450, 520, 610], axisMin: 0, axisMax: 700, tickStep: 100, junk: defect, height: 520 })}</div>`,
    ),
};

const junkWeather: PrescreenPair = {
  candidate: "chartjunk-decoration",
  name: "junk-temperature",
  html: (defect) =>
    report(
      "Harbour Weather Notes",
      "A warmer summer than the last ten years",
      "Average daily high temperature by month at the harbour station, this year against the ten-year average.",
      lineChart({
        width: 900,
        height: 500,
        labels: MONTHS,
        series: [
          { name: "This year", colour: "#c0392b", values: [6, 7, 11, 15, 19, 24, 28, 27, 22, 16, 10, 7] },
          { name: "Ten-year average", colour: "#5f6670", values: [5, 6, 10, 14, 18, 22, 25, 25, 21, 15, 9, 6] },
        ],
        axisMin: 0,
        axisMax: 35,
        tickStep: 5,
        heavyGrid: false,
        junk: defect,
        lineWidth: 3,
        valueSuffix: " °C",
      }),
    ),
};

const threeDBars: PrescreenPair = {
  candidate: "three-d-chart",
  name: "three-d-bars",
  html: (defect) =>
    dashboard(
      "Shipwise",
      "Orders",
      ["Orders", "Shipments", "Returns", "Warehouses", "Reports"],
      `<div class="card"><h2>Orders by region</h2><div class="sub">Last quarter</div>
${barChart({ ...barDefaults(), labels: ["North", "South", "East", "West", "Central", "Online"], values: [4200, 3100, 5600, 2800, 3900, 6900], axisMin: 0, axisMax: 8000, tickStep: 2000, threeD: defect, height: 520 })}</div>`,
    ),
};

const BROWSER_SLICES: Slice[] = [
  { label: "Chrome", value: 52, colour: BLUE },
  { label: "Safari", value: 27, colour: ORANGE },
  { label: "Edge", value: 12, colour: "#2a9d8f" },
  { label: "Other", value: 9, colour: "#9aa1aa" },
];

const threeDPie: PrescreenPair = {
  candidate: "three-d-chart",
  name: "three-d-pie",
  html: (defect) =>
    report(
      "Web Usage Monitor",
      "Which browsers our readers used in September",
      "Share of page views by browser, from the analytics of all our sites. Chrome and Safari together account for most visits.",
      `<div style="border:1px solid #e6e8eb;border-radius:10px;padding:20px">${pieChart(BROWSER_SLICES, false, defect)}</div>`,
    ),
};

/** Fourteen slices of a budget, a realistic many-slice pie. */
const MANY_BUDGET_SLICES: Slice[] = [
  { label: "Salaries", value: 31, colour: "#3366cc" },
  { label: "Rent", value: 12, colour: "#e08a1e" },
  { label: "Cloud hosting", value: 9, colour: "#2a9d8f" },
  { label: "Marketing", value: 8, colour: "#c0392b" },
  { label: "Software", value: 7, colour: "#8e44ad" },
  { label: "Travel", value: 6, colour: "#16a085" },
  { label: "Legal", value: 5, colour: "#d35400" },
  { label: "Insurance", value: 4, colour: "#2c3e50" },
  { label: "Training", value: 4, colour: "#7f8c8d" },
  { label: "Equipment", value: 3, colour: "#f1c40f" },
  { label: "Events", value: 3, colour: "#e84393" },
  { label: "Utilities", value: 3, colour: "#00b894" },
  { label: "Recruiting", value: 3, colour: "#6c5ce7" },
  { label: "Office supplies", value: 2, colour: "#fd79a8" },
];

/** The same budget grouped into four slices. */
const FEW_BUDGET_SLICES: Slice[] = [
  { label: "Salaries", value: 31, colour: "#3366cc" },
  { label: "Rent", value: 12, colour: "#e08a1e" },
  { label: "Cloud hosting", value: 9, colour: "#2a9d8f" },
  { label: "Everything else", value: 48, colour: "#9aa1aa" },
];

const pieBudget: PrescreenPair = {
  candidate: "pie-too-many-slices",
  name: "pie-budget",
  html: (defect) =>
    dashboard(
      "Tallybook",
      "Spending",
      ["Spending", "Budgets", "Invoices", "Vendors", "Settings"],
      `<div class="card"><h2>Operating costs by category</h2><div class="sub">Year to date</div>
${pieChart(defect ? MANY_BUDGET_SLICES : FEW_BUDGET_SLICES, false, false)}</div>`,
    ),
};

/** Sixteen traffic sources, a realistic many-slice donut. */
const MANY_SOURCE_SLICES: Slice[] = [
  { label: "Google search", value: 24, colour: "#3366cc" },
  { label: "Direct", value: 15, colour: "#e08a1e" },
  { label: "Newsletter", value: 9, colour: "#2a9d8f" },
  { label: "Facebook", value: 7, colour: "#c0392b" },
  { label: "LinkedIn", value: 6, colour: "#8e44ad" },
  { label: "Bing", value: 5, colour: "#16a085" },
  { label: "Reddit", value: 5, colour: "#d35400" },
  { label: "Partner sites", value: 4, colour: "#2c3e50" },
  { label: "YouTube", value: 4, colour: "#7f8c8d" },
  { label: "Instagram", value: 4, colour: "#f1c40f" },
  { label: "Podcasts", value: 3, colour: "#e84393" },
  { label: "X", value: 3, colour: "#00b894" },
  { label: "DuckDuckGo", value: 3, colour: "#6c5ce7" },
  { label: "Hacker News", value: 3, colour: "#fd79a8" },
  { label: "Paid ads", value: 3, colour: "#55efc4" },
  { label: "Other", value: 2, colour: "#b2bec3" },
];

/** The same traffic grouped into four sources. */
const FEW_SOURCE_SLICES: Slice[] = [
  { label: "Search", value: 35, colour: "#3366cc" },
  { label: "Direct", value: 15, colour: "#e08a1e" },
  { label: "Social", value: 29, colour: "#2a9d8f" },
  { label: "Other", value: 21, colour: "#9aa1aa" },
];

const donutTraffic: PrescreenPair = {
  candidate: "pie-too-many-slices",
  name: "donut-traffic",
  html: (defect) =>
    report(
      "Newsroom Analytics",
      "Where our readers came from this quarter",
      "Share of visits by the site or channel that sent the reader to us, July to September.",
      `<div style="border:1px solid #e6e8eb;border-radius:10px;padding:20px">${pieChart(defect ? MANY_SOURCE_SLICES : FEW_SOURCE_SLICES, true, false)}</div>`,
    ),
};

/** A heatmap of support tickets by weekday and hour, coloured with the given ramp. */
function ticketHeatmap(ramp: string[]): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let rows = "";
  for (let day = 0; day < days.length; day++) {
    let cells = "";
    for (let hour = 0; hour < 24; hour++) {
      const workHours = hour >= 8 && hour <= 18 ? 1 : 0.25;
      const weekday = day < 5 ? 1 : 0.4;
      const fraction = Math.min(0.999, workHours * weekday * (0.7 + noise(day, hour) * 0.3));
      cells += `<td style="width:34px;height:44px;background:${rampColour(ramp, fraction)}"></td>`;
    }
    rows += `<tr><th style="font-weight:400;font-size:12px;color:${AXIS_TEXT};padding-right:10px;text-align:right">${days[day]}</th>${cells}</tr>`;
  }
  let hourLabels = "<th></th>";
  for (let hour = 0; hour < 24; hour++) {
    hourLabels += `<th style="font-weight:400;font-size:11px;color:${AXIS_TEXT};padding-top:6px">${hour % 3 === 0 ? `${hour}:00` : ""}</th>`;
  }
  return `<table style="border-collapse:separate;border-spacing:2px">${rows}<tr>${hourLabels}</tr></table>${rampLegend(ramp, "Fewer tickets", "More tickets")}`;
}

const rainbowHeatmap: PrescreenPair = {
  candidate: "rainbow-for-ordered-values",
  name: "rainbow-heatmap",
  html: (defect) =>
    dashboard(
      "Helpline",
      "Ticket volume",
      ["Ticket volume", "Queues", "Agents", "Customers", "Settings"],
      `<div class="card"><h2>Tickets opened by hour of the week</h2><div class="sub">Last 30 days, local time</div>
${ticketHeatmap(defect ? RAINBOW : BLUES)}</div>`,
    ),
};

/** A tile map of regions, each tile coloured by its unemployment rate with the given ramp. */
function regionTileMap(ramp: string[]): string {
  const regions = [
    ["North Coast", "Highlands", "Lakeside", "Eastport", "Riverbend"],
    ["Westvale", "Midlands", "Capital", "Harbour", "Seaview"],
    ["Southdown", "Marsh", "Valley", "Ironhill", "Bayside"],
    ["Plains", "Cedar", "Old Town", "Redcliff", "Dunes"],
  ];
  let tiles = "";
  for (let row = 0; row < regions.length; row++) {
    for (let column = 0; column < regions[row].length; column++) {
      const rate = 2.5 + noise(row + 3, column + 7) * 8;
      const fraction = (rate - 2.5) / 8;
      const textColour = ramp === BLUES && fraction > 0.55 ? "#ffffff" : "#1f2328";
      tiles += `<div style="background:${rampColour(ramp, fraction)};color:${textColour};height:104px;border-radius:6px;padding:10px;font-size:13px"><div>${regions[row][column]}</div><div style="font-weight:700;font-size:18px;margin-top:30px">${rate.toFixed(1)}%</div></div>`;
    }
  }
  return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${tiles}</div>${rampLegend(ramp, "2.5%", "10.5%")}`;
}

const rainbowTileMap: PrescreenPair = {
  candidate: "rainbow-for-ordered-values",
  name: "rainbow-tile-map",
  html: (defect) =>
    report(
      "Regional Labour Review",
      "Unemployment is highest along the southern coast",
      "Unemployment rate by region, third quarter. Each tile is one region, placed roughly where it sits on the map.",
      regionTileMap(defect ? RAINBOW : BLUES),
    ),
};

/** The red and green pair of the defect side, of about the same lightness. */
const RED = "#d33f3f";
const GREEN = "#3f9e3f";

const redGreenLines: PrescreenPair = {
  candidate: "series-split-only-by-red-green",
  name: "red-green-lines",
  html: (defect) =>
    dashboard(
      "Pulse",
      "Sign-ups",
      ["Sign-ups", "Activation", "Retention", "Funnels", "Settings"],
      `<div class="card"><h2>New sign-ups: mobile app and website</h2><div class="sub">Weekly, last 12 weeks</div>
${lineChart({
  width: 940,
  height: 520,
  labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
  series: [
    { name: "Mobile app", colour: defect ? RED : BLUE, values: [420, 450, 470, 440, 510, 530, 560, 540, 600, 620, 640, 690] },
    { name: "Website", colour: defect ? GREEN : ORANGE, values: [480, 470, 500, 520, 500, 540, 530, 570, 560, 590, 610, 600] },
  ],
  axisMin: 300,
  axisMax: 750,
  tickStep: 50,
  heavyGrid: false,
  junk: false,
  lineWidth: 3,
  valueSuffix: "",
})}</div>`,
    ),
};

/** A grouped bar chart of two series, coloured with the two given colours, with a legend. */
function groupedBars(labels: string[], first: number[], second: number[], colours: [string, string], names: [string, string]): string {
  const width = 900;
  const height = 460;
  const left = 56;
  const top = 40;
  const bottom = 36;
  const plotWidth = width - left - 16;
  const plotHeight = height - top - bottom;
  const axisMax = 100;
  let parts = "";
  for (let tick = 0; tick <= axisMax; tick += 20) {
    const y = top + plotHeight - (tick / axisMax) * plotHeight;
    parts += `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="${GRID_LIGHT}"/><text x="${left - 10}" y="${y + 4}" font-size="12" fill="${AXIS_TEXT}" text-anchor="end">${tick}%</text>`;
  }
  const slot = plotWidth / labels.length;
  const barWidth = slot * 0.3;
  for (let index = 0; index < labels.length; index++) {
    const x = left + slot * index + slot * 0.18;
    const firstHeight = (first[index] / axisMax) * plotHeight;
    const secondHeight = (second[index] / axisMax) * plotHeight;
    parts += `<rect x="${x}" y="${top + plotHeight - firstHeight}" width="${barWidth}" height="${firstHeight}" fill="${colours[0]}"/>`;
    parts += `<rect x="${x + barWidth + 4}" y="${top + plotHeight - secondHeight}" width="${barWidth}" height="${secondHeight}" fill="${colours[1]}"/>`;
    parts += `<text x="${left + slot * index + slot / 2}" y="${top + plotHeight + 22}" font-size="12" fill="${AXIS_TEXT}" text-anchor="middle">${labels[index]}</text>`;
  }
  parts += `<rect x="${left}" y="8" width="14" height="14" fill="${colours[0]}"/><text x="${left + 20}" y="19" font-size="12" fill="#3d444d">${names[0]}</text>`;
  parts += `<rect x="${left + 120}" y="8" width="14" height="14" fill="${colours[1]}"/><text x="${left + 140}" y="19" font-size="12" fill="#3d444d">${names[1]}</text>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts}</svg>`;
}

const redGreenBars: PrescreenPair = {
  candidate: "series-split-only-by-red-green",
  name: "red-green-bars",
  html: (defect) =>
    report(
      "Civic Survey Lab",
      "Trust in local services rose in most areas",
      "Share of residents who said they trust each local service, in the 2024 and 2025 surveys.",
      groupedBars(
        ["Libraries", "Transit", "Parks", "Police", "Schools", "Housing"],
        [71, 48, 66, 52, 58, 31],
        [76, 55, 69, 50, 63, 38],
        defect ? [RED, GREEN] : [BLUE, ORANGE],
        ["2024", "2025"],
      ),
    ),
};

/** Many unrelated colours for the bars of a single series. */
const PARTY_COLOURS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#e67e22", "#1abc9c", "#e84393", "#34495e", "#fd79a8", "#00cec9", "#6c5ce7"];

const colourfulBars: PrescreenPair = {
  candidate: "colour-without-meaning",
  name: "colourful-bars",
  html: (defect) =>
    dashboard(
      "Streamline",
      "Usage",
      ["Usage", "Projects", "Members", "Billing", "Settings"],
      `<div class="card"><h2>Active users per month</h2><div class="sub">2025</div>
${barChart({ ...barDefaults(), labels: MONTHS, values: [1200, 1350, 1310, 1480, 1620, 1590, 1710, 1840, 1800, 1950, 2080, 2210], axisMin: 0, axisMax: 2500, tickStep: 500, colours: defect ? PARTY_COLOURS : [BLUE], height: 520 })}</div>`,
    ),
};

/** A horizontal bar chart of one series, each bar coloured from the given list. */
function horizontalBars(labels: string[], values: number[], colours: string[], axisMax: number, suffix: string): string {
  const width = 900;
  const rowHeight = 46;
  const left = 170;
  const height = labels.length * rowHeight + 40;
  const plotWidth = width - left - 60;
  let parts = "";
  for (let tick = 0; tick <= axisMax; tick += axisMax / 5) {
    const x = left + (tick / axisMax) * plotWidth;
    parts += `<line x1="${x}" y1="0" x2="${x}" y2="${height - 30}" stroke="${GRID_LIGHT}"/><text x="${x}" y="${height - 10}" font-size="12" fill="${AXIS_TEXT}" text-anchor="middle">${tick}${suffix}</text>`;
  }
  for (let index = 0; index < labels.length; index++) {
    const y = index * rowHeight + 8;
    const barLength = (values[index] / axisMax) * plotWidth;
    parts += `<text x="${left - 12}" y="${y + 21}" font-size="13" fill="#3d444d" text-anchor="end">${labels[index]}</text>`;
    parts += `<rect x="${left}" y="${y}" width="${barLength}" height="30" fill="${colourAt(colours, index)}" rx="2"/>`;
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts}</svg>`;
}

const colourfulHorizontal: PrescreenPair = {
  candidate: "colour-without-meaning",
  name: "colourful-horizontal",
  html: (defect) =>
    report(
      "Commute Atlas",
      "How long the average commute takes in each city",
      "Average one-way commute time in minutes, from the 2025 household travel survey.",
      horizontalBars(
        ["Northbridge", "Port Allen", "Kingsford", "Easton", "Marlow", "Fairhaven", "Greystone", "Lindell", "Ashby", "Corwen", "Brightwater"],
        [41, 38, 36, 34, 33, 31, 29, 27, 26, 24, 21],
        defect ? PARTY_COLOURS : [BLUE],
        50,
        " min",
      ),
    ),
};

/** Ten product lines with crossing weekly values, for the tangle and for small multiples. */
function productSeries(): Series[] {
  const names = ["Basic", "Plus", "Pro", "Teams", "Edu", "Nonprofit", "Starter", "Studio", "Agency", "Enterprise"];
  const colours = ["#3366cc", "#e08a1e", "#2a9d8f", "#c0392b", "#8e44ad", "#16a085", "#d35400", "#2c3e50", "#7f8c8d", "#e84393"];
  const result: Series[] = [];
  for (let line = 0; line < names.length; line++) {
    const values: number[] = [];
    for (let week = 0; week < 12; week++) {
      const wave = Math.sin(week * 0.8 + line * 1.7) * 18;
      values.push(Math.round(50 + wave + (noise(line, week) - 0.5) * 20));
    }
    result.push({ name: names[line], colour: colours[line], values });
  }
  return result;
}

const tangleProducts: PrescreenPair = {
  candidate: "tangled-overlaid-lines",
  name: "tangle-products",
  html: (defect) => {
    const allSeries = productSeries();
    const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];
    let chart = "";
    if (defect) {
      chart = lineChart({ width: 940, height: 540, labels: weeks, series: allSeries, axisMin: 0, axisMax: 100, tickStep: 20, heavyGrid: false, junk: false, lineWidth: 2.5, valueSuffix: "" });
    } else {
      let panels = "";
      for (const series of allSeries) {
        panels += `<div><div style="font-size:12px;font-weight:700;margin-bottom:2px">${series.name}</div>${lineChart({ width: 180, height: 220, labels: ["", "", "", "", "", "", "", "", "", "", "", ""], series: [{ ...series, name: "" }], axisMin: 0, axisMax: 100, tickStep: 50, heavyGrid: false, junk: false, lineWidth: 2, valueSuffix: "" })}</div>`;
      }
      chart = `<div style="display:grid;grid-template-columns:repeat(5,180px);gap:8px 6px">${panels}</div>`;
    }
    return dashboard(
      "Storefront",
      "Products",
      ["Products", "Orders", "Customers", "Discounts", "Settings"],
      `<div class="card"><h2>Weekly sales by plan</h2><div class="sub">Units sold, last 12 weeks</div>${chart}</div>`,
    );
  },
};

/** Eight countries' yearly values that cross each other. */
function countrySeries(count: number): Series[] {
  const names = ["France", "Spain", "Italy", "Poland", "Sweden", "Greece", "Ireland", "Austria"];
  const colours = ["#3366cc", "#e08a1e", "#2a9d8f", "#c0392b", "#8e44ad", "#16a085", "#d35400", "#7f8c8d"];
  const result: Series[] = [];
  for (let line = 0; line < count; line++) {
    const values: number[] = [];
    for (let year = 0; year < 11; year++) {
      const wave = Math.sin(year * 0.9 + line * 2.1) * 2.2;
      values.push(Math.round((6 + wave + (noise(line + 20, year) - 0.5) * 2) * 10) / 10);
    }
    result.push({ name: names[line], colour: colours[line], values });
  }
  return result;
}

const tangleCountries: PrescreenPair = {
  candidate: "tangled-overlaid-lines",
  name: "tangle-countries",
  html: (defect) =>
    report(
      "European Economy Notes",
      "Unemployment rates moved in different directions",
      "Unemployment rate by country, 2015 to 2025, from the national statistics offices.",
      lineChart({
        width: 900,
        height: 500,
        labels: ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
        series: countrySeries(defect ? 8 : 2),
        axisMin: 0,
        axisMax: 12,
        tickStep: 2,
        heavyGrid: false,
        junk: false,
        lineWidth: 2.5,
        valueSuffix: "%",
      }),
    ),
};

const truncatedConversion: PrescreenPair = {
  candidate: "bar-axis-not-at-zero",
  name: "axis-conversion",
  html: (defect) =>
    dashboard(
      "Checkoutly",
      "Conversion",
      ["Conversion", "Funnels", "Experiments", "Payments", "Settings"],
      `<div class="card"><h2>Checkout completion rate by payment method</h2><div class="sub">Last 30 days</div>
${barChart({ ...barDefaults(), labels: ["Card", "PayPal", "Apple Pay", "Google Pay", "Bank transfer", "Gift card"], values: [91, 93, 96, 95, 88, 90], axisMin: defect ? 85 : 0, axisMax: 100, tickStep: defect ? 5 : 20, valueSuffix: "%", height: 520 })}</div>`,
    ),
};

const truncatedScores: PrescreenPair = {
  candidate: "bar-axis-not-at-zero",
  name: "axis-satisfaction",
  html: (defect) =>
    report(
      "Patient Experience Survey",
      "Satisfaction scores were close across the five hospitals",
      "Average patient satisfaction score out of 100, from the 2025 survey of 12,000 patients.",
      barChart({
        ...barDefaults(),
        width: 900,
        height: 500,
        labels: ["St Anne's", "Riverside", "Northgate", "Hillcrest", "Bayview"],
        values: [78, 81, 76, 83, 79],
        axisMin: defect ? 70 : 0,
        axisMax: 90,
        tickStep: defect ? 5 : 10,
        valueSuffix: "",
      }),
    ),
};

/**
 * One KPI tile. On the defect side it holds only a short title and the bare number. On the clean
 * side the number carries its unit, and the tile names the period and a change against before.
 */
function kpiTile(title: string, bareNumber: string, unitNumber: string, period: string, change: string, rising: boolean, defect: boolean): string {
  if (defect) {
    return `<div class="card" style="flex:1"><div style="font-size:13px;color:${AXIS_TEXT};margin-bottom:10px">${title}</div><div style="font-size:40px;font-weight:700">${bareNumber}</div></div>`;
  }
  const colour = rising ? "#1a7f37" : "#cf222e";
  const arrow = rising ? "▲" : "▼";
  return `<div class="card" style="flex:1"><div style="font-size:13px;color:${AXIS_TEXT};margin-bottom:10px">${title} · ${period}</div><div style="font-size:40px;font-weight:700">${unitNumber}</div><div style="font-size:13px;margin-top:8px"><span style="color:${colour};font-weight:700">${arrow} ${change}</span> <span style="color:${AXIS_TEXT}">vs previous period</span></div></div>`;
}

const kpiRow: PrescreenPair = {
  candidate: "bare-kpi-number",
  name: "kpi-row",
  html: (defect) =>
    dashboard(
      "Ledgerly",
      "Overview",
      SAAS_LINKS,
      `<div style="display:flex;gap:16px;margin-bottom:16px">
${kpiTile("Revenue", "1,284,000", "$1,284,000", "Last 30 days", "8.2%", true, defect)}
${kpiTile("Customers", "3,412", "3,412", "Last 30 days", "3.1%", true, defect)}
${kpiTile("Churn", "2.4", "2.4%", "Last 30 days", "0.3 pts", false, defect)}
</div>
<div class="card"><h2>Recent invoices</h2><div class="sub">Newest first</div>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr style="color:${AXIS_TEXT};text-align:left"><th style="padding:10px 0;font-weight:400">Customer</th><th style="font-weight:400">Plan</th><th style="font-weight:400">Status</th><th style="font-weight:400;text-align:right">Amount</th></tr>
<tr style="border-top:1px solid #eef0f2"><td style="padding:12px 0">Northwind Traders</td><td>Pro</td><td>Paid</td><td style="text-align:right">$4,800</td></tr>
<tr style="border-top:1px solid #eef0f2"><td style="padding:12px 0">Bluebird Studio</td><td>Teams</td><td>Paid</td><td style="text-align:right">$1,250</td></tr>
<tr style="border-top:1px solid #eef0f2"><td style="padding:12px 0">Copper &amp; Co</td><td>Plus</td><td>Overdue</td><td style="text-align:right">$640</td></tr>
<tr style="border-top:1px solid #eef0f2"><td style="padding:12px 0">Greenleaf Farms</td><td>Pro</td><td>Paid</td><td style="text-align:right">$4,800</td></tr>
<tr style="border-top:1px solid #eef0f2"><td style="padding:12px 0">Harbor Analytics</td><td>Enterprise</td><td>Sent</td><td style="text-align:right">$18,000</td></tr>
</table></div>`,
    ),
};

const kpiHero: PrescreenPair = {
  candidate: "bare-kpi-number",
  name: "kpi-hero",
  html: (defect) => {
    let hero = `<div style="font-size:96px;font-weight:700;letter-spacing:-2px">48,210</div>`;
    if (!defect) {
      hero = `<div style="font-size:15px;color:${AXIS_TEXT};margin-bottom:6px">Unique visitors · September 2025</div><div style="font-size:96px;font-weight:700;letter-spacing:-2px">48,210 visitors</div><div style="font-size:16px;margin-top:6px"><span style="color:#1a7f37;font-weight:700">▲ 12.4%</span> <span style="color:${AXIS_TEXT}">vs August (42,890)</span></div>`;
    }
    return dashboard(
      "Beacon",
      "Traffic",
      ["Traffic", "Pages", "Referrers", "Goals", "Settings"],
      `<div class="card" style="padding:48px 40px;margin-bottom:16px">${hero}</div>
<div style="display:flex;gap:16px">
<div class="card" style="flex:1"><h2>Top pages</h2><div class="sub">By views</div><div style="font-size:14px;line-height:2.1">/pricing<br>/blog/launch-notes<br>/docs/getting-started<br>/about</div></div>
<div class="card" style="flex:1"><h2>Top referrers</h2><div class="sub">By visits</div><div style="font-size:14px;line-height:2.1">google.com<br>news.ycombinator.com<br>newsletter<br>linkedin.com</div></div>
</div>`,
    );
  },
};

/** Every pair, two per candidate, in the order of questions.json. */
export const PRESCREEN_PAIRS: PrescreenPair[] = [
  heavyGridDashboard,
  heavyGridReport,
  junkSavings,
  junkWeather,
  threeDBars,
  threeDPie,
  pieBudget,
  donutTraffic,
  rainbowHeatmap,
  rainbowTileMap,
  redGreenLines,
  redGreenBars,
  colourfulBars,
  colourfulHorizontal,
  tangleProducts,
  tangleCountries,
  truncatedConversion,
  truncatedScores,
  kpiRow,
  kpiHero,
];
