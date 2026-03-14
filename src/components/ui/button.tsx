import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition disabled:opacity-50",
        variant === "primary" &&
          "bg-accent text-white hover:bg-accent/90 shadow-sm",
        variant === "secondary" &&
          "bg-[var(--surface)] text-foreground border border-border hover:bg-[var(--surface)]/90 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)]/80",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-white/60 dark:hover:bg-slate-800",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        className
      )}
      {...props}
    />
  );
}
