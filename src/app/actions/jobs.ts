"use server";

import { requireUser, getTenantMember } from "@/lib/auth";
import { runJob } from "@/services/jobs";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function runJobNow(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const jobName = String(formData.get("jobName") || "");
  if (!jobName) return { error: "Missing job name." };

  await runJob(member.tenant_id, jobName);
  return { success: true };
}

export async function seedJobs() {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const supabase = await createSupabaseServer();
  await supabase.from("jobs").insert([
    { tenant_id: member.tenant_id, name: "daily-credit-pull", schedule: "0 2 * * *" },
    { tenant_id: member.tenant_id, name: "document-ocr", schedule: "*/30 * * * *" },
  ]);

  return { success: true };
}

