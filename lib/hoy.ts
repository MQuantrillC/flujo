// El «hoy» del usuario de esta petición, según la zona horaria que mandó su navegador.

import { cookies } from 'next/headers';
import { COOKIE_ZONA, hoyEn, ZONA_POR_DEFECTO, zonaValida } from './zona';

export async function zonaActual(): Promise<string> {
  const z = (await cookies()).get(COOKIE_ZONA)?.value;
  return zonaValida(z) ? z : ZONA_POR_DEFECTO;
}

export async function hoyActual(): Promise<Date> {
  return hoyEn(await zonaActual());
}
