# Slow Burn Governor — Dual Track

A pacing governor for SillyTavern, built for **long-form fiction where the model writes both halves of the romance**.

Most slow-burn tooling assumes `{{char}}` vs `{{user}}`: one guarded party, one meter, one pursuer. That breaks the moment you're co-writing a novel in which the model plays both leads. This one gives each character an **independent position on a shared 21-rung ladder** and treats the gap between them as the engine rather than an error.

Written for an enemies-to-lovers political fantasy, but nothing is proper-noun-locked — names, hostility registers, and the ladder are all yours to edit.

---

## Install

**In SillyTavern:** Extensions → Install extension → paste this repo's URL.

**Manually:**

```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/BLITZEN_GH/slowburn-governor.git
```

Refresh. The panel appears under **Extensions → Slow Burn Governor — Dual Track**.

---

## The problem it solves

Models accelerate romance. Not because they misunderstand the instruction, but because every individual scene has a local gradient toward resolution — the tension *wants* to break, and "he softens" is always the easier next sentence than "he says something cruel because softening is unsurvivable."

Telling a model "write a slow burn" loses to that gradient within about thirty messages. This extension replaces the instruction with a **state machine the model doesn't control**.

## Three mechanics

### 1. The ladder — 21 rungs (0–20)

Long ladders usually rot in the middle: rungs 6 through 11 blur together and you've built a 5-stage system with padding. Every rung here carries a **testable rule** —

- **state** — the interior condition
- **surface** — what the scene actually *looks* like
- **proximity** — avoiding, tolerating, or engineering collisions
- **unlocks** / **blocks** — permitted and hard-forbidden
- **gate** — what must happen in-story to advance

The **blocks** matter more than the unlocks. Models overshoot; they rarely undershoot.

The **surface** field exists because interiority alone isn't enough. "Registers that the other is competent" describes a feeling. It doesn't tell the model that the scene is *a barb prepared and then not deployed, because it would have been inaccurate and inaccuracy is beneath them.* The second one is writable.

### 2. Desync — the engine

The two tracks diverge, and the injection tells the model **how the lower character misreads the higher one**:

| Gap | The one behind... |
|---|---|
| 1 rung | half-registers the shift and refuses it |
| 2–3 rungs | reads softening as **tactics** — a manoeuvre, a debt, pity — and punishes it |
| 4+ rungs | finds the behaviour **incoherent**, therefore threatening, and escalates |

This is why the burn can run for tens of thousands of words without going stale. Every kindness performed at rung 9 lands on someone at rung 5 who experiences it as a move in a game they think they're losing.

### 3. The mirror

A per-character flag: *does this character still believe the other holds the leash?*

While intact, the injection forbids the truth leaking through inference, sympathy, or a lucky guess — the exact way models spoil a structural reveal. Rung 18 (**The Mirror Breaks**) fires **separately per character**, because the two revelations are different scenes and you'll want to time them apart.

---

## Pacing

`minMessages` defaults to **15** — a rung is hard-locked until it's been served. At 15 × 21 that's a 315-message floor to the top, and the gate conditions push the real number higher. Manual advancement is refused while a rung is locked, and the injection tells the model outright:

> Retreat is always available to you. Progression is not.

The **ceiling** is the blunt instrument: set it to 7 and nothing above rung 7 exists — not in dialogue, not in interiority, not as foreshadowing that reads as arrival.

**Backslide is intended.** Someone lands a scheme, an exile order comes down, someone says the unforgivable thing — knock the affected character down one or two. The ladder is not a ratchet.

## Hostility register

Per-character, editable, injected every turn. It's what keeps two people at the same rung from sounding identical:

> **Character 1** — Courtesy. His hostility wears perfect manners. When he is losing, he becomes MORE formal, not less. His cruelty is always deniable.
>
> **Character 2** — Chaos. Her hostility wears provocation, aimed at whatever he values most. When she is losing, she escalates the disorder. Her cruelty is never deniable and she does not want it to be.

Same rung, opposite weapons.

---

## The rungs

| # | Name | What the scene looks like |
|---|---|---|
| 0 | Contempt at Distance | Barely share scenes. Dismissal without detail |
| 1 | Enforced Courtesy | Protocol performed at each other. Both counting minutes |
| 2 | Specific Contempt | Petty bickering. Genuinely tiresome. Nobody's enjoying it |
| 3 | Courtesy as Weapon | Immaculate manners with a blade inside. Court notices nothing |
| 4 | Unwanted Notice | Tracking them across a room. Filed under "tactics" |
| 5 | Deliberate Provocation | Poking on purpose, for the reaction. Both blame the other |
| 6 | Grudging Competence | The insult of watching them be good at something |
| 7 | The Adversary Upgrade | The fights get *good*. Collisions engineered, called duty |
| 8 | Involuntary Interest | Oblique questions to third parties, instantly disowned |
| 9 | Private Contradiction | Kindness done in secret and denied to their face |
| 10 | Defensive Reading | A killing blow withheld. The other notices and hates it |
| 11 | Shared Threat Alliance | Wordless coordination. Hostility snaps back afterward |
| 12 | The Fear of Loss | The body moves first. Then violent backpedalling |
| 13 | Naming It Privately | Nothing changes outside except it gets worse |
| 14 | Comfort in Hostility | Rung 2's bickering, note for note, now unbearably tender |
| 15 | The Ceded Ground | Loses on purpose. Private self-laceration after |
| 16 | The Almost | Interrupted. The aftermath is arctic and public |
| 17 | Partial Truth | One real piece of the cage. Handed over like a weapon |
| 18 | The Mirror Breaks | Rage first. Every past cruelty re-reads as a wound |
| 19 | Choosing | Nothing left to blame. A person talking, badly |
| 20 | Earned Intimacy | Still bickering. Same bickering. Different war |

Rung 14 is the payoff of rung 2, which is why the early bickering has to be genuinely unpleasant. If you write it as charming from the start, there's nothing to invert.

---

## Slash commands

| Command | Effect |
|---|---|
| `/rung` | Report both positions |
| `/rung Mary 7` | Set Mary to rung 7 |
| `/ceiling 11` | Hard ceiling at rung 11 |
| `/mirror John broken` | Break John's misapprehension |
| `/mirror` | Report both mirror states |

## Settings

| Setting | Default | Notes |
|---|---|---|
| Minimum messages per rung | 15 | Hard lock. Nothing advances until served |
| Maximum desync | 4 | Beyond this the misreading stops being legible |
| Ceiling | 20 | Absolute write limit |
| Injection depth | 2 | Recency matters — keep it shallow |
| Count automatically | on | Off if you'd rather hand-count |

Injection runs ~700 tokens.

## Notes

There's deliberately **no AI-judged auto-advancement**. Handing the model authority over when the burn advances reintroduces the exact problem the extension exists to solve.

## License

MIT
