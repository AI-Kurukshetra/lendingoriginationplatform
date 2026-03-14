"use client";

import { useActionState, useState } from "react";
import { createBorrowerInvite } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: { error?: string; token?: string } = {};

export function BorrowerInviteForm() {
  const [state, formAction] = useActionState(createBorrowerInvite, initialState);
  const [copied, setCopied] = useState(false);

  const inviteToken = state?.token ?? "";

  const handleCopy = async () => {
    if (!inviteToken) return;
    await navigator.clipboard.writeText(inviteToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-center gap-3" action={formAction}>
        <Input name="email" placeholder="Borrower email (optional)" className="min-w-[240px]" />
        <Button type="submit">Generate invite</Button>
      </form>
      {state?.token ? (
        <div className="rounded-2xl border border-border bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Invite token</p>
            <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-2 break-all font-mono">{inviteToken}</p>
        </div>
      ) : null}
      {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </div>
  );
}


