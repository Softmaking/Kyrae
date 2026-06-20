const RUT_BODY_REGEX = /^(\d{1,2}(\.?\d{3}){2})-?([\dkK])$/;

export function normalizeRut(input: string): string {
  const cleaned = input.replace(/\./g, '').replace(/\s/g, '');
  const match = cleaned.match(RUT_BODY_REGEX);
  if (!match) {
    throw new Error('Invalid RUT format');
  }
  const body = match[1].replace('-', '');
  const dv = match[3].toUpperCase();
  return `${body}-${dv}`;
}

export function validateRut(rut: string): boolean {
  const normalized = normalizeRut(rut);
  const [bodyStr, dv] = normalized.split('-');
  const body = parseInt(bodyStr, 10);
  return computeCheckDigit(body) === dv;
}

export function computeCheckDigit(body: number): string {
  let sum = 0;
  let multiplier = 2;
  let n = body;
  while (n > 0) {
    sum += (n % 10) * multiplier;
    n = Math.floor(n / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const check = 11 - remainder;
  if (check === 11) return '0';
  if (check === 10) return 'K';
  return check.toString();
}
