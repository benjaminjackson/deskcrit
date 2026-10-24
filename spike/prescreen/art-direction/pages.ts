// The throwaway page pairs for the art-direction pre-screen spike (crit-q25.17). Each page is one
// function of a boolean: true draws the defect, false draws the clean page. Only the defect
// differs between the two sides of a pair. Photos are named as "photo:<name>" or
// "photo-small:<name>"; run.ts swaps those names for data URLs of the files in photos/.
// Disposable spike code: these pages are not fixtures and never go under packs/.

/** One pair of the spike: the candidate it tests, its name, and its HTML for each side. */
export type SpikePair = {
  candidate: string;
  name: string;
  html: (defect: boolean) => string;
};

/** The shared head: the Inter font from the packs renderer, and the page-wide reset. */
function head(extraCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 400; src: url("inter-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Inter"; font-weight: 700; src: url("inter-latin-700-normal.woff2") format("woff2"); font-display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1280px; height: 800px; overflow: hidden; }
body { font-family: "Inter"; color: #1f2328; background: #ffffff; }
a { color: inherit; text-decoration: none; }
.button { display: inline-block; border-radius: 6px; padding: 12px 20px; font-weight: 700; font-size: 15px; }
${extraCss}
</style></head><body>`;
}

/** A top bar with a logo, menu links, and one button. */
function topBar(logo: string, links: string[], buttonLabel: string): string {
  const linkHtml = links
    .map((link) => `<a style="margin-right:28px">${link}</a>`)
    .join("");
  return `<header style="display:flex;align-items:center;height:72px;padding:0 48px;font-size:15px;border-bottom:1px solid #eaeef2;background:#fff">
<strong style="font-size:20px;margin-right:56px">${logo}</strong>
<nav style="flex:1">${linkHtml}</nav>
<a class="button" style="background:#1f2328;color:#fff">${buttonLabel}</a>
</header>`;
}

/** A card with a picture on top, a title, and one line of text. */
function card(picture: string, title: string, text: string): string {
  return `<div style="flex:1;border:1px solid #eaeef2;border-radius:10px;overflow:hidden;background:#fff">
<div style="height:250px;overflow:hidden">${picture}</div>
<div style="padding:18px 20px"><h3 style="font-size:19px;margin-bottom:6px">${title}</h3><p style="font-size:15px;color:#57606a;line-height:1.5">${text}</p></div>
</div>`;
}

/** A photo that fills its box, with an optional CSS filter. */
function photo(name: string, filter: string): string {
  return `<img src="photo:${name}" style="width:100%;height:100%;object-fit:cover;display:block;filter:${filter}">`;
}

/** A flat vector illustration: solid colours, no gradients, no shading. */
function flatIllustration(kind: "hills" | "plant" | "laptop"): string {
  if (kind === "hills") {
    return `<svg viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="400" height="250" fill="#ffe8cc"/><circle cx="300" cy="80" r="36" fill="#ff9f43"/><path d="M0 200 L110 90 L220 200 Z" fill="#2e86de"/><path d="M140 200 L260 110 L400 200 Z" fill="#54a0ff"/><rect y="200" width="400" height="50" fill="#10ac84"/></svg>`;
  }
  if (kind === "plant") {
    return `<svg viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="400" height="250" fill="#e3f6f0"/><rect x="170" y="160" width="60" height="60" rx="6" fill="#ee5253"/><path d="M200 160 C200 120 160 100 140 90 C160 130 180 140 200 160 Z" fill="#10ac84"/><path d="M200 160 C200 110 240 90 265 80 C245 125 220 140 200 160 Z" fill="#1dd1a1"/><path d="M200 160 L200 70" stroke="#10ac84" stroke-width="6"/><rect y="220" width="400" height="30" fill="#c8d6e5"/></svg>`;
  }
  return `<svg viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="400" height="250" fill="#eef1ff"/><rect x="110" y="60" width="180" height="115" rx="8" fill="#341f97"/><rect x="122" y="72" width="156" height="91" fill="#48dbfb"/><rect x="140" y="90" width="70" height="10" fill="#fff"/><rect x="140" y="110" width="110" height="10" fill="#c8f7ff"/><rect x="85" y="175" width="230" height="16" rx="4" fill="#5f27cd"/></svg>`;
}

/** A glossy 3D-style render: shaded objects with highlights and soft shadows. */
function glossyRender(kind: "spheres" | "cube"): string {
  const defs = `<defs><radialGradient id="ball" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="0.15" stop-color="#ffb3d1"/><stop offset="0.6" stop-color="#e0337a"/><stop offset="1" stop-color="#5c0b30"/></radialGradient><radialGradient id="ball2" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="0.15" stop-color="#b3e0ff"/><stop offset="0.6" stop-color="#2a7de1"/><stop offset="1" stop-color="#0b2a5c"/></radialGradient><radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e9ff"/><stop offset="1" stop-color="#c9b6e8"/></linearGradient><linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c7"/><stop offset="1" stop-color="#ffcf3a"/></linearGradient><linearGradient id="left" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb21f"/><stop offset="1" stop-color="#c97700"/></linearGradient><linearGradient id="right" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e08e00"/><stop offset="1" stop-color="#8a4f00"/></linearGradient></defs>`;
  if (kind === "spheres") {
    return `<svg viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">${defs}<rect width="400" height="250" fill="url(#floor)"/><ellipse cx="160" cy="205" rx="70" ry="14" fill="url(#shadow)"/><ellipse cx="262" cy="200" rx="48" ry="10" fill="url(#shadow)"/><circle cx="160" cy="135" r="68" fill="url(#ball)"/><circle cx="262" cy="155" r="45" fill="url(#ball2)"/><ellipse cx="135" cy="105" rx="18" ry="10" fill="#fff" opacity="0.7"/></svg>`;
  }
  return `<svg viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">${defs}<rect width="400" height="250" fill="url(#floor)"/><ellipse cx="200" cy="210" rx="110" ry="16" fill="url(#shadow)"/><path d="M200 50 L290 95 L200 140 L110 95 Z" fill="url(#top)"/><path d="M110 95 L200 140 L200 220 L110 175 Z" fill="url(#left)"/><path d="M290 95 L200 140 L200 220 L290 175 Z" fill="url(#right)"/><path d="M200 58 L270 95 L200 70 Z" fill="#fff" opacity="0.6"/></svg>`;
}

/** Pair A for inconsistent grading: a travel blog with three recent trips. */
const tripsGrading: SpikePair = {
  candidate: "photos-graded-inconsistently",
  name: "trips",
  html: (defect) => {
    const filters = defect
      ? ["sepia(0.6) saturate(0.8) brightness(1.08) contrast(0.9)", "grayscale(1) contrast(1.1)", "saturate(1.9) contrast(1.2)"]
      : ["none", "none", "none"];
    return `${head("")}
${topBar("Wayfarer", ["Destinations", "Guides", "Gear", "About"], "Subscribe")}
<main style="padding:48px 48px 0">
<h1 style="font-size:36px;margin-bottom:8px">Recent trips</h1>
<p style="font-size:17px;color:#57606a;margin-bottom:32px">Three walks from this autumn, with maps and notes on where to stay.</p>
<div style="display:flex;gap:28px">
${card(photo("lake-mountain", filters[0] as string), "Trillium Lake loop", "An easy two-hour walk with the mountain in view the whole way.")}
${card(photo("forest-steps", filters[1] as string), "The old forest stair", "Stone steps through tall pines, steep in places but well kept.")}
${card(photo("mountain-reflection", filters[2] as string), "Glacier lake at dawn", "Start before sunrise for still water and clear reflections.")}
</div></main></body></html>`;
  },
};

/** Pair B for inconsistent grading: a café menu with three dish photos. */
const cafeGrading: SpikePair = {
  candidate: "photos-graded-inconsistently",
  name: "cafe",
  html: (defect) => {
    const filters = defect
      ? ["saturate(1.9) contrast(1.15)", "sepia(0.65) brightness(1.05) contrast(0.9)", "grayscale(1)"]
      : ["none", "none", "none"];
    return `${head("")}
${topBar("Morning Table", ["Menu", "Catering", "Visit", "Gift cards"], "Order online")}
<main style="padding:48px 48px 0">
<h1 style="font-size:36px;margin-bottom:8px">Breakfast favourites</h1>
<p style="font-size:17px;color:#57606a;margin-bottom:32px">Served every day from 7 until 11, made with fruit from the market.</p>
<div style="display:flex;gap:28px">
${card(photo("berries", filters[0] as string), "Berry plate", "Raspberries, blueberries, and mango with honey yoghurt. $9")}
${card(photo("coffee-cookies", filters[1] as string), "Coffee and cookies", "House filter coffee with two chocolate chip cookies. $6")}
${card(photo("fruit-table", filters[2] as string), "Garden fruit bowl", "Seasonal fruit served on the terrace when the sun is out. $8")}
</div></main></body></html>`;
  },
};

/** Pair A for mixed rendering styles: a studio's services row. */
const servicesStyles: SpikePair = {
  candidate: "mixed-rendering-styles",
  name: "services",
  html: (defect) => {
    const pictures = defect
      ? [photo("forest-path", "none"), flatIllustration("plant"), glossyRender("spheres")]
      : [flatIllustration("hills"), flatIllustration("plant"), flatIllustration("laptop")];
    return `${head("")}
${topBar("Greenline Studio", ["Work", "Services", "Team", "Contact"], "Start a project")}
<main style="padding:48px 48px 0">
<h1 style="font-size:36px;margin-bottom:8px">What we do</h1>
<p style="font-size:17px;color:#57606a;margin-bottom:32px">We help small teams plan, build, and grow their websites.</p>
<div style="display:flex;gap:28px">
${card(pictures[0] as string, "Strategy", "We start with your goals and the people you want to reach.")}
${card(pictures[1] as string, "Growth", "Steady improvements, measured every month, that add up.")}
${card(pictures[2] as string, "Build", "Fast, accessible sites that your team can edit themselves.")}
</div></main></body></html>`;
  },
};

/** Pair B for mixed rendering styles: an outdoor app's feature row. */
const appStyles: SpikePair = {
  candidate: "mixed-rendering-styles",
  name: "outdoor-app",
  html: (defect) => {
    const pictures = defect
      ? [photo("lake-mountain", "none"), flatIllustration("hills"), glossyRender("cube")]
      : [photo("lake-mountain", "none"), photo("forest-path", "none"), photo("mountain-reflection", "none")];
    return `${head("")}
${topBar("Trailmark", ["Features", "Pricing", "Maps", "Help"], "Get the app")}
<main style="padding:48px 48px 0">
<h1 style="font-size:36px;margin-bottom:8px">Everything you need on the trail</h1>
<p style="font-size:17px;color:#57606a;margin-bottom:32px">Plan routes, save them offline, and share your progress with friends.</p>
<div style="display:flex;gap:28px">
${card(pictures[0] as string, "Plan your route", "Draw a route on the map and see the climb before you go.")}
${card(pictures[1] as string, "Offline maps", "Download a region and navigate with no signal at all.")}
${card(pictures[2] as string, "Track progress", "See distance, time, and elevation as you walk.")}
</div></main></body></html>`;
  },
};

/** Pair A for a stretched image: an article with a wide header photo. */
const articleStretched: SpikePair = {
  candidate: "image-stretched-or-pixelated",
  name: "article",
  html: (defect) => {
    const fit = defect ? "fill" : "cover";
    return `${head("")}
${topBar("Fieldnotes", ["Essays", "Interviews", "Archive", "About"], "Subscribe")}
<main style="padding:32px 48px 0">
<img src="photo:mountain-reflection" style="width:1184px;height:400px;object-fit:${fit};display:block;border-radius:8px;margin-bottom:28px">
<div style="width:760px">
<p style="font-size:14px;color:#6a737d;margin-bottom:10px">Travel · 6 minute read</p>
<h1 style="font-size:38px;line-height:1.15;margin-bottom:16px">Four days around the glacier lakes</h1>
<p style="font-size:18px;line-height:1.6;color:#444c56">We walked from hut to hut with light packs and no fixed plan, and found the quietest water at the end of each day.</p>
</div></main></body></html>`;
  },
};

/** Pair B for a pixelated image: a recipe page whose main photo is a small copy enlarged. */
const recipePixelated: SpikePair = {
  candidate: "image-stretched-or-pixelated",
  name: "recipe",
  html: (defect) => {
    const source = defect ? "photo-small:berries" : "photo:berries";
    return `${head("")}
${topBar("Home Kitchen", ["Recipes", "Seasonal", "Techniques", "About"], "Sign up")}
<main style="display:flex;gap:48px;padding:48px 48px 0">
<img src="${source}" style="width:620px;height:420px;object-fit:cover;display:block;border-radius:10px">
<div style="flex:1;padding-top:12px">
<p style="font-size:14px;color:#6a737d;margin-bottom:10px">Breakfast · 10 minutes</p>
<h1 style="font-size:38px;line-height:1.15;margin-bottom:18px">Summer berry plate with honey yoghurt</h1>
<p style="font-size:18px;line-height:1.6;color:#444c56;margin-bottom:24px">A quick, bright breakfast that needs no cooking. Use whatever berries look best at the market this week.</p>
<a class="button" style="background:#c0392b;color:#fff">Jump to recipe</a>
</div></main></body></html>`;
  },
};

/** A full-width hero with a photo behind a headline, for the flat value structure pairs. */
function heroPage(
  logo: string,
  photoName: string,
  heading: string,
  text: string,
  defect: boolean,
): string {
  const filter = defect ? "contrast(0.45) brightness(1.15) saturate(0.7)" : "none";
  const overlay = defect
    ? "rgba(0,0,0,0)"
    : "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 65%)";
  return `${head("")}
${topBar(logo, ["Explore", "Stays", "Journal", "About"], "Book now")}
<section style="position:relative;height:728px;overflow:hidden">
<img src="photo:${photoName}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:${filter}">
<div style="position:absolute;inset:0;background:${overlay}"></div>
<div style="position:absolute;left:72px;top:220px;width:560px;color:#fff">
<h1 style="font-size:56px;line-height:1.08;margin-bottom:20px">${heading}</h1>
<p style="font-size:20px;line-height:1.5;margin-bottom:28px">${text}</p>
<a class="button" style="background:#fff;color:#1f2328">See the routes</a>
</div></section></body></html>`;
}

/** Pair A for a flat value structure: a lodge hero over a mountain lake. */
const lodgeHero: SpikePair = {
  candidate: "flat-value-structure",
  name: "lodge",
  html: (defect) =>
    heroPage("Alpine Lodge", "mountain-reflection", "Wake up beside the water", "Quiet rooms, early breakfasts, and trails that start at the front door.", defect),
};

/** Pair B for a flat value structure: a hiking club hero over a forest stair. */
const clubHero: SpikePair = {
  candidate: "flat-value-structure",
  name: "hiking-club",
  html: (defect) =>
    heroPage("Pinewood Walkers", "forest-steps", "Walk with us this autumn", "Weekly guided walks for every pace, from short loops to full-day climbs.", defect),
};

/** A simple outline icon, drawn with one stroke colour and no fill. */
function outlineIcon(kind: string): string {
  const paths: Record<string, string> = {
    shield: `<path d="M24 5 L39 11 V23 C39 33 32 40 24 43 C16 40 9 33 9 23 V11 Z"/>`,
    bolt: `<path d="M27 4 L11 27 H23 L20 44 L37 20 H25 Z"/>`,
    cloud: `<path d="M14 36 H35 A8 8 0 0 0 35 20 A11 11 0 0 0 14 22 A7 7 0 0 0 14 36 Z"/>`,
    chart: `<path d="M8 40 H40 M14 34 V24 M22 34 V14 M30 34 V20 M38 34 V10"/>`,
    lock: `<rect x="11" y="21" width="26" height="20" rx="3"/><path d="M16 21 V15 A8 8 0 0 1 32 15 V21"/>`,
    chat: `<path d="M8 10 H40 V32 H22 L13 40 V32 H8 Z"/>`,
  };
  return `<svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="#1f2328" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${paths[kind]}</svg>`;
}

/** A detailed icon of the same subject: several colours, gradients, highlights, and a shadow. */
function detailedIcon(kind: string): string {
  const defs = `<defs><linearGradient id="g-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd3ff"/><stop offset="1" stop-color="#1b5fbf"/></linearGradient><linearGradient id="h-${kind}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f08a00"/></linearGradient></defs>`;
  const bodies: Record<string, string> = {
    shield: `<ellipse cx="24" cy="45" rx="13" ry="2.5" fill="#000" opacity="0.2"/><path d="M24 4 L40 10 V23 C40 33 33 40 24 43 C15 40 8 33 8 23 V10 Z" fill="url(#g-shield)" stroke="#0d3a80" stroke-width="1.5"/><path d="M24 8 L36 13 V23 C36 31 31 36 24 39 Z" fill="#fff" opacity="0.25"/><path d="M17 24 L22 29 L32 18" stroke="url(#h-shield)" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="16" cy="13" r="2" fill="#fff" opacity="0.8"/>`,
    cloud: `<ellipse cx="24" cy="44" rx="15" ry="2.5" fill="#000" opacity="0.2"/><path d="M14 36 H35 A8 8 0 0 0 35 20 A11 11 0 0 0 14 22 A7 7 0 0 0 14 36 Z" fill="url(#g-cloud)" stroke="#0d3a80" stroke-width="1.5"/><path d="M17 24 A8 8 0 0 1 30 18" stroke="#fff" stroke-width="2.5" fill="none" opacity="0.8"/><path d="M20 40 L18 46 M27 40 L25 46 M34 40 L32 46" stroke="#5fb8ff" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="12" r="5" fill="url(#h-cloud)"/>`,
    lock: `<ellipse cx="24" cy="45" rx="13" ry="2.5" fill="#000" opacity="0.2"/><path d="M16 21 V15 A8 8 0 0 1 32 15 V21" stroke="#9aa4b1" stroke-width="4" fill="none"/><path d="M17 20 V15 A7 7 0 0 1 24 8" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.7"/><rect x="10" y="20" width="28" height="22" rx="4" fill="url(#h-lock)" stroke="#9a5500" stroke-width="1.5"/><rect x="12" y="22" width="24" height="5" rx="2" fill="#fff" opacity="0.4"/><circle cx="24" cy="30" r="3.5" fill="#5c3300"/><rect x="22.5" y="31" width="3" height="6" rx="1.5" fill="#5c3300"/>`,
  };
  return `<svg width="56" height="56" viewBox="0 0 48 48">${defs}${bodies[kind]}</svg>`;
}

/** One feature tile: an icon, a title, and one line of text. */
function featureTile(icon: string, title: string, text: string): string {
  return `<div style="padding:24px;border:1px solid #eaeef2;border-radius:10px">${icon}<h3 style="font-size:18px;margin:14px 0 6px">${title}</h3><p style="font-size:15px;color:#57606a;line-height:1.5">${text}</p></div>`;
}

/** Draw the icon set: all outline icons, or with the shield, cloud, and lock in the detailed style. */
function iconFor(kind: string, defect: boolean): string {
  const detailedKinds = ["shield", "cloud", "lock"];
  if (defect && detailedKinds.includes(kind)) {
    return detailedIcon(kind);
  }
  return outlineIcon(kind);
}

/** Pair A for mixed detail: a software product's feature grid. */
const saasIcons: SpikePair = {
  candidate: "mixed-level-of-detail",
  name: "saas-features",
  html: (defect) => `${head("")}
${topBar("Ledgerly", ["Product", "Pricing", "Customers", "Docs"], "Start free trial")}
<main style="padding:48px 48px 0">
<h1 style="font-size:36px;margin-bottom:8px">Built for growing finance teams</h1>
<p style="font-size:17px;color:#57606a;margin-bottom:32px">Everything you need to close the books faster, in one place.</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
${featureTile(iconFor("shield", defect), "Bank-level security", "Every record is encrypted and backed up each hour.")}
${featureTile(iconFor("bolt", defect), "Fast reconciliation", "Match thousands of transactions in a few seconds.")}
${featureTile(iconFor("cloud", defect), "Works anywhere", "Use it in the browser on any computer or tablet.")}
${featureTile(iconFor("chart", defect), "Live reports", "See cash flow and spending as they change.")}
${featureTile(iconFor("lock", defect), "Role permissions", "Choose who can see, edit, and approve each item.")}
${featureTile(iconFor("chat", defect), "Comments", "Ask questions on any line without leaving the page.")}
</div></main></body></html>`,
};

/** Pair B for mixed detail: a help centre with a row of topic icons. */
const helpIcons: SpikePair = {
  candidate: "mixed-level-of-detail",
  name: "help-centre",
  html: (defect) => {
    const topics: Array<[string, string]> = [
      ["shield", "Account safety"],
      ["bolt", "Getting started"],
      ["cloud", "Sync and backup"],
      ["chart", "Usage and billing"],
      ["lock", "Passwords"],
      ["chat", "Contact us"],
    ];
    const tiles = topics
      .map(
        ([kind, label]) =>
          `<div style="text-align:center;padding:28px 12px;border:1px solid #eaeef2;border-radius:10px">${iconFor(kind, defect)}<p style="font-size:16px;font-weight:700;margin-top:12px">${label}</p></div>`,
      )
      .join("");
    return `${head("")}
${topBar("Notably", ["Product", "Pricing", "Help", "Blog"], "Log in")}
<main style="padding:56px 48px 0">
<h1 style="font-size:40px;text-align:center;margin-bottom:12px">How can we help?</h1>
<div style="width:640px;margin:0 auto 44px;border:1px solid #d0d7de;border-radius:8px;padding:14px 18px;font-size:16px;color:#8c959f">Search help articles</div>
<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:18px">${tiles}</div>
<p style="text-align:center;font-size:16px;color:#57606a;margin-top:40px">Still stuck? Our team answers every message within one working day.</p>
</main></body></html>`;
  },
};

/** Pair A for a busy background: a newsletter sign-up panel over a page background. */
const newsletterBusy: SpikePair = {
  candidate: "busy-texture-behind-content",
  name: "newsletter",
  html: (defect) => {
    const background = defect
      ? "repeating-linear-gradient(45deg, #ff6b6b 0 14px, #feca57 14px 28px, #48dbfb 28px 42px, #1dd1a1 42px 56px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.25) 0 6px, rgba(0,0,0,0) 6px 20px)"
      : "#f6f1ea";
    return `${head(`.backdrop { background: ${background}; background-blend-mode: multiply; }`)}
${topBar("Paper Lantern", ["Shop", "Stories", "Workshops", "About"], "Basket")}
<section class="backdrop" style="height:728px;padding:90px 0 0 96px">
<h1 style="font-size:52px;line-height:1.1;width:620px;margin-bottom:20px">Letters from the workshop</h1>
<p style="font-size:20px;line-height:1.5;width:560px;margin-bottom:32px">A short note each month with new prints, behind-the-scenes photos, and first look at the spring workshops.</p>
<div style="display:flex;gap:12px"><div style="width:340px;background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:14px 16px;font-size:16px;color:#8c959f">Your email address</div><a class="button" style="background:#1f2328;color:#fff">Sign up</a></div>
</section></body></html>`;
  },
};

/** Pair B for a busy background: a market stall page with text over a cluttered table photo. */
const marketBusy: SpikePair = {
  candidate: "busy-texture-behind-content",
  name: "market",
  html: (defect) => {
    const filter = defect ? "none" : "blur(14px) brightness(0.55)";
    return `${head("")}
${topBar("Saturday Market", ["Stalls", "Map", "Events", "About"], "Become a trader")}
<section style="position:relative;height:728px;overflow:hidden">
<img src="photo:fruit-table" style="position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:${filter}">
<div style="position:absolute;left:96px;top:170px;width:620px;color:#fff">
<h1 style="font-size:54px;line-height:1.1;margin-bottom:20px">Fresh from local gardens every Saturday</h1>
<p style="font-size:20px;line-height:1.5;margin-bottom:30px">Fruit, flowers, bread, and coffee from more than forty growers and makers, from 8 until 1 in the town square.</p>
<a class="button" style="background:#fff;color:#1f2328">See this week's stalls</a>
</div></section></body></html>`;
  },
};

/** Every pair, in the order of questions.json. */
export const SPIKE_PAIRS: SpikePair[] = [
  tripsGrading,
  cafeGrading,
  servicesStyles,
  appStyles,
  articleStretched,
  recipePixelated,
  lodgeHero,
  clubHero,
  saasIcons,
  helpIcons,
  newsletterBusy,
  marketBusy,
];
