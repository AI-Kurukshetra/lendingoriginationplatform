"use client";

import { useActionState, useState } from "react";
import { createApiKey } from "@/app/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: { error?: string; success?: boolean; key?: string } = {};

export function ApiKeyForm() {
  const [state, formAction] = useActionState(createApiKey, initialState);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!state?.key) return;
    await navigator.clipboard.writeText(state.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-center gap-3" action={formAction}>
        <Input name="name" placeholder="Partner name" required className="min-w-[220px]" />
        <Button type="submit">Generate key</Button>
      </form>
      {state?.key ? (
        <div className="rounded-2xl border border-border bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Copy your API key now</p>
            <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-2 break-all font-mono">{state.key}</p>
        </div>
      ) : null}
      {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </div>
  );
}
