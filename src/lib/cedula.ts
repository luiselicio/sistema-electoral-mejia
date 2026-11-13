// Utilidades cliente/compartidas para validación local de cédula (sin acreditar identidad oficial)
export function normalizeCedula(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidEcuadorianCedula(input: string): boolean {
  const cedula = normalizeCedula(input);
  if (!/^\d{10}$/.test(cedula)) return false;
  const province = parseInt(cedula.slice(0, 2), 10);
  if (province < 1 || (province > 24 && province !== 30)) return false;
  const third = parseInt(cedula[2], 10);
  if (third > 5) return false;
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

export const LOCAL_VALIDATION_NOTICE =
  "La validación de cédula es local (formato y dígito verificador) y no acredita nacionalidad, identidad ni habilitación electoral.";