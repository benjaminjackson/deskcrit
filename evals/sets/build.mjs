// Writes the screen-N.html files of the ten EV-21 sets (crit-j8y.8, version 2) from the data below.
// Every screen of a set shares one theme, one nav, and one icon for each meaning, and each screen's title is
// the label of its active nav item. The only difference inside a set is its planted break in PLANTED_BREAKS,
// which must match evals/sets/answers.json. Run `node evals/sets/render.mjs` after this to make the PNGs.
// It uses Node's own modules only.
// Usage: node evals/sets/build.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SETS_DIRECTORY = import.meta.dirname;
const MUTED_COLOR = "#5d6677";
const INTER_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const GEORGIA_FONT = "Georgia, 'Times New Roman', serif";
const HELVETICA_FONT = "'Helvetica Neue', Arial, sans-serif";

// The inner markup of each 24 x 24 line icon, keyed by what the icon means. Each meaning has one shape.
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  boat: '<path d="M3 15h18l-2 5H5zM12 3v12M12 4l6 8h-6"/>',
  wave: '<path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5zM16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.4.6 4 2.4 4 5.5"/>',
  sliders:
    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
  document: '<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  shop: '<path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M10 20v-6h4v6"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15zM5 19l8-8"/>',
  note: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M19 19v2H6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  share:
    '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>',
  calendar: '<path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4"/>',
  jar: '<path d="M8 3h8v3H8zM7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9zM6 12h12"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  clipboard: '<path d="M8 4h8v3H8zM6 5H5v16h14V5h-1M9 12h6M9 16h6"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  wallet: '<path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13h1"/>',
  transfer: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  card: '<path d="M3 6h18v12H3zM3 10h18M7 15h4"/>',
};

// The planted break of each set: the screen it is on and what it changes. This must match answers.json.
const PLANTED_BREAKS = {
  "set-01": { screen: 4, theme: { buttonRadius: 12 } },
  "set-02": { screen: 3, theme: { mainPaddingLeft: 48, innerMaxWidth: 960 } },
  "set-03": { screen: 5, theme: { titleSize: 28, headingSize: 18 } },
  "set-04": { screen: 2, theme: { accent: "#16897d", accentSoft: "#e1f2f0" } },
  "set-05": { screen: 3, theme: { iconStyle: "filled" } },
  "set-06": { screen: 4, theme: { navPlace: "top" } },
  "set-07": { screen: 3, navLabels: { 1: "Workspaces" } },
};

// The theme every set starts from; each set overrides some of these values.
const BASE_THEME = {
  font: INTER_FONT,
  accent: "#0b6e8a",
  accentSoft: "#e0f1f5",
  titleSize: 32,
  headingSize: 20,
  mainPaddingLeft: 40,
  innerMaxWidth: 1000,
  cardRadius: 8,
  buttonRadius: 6,
  inputRadius: 6,
  iconStyle: "outline",
  navPlace: "side",
};

