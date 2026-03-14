"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col gap-3 text-sm text-muted">
      <p>Auth error.</p>
      <button
        className="rounded-full border border-border px-4 py-2"
        onClick={() => reset()}
      >
        Retry
      </button>
      <pre className="whitespace-pre-wrap text-xs text-red-500">{error.message}</pre>
    </div>
  );
}
