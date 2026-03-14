export async function getApiUsageCount({
  tenantId,
  windowSeconds,
}: {
  tenantId: string;
  windowSeconds: number;
}) {
  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { data } = await supabase
    .from("api_usage")
    .select("id", { count: "exact" })
    .eq("tenant_id", tenantId)
    .gte("created_at", since);

  return data?.length ?? 0;
}