// The ten products. Each screen lists its blocks in order; the title is always the active nav label.
const SETS = {
  "set-01": {
    brand: "Tidewise",
    theme: { accent: "#0b6e8a", accentSoft: "#e0f1f5" },
    nav: [
      ["Trips", "compass"],
      ["Boats", "boat"],
      ["Tides", "wave"],
      ["Crew", "users"],
      ["Settings", "sliders"],
      ["Alerts", "bell"],
    ],
    screens: [
      {
        sub: "Today's departures from Harbor Pier",
        blocks: [
          ["stats", [["Trips this week", "12", "+3 from last week"], ["Boats free today", "4", "of 9"], ["Crew on shift", "7", "2 on call"]]],
          ["heading", "Departures"],
          ["table", ["Trip", "Boat", "Status", "Departs"], [["Morning fishing", "Sea Wren", "Confirmed", "06:30"], ["Island loop", "Calla", "Pending", "09:15"], ["Sunset sail", "Marigold", "Confirmed", "17:45"], ["Seal watching", "Sea Wren", "Confirmed", "Tomorrow 08:00"]]],
        ],
      },
      {
        sub: "Your fleet and where each boat is berthed",
        blocks: [
          ["actions", "Add boat", "Export list"],
          ["heading", "Fleet"],
          ["table", ["Boat", "Berth", "Status", "Seats"], [["Sea Wren", "North slip", "In use", "12"], ["Calla", "South slip", "Free", "8"], ["Marigold", "North slip", "Free", "16"], ["Petrel", "Dry dock", "Repair", "10"]]],
        ],
      },
      {
        sub: "Low and high water for the next five days",
        blocks: [
          ["stats", [["Next low tide", "13:42", "0.4 m"], ["Next high tide", "19:58", "3.1 m"], ["Range today", "2.7 m", "spring tides"]]],
          ["heading", "Conditions"],
          ["cards", [["wave", "Tide window", "North slip usable from 11:30 to 16:00"], ["wind", "Wind", "12 knots from the southwest, easing by evening"], ["sun", "Daylight", "Sunrise 05:02, sunset 21:14"]]],
        ],
      },
      {
        sub: "Skippers and deckhands on the rota",
        blocks: [
          ["heading", "Add a crew member"],
          ["form", [["Name", "Priya Nair"], ["Role", "Deckhand"], ["Phone", "555 0187"], ["Certificate", "Day skipper"]], "Add crew member"],
        ],
      },
      {
        sub: "Notifications and booking rules",
        blocks: [
          ["heading", "Notifications"],
          ["toggles", [["Email me when a trip is confirmed", true], ["Text me about weather holds", true], ["Show tide times in feet", false], ["Allow same-day bookings", true]]],
        ],
      },
      {
        sub: "Recent changes to your bookings",
        blocks: [
          ["heading", "This week"],
          ["feed", [["Calla moved to the south slip", "Today, 08:10"], ["Island loop is waiting for a deposit", "Yesterday"], ["Crew rota published for June", "Mon"]]],
        ],
      },
    ],
  },
  "set-02": {
    brand: "Ledgerline",
    theme: { accent: "#2c7a4b", accentSoft: "#e5f3ea" },
    nav: [
      ["Overview", "home"],
      ["Invoices", "document"],
      ["Clients", "users"],
      ["Reports", "chart"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "What is owed and what is late this month",
        blocks: [
          ["stats", [["Outstanding", "$18,240", "6 invoices"], ["Overdue", "$3,150", "2 invoices"], ["Paid this month", "$9,870", "+12%"]]],
          ["heading", "Recent invoices"],
          ["table", ["Invoice", "Client", "Status", "Amount"], [["INV-0413", "North Fork Café", "Sent", "$640"], ["INV-0414", "Bellamy & Co", "Overdue", "$2,100"], ["INV-0415", "Studio Orme", "Draft", "$980"], ["INV-0416", "Tarn Outfitters", "Sent", "$1,450"]]],
        ],
      },
      {
        sub: "All invoices, newest first",
        blocks: [
          ["actions", "New invoice", "Export CSV"],
          ["heading", "All invoices"],
          ["table", ["Invoice", "Client", "Status", "Due"], [["INV-0416", "Tarn Outfitters", "Sent", "20 June"], ["INV-0415", "Studio Orme", "Draft", "17 June"], ["INV-0414", "Bellamy & Co", "Overdue", "2 June"], ["INV-0413", "North Fork Café", "Sent", "12 June"]]],
        ],
      },
      {
        sub: "People and companies you bill",
        blocks: [
          ["stats", [["Active clients", "14", "2 new this month"], ["Average days to pay", "18", "3 days faster"], ["Owed by clients", "$18,240", "across 6 clients"]]],
          ["heading", "Clients to watch"],
          ["cards", [["users", "Alder Joinery", "4 invoices, all paid on time"], ["users", "Bellamy & Co", "1 overdue, last reminder 3 days ago"], ["users", "Studio Orme", "New client, first invoice in draft"]]],
        ],
      },
      {
        sub: "Income and late payments by month",
        blocks: [
          ["heading", "Build a report"],
          ["form", [["Report", "Income by client"], ["From", "1 April"], ["To", "30 June"], ["Format", "PDF"]], "Create report"],
        ],
      },
      {
        sub: "Reminders and payment details",
        blocks: [
          ["heading", "Reminders"],
          ["toggles", [["Send a reminder 3 days before due", true], ["Send a reminder when overdue", true], ["Add late fee automatically", false], ["Attach PDF to every email", true]]],
        ],
      },
    ],
  },
  "set-03": {
    brand: "Fernhill",
    theme: { font: GEORGIA_FONT, accent: "#4f7a2a", accentSoft: "#edf3e4", titleSize: 34, headingSize: 22 },
    nav: [
      ["Shop", "shop"],
      ["Orders", "box"],
      ["Plants", "leaf"],
      ["Customers", "users"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "Orders and stock for the greenhouse",
        blocks: [
          ["stats", [["Orders today", "23", "5 not yet packed"], ["Low stock", "8", "plants under 10"], ["Revenue", "$2,310", "this week"]]],
          ["heading", "To pack"],
          ["table", ["Order", "Customer", "Status", "Items"], [["#2201", "M. Okafor", "Packing", "3"], ["#2202", "Tern Cafe", "Ready", "12"], ["#2203", "L. Haines", "Packing", "1"], ["#2204", "Hollis School", "Ready", "30"]]],
        ],
      },
      {
        sub: "Every order, newest first",
        blocks: [
          ["actions", "Print packing slips", "Export"],
          ["heading", "All orders"],
          ["table", ["Order", "Customer", "Status", "Total"], [["#2204", "Hollis School", "Ready", "$412.00"], ["#2203", "L. Haines", "Packing", "$18.50"], ["#2202", "Tern Cafe", "Ready", "$96.00"], ["#2199", "P. Grant", "Shipped", "$54.00"]]],
        ],
      },
      {
        sub: "What is in stock and what is growing on",
        blocks: [
          ["stats", [["Plants listed", "64", "4 new this month"], ["Low stock", "8", "under 10 each"], ["Growing on", "1,200", "ready in July"]]],
          ["heading", "Low stock"],
          ["cards", [["leaf", "Monstera", "14 in stock, restock due Friday"], ["leaf", "Fiddle leaf fig", "6 left, reorder soon"], ["leaf", "Calathea", "4 left, next batch in July"]]],
        ],
      },
      {
        sub: "Your regulars and new sign-ups",
        blocks: [
          ["heading", "Add a customer"],
          ["form", [["Name", "Hollis School"], ["Email", "office@hollis.example"], ["Delivery address", "4 Mill Lane"], ["Account type", "Trade"]], "Add customer"],
        ],
      },
      {
        sub: "Shop and packing preferences",
        blocks: [
          ["heading", "Shop"],
          ["toggles", [["Alert me when stock drops below 10", true], ["Show sold-out plants on the shop page", false], ["Pack orders in recycled boxes", true], ["Print packing slips automatically", true]]],
        ],
      },
    ],
  },
  "set-04": {
    brand: "Quillnote",
    theme: { accent: "#4a46c8", accentSoft: "#ececfa" },
    nav: [
      ["Notes", "note"],
      ["Notebooks", "book"],
      ["Search", "search"],
      ["Shared", "share"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "Everything you wrote this month",
        blocks: [
          ["stats", [["Notes", "312", "+14 this week"], ["Notebooks", "9", "2 shared"], ["Tags", "27", "5 unused"]]],
          ["heading", "Recent notes"],
          ["table", ["Title", "Notebook", "Tag", "Edited"], [["Call with the printer", "Work", "Todo", "Today"], ["Bread dough ratios", "Kitchen", "Ideas", "Yesterday"], ["Trip packing list", "Personal", "Todo", "Mon"], ["Reading: Seeing Like a State", "Reading", "Notes", "Sun"]]],
        ],
      },
      {
        sub: "Group notes by project",
        blocks: [
          ["actions", "New notebook", "Import"],
          ["heading", "All notebooks"],
          ["table", ["Notebook", "Notes", "Sharing", "Edited"], [["Work", "58", "Shared", "Today"], ["Kitchen", "41", "Private", "Yesterday"], ["Reading", "73", "Private", "Sun"], ["Trips", "12", "Shared", "Mon"]]],
        ],
      },
      {
        sub: "Find a note by its words or tags",
        blocks: [
          ["field", "Search notes", "bread"],
          ["heading", "3 results"],
          ["cards", [["note", "Bread dough ratios", "Kitchen, edited yesterday"], ["note", "Sourdough starter log", "Kitchen, edited 12 May"], ["note", "Bakeries to visit", "Trips, edited 3 May"]]],
        ],
      },
      {
        sub: "Notes you share and notes shared with you",
        blocks: [
          ["heading", "Share a note"],
          ["form", [["Note", "Call with the printer"], ["Invite", "sam@example.com"], ["Permission", "Can edit"], ["Message", "Notes from today's call"]], "Send invite"],
        ],
      },
      {
        sub: "Editor and sync preferences",
        blocks: [
          ["heading", "Editor"],
          ["toggles", [["Sync across devices", true], ["Spell check while typing", true], ["Open the last note on launch", false], ["Show word count", true]]],
        ],
      },
    ],
  },
  "set-05": {
    brand: "Marrow",
    theme: { accent: "#c2512a", accentSoft: "#fbece5" },
    nav: [
      ["Recipes", "book"],
      ["Plan", "calendar"],
      ["Pantry", "jar"],
      ["Shopping", "cart"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "Saved and recently cooked",
        blocks: [
          ["stats", [["Saved recipes", "86", "6 new"], ["Cooked this month", "14", "+3 on last month"], ["Favorites", "22", "4 new"]]],
          ["heading", "Recently cooked"],
          ["table", ["Recipe", "Cuisine", "Diet", "Time"], [["Lemon orzo", "Greek", "Vegetarian", "25 min"], ["Black bean tacos", "Mexican", "Vegan", "30 min"], ["Chicken traybake", "British", "Meat", "50 min"], ["Miso soup", "Japanese", "Vegan", "15 min"]]],
        ],
      },
      {
        sub: "What is for dinner this week",
        blocks: [
          ["actions", "Add to plan", "Clear week"],
          ["heading", "This week"],
          ["table", ["Day", "Dinner", "Diet", "Time"], [["Mon", "Lentil dal", "Vegan", "35 min"], ["Tue", "Shakshuka", "Vegetarian", "30 min"], ["Wed", "Roast chicken", "Meat", "75 min"], ["Thu", "Mushroom risotto", "Vegetarian", "45 min"]]],
        ],
      },
      {
        sub: "What you have on the shelf",
        blocks: [
          ["stats", [["Pantry items", "42", "4 expiring"], ["Use this week", "4", "before Friday"], ["Running low", "3", "on your list"]]],
          ["heading", "Shelf"],
          ["cards", [["clock", "Use soon", "Spinach, yogurt, and fresh basil"], ["jar", "Staples", "Rice, lentils, flour, and olive oil"], ["cart", "Running low", "Eggs, butter, and tomatoes are on your list"]]],
        ],
      },
      {
        sub: "Everything you need for the plan",
        blocks: [
          ["heading", "Add an item"],
          ["form", [["Item", "Eggs"], ["Quantity", "12"], ["Aisle", "Dairy"], ["For", "Shakshuka"]], "Add item"],
        ],
      },
      {
        sub: "Servings and diet preferences",
        blocks: [
          ["heading", "Cooking"],
          ["toggles", [["Scale recipes to my servings", true], ["Warn me about allergens", true], ["Suggest recipes from my pantry", true], ["Use metric units", false]]],
        ],
      },
    ],
  },
  "set-06": {
    brand: "Pacehound",
    theme: { accent: "#e0522d", accentSoft: "#fdeae4" },
    nav: [
      ["Runs", "pulse"],
      ["Plans", "clipboard"],
      ["Stats", "chart"],
      ["Friends", "users"],
      ["Settings", "sliders"],
      ["Alerts", "bell"],
    ],
    screens: [
      {
        sub: "Last 30 days",
        blocks: [
          ["stats", [["Distance", "86 km", "+9 km"], ["Average pace", "5:42 /km", "-6 s"], ["Longest run", "18.2 km", "Sunday"]]],
          ["heading", "Recent runs"],
          ["table", ["Run", "Route", "Type", "Distance"], [["Sun long run", "River loop", "Easy", "18.2 km"], ["Thu tempo", "Park laps", "Tempo", "9.1 km"], ["Tue intervals", "Track", "Intervals", "7.4 km"], ["Sat parkrun", "Meadow", "Race", "5.0 km"]]],
        ],
      },
      {
        sub: "Pick a plan for your next race",
        blocks: [
          ["actions", "Start a plan", "Compare plans"],
          ["heading", "All plans"],
          ["table", ["Plan", "Length", "Level", "Runs a week"], [["Half marathon", "12 weeks", "Intermediate", "4"], ["First 10K", "8 weeks", "Beginner", "3"], ["Base building", "Open ended", "Beginner", "3"], ["Marathon", "16 weeks", "Advanced", "5"]]],
        ],
      },
      {
        sub: "Distance, pace and heart rate",
        blocks: [
          ["stats", [["Distance this year", "742 km", "+48 km on last year"], ["Runs this year", "96", "2 a week"], ["Average heart rate", "148 bpm", "-3 bpm"]]],
          ["heading", "Personal bests"],
          ["cards", [["clock", "5K", "23:41 at the Meadow parkrun"], ["clock", "10K", "49:58 on the river loop"], ["clock", "Half marathon", "1:51:20 at the spring half"]]],
        ],
      },
      {
        sub: "See what your running group did",
        blocks: [
          ["heading", "Invite a friend"],
          ["form", [["Name", "Ines Duarte"], ["Email", "ines@example.com"], ["Group", "Thursday tempo"], ["Share my runs", "Yes"]], "Send invite"],
        ],
      },
      {
        sub: "Units and privacy",
        blocks: [
          ["heading", "Privacy"],
          ["toggles", [["Share runs with friends", true], ["Auto-pause when I stop", true], ["Hide my start location", true], ["Weekly summary email", false]]],
        ],
      },
      {
        sub: "Kudos, comments and goals",
        blocks: [
          ["heading", "This week"],
          ["feed", [["Ines gave kudos to your Sunday run", "2 hours ago"], ["You hit your 80 km monthly goal", "Yesterday"], ["Tomas commented on your parkrun", "Sat"]]],
        ],
      },
    ],
  },
  "set-07": {
    brand: "Brightlane",
    theme: { accent: "#7a3fd1", accentSoft: "#f1e8fb" },
    nav: [
      ["Inbox", "inbox"],
      ["Projects", "folder"],
      ["Calendar", "calendar"],
      ["People", "users"],
      ["Settings", "sliders"],
      ["Alerts", "bell"],
    ],
    screens: [
      {
        sub: "Messages that need an answer",
        blocks: [
          ["stats", [["Unread", "14", "3 mention you"], ["Waiting on you", "5", "oldest 2 days"], ["Sent today", "9", "4 replies"]]],
          ["heading", "Unread"],
          ["table", ["From", "Subject", "Label", "Received"], [["Dana Ruiz", "Launch checklist for Friday", "Action", "09:12"], ["Sam Ito", "Onboarding copy review", "Action", "08:40"], ["Jo Park", "Billing export moved", "FYI", "Yesterday"], ["Lee Nash", "Handbook, second draft", "Review", "Yesterday"]]],
        ],
      },
      {
        sub: "What your teams are working on",
        blocks: [
          ["actions", "New project", "Archive"],
          ["heading", "Active projects"],
          ["table", ["Project", "Owner", "Status", "Due"], [["Spring launch", "Dana Ruiz", "On track", "June 20"], ["Onboarding rewrite", "Sam Ito", "At risk", "June 12"], ["Billing cleanup", "Jo Park", "On track", "July 3"], ["Support handbook", "Lee Nash", "Draft", "July 15"]]],
        ],
      },
      {
        sub: "Meetings and deadlines this week",
        blocks: [
          ["stats", [["Meetings today", "3", "next at 11:00"], ["Deadlines this week", "2", "first on Thursday"], ["Free hours", "6", "most on Friday"]]],
          ["heading", "This week"],
          ["cards", [["calendar", "Team standup", "Daily at 10:00"], ["calendar", "Design review", "Wed at 14:00"], ["calendar", "Quarter planning", "Fri at 09:30"]]],
        ],
      },
      {
        sub: "Everyone in your company",
        blocks: [
          ["heading", "Invite a person"],
          ["form", [["Name", "Ana Costa"], ["Email", "ana@example.com"], ["Team", "Design"], ["Role", "Product designer"]], "Send invite"],
        ],
      },
      {
        sub: "Profile and notifications",
        blocks: [
          ["heading", "Notifications"],
          ["toggles", [["Desktop notifications", true], ["Notify me about mentions only", false], ["Show when I am typing", true], ["Daily digest email", true]]],
        ],
      },
      {
        sub: "Mentions and replies",
        blocks: [
          ["heading", "Today and yesterday"],
          ["feed", [["Sam mentioned you in Onboarding rewrite", "10 min ago"], ["Jo replied to your comment", "1 hour ago"], ["Lee shared the Support handbook", "Yesterday"]]],
        ],
      },
    ],
  },
  "set-08": {
    brand: "Cobalt Freight",
    theme: { accent: "#1f4fa3", accentSoft: "#e4ecf8", buttonRadius: 4, inputRadius: 4 },
    nav: [
      ["Shipments", "box"],
      ["Carriers", "truck"],
      ["Rates", "tag"],
      ["Documents", "document"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "In transit and waiting for pickup",
        blocks: [
          ["stats", [["In transit", "48", "6 late"], ["Awaiting pickup", "11", "today"], ["Delivered this month", "212", "+8%"]]],
          ["heading", "Active shipments"],
          ["table", ["Reference", "Lane", "Status", "ETA"], [["CF-88102", "Rotterdam to Leeds", "In transit", "Jun 6"], ["CF-88107", "Antwerp to Lyon", "Delayed", "Jun 8"], ["CF-88111", "Hamburg to Oslo", "Booked", "Jun 10"], ["CF-88115", "Gdansk to Berlin", "In transit", "Jun 5"]]],
        ],
      },
      {
        sub: "Who hauls for you",
        blocks: [
          ["actions", "Add carrier", "Export"],
          ["heading", "All carriers"],
          ["table", ["Carrier", "Region", "Status", "On time"], [["Northline Haulage", "UK and Benelux", "Preferred", "96%"], ["Vela Transport", "France", "Active", "91%"], ["Iberia Cargo", "Spain and Portugal", "Active", "88%"], ["Baltic Link", "Poland and the Baltics", "Trial", "93%"]]],
        ],
      },
      {
        sub: "Compare prices for a lane",
        blocks: [
          ["stats", [["Lanes priced", "34", "6 updated today"], ["Average rate", "$1.42", "per km"], ["Fuel surcharge", "8%", "from 1 June"]]],
          ["heading", "Hamburg to Oslo"],
          ["cards", [["truck", "Northline Haulage", "$2,180, 3 days"], ["truck", "Vela Transport", "$1,960, 4 days"], ["truck", "Iberia Cargo", "$2,340, 2 days"]]],
        ],
      },
      {
        sub: "Bills of lading and customs forms",
        blocks: [
          ["heading", "Upload a document"],
          ["form", [["Shipment", "CF-88111"], ["Type", "Bill of lading"], ["File", "bol-88111.pdf"], ["Due", "9 June"]], "Upload"],
        ],
      },
      {
        sub: "Company and billing",
        blocks: [
          ["heading", "Shipments"],
          ["toggles", [["Email me when a shipment is delayed", true], ["Require a signature on delivery", true], ["Show prices with VAT", false], ["Share tracking links with customers", true]]],
        ],
      },
    ],
  },
  "set-09": {
    brand: "Haven Clinic",
    theme: { font: HELVETICA_FONT, accent: "#0f7a6e", accentSoft: "#e2f3f0", titleSize: 30, headingSize: 19, buttonRadius: 8, inputRadius: 8 },
    nav: [
      ["Today", "home"],
      ["Patients", "users"],
      ["Schedule", "calendar"],
      ["Messages", "chat"],
      ["Settings", "sliders"],
      ["Alerts", "bell"],
    ],
    screens: [
      {
        sub: "Appointments and tasks for the clinic",
        blocks: [
          ["stats", [["Appointments", "18", "3 walk-ins"], ["Waiting", "2", "longest 9 min"], ["Open slots", "5", "this afternoon"]]],
          ["heading", "Next appointments"],
          ["table", ["Time", "Patient", "Type", "Room"], [["09:00", "A. Mensah", "Checkup", "2"], ["09:30", "R. Dubois", "Follow-up", "1"], ["10:00", "K. Svensson", "New patient", "3"], ["10:30", "T. Alvarez", "Vaccination", "2"]]],
        ],
      },
      {
        sub: "Find or add a patient",
        blocks: [
          ["actions", "Add patient", "Import list"],
          ["heading", "All patients"],
          ["table", ["Patient", "Date of birth", "Status", "Last visit"], [["A. Mensah", "4 Feb 1962", "Active", "12 May"], ["R. Dubois", "19 Sep 1990", "Active", "2 June"], ["K. Svensson", "12 Mar 1987", "New", "None yet"], ["T. Alvarez", "30 Jul 2015", "Active", "8 Apr"]]],
        ],
      },
      {
        sub: "Week view for all rooms",
        blocks: [
          ["stats", [["Booked this week", "86", "of 110 slots"], ["Open slots", "24", "most on Thursday"], ["Cancellations", "3", "this week"]]],
          ["heading", "Rooms today"],
          ["cards", [["calendar", "Room 1", "Dr. Leclerc, free after 11:30"], ["calendar", "Room 2", "Nurse Adeyemi, booked until noon"], ["calendar", "Room 3", "Dr. Patel, free now"]]],
        ],
      },
      {
        sub: "Questions from patients",
        blocks: [
          ["heading", "Reply to R. Dubois"],
          ["form", [["To", "R. Dubois"], ["Subject", "Moving to Thursday"], ["Message", "Thursday at 10:30 is free"], ["Send by", "Email"]], "Send reply"],
        ],
      },
      {
        sub: "Clinic hours and reminders",
        blocks: [
          ["heading", "Reminders"],
          ["toggles", [["Text reminders 24 hours before", true], ["Allow patients to book online", true], ["Show cancelled slots as open", false], ["Send visit summaries by email", true]]],
        ],
      },
      {
        sub: "Cancellations and reschedules",
        blocks: [
          ["heading", "Today and yesterday"],
          ["feed", [["Mensah cancelled the 14:00 slot", "20 min ago"], ["Dubois asked to move to Thursday", "1 hour ago"], ["New online booking for Friday", "Yesterday"]]],
        ],
      },
    ],
  },
  "set-10": {
    brand: "Orchard Credit Union",
    theme: { font: GEORGIA_FONT, accent: "#8a2b45", accentSoft: "#f6e6ea", titleSize: 34, headingSize: 22, mainPaddingLeft: 48, cardRadius: 10, buttonRadius: 10, inputRadius: 8 },
    nav: [
      ["Accounts", "wallet"],
      ["Transfers", "transfer"],
      ["Cards", "card"],
      ["Support", "chat"],
      ["Settings", "sliders"],
    ],
    screens: [
      {
        sub: "Balances and recent activity",
        blocks: [
          ["stats", [["Everyday account", "$2,418.60", "available"], ["Savings", "$11,200.00", "+$35 interest"], ["Credit card", "$412.18", "due 24 June"]]],
          ["heading", "Recent activity"],
          ["table", ["Date", "Description", "Category", "Amount"], [["Jun 3", "Greenleaf Grocers", "Groceries", "-$64.20"], ["Jun 2", "Salary", "Income", "+$2,300.00"], ["Jun 1", "Rail season ticket", "Travel", "-$118.00"], ["May 30", "Water bill", "Bills", "-$41.75"]]],
        ],
      },
      {
        sub: "Move money between accounts",
        blocks: [
          ["actions", "New transfer", "Schedule"],
          ["heading", "Recent transfers"],
          ["table", ["Date", "To", "Status", "Amount"], [["Jun 10", "Rent account", "Scheduled", "$900.00"], ["Jun 3", "Savings", "Done", "$250.00"], ["Jun 1", "R. Okoro", "Done", "$40.00"], ["May 28", "Savings", "Done", "$250.00"]]],
        ],
      },
      {
        sub: "Your debit and credit cards",
        blocks: [
          ["stats", [["Spent this month", "$1,206.40", "on all cards"], ["Credit left", "$2,587.82", "of $3,000"], ["Next statement", "24 June", "in 21 days"]]],
          ["heading", "Your cards"],
          ["cards", [["card", "Debit card", "Ending 4417, active"], ["card", "Credit card", "Ending 9082, limit $3,000"], ["card", "Virtual card", "For online shopping, 1 active"]]],
        ],
      },
      {
        sub: "Talk to a member of the team",
        blocks: [
          ["heading", "Send us a message"],
          ["form", [["Topic", "Lost card"], ["Account", "Everyday account"], ["Phone", "555 0193"], ["Best time to call", "Mornings"]], "Send message"],
        ],
      },
      {
        sub: "Security and statements",
        blocks: [
          ["heading", "Security"],
          ["toggles", [["Text me about large payments", true], ["Paper statements", false], ["Lock card when abroad", false], ["Sign in with fingerprint", true]]],
        ],
      },
    ],
  },
};

