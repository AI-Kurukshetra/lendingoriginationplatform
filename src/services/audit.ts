import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function logAudit({
  tenantId,
  actorId,
  action,
  entity,
  entityId,
  payload = {},
}: {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdmin();
  await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    payload,
  });
}
