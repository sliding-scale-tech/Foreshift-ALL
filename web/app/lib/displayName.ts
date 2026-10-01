// The "I'm exploring" onboarding branch creates an operator with no restaurant
// name, so anywhere the name is shown falls back to the zone they picked —
// "Sep 22 - Sep 28 - Midtown - Sports Bar" instead of a blank gap.
export function operatorLabel(
  operator: { restaurantName?: string; zone?: string } | null | undefined,
): string {
  if (!operator) return "";
  return operator.restaurantName?.trim() || operator.zone || "";
}

/** The line under every page title: "Name · Concept · Zone · Date". An
 * explorer's name is their zone, so a repeated part is shown once. */
export function pageSubtitle(
  operator: { restaurantName?: string; zone?: string; conceptType?: string } | null | undefined,
  when: string,
): string {
  const parts = [operatorLabel(operator), operator?.conceptType, operator?.zone, when];
  return [...new Set(parts.filter((p): p is string => Boolean(p)))].join(" · ");
}

/** An operator who set up a restaurant (not the "I'm exploring" branch). */
export function hasRestaurant(operator: { restaurantName?: string } | null | undefined): boolean {
  return Boolean(operator?.restaurantName?.trim());
}
