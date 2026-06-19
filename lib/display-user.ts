/** Display label for Better Auth user (username plugin). */
export function displayUsername(user: {
  name?: string | null
  username?: string | null
  displayUsername?: string | null
  email?: string | null
}): string {
  const u =
    user.displayUsername ??
    user.username ??
    user.name ??
    user.email?.replace(/@signalai\.local$/i, "")
  return u?.trim() || "Vartotojas"
}
