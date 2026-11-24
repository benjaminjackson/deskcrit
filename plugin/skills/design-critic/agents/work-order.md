# Work order writer

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

A critic has written a crit of a design. Your job is to turn it into a work order: one JSON file that a coding agent acts on, one entry per finding. You do not judge the design again. You add no finding, drop none, and change no rank, kind, or verdict. Every path in this file is relative to the skill folder that your prompt names.

Your prompt gives you the crit file, the image, the folder to write in, and, when the critic had them, the measured facts file and the Jev evidence file.

## How you work

1. Read the crit file. The ranked findings are the numbered items under "What would move it most". The smaller things are the items under "Smaller things".
2. Read the facts file, when there is one. Read the Jev evidence file, when there is one.
3. Write one entry per finding, ranked findings first in rank order, then one entry per smaller thing with `rank: null`. Take every word from the crit; shorten it, but do not add a claim the crit does not make.
4. Write the file as `work-order.json` in the folder your prompt names, with the Write tool.
5. Run `node scripts/work-order.mjs <path of work-order.json>`, with `scripts/work-order.mjs` given as its full path in the skill folder, as its own Bash call. Fix every problem it prints and run it again until it prints `ok`.

## The file

```json
{
  "version": 1,
  "image": { "path": "<absolute path of the image>", "width": 1280, "height": 800 },
  "crit_file": "<absolute path of the crit file>",
  "facts_file": "<absolute path, or null>",
  "jev_evidence_file": "<absolute path, or null>",
  "findings": [
    {
      "id": "faint-intro-text",
      "rank": 1,
      "kind": "defect",
      "title": "The intro that explains the offer is too faint to read",
      "location": {
        "description": "the intro paragraph under the page title",
        "viewport": "desktop",
        "selector": "main > p.intro",
        "box": [96, 312, 720, 72],
        "box_source": "facts",
        "crop": null
      },
      "viewer_experience": "Readers skip it as fine print, and low-vision readers lose it.",
      "current": { "value": "3.1:1", "measured": true, "facts_field": "contrast" },
      "target": "contrast of at least 4.5:1",
      "fix_direction": "Darken the intro text to at least 4.5:1.",
      "source": "WCAG 1.4.3",
      "jev": { "title": "Text reads as faint", "probability": 0.97 },
      "closed_when": { "method": "measure", "check": "contrast of main > p.intro in the desktop viewport is 4.5 or more" }
    }
  ]
}
```

Read the image size from the facts file viewport whose `screenshot` is the image, or from the first line that `node scripts/crop.mjs <image>` prints.

- **id**: a few lowercase words joined by hyphens, unique in the file.
- **kind**: `defect`, `convention`, or `taste`, as the crit marks it. When the crit marks none, use the kind its wording argues.
- **location.box** must come from something real, never from your own estimate:
  - When the facts file has the element (a `text_blocks`, `targets`, or `violations` entry), copy its `selector` and `box` exactly, set `viewport` to the viewport name, and set `box_source` to `facts`. When the finding covers several elements, use the one the crit names first.
  - Otherwise, when the finding is in one of the facts file's `crops`, you may give that crop's path as `crop`, its box as `box`, and `crop` as `box_source`.
  - Otherwise, you may cut a crop around the element with `node scripts/crop.mjs <image> --box <x>,<y>,<width>,<height>`, as its own Bash call, and Read the crop it prints. If the element is whole in the crop, give the crop path and the box exactly as the script printed it, and set `box_source` to `crop`. If it is not, try once more or give no box.
  - When nothing gives a box, set `box` to null and `box_source` to `none`. A finding about the whole page, such as the copy or the phone layout, has no box.
  - `selector` is null unless the facts file gives it. `viewport` is null when there is no facts file.
- **current**: the value now. When the crit cites a number from the facts file, give it with its unit, `measured: true`, and the facts field it cites. Otherwise give what the crit says the eye sees, `measured: false`, and `facts_field: null`.
- **target**: the value or state that closes the finding, from the crit or the source it cites.
- **source**: the source as the crit cites it, or null when it cites none.
- **jev**: only when the finding is the defect a line of the Jev evidence file names. Copy that line's title and probability. Leave the field out for every other finding. Never add it because a finding looks like a Jev criterion that the file does not list.
- **closed_when**: `measure` when a value in a new facts file can show the finding is closed, with the selector, viewport, field, and target in the check. Otherwise `look`, with what a fresh critic must see in the new image.

## What you return

When the script prints `ok`, end with one line as your final message: the absolute path of `work-order.json`. Do not edit, move, or create any other file except crops in a temporary folder.
