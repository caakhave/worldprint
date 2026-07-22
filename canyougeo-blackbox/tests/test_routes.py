from __future__ import annotations

import pytest

from utils.assertions import assert_route_status
from utils.route_policy import PRODUCTION_SAFE_ROUTE_POLICIES, PUBLIC_ROUTE_STATUS_POLICIES, RoutePolicy


@pytest.mark.smoke
@pytest.mark.production_safe
@pytest.mark.parametrize("policy", PUBLIC_ROUTE_STATUS_POLICIES, ids=lambda policy: policy.path)
def test_public_routes_return_success_or_redirect(target_base_url: str, policy: RoutePolicy):
    assert_route_status(target_base_url, policy.path, expected=set(policy.expected_statuses))


@pytest.mark.production_safe
def test_production_safe_route_inventory_excludes_staging_private_paths():
    paths = {policy.path for policy in PRODUCTION_SAFE_ROUTE_POLICIES}

    assert "/archive/worldprint/" not in paths
    assert "/beta/worldprint/" not in paths
    assert "/internal/order-atlas-review/" not in paths
    assert "/internal/worldprint-review/" not in paths
    assert "/play/worldprint/" not in paths
