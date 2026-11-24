// Writes the HTML screens of the contact-sheet spike (crit-j8y.1) into sets/<set>/screen-N.html.
// All screens are of one invented product, "Ledgerly", a small-business invoicing app.
// Each set takes the same shared stylesheet and changes at most one screen in one realistic way.
// ANSWERS.md says which screen breaks what. Never show ANSWERS.md or this file to the critic.
// Usage: node spike/contact-sheet/pages.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SPIKE_DIRECTORY = import.meta.dirname;

// The shared stylesheet of the product. Every screen links it.
const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #1d2433; background: #f5f6f8; }
.app { display: flex; min-height: 800px; }
.sidebar { width: 232px; background: #14213d; color: #c9d1e3; padding: 24px 16px; flex-shrink: 0; }
.brand { color: #fff; font-weight: 700; font-size: 18px; margin: 0 8px 28px; }
.nav a { display: block; color: #c9d1e3; text-decoration: none; padding: 8px 12px; border-radius: 6px; margin-bottom: 2px; }
.nav a.active { background: #24345c; color: #fff; }
.main { flex: 1; padding: 32px 40px; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.01em; }
h2 { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
.sub { color: #5b6478; margin-top: 2px; }
.btn { display: inline-block; background: #2453c9; color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; font-size: 14px; font-weight: 600; font-family: inherit; }
.btn-ghost { background: #fff; color: #1d2433; border: 1px solid #cfd5e1; }
.card { background: #fff; border: 1px solid #e1e5ed; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; }
.row { display: flex; gap: 20px; }
.row > .card { flex: 1; }
.stat { font-size: 26px; font-weight: 700; }
.label { color: #5b6478; font-size: 13px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #5b6478; padding: 8px 10px; border-bottom: 1px solid #e1e5ed; }
td { padding: 11px 10px; border-bottom: 1px solid #eef0f4; }
.pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; }
.paid { background: #e3f4ea; color: #1c6b3c; }
.due { background: #fff3d9; color: #8a5a00; }
.late { background: #fde4e4; color: #9b1c1c; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.field input { width: 100%; max-width: 420px; padding: 9px 12px; border: 1px solid #cfd5e1; border-radius: 6px; font-size: 14px; font-family: inherit; }
.bar { height: 10px; background: #e7ebf3; border-radius: 5px; overflow: hidden; margin: 6px 0 14px; }
.bar span { display: block; height: 100%; background: #2453c9; }
`;

const NAV_ITEMS = ["Overview", "Invoices", "Clients", "Reports", "Payments", "Settings"];

/** Returns the sidebar HTML with one nav item marked active. */
function sidebar(activeItem) {
  const links = NAV_ITEMS.map((item) => {
    const activeClass = item === activeItem ? ' class="active"' : "";
    return `<a href="#"${activeClass}>${item}</a>`;
  }).join("");
  return `<aside class="sidebar"><div class="brand">Ledgerly</div><nav class="nav">${links}</nav></aside>`;
}

/** Returns the table rows of the invoice list. */
function invoiceRows() {
  const invoices = [
    ["INV-1042", "Harbor Coffee Co.", "Nov 18", "$1,240.00", "paid"],
    ["INV-1041", "Delgado Landscaping", "Nov 15", "$860.00", "due"],
    ["INV-1040", "Pine & Pixel Studio", "Nov 11", "$3,400.00", "paid"],
    ["INV-1039", "Northside Dental", "Nov 02", "$515.00", "late"],
    ["INV-1038", "Brightwater Yoga", "Oct 29", "$720.00", "paid"],
    ["INV-1037", "Okafor Legal", "Oct 24", "$2,150.00", "due"],
    ["INV-1036", "Maple Street Bakery", "Oct 20", "$310.00", "paid"],
  ];
  return invoices
    .map(([number, client, date, amount, status]) => {
      const statusText = status === "paid" ? "Paid" : status === "due" ? "Due" : "Overdue";
      return `<tr><td>${number}</td><td>${client}</td><td>${date}</td><td>${amount}</td><td><span class="pill ${status}">${statusText}</span></td></tr>`;
    })
    .join("");
}

// The body of each screen, keyed by screen kind. Each returns the HTML inside .main after the topbar.
const SCREEN_BODIES = {
  Overview: () => `
    <div class="row">
      <div class="card"><div class="label">Outstanding</div><div class="stat">$4,525.00</div></div>
      <div class="card"><div class="label">Paid this month</div><div class="stat">$12,870.00</div></div>
      <div class="card"><div class="label">Overdue</div><div class="stat">$515.00</div></div>
    </div>
    <div class="card"><h2>Recent invoices</h2><table><thead><tr><th>Number</th><th>Client</th><th>Sent</th><th>Amount</th><th>Status</th></tr></thead><tbody>${invoiceRows()}</tbody></table></div>`,
  Invoices: () => `
    <div class="card"><h2>All invoices</h2><table><thead><tr><th>Number</th><th>Client</th><th>Sent</th><th>Amount</th><th>Status</th></tr></thead><tbody>${invoiceRows()}${invoiceRows().replaceAll("INV-10", "INV-09")}</tbody></table></div>`,
  Clients: () => {
    const clients = [
      ["Harbor Coffee Co.", "accounts@harborcoffee.com", "14 invoices"],
      ["Delgado Landscaping", "maria@delgadoland.com", "6 invoices"],
      ["Pine & Pixel Studio", "hello@pinepixel.io", "9 invoices"],
      ["Northside Dental", "office@northsidedental.com", "3 invoices"],
      ["Brightwater Yoga", "team@brightwater.yoga", "11 invoices"],
      ["Okafor Legal", "billing@okaforlegal.com", "5 invoices"],
    ];
    const rows = clients.map(([name, email, count]) => `<tr><td>${name}</td><td>${email}</td><td>${count}</td></tr>`).join("");
    return `<div class="card"><h2>Clients</h2><table><thead><tr><th>Name</th><th>Email</th><th>History</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },
  Reports: () => {
    const months = [["August", 62], ["September", 74], ["October", 81], ["November", 58]];
    const bars = months.map(([month, percent]) => `<div class="label">${month}</div><div class="bar"><span style="width:${percent}%"></span></div>`).join("");
    return `
    <div class="row">
      <div class="card"><h2>Revenue by month</h2>${bars}</div>
      <div class="card"><h2>Top clients</h2><table><tbody><tr><td>Pine &amp; Pixel Studio</td><td>$9,800</td></tr><tr><td>Harbor Coffee Co.</td><td>$7,420</td></tr><tr><td>Okafor Legal</td><td>$6,450</td></tr><tr><td>Brightwater Yoga</td><td>$3,960</td></tr></tbody></table></div>
    </div>
    <div class="card"><h2>Average days to pay</h2><div class="stat">18 days</div><div class="label">Down from 23 days last quarter</div></div>`;
  },
  Payments: () => `
    <div class="row">
      <div class="card"><div class="label">Next payout</div><div class="stat">$2,980.00</div><div class="label">Arrives Nov 26</div></div>
      <div class="card"><div class="label">Connected account</div><div class="stat">•••• 4821</div><div class="label">Checking, First Harbor Bank</div></div>
    </div>
    <div class="card"><h2>Payout history</h2><table><thead><tr><th>Date</th><th>Amount</th><th>Account</th></tr></thead><tbody>
      <tr><td>Nov 19</td><td>$4,110.00</td><td>•••• 4821</td></tr><tr><td>Nov 12</td><td>$1,875.00</td><td>•••• 4821</td></tr>
      <tr><td>Nov 05</td><td>$3,260.00</td><td>•••• 4821</td></tr><tr><td>Oct 29</td><td>$2,040.00</td><td>•••• 4821</td></tr></tbody></table></div>`,
  Settings: () => `
    <div class="card"><h2>Business details</h2>
      <div class="field"><label>Business name</label><input value="Ledgerly Demo LLC"></div>
      <div class="field"><label>Billing email</label><input value="billing@example.com"></div>
      <div class="field"><label>Default payment terms</label><input value="Net 30"></div>
    </div>
    <div class="card"><h2>Invoice numbering</h2><div class="field"><label>Next invoice number</label><input value="INV-1043"></div></div>`,
};

// The title, subtitle, and primary action of each screen kind.
const SCREEN_HEADERS = {
  Overview: ["Overview", "Your business at a glance", "New invoice"],
  Invoices: ["Invoices", "21 invoices this quarter", "New invoice"],
  Clients: ["Clients", "6 active clients", "Add client"],
  Reports: ["Reports", "Q4 so far", "Export CSV"],
  Payments: ["Payments", "Payouts to your bank", "Request payout"],
  Settings: ["Settings", "Business and invoice defaults", "Save changes"],
};

/**
 * The sets. Each lists its screens in tile order, and for each screen the extra CSS that only that
 * screen gets (empty for every screen that follows the pattern). Tile numbers on the sheet are the
 * 1-based order here.
 */
const SETS = {
  "set-a": {
    screens: ["Overview", "Invoices", "Clients", "Reports", "Payments", "Settings"],
    // Tile 4: the primary button is a different component style (outlined pill, green).
    extraCss: { 4: ".btn { background: #fff; color: #1f7a4d; border: 2px solid #1f7a4d; border-radius: 999px; padding: 8px 22px; }" },
  },
  "set-b": {
    screens: ["Invoices", "Payments", "Overview", "Settings", "Clients", "Reports"],
    // Tile 2: the content column starts 32 px further right and is narrower than on the others.
    extraCss: { 2: ".main { padding-left: 72px; padding-right: 72px; }" },
  },
  "set-c": {
    screens: ["Reports", "Overview", "Clients", "Payments", "Invoices", "Settings"],
    // Tile 5: headings come from another type scale (smaller, lighter page title, larger section headings).
    extraCss: { 5: "h1 { font-size: 22px; font-weight: 600; letter-spacing: 0; } h2 { font-size: 20px; font-weight: 700; }" },
  },
  "set-d": {
    screens: ["Settings", "Reports", "Invoices", "Overview", "Clients"],
    // The clean set: no screen breaks the pattern.
    extraCss: {},
  },
};

/** Returns the HTML of one screen, with any extra CSS that screen gets. */
function screenHtml(screenKind, extraCss) {
  const [title, subtitle, action] = SCREEN_HEADERS[screenKind];
  const extraStyle = extraCss === undefined ? "" : `<style>${extraCss}</style>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title} - Ledgerly</title>
<link rel="stylesheet" href="../base.css">${extraStyle}</head>
<body><div class="app">${sidebar(screenKind)}<main class="main">
<div class="topbar"><div><h1>${title}</h1><div class="sub">${subtitle}</div></div><button class="btn">${action}</button></div>
${SCREEN_BODIES[screenKind]()}
</main></div></body></html>
`;
}

mkdirSync(join(SPIKE_DIRECTORY, "sets"), { recursive: true });
writeFileSync(join(SPIKE_DIRECTORY, "sets", "base.css"), BASE_CSS.trimStart());
for (const [setName, set] of Object.entries(SETS)) {
  const setDirectory = join(SPIKE_DIRECTORY, "sets", setName);
  mkdirSync(setDirectory, { recursive: true });
  set.screens.forEach((screenKind, index) => {
    const tileNumber = index + 1;
    const html = screenHtml(screenKind, set.extraCss[tileNumber]);
    writeFileSync(join(setDirectory, `screen-${tileNumber}.html`), html);
  });
  console.log(`wrote ${setName}: ${set.screens.length} screens`);
}
