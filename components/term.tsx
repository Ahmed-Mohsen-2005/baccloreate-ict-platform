/** An English term or code inside Arabic text. Isolated so bidi never reorders it. */
export function Term({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" lang="en">
      {children}
    </bdi>
  );
}