/** Returns the stylesheet of one screen from its theme. The rules match version 1 except the new .list rules. */
function stylesheet(theme) {
  let navRules = [
    ".shell{display:flex;flex-direction:row;height:800px}",
    ".nav{width:224px;flex:none;border-right:1px solid #dfe3ea;padding:24px 12px;background:#fff}",
    ".brand{font-weight:700;font-size:18px;padding:0 12px 24px}",
    ".nav-links{display:flex;flex-direction:column;gap:2px}",
    `.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:6px;color:${MUTED_COLOR};font-size:15px}`,
    `.nav-item.active{color:${theme.accent};font-weight:600;background:${theme.accentSoft}}`,
  ];
  if (theme.navPlace === "top") {
    navRules = [
      ".shell{display:flex;flex-direction:column;height:800px}",
      ".nav{height:64px;flex:none;border-bottom:1px solid #dfe3ea;padding:0 40px;display:flex;align-items:center;gap:28px;background:#fff}",
      ".brand{font-weight:700;font-size:18px;}",
      ".nav-links{display:flex;flex-direction:row;gap:22px}",
      `.nav-item{display:flex;align-items:center;gap:10px;padding:6px 0;border-radius:6px;color:${MUTED_COLOR};font-size:15px}`,
      `.nav-item.active{color:${theme.accent};font-weight:600;}`,
    ];
  }
  return [
    "*{box-sizing:border-box;margin:0}",
    `body{width:1280px;height:800px;overflow:hidden;background:#f6f7f9;color:#1b2230;font-family:${theme.font};font-size:16px;line-height:1.5}`,
    ...navRules,
    `.main{flex:1;padding:36px 40px 0 ${theme.mainPaddingLeft}px}`,
    `.inner{max-width:${theme.innerMaxWidth}px}`,
    `h1{font-size:${theme.titleSize}px;line-height:1.2;font-weight:700;letter-spacing:-0.01em}`,
    `h2{font-size:${theme.headingSize}px;line-height:1.3;font-weight:600;margin-bottom:12px}`,
    `.sub{color:${MUTED_COLOR};margin:6px 0 24px}`,
    ".row{display:flex;gap:16px;margin-bottom:24px}",
    `.card{flex:1;background:#fff;border:1px solid #dfe3ea;border-radius:${theme.cardRadius}px;padding:16px 18px}`,
    ".stat{font-size:28px;font-weight:700;margin-top:4px}",
    `.delta{font-size:13px;color:${MUTED_COLOR}}`,
    `.btn{display:inline-block;background:${theme.accent};color:#fff;font-weight:600;font-size:15px;padding:9px 18px;border-radius:${theme.buttonRadius}px;}`,
    `.btn.ghost{background:transparent;color:${theme.accent};border:1px solid ${theme.accent}}`,
    "table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dfe3ea}",
    `th{text-align:left;font-size:13px;color:${MUTED_COLOR};font-weight:600;padding:10px 16px;border-bottom:1px solid #dfe3ea}`,
    "td{padding:11px 16px;border-bottom:1px solid #dfe3ea;font-size:15px}",
    `.tag{font-size:12px;padding:2px 9px;border-radius:99px;background:${theme.accentSoft};color:${theme.accent};font-weight:600}`,
    ".field{margin-bottom:16px}",
    ".field label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}",
    `.input{border:1px solid #dfe3ea;background:#fff;border-radius:${theme.inputRadius}px;padding:9px 12px;font-size:15px}`,
    ".cols{display:flex;gap:32px}.cols>div{flex:1}",
    `.list{background:#fff;border:1px solid #dfe3ea;border-radius:${theme.cardRadius}px}`,
    ".list-row{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #dfe3ea}.list-row:last-child{border-bottom:none}",
    `.list-row small{color:${MUTED_COLOR};font-size:13px}`,
    `.sw{width:38px;height:22px;border-radius:11px;background:#dfe3ea;position:relative}.sw.on{background:${theme.accent}}`,
    '.sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:8px;background:#fff}.sw.on::after{left:19px}',
    ".cardicon{display:flex;gap:10px;align-items:center;margin-bottom:6px;font-weight:600}",
  ].join("\n");
}

