export const COLLAPSED_TABLE_ROWS = 5;

/** Keeps compact tables predictable while retaining their existing sort order. */
export function visibleTableRows<T>(rows: T[], expanded: boolean) {
  return expanded ? rows : rows.slice(0, COLLAPSED_TABLE_ROWS);
}
