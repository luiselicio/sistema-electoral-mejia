import { createHmac } from "crypto";

/**
 * Dominio de identificación/participación (CONFIDENCIAL O SEUDONIMIZADO)
 * - Valida formato local de cédula ecuatoriana (10 dígitos + dígito verificador).
 * - Genera un derivado protegido para control de duplicados.
 * - NUNCA debe almacenarse la cédula en texto plano junto a respuestas.
 * - La validación local NO acredita nacionalidad, identidad ni habilitación electoral.
 */

export function normalizeCedula(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidEcuadorianCedula(input: string): boolean {
  const cedula = normalizeCedula(input);
  if (!/^\d{10}$/.test(cedula)) return false;

  const province = parseInt(cedula.slice(0, 2), 10);
  if (province < 1 || (province > 24 && province !== 30)) return false;

  const third = parseInt(cedula[2], 10);
  if (third > 5) return false; // personas naturales / base común

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const sum = coefficients.reduce((acc, coef, idx) => {
    let product = coef * parseInt(cedula[idx], 10);
    if (product >= 10) product -= 9;
    return acc + product;
  }, 0);

  const mod = sum % 10;
  const checkDigit = mod === 0 ? 0 : 10 - mod;
  return checkDigit === parseInt(cedula[9], 10);
}

export function deriveProtectedIdentity(cedula: string): string {
  const normalized = normalizeCedula(cedula);
  const secret = process.env.PARTICIPATION_HASH_SECRET;
  const salt = process.env.PARTICIPATION_HASH_SALT ?? "";

  if (!secret) {
    throw new Error(
      "PARTICIPATION_HASH_SECRET no está configurado. No se puede derivar la identidad protegida.",
    );
  }

  // Derivado criptográfico unidireccional para uso en servidor (control de duplicados).
  return createHmac("sha256", secret).update(`${salt}:${normalized}`).digest("hex");
}

export const LOCAL_VALIDATION_NOTICE =
  "La validación de cédula es local (formato y dígito verificador) y no acredita nacionalidad, identidad ni habilitación electoral.";