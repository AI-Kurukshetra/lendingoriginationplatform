"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted">
          Sign in to manage loan applications and workflows.
        </p>
      </div>

      <form className="space-y-4" action={formAction}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Email</label>
          <Input type="email" name="email" required placeholder="you@lender.com" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">Password</label>
          <Input type="password" name="password" required placeholder="password" />
        </div>
        {state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-sm text-muted">
        New here? <Link className="text-accent" href="/signup">Create a tenant</Link>
      </p>
    </div>
  );
}
