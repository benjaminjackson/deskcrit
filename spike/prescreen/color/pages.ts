// The fourteen throwaway page pairs for the color pack pre-screen (crit-q25.17), two per candidate
// criterion. Each page is written once as a function of `defect`, so the positive and the negative
// of a pair differ only in the defect. Disposable spike code: these pages are not fixtures and
// never go under packs/.

/** One page pair: the candidate it tests, its name, and its HTML with the defect on or off. */
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
body { font-family: "Inter"; color: #1f2328; background: #ffffff; font-size: 16px; line-height: 1.5; }
a { color: inherit; text-decoration: none; }
.button { display: inline-block; border-radius: 6px; padding: 12px 22px; font-weight: 700; }
${extraCss}
</style></head><body>`;
}

/** A plain top bar with a logo, menu links, and one button. */
function topBar(logo: string, links: string[], buttonHtml: string, style = "background:#fff;color:#1f2328;border-bottom:1px solid #e5e7eb"): string {
  const linkHtml = links.map((link) => `<a style="margin-right:28px">${link}</a>`).join("");
  return `<header style="display:flex;align-items:center;height:72px;padding:0 48px;${style}">
<strong style="font-size:20px;margin-right:56px">${logo}</strong>
<nav style="flex:1">${linkHtml}</nav>${buttonHtml}</header>`;
}

/**
 * A deterministic random number generator (mulberry32), so the busy "photo" is the same on both
 * sides of a pair and on every render.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A busy background made of hundreds of small light and dark blobs, standing in for a detailed photo. */
function busyBackground(seed: number, palette: string[]): string {
  const random = seededRandom(seed);
  const layers: string[] = [];
  for (let index = 0; index < 260; index++) {
    const x = Math.round(random() * 100);
    const y = Math.round(random() * 100);
    const size = 10 + Math.round(random() * 40);
    const colour = palette[Math.floor(random() * palette.length)];
    layers.push(`radial-gradient(circle at ${x}% ${y}%, ${colour} 0, ${colour} ${size / 2}px, transparent ${size / 2 + 1}px)`);
  }
  layers.push(`repeating-linear-gradient(35deg, ${palette[0]} 0 6px, ${palette[1]} 6px 14px, ${palette[2]} 14px 19px)`);
  return layers.join(",");
}

const FOLIAGE = ["#1d3b1a", "#f2f5d0", "#6d9b2f", "#0b1a08", "#c9dd7a", "#3f6b21", "#ffffff"];
const CONFETTI = ["#222222", "#ffe14d", "#ffffff", "#e8463a", "#1e88e5", "#f4f4f4", "#111111"];

const textOverBusyHike: SpikePair = {
  candidate: "text-over-busy-image",
  name: "hike-hero",
  html: (defect) => `${head("")}
${topBar("Trailhead", ["Routes", "Guides", "Gear", "Journal"], `<a class="button" style="background:#2f5d1f;color:#fff">Plan a trip</a>`)}
<section style="position:relative;height:560px;background:${busyBackground(7, FOLIAGE)}">
<div style="position:absolute;left:96px;top:120px;width:620px;padding:32px;color:#ffffff;${defect ? "" : "background:rgba(10,20,8,0.82);border-radius:8px"}">
<h1 style="font-size:52px;line-height:1.1;margin-bottom:20px">Walk the ridge before the first snow</h1>
<p style="font-size:19px;margin-bottom:28px">Twelve marked routes through the old beech forest, from a two-hour loop to a three-day crossing with huts.</p>
<a class="button" style="background:#ffffff;color:#1d3b1a">See the routes</a>
</div></section>
<section style="padding:32px 96px;display:flex;gap:48px;font-size:15px;color:#4b5563"><p>Open all year</p><p>Free parking at four trailheads</p><p>Dogs welcome on a lead</p></section>
</body></html>`,
};

const textOverBusyFestival: SpikePair = {
  candidate: "text-over-busy-image",
  name: "festival-hero",
  html: (defect) => `${head("")}
${topBar("Brightside Fest", ["Line-up", "Tickets", "Travel", "FAQ"], `<a class="button" style="background:#111;color:#fff">Buy tickets</a>`)}
<section style="position:relative;height:500px;background:${busyBackground(42, CONFETTI)}">
<div style="position:absolute;right:96px;top:90px;width:560px;padding:28px 32px;color:#111111;${defect ? "" : "background:rgba(255,255,255,0.92);border-radius:8px"}">
<p style="font-size:15px;font-weight:700;margin-bottom:12px">14 TO 16 AUGUST · RIVERSIDE PARK</p>
<h1 style="font-size:50px;line-height:1.1;margin-bottom:18px">Three days of music by the water</h1>
<p style="font-size:18px">Forty acts on four stages, food from local kitchens, and late trains home every night.</p>
</div></section>
<section style="padding:36px 96px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px">
<div><h3 style="font-size:20px;margin-bottom:6px">Day tickets</h3><p style="color:#4b5563">From 45 pounds, children under 12 free.</p></div>
<div><h3 style="font-size:20px;margin-bottom:6px">Camping</h3><p style="color:#4b5563">Quiet field and family field, both with showers.</p></div>
<div><h3 style="font-size:20px;margin-bottom:6px">Getting there</h3><p style="color:#4b5563">Ten minutes on foot from Riverside station.</p></div>
</section></body></html>`,
};

const vibratingSale: SpikePair = {
  candidate: "vibrating-colour-pair",
  name: "sale-banner",
  html: (defect) => `${head("")}
${topBar("Northwind Outfitters", ["Women", "Men", "Kids", "Outlet"], `<a class="button" style="background:#1f2328;color:#fff">Basket (2)</a>`)}
<section style="margin:40px 96px 0;height:300px;border-radius:12px;background:#00a83a;display:flex;flex-direction:column;justify-content:center;padding:0 64px">
<h1 style="font-size:64px;line-height:1.05;font-weight:700;color:${defect ? "#ff1f1f" : "#ffffff"}">Winter sale: up to 50% off</h1>
<p style="font-size:24px;font-weight:700;margin-top:14px;color:${defect ? "#ff1f1f" : "#ffffff"}">Coats, boots and knitwear. Ends Sunday.</p>
</section>
<section style="margin:36px 96px;display:grid;grid-template-columns:repeat(4,1fr);gap:24px">
${["Wool coat", "Hiking boot", "Fleece", "Beanie"].map((item) => `<div><div style="height:180px;background:#eef0f2;border-radius:8px;margin-bottom:10px"></div><p style="font-weight:700">${item}</p><p style="color:#4b5563">Now half price</p></div>`).join("")}
</section></body></html>`,
};

const vibratingWebinar: SpikePair = {
  candidate: "vibrating-colour-pair",
  name: "webinar-card",
  html: (defect) => `${head("")}
${topBar("Cobalt Analytics", ["Product", "Pricing", "Resources", "Company"], `<a class="button" style="background:#1e40af;color:#fff">Book a demo</a>`)}
<main style="display:flex;gap:56px;padding:64px 96px">
<section style="flex:1"><h1 style="font-size:44px;line-height:1.15;margin-bottom:20px">Learn to read your funnel in one hour</h1>
<p style="font-size:18px;color:#4b5563;margin-bottom:24px">A live session with our data team on finding where sign-ups drop off, and what to test first.</p>
<a class="button" style="background:#1e40af;color:#fff">Save my seat</a></section>
<aside style="width:460px;height:420px;border-radius:12px;background:#ff7a00;padding:40px;display:flex;flex-direction:column;justify-content:space-between">
<p style="font-size:18px;font-weight:700;color:${defect ? "#1f6bff" : "#1a1a1a"}">LIVE WEBINAR</p>
<h2 style="font-size:46px;line-height:1.1;font-weight:700;color:${defect ? "#1f6bff" : "#1a1a1a"}">Thursday 6 November, 4 pm</h2>
<p style="font-size:20px;font-weight:700;color:${defect ? "#1f6bff" : "#1a1a1a"}">Free. Recording sent to everyone who registers.</p>
</aside></main></body></html>`,
};

/** The colour of an element on an accent-overuse page: the accent when the defect is on, else the neutral. */
function accentOr(defect: boolean, accent: string, neutral: string): string {
  if (defect) {
    return accent;
  }
  return neutral;
}

const accentSaas: SpikePair = {
  candidate: "accent-overused",
  name: "saas-features",
  html: (defect) => {
    const accent = "#f97316";
    return `${head("")}
<header style="display:flex;align-items:center;height:72px;padding:0 48px;border-bottom:2px solid ${accentOr(defect, accent, "#e5e7eb")}">
<strong style="font-size:20px;margin-right:56px;color:${accentOr(defect, accent, "#1f2328")}">Shiftly</strong>
<nav style="flex:1;color:${accentOr(defect, accent, "#1f2328")}"><a style="margin-right:28px">Features</a><a style="margin-right:28px">Pricing</a><a style="margin-right:28px">Customers</a></nav>
<a class="button" style="background:${accent};color:#fff">Start free trial</a></header>
<section style="padding:56px 96px 32px"><h1 style="font-size:44px;line-height:1.15;margin-bottom:16px;color:${accentOr(defect, accent, "#1f2328")}">Rotas your team will actually read</h1>
<p style="font-size:18px;color:#4b5563;width:640px">Build the week in minutes, swap shifts from a phone, and see labour cost before you publish.</p></section>
<section style="padding:0 96px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
${["Drag-and-drop rota", "Shift swaps", "Cost forecast"].map((title) => `<div style="border:2px solid ${accentOr(defect, accent, "#e5e7eb")};border-radius:10px;padding:24px;background:${accentOr(defect, "#fff1e6", "#ffffff")}">
<div style="width:44px;height:44px;border-radius:10px;background:${accentOr(defect, accent, "#e5e7eb")};margin-bottom:16px"></div>
<h3 style="font-size:20px;margin-bottom:8px;color:${accentOr(defect, accent, "#1f2328")}">${title}</h3>
<p style="color:#4b5563;margin-bottom:12px">Set it up once and it carries over to every new week.</p>
<a style="font-weight:700;color:${accentOr(defect, accent, "#1f2328")};text-decoration:underline">Learn more</a></div>`).join("")}
</section>
<section style="padding:36px 96px"><a class="button" style="background:${accent};color:#fff;font-size:18px">Start free trial</a></section>
</body></html>`;
  },
};

const accentArticle: SpikePair = {
  candidate: "accent-overused",
  name: "news-article",
  html: (defect) => {
    const accent = "#d61f69";
    return `${head("")}
<header style="display:flex;align-items:center;height:72px;padding:0 48px;background:${accentOr(defect, accent, "#ffffff")};color:${accentOr(defect, "#ffffff", "#1f2328")};border-bottom:1px solid #e5e7eb">
<strong style="font-size:20px;margin-right:56px">The Ledger</strong>
<nav style="flex:1"><a style="margin-right:28px">Politics</a><a style="margin-right:28px">Business</a><a style="margin-right:28px">Culture</a></nav>
<a class="button" style="background:${accentOr(defect, "#ffffff", accent)};color:${accentOr(defect, accent, "#ffffff")}">Subscribe</a></header>
<main style="display:flex;gap:56px;padding:44px 96px">
<article style="flex:1">
<p style="font-size:14px;font-weight:700;margin-bottom:10px;color:${accentOr(defect, accent, "#6b7280")}">BUSINESS</p>
<h1 style="font-size:40px;line-height:1.15;margin-bottom:16px;color:${accentOr(defect, accent, "#1f2328")}">Small breweries bet on cans as glass prices climb</h1>
<p style="font-size:14px;color:#6b7280;margin-bottom:22px">By Maya Ortiz · 6 minute read</p>
<blockquote style="border-left:4px solid ${accentOr(defect, accent, "#d1d5db")};padding-left:18px;font-size:20px;margin-bottom:20px;color:${accentOr(defect, accent, "#374151")}">"We did the sums three times. Cans won every time."</blockquote>
<p style="font-size:18px;margin-bottom:14px">Across the region, independent brewers say the cost of a glass bottle has nearly doubled in two years, and the <a style="color:${accentOr(defect, accent, "#1f2328")};text-decoration:underline">move to cans</a> is no longer a matter of taste.</p>
<p style="font-size:18px">Canning lines once cost more than most small brewers could raise. Mobile canning crews changed that.</p>
</article>
<aside style="width:320px">
<h3 style="font-size:18px;margin-bottom:14px;padding-bottom:8px;border-bottom:3px solid ${accentOr(defect, accent, "#1f2328")};color:${accentOr(defect, accent, "#1f2328")}">Most read</h3>
${["Rail fares to rise in March", "The quiet boom in repair shops", "Why rents fell in the north"].map((title) => `<p style="font-weight:700;margin-bottom:14px;color:${accentOr(defect, accent, "#1f2328")}">${title}</p>`).join("")}
<div style="margin-top:20px;padding:20px;border-radius:8px;background:${accentOr(defect, "#fde7f0", "#f3f4f6")}"><p style="margin-bottom:12px">Get the morning briefing in your inbox.</p><a class="button" style="background:${accent};color:#fff">Sign up</a></div>
</aside></main></body></html>`;
  },
};

const saturatedHero: SpikePair = {
  candidate: "saturated-large-areas",
  name: "agency-hero",
  html: (defect) => `${head("")}
${topBar("Fold Studio", ["Work", "Services", "About", "Contact"], `<a class="button" style="background:#1f2328;color:#fff">Start a project</a>`)}
<section style="height:460px;background:${defect ? "#ff00b4" : "#3a2a3f"};color:#ffffff;padding:96px">
<h1 style="font-size:60px;line-height:1.08;width:820px;margin-bottom:24px">We design products people keep using</h1>
<p style="font-size:20px;width:620px">A small studio for research, interface design, and front-end build, working with teams from seed to scale.</p></section>
<section style="padding:40px 96px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px">
<div><h3 style="font-size:20px;margin-bottom:6px">Research</h3><p style="color:#4b5563">Interviews and usability tests.</p></div>
<div><h3 style="font-size:20px;margin-bottom:6px">Design</h3><p style="color:#4b5563">Flows, interfaces, and systems.</p></div>
<div><h3 style="font-size:20px;margin-bottom:6px">Build</h3><p style="color:#4b5563">Production front-end code.</p></div>
</section></body></html>`,
};

const saturatedSidebar: SpikePair = {
  candidate: "saturated-large-areas",
  name: "app-sidebar",
  html: (defect) => `${head("")}
<div style="display:flex;height:800px">
<aside style="width:260px;background:${defect ? "#0047ff" : "#1e2533"};color:#ffffff;padding:28px 24px">
<strong style="font-size:20px;display:block;margin-bottom:36px">Tally</strong>
${["Dashboard", "Invoices", "Clients", "Expenses", "Reports", "Settings"].map((item) => `<p style="padding:10px 0;font-size:16px">${item}</p>`).join("")}
</aside>
<main style="flex:1;padding:36px 48px;background:#f7f8fa">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px"><h1 style="font-size:30px">Invoices</h1><a class="button" style="background:#1f2328;color:#fff">New invoice</a></div>
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px">
${[["INV-1042", "Harbour Cafe", "Paid", "1,240.00"], ["INV-1043", "Mason & Daughters", "Due", "860.00"], ["INV-1044", "Kiln Works", "Overdue", "2,115.50"], ["INV-1045", "Pinewood School", "Paid", "430.00"], ["INV-1046", "Otter Bikes", "Due", "1,980.00"]].map((row) => `<div style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr;padding:16px 24px;border-bottom:1px solid #eef0f2">${row.map((cell) => `<span>${cell}</span>`).join("")}</div>`).join("")}
</div></main></div></body></html>`,
};

const manyHuesLanding: SpikePair = {
  candidate: "many-unrelated-hues",
  name: "app-landing",
  html: (defect) => {
    const accent = "#2563eb";
    const pick = (randomHue: string, planned: string) => (defect ? randomHue : planned);
    return `${head("")}
${topBar("Pocketbook", ["Features", "Pricing", "Help"], `<a class="button" style="background:${pick("#e8590c", accent)};color:#fff">Get the app</a>`, `background:${pick("#0f9d8a", "#ffffff")};color:${pick("#ffffff", "#1f2328")};border-bottom:1px solid #e5e7eb`)}
<section style="padding:56px 96px 28px"><h1 style="font-size:46px;line-height:1.12;margin-bottom:16px;color:${pick("#7b2cbf", "#1f2328")}">Know where your money goes</h1>
<p style="font-size:18px;color:${pick("#8a5a2b", "#4b5563")};width:640px;margin-bottom:22px">Link your accounts, set a budget for each month, and get a nudge before you overspend.</p>
<a style="font-weight:700;text-decoration:underline;color:${pick("#2e9e2e", accent)}">See how it works</a></section>
<section style="padding:0 96px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
${[["Budgets", "#d6336c"], ["Bills", "#f59f00"], ["Savings goals", "#1098ad"]].map(([title, hue]) => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:24px">
<span style="display:inline-block;font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;margin-bottom:12px;background:${pick(hue, "#eff6ff")};color:${pick("#ffffff", accent)}">NEW</span>
<h3 style="font-size:20px;margin-bottom:8px;color:${pick("#6f4e37", "#1f2328")}">${title}</h3><p style="color:#4b5563">Set it once and Pocketbook keeps track for you.</p></div>`).join("")}
</section>
<footer style="margin-top:40px;padding:28px 96px;background:${pick("#a3be1c", "#f3f4f6")};color:${pick("#2b2b2b", "#4b5563")}">Pocketbook Ltd · Privacy · Terms</footer>
</body></html>`;
  },
};

const manyHuesDashboard: SpikePair = {
  candidate: "many-unrelated-hues",
  name: "team-dashboard",
  html: (defect) => {
    const accent = "#0f766e";
    const pick = (randomHue: string, planned: string) => (defect ? randomHue : planned);
    return `${head("")}
<div style="display:flex;height:800px">
<aside style="width:240px;background:${pick("#5f3dc4", "#1f2933")};color:#fff;padding:28px 24px"><strong style="font-size:20px;display:block;margin-bottom:32px">Crewboard</strong>
${["Overview", "Projects", "People", "Time off"].map((item) => `<p style="padding:10px 0">${item}</p>`).join("")}</aside>
<main style="flex:1;padding:36px 48px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px"><h1 style="font-size:30px;color:${pick("#c2255c", "#1f2328")}">Overview</h1><a class="button" style="background:${pick("#fd7e14", accent)};color:#fff">Add project</a></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:28px">
${[["Open tasks", "48", "#2b8a3e"], ["Due this week", "12", "#e03131"], ["Hours logged", "316", "#1971c2"]].map(([label, value, hue]) => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:22px;border-top:4px solid ${pick(hue, accent)}"><p style="color:#4b5563;margin-bottom:6px">${label}</p><p style="font-size:34px;font-weight:700;color:${pick("#9c6644", "#1f2328")}">${value}</p></div>`).join("")}
</div>
<div style="border:1px solid #e5e7eb;border-radius:10px;padding:22px"><h2 style="font-size:20px;margin-bottom:14px;color:${pick("#0ca678", "#1f2328")}">Recent activity</h2>
${["Priya moved Homepage refresh to Review", "Tom logged 6 hours on Billing API", "Ana added Q4 planning"].map((line) => `<p style="padding:10px 0;border-bottom:1px solid #eef0f2"><a style="color:${pick("#e64980", accent)};font-weight:700">View</a> · ${line}</p>`).join("")}
</div></main></div></body></html>`;
  },
};

const sameRolePricing: SpikePair = {
  candidate: "same-role-different-colours",
  name: "pricing-cards",
  html: (defect) => {
    const buttonColours = defect ? ["#2563eb", "#16a34a", "#9333ea"] : ["#2563eb", "#2563eb", "#2563eb"];
    const plans = [["Starter", "9"], ["Team", "29"], ["Business", "79"]];
    return `${head("")}
${topBar("Formwise", ["Product", "Pricing", "Templates", "Docs"], `<a class="button" style="border:1px solid #d1d5db">Log in</a>`)}
<section style="text-align:center;padding:48px 96px 32px"><h1 style="font-size:42px;margin-bottom:10px">Simple pricing for every team</h1><p style="font-size:18px;color:#4b5563">All plans include unlimited forms and a 14-day free trial.</p></section>
<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;padding:0 140px">
${plans.map(([name, price], index) => `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:32px">
<h3 style="font-size:22px;margin-bottom:8px">${name}</h3><p style="font-size:40px;font-weight:700;margin-bottom:4px">$${price}<span style="font-size:16px;color:#6b7280;font-weight:400"> / month</span></p>
<p style="color:#4b5563;margin:12px 0 24px">Up to ${(index + 1) * 5} editors and ${(index + 1) * 1000} responses each month.</p>
<a class="button" style="display:block;text-align:center;background:${buttonColours[index]};color:#fff">Choose ${name}</a></div>`).join("")}
</section></body></html>`;
  },
};

const sameRoleShop: SpikePair = {
  candidate: "same-role-different-colours",
  name: "product-grid",
  html: (defect) => {
    const buttonColours = defect ? ["#dc2626", "#0d9488", "#ea580c", "#4f46e5"] : ["#1f2328", "#1f2328", "#1f2328", "#1f2328"];
    const items = [["Ceramic mug", "18"], ["Linen tea towel", "12"], ["Oak board", "34"], ["Glass carafe", "26"]];
    return `${head("")}
${topBar("Hearth & Co", ["Kitchen", "Living", "Garden", "Gifts"], `<a class="button" style="border:1px solid #d1d5db">Basket (0)</a>`)}
<section style="padding:40px 96px 20px"><h1 style="font-size:34px;margin-bottom:6px">Kitchen</h1><p style="color:#4b5563">Made by small workshops, built to last.</p></section>
<section style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:0 96px">
${items.map(([name, price], index) => `<div><div style="height:260px;background:#f1efe9;border-radius:10px;margin-bottom:14px"></div>
<p style="font-weight:700;font-size:17px">${name}</p><p style="color:#4b5563;margin-bottom:12px">${price} pounds</p>
<a class="button" style="display:block;text-align:center;background:${buttonColours[index]};color:#fff">Add to basket</a></div>`).join("")}
</section></body></html>`;
  },
};

const competingBands: SpikePair = {
  candidate: "competing-saturated-hues",
  name: "two-bands",
  html: (defect) => `${head("")}
${topBar("Relay", ["Platform", "Pricing", "Customers", "Docs"], `<a class="button" style="background:#1d4ed8;color:#fff">Get started</a>`)}
<section style="display:flex;height:440px">
<div style="flex:1;background:#1d4ed8;color:#fff;padding:72px 64px"><h1 style="font-size:46px;line-height:1.1;margin-bottom:18px">Send every message on time</h1><p style="font-size:18px;margin-bottom:24px">Email, SMS and push from one API, with retries handled for you.</p><a class="button" style="background:#fff;color:#1d4ed8">Read the docs</a></div>
<div style="flex:1;background:${defect ? "#e11d48" : "#f3f4f6"};color:${defect ? "#fff" : "#1f2328"};padding:72px 64px"><h2 style="font-size:40px;line-height:1.1;margin-bottom:18px">Trusted by 4,000 teams</h2><p style="font-size:18px;margin-bottom:24px">From two-person shops to banks sending millions of alerts a day.</p><a class="button" style="background:${defect ? "#fff" : "#1f2328"};color:${defect ? "#e11d48" : "#fff"}">See customer stories</a></div>
</section>
<section style="padding:40px 96px;display:flex;gap:56px;color:#4b5563"><p>99.99% uptime</p><p>SOC 2 Type II</p><p>Data kept in the EU or US</p></section>
</body></html>`,
};

const competingTiles: SpikePair = {
  candidate: "competing-saturated-hues",
  name: "charity-tiles",
  html: (defect) => `${head("")}
${topBar("Open Shelter", ["Our work", "Stories", "Volunteer", "About"], `<a class="button" style="background:#16a34a;color:#fff">Donate</a>`)}
<section style="padding:44px 96px 24px"><h1 style="font-size:40px;margin-bottom:8px">Help someone sleep safe tonight</h1><p style="font-size:18px;color:#4b5563">Every bed we open is paid for by people like you.</p></section>
<section style="display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:0 96px">
<div style="height:360px;border-radius:14px;background:#16a34a;color:#fff;padding:40px"><h2 style="font-size:34px;margin-bottom:14px">Give monthly</h2><p style="font-size:18px;margin-bottom:28px">10 pounds a month keeps a bed open for four nights.</p><a class="button" style="background:#fff;color:#16a34a">Give monthly</a></div>
<div style="height:360px;border-radius:14px;background:${defect ? "#f97316" : "#ffffff"};border:1px solid ${defect ? "#f97316" : "#e5e7eb"};color:${defect ? "#fff" : "#1f2328"};padding:40px"><h2 style="font-size:34px;margin-bottom:14px">Give once</h2><p style="font-size:18px;margin-bottom:28px">Any amount helps us buy bedding and hot meals.</p><a class="button" style="background:${defect ? "#fff" : "#f3f4f6"};color:${defect ? "#f97316" : "#1f2328"}">Give once</a></div>
</section></body></html>`,
};

/** Every pair, two per candidate, in the order of questions.json. */
export const SPIKE_PAIRS: SpikePair[] = [
  textOverBusyHike,
  textOverBusyFestival,
  vibratingSale,
  vibratingWebinar,
  accentSaas,
  accentArticle,
  saturatedHero,
  saturatedSidebar,
  manyHuesLanding,
  manyHuesDashboard,
  sameRolePricing,
  sameRoleShop,
  competingBands,
  competingTiles,
];
