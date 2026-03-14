"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "personal");
  const minAmount = Number(formData.get("minAmount") || 0);
  const maxAmount = Number(formData.get("maxAmount") || 0);
  const minTerm = Number(formData.get("minTerm") || 0);
  const maxTerm = Number(formData.get("maxTerm") || 0);
  const baseRate = Number(formData.get("baseRate") || 0);

  if (!name || !minAmount || !maxAmount || !minTerm || !maxTerm || !baseRate) {
    return { error: "All fields are required." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("loan_products").insert({
    tenant_id: member.tenant_id,
    name,
    type,
    min_amount: minAmount,
    max_amount: maxAmount,
    min_term_months: minTerm,
    max_term_months: maxTerm,
    base_rate: baseRate,
  });

  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { error: "Product id is required." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("loan_products")
    .delete()
    .eq("id", productId)
    .eq("tenant_id", member.tenant_id);

  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect("/products");
}
