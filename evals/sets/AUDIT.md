# Audit of the EV-21 sets

This file lists every difference across the screens of each set that is not the planted break in `answers.json` (crit-j8y.8). The audit was made from `render.mjs`, the HTML of each screen, and the PNG files. The auditor did not read any crit.

## List 1: version 1, before the repair

### Problems in every set

All ten sets were made from one template, so the same problems occur in each set. Screen N has nav item N active.

1. Screen 2 repeats the table of screen 1: the same section heading, columns, and rows, under a different nav item and title.
2. Screen 3 repeats the three stat cards of screen 1.
3. The three card icons of screen 3 are the nav icons of items 1, 2, and 3 (a house, three lines, a bar chart), used for things that are not those nav items. Example: in set-01, the house means "Next low tide" in a card and "Trips" in the nav.
4. The nav icons are given by position, not by meaning: item 1 is always a house, item 2 three lines, item 3 a bar chart, item 4 a person, item 5 a sun shape, item 6 a bell. So, for example, Tides, Pantry, Clients, and Cards get a bar chart, and Shopping, Documents, Messages, Reports, and Support get a person.
5. The Settings icon is a circle with eight rays. It looks like a sun or a brightness control, not settings.
6. Screen 4 is a form for the main action of the product, which does not match its nav item and title in 9 of 10 sets. Its buttons are the actions of another page.
7. The buttons on screen 2 are often the actions of another page (for example "Book trip" and "Hold dates" on a Boats page).
8. The page title is often not the nav label of the active item (listed per set below).
9. Right edges differ by screen: tables, card rows, and forms fill the 976 px content column, the settings list is 560 px wide (inline style), and the alerts timeline has no box and no right edge.
10. Section headings (h2) are on screens 1 and 2 only. The settings screen, the form screen, and the alerts screen have none.
11. The `.inner` rule says 1000 px, but on a screen with the sidebar the content column is 976 px (1280 − 224 − 2 × 40), so 1000 px is never reached.

### Per set

- **set-01 (Tidewise).** Screen 4 also changes the input corner radius from 6 px to 8 px, which the planted break does not name. Titles that differ from the nav: "Upcoming trips" (Trips), "Tide report" (Tides), "New booking" (Crew). Boats shows the Departures table with "Book trip" and "Hold dates". Tides repeats the trip stats. Crew is a booking form. Icons: Boats three lines, Tides a bar chart.
- **set-02 (Ledgerline).** Invoices has "Save invoice" and "Preview" (editor actions) on a list page and repeats the Overview table. Clients repeats the Overview stats. Reports is a "New invoice" form. Icons: Clients a bar chart, Reports a person. The planted description says the content is 40 px narrower; as rendered, the column is 960 px against 976 px, so 16 px narrower, and the right edge is 8 px further left.
- **set-03 (Fernhill).** Titles: "Shop today" (Shop), "Restock" (Settings). Orders repeats the "To pack" table of Shop with "Place order" and "Save draft". Plants repeats the shop stats. Customers is a supplier order form with "Place order". The Settings screen is titled "Restock", says "Order seedlings from your suppliers", and holds shop settings. Screen 5 has no section heading, so of the planted change only the title is visible. Icons: Plants a bar chart.
- **set-04 (Quillnote).** Titles: "All notes" (Notes), "Shared with me" (Shared). Notebooks shows the Recent notes table with "New note" and "Import". Search repeats the stats and shows notebook cards, with no search field. Shared is a new-note form. Icons: Notes a house, Notebooks three lines, Search a bar chart, Shared a person.
- **set-05 (Marrow).** Titles: "Meal plan" (Plan), "Shopping list" (Shopping). Recipes shows the dinner plan for the week, which belongs to Plan. Plan repeats it with "Add recipe" and "Import". Pantry repeats the stats and shows recipe groups. Shopping is a form of meal-plan preferences with "Add recipe". Icons: Recipes a house, Pantry a bar chart, Shopping a person.
- **set-06 (Pacehound).** Titles: "Your runs" (Runs), "Training plans" (Plans). Plans shows the Recent runs table with "Log a run" and "Import file". Stats repeats the stats and shows training plan cards. Friends is a profile settings form with "Log a run". Icons: Runs a house, Plans three lines, Friends one person.
- **set-07 (Brightlane).** Inbox shows the Active projects table. Projects has "New message" and "Mark all read". Calendar repeats the stats. People is a profile form with "New message". Icons: Inbox a house, Projects three lines, Calendar a bar chart, People one person.
- **set-08 (Cobalt Freight), clean.** Title "Rate quotes" (Rates). Carriers shows the Shipments table with "Book shipment" and "Get quote". Rates repeats the stats and shows carrier cards. Documents is a shipment booking form. Icons: Carriers three lines, Rates a bar chart, Documents a person.
- **set-09 (Haven Clinic), clean.** Patients repeats the appointments table of Today. Schedule repeats the stats and shows room cards. Messages is a new-patient form with "Add patient". Icons: Patients three lines, Schedule a bar chart, Messages a person.
- **set-10 (Orchard Credit Union), clean.** Transfers repeats the Recent activity table of Accounts. Cards repeats the account stats, so "Credit card" shows twice. Support is a transfer form with "Send money". Icons: Transfers three lines, Cards a bar chart, Support a person.

