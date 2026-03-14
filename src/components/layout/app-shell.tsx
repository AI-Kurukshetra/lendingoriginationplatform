import Link from "next/link";
import { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/applications", label: "Applications" },
  { href: "/products", label: "Loan Products" },
  { href: "/compare", label: "Loan Comparison" },
  { href: "/workflows", label: "Workflows" },
  { href: "/integrations", label: "Integrations" },
  { href: "/compliance", label: "Compliance" },
  { href: "/risk", label: "Risk Matrix" },
  { href: "/notifications", label: "Communications" },
  { href: "/analytics", label: "Analytics" },
  { href: "/jobs", label: "Batch Jobs" },
  { href: "/settings/tenant", label: "Tenant Settings" },
  { href: "/settings/api-keys", label: "API Keys" },
];

export function AppShell({
  children,
  userName,
  tenantName,
}: {
  children: ReactNode;
  userName?: string | null;
  tenantName?: string | null;
}) {
  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="hidden h-full border-r border-border bg-[var(--surface)]/70 px-6 py-8 lg:block">
          <div className="mb-8">
            <h1 className="text-xl font-semibold">Blend Originations</h1>
            <p className="text-xs text-muted">{tenantName ?? "Tenant Workspace"}</p>
          </div>
          <nav className="space-y-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-muted hover:bg-[var(--surface)]/60 hover:text-foreground dark:hover:bg-[var(--surface)]/60 dark:hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="space-y-3 border-b border-border bg-[var(--surface)]/70 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{tenantName ?? "Dashboard"}</h2>
                <p className="text-xs text-muted">Welcome back {userName ?? "team"}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full border border-border px-3 py-1">Secure by Supabase</span>
                <Link className="text-accent" href="/portal">
                  Borrower Portal
                </Link>
                <ThemeToggle />
                <form action={signOut}>
                  <button className="rounded-full border border-border px-3 py-1 text-xs hover:bg-[var(--surface)]">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 text-xs lg:hidden">
              {navItems.slice(0, 8).map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-border px-3 py-1">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
