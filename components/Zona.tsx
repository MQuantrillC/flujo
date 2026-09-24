'use client';

// Le dice al servidor la zona horaria del navegador (cookie). Si cambió respecto
// a lo que el servidor usó para pintar esta página, la vuelve a pedir: así las
// fechas («hoy», «mañana», «esta semana») salen con el día de quien mira.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COOKIE_ZONA, zonaDelNavegador } from '@/lib/zona';

const UN_ANIO = 60 * 60 * 24 * 365;

export function Zona({ zonaServidor }: { zonaServidor: string }) {
  const router = useRouter();
  useEffect(() => {
    const zona = zonaDelNavegador();
    if (zona === zonaServidor) return;
    document.cookie = `${COOKIE_ZONA}=${encodeURIComponent(zona)}; path=/; max-age=${UN_ANIO}; samesite=lax`;
    router.refresh();
  }, [zonaServidor, router]);
  return null;
}
