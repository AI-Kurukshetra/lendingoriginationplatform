import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createProduct, deleteProduct } from "@/app/actions/products";

export default async function ProductsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: products } = await supabase
    .from("loan_products")
    .select("id, name, type, base_rate, min_amount, max_amount, active")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false });

  async function handleCreateProduct(formData: FormData) {
    "use server";
    await createProduct(formData);
  }

  async function handleDeleteProduct(formData: FormData) {
    "use server";
    await deleteProduct(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Loan Products</h1>
        <p className="text-sm text-muted">Configure terms, rates, and eligibility.</p>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-3" action={handleCreateProduct}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Product name</label>
            <Input name="name" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Type</label>
            <Select name="type" defaultValue="personal">
              <option value="personal">Personal</option>
              <option value="mortgage">Mortgage</option>
              <option value="auto">Auto</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Base rate (%)</label>
            <Input name="baseRate" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Min amount</label>
            <Input name="minAmount" type="number" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Max amount</label>
            <Input name="maxAmount" type="number" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Min term (months)</label>
            <Input name="minTerm" type="number" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Max term (months)</label>
            <Input name="maxTerm" type="number" required />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Create product</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="space-y-3 text-sm">
          {products?.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-muted">
                  {product.type} • {product.min_amount}-{product.max_amount} • {product.base_rate}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">
                  {product.active ? "Active" : "Inactive"}
                </span>
                <form action={handleDeleteProduct} className="inline">
                  <input type="hidden" name="productId" value={product.id} />
                  <Button type="submit" variant="danger" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
