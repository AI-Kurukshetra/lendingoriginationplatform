"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function signUp(_: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const tenantName = String(formData.get("tenantName") || "").trim();
  const tenantSlug = String(formData.get("tenantSlug") || "").trim();

  if (!email || !password || !fullName || !tenantName || !tenantSlug) {
    return { error: "All fields are required." };
  }

  const admin = createSupabaseAdmin();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Unable to create user." };
  }

  const userId = created.user.id;

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: tenantName, slug: tenantSlug })
    .select("id")
    .single();

  if (tenantError) {
    return { error: tenantError.message };
  }

  const { error: memberError } = await admin.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "admin",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  await admin.from("profiles").upsert({ id: userId, full_name: fullName, email });

  const supabase = await createSupabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  redirect("/dashboard");
}

export async function signIn(_: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
