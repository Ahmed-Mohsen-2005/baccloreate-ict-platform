/** For showing a code to a human: "ABC 234". Safe to import in client components (no Node APIs). */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
