import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const mode = process.argv.includes("--apply")
  ? "apply"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : null;

if (!mode || process.argv.includes("--apply") === process.argv.includes("--dry-run")) {
  throw new Error("Usage: npm run reconcile:manager-bonuses -- --dry-run|--apply");
}

function readEnvironment() {
  if (!existsSync(".env.local")) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");

  return Object.fromEntries(
    readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
      const separator = line.indexOf("=");
      if (separator < 1 || line.trimStart().startsWith("#")) return [];
      return [[
        line.slice(0, separator).trim(),
        line.slice(separator + 1).trim().replace(/^(?:\"|')|(?:\"|')$/g, ""),
      ]];
    }),
  );
}

const environment = readEnvironment();
if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY || !environment.BOOTSTRAP_ORG_SLUG) {
  throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
}

const supabase = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", environment.BOOTSTRAP_ORG_SLUG)
  .maybeSingle();
if (organizationError || !organization) throw new Error("DIRECTORY_ORGANIZATION_NOT_FOUND");

const [rolesResult, assignmentsResult, profilesResult, plansResult] = await Promise.all([
  supabase.from("roles").select("id,key"),
  supabase
    .from("manager_assignments")
    .select("profile_id,role_id,branch_id")
    .eq("organization_id", organization.id)
    .eq("status", "active"),
  supabase
    .from("profiles")
    .select("id,default_branch_id")
    .eq("organization_id", organization.id),
  supabase
    .from("manager_bonus_plans")
    .select("id,profile_id,branch_id,base_amount,category,effective_from,created_at")
    .eq("organization_id", organization.id)
    .eq("status", "active"),
]);

for (const result of [rolesResult, assignmentsResult, profilesResult, plansResult]) {
  if (result.error) throw new Error(`BONUS_RECONCILIATION_READ_FAILED:${result.error.code ?? "unknown"}`);
}

const managerRoleIds = new Set(
  (rolesResult.data ?? [])
    .filter((role) => role.key === "gerente_sucursal")
    .map((role) => role.id),
);
const branchesByProfile = new Map();
for (const assignment of assignmentsResult.data ?? []) {
  if (!managerRoleIds.has(assignment.role_id) || !assignment.branch_id) continue;
  const branches = branchesByProfile.get(assignment.profile_id) ?? new Set();
  branches.add(assignment.branch_id);
  branchesByProfile.set(assignment.profile_id, branches);
}
const multiBranchProfiles = new Set(
  [...branchesByProfile.entries()]
    .filter(([, branches]) => branches.size > 1)
    .map(([profileId]) => profileId),
);
const defaultBranchByProfile = new Map(
  (profilesResult.data ?? []).map((profile) => [profile.id, profile.default_branch_id]),
);
const plansByProfile = new Map();
for (const plan of plansResult.data ?? []) {
  if (!multiBranchProfiles.has(plan.profile_id)) continue;
  const plans = plansByProfile.get(plan.profile_id) ?? [];
  plans.push(plan);
  plansByProfile.set(plan.profile_id, plans);
}

const duplicates = [...plansByProfile.entries()]
  .filter(([, plans]) => plans.length > 1)
  .map(([profileId, plans]) => {
    const defaultBranchId = defaultBranchByProfile.get(profileId) ?? null;
    const ordered = [...plans].sort((left, right) => {
      const leftDefault = left.branch_id === defaultBranchId ? 0 : 1;
      const rightDefault = right.branch_id === defaultBranchId ? 0 : 1;
      if (leftDefault !== rightDefault) return leftDefault - rightDefault;
      return String(left.effective_from ?? left.created_at ?? "").localeCompare(
        String(right.effective_from ?? right.created_at ?? ""),
      );
    });
    const canonical = ordered[0];
    return {
      canonical,
      duplicatePlans: ordered.slice(1),
      profileId,
      hasValueConflict: new Set(plans.map((plan) => `${plan.base_amount}:${plan.category}`)).size > 1,
    };
  });

const report = {
  mode,
  multiBranchProfiles: multiBranchProfiles.size,
  duplicateProfiles: duplicates.length,
  duplicatePlans: duplicates.reduce((total, item) => total + item.duplicatePlans.length, 0),
  valueConflicts: duplicates.filter((item) => item.hasValueConflict).length,
  deactivated: 0,
};

if (mode === "apply" && duplicates.length > 0) {
  const auditRows = duplicates.flatMap((item) => item.duplicatePlans.map((plan) => ({
    action: "manager_bonus_plan.deactivated_duplicate",
    entity_id: plan.id,
    entity_table: "manager_bonus_plans",
    metadata: {
      canonical_plan_id: item.canonical.id,
      source: "manager-bonus-reconciliation",
    },
    organization_id: organization.id,
  })));
  const { error: auditError } = await supabase.from("audit_logs").insert(auditRows);
  if (auditError) throw new Error("BONUS_RECONCILIATION_AUDIT_FAILED");

  const duplicateIds = duplicates.flatMap((item) => item.duplicatePlans.map((plan) => plan.id));
  const { error: updateError } = await supabase
    .from("manager_bonus_plans")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .in("id", duplicateIds)
    .eq("organization_id", organization.id)
    .eq("status", "active");
  if (updateError) throw new Error("BONUS_RECONCILIATION_UPDATE_FAILED");
  report.deactivated = duplicateIds.length;
}

console.log(JSON.stringify(report));
