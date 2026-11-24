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

# The hand-written checklist: sections of yes-or-no questions, each naming the GUIDELINES.md
# entries it stands for, plus the entries the critic never sees (see the comment at its top).
CHECKLIST = YAML.load_file(File.join(SKILL, "checklist.yaml"))
EXCLUDED = CHECKLIST.fetch("excluded")

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

# Splits GUIDELINES.md into { section heading => [Entry] }.
def parse_guidelines
  sections = Hash.new { |hash, key| hash[key] = [] }
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
    end
  end

  sections
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

# Finds the one entry a checklist reference names: a title, or { "section", "title" } when
# two GUIDELINES.md sections hold the same title. Aborts when the reference does not resolve.
def resolve(reference, sections)
  title, prefix = reference.is_a?(Hash) ? reference.values_at("title", "section") : [reference, nil]
  matches = sections.flat_map do |heading, entries|
    next [] if prefix && !heading.start_with?(prefix)
    entries.select { _1.title == title && _1.field("Rule") }.map { [heading, _1] }
  end
  abort "checklist.yaml names #{reference.inspect}, which is no GUIDELINES.md entry" if matches.empty?
  abort "checklist.yaml names #{title.inspect}, which several sections hold; add its section" if matches.size > 1
  matches.first
end

# The reference file name of a GUIDELINES.md section heading, from SECTIONS.
def file_for(heading) = SECTIONS.find { heading.start_with?(_1.first) }[1]

def checklist_line(question, sections)
  targets = Array(question["entries"]).map do |reference|
    heading, entry = resolve(reference, sections)
    suffix = entry.off_list? ? " _(off-list source)_" : ""
    "`references/#{file_for(heading)}.md` \"#{entry.title}\"#{suffix}"
  end
  targets = ["(no catalog entry: judge as taste or common sense, and say so)"] if question["gap"]
  "- [ ] **#{question.fetch("question")}** → #{targets.join("; ")}"
end

# Aborts unless every entry the critic sees is under exactly one question.
def check_every_entry_placed(sections)
  placed = CHECKLIST.fetch("sections").flat_map { _1.fetch("questions") }
    .flat_map { Array(_1["entries"]) }.map { resolve(_1, sections).last }
  twice = placed.tally.select { |_, count| count > 1 }.keys
  abort "checklist.yaml puts these entries under more than one question: #{twice.map(&:title).join("; ")}" if twice.any?
  seen = sections.values.flatten.select { _1.field("Rule") && !EXCLUDED.key?(_1.title) }
  unplaced = seen - placed
  abort "checklist.yaml puts these entries under no question: #{unplaced.map(&:title).join("; ")}" if unplaced.any?
end

sections = parse_guidelines
attach_criteria(sections.values.flatten)
check_every_entry_placed(sections)
FileUtils.mkdir_p(REFERENCES)

SECTIONS.each do |prefix, file, label|
  heading = sections.keys.find { _1.start_with?(prefix) }
  entries = sections.fetch(heading).select { _1.field("Rule") && !EXCLUDED.key?(_1.title) }

  body = entries.map { render_entry(_1, file) }.join("\n")
  File.write(File.join(REFERENCES, "#{file}.md"), <<~MD + body)
    # #{label}

    Generated by `scripts/build.rb` from the "#{heading}" section of crit's GUIDELINES.md and the #{file} pack. Do not edit by hand.

  MD
end

checklist = [<<~MD]
  # Checklist

  Generated by `scripts/build.rb` from `checklist.yaml` and crit's GUIDELINES.md. Do not edit by hand.

  Each line is a question. Yes means the design is fine there; no means a defect. Each kind of defect has exactly one question, so file a defect under one line only. Sections run from the whole piece to the detail. When a question in "Charts and data" or "Interface" names a defect, file it there and not under a general question; text inside a chart or a control is still asked under "Text". Skip a section that does not apply (no chart, no controls). Each line names the reference files and entry titles it stands for. To open the entries of a line, run `node scripts/entries.mjs "<title>" "<title>"` with the script's full path in the skill folder and each title as the line quotes it; it prints each entry in full, with the Rule, Look for, How bad it gets, Fix, and Caveat. One call can open the entries of several lines. For one entry, the Read tool on the file the line names works too: find the `###` heading with the entry's title. Open the entries when the answer is no or unsure. A line that names no entry is a defect the catalog does not cover: judge it as taste or common sense, and say so.
MD

CHECKLIST.fetch("sections").each do |section|
  checklist << "\n## #{section.fetch("title")}\n\n#{section.fetch("scope")}\n\n"
  checklist << section.fetch("questions").map { checklist_line(_1, sections) }.join("\n") << "\n"
end
File.write(File.join(REFERENCES, "checklist.md"), checklist.join)

titles = sections.values.flatten.map(&:title)
missing = EXCLUDED.keys - titles
warn "checklist.yaml excludes entries GUIDELINES.md no longer has: #{missing.join("; ")}" if missing.any?
puts "Wrote #{sections.values.flatten.count { _1.field("Rule") && !EXCLUDED.key?(_1.title) }} entries; left out #{EXCLUDED.size - missing.size}."
