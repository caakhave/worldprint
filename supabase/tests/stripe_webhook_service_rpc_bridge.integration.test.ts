import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const runIntegration = process.env.CGY_RUN_LOCAL_SUPABASE_INTEGRATION === "1";
const maybeIt = runIntegration ? it : it.skip;

type LocalSupabaseEnv = {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

const serviceArgs = {
  p_provider_environment: "invalid_environment_probe",
  p_provider_event_ref: "evt_bridge_integration_invalid",
  p_event_type: "customer.subscription.updated",
  p_event_subtype: "monthly",
  p_event_created_at: "2026-07-16T12:00:00.000Z",
  p_user_id: "00000000-0000-0000-0000-000000057001",
  p_provider_customer_ref: "cus_bridge_integration_invalid",
  p_provider_subscription_ref: "sub_bridge_integration_invalid",
  p_provider_product_ref: "price_bridge_integration_invalid",
  p_provider_status: "active",
  p_current_period_start: "2026-07-16T00:00:00.000Z",
  p_current_period_end: "2026-08-16T00:00:00.000Z",
  p_cancel_at_period_end: false,
  p_payload_hash: "0".repeat(64),
};

describe("Stripe webhook service RPC bridge over local PostgREST", () => {
  maybeIt("resolves the unqualified public RPC for service_role and denies browser roles", async () => {
    const env = readLocalSupabaseEnv();
    const service = createClient(env.apiUrl, env.serviceRoleKey, { auth: { persistSession: false } });
    const anon = createClient(env.apiUrl, env.anonKey, { auth: { persistSession: false } });

    await cleanupLocalFixtures();
    await seedLocalUser("00000000-0000-0000-0000-000000057002");

    const beforeInvalid = await localCounts();
    const { data: invalidData, error: invalidError } = await service.rpc("process_stripe_webhook_transition_event", serviceArgs);
    expect(invalidError).toBeNull();
    expect(firstRow(invalidData)).toMatchObject({
      result: "invalid_environment",
      processed: false,
      provider_result: "invalid_environment",
    });
    expect(await localCounts()).toEqual(beforeInvalid);

    const validArgs = {
      ...serviceArgs,
      p_provider_environment: "test",
      p_provider_event_ref: "evt_bridge_integration_valid",
      p_user_id: "00000000-0000-0000-0000-000000057002",
      p_provider_customer_ref: "cus_bridge_integration_valid",
      p_provider_subscription_ref: "sub_bridge_integration_valid",
      p_provider_product_ref: "price_bridge_integration_valid",
      p_payload_hash: "1".repeat(64),
    };
    const { data: validData, error: validError } = await service.rpc("process_stripe_webhook_transition_event", validArgs);
    expect(validError).toBeNull();
    expect(firstRow(validData)).toMatchObject({
      result: "processed",
      processed: true,
      legacy_fields_updated: true,
      compatibility_refreshed: true,
      reconciliation_required: false,
    });

    const { data: duplicateData, error: duplicateError } = await service.rpc("process_stripe_webhook_transition_event", validArgs);
    expect(duplicateError).toBeNull();
    expect(firstRow(duplicateData)).toMatchObject({
      result: "already_processed",
      already_processed: true,
      legacy_fields_updated: true,
    });

    expect(await localFixtureSummary()).toEqual({
      providerEvents: 1,
      providerSubscriptions: 1,
      entitlementRows: 1,
      proRows: 1,
      legacyWebhookRows: 0,
    });

    const { error: anonError } = await anon.rpc("process_stripe_webhook_transition_event", serviceArgs);
    expect(anonError).toBeTruthy();
    expect(`${anonError?.message ?? ""} ${anonError?.code ?? ""}`).toMatch(/permission|not find|schema cache|PGRST/i);

    await cleanupLocalFixtures();
  }, 60_000);
});

function readLocalSupabaseEnv(): LocalSupabaseEnv {
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const values = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values.set(match[1], normalizeLocalEnvValue(match[2]));
  }
  const apiUrl = values.get("API_URL");
  const anonKey = values.get("ANON_KEY");
  const serviceRoleKey = values.get("SERVICE_ROLE_KEY");
  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Local Supabase status did not include API_URL, ANON_KEY, and SERVICE_ROLE_KEY.");
  }
  return { apiUrl, anonKey, serviceRoleKey };
}

