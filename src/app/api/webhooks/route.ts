import { NextRequest, NextResponse } from "next/server";
import { completeSignatureRequest } from "@/services/signatures";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.SIGNATURE_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-signature-secret");

  if (webhookSecret && webhookSecret !== providedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();

  if (payload.type === "signature.completed" && payload.signatureRequestId) {
    const result = await completeSignatureRequest(String(payload.signatureRequestId));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
