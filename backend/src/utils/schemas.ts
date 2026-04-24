import { z } from "zod";

/**
 * Strong password policy: at least 8 chars, one lowercase, one uppercase, one digit.
 */
export const strongPassword = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(200)
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

/**
 * Helper for PATCH payloads: distinguishes `undefined` (skip) from `null` (clear to NULL).
 * Use it like: `nullable(z.string().max(500))`.
 */
export function nullable<T extends z.ZodTypeAny>(inner: T) {
  return inner.nullable().optional();
}

/**
 * `true` when the key is present in the body — regardless of whether the value is null.
 * Use in UPDATE handlers to build dynamic SET clauses that distinguish
 * "don't touch" vs "clear to NULL".
 */
export function hasKey<T extends object, K extends keyof T>(body: T, key: K): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}
