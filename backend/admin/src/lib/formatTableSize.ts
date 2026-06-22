/** Format stored bytes for dashboard cards (KB, or MB if >= 1 MiB). */
export function formatTableSize(bytes: number): string {
  if (bytes < 0) return "err";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)}MB`;
  const kb = bytes / 1024;
  if (kb < 0.1) return "<0.1KB";
  return `${kb.toFixed(1)}KB`;
}
