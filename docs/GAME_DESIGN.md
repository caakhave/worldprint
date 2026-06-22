# Can You Geo? Mystery Map Game Design

Can You Geo? is the public suite brand. Mystery Map is the current playable mode. The old `worldprint` name remains only as a compatibility namespace in routes, content artifacts, and saved state.

## Core Prompt

`What does this map measure?`

The map is intentionally unlabeled. Darker means a larger numerical value, not a better value. Choropleth palettes vary by topic so different categories feel distinct while keeping the same low-to-high reading rule.

## Tiers

- Explorer: three broad choices, country names on pointer interaction, up to three investigations, unit clue available, lower penalties.
- Analyst: default tier, four plausible choices, up to three investigations, unit clue available.
- Cartographer: six close choices, one investigation, no unit clue.
- Atlas Master: no visible choices, explicit search/autocomplete over the playable map catalog, one investigation, no unit clue.

## Scoring

Each round starts at 1,000 points. Scores are never time-based in Daily. Minimum eventual solved score is 100.

Analyst baseline:

- Investigation penalties: 100, 150, 200.
- Unit clue: 200.
- Wrong answer: 300.

Explorer uses gentler clues. Cartographer and Atlas Master use fewer, steeper clues. Scoring lives in pure configuration and is tested.

## Daily Loop

Daily has five deterministic rounds selected by UTC date and content version. The same correct indicators are used across tiers; assistance and answer interface differ.

The v1 variety engine avoids over-repeating categories, avoids all-easy or all-expert days when the pool supports balance, includes at least one expert-style round when possible, and avoids strongly correlated indicators in the same Daily when there are alternatives. Production should still pre-generate seasonal manifests so old dailies never change after content updates.

## Practice Loop

Practice is a three-map preview within the approved catalog. It supports category and difficulty filters plus a random-practice-set reroll. It avoids repeated indicators in one run and never changes Daily streaks or lifetime Daily stats.

## Feedback And Reveal

Correct answers transition immediately to reveal. Wrong answers are marked, announced, deducted, and disabled without ending the round. Reveal includes indicator title, score, unit, source and year, coverage, numeric legend, what the map was showing, why it matters, best probe countries, common confusions, optional data caveat, high/low tables, source, and investigation history.

Pattern notes describe visible patterns or reviewed editorial observations only. Common-confusion notes explain why a distractor was tempting without accepting fuzzy but materially different answers. Unsupported causal claims are not allowed.

## Share Format

Share text is spoiler-free and includes challenge number, tier, per-round cells, total score, and no indicator names, categories, country values, or pattern clues.

Example:

```text
Can You Geo? Daily #184
Mystery Map
🟩 900
🟨 550
🟩 1000
🟥 100
🟩 800
3350 / 5000
Read the world.
```

## Future Calibration Questions

- Whether raw scores are comparable across tiers.
- Whether archive/category modes should score differently from Daily.
- How future paid access can deepen learning without selling answer advantage.
- How to incorporate mixed-suite Daily tours after more modes exist.
