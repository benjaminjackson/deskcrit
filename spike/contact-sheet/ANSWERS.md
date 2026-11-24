# Answers for the contact-sheet spike (crit-j8y.1)

Never show this file to the critic. The sets were written and frozen before any critic run.

All screens are of one invented invoicing app, "Ledgerly", rendered at 1280 x 800 px. `pages.mjs` writes them, and `render.mjs` renders them and lays out each sheet.

| Set | Screens | Tile that breaks the pattern | What breaks |
| --- | --- | --- | --- |
| set-a | 6 | 4 (Reports) | Component style: the primary button "Export CSV" is a green outlined pill. On every other screen the primary button is a blue filled button with 6 px corners. |
| set-b | 6 | 2 (Payments) | Geometry: the content column starts 32 px further right (left padding 72 px, not 40 px) and ends 32 px earlier on the right. Everything else is the same. |
| set-c | 6 | 5 (Invoices) | Type scale: the page title is 22 px weight 600 (not 28 px weight 700), and the section headings are 20 px weight 700 (not 17 px weight 600), so the section heading is almost as large as the page title. |
| set-d | 5 | none | The clean set. No screen breaks the pattern. |

Content differences between screens (other tables, cards, and forms) are part of the product and are not breaks.
