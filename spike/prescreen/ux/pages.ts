// The throwaway page pairs for the ux part of the crit-q25.17 pre-screen spike. Each page is
// written once as a function of one switch, `defect`, so the positive side (defect on) and the
// negative side (defect off) differ only in the defect. Two pairs per candidate criterion.
// Disposable spike code: these pages are not fixtures and never go under packs/.

/** One pair of the spike: the candidate it tests, its name, its viewport, and its HTML. */
export type SpikePair = {
  candidate: string;
  name: string;
  viewport: { width: number; height: number };
  html: (defect: boolean) => string;
};

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

/** The shared head: the Inter font from the packs renderer, the reset, and common controls. */
function head(viewport: { width: number; height: number }, extraCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 400; src: url("inter-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Inter"; font-weight: 700; src: url("inter-latin-700-normal.woff2") format("woff2"); font-display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${viewport.width}px; height: ${viewport.height}px; overflow: hidden; }
body { font-family: "Inter"; font-size: 16px; color: #1f2328; background: #ffffff; }
a { color: inherit; text-decoration: none; }
.button { display: inline-block; border-radius: 8px; padding: 12px 22px; font-weight: 700; font-size: 15px; border: 1px solid transparent; }
.primary { background: #2f5bea; color: #ffffff; }
.secondary { background: #ffffff; color: #1f2328; border-color: #c9ced6; }
label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.input { height: 42px; border: 1px solid #c9ced6; border-radius: 6px; background: #ffffff; width: 100%; }
.textarea { height: 110px; border: 1px solid #c9ced6; border-radius: 6px; width: 100%; }
.field { margin-bottom: 18px; }
.muted { color: #6a737d; }
${extraCss}
</style></head><body>`;
}

/** A simple top bar with a logo and links; the link at `currentIndex` is marked unless `unmarked`. */
function topNav(logo: string, links: string[], currentIndex: number, unmarked: boolean): string {
  const items: string[] = [];
  for (let index = 0; index < links.length; index++) {
    const isCurrent = index === currentIndex && !unmarked;
    let style = "margin-right:32px;padding:26px 0;color:#3d444d";
    if (isCurrent) {
      style = "margin-right:32px;padding:26px 0 23px;color:#2f5bea;font-weight:700;border-bottom:3px solid #2f5bea";
    }
    items.push(`<a style="${style}">${links[index]}</a>`);
  }
  return `<header style="display:flex;align-items:center;height:72px;padding:0 64px;border-bottom:1px solid #e3e6ea;font-size:15px">
<strong style="font-size:20px;margin-right:64px">${logo}</strong><nav style="flex:1;display:flex">${items.join("")}</nav>
<a class="button secondary" style="padding:9px 16px">Sign in</a></header>`;
}

/** A blurred-looking page behind a dialog: grey blocks standing in for an article. */
function pageBehindDialog(): string {
  return `${topNav("Fieldnotes", ["Essays", "Interviews", "Archive", "About"], -1, true)}
<main style="width:720px;margin:48px auto 0">
<h1 style="font-size:40px;line-height:1.2;margin-bottom:20px">What the river taught us about building slowly</h1>
<p style="font-size:18px;line-height:1.6;margin-bottom:16px">We spent three summers walking the same eleven miles of riverbank, and the thing that stayed with us was not the water but the patience of everything that lived beside it.</p>
<p style="font-size:18px;line-height:1.6;margin-bottom:16px">The willows grow a hand's width a year. The banks move a little after every flood. Nothing hurries, and nothing stands still either.</p>
<p style="font-size:18px;line-height:1.6">By the end of the second summer we had stopped measuring progress in miles and started measuring it in seasons.</p>
</main>
<div style="position:fixed;inset:0;background:rgba(15,20,30,0.55)"></div>`;
}

const newsletterDialog: SpikePair = {
  candidate: "dialog-without-exit",
  name: "newsletter-dialog",
  viewport: DESKTOP,
  html: (defect) => {
    let close = `<a style="position:absolute;top:16px;right:18px;font-size:26px;line-height:1;color:#6a737d">&times;</a>`;
    let noThanks = `<p style="margin-top:14px;text-align:center"><a class="muted" style="font-size:14px;text-decoration:underline">No thanks</a></p>`;
    if (defect) {
      close = "";
      noThanks = "";
    }
    return `${head(DESKTOP, "")}${pageBehindDialog()}
<div style="position:fixed;top:190px;left:440px;width:400px;background:#ffffff;border-radius:12px;padding:36px 36px 30px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
${close}
<h2 style="font-size:24px;margin-bottom:10px">Join 40,000 readers</h2>
<p class="muted" style="font-size:15px;line-height:1.5;margin-bottom:22px">One long essay every Sunday. No ads, and you can leave whenever you like.</p>
<div class="input" style="margin-bottom:14px;padding:11px 12px;color:#8b949e;font-size:15px">you@example.com</div>
<a class="button primary" style="display:block;text-align:center">Subscribe</a>
${noThanks}
</div></body></html>`;
  },
};

const trialDialog: SpikePair = {
  candidate: "dialog-without-exit",
  name: "trial-dialog",
  viewport: DESKTOP,
  html: (defect) => {
    let cancel = `<a class="button secondary" style="margin-right:12px">Cancel</a>`;
    if (defect) {
      cancel = "";
    }
    const rows: string[] = [];
    for (const [name, status, amount] of [
      ["Invoice 1042", "Paid", "$1,280.00"],
      ["Invoice 1041", "Paid", "$640.00"],
      ["Invoice 1040", "Overdue", "$2,115.50"],
      ["Invoice 1039", "Paid", "$980.00"],
      ["Invoice 1038", "Draft", "$310.00"],
    ]) {
      rows.push(`<tr><td style="padding:14px 0;border-bottom:1px solid #e3e6ea">${name}</td><td style="border-bottom:1px solid #e3e6ea">${status}</td><td style="border-bottom:1px solid #e3e6ea;text-align:right">${amount}</td></tr>`);
    }
    return `${head(DESKTOP, "")}
<div style="display:flex;height:800px">
<aside style="width:240px;background:#f5f6f8;padding:28px 24px;border-right:1px solid #e3e6ea;font-size:15px;line-height:2.4">
<strong style="font-size:20px;display:block;margin-bottom:24px">Ledgerly</strong>Overview<br>Invoices<br>Clients<br>Expenses<br>Reports<br>Settings</aside>
<main style="flex:1;padding:40px 56px"><h1 style="font-size:30px;margin-bottom:28px">Invoices</h1>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.join("")}</table></main></div>
<div style="position:fixed;inset:0;background:rgba(15,20,30,0.55)"></div>
<div style="position:fixed;top:220px;left:420px;width:480px;background:#ffffff;border-radius:12px;padding:34px 36px 28px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
<h2 style="font-size:22px;margin-bottom:12px">Your free trial has ended</h2>
<p class="muted" style="font-size:15px;line-height:1.55;margin-bottom:28px">Choose a plan to keep sending invoices. Your clients, invoices, and reports are saved and will be waiting for you.</p>
<div style="text-align:right">${cancel}<a class="button primary">Choose a plan</a></div>
</div></body></html>`;
  },
};

const pricingNav: SpikePair = {
  candidate: "no-current-location-shown",
  name: "pricing-nav",
  viewport: DESKTOP,
  html: (defect) => {
    const plans: string[] = [];
    for (const [plan, price, note] of [
      ["Starter", "$0", "For one person trying things out"],
      ["Team", "$12", "Per seat each month, billed yearly"],
      ["Business", "$29", "Per seat each month, with single sign-on"],
    ]) {
      plans.push(`<div style="flex:1;border:1px solid #e3e6ea;border-radius:12px;padding:28px"><h3 style="font-size:18px;margin-bottom:12px">${plan}</h3>
<p style="font-size:40px;font-weight:700;margin-bottom:8px">${price}</p><p class="muted" style="font-size:14px;margin-bottom:24px">${note}</p>
<a class="button secondary" style="display:block;text-align:center">Choose ${plan}</a></div>`);
    }
    return `${head(DESKTOP, "")}${topNav("Northwind", ["Home", "Product", "Pricing", "Docs", "Blog"], 2, defect)}
<main style="width:1000px;margin:56px auto 0"><h1 style="font-size:40px;margin-bottom:12px;text-align:center">Simple plans for every team</h1>
<p class="muted" style="font-size:18px;text-align:center;margin-bottom:44px">Start free, and pay only when your team grows.</p>
<div style="display:flex;gap:24px">${plans.join("")}</div></main></body></html>`;
  },
};

const adminSidebar: SpikePair = {
  candidate: "no-current-location-shown",
  name: "admin-sidebar",
  viewport: DESKTOP,
  html: (defect) => {
    const items: string[] = [];
    for (const item of ["Dashboard", "Orders", "Customers", "Products", "Reports", "Settings"]) {
      let style = "display:block;padding:10px 14px;border-radius:6px;margin-bottom:4px;color:#3d444d";
      if (item === "Orders" && !defect) {
        style = "display:block;padding:10px 14px;border-radius:6px;margin-bottom:4px;background:#e6edff;color:#2f5bea;font-weight:700";
      }
      items.push(`<a style="${style}">${item}</a>`);
    }
    const rows: string[] = [];
    for (const [order, customer, status, total] of [
      ["#20481", "Maple & Co.", "Shipped", "$184.20"],
      ["#20480", "Harbor Supply", "Processing", "$62.00"],
      ["#20479", "Lantern Books", "Shipped", "$318.75"],
      ["#20478", "Quarry Coffee", "Refunded", "$24.50"],
      ["#20477", "Pine Street Florist", "Shipped", "$96.10"],
      ["#20476", "Atlas Outdoor", "Processing", "$451.00"],
    ]) {
      rows.push(`<tr><td style="padding:14px 0;border-bottom:1px solid #e3e6ea">${order}</td><td style="border-bottom:1px solid #e3e6ea">${customer}</td><td style="border-bottom:1px solid #e3e6ea">${status}</td><td style="border-bottom:1px solid #e3e6ea;text-align:right">${total}</td></tr>`);
    }
    return `${head(DESKTOP, "")}<div style="display:flex;height:800px">
<aside style="width:250px;padding:28px 20px;border-right:1px solid #e3e6ea;font-size:15px"><strong style="font-size:20px;display:block;margin:0 0 28px 14px">Shopfront</strong>${items.join("")}</aside>
<main style="flex:1;padding:40px 56px"><h1 style="font-size:30px;margin-bottom:8px">Orders</h1><p class="muted" style="margin-bottom:28px">128 orders in the last 30 days</p>
<table style="width:100%;border-collapse:collapse;font-size:15px"><tr class="muted" style="font-size:13px"><td style="padding-bottom:10px">Order</td><td>Customer</td><td>Status</td><td style="text-align:right">Total</td></tr>${rows.join("")}</table></main></div></body></html>`;
  },
};

/** One labelled field, with an optional suffix after the label such as an asterisk. */
function field(labelText: string, suffix: string): string {
  return `<div class="field"><label>${labelText}${suffix}</label><div class="input"></div></div>`;
}

/** Lay out fields in `columns` columns inside a fixed-width form. */
function fieldGrid(fieldsHtml: string[], columns: number): string {
  return `<div style="display:grid;grid-template-columns:repeat(${columns}, 1fr);column-gap:24px">${fieldsHtml.join("")}</div>`;
}

const checkoutForm: SpikePair = {
  candidate: "multi-column-form",
  name: "checkout-form",
  viewport: DESKTOP,
  html: (defect) => {
    const fields = ["First name", "Last name", "Email", "Phone", "Street address", "City", "Postcode", "Country"].map((name) => field(name, ""));
    let columns = 1;
    let formWidth = 440;
    if (defect) {
      columns = 2;
      formWidth = 640;
    }
    return `${head(DESKTOP, ".field { margin-bottom: 12px; } .input { height: 38px; }")}
<header style="height:64px;display:flex;align-items:center;padding:0 64px;border-bottom:1px solid #e3e6ea"><strong style="font-size:20px">Driftwood Goods</strong><span class="muted" style="margin-left:24px;font-size:14px">Secure checkout</span></header>
<div style="display:flex;gap:64px;padding:28px 64px">
<section style="width:${formWidth}px"><h1 style="font-size:24px;margin-bottom:18px">Shipping details</h1>${fieldGrid(fields, columns)}
<a class="button primary" style="margin-top:4px">Continue to payment</a></section>
<aside style="width:320px;border:1px solid #e3e6ea;border-radius:12px;padding:24px;align-self:flex-start"><h2 style="font-size:18px;margin-bottom:16px">Order summary</h2>
<p style="display:flex;justify-content:space-between;margin-bottom:10px"><span>Linen throw</span><span>$68.00</span></p>
<p style="display:flex;justify-content:space-between;margin-bottom:10px"><span>Oak serving board</span><span>$42.00</span></p>
<p style="display:flex;justify-content:space-between;margin-bottom:16px" class="muted"><span>Shipping</span><span>$6.00</span></p>
<p style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #e3e6ea;padding-top:14px"><span>Total</span><span>$116.00</span></p></aside></div></body></html>`;
  },
};

const demoForm: SpikePair = {
  candidate: "multi-column-form",
  name: "demo-form",
  viewport: DESKTOP,
  html: (defect) => {
    const fields = ["Full name", "Work email", "Company", "Job title", "Team size", "Country"].map((name) => field(name, ""));
    let columns = 1;
    let formWidth = 420;
    if (defect) {
      columns = 2;
      formWidth = 620;
    }
    return `${head(DESKTOP, ".field { margin-bottom: 14px; }")}${topNav("Northwind", ["Product", "Customers", "Pricing", "Docs"], -1, true)}
<div style="display:flex;gap:72px;padding:40px 96px">
<section style="width:380px;padding-top:12px"><h1 style="font-size:36px;line-height:1.2;margin-bottom:16px">See Northwind with your own data</h1>
<p class="muted" style="font-size:17px;line-height:1.6">A thirty-minute call with a product specialist. We will set up a workspace for your team and answer your questions.</p></section>
<section style="width:${formWidth}px;border:1px solid #e3e6ea;border-radius:12px;padding:28px">${fieldGrid(fields, columns)}
<a class="button primary" style="display:block;text-align:center;margin-top:6px">Request a demo</a></section></div></body></html>`;
  },
};

const jobApplication: SpikePair = {
  candidate: "required-fields-unmarked",
  name: "job-application",
  viewport: DESKTOP,
  html: (defect) => {
    let star = ` <span style="color:#c62828">*</span>`;
    let legend = `<p class="muted" style="font-size:14px;margin-bottom:20px"><span style="color:#c62828">*</span> Required</p>`;
    if (defect) {
      star = "";
      legend = `<p style="margin-bottom:20px;height:17px"></p>`;
    }
    return `${head(DESKTOP, ".field { margin-bottom: 14px; } .input { height: 40px; }")}
<header style="height:64px;display:flex;align-items:center;padding:0 64px;border-bottom:1px solid #e3e6ea"><strong style="font-size:20px">Bramble Studio</strong><span class="muted" style="margin-left:24px;font-size:14px">Careers</span></header>
<main style="width:560px;margin:28px auto 0"><h1 style="font-size:28px;margin-bottom:6px">Apply: Senior product designer</h1>
<p class="muted" style="margin-bottom:12px">Remote, Europe time zones</p>${legend}
${field("Full name", star)}${field("Email", star)}${field("Phone", "")}${field("Portfolio link", star)}${field("LinkedIn profile", "")}
<div class="field"><label>Anything else you would like us to know</label><div class="textarea" style="height:80px"></div></div>
<a class="button primary">Submit application</a></main></body></html>`;
  },
};

const signupForm: SpikePair = {
  candidate: "required-fields-unmarked",
  name: "signup-form",
  viewport: DESKTOP,
  html: (defect) => {
    let optional = ` <span class="muted" style="font-weight:400">(optional)</span>`;
    if (defect) {
      optional = "";
    }
    return `${head(DESKTOP, ".field { margin-bottom: 14px; }")}
<div style="display:flex;height:800px"><section style="width:560px;background:#16233f;color:#ffffff;padding:72px 64px"><strong style="font-size:22px">Tidewater</strong>
<h2 style="font-size:34px;line-height:1.25;margin-top:120px">Plan your crew's shifts in minutes, not afternoons.</h2></section>
<main style="flex:1;padding:72px 120px"><h1 style="font-size:28px;margin-bottom:24px">Create your account</h1>
${field("Work email", "")}${field("Password", "")}${field("Company name", "")}${field("Phone number", optional)}${field("How did you hear about us?", optional)}
<a class="button primary" style="display:block;text-align:center;margin-top:8px">Create account</a></main></div></body></html>`;
  },
};

const productPage: SpikePair = {
  candidate: "actions-look-like-plain-text",
  name: "product-page",
  viewport: DESKTOP,
  html: (defect) => {
    let action = `<a class="button primary" style="padding:14px 36px;font-size:16px">Add to cart</a>`;
    if (defect) {
      action = `<span style="font-size:16px;display:inline-block;padding:14px 0">Add to cart</span>`;
    }
    return `${head(DESKTOP, "")}${topNav("Driftwood Goods", ["Home", "Kitchen", "Bedroom", "Gifts"], -1, true)}
<main style="display:flex;gap:64px;padding:48px 96px"><div style="width:520px;height:560px;background:linear-gradient(135deg,#d8cbb5,#b9a585);border-radius:12px"></div>
<section style="width:460px;padding-top:16px"><p class="muted" style="font-size:14px;margin-bottom:8px">Kitchen</p><h1 style="font-size:36px;margin-bottom:12px">Oak serving board</h1>
<p style="font-size:24px;margin-bottom:24px">$42.00</p><p style="font-size:16px;line-height:1.6;margin-bottom:28px">Cut from a single piece of European oak and finished with food-safe oil. Large enough for a loaf and a wedge of cheese, light enough to carry to the table.</p>
<p class="muted" style="font-size:14px;margin-bottom:24px">In stock. Ships in two working days.</p>${action}</section></main></body></html>`;
  },
};

const contactForm: SpikePair = {
  candidate: "actions-look-like-plain-text",
  name: "contact-form",
  viewport: DESKTOP,
  html: (defect) => {
    let action = `<a class="button primary">Send message</a>`;
    if (defect) {
      action = `<span style="font-size:15px;display:inline-block;padding:12px 0">Send message</span>`;
    }
    return `${head(DESKTOP, "")}${topNav("Bramble Studio", ["Work", "Services", "About", "Contact"], 3, false)}
<main style="display:flex;gap:96px;padding:56px 120px"><section style="width:380px"><h1 style="font-size:36px;margin-bottom:16px">Tell us about your project</h1>
<p class="muted" style="font-size:17px;line-height:1.6">We reply to every message within two working days. If you would rather talk, call us on weekdays from nine to five.</p></section>
<section style="width:480px">${field("Your name", "")}${field("Email", "")}<div class="field"><label>Message</label><div class="textarea"></div></div>${action}</section></main></body></html>`;
  },
};

const editorSave: SpikePair = {
  candidate: "duplicate-adjacent-actions",
  name: "editor-save",
  viewport: DESKTOP,
  html: (defect) => {
    let otherLabel = "Cancel";
    if (defect) {
      otherLabel = "Save";
    }
    return `${head(DESKTOP, "")}<div style="display:flex;height:800px">
<aside style="width:240px;background:#f5f6f8;padding:28px 24px;border-right:1px solid #e3e6ea;font-size:15px;line-height:2.4"><strong style="font-size:20px;display:block;margin-bottom:24px">Tidewater</strong>Schedule<br>People<br>Locations<br>Time off<br>Settings</aside>
<main style="flex:1;padding:40px 64px"><h1 style="font-size:28px;margin-bottom:6px">Edit location</h1><p class="muted" style="margin-bottom:28px">Harbour Street kitchen</p>
<div style="width:520px">${field("Location name", "")}${field("Address", "")}${field("Opening hours", "")}${field("Manager", "")}
<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px"><a class="button secondary">${otherLabel}</a><a class="button primary">Save changes</a></div></div></main></div></body></html>`;
  },
};

const heroCtas: SpikePair = {
  candidate: "duplicate-adjacent-actions",
  name: "hero-ctas",
  viewport: DESKTOP,
  html: (defect) => {
    let otherLabel = "Watch a demo";
    if (defect) {
      otherLabel = "Try it free";
    }
    return `${head(DESKTOP, "")}${topNav("Northwind", ["Product", "Customers", "Pricing", "Docs"], -1, true)}
<main style="display:flex;gap:64px;padding:96px 96px 0;align-items:center"><section style="width:520px"><h1 style="font-size:48px;line-height:1.15;margin-bottom:20px">Every project, one calm place to work</h1>
<p class="muted" style="font-size:19px;line-height:1.6;margin-bottom:36px">Plans, files, and decisions in one shared space, so your team spends less time looking for things and more time making them.</p>
<div style="display:flex;gap:14px"><a class="button primary">Start free trial</a><a class="button secondary">${otherLabel}</a></div></section>
<div style="width:520px;height:400px;background:#eef1f6;border:1px solid #e3e6ea;border-radius:12px;padding:24px"><div style="height:24px;width:40%;background:#d5dbe5;border-radius:4px;margin-bottom:20px"></div><div style="height:100px;background:#ffffff;border-radius:8px;margin-bottom:14px"></div><div style="height:100px;background:#ffffff;border-radius:8px;margin-bottom:14px"></div><div style="height:80px;width:70%;background:#ffffff;border-radius:8px"></div></div></main></body></html>`;
  },
};

/** A phone status bar and a top bar with a back arrow, a title, and an optional action on the right. */
function phoneTopBar(title: string, rightAction: string): string {
  return `<div style="height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 24px;font-size:14px;font-weight:700"><span>9:41</span><span>100%</span></div>
<div style="height:52px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #e3e6ea"><span style="font-size:22px;width:72px">&larr;</span><strong style="flex:1;text-align:center;font-size:17px">${title}</strong><span style="width:72px;text-align:right">${rightAction}</span></div>`;
}

const phoneCheckout: SpikePair = {
  candidate: "primary-action-out-of-thumb-reach",
  name: "phone-checkout",
  viewport: PHONE,
  html: (defect) => {
    let topAction = "";
    let bottomAction = `<div style="position:fixed;left:16px;right:16px;bottom:34px"><a class="button primary" style="display:block;text-align:center;padding:16px">Pay $116.00</a></div>`;
    if (defect) {
      topAction = `<a class="button primary" style="padding:8px 14px;font-size:14px">Pay</a>`;
      bottomAction = "";
    }
    return `${head(PHONE, ".field { margin-bottom: 14px; }")}${phoneTopBar("Checkout", topAction)}
<main style="padding:20px 16px"><h2 style="font-size:16px;margin-bottom:12px">Delivery</h2><p style="font-size:15px;line-height:1.5;margin-bottom:24px">Ada Moreau<br>14 Rue des Lilas<br>Lyon 69003</p>
<h2 style="font-size:16px;margin-bottom:12px">Payment</h2>${field("Card number", "")}<div style="display:flex;gap:12px"><div style="flex:1">${field("Expiry", "")}</div><div style="flex:1">${field("CVC", "")}</div></div>
<div style="border-top:1px solid #e3e6ea;padding-top:16px;margin-top:8px"><p style="display:flex;justify-content:space-between;margin-bottom:8px" class="muted"><span>Items</span><span>$110.00</span></p><p style="display:flex;justify-content:space-between;margin-bottom:8px" class="muted"><span>Shipping</span><span>$6.00</span></p><p style="display:flex;justify-content:space-between;font-weight:700"><span>Total</span><span>$116.00</span></p></div></main>
${bottomAction}</body></html>`;
  },
};

const phoneBooking: SpikePair = {
  candidate: "primary-action-out-of-thumb-reach",
  name: "phone-booking",
  viewport: PHONE,
  html: (defect) => {
    let topAction = "";
    let bottomAction = `<div style="position:fixed;left:16px;right:16px;bottom:34px"><a class="button primary" style="display:block;text-align:center;padding:16px">Reserve table</a></div>`;
    if (defect) {
      topAction = `<a class="button primary" style="padding:8px 12px;font-size:14px">Reserve</a>`;
      bottomAction = "";
    }
    const times: string[] = [];
    for (const time of ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"]) {
      let style = "border:1px solid #c9ced6;border-radius:8px;padding:12px 0;text-align:center;font-size:15px";
      if (time === "19:30") {
        style = "border:2px solid #2f5bea;border-radius:8px;padding:11px 0;text-align:center;font-size:15px;font-weight:700;color:#2f5bea";
      }
      times.push(`<div style="${style}">${time}</div>`);
    }
    return `${head(PHONE, "")}${phoneTopBar("Book a table", topAction)}
<div style="height:170px;background:linear-gradient(135deg,#c9a77c,#7d5a3c)"></div>
<main style="padding:20px 16px"><h1 style="font-size:22px;margin-bottom:4px">Osteria Lume</h1><p class="muted" style="font-size:14px;margin-bottom:20px">Italian, open until 23:00</p>
<h2 style="font-size:16px;margin-bottom:10px">Guests</h2><div style="display:flex;align-items:center;gap:20px;margin-bottom:22px"><span class="button secondary" style="padding:6px 14px">&minus;</span><strong>2 people</strong><span class="button secondary" style="padding:6px 14px">+</span></div>
<h2 style="font-size:16px;margin-bottom:10px">Saturday 14 November</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${times.join("")}</div></main>
${bottomAction}</body></html>`;
  },
};

/** Every pair of the spike, two per candidate, in the order of questions.json. */
export const SPIKE_PAIRS: SpikePair[] = [
  newsletterDialog,
  trialDialog,
  pricingNav,
  adminSidebar,
  checkoutForm,
  demoForm,
  jobApplication,
  signupForm,
  productPage,
  contactForm,
  editorSave,
  heroCtas,
  phoneCheckout,
  phoneBooking,
];
