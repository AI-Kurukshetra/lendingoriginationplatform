"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";

export async function seedWorkflow() {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("workflows").insert({
    tenant_id: member.tenant_id,
    name: "Standard underwriting",
    definition: {
      steps: [
        { name: "KYC", type: "identity" },
        { name: "Credit", type: "credit" },
        { name: "Underwriting", type: "manual" },
        { name: "Compliance", type: "compliance" },
        { name: "Signature", type: "signature" },
      ],
    },
    active: true,
  });

  if (error) return { error: error.message };
  return { success: true };
}

