import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { submitBorrowerApplication } from "@/app/actions/borrower";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ApplyWithInvitePage({ params }: PageProps) {
  await requireUser();
  const { token } = await params;
  const admin = createSupabaseAdmin();

  const { data: invite } = await admin
    .from("borrower_invites")
    .select("tenant_id, status, tenants(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return <div>Invite not found.</div>;

  const inviteTenant = Array.isArray(invite.tenants) ? invite.tenants[0] : invite.tenants;

  const supabase = await createSupabaseServer();
  const { data: products } = await supabase
    .from("loan_products")
    .select("id, name")
    .eq("tenant_id", invite.tenant_id)
    .eq("active", true);

  async function handleSubmitBorrowerApplication(formData: FormData) {
    "use server";
    await submitBorrowerApplication(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Apply with {inviteTenant?.name}</h1>
        <p className="text-sm text-muted">Complete your loan application.</p>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-2" action={handleSubmitBorrowerApplication}>
          <input type="hidden" name="tenantId" value={invite.tenant_id} />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">First name</label>
            <Input name="firstName" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Last name</label>
            <Input name="lastName" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Phone</label>
            <Input name="phone" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Annual income</label>
            <Input name="annualIncome" type="number" min="0" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Requested amount</label>
            <Input name="requestedAmount" type="number" min="0" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Requested term (months)</label>
            <Input name="requestedTerm" type="number" min="1" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Loan product</label>
            <Select name="loanProductId" required>
              <option value="">Select</option>
              {products?.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">State</label>
            <Input name="state" placeholder="CA" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">ID number</label>
            <Input name="idNumber" placeholder="Government ID" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Submit application</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

