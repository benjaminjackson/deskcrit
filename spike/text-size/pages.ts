// The five throwaway page pairs for the crit-cy8.37 text-size spike. Each page is written once as
// a function of the body text size, so the defect side and the clean side differ only in the size
// of the paragraph text. The menu links and button labels keep the same size on both sides.
// Disposable spike code: these pages are not fixtures and never go under packs/.

/** One page of the spike: its name, the clean body size, the fixed control size, and its HTML. */
export type SpikePage = {
  name: string;
  cleanBodyPx: number;
  controlPx: number;
  html: (bodyPx: number, fontsFolderUrl: string) => string;
};

/** The body text size on every defect side. */
export const DEFECT_BODY_PX = 11;

/** The shared head: the Inter font from the packs renderer, and the page-wide reset. */
function head(fontsFolderUrl: string, extraCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 400; src: url("${fontsFolderUrl}inter-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Inter"; font-weight: 700; src: url("${fontsFolderUrl}inter-latin-700-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Source Serif 4"; font-weight: 400; src: url("${fontsFolderUrl}source-serif-4-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Source Serif 4"; font-weight: 700; src: url("${fontsFolderUrl}source-serif-4-latin-700-normal.woff2") format("woff2"); font-display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1280px; height: 800px; overflow: hidden; }
body { font-family: "Inter"; color: #1f2328; background: #ffffff; }
a { color: inherit; text-decoration: none; }
.button { display: inline-block; border-radius: 6px; padding: 10px 18px; font-weight: 700; }
${extraCss}
</style></head><body>`;
}

/** A top bar with a logo, menu links, and one button, all at the fixed control size. */
function topBar(
  logo: string,
  links: string[],
  buttonLabel: string,
  controlPx: number,
  colours: { bar: string; text: string; button: string; buttonText: string },
): string {
  const linkHtml = links
    .map((link) => `<a style="margin-right:28px">${link}</a>`)
    .join("");
  return `<header style="display:flex;align-items:center;height:72px;padding:0 48px;background:${colours.bar};color:${colours.text};font-size:${controlPx}px">
<strong style="font-size:20px;margin-right:56px">${logo}</strong>
<nav style="flex:1">${linkHtml}</nav>
<a class="button" style="background:${colours.button};color:${colours.buttonText};font-size:${controlPx}px">${buttonLabel}</a>
</header>`;
}

const blogPage: SpikePage = {
  name: "blog",
  cleanBodyPx: 18,
  controlPx: 15,
  html: (bodyPx, fonts) =>
    `${head(fonts, `#reading p { font-family: "Source Serif 4"; line-height: 1.6; margin-bottom: 1em; }`)}
${topBar("Fieldnotes", ["Essays", "Interviews", "Archive", "About"], "Subscribe", 15, { bar: "#ffffff", text: "#1f2328", button: "#1f2328", buttonText: "#ffffff" })}
<main style="width:680px;margin:40px auto 0">
<p style="font-size:14px;color:#6a737d;margin-bottom:12px">March 12 · 8 minute read</p>
<h1 style="font-family:'Source Serif 4';font-size:40px;line-height:1.15;margin-bottom:24px">What the river taught us about building slowly</h1>
<div id="reading" style="font-size:${bodyPx}px">
<p>For three summers we walked the same stretch of the Wye, from the old toll bridge to the bend below the quarry. We went to count otters, and mostly we failed. What we learned instead was how a place changes when you stop asking it to perform for you.</p>
<p>The first year we brought too much equipment. Cameras on poles, a thermal scope borrowed from a friend, notebooks with columns ruled in advance. By August the columns were empty and the notebooks were full of other things: the time the swifts left, the smell of the bank after rain, a heron that took the same rock every evening at six.</p>
<p>It would be easy to say the otters were never there. They were. We found their spraint on the flat stones and their slides in the mud. They simply kept a different schedule from ours, and the river was in no hurry to introduce us.</p>
</div>
<a class="button" style="background:#1f2328;color:#fff;font-size:15px;margin-top:8px">Read the next essay</a>
</main></body></html>`,
};

const landingPage: SpikePage = {
  name: "landing",
  cleanBodyPx: 17,
  controlPx: 16,
  html: (bodyPx, fonts) =>
    `${head(fonts, `#reading p { line-height: 1.55; margin-bottom: 1em; color: #3d4450; }`)}
${topBar("Ledgerly", ["Product", "Pricing", "Customers", "Docs"], "Start free trial", 16, { bar: "#0f172a", text: "#e2e8f0", button: "#6366f1", buttonText: "#ffffff" })}
<main style="display:flex;gap:64px;padding:72px 96px 0">
<section style="flex:1">
<p style="font-size:14px;font-weight:700;color:#6366f1;letter-spacing:0.04em;margin-bottom:16px">INVOICING FOR SMALL TEAMS</p>
<h1 style="font-size:48px;line-height:1.1;margin-bottom:24px">Get paid on time without chasing anyone</h1>
<div id="reading" style="font-size:${bodyPx}px">
<p>Ledgerly sends your invoices, follows up when they are late, and matches every payment to the right client. You set the rules once, and it handles the reminders, the receipts, and the polite second email that nobody likes writing.</p>
<p>Connect your bank in a few minutes and see which clients pay early, which pay late, and how much is still out there. Most teams cut their overdue balance in half within the first quarter.</p>
</div>
<div style="margin-top:12px"><a class="button" style="background:#6366f1;color:#fff;font-size:16px;margin-right:12px">Start free trial</a><a class="button" style="border:1px solid #cbd5e1;font-size:16px">Book a demo</a></div>
</section>
<aside style="width:460px;height:420px;border-radius:12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);padding:28px">
<div style="background:#fff;border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(15,23,42,0.08)">
<p style="font-size:14px;color:#64748b;margin-bottom:6px">Outstanding this month</p>
<p style="font-size:32px;font-weight:700;margin-bottom:18px">$18,240</p>
<div style="height:10px;border-radius:5px;background:#e2e8f0"><div style="width:62%;height:10px;border-radius:5px;background:#6366f1"></div></div>
<p style="font-size:14px;color:#64748b;margin-top:10px">62% collected · 9 invoices overdue</p>
</div>
</aside>
</main></body></html>`,
};

const docsPage: SpikePage = {
  name: "docs",
  cleanBodyPx: 16,
  controlPx: 15,
  html: (bodyPx, fonts) =>
    `${head(fonts, `#reading p { line-height: 1.6; margin-bottom: 1em; } code { font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }`)}
${topBar("Harbor CLI", ["Guides", "Reference", "Changelog", "Community"], "Install", 15, { bar: "#ffffff", text: "#111827", button: "#047857", buttonText: "#ffffff" })}
<div style="display:flex;border-top:1px solid #e5e7eb;height:728px">
<nav style="width:260px;padding:28px 32px;border-right:1px solid #e5e7eb;font-size:15px;line-height:2.2">
<p style="font-weight:700">Getting started</p><p>Installation</p><p style="color:#047857;font-weight:700">Configuration</p><p>First deploy</p>
<p style="font-weight:700;margin-top:12px">Concepts</p><p>Environments</p><p>Secrets</p><p>Rollbacks</p>
</nav>
<main style="flex:1;padding:36px 64px;max-width:860px">
<h1 style="font-size:34px;margin-bottom:20px">Configuration</h1>
<div id="reading" style="font-size:${bodyPx}px">
<p>Harbor reads its settings from <code>harbor.toml</code> in the root of your project. When the file is missing, the CLI falls back to safe defaults and prints a warning so you know which values it chose.</p>
<p>Each environment gets its own table. Values in an environment table override the top-level values, so you can keep shared settings in one place and change only what differs between staging and production.</p>
<p>Secrets never go in this file. Use <code>harbor secrets set</code> instead, which stores them encrypted on the server and injects them at deploy time.</p>
</div>
<a class="button" style="background:#047857;color:#fff;font-size:15px;margin-top:8px">Next: First deploy</a>
</main></div></body></html>`,
};

const productPage: SpikePage = {
  name: "product",
  cleanBodyPx: 17,
  controlPx: 16,
  html: (bodyPx, fonts) =>
    `${head(fonts, `#reading p { line-height: 1.55; margin-bottom: 0.9em; color: #374151; }`)}
${topBar("Oakline", ["Chairs", "Tables", "Lighting", "Journal"], "Cart (2)", 16, { bar: "#faf7f2", text: "#2b2118", button: "#2b2118", buttonText: "#faf7f2" })}
<main style="display:flex;gap:56px;padding:48px 80px 0">
<div style="width:540px;height:600px;border-radius:8px;background:linear-gradient(160deg,#d9c7ad,#a68a64)"></div>
<section style="flex:1;padding-top:12px">
<p style="font-size:14px;color:#8a7a66;margin-bottom:10px">Chairs / Dining</p>
<h1 style="font-size:38px;margin-bottom:12px">Halden dining chair</h1>
<p style="font-size:24px;font-weight:700;margin-bottom:24px">$340</p>
<div id="reading" style="font-size:${bodyPx}px">
<p>Steam-bent white oak, shaped by hand in our workshop in Vermont. The back curves to meet your shoulders, and the seat is carved a little deeper at the rear so you sit into the chair rather than on it.</p>
<p>Finished with a hard wax oil that you can refresh at home. Each chair ships fully assembled and arrives within three weeks.</p>
</div>
<div style="margin-top:16px"><a class="button" style="background:#2b2118;color:#faf7f2;font-size:16px;margin-right:12px">Add to cart</a><a class="button" style="border:1px solid #2b2118;font-size:16px">Order a wood sample</a></div>
</section>
</main></body></html>`,
};

const aboutPage: SpikePage = {
  name: "about",
  cleanBodyPx: 18,
  controlPx: 16,
  html: (bodyPx, fonts) =>
    `${head(fonts, `#reading p { line-height: 1.6; margin-bottom: 1em; color: #33302b; }`)}
${topBar("Northgate Clinic", ["Services", "Our team", "Locations", "Contact"], "Book an appointment", 16, { bar: "#ffffff", text: "#1e3a5f", button: "#1e3a5f", buttonText: "#ffffff" })}
<section style="background:#eef4f9;padding:56px 0 48px"><div style="width:880px;margin:0 auto">
<h1 style="font-size:42px;color:#1e3a5f;margin-bottom:8px">About Northgate</h1>
<p style="font-size:18px;color:#4b6584">Family medicine in the same neighbourhood since 1987.</p>
</div></section>
<main style="width:880px;margin:36px auto 0">
<div id="reading" style="font-size:${bodyPx}px">
<p>Northgate started as two doctors in a converted house on Elm Street. Today we are a team of fourteen clinicians, but we still keep the same promise: you see someone who knows your history, and you are never just a number on a screen.</p>
<p>We offer same-day appointments for urgent problems, evening hours twice a week, and home visits for patients who cannot travel. If you are new to the area, you can register online and we will call you within two working days.</p>
</div>
<div style="margin-top:8px"><a class="button" style="background:#1e3a5f;color:#fff;font-size:16px;margin-right:12px">Register as a new patient</a><a class="button" style="border:1px solid #1e3a5f;color:#1e3a5f;font-size:16px">Meet the team</a></div>
</main></body></html>`,
};

/** Every page of the spike, in a fixed order. */
export const SPIKE_PAGES: SpikePage[] = [
  blogPage,
  landingPage,
  docsPage,
  productPage,
  aboutPage,
];
