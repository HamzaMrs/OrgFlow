/**
 * Mirror of the backend's `strongPassword` zod schema. Returns null when valid,
 * otherwise a French error message ready to surface in a form. We validate on
 * the client too so users get instant feedback before the request lands.
 */
export function validatePassword(value: string): string | null {
  if (value.length < 8) return "Au moins 8 caractères";
  if (!/[a-z]/.test(value)) return "Au moins une minuscule";
  if (!/[A-Z]/.test(value)) return "Au moins une majuscule";
  if (!/[0-9]/.test(value)) return "Au moins un chiffre";
  return null;
}
