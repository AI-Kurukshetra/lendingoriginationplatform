import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-border bg-[var(--surface)] px-4 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
