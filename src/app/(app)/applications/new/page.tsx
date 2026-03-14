import { createApplication } from "@/app/actions/applications";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default async function NewApplicationPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();
  const { data: products } = await supabase
    .from("loan_products")
    .select("id, name")
    .eq("tenant_id", member.tenant_id)
    .eq("active", true);

  async function handleCreateApplication(formData: FormData) {
    "use server";
    await createApplication(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Application</h1>
        <p className="text-sm text-muted">
          Capture borrower details and kick off automated decisioning.
        </p>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-2" action={handleCreateApplication}>
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
            <label className="text-xs font-semibold text-muted">Channel</label>
            <Select name="channel" defaultValue="web">
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
              <option value="partner">Partner</option>
              <option value="pos">Point of sale</option>
              <option value="api">API</option>
            </Select>
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

