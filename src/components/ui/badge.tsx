import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tone === "default" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        tone === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
        tone === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
        tone === "danger" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
        className
      )}
      {...props}
    />
  );
}
