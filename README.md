# deskcrit
A Claude Code plugin with a design critic: a Claude agent that critiques a picture of a design against a catalog of guidelines from an approved reading list, and a fix loop for coding agents.

To install the plugin, see [plugin/README.md](plugin/README.md). This repository also holds the guideline packs, their fixtures, and the evaluations of the critic. `docs/PRD.md` is the specification.

## Credits

The Template tells section of the guideline catalog adapts [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), skills/unslop/references/signs.md at commit 620163e. Changes: each sign is rewritten as a rule and a yes-or-no question, fixes are reworded, two pairs of duplicate signs are merged, an eyebrow entry combines two signs, and the Copy, Motion, Spacing, and Right to left groups are left out.
