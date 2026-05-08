export function canManageMealRatings(role?: string | null) {
  return role === "admin" || role === "manu";
}
