# Attribution: removed fixtures

Every image here is output of this repository's fixture renderer (packs/_renderer). Each image was recovered unchanged from the commit that `source_commit` names in manifest.json, the last commit before the image was deleted from `packs/<pack>/fixtures/`. That commit's `packs/<pack>/templates/` holds the template that rendered it.

The fixtures/ATTRIBUTION.md of each pack at those commits gives the license:

- basics: Pack license: MIT
- layout: Pack license: MIT
- typography: Pack license: MIT

The images belong to 40 criteria that were removed from their packs. `removal_commit` in manifest.json names the commit that removed each one, and `removed_because` gives the reason from that commit's message:

- `jev-quiet`: 330 images of 31 criteria, removed under R-4 because Jev stayed quiet on the defect or missed the agreement floor.
- `no-source`: 90 images of 9 typography criteria, removed under FR-45 because no checked source states their rule.

No blind label by Benjamin Jackson exists for these images, so the polarity in manifest.json comes from how each fixture was built (defect on or off), not from a human label.
