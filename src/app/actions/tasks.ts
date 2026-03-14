"use server";

import { requireUser, getTenantMember } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const taskId = String(formData.get("taskId") || "");
  if (!taskId) return { error: "Missing task" };

  const supabase = await createSupabaseServer();
  const { data: task } = await supabase
    .from("tasks")
    .select("application_id")
    .eq("id", taskId)
    .eq("tenant_id", member.tenant_id)
    .maybeSingle();

  await supabase
    .from("tasks")
    .update({ status: "completed", assigned_to: user.id })
    .eq("id", taskId)
    .eq("tenant_id", member.tenant_id);

  if (task?.application_id) {
    revalidatePath(`/applications/${task.application_id}`);
  }
  return { success: true };
}
