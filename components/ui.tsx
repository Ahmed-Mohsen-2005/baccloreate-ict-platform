import type { ComponentProps, ReactNode } from "react";

/** Shared controls. Styling only: behaviour comes from native elements (forms work without JS). */

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-base font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:opacity-90",
  secondary: "border border-ink bg-surface text-ink hover:bg-paper",
  quiet: "text-ink underline underline-offset-4 decoration-ruling hover:decoration-ink px-2",
  danger: "border border-margin text-margin bg-surface hover:bg-paper",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = ""): string {
  return `${buttonBase} ${buttonVariants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const inputClass =
  "block w-full min-h-12 rounded-[var(--radius-control)] border border-ruling bg-surface px-3 text-base text-ink " +
  "placeholder:text-pencil aria-[invalid=true]:border-margin";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} min-h-28 py-2 ${className}`} {...props} />;
}

/** Label + control + hint + error, wired with ids for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-pencil">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-margin">
          {error}
        </p>
      )}
    </div>
  );
}

/** A ruled sheet: the one surface container. Depth comes from the paper/surface step, not shadows. */
export function Sheet({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4 sm:p-6 ${className}`} {...props} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const toneClass = tone === "error" ? "border-margin text-margin" : tone === "success" ? "border-ink" : "border-ruling";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[var(--radius-control)] border border-s-4 bg-surface p-3 ${toneClass}`}>
      {children}
    </div>
  );
}

export function PageTitle({ children, intro }: { children: ReactNode; intro?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      <h1 className="text-2xl font-extrabold">{children}</h1>
      {intro && <p className="max-w-prose text-pencil">{intro}</p>}
    </header>
  );
}
