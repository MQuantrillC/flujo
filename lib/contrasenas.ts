// Contraseñas: se guarda un hash scrypt con sal propia, nunca la contraseña.

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const LARGO_MINIMO = 8;

export function cifrar(contrasena: string): string {
  const sal = randomBytes(16).toString('hex');
  return `scrypt$${sal}$${scryptSync(contrasena, sal, 64).toString('hex')}`;
}

export function coincide(contrasena: string, guardado: string | null | undefined): boolean {
  if (!guardado) return false;
  const [, sal, hash] = guardado.split('$');
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(contrasena, sal, esperado.length);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}
