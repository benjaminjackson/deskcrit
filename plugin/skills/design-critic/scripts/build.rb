#!/usr/bin/env ruby
# frozen_string_literal: true

# Rebuilds the design-critic skill's references from this repository's
# GUIDELINES.md and packs/<pack>/pack.yaml.
# The optional argument is the output folder; it defaults to references/.
#
#   ruby plugin/skills/design-critic/scripts/build.rb [output folder]

require "yaml"
require "fileutils"

CRIT = File.expand_path("../../../..", __dir__)
SKILL = File.expand_path("..", __dir__)
REFERENCES = File.expand_path(ARGV[0] || File.join(SKILL, "references"))

# GUIDELINES.md section heading prefix => [reference file, checklist title].
# The array order is the order of the checklist: whole page first, detail last.
SECTIONS = [
  ["Basics", "basics", "Basics: common mistakes"],
  ["Layout", "layout", "Layout, space, grid, hierarchy"],
  ["Typography", "typography", "Typography"],
  ["Color", "color", "Color"],
  ["Art direction", "art-direction", "Art direction and composition"],
  ["UX", "ux", "Interface and interaction"],
  ["Accessibility", "accessibility", "Accessibility"],
  ["Data visualization", "dataviz", "Charts and data"]
].freeze

# Names from the approved reading list (bd memory design-reading-list in crit).
# An entry whose Source line names none of these gets an off-list flag.
APPROVED_NAMES = %w[
  Dair Bringhurst Hochuli Kunz Müller-Brockmann Ruder Tschichold Hofmann Arnheim Albers
  Gerstner Tufte Samara Lupton Butterick Nielsen NN/g WCAG W3C Apple Material Norman
  Krug Itten Wathan Wilke Few
].freeze
APPROVED = Regexp.union(APPROVED_NAMES.map { /\b#{Regexp.escape(_1)}\b/ } + [/Refactoring UI/, /Common sense/i])
# Tschichold's The Form of the Book was considered and not chosen.
NOT_CHOSEN = /\*?The Form of the Book\*?/

# GUIDELINES.md entries the critic never sees, with the reason. Benjamin Jackson
# agreed on 2026-11-23 to drop popular psychology "laws": each is a lab finding
# that screen design misapplies, and each repeats a better-sourced entry.
EXCLUDED = {
  "Hick's law" => "reaction time among equally likely choices; real menus are scanned or learned",
  "Fitts's law" => "a still image does not show where the pointer starts; WCAG 2.5.8 covers target size",
  "Miller's law (chunking)" => "about holding items in memory, not about items visible on screen",
  "Aesthetic-usability effect" => "one small study of perceived, not actual, usability",
  "Zeigarnik effect" => "memory for unfinished tasks; nothing to judge in a still image",
  "Serial position effect" => "recall of spoken or read lists, misapplied to navigation order",
  "Peak-end rule" => "about remembered experiences of a whole flow, not one still image",
  "Choice overload" => "the jam study has not replicated reliably; repeats one-primary-action entries",
  "Von Restorff effect (isolation effect)" => "repeats the one-dominant-element and primary-action entries",
  "Tesler's law (conservation of complexity)" => "secondary sources only; about system behaviour a still image does not show",
  "Proportion and scale relationships" => "Wong and Elam are off the reading list; the type-scale and scale-contrast entries cover it",
  "Do not rely on the 4.5:1 ratio for dark backgrounds blindly" => "it says to prefer lighter weights, but APCA wants larger, heavier text at lower contrast; include it again once crit's GUIDELINES.md is fixed"
}.freeze

Entry = Struct.new(:title, :fields, :criteria, keyword_init: true) do
  def field(label) = fields.find { |name, _| name == label }&.last

  def caveats
    fields.filter_map do |name, text|
      next if name.include?("R-4") && !name.include?("NG-10")
      text if name.start_with?("Not encoded") || name.start_with?("Source check")
    end
  end

  def look_for = field("Judged by")&.[](/Question(?: tried)?: "([^"]+)"/, 1)

  def off_list? = !field("Source").to_s.gsub(NOT_CHOSEN, "").match?(APPROVED)


  def summary = field("Rule").to_s.split(/(?<=[.!?])\s+/).first
end

# Splits GUIDELINES.md into { section prefix => [Entry] } and the candidates list.
def parse_guidelines
  sections = Hash.new { |hash, key| hash[key] = [] }
  candidates = []
  section = nil
  entry = nil

  File.foreach(File.join(CRIT, "GUIDELINES.md"), chomp: true) do |line|
    case line
    when /^## (.+)/
      section = $1
      entry = nil
    when /^### (.+)/
      entry = Entry.new(title: $1.strip, fields: [], criteria: [])
      sections[section] << entry
    when /^- \*\*(.+?):\*\* ?(.*)/
      entry.fields << [$1, $2] if entry
    when /^- (.+)/
      candidates << $1 if section&.start_with?("Candidates")
    end
  end

  [sections, candidates]
end

# Loads every pack criterion and attaches it to the entry whose Defect range names it.
def attach_criteria(entries)
  Dir[File.join(CRIT, "packs", "[a-z]*", "pack.yaml")].sort.each do |path|
    pack = File.basename(File.dirname(path))
    YAML.load_file(path)["criteria"].each do |criterion|
      owner = entries.find { _1.field("Defect range")&.include?("`#{criterion["id"]}`") }
      abort "No GUIDELINES.md entry names #{criterion["id"]}" unless owner
      owner.criteria << criterion.merge("pack" => pack)
    end
  end
end

def render_entry(entry, file)
  out = ["### #{entry.title}", ""]
  out << "- **Rule:** #{entry.field("Rule")}"
  out << "- **Look for:** #{entry.look_for}" if entry.look_for
  out << "- **Source:** #{entry.field("Source")}"
  out << "- **Off the reading list:** no source here is on the approved list. Do not cite it; argue the point as taste or common sense." if entry.off_list?
  out << "- **Link:** #{entry.field("Link")}" if entry.field("Link")
  entry.caveats.each { out << "- **Caveat:** #{_1}" }
  entry.criteria.each do |criterion|
    out << "- **Fix (approved), #{criterion["title"]}:** #{criterion["fix"]}"
  end
  out << "- **How bad it gets:** #{entry.field("Defect range").sub(/^`[^`]+`: /, "")}" if entry.field("Defect range")
  out << ""
  out.join("\n")
end

def checklist_line(entry, file)
  suffix = entry.off_list? ? " _(off-list source)_" : ""
  "- [ ] **#{entry.title}.** #{entry.summary} → `references/#{file}.md`#{suffix}"
end

sections, candidates = parse_guidelines
attach_criteria(sections.values.flatten)
FileUtils.mkdir_p(REFERENCES)

checklist = [<<~MD]
  # Checklist

  Generated by `scripts/build.rb` from crit's GUIDELINES.md. Do not edit by hand.

  One line per guideline, whole page first and detail last. Skip a section that does not apply to the piece (no chart, no interface). Each line names the reference file that holds its entry, under a `###` heading with the same title (find it with `grep -n -A12 "^### <title>" <file>`); open the entry when the line looks broken or you are not sure.
MD

SECTIONS.each do |prefix, file, label|
  heading = sections.keys.find { _1.start_with?(prefix) }
  entries = sections.fetch(heading).select { _1.field("Rule") && !EXCLUDED.key?(_1.title) }

  body = entries.map { render_entry(_1, file) }.join("\n")
  File.write(File.join(REFERENCES, "#{file}.md"), <<~MD + body)
    # #{label}

    Generated by `scripts/build.rb` from the "#{heading}" section of crit's GUIDELINES.md and the #{file} pack. Do not edit by hand.

  MD

  checklist << "## #{label}\n\n"
  checklist << entries.map { checklist_line(_1, file) }.join("\n") << "\n\n"
end

checklist << "## Unchecked candidates\n\nFrom the reading list but not yet checked against the books. Use as prompts to look, not as rules to cite.\n\n"
checklist << candidates.map { "- [ ] #{_1}" }.join("\n") << "\n"
File.write(File.join(REFERENCES, "checklist.md"), checklist.join)

titles = sections.values.flatten.map(&:title)
missing = EXCLUDED.keys - titles
warn "EXCLUDED names entries GUIDELINES.md no longer has: #{missing.join("; ")}" if missing.any?
puts "Wrote #{sections.values.flatten.count { _1.field("Rule") && !EXCLUDED.key?(_1.title) }} entries; left out #{EXCLUDED.size - missing.size}."
