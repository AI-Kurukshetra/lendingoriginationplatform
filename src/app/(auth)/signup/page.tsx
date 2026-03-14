"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: "" };

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Launch your tenant</h1>
        <p className="text-sm text-muted">
          Create a workspace to start originating loans.
        </p>
      </div>

      <form className="space-y-4" action={formAction}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Full name</label>
          <Input name="fullName" required placeholder="Avery Morgan" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Work email</label>
          <Input type="email" name="email" required placeholder="you@lender.com" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Password</label>
          <Input type="password" name="password" required placeholder="Create a password" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Tenant name</label>
          <Input name="tenantName" required placeholder="Northwind Credit Union" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Tenant slug</label>
          <Input name="tenantSlug" required placeholder="northwind" />
        </div>
        {state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <Button type="submit" className="w-full">
          Create workspace
        </Button>
      </form>

      <p className="text-sm text-muted">
        Already have a workspace? <Link className="text-accent" href="/login">Sign in</Link>
      </p>
    </div>
  );
}
