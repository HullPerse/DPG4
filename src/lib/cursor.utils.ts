const CURSOR_MAP: Array<{ file: string; keyword: string }> = [
  { file: 'default', keyword: 'default' },
  { file: 'point', keyword: 'pointer' },
  { file: 'select', keyword: 'text' },
  { file: 'grab-open', keyword: 'grab' },
  { file: 'grab-close', keyword: 'grabbing' },
];

interface CursorDef {
  keyword: string;
  url: string;
}

function getCursorDefs(): CursorDef[] {
  return CURSOR_MAP.map(({ file, keyword }) => ({
    keyword,
    url: `/cursors/${file}.png`,
  }));
}

function generateCSS(defs: CursorDef[]): string {
  if (!defs.length) return '';

  const vars = defs
    .map((d) => `--cursor-${d.keyword}: url(${JSON.stringify(d.url)}),${d.keyword}`)
    .join(';');

  const rules: string[] = [];

  rules.push('html{cursor:var(--cursor-default)!important}');

  const hasText = defs.some((d) => d.keyword === 'text');
  const hasPointer = defs.some((d) => d.keyword === 'pointer');

  if (hasText) {
    rules.push(
      'input:not([type="button"]):not([type="checkbox"]):not([type="color"])' +
        ':not([type="file"]):not([type="image"]):not([type="radio"])' +
        ':not([type="range"]):not([type="reset"]):not([type="submit"])' +
        ',textarea,select,[contenteditable]' +
        '{cursor:var(--cursor-text)!important}',
    );
  }

  if (hasPointer) {
    rules.push(
      'a,[role="button"]{cursor:var(--cursor-pointer)!important}',
    );
  }

  for (const d of defs) {
    const sel = [
      `[style*="cursor:${d.keyword}" i]`,
      `[style*="cursor: ${d.keyword}" i]`,
      `[class*="cursor-${d.keyword}"]`,
    ].join(',');
    rules.push(`${sel}{cursor:var(--cursor-${d.keyword})!important}`);
  }

  return `:root{${vars}}${rules.join('')}`;
}

function generateLockCSS(): string {
  return 'html.__cursor-locked{cursor:var(--cursor-lock)!important}html.__cursor-locked *{cursor:var(--cursor-lock)!important}';
}

export function lockCursor(cursorValue: string | null): void {
  const root = document.documentElement;
  if (cursorValue) {
    root.style.setProperty('--cursor-lock', cursorValue);
    root.classList.add('__cursor-locked');
  } else {
    root.classList.remove('__cursor-locked');
    root.style.removeProperty('--cursor-lock');
  }
}

export function initCursors(): void {
  const defs = getCursorDefs();
  if (!defs.length) return;

  const style = document.createElement('style');
  style.id = '__cursors__';
  style.textContent = generateCSS(defs) + generateLockCSS();
  document.head.appendChild(style);
}
