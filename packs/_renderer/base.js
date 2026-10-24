// Sets the defect switch for a fixture template (OQ-17). The renderer opens
// each template as template.html?defect=on and template.html?defect=off. This
// script copies that value onto <html data-defect="...">, and the template's
// CSS draws the defect only under [data-defect="on"], so the two renders
// differ only in the defect. Anything other than "on" counts as "off".
document.documentElement.dataset.defect =
  new URLSearchParams(window.location.search).get("defect") === "on"
    ? "on"
    : "off";
