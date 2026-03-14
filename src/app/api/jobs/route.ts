import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { runJob } from "@/services/jobs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-job-secret");
  if (process.env.JOB_SECRET && secret !== process.env.JOB_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, jobName } = await request.json();
  if (!tenantId || !jobName) {
    return NextResponse.json({ error: "Missing tenantId or jobName" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await runJob(tenantId, jobName);
  return NextResponse.json({ status: "ok" });
}
