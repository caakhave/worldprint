# WORLDPRINT Candidate Intake Report

Generated: 2026-06-27T17:13:47.895765+00:00
Content version: 2026.06.22-exp2-qa1

- Built-in curated candidates: 100
- Intake candidates loaded: 185
- Total candidate bank: 285
- Intake source: `content/candidates/worldprint-candidate-intake.json`

## Future Batch Workflow

1. Add 50-100 World Bank rows to the intake JSON instead of editing the Python candidate list.
2. Run `pnpm data:build` to fetch source data, apply the source gate, and emit scorecards.
3. Review `generated/reports/candidate-scorecards.md` before changing curated editorial statuses.
4. Only promote strong maps in `content/editorial/worldprint-indicator-review.json`; weak maps can remain draft-held, Needs-review, Expert-only, or Retired.

## Intake Fields

`id`, `providerCode`, `category`, `shortTitle`, `unit`, `maximumFractionDigits`, and `difficulty` are the key fields. Optional fields include `aliases`, `prefix`, `suffix`, `dataCaveat`, `shortHook`, `whyItMatters`, and `regionalSignals`.

## Warnings

- None.

## Errors

- None.
