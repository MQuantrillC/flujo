'use client';

import { useState } from 'react';
import { Flotante, medir, type Ancla } from './Flotante';

/**
 * Un rótulo al pasar el ratón (o al enfocar con el teclado), con el estilo de la
 * app en vez del recuadro negro del navegador. En pantallas táctiles no aparece,
 * así que nunca hay que poner ahí algo imprescindible.
 */
export function Tooltip({ texto, children, lado = 'arriba', className = '' }: { texto: React.ReactNode; children: React.ReactNode; lado?: 'arriba' | 'abajo'; className?: string }) {
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const abrir = (e: React.SyntheticEvent<HTMLElement>) => setAncla(medir(e.currentTarget));
  const cerrar = () => setAncla(null);
  return (
    <span className={`inline-flex ${className}`} onMouseEnter={abrir} onMouseLeave={cerrar} onFocus={abrir} onBlur={cerrar} onMouseDown={cerrar}>
      {children}
      <Flotante abierto={!!ancla} ancla={ancla} lado={lado} alto={40} rol="tooltip" className="pointer-events-none">
        <span className="block max-w-xs rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-lg">{texto}</span>
      </Flotante>
    </span>
  );
}
