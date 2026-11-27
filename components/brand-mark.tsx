/** Two linked nodes: the platform's mark. Inherits colour from the text. */
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className={className}>
      <line x1={9} y1={22} x2={23} y2={10} />
      <circle cx={9} cy={22} r={5} className="fill-paper" />
      <circle cx={23} cy={10} r={5} className="fill-current" />
    </svg>
  );
}
