// The "I'm exploring" onboarding branch creates an operator with no restaurant
// name, so anywhere the name is shown falls back to the zone they picked —
// "Sep 22 - Sep 28 - Midtown - Sports Bar" instead of a blank gap.
export function operatorLabel(
  operator: { restaurantName?: string; zone?: string } | null | undefined,
): string {
  if (!operator) return "";
  return operator.restaurantName?.trim() || operator.zone || "";
}
