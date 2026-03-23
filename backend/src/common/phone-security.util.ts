import { createHmac } from 'crypto';

export function normalizePhone(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const onlyDigits = value.replace(/\D/g, '');
  return onlyDigits.length > 0 ? onlyDigits : null;
}

export function hashPhone(normalizedPhone: string): string {
  const secret =
    process.env.PHONE_HASH_SECRET || process.env.JWT_SECRET || 'inbody-phone-hash-fallback-secret';
  return createHmac('sha256', secret).update(normalizedPhone).digest('hex');
}

export function maskPhone(normalizedPhone: string): string {
  if (normalizedPhone.length <= 4) {
    return normalizedPhone;
  }

  return `${'*'.repeat(normalizedPhone.length - 4)}${normalizedPhone.slice(-4)}`;
}
