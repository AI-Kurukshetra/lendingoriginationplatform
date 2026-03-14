"use server";

import { requireUser } from "@/lib/auth";
import { originateApplication } from "@/services/origination";
import { redirect } from "next/navigation";

export async function submitBorrowerApplication(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId") || "");
  if (!tenantId) return { error: "Tenant is required." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const annualIncome = Number(formData.get("annualIncome") || 0);
  const requestedAmount = Number(formData.get("requestedAmount") || 0);
  const requestedTerm = Number(formData.get("requestedTerm") || 0);
  const loanProductId = String(formData.get("loanProductId") || "");
  const state = String(formData.get("state") || "");
  const idNumber = String(formData.get("idNumber") || "");
  const channel = String(formData.get("channel") || "web") as "web" | "mobile" | "partner" | "pos" | "api";

  if (!firstName || !lastName || !requestedAmount || !requestedTerm || !loanProductId) {
    return { error: "Missing required fields." };
  }

  const result = await originateApplication({
    tenantId,
    actorUserId: user.id,
    borrowerUserId: user.id,
    borrower: {
      firstName,
      lastName,
      phone,
    },
    request: {
      requestedAmount,
      requestedTermMonths: requestedTerm,
      loanProductId,
      channel,
      annualIncome,
      state,
      idNumber,
      borrowerEmail: user.email,
    },
  });

  if (result.error) {
    return { error: result.error };
  }

  redirect("/portal");
}
