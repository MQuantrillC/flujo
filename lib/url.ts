import { headers } from 'next/headers';
import { esProduccion } from './auth';

/** La dirección pública de la app, para los enlaces de los correos: FLUJO_URL o la de esta petición. */
export async function urlBase(): Promise<string> {
  const fija = process.env.FLUJO_URL?.trim();
  if (fija) return fija.replace(/\/+$/, '');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (esProduccion() && process.env.FLUJO_SIN_HTTPS !== '1' ? 'https' : 'http');
  return `${proto}://${h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3100'}`;
}
