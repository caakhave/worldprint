import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = "supabase/migrations/20260718170000_google_play_purchase_verification.sql";
const source = readFileSync(join(process.cwd(), migrationFile), "utf8");
const persistenceDetailMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723200000_google_play_purchase_persistence_error_detail.sql"),
  "utf8"
);
const tokenUpsertFixMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723210000_google_play_purchase_token_upsert_conflict_target.sql"),
  "utf8"
);
const idempotentOwnerAckMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723220000_google_play_purchase_idempotent_owner_ack.sql"),
  "utf8"
);
const executableFixture = readFileSync(join(process.cwd(), "supabase/tests/google_play_purchase_verification.sql"), "utf8");
const compact = source.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Google Play purchase verification migration", () => {
  it("keeps raw purchase tokens in a service-role-only private table", () => {
    expect(source).toContain("create table if not exists billing.google_play_purchase_tokens");
    expect(source).toContain("purchase_token text not null");
    expect(source).toContain("purchase_token_fingerprint text not null");
    expect(source).toContain("alter table billing.google_play_purchase_tokens force row level security");
    expect(source).toContain("revoke all on table billing.google_play_purchase_tokens from anon");
    expect(source).toContain("revoke all on table billing.google_play_purchase_tokens from authenticated");
    expect(source).toContain("grant all privileges on table billing.google_play_purchase_tokens to service_role");
    expect(compact).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]+google_play_purchase_tokens\s+to\s+(anon|authenticated)/i);
  });

  it("binds only the approved package, product, and base plans", () => {
    expect(source).toContain("package_name = 'com.canyougeo.app'");
    expect(source).toContain("'com.canyougeo.app:canyougeo_pro:monthly'");
    expect(source).toContain("'com.canyougeo.app:canyougeo_pro:annual'");
    expect(source).toContain("v_token_ref !~ '^sha256_[a-f0-9]{64}$'");
    expect(source).toContain("v_purchase_token ~ '[[:space:]]'");
  });

  it("rejects cross-user and linked-token ownership conflicts before refreshing entitlements", () => {
    expect(source).toContain("ownership_conflict");
    expect(source).toContain("linked_token_ownership_conflict");
    expect(source.indexOf("linked_token_ownership_conflict")).toBeLessThan(
      source.indexOf("billing.refresh_effective_entitlement_summary")
    );
  });

  it("acknowledges through a separate fingerprint-only RPC after durable processing", () => {
    expect(source).toContain("create or replace function billing.record_google_play_purchase_acknowledgement");
    expect(source).toContain("p_purchase_token_fingerprint text");
    expect(source).toContain("purchase_token_fingerprint = v_token_ref");
    expect(source).toContain("record_google_play_purchase_acknowledgement(text, text, timestamptz)");
    expect(compact).not.toMatch(/record_google_play_purchase_acknowledgement\([^)]*purchase_token\s+text/i);
  });

  it("preserves sanitized SQLSTATE and constraint diagnostics for provider persistence failures", () => {
    expect(persistenceDetailMigration).toContain("provider_subscription_write_failed");
    expect(persistenceDetailMigration).toContain("purchase_token_persistence_failed");
    expect(persistenceDetailMigration).toContain("linked_subscription_supersede_failed");
    expect(persistenceDetailMigration).toContain("get stacked diagnostics v_db_constraint = constraint_name");
    expect(persistenceDetailMigration).toContain("v_db_sqlstate := SQLSTATE");
    expect(persistenceDetailMigration).toContain("last_error_code = v_last_error_code");
    expect(persistenceDetailMigration).toContain("v_last_error_code := v_result || '':sqlstate:''");
    expect(persistenceDetailMigration).not.toMatch(/SQLERRM|PG_EXCEPTION_DETAIL|p_purchase_token\s*\|\||v_purchase_token\s*\|\|/i);
  });

  it("documents and fixes the old token upsert conflict-target ambiguity", () => {
    expect(source).toContain("provider_environment text");
    expect(source).toContain("on conflict (provider_environment, purchase_token_fingerprint) do update");
    expect(tokenUpsertFixMigration).toContain("SQLSTATE 42702");
    expect(tokenUpsertFixMigration).toContain("add constraint google_play_purchase_tokens_fingerprint_uidx");
    expect(tokenUpsertFixMigration).toContain("unique using index google_play_purchase_tokens_fingerprint_uidx");
    expect(tokenUpsertFixMigration).toContain(
      "on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update"
    );
    expect(tokenUpsertFixMigration).toContain(
      "'on conflict (provider_environment, purchase_token_fingerprint) do update',\n    'on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update'"
    );
  });

  it("preserves retry, ownership isolation, entitlement, and acknowledgement ordering", () => {
    const tokenInsertIndex = source.indexOf("insert into billing.google_play_purchase_tokens");

    expect(tokenUpsertFixMigration).toContain("purchase_token_persistence_failed");
    expect(source.indexOf("ownership_conflict")).toBeLessThan(tokenInsertIndex);
    expect(source.indexOf("linked_token_ownership_conflict")).toBeLessThan(tokenInsertIndex);
    expect(tokenInsertIndex).toBeLessThan(source.indexOf("billing.refresh_effective_entitlement_summary"));
    expect(source.indexOf("v_ack_required")).toBeLessThan(source.indexOf("return query"));
    expect(source).toContain("provider_subscription_changed");
    expect(source).toContain("compatibility_refreshed");
    expect(source).toContain("already_processed");
  });

  it("keeps the token persistence fix free of sensitive logging or client-visible grants", () => {
    expect(tokenUpsertFixMigration).not.toMatch(/SQLERRM|PG_EXCEPTION_DETAIL|raise notice|raise log/i);
    expect(tokenUpsertFixMigration).not.toMatch(/p_purchase_token\s*\|\||v_purchase_token\s*\|\|/i);
    expect(tokenUpsertFixMigration).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]+google_play_purchase_tokens\s+to\s+(anon|authenticated)/i);
    expect(tokenUpsertFixMigration).not.toContain("public.entitlements");
  });

  it("allows processed Google Play events to retry acknowledgement while preserving owner isolation", () => {
    expect(idempotentOwnerAckMigration).toContain("v_event.related_user_id is distinct from v_user_id");
    expect(idempotentOwnerAckMigration).toContain("gt.user_id is distinct from v_user_id");
    expect(idempotentOwnerAckMigration).toContain("gt.acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_PENDING'");
    expect(idempotentOwnerAckMigration).toContain("v_acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_PENDING'");
    expect(idempotentOwnerAckMigration).toContain("v_ack_required := coalesce(v_ack_required, false)");
    expect(idempotentOwnerAckMigration).toContain("on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update");
    expect(idempotentOwnerAckMigration).toContain("purchase_token_persistence_failed");
    expect(idempotentOwnerAckMigration).toContain("billing.record_google_play_purchase_acknowledgement(text, text, timestamptz)");
    expect(idempotentOwnerAckMigration).toContain("update billing.google_play_purchase_tokens as gt");
    expect(idempotentOwnerAckMigration).toContain("gt.provider_environment = v_environment");
    expect(idempotentOwnerAckMigration).toContain("gt.purchase_token_fingerprint = v_token_ref");
    expect(idempotentOwnerAckMigration).not.toMatch(/SQLERRM|PG_EXCEPTION_DETAIL|raise notice|raise log/i);
    expect(idempotentOwnerAckMigration).not.toMatch(/p_purchase_token\s*\|\||v_purchase_token\s*\|\|/i);
  });

  it("includes an executable rollback-protected RPC integration fixture", () => {
    expect(executableFixture.trimStart()).toMatch(/^\\set ON_ERROR_STOP on/);
    expect(executableFixture).toMatch(/\bbegin;/i);
    expect(executableFixture.trimEnd()).toMatch(/rollback;$/i);
    expect(executableFixture).toContain("public.process_google_play_purchase_verification");
    expect(executableFixture).toContain("billing.provider_subscriptions");
    expect(executableFixture).toContain("billing.google_play_purchase_tokens");
    expect(executableFixture).toContain("public.entitlements");
    expect(executableFixture).toContain("billing.provider_events");
    expect(executableFixture).toContain("public.record_google_play_purchase_acknowledgement");
    expect(executableFixture).toContain("'already_processed'");
    expect(executableFixture).toContain("'ownership_conflict'");
    expect(executableFixture).toContain("synthetic-google-play-token-not-real");
    expect(executableFixture).not.toContain("ya29.");
    expect(executableFixture).not.toMatch(/Authorization|Bearer|service_account|private_key|gmail\.com/i);
  });
});
