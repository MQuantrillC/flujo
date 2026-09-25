'use client';

// El contenedor del tablero. La página es la que se desplaza (un solo scroll);
// lo único que hace este contenedor es medir cuánto ocupa la cabecera fija de
// arriba (marca, nombre del equipo, pestañas) y dejarlo en una variable CSS
// para que las cabeceras de las columnas se peguen justo debajo. En el móvil
// el tablero se pasa columna a columna hacia los lados y ahí nada se pega.

import { useEffect, useRef } from 'react';

export function TableroScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const cabecera = document.querySelector<HTMLElement>('[data-cabecera]');
    if (!el || !cabecera) return;
    const medir = () => el.style.setProperty('--tope-tablero', `${Math.round(cabecera.getBoundingClientRect().height)}px`);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cabecera);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:snap-none sm:overflow-visible sm:px-0">
      {children}
    </div>
  );
}
