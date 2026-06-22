import { authenticator } from 'otplib';
import { decryptSecret } from './crypto.js';

authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, 'NEXUS', secret);
}

export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = decryptSecret(encryptedSecret);
  const token = String(code ?? '').replace(/\s/g, '');
  return authenticator.verify({ token, secret });
}
