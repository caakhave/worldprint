from __future__ import annotations

import json
from pathlib import Path

import pytest

from tools import run_suite

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.production_safe
def test_root_package_blackbox_scripts_use_safe_runner():
    package = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    scripts = package["scripts"]

    assert scripts["qa:blackbox:test"].endswith("--target test --suite staging_full --report reports/test.html")
    assert scripts["qa:blackbox:prod"].endswith("--target apex --suite production_safe --report reports/prod.html")
    assert scripts["qa:blackbox:prod-auth"].endswith("--target apex --suite production_auth --report reports/prod-auth.html")
    assert scripts["qa:blackbox:prod-smoke"].endswith("--target apex --suite prod_smoke --report reports/prod-smoke.html")
    assert scripts["qa:blackbox:apex"].endswith("--target apex --suite production_safe --report reports/apex.html")
    assert scripts["qa:blackbox:www"].endswith("--target www --suite production_safe --report reports/www.html")
    assert "qa:native:android:release" in scripts
    assert "qa:native:ios:release" in scripts
    assert scripts["qa:native:android:preflight"].endswith("--platform android --suite release --preflight-only")
    assert scripts["qa:native:ios:preflight"].endswith("--platform ios --suite release --preflight-only")
    assert scripts["qa:drift"] == "node canyougeo-blackbox/tools/check_qa_drift.mjs"
    assert scripts["qa:report"] == "node canyougeo-blackbox/tools/build_qa_report_index.mjs"


@pytest.mark.production_safe
def test_production_safe_suite_excludes_mutating_and_auth_markers():
    expression = run_suite.SUITES["production_safe"].marker_expression

    for marker in ("checkout_smoke", "signup_analytics", "email_live", "auth", "production_auth", "staging_only"):
        assert f"not ({marker}" in expression or f" or {marker}" in expression


@pytest.mark.production_safe
def test_runner_rejects_unknown_or_cross_environment_auth_targets():
    with pytest.raises(ValueError, match="Unknown target"):
        run_suite.validate_suite_target("production_safe", "prod")
    with pytest.raises(ValueError, match="Use suite 'production_auth'"):
        run_suite.validate_suite_target("auth", "apex")
    with pytest.raises(ValueError, match="production_auth can only target"):
        run_suite.validate_suite_target("production_auth", "test")


@pytest.mark.production_safe
def test_optional_production_auth_uses_distinct_env_contract():
    auth_source = (REPO_ROOT / "canyougeo-blackbox/tests/test_authenticated_flows.py").read_text(encoding="utf-8")

    assert 'f"CGY_PROD_{plan.upper()}"' in auth_source
    assert 'policy_for_base_url(target_base_url).kind == "production"' in auth_source


@pytest.mark.production_safe
def test_runner_restricts_report_paths_to_ignored_report_directory():
    assert run_suite.approved_report_path("reports/prod.html").name == "prod.html"
    with pytest.raises(ValueError):
        run_suite.approved_report_path("../leak.html")
    with pytest.raises(ValueError):
        run_suite.approved_report_path("reports/prod.txt")


@pytest.mark.production_safe
def test_runner_sanitizes_sensitive_subprocess_output():
    env = {
        "CGY_PASSWORD": "super-secret-example",
        "CGY_TOKEN": "token-example",
        "CGY_NORMAL": "visible",
    }

    sanitized = run_suite.sanitize_output("super-secret-example token-example visible", env)
    assert "super-secret-example" not in sanitized
    assert "token-example" not in sanitized
    assert "visible" in sanitized
