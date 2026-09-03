/**
 * Shared UX rule for scoped dashboards: the synthetic "Todos" option never
 * makes a filter useful. A selector is rendered only when the actor can make
 * a real choice between at least two distinct values.
 */
export function uniqueSelectableValues<T>(
  items: readonly T[],
  select: (item: T) => string | null | undefined,
) {
  return Array.from(
    new Set(
      items
        .map(select)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  );
}

export function shouldRenderScopedFilter<T>(
  items: readonly T[],
  select: (item: T) => string | null | undefined,
) {
  return uniqueSelectableValues(items, select).length >= 2;
}
