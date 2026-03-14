import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const supabase = createSupabaseAdmin();

  if (payload.type === "signature.completed") {
    await supabase
      .from("signature_requests")
      .update({ status: "completed" })
      .eq("id", payload.signatureRequestId);
  }

  return NextResponse.json({ received: true });
}
