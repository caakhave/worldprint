from __future__ import annotations

import json
import re

import pytest

from utils.assertions import assert_route_status

EXPECTED_IOS_APP_ID = "G5N5U6QFS8.com.canyougeo.app"
EXPECTED_ANDROID_PACKAGE = "com.canyougeo.app"
EXPECTED_ANDROID_FINGERPRINT = "D4:95:77:E6:E5:D7:90:B1:64:2E:86:32:EC:DD:24:3E:1D:97:82:73:64:03:6A:2E:93:B9:17:88:96:36:99:37"


@pytest.mark.production_safe
def test_apple_app_site_association_shape_and_routes(target_base_url: str):
    response = assert_route_status(target_base_url, "/.well-known/apple-app-site-association", expected={200})
    document = json.loads(response.text)
    details = document["applinks"]["details"]

    assert details[0]["appID"] == EXPECTED_IOS_APP_ID
    paths = details[0]["paths"]
    for required_path in (
        "/",
        "/play/mystery-map/",
        "/play/pattern-atlas/",
        "/play/order-atlas/",
        "/challenge/mystery-map/",
        "/upgrade/",
        "/support/",
        "/legal/",
        "/privacy/",
        "/terms/",
        "/account/",
        "/account/stats/",
    ):
        assert required_path in paths

    assert "NOT /internal/*" in paths
    assert "NOT /data/*" in paths
    assert not re.search(r"secret|token|service_role|private", response.text, flags=re.I)


@pytest.mark.production_safe
def test_android_assetlinks_shape_and_package(target_base_url: str):
    response = assert_route_status(target_base_url, "/.well-known/assetlinks.json", expected={200})
    document = json.loads(response.text)

    assert isinstance(document, list)
    assert document[0]["relation"] == ["delegate_permission/common.handle_all_urls"]
    target = document[0]["target"]
    assert target["namespace"] == "android_app"
    assert target["package_name"] == EXPECTED_ANDROID_PACKAGE
    assert target["sha256_cert_fingerprints"] == [EXPECTED_ANDROID_FINGERPRINT]
    assert not re.search(r"secret|token|service_role|private|password", response.text, flags=re.I)
