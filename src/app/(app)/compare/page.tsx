import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { LoanComparisonClient } from "@/components/forms/loan-comparison-client";

export default async function ComparePage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: products } = await supabase
    .from("loan_products")
    .select("id, name, base_rate, min_term_months, max_term_months")
    .eq("tenant_id", member.tenant_id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Loan Comparison Tools</h1>
        <p className="text-sm text-muted">Compare loan products side-by-side.</p>
      </div>
      <LoanComparisonClient products={products ?? []} />
    </div>
  );
}