No set has a difference in nav order, brand name, title position, or body text size across its screens, other than the planted break.

## List 2: version 2, after the repair

`build.mjs` now writes every screen from one data table. Each set has one theme, one nav with one icon for each meaning, a title on each screen that is the label of its active nav item, and content that fits that label. The Settings icon is now sliders, and each card icon has the same meaning as the nav icon of the same shape. Tables, card rows, forms, the settings list, and the alerts list all fill the content column, and every screen has a section heading. The planted break of each set is in `PLANTED_BREAKS` in `build.mjs` and is the only difference.

### What is left

The check compares, inside each set, the stylesheet and the nav (labels, icon shapes, icon style) of every screen, and the title against the active nav label. It also measures each screen in Chromium: the left edge and width of the title and the first content block, the title and heading sizes, the button and input corner radius, the accent color, the place of the nav, and the icon style.

- set-01: only the stylesheet of screen 4 differs (the button radius).
- set-02: only the stylesheet of screen 3 differs (the main padding and the content width).
- set-03: only the stylesheet of screen 5 differs (the title and heading sizes).
- set-04: only the stylesheet of screen 2 differs (the accent color).
- set-05: only the icons of screen 3 differ (filled).
- set-06: only the stylesheet of screen 4 differs (the top bar).
- set-07: only the nav of screen 3 differs (the label Workspaces).
- set-08, set-09, set-10: no difference.

### Each planted break against version 1

Values measured in Chromium at 1280 x 800 px, version 1 and version 2.

| Set | Break screen | Version 1 | Version 2 | Same |
| --- | --- | --- | --- | --- |
| set-01 | screen 4 | button radius 12 px, other screens 6 px; input radius 8 px | button radius 12 px, other screens 6 px; input radius 6 px | Break yes; the input radius change, which the break did not name, is removed |
| set-02 | screen 3 | content starts at x = 272 px and is 960 px wide; other screens 264 px and 976 px | the same | yes |
| set-03 | screen 5 | title 28 px, heading rule 18 px (no heading on the screen); other screens 34 px and 22 px | title 28 px, heading 18 px (a heading is now on the screen); other screens 34 px and 22 px | yes; the 18 px heading is now visible |
| set-04 | screen 2 | accent #16897d with #e1f2f0; other screens #4a46c8 with #ececfa | the same | yes |
| set-05 | screen 3 | nav and card icons filled in their color with a 1.5 px stroke; other screens outlined with a 1.75 px stroke | the same rule | the rule yes; the icon shapes changed |
| set-06 | screen 4 | top bar 64 px high, content at x = 40 px and 1000 px wide; other screens a 224 px sidebar | the same | yes |
| set-07 | screen 3 | nav item 2 labeled Workspaces; Projects on the other screens | the same | yes |

### Notes on answers.json

`answers.json` did not change. Two descriptions do not match the rendered screens in a detail, in version 1 and in version 2:

- set-02 says the content is "40 px narrower". As rendered, it is 16 px narrower (960 px against 976 px), because the content column on the other screens is 976 px, not 1000 px. The start is 8 px further right, as the description says.
- set-05: the description is still true, but the filled icons have new shapes (book, calendar, jar, cart, sliders, clock) because the version 1 shapes did not fit their labels. Closed shapes such as the jar and the calendar show more solid area when filled than the version 1 house and lines did, so the break can look stronger than in version 1.

For set-03, the description names smaller section headings. In version 1, screen 5 had no section heading, so only the title showed the change. In version 2 every screen has one, so the description is now true on the screen.
