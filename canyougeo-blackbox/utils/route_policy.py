from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RoutePolicy:
    path: str
    classification: str
    expected_statuses: frozenset[int] = frozenset({200, 301, 302, 303, 307, 308})
    indexable: bool = False
    production_safe: bool = True
    notes: str = ""


PUBLIC_INDEXABLE = "public and indexable"
PUBLIC_NOINDEX = "public but noindex"
SIGNED_OUT_RESTRICTED = "signed-out accessible with restricted state"
EXPECTED_REDIRECT = "expected redirect"
STAGING_PRIVATE = "staging-only/private"
ASSOCIATION_STATIC = "association/static metadata route"
OUT_OF_SCOPE = "not appropriate for browser black-box coverage"


ROUTE_POLICIES: tuple[RoutePolicy, ...] = (
    RoutePolicy("/", PUBLIC_INDEXABLE, indexable=True, notes="Homepage and SEO entry point."),
    RoutePolicy("/play/", PUBLIC_INDEXABLE, indexable=True, notes="Game library hub."),
    RoutePolicy("/play/mystery-map/", PUBLIC_INDEXABLE, indexable=True, notes="Mystery Map public lobby and sample entry."),
    RoutePolicy("/play/pattern-atlas/", PUBLIC_INDEXABLE, indexable=True, notes="Pattern Atlas public lobby and sample entry."),
    RoutePolicy("/play/order-atlas/", PUBLIC_INDEXABLE, indexable=True, notes="Order Atlas public lobby and sample entry."),
    RoutePolicy("/how-to-play/", PUBLIC_INDEXABLE, indexable=True, notes="Public gameplay instructions."),
    RoutePolicy("/daily-geography-game/", PUBLIC_INDEXABLE, indexable=True, notes="SEO landing page."),
    RoutePolicy("/map-quiz/", PUBLIC_INDEXABLE, indexable=True, notes="SEO landing page."),
    RoutePolicy("/choropleth-map-game/", PUBLIC_INDEXABLE, indexable=True, notes="SEO landing page."),
    RoutePolicy("/country-guessing-game/", PUBLIC_INDEXABLE, indexable=True, notes="SEO landing page."),
    RoutePolicy("/sources/", PUBLIC_INDEXABLE, indexable=True, notes="Public source methodology."),
    RoutePolicy("/past-games/", PUBLIC_INDEXABLE, indexable=True, notes="Public/restricted archive surface."),
    RoutePolicy("/about/", PUBLIC_INDEXABLE, indexable=True, notes="Public product information."),
    RoutePolicy("/upgrade/", PUBLIC_INDEXABLE, indexable=True, notes="Public Free/Pro comparison; checkout is not opened by default."),
    RoutePolicy("/support/", PUBLIC_INDEXABLE, indexable=True, notes="Public support and billing guidance."),
    RoutePolicy("/account-deletion/", PUBLIC_INDEXABLE, indexable=True, notes="Public store-policy account deletion URL."),
    RoutePolicy("/legal/", PUBLIC_INDEXABLE, indexable=True, notes="Combined Terms, Privacy, Accessibility, and support page."),
    RoutePolicy("/privacy/", PUBLIC_INDEXABLE, indexable=True, notes="Direct Privacy Policy route."),
    RoutePolicy("/terms/", PUBLIC_INDEXABLE, indexable=True, notes="Direct Terms of Use route."),
    RoutePolicy("/sign-in/", PUBLIC_NOINDEX, notes="Signed-out auth form; robots-disallowed in production."),
    RoutePolicy("/sign-up/", PUBLIC_NOINDEX, notes="Signed-out auth form; account creation is opt-in only."),
    RoutePolicy("/forgot-password/", PUBLIC_NOINDEX, notes="Password recovery request form."),
    RoutePolicy("/reset-password/", PUBLIC_NOINDEX, notes="Token-driven password reset surface."),
    RoutePolicy("/auth/callback/", PUBLIC_NOINDEX, notes="Token callback route; tokenless access must fail safely."),
    RoutePolicy("/account/", SIGNED_OUT_RESTRICTED, notes="Account route renders signed-out state without private data."),
    RoutePolicy("/account/stats/", SIGNED_OUT_RESTRICTED, notes="Stats route renders restricted/signed-out state without private data."),
    RoutePolicy("/challenge/mystery-map/", SIGNED_OUT_RESTRICTED, notes="Challenge route must be spoiler-safe without a valid code."),
    RoutePolicy("/challenge/worldprint/", EXPECTED_REDIRECT, notes="Legacy challenge route should not server-error."),
    RoutePolicy("/robots.txt", ASSOCIATION_STATIC, indexable=False, notes="Robots policy endpoint."),
    RoutePolicy("/sitemap.xml", ASSOCIATION_STATIC, indexable=False, notes="Sitemap endpoint; production should list public indexed routes."),
    RoutePolicy("/.well-known/apple-app-site-association", ASSOCIATION_STATIC, indexable=False, notes="Apple Universal Links association file."),
    RoutePolicy("/.well-known/assetlinks.json", ASSOCIATION_STATIC, indexable=False, notes="Android App Links association file."),
    RoutePolicy("/archive/worldprint/", STAGING_PRIVATE, production_safe=False, notes="Legacy internal archive route, noindex."),
    RoutePolicy("/beta/worldprint/", STAGING_PRIVATE, production_safe=False, notes="Legacy beta route, noindex."),
    RoutePolicy("/internal/order-atlas-review/", STAGING_PRIVATE, production_safe=False, notes="Internal review utility, noindex."),
    RoutePolicy("/internal/worldprint-review/", STAGING_PRIVATE, production_safe=False, notes="Internal review utility, noindex."),
    RoutePolicy("/play/worldprint/", STAGING_PRIVATE, production_safe=False, notes="Legacy game route, noindex."),
    RoutePolicy("/play/worldprint/2026-06-02/", STAGING_PRIVATE, production_safe=False, notes="Legacy generated game date route, noindex."),
    RoutePolicy("/play/mystery-map/2026-06-02/", PUBLIC_NOINDEX, notes="Generated date route; intentionally not in sitemap."),
)


ROUTES_BY_PATH = {policy.path: policy for policy in ROUTE_POLICIES}

INDEXED_PUBLIC_ROUTES = tuple(policy.path for policy in ROUTE_POLICIES if policy.classification == PUBLIC_INDEXABLE)

PUBLIC_ROUTE_STATUS_POLICIES = tuple(
    policy
    for policy in ROUTE_POLICIES
    if policy.classification in {PUBLIC_INDEXABLE, PUBLIC_NOINDEX, SIGNED_OUT_RESTRICTED, EXPECTED_REDIRECT, ASSOCIATION_STATIC}
)

PRODUCTION_SAFE_ROUTE_POLICIES = tuple(policy for policy in PUBLIC_ROUTE_STATUS_POLICIES if policy.production_safe)

NOINDEX_ROUTE_PREFIXES = (
    "/account/",
    "/auth/",
    "/challenge/",
    "/forgot-password/",
    "/internal/",
    "/reset-password/",
    "/sign-in/",
    "/sign-up/",
)


def route_policy_for(path: str) -> RoutePolicy:
    try:
        return ROUTES_BY_PATH[path]
    except KeyError as exc:
        raise KeyError(f"No black-box route policy has been recorded for {path}") from exc