/** Returns one icon as an inline SVG, outlined or filled, in the given color. */
function icon(meaning, color, iconStyle) {
  if (!(meaning in ICONS)) throw new Error(`no icon for ${meaning}`);
  let paint = `fill="none" stroke="${color}" stroke-width="1.75"`;
  if (iconStyle === "filled") paint = `fill="${color}" stroke="${color}" stroke-width="1.5"`;
  return `<svg width="20" height="20" viewBox="0 0 24 24" ${paint} stroke-linejoin="round" stroke-linecap="round">${ICONS[meaning]}</svg>`;
}

/** Escapes the characters that HTML text cannot hold as they are. */
function escapeText(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Returns the HTML of one content block of a screen. */
function blockHtml(block, theme) {
  const kind = block[0];
  if (kind === "heading") return `<h2>${escapeText(block[1])}</h2>`;
  if (kind === "actions") {
    return `<div class="row"><span class="btn">${escapeText(block[1])}</span><span class="btn ghost">${escapeText(block[2])}</span></div>`;
  }
  if (kind === "stats") {
    const cards = block[1].map(
      ([label, value, note]) =>
        `<div class="card"><div class="delta">${escapeText(label)}</div><div class="stat">${escapeText(value)}</div><div class="delta">${escapeText(note)}</div></div>`,
    );
    return `<div class="row">${cards.join("")}</div>`;
  }
  if (kind === "table") {
    // The third column of every table holds a status, shown as a tag.
    const header = `<tr>${block[1].map((name) => `<th>${escapeText(name)}</th>`).join("")}</tr>`;
    const rows = block[2].map((cells) => {
      const cellHtml = cells.map((cell, index) => {
        if (index === 2) return `<td><span class="tag">${escapeText(cell)}</span></td>`;
        return `<td>${escapeText(cell)}</td>`;
      });
      return `<tr>${cellHtml.join("")}</tr>`;
    });
    return `<table>${header}${rows.join("")}</table>`;
  }
  if (kind === "cards") {
    const cards = block[1].map(
      ([meaning, title, text]) =>
        `<div class="card"><div class="cardicon">${icon(meaning, theme.accent, theme.iconStyle)}${escapeText(title)}</div><div class="delta">${escapeText(text)}</div></div>`,
    );
    return `<div class="row">${cards.join("")}</div>`;
  }
  if (kind === "field") {
    return `<div class="field"><label>${escapeText(block[1])}</label><div class="input">${escapeText(block[2])}</div></div>`;
  }
  if (kind === "form") {
    const fieldHtml = block[1].map(
      ([label, value]) => `<div class="field"><label>${escapeText(label)}</label><div class="input">${escapeText(value)}</div></div>`,
    );
    const columns = `<div class="cols"><div>${fieldHtml.slice(0, 2).join("")}</div><div>${fieldHtml.slice(2).join("")}</div></div>`;
    return `${columns}<div class="row"><span class="btn">${escapeText(block[2])}</span><span class="btn ghost">Cancel</span></div>`;
  }
  if (kind === "toggles") {
    const rows = block[1].map(
      ([label, on]) => `<div class="list-row"><span>${escapeText(label)}</span><span class="sw${on ? " on" : ""}"></span></div>`,
    );
    return `<div class="list">${rows.join("")}</div>`;
  }
  if (kind === "feed") {
    const rows = block[1].map(
      ([text, when]) => `<div class="list-row"><span>${escapeText(text)}</span><small>${escapeText(when)}</small></div>`,
    );
    return `<div class="list">${rows.join("")}</div>`;
  }
  throw new Error(`unknown block ${kind}`);
}

/** Returns the full HTML of screen number screenNumber (from 1) of one set. */
function screenHtml(setName, screenNumber) {
  const set = SETS[setName];
  const plantedBreak = PLANTED_BREAKS[setName];
  const breakIsHere = plantedBreak !== undefined && plantedBreak.screen === screenNumber;
  let theme = { ...BASE_THEME, ...set.theme };
  if (breakIsHere && plantedBreak.theme) theme = { ...theme, ...plantedBreak.theme };
  const activeIndex = screenNumber - 1;
  const navItems = set.nav.map(([label, meaning], index) => {
    let shownLabel = label;
    if (breakIsHere && plantedBreak.navLabels && plantedBreak.navLabels[index]) shownLabel = plantedBreak.navLabels[index];
    const isActive = index === activeIndex;
    const color = isActive ? theme.accent : MUTED_COLOR;
    const className = isActive ? "nav-item active" : "nav-item";
    return `<a class="${className}">${icon(meaning, color, theme.iconStyle)}<span>${escapeText(shownLabel)}</span></a>`;
  });
  const screen = set.screens[activeIndex];
  // The title is the nav label of the active item as every other screen shows it.
  const title = set.nav[activeIndex][0];
  const blocks = screen.blocks.map((block) => blockHtml(block, theme));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeText(set.brand)}</title>
<style>
${stylesheet(theme)}
</style></head><body><div class="shell">
<div class="nav"><div class="brand">${escapeText(set.brand)}</div><div class="nav-links">${navItems.join("")}</div></div>
<div class="main"><div class="inner">
<h1>${escapeText(title)}</h1><p class="sub">${escapeText(screen.sub)}</p>
${blocks.join("\n")}
</div></div></div></body></html>
`;
}

for (const setName of Object.keys(SETS)) {
  const screenCount = SETS[setName].screens.length;
  if (SETS[setName].nav.length !== screenCount) throw new Error(`${setName}: one screen per nav item`);
  for (let screenNumber = 1; screenNumber <= screenCount; screenNumber += 1) {
    writeFileSync(join(SETS_DIRECTORY, setName, `screen-${screenNumber}.html`), screenHtml(setName, screenNumber));
  }
  console.log(`wrote ${setName}: ${screenCount} screens`);
}
