#!/usr/bin/env bash
# Checks that the guideline counts written in GUIDELINES.md and docs/PRD.md match the catalog.
#
# Why this exists: the counts were hand-copied into several documents and drifted twice in one day.
# This script is the durable evaluation that stops that (PRD EV-13; CLAUDE.md, "How we build", layered checks).
#
# What it checks, for each of the seven "## " sections of GUIDELINES.md:
#   1. The number of "### " entry headings equals the number of "- **Rule:**" bullets,
#      so an entry without a rule, or a rule without an entry, is caught.
#   2. That number equals the one in the "## Section counts" table of GUIDELINES.md.
#   3. PRD FR-55 states the same number for the pack that encodes the section, written as "`pack` with N",
#      and states the sum as "That is N guidelines in total". FR-55 must keep those two phrasings.
#
# Exit 0 when every count matches, exit 1 when any count differs, exit 2 when a file is missing.

set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
catalog="$repo_root/GUIDELINES.md"
prd="$repo_root/docs/PRD.md"

if [ ! -f "$catalog" ] || [ ! -f "$prd" ]; then
  echo "missing GUIDELINES.md or docs/PRD.md" >&2
  exit 2
fi

# Each line below maps a section heading in GUIDELINES.md to the pack name used in FR-55.
# The heading text must match the "## " line exactly.
section_to_pack="Typography, legibility, and readability: guidelines for deskcrit=typography
Layout, spacing, grids, alignment, visual hierarchy=layout
Color guidelines for deskcrit=color
Accessibility and legal compliance: research for deskcrit=accessibility
UX and interaction heuristics: guideline research for deskcrit=ux
Data visualization=dataviz
Art direction, composition, illustration, and visual coherence=art-direction"

# "### " headings that are not guideline entries. One per line, exact text after "### ".
# The accessibility section opens with a table of laws under this heading.
non_entry_headings="Legal regimes"

failures=0
total=0

while IFS='=' read -r section pack; do
  # Count the entry headings and the Rule bullets between this "## " heading and the next one.
  # Headings listed in non_entry_headings are skipped.
  counts="$(awk -v heading="## $section" -v skip="$non_entry_headings" '
    BEGIN { split(skip, skip_list, "\n"); for (i in skip_list) skip_set[skip_list[i]] = 1 }
    $0 == heading { inside = 1; next }
    /^## / { inside = 0 }
    inside && /^### / { title = substr($0, 5); if (!(title in skip_set)) headings++ }
    inside && /^- \*\*Rule:\*\*/ { rules++ }
    END { print headings + 0, rules + 0 }
  ' "$catalog")"
  heading_count="${counts% *}"
  rule_count="${counts#* }"
  total=$((total + rule_count))

  if [ "$heading_count" != "$rule_count" ]; then
    echo "\"$section\" has $heading_count entry headings but $rule_count rule bullets"
    failures=$((failures + 1))
  fi

  # Read the number the Section counts table claims. Only the lines of that table are searched.
  table_claim="$(awk -v section="$section" '
    /^## Section counts/ { inside = 1; next }
    /^## / { inside = 0 }
    inside && index($0, "| " section " |") == 1 { split($0, cells, "|"); gsub(/ /, "", cells[3]); print cells[3]; exit }
  ' "$catalog")"

  # Read the number FR-55 claims for this pack, written as "`pack` with N".
  prd_claim="$(grep -F '| FR-55 |' "$prd" | grep -o "\`$pack\` with [0-9]*" | grep -o '[0-9]*$')"

  if [ "$rule_count" != "$table_claim" ]; then
    echo "GUIDELINES.md table says ${table_claim:-nothing} for \"$section\" but the section holds $rule_count rules"
    failures=$((failures + 1))
  fi
  if [ "$rule_count" != "$prd_claim" ]; then
    echo "docs/PRD.md FR-55 says ${prd_claim:-nothing} for \`$pack\` but GUIDELINES.md holds $rule_count rules"
    failures=$((failures + 1))
  fi
done <<< "$section_to_pack"

# FR-55 also states the total, written as "That is N guidelines in total".
prd_total="$(grep -F '| FR-55 |' "$prd" | grep -o 'That is [0-9]* guidelines' | grep -o '[0-9]*')"
if [ "$total" != "$prd_total" ]; then
  echo "docs/PRD.md FR-55 says ${prd_total:-nothing} guidelines in total but GUIDELINES.md holds $total"
  failures=$((failures + 1))
fi

if [ "$failures" -eq 0 ]; then
  echo "guideline counts match: $total rules across 7 sections"
  exit 0
fi
exit 1
