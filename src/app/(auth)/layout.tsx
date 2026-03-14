export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)]/70">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-[var(--surface)] p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
