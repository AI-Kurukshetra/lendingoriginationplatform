"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-muted">
      <p>Something went wrong.</p>
      <button
        className="rounded-full border border-border px-4 py-2"
        onClick={() => reset()}
      >
        Try again
      </button>
      <pre className="max-w-md whitespace-pre-wrap text-xs text-red-500">{error.message}</pre>
    </div>
  );
}