function normalizeLocalEnvValue(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function runLocalSql(sql: string) {
  execFileSync("docker", ["exec", "-i", localDatabaseContainer(), "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    encoding: "utf8",
    input: sql,
  });
}

function runLocalJson<T>(sql: string): T {
  const output = execFileSync(
    "docker",
    ["exec", "-i", localDatabaseContainer(), "psql", "-X", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    {
      encoding: "utf8",
      input: sql,
    }
  );
  const jsonLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!jsonLine) {
    throw new Error("Local SQL query did not return JSON.");
  }
  return JSON.parse(jsonLine) as T;
}

function localDatabaseContainer() {
  const output = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  const container = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line === "supabase_db_worldprint" || line.startsWith("supabase_db_"));
  if (!container) {
    throw new Error("Local Supabase database container is not running.");
  }
  return container;
}

async function seedLocalUser(userId: string) {
  runLocalSql(`
    insert into auth.users (id, aud, role, created_at, updated_at)
    values ('${userId}', 'authenticated', 'authenticated', now(), now())
    on conflict (id) do nothing;

    insert into public.profiles (id, created_at, updated_at)
    values ('${userId}', now(), now())
    on conflict (id) do nothing;
  `);
}

async function cleanupLocalFixtures() {
  runLocalSql(`
    delete from billing.provider_events where provider_event_ref like 'evt_bridge_integration_%';
    delete from billing.provider_subscriptions where provider_subscription_ref like 'sub_bridge_integration_%';
    delete from public.entitlements where user_id in (
      '00000000-0000-0000-0000-000000057001'::uuid,
      '00000000-0000-0000-0000-000000057002'::uuid
    );
    delete from public.profiles where id in (
      '00000000-0000-0000-0000-000000057001'::uuid,
      '00000000-0000-0000-0000-000000057002'::uuid
    );
    delete from auth.users where id in (
      '00000000-0000-0000-0000-000000057001'::uuid,
      '00000000-0000-0000-0000-000000057002'::uuid
    );
  `);
}

async function localCounts() {
  return runLocalJson(`
    select jsonb_build_object(
      'providerEvents', (select count(*) from billing.provider_events where provider_event_ref like 'evt_bridge_integration_%'),
      'providerSubscriptions', (select count(*) from billing.provider_subscriptions where provider_subscription_ref like 'sub_bridge_integration_%'),
      'entitlementRows', (select count(*) from public.entitlements where user_id in ('00000000-0000-0000-0000-000000057001'::uuid, '00000000-0000-0000-0000-000000057002'::uuid)),
      'legacyWebhookRows', (select count(*) from public.stripe_webhook_events where event_id like 'evt_bridge_integration_%')
    );
  `);
}

async function localFixtureSummary() {
  return runLocalJson(`
    select jsonb_build_object(
      'providerEvents', (select count(*) from billing.provider_events where provider_event_ref = 'evt_bridge_integration_valid'),
      'providerSubscriptions', (select count(*) from billing.provider_subscriptions where provider_subscription_ref = 'sub_bridge_integration_valid'),
      'entitlementRows', (select count(*) from public.entitlements where user_id = '00000000-0000-0000-0000-000000057002'::uuid),
      'proRows', (select count(*) from public.entitlements where user_id = '00000000-0000-0000-0000-000000057002'::uuid and plan = 'pro' and status = 'active'),
      'legacyWebhookRows', (select count(*) from public.stripe_webhook_events where event_id like 'evt_bridge_integration_%')
    );
  `);
}
