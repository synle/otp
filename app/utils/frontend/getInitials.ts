/**
 * Build avatar initials from a user's display name.
 *
 *   "Sy Le"            -> "SL"
 *   "Ada B Lovelace"   -> "ABL"
 *   "  spaced  out  "  -> "SO"  (extra whitespace tokens are ignored)
 *   ""                 -> ""
 *
 * @param fullName - Whitespace-separated display name.
 * @returns Uppercased initials, or `""` when `fullName` is empty/whitespace.
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase();
}
