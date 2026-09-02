import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Actor, ScopeBoundary } from "@/lib/v7/security/types";

export class ScopeResolutionError extends Error {
  status: number;
  code: string;

  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export type RequestedScope = {
  countryId?: string | null;
  companyId?: string | null;
  operationalAreaId?: string | null;
  branchId?: string | null;
};

type BranchScopeRow = {
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
};

type AreaScopeRow = {
  organization_id: string;
  country_id: string;
  company_id: string;
};

export async function resolveRequestedScope(
  supabase: SupabaseClient,
  actor: Actor,
  requested: RequestedScope,
): Promise<ScopeBoundary> {
  const normalized: ScopeBoundary = {
    organizationId: actor.scope.organizationId,
    countryId: requested.countryId ?? null,
    companyId: requested.companyId ?? null,
    operationalAreaId: requested.operationalAreaId ?? null,
    branchId: requested.branchId ?? null,
  };

  if (requested.branchId) {
    const { data, error } = await supabase
      .from("branches")
      .select("organization_id,country_id,company_id,operational_area_id")
      .eq("id", requested.branchId)
      .maybeSingle();
    if (error || !data) throw new ScopeResolutionError("BRANCH_NOT_FOUND_OR_FORBIDDEN", 404);
    const branch = data as BranchScopeRow;
    if (branch.organization_id !== actor.scope.organizationId) throw new ScopeResolutionError("ORGANIZATION_SCOPE_MISMATCH", 403);
    if (requested.countryId && requested.countryId !== branch.country_id) throw new ScopeResolutionError("COUNTRY_SCOPE_MISMATCH", 409);
    if (requested.companyId && requested.companyId !== branch.company_id) throw new ScopeResolutionError("COMPANY_SCOPE_MISMATCH", 409);
    if (requested.operationalAreaId && requested.operationalAreaId !== branch.operational_area_id) throw new ScopeResolutionError("AREA_SCOPE_MISMATCH", 409);
    normalized.countryId = branch.country_id;
    normalized.companyId = branch.company_id;
    normalized.operationalAreaId = branch.operational_area_id;
    normalized.branchId = requested.branchId;
    return normalized;
  }

  if (requested.operationalAreaId) {
    const { data, error } = await supabase
      .from("operational_areas")
      .select("organization_id,country_id,company_id")
      .eq("id", requested.operationalAreaId)
      .maybeSingle();
    if (error || !data) throw new ScopeResolutionError("AREA_NOT_FOUND_OR_FORBIDDEN", 404);
    const area = data as AreaScopeRow;
    if (area.organization_id !== actor.scope.organizationId) throw new ScopeResolutionError("ORGANIZATION_SCOPE_MISMATCH", 403);
    if (requested.countryId && requested.countryId !== area.country_id) throw new ScopeResolutionError("COUNTRY_SCOPE_MISMATCH", 409);
    if (requested.companyId && requested.companyId !== area.company_id) throw new ScopeResolutionError("COMPANY_SCOPE_MISMATCH", 409);
    normalized.countryId = area.country_id;
    normalized.companyId = area.company_id;
  }

  if (normalized.countryId) {
    const { data } = await supabase.from("countries").select("id,organization_id").eq("id", normalized.countryId).maybeSingle();
    if (!data || data.organization_id !== actor.scope.organizationId) throw new ScopeResolutionError("COUNTRY_NOT_FOUND_OR_FORBIDDEN", 404);
  }

  if (normalized.companyId) {
    const { data } = await supabase.from("companies").select("id,organization_id").eq("id", normalized.companyId).maybeSingle();
    if (!data || data.organization_id !== actor.scope.organizationId) throw new ScopeResolutionError("COMPANY_NOT_FOUND_OR_FORBIDDEN", 404);
  }

  return normalized;
}
