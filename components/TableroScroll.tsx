'use client';

// El contenedor del tablero. En pantallas grandes es él quien se desplaza hacia
// abajo (no la página), con la altura justa hasta el borde inferior de la
// ventana: así las cabeceras de las columnas se quedan fijas arriba mientras
// las tarjetas pasan por debajo. En el móvil no: ahí la página se desplaza y
// el tablero se pasa columna a columna hacia los lados.

import { useEffect, useRef } from 'react';

const MARGEN_INFERIOR = 16;

export function TableroScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      if (!window.matchMedia('(min-width: 640px)').matches) { el.style.maxHeight = ''; return; }
      // Dónde empieza el tablero con la página arriba del todo: lo que hay encima (cabecera, línea rápida, etiquetas).
      const tope = el.getBoundingClientRect().top + window.scrollY;
      el.style.maxHeight = `calc(100dvh - ${Math.round(tope)}px - ${MARGEN_INFERIOR}px)`;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(document.body);
    window.addEventListener('resize', medir);
    return () => { ro.disconnect(); window.removeEventListener('resize', medir); };
  }, []);

  return (
    <div ref={ref} className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:snap-none sm:overflow-y-auto sm:px-0">
      {children}
    </div>
  );
}
