import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold">Blend Originations</div>
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 fade-in">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              AI-Powered Lending Origination
            </p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
              Close loans faster with an intelligent, compliance-ready
              origination stack.
            </h1>
            <p className="text-muted">
              Blend Originations unifies borrower intake, underwriting workflows,
              and compliance automation across web, mobile, and partner channels.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-accent px-5 py-2.5 text-base font-medium text-white"
              >
                Launch a tenant workspace
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2.5 text-base font-medium text-foreground"
              >
                Access dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-[32px] border border-border bg-[var(--surface)]/80 p-8 shadow-sm">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs text-muted">Live Pipeline</p>
                <p className="text-2xl font-semibold">126 in review</p>
                <p className="text-xs text-muted">+14% week over week</p>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs text-muted">Decision Engine</p>
                <p className="text-2xl font-semibold">92% auto-approve</p>
                <p className="text-xs text-muted">Average decision in 38s</p>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs text-muted">Compliance</p>
                <p className="text-2xl font-semibold">0 exceptions</p>
                <p className="text-xs text-muted">TILA, RESPA, HMDA checks</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Unified borrower portal",
              text: "Progressive applications, document upload, and real-time status in one branded experience.",
            },
            {
              title: "Automated underwriting",
              text: "Rules-driven workflow routing with manual review checkpoints and audit trails.",
            },
            {
              title: "Partner-ready APIs",
              text: "Secure API keys, rate-limited endpoints, and webhooks for third-party integrations.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-border bg-[var(--surface)]/80 p-6">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
