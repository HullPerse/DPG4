export type DiceRow = "dealer" | "player";

/** Tracks one row's 3 dice; ignores stale throwKey and the other row. */
export class DiceRollCoordinator {
  private row: DiceRow | null = null;
  private expectedKey = -1;
  private settled = new Set<number>();
  private resolve: (() => void) | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  waitFor(row: DiceRow, throwKey: number): Promise<void> {
    this.cancel();
    return new Promise((resolve) => {
      this.row = row;
      this.expectedKey = throwKey;
      this.settled.clear();
      this.resolve = resolve;
      this.timeout = setTimeout(() => {
        if (this.resolve) {
          this.resolve();
          this.cleanup();
        }
      }, 12000);
    });
  }

  notify(row: DiceRow, index: number, throwKey: number) {
    if (
      this.resolve == null ||
      this.row !== row ||
      this.expectedKey !== throwKey
    ) {
      return;
    }
    this.settled.add(index);
    if (this.settled.size >= 3) {
      const done = this.resolve;
      this.cleanup();
      done();
    }
  }

  cancel() {
    this.cleanup();
  }

  private cleanup() {
    this.row = null;
    this.expectedKey = -1;
    this.settled.clear();
    this.resolve = null;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }
}
