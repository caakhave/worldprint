# Can You Geo Black-Box QA Coverage Contract

This external suite is a maintained QA artifact. Every meaningful Can You Geo site change should update the black-box suite when the change affects public behavior, public routes, account flows, gameplay entry points, SEO/indexing, security headers, or share/email surfaces.

## New Public Route

Must update:

- `tests/test_routes.py`
- indexing expectations if the route should or should not be indexable
- mobile layout smoke if the route is user-facing
- page-object coverage when the route has interactive behavior

## New Game

Must add:

- page object
- route smoke
- play hub card and CTA assertion
- signed-out sample smoke
- mobile board or primary-interaction visibility test
- result/completion smoke
- copy safety checks for signed-out users

## New Auth, Account, Or Billing Behavior

Must add or update:

- signed-out auth page smoke
- optional authenticated smoke behind env vars
- account and upgrade assertions
- payment safety checks
- checkout-open smoke behind `checkout_smoke` plus explicit credentials/opt-in when checkout behavior changes
- signup analytics smoke behind `signup_analytics` plus explicit disposable credentials/opt-in when signup conversion behavior changes

Never test live payments by default.

## New SEO, Indexing, Or Security Policy

Must update:

- indexing policy tests
- robots and sitemap checks
- security header expectations
- host policy notes when a host changes launch/private status

## New Share, Challenge, Or Email Feature

Must update:

- non-live route and copy smoke
- spoiler-safety assertions where applicable
- live email coverage only behind the `email_live` marker and explicit env opt-in

## New `data-testid` Selector

Prefer stable selectors for black-box tests when roles/text are insufficient, but do not couple the suite to implementation internals unnecessarily. Names should describe user-visible regions or actions, not component internals.

## Definition Of Done

A feature is not QA-complete until:

- internal app tests pass
- black-box smoke passes against `CGY_TARGET=test`
- relevant black-box coverage has been added or intentionally documented as not needed
- the export zip can be regenerated with `python tools/export_suite.py`
