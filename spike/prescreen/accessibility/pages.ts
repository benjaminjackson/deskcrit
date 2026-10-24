// The twelve throwaway page pairs for the accessibility pre-screen (crit-q25.17). Each page is
// written once as a function of one flag, `defect`, so the positive and negative pages of a pair
// differ only in the defect. Disposable spike code: these pages are not fixtures and never go
// under packs/.

/** One page pair: the candidate it tests, its name, and its HTML with or without the defect. */
export type PrescreenPage = {
  candidate: string;
  name: string;
  html: (defect: boolean) => string;
};

/** The shared head: the Inter and Source Serif 4 fonts from the packs renderer, and a reset. */
function head(extraCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 400; src: url("inter-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Inter"; font-weight: 700; src: url("inter-latin-700-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Source Serif 4"; font-weight: 400; src: url("source-serif-4-latin-400-normal.woff2") format("woff2"); font-display: block; }
@font-face { font-family: "Source Serif 4"; font-weight: 700; src: url("source-serif-4-latin-700-normal.woff2") format("woff2"); font-display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1280px; height: 800px; overflow: hidden; }
body { font-family: "Inter"; font-size: 16px; line-height: 1.5; color: #1f2328; background: #ffffff; }
.bar { height: 64px; display: flex; align-items: center; gap: 28px; padding: 0 48px; border-bottom: 1px solid #d0d7de; font-size: 15px; }
.bar .logo { font-weight: 700; font-size: 18px; margin-right: auto; }
.bar a { color: #1f2328; text-decoration: none; }
.button { display: inline-block; border: none; border-radius: 6px; padding: 11px 20px; font: 700 15px "Inter"; background: #1f6feb; color: #ffffff; }
label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
input[type=text] { display: block; width: 100%; height: 42px; padding: 0 12px; font: 15px "Inter"; border-radius: 6px; background: #ffffff; color: #1f2328; }
input::placeholder { color: #8c959f; }
.field { margin-bottom: 18px; }
${extraCss}
</style></head><body>`;
}

/** A top bar with a logo, menu links, and an optional button. */
function topBar(logo: string, links: string[], button: string | null): string {
  let html = `<div class="bar"><span class="logo">${logo}</span>`;
  for (const link of links) {
    html += `<a>${link}</a>`;
  }
  if (button !== null) {
    html += `<span class="button">${button}</span>`;
  }
  return `${html}</div>`;
}

/** The colour of a control border: very pale on the defect side, a clear mid grey otherwise. */
function controlBorder(defect: boolean, paleColour: string): string {
  if (defect) {
    return paleColour;
  }
  return "#6e7781";
}

/** A text field, with its label outside the field unless `placeholderOnly` is true. */
function textField(
  label: string,
  placeholder: string,
  placeholderOnly: boolean,
  style: string,
): string {
  let html = `<div class="field">`;
  if (!placeholderOnly) {
    html += `<label>${label}</label>`;
  }
  html += `<input type="text" placeholder="${placeholder}" style="${style}"></div>`;
  return html;
}

/** A link inside running text: coloured on both sides, underlined only on the clean side. */
function inlineLink(text: string, defect: boolean, colour: string): string {
  let decoration = "underline";
  if (defect) {
    decoration = "none";
  }
  return `<a style="color:${colour};text-decoration:${decoration};text-underline-offset:2px">${text}</a>`;
}

/** Pair 1 of non-text-contrast-faint: a sign-up form on white with inputs and a checkbox. */
function faintSignup(defect: boolean): string {
  const border = controlBorder(defect, "#eef0f2");
  const inputStyle = `border:1px solid ${border}`;
  return `${head(`
.wrap { display: flex; gap: 96px; padding: 64px 120px; }
.pitch { width: 460px; padding-top: 24px; }
.pitch h1 { font-size: 40px; line-height: 1.15; margin-bottom: 18px; }
.pitch p { color: #57606a; font-size: 18px; }
.form { width: 420px; }
.form h2 { font-size: 22px; margin-bottom: 22px; }
.check { display: flex; align-items: center; gap: 10px; font-size: 14px; margin: 6px 0 24px; }
.box { width: 18px; height: 18px; border: 1px solid ${border}; border-radius: 4px; background: #ffffff; }
`)}
${topBar("Fieldnote", ["Product", "Pricing", "Customers", "Sign in"], null)}
<div class="wrap">
  <div class="pitch"><h1>Notes that keep up with your field team</h1><p>Capture site visits, photos, and signatures offline, and sync them the moment you are back in range. Free for teams of up to five.</p></div>
  <div class="form"><h2>Create your account</h2>
    ${textField("Full name", "", false, inputStyle)}
    ${textField("Work email", "", false, inputStyle)}
    ${textField("Company", "", false, inputStyle)}
    ${textField("Password", "", false, inputStyle)}
    <div class="check"><span class="box"></span>Send me product updates once a month</div>
    <span class="button">Create account</span>
  </div>
</div></body></html>`;
}

/** Pair 2 of non-text-contrast-faint: a settings page on light grey with white inputs. */
function faintSettings(defect: boolean): string {
  const border = controlBorder(defect, "#e6e8eb");
  const inputStyle = `border:1px solid ${border}`;
  return `${head(`
body { background: #f6f7f9; }
.bar { background: #ffffff; }
.wrap { display: flex; gap: 48px; padding: 40px 80px; }
.side { width: 220px; font-size: 15px; }
.side div { padding: 8px 12px; border-radius: 6px; }
.side .on { background: #e7ecf3; font-weight: 700; }
.main { width: 640px; }
.main h1 { font-size: 26px; margin-bottom: 6px; }
.main .lead { color: #57606a; margin-bottom: 28px; }
.row { display: flex; gap: 20px; }
.row .field { flex: 1; }
.select { height: 42px; border: 1px solid ${border}; border-radius: 6px; background: #ffffff; padding: 9px 12px; font-size: 15px; }
.toggle { display: flex; align-items: center; gap: 12px; margin: 8px 0 28px; font-size: 15px; }
.switch { width: 40px; height: 22px; border-radius: 11px; border: 1px solid ${border}; background: #ffffff; position: relative; }
.switch::after { content: ""; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: ${border}; }
`)}
${topBar("Ledgerly", ["Dashboard", "Invoices", "Clients", "Reports"], null)}
<div class="wrap">
  <div class="side"><div class="on">Profile</div><div>Business details</div><div>Payments</div><div>Notifications</div><div>Team</div></div>
  <div class="main"><h1>Profile</h1><p class="lead">This information appears on the invoices you send.</p>
    <div class="row">${textField("First name", "", false, inputStyle)}${textField("Last name", "", false, inputStyle)}</div>
    ${textField("Email", "", false, inputStyle)}
    ${textField("Phone", "", false, inputStyle)}
    <div class="field"><label>Time zone</label><div class="select">Europe/London (GMT+1)</div></div>
    <div class="toggle"><span class="switch"></span>Show my phone number on invoices</div>
    <span class="button">Save changes</span>
  </div>
</div></body></html>`;
}

/** Pair 1 of meaning-by-colour-only: a blog article with links inside its paragraphs. */
function linksArticle(defect: boolean): string {
  const blue = "#1f6feb";
  return `${head(`
.article { width: 680px; margin: 48px auto; }
.article .meta { color: #57606a; font-size: 14px; margin-bottom: 10px; }
.article h1 { font-size: 36px; line-height: 1.2; margin-bottom: 24px; }
.article p { font-family: "Source Serif 4"; font-size: 19px; line-height: 1.6; margin-bottom: 20px; }
`)}
${topBar("The Allotment", ["Growing", "Recipes", "Tools", "Subscribe"], null)}
<div class="article"><div class="meta">Growing guides · 6 min read</div>
<h1>Starting tomatoes indoors in March</h1>
<p>The trick with early tomatoes is light, not heat. A sunny windowsill gives seedlings about half of what they need, which is why so many end up tall and pale. If you have the space, a ${inlineLink("cheap shop light on a timer", defect, blue)} will do more for them than any heated propagator.</p>
<p>Sow two seeds to a small pot in ${inlineLink("peat-free compost", defect, blue)}, cover them lightly, and keep the surface damp but never wet. Most varieties come up within a week. Once the first true leaves open, pull out the weaker seedling so the stronger one has the pot to itself.</p>
<p>When the nights stay above ten degrees, start ${inlineLink("hardening them off", defect, blue)} by putting them outside for a few hours each day. After a fortnight they are ready for the greenhouse or a warm, sheltered bed.</p>
</div></body></html>`;
}

/** Pair 2 of meaning-by-colour-only: a help centre article with links in a teal colour. */
function linksHelp(defect: boolean): string {
  const teal = "#0f766e";
  return `${head(`
body { background: #fbfbfa; }
.wrap { display: flex; gap: 56px; padding: 40px 96px; }
.side { width: 240px; font-size: 14px; color: #57606a; }
.side h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #1f2328; margin-bottom: 10px; }
.side div { padding: 6px 0; }
.main { width: 720px; }
.main .crumbs { font-size: 13px; color: #57606a; margin-bottom: 14px; }
.main h1 { font-size: 30px; margin-bottom: 20px; }
.main p { font-size: 16px; line-height: 1.65; margin-bottom: 18px; }
`)}
${topBar("Parcelpoint Help", ["Sending", "Tracking", "Returns", "Contact us"], null)}
<div class="wrap">
  <div class="side"><h3>Returns</h3><div>Start a return</div><div>Refund times</div><div>Return labels</div><div>Items we cannot take back</div></div>
  <div class="main"><div class="crumbs">Help centre / Returns</div><h1>How long does a refund take?</h1>
    <p>Once your parcel reaches our returns hub, we check it within two working days. You can follow each step on the ${inlineLink("tracking page", defect, teal)} with the reference number from your return label.</p>
    <p>After the check, we send the refund to the card or account you paid with. Most banks show it within three to five working days, but some take up to ten. If you paid with a gift card, the balance goes back on the card straight away. See ${inlineLink("refunds to gift cards", defect, teal)} for details.</p>
    <p>If more than fourteen days have passed since we received your parcel and you still have no refund, ${inlineLink("send us a message", defect, teal)} and include your return reference. We reply within one working day.</p>
  </div>
</div></body></html>`;
}

/** Pair 1 of field-label-placeholder-only: a sign-in card. */
function placeholderLogin(defect: boolean): string {
  const inputStyle = "border:1px solid #8c959f";
  return `${head(`
body { background: #f3f4f6; }
.card { width: 420px; margin: 96px auto 0; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.card .logo { font-weight: 700; font-size: 20px; margin-bottom: 24px; }
.card h1 { font-size: 24px; margin-bottom: 8px; }
.card p { color: #57606a; font-size: 15px; margin-bottom: 26px; }
.card .button { width: 100%; text-align: center; margin-top: 6px; }
.card .foot { margin-top: 20px; text-align: center; font-size: 14px; color: #57606a; }
`)}
<div class="card"><div class="logo">Tidepool</div><h1>Sign in</h1><p>Welcome back. Sign in to see your bookings.</p>
  ${textField("Email address", "Email address", defect, inputStyle)}
  ${textField("Password", "Password", defect, inputStyle)}
  <span class="button">Sign in</span>
  <div class="foot">New to Tidepool? Create an account</div>
</div></body></html>`;
}

/** Pair 2 of field-label-placeholder-only: a checkout shipping address form. */
function placeholderCheckout(defect: boolean): string {
  const inputStyle = "border:1px solid #8c959f";
  return `${head(`
.wrap { display: flex; gap: 72px; padding: 40px 120px; }
.form { width: 560px; }
.form h1 { font-size: 26px; margin-bottom: 6px; }
.form .step { color: #57606a; font-size: 14px; margin-bottom: 24px; }
.row { display: flex; gap: 16px; }
.row .field { flex: 1; }
.summary { width: 360px; background: #f6f8fa; border-radius: 10px; padding: 24px; font-size: 15px; }
.summary h2 { font-size: 18px; margin-bottom: 16px; }
.line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #d0d7de; }
.total { font-weight: 700; border-bottom: none; }
`)}
${topBar("Kettle &amp; Crumb", ["Shop", "Subscriptions", "Our story"], null)}
<div class="wrap">
  <div class="form"><h1>Shipping address</h1><div class="step">Step 1 of 3</div>
    <div class="row">${textField("First name", "First name", defect, inputStyle)}${textField("Last name", "Last name", defect, inputStyle)}</div>
    ${textField("Street address", "Street address", defect, inputStyle)}
    <div class="row">${textField("City", "City", defect, inputStyle)}${textField("Postcode", "Postcode", defect, inputStyle)}</div>
    ${textField("Phone number", "Phone number", defect, inputStyle)}
    <span class="button">Continue to delivery</span>
  </div>
  <div class="summary"><h2>Your order</h2>
    <div class="line"><span>House blend, 1 kg</span><span>£18.00</span></div>
    <div class="line"><span>Shortbread tin</span><span>£7.50</span></div>
    <div class="line"><span>Delivery</span><span>£3.95</span></div>
    <div class="line total"><span>Total</span><span>£29.45</span></div>
  </div>
</div></body></html>`;
}

/** A field marked as wrong with a red border, and a written message below it on the clean side. */
function errorField(
  label: string,
  value: string,
  message: string,
  defect: boolean,
): string {
  let html = `<div class="field"><label>${label}</label><input type="text" value="${value}" style="border:2px solid #cf222e">`;
  if (!defect) {
    html += `<div style="color:#cf222e;font-size:14px;margin-top:6px">${message}</div>`;
  }
  return `${html}</div>`;
}

/** Pair 1 of error-without-text: a newsletter sign-up form after a failed submit. */
function errorSignup(defect: boolean): string {
  const inputStyle = "border:1px solid #8c959f";
  return `${head(`
.wrap { width: 520px; margin: 56px auto; }
.wrap h1 { font-size: 30px; margin-bottom: 10px; }
.wrap p { color: #57606a; margin-bottom: 28px; }
`)}
${topBar("Northbound Runs", ["Races", "Training plans", "Clubs"], null)}
<div class="wrap"><h1>Enter the Riverside 10K</h1><p>Sunday 14 June, 9:00. Entry closes on 31 May.</p>
  ${textField("Full name", "", false, inputStyle).replace('placeholder=""', 'value="Sam Okafor"')}
  ${errorField("Email", "sam.okafor@", "Enter an email address in the form name@example.com", defect)}
  ${textField("Club (optional)", "", false, inputStyle).replace('placeholder=""', 'value="Riverside Harriers"')}
  <span class="button">Enter race</span>
</div></body></html>`;
}

/** Pair 2 of error-without-text: a card payment form after a failed submit. */
function errorPayment(defect: boolean): string {
  const inputStyle = "border:1px solid #8c959f";
  return `${head(`
body { background: #f6f8fa; }
.card { width: 480px; margin: 48px auto; background: #ffffff; border-radius: 12px; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.card h1 { font-size: 22px; margin-bottom: 6px; }
.card .amount { color: #57606a; margin-bottom: 24px; }
.row { display: flex; gap: 16px; }
.row .field { flex: 1; }
.card .button { width: 100%; text-align: center; }
`)}
${topBar("Studio Lumen", ["Classes", "Memberships", "Gift cards"], null)}
<div class="card"><h1>Pay for your membership</h1><div class="amount">Monthly membership · £42.00</div>
  ${textField("Name on card", "", false, inputStyle).replace('placeholder=""', 'value="Priya Shah"')}
  ${errorField("Card number", "4929 1234 5678", "The card number is too short. Enter all 16 digits", defect)}
  <div class="row">${textField("Expiry date", "", false, inputStyle).replace('placeholder=""', 'value="08 / 28"')}${textField("Security code", "", false, inputStyle).replace('placeholder=""', 'value="123"')}</div>
  <span class="button">Pay £42.00</span>
</div></body></html>`;
}

/** The bar heights of the sales chart, as a share of the chart height. */
const SALES_SHARES = [0.42, 0.55, 0.48, 0.63, 0.71, 0.66, 0.82, 0.9];

/** The month names under the sales chart bars. */
const SALES_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

/** Pair 1 of chart-without-text: a shop dashboard with a bar chart of monthly sales. */
function chartBars(defect: boolean): string {
  const chartLeft = 70;
  const chartBottom = 300;
  const chartHeight = 260;
  let svg = `<svg width="720" height="340" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="13" fill="#57606a">`;
  for (let index = 0; index < SALES_SHARES.length; index++) {
    const height = Math.round(SALES_SHARES[index] * chartHeight);
    const x = chartLeft + 20 + index * 78;
    svg += `<rect x="${x}" y="${chartBottom - height}" width="44" height="${height}" rx="3" fill="#1f6feb"/>`;
    if (!defect) {
      svg += `<text x="${x + 22}" y="${chartBottom + 22}" text-anchor="middle">${SALES_MONTHS[index]}</text>`;
    }
  }
  svg += `<line x1="${chartLeft}" y1="${chartBottom}" x2="700" y2="${chartBottom}" stroke="#d0d7de"/>`;
  if (!defect) {
    const ticks = ["£0", "£5k", "£10k", "£15k"];
    for (let index = 0; index < ticks.length; index++) {
      const y = chartBottom - (index * chartHeight) / 3;
      svg += `<text x="${chartLeft - 12}" y="${y + 4}" text-anchor="end">${ticks[index]}</text>`;
      svg += `<line x1="${chartLeft}" y1="${y}" x2="700" y2="${y}" stroke="#eaeef2"/>`;
    }
    svg += `<text x="20" y="20" font-weight="700" fill="#1f2328">Sales per month, 2026</text>`;
  }
  svg += "</svg>";
  return `${head(`
body { background: #f6f8fa; }
.bar { background: #ffffff; }
.wrap { padding: 32px 64px; }
.wrap h1 { font-size: 26px; margin-bottom: 20px; }
.tiles { display: flex; gap: 20px; margin-bottom: 20px; }
.tile { flex: 1; background: #ffffff; border: 1px solid #d0d7de; border-radius: 10px; padding: 18px 20px; }
.tile .k { color: #57606a; font-size: 14px; }
.tile .v { font-size: 26px; font-weight: 700; }
.panel { display: flex; gap: 20px; }
.chart { background: #ffffff; border: 1px solid #d0d7de; border-radius: 10px; padding: 20px; }
.list { flex: 1; background: #ffffff; border: 1px solid #d0d7de; border-radius: 10px; padding: 20px; font-size: 14px; }
.list div { padding: 7px 0; border-bottom: 1px solid #eaeef2; }
`)}
${topBar("Shopfront", ["Overview", "Orders", "Products", "Customers"], null)}
<div class="wrap"><h1>Overview</h1>
  <div class="tiles"><div class="tile"><div class="k">Orders this month</div><div class="v">1,284</div></div><div class="tile"><div class="k">Average order</div><div class="v">£36.20</div></div><div class="tile"><div class="k">Returning customers</div><div class="v">41%</div></div></div>
  <div class="panel"><div class="chart">${svg}</div>
  <div class="list"><b>Recent orders</b><div>#10482 · £54.00</div><div>#10481 · £18.50</div><div>#10480 · £92.10</div><div>#10479 · £27.00</div><div>#10478 · £40.75</div></div></div>
</div></body></html>`;
}

/** The points of the two series in the traffic chart, as shares of the chart height. */
const VISITS_SHARES = [0.35, 0.42, 0.4, 0.55, 0.61, 0.58, 0.7, 0.76, 0.72, 0.85];
const SIGNUPS_SHARES = [0.12, 0.15, 0.14, 0.2, 0.26, 0.24, 0.3, 0.33, 0.35, 0.41];

/** Turn a list of shares into an SVG polyline points string. */
function polylinePoints(shares: number[], left: number, bottom: number, height: number, step: number): string {
  const points: string[] = [];
  for (let index = 0; index < shares.length; index++) {
    const x = left + index * step;
    const y = Math.round(bottom - shares[index] * height);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

/** Pair 2 of chart-without-text: an analytics page with a two-line chart. */
function chartLines(defect: boolean): string {
  const left = 70;
  const bottom = 340;
  const height = 300;
  const step = 82;
  let svg = `<svg width="860" height="390" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="13" fill="#57606a">`;
  if (!defect) {
    const ticks = ["0", "2,000", "4,000", "6,000"];
    for (let index = 0; index < ticks.length; index++) {
      const y = bottom - (index * height) / 3;
      svg += `<text x="${left - 12}" y="${y + 4}" text-anchor="end">${ticks[index]}</text>`;
      svg += `<line x1="${left}" y1="${y}" x2="${left + 9 * step}" y2="${y}" stroke="#eaeef2"/>`;
    }
    for (let index = 0; index < VISITS_SHARES.length; index++) {
      svg += `<text x="${left + index * step}" y="${bottom + 22}" text-anchor="middle">Week ${index + 1}</text>`;
    }
  }
  svg += `<line x1="${left}" y1="${bottom}" x2="${left + 9 * step}" y2="${bottom}" stroke="#d0d7de"/>`;
  svg += `<polyline points="${polylinePoints(VISITS_SHARES, left, bottom, height, step)}" fill="none" stroke="#1f6feb" stroke-width="3"/>`;
  svg += `<polyline points="${polylinePoints(SIGNUPS_SHARES, left, bottom, height, step)}" fill="none" stroke="#e16f24" stroke-width="3"/>`;
  svg += "</svg>";
  let legend = "";
  if (!defect) {
    legend = `<div class="legend"><span><i style="background:#1f6feb"></i>Visits</span><span><i style="background:#e16f24"></i>Sign-ups</span></div>`;
  }
  return `${head(`
body { background: #ffffff; }
.wrap { display: flex; gap: 40px; padding: 32px 56px; }
.side { width: 200px; font-size: 15px; }
.side div { padding: 8px 12px; border-radius: 6px; }
.side .on { background: #eef2f7; font-weight: 700; }
.main { flex: 1; }
.main h1 { font-size: 26px; margin-bottom: 4px; }
.main .lead { color: #57606a; margin-bottom: 20px; }
.legend { display: flex; gap: 24px; font-size: 14px; margin-bottom: 8px; }
.legend i { display: inline-block; width: 14px; height: 4px; margin-right: 8px; vertical-align: middle; }
`)}
${topBar("Beacon Analytics", ["Sites", "Reports", "Settings"], null)}
<div class="wrap">
  <div class="side"><div class="on">Traffic</div><div>Sources</div><div>Pages</div><div>Goals</div></div>
  <div class="main"><h1>Traffic</h1><div class="lead">The last ten weeks for gardenkit.co.uk</div>${legend}${svg}</div>
</div></body></html>`;
}

/** The style of the running text: italic or underlined on the defect side, upright and plain otherwise. */
function runningTextStyle(defect: boolean, defectStyle: string): string {
  if (defect) {
    return defectStyle;
  }
  return "font-style:normal;text-decoration:none";
}

/**
 * Pair 1 of running-text-italic-or-underlined: a magazine essay set in italic. The packs renderer
 * has no italic font file, so Chromium slants the upright face to make the italic.
 */
function italicEssay(defect: boolean): string {
  const style = runningTextStyle(defect, "font-style:italic");
  return `${head(`
.article { width: 700px; margin: 44px auto; }
.article .meta { color: #57606a; font-size: 14px; margin-bottom: 10px; }
.article h1 { font-family: "Source Serif 4"; font-size: 40px; line-height: 1.15; margin-bottom: 24px; }
.article p { font-family: "Source Serif 4"; font-size: 19px; line-height: 1.6; margin-bottom: 20px; }
`)}
${topBar("Longhand", ["Essays", "Fiction", "Archive", "Subscribe"], null)}
<div class="article"><div class="meta">Essay · By Ruth Adeyemi</div><h1>The house my grandmother built twice</h1>
<p style="${style}">The first house went in the flood of 1968, and she never talked about it. What she talked about was the second one: the bricks she carried from the yard on the hill, the window frames her brother made from a church pew, and the way the kitchen faced east so that she could watch the light come up over the river she no longer trusted.</p>
<p style="${style}">I grew up in that kitchen. By then the river had been walled in and the town had moved on, but she still checked the water level every morning, the way other people check the weather. It took me twenty years to understand that the house was not a home to her. It was an argument, and she meant to win it.</p>
</div></body></html>`;
}

/** Pair 2 of running-text-italic-or-underlined: a charity about page with underlined paragraphs. */
function underlinedAbout(defect: boolean): string {
  const style = runningTextStyle(defect, "text-decoration:underline;text-underline-offset:3px");
  return `${head(`
.hero { background: #fdf6ec; padding: 48px 120px; }
.hero h1 { font-size: 38px; margin-bottom: 8px; }
.hero .sub { color: #57606a; font-size: 18px; }
.body { display: flex; gap: 64px; padding: 40px 120px; }
.text { width: 640px; }
.text p { font-size: 17px; line-height: 1.65; margin-bottom: 18px; }
.facts { width: 300px; font-size: 15px; }
.facts div { padding: 12px 0; border-bottom: 1px solid #d0d7de; }
.facts b { display: block; font-size: 24px; }
`)}
${topBar("Open Shelf", ["About", "Our libraries", "Volunteer"], "Donate")}
<div class="hero"><h1>About Open Shelf</h1><div class="sub">Free books for every child in the valley</div></div>
<div class="body"><div class="text">
<p style="${style}">Open Shelf began in 2014 with one bookcase in the waiting room of a village surgery. Parents took books home for their children and brought them back, or brought others in their place. Within a year the bookcase was full every Monday and empty by Friday.</p>
<p style="${style}">Today we run forty little libraries in schools, cafés, launderettes, and bus shelters across the valley. Every book is donated, and every library is looked after by a volunteer who lives nearby. We never ask for a card, a name, or a return date.</p>
</div><div class="facts"><div><b>40</b>little libraries</div><div><b>12,000</b>books given each year</div><div><b>85</b>volunteers</div></div></div>
</body></html>`;
}

/** Every pair, in candidate order. */
export const PRESCREEN_PAGES: PrescreenPage[] = [
  { candidate: "non-text-contrast-faint", name: "faint-signup", html: faintSignup },
  { candidate: "non-text-contrast-faint", name: "faint-settings", html: faintSettings },
  { candidate: "meaning-by-colour-only", name: "links-article", html: linksArticle },
  { candidate: "meaning-by-colour-only", name: "links-help", html: linksHelp },
  { candidate: "field-label-placeholder-only", name: "placeholder-login", html: placeholderLogin },
  { candidate: "field-label-placeholder-only", name: "placeholder-checkout", html: placeholderCheckout },
  { candidate: "error-without-text", name: "error-signup", html: errorSignup },
  { candidate: "error-without-text", name: "error-payment", html: errorPayment },
  { candidate: "chart-without-text", name: "chart-bars", html: chartBars },
  { candidate: "chart-without-text", name: "chart-lines", html: chartLines },
  { candidate: "running-text-italic-or-underlined", name: "italic-essay", html: italicEssay },
  { candidate: "running-text-italic-or-underlined", name: "underlined-about", html: underlinedAbout },
];
