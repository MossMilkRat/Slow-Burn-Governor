# Changelog

## [2.1.0]

### Added
- **Surface** and **Proximity** fields on every rung. The ladder now specifies what a scene *looks like*, not only what a character feels. Fixes the failure mode where the model understood the rung and still wrote two people vaguely brooding.
- Three new friction rungs: **Enforced Courtesy** (1), **Courtesy as Weapon** (3), **Deliberate Provocation** (5). The bickering/annoyance phase had been compressed into too few rungs.
- **Hostility register** — a per-character, editable field describing *how* that character's hostility expresses itself. Defaults: courtesy for Zyren, chaos for Astrid.
- Approach–avoidance arc encoded across the ladder: effortless avoidance → avoidance requiring planning → lingering → engineered collisions → terrified re-avoidance at rung 13.
- Instruction to write the surface rather than narrate the interior.

### Changed
- Ladder grown from 18 rungs to 21 (0–20).
- Rung slider now commits on `change` rather than `input`, so dragging across the ladder no longer fires a rung change per pixel.
- HTML escaping on all user-supplied strings in the settings panel.

## [2.0.0]

### Added
- Dual-track architecture: each character holds an independent position on a shared ladder.
- Desync as a first-class mechanic — the injection describes how the lower character misreads the higher one.
- Per-character mirror flag for the warden/prisoner misapprehension.
- Hard ceiling, per-rung message minimums, configurable max desync.
- `/rung`, `/ceiling`, `/mirror` slash commands.

### Changed
- Complete rewrite. v1's `{{char}}`/`{{user}}` model could not represent a romance where the model writes both halves.
