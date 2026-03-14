import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await requireRole(["admin", "underwriter", "compliance"]);
  const formData = await request.formData();

  const name = String(formData.get("name") || "").trim();
  const minScore = Number(formData.get("minScore") || 0);
  const maxScore = Number(formData.get("maxScore") || 0);
  const weight = Number(formData.get("weight") || 0);

  if (!name || !minScore || !maxScore || !weight) {
    return NextResponse.redirect(new URL("/risk", request.url));
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.redirect(new URL("/dashboard", request.url));

  await supabase.from("risk_rules").insert({
    tenant_id: member.tenant_id,
    name,
    min_score: minScore,
    max_score: maxScore,
    weight,
  });

  return NextResponse.redirect(new URL("/risk", request.url));
}

