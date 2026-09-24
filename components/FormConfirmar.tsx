'use client';

// Un formulario que, antes de mandar, pregunta con el diálogo de la app.
// La acción viene del servidor. Con `cuando` se pregunta sólo a veces (por
// ejemplo, sólo al mover y no al copiar).

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialogo } from './Dialogo';

export function FormConfirmar({ action, mensaje, titulo, boton, peligro = false, cuando, children, className }: {
  action: (fd: FormData) => void | Promise<void>;
  mensaje: string;
  /** Por defecto «¿Seguro?». */
  titulo?: string;
  /** El texto del botón que confirma; por defecto «Sí, continuar» (o «Sí, eliminar» si es peligro). */
  boton?: string;
  /** Algo que no se deshace: título y botón en rojo. */
  peligro?: boolean;
  /** Si devuelve false, se manda sin preguntar. */
  cuando?: () => boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations('comun');
  const formulario = useRef<HTMLFormElement>(null);
  const confirmado = useRef(false);
  const [abierto, setAbierto] = useState(false);

  const alEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    if (confirmado.current) { confirmado.current = false; return; }
    if (cuando && !cuando()) return;
    e.preventDefault();
    setAbierto(true);
  };
  const aceptar = () => {
    setAbierto(false);
    confirmado.current = true;
    formulario.current?.requestSubmit();
  };

  return (
    <form ref={formulario} action={action} className={className} onSubmit={alEnviar}>
      {children}
      <Dialogo abierto={abierto} onCerrar={() => setAbierto(false)} titulo={titulo ?? t('seguro')} peligro={peligro}
        acciones={<button type="button" onClick={aceptar} className={peligro ? 'boton-peligro' : 'boton'}>{boton ?? (peligro ? t('siEliminar') : t('siContinuar'))}</button>}>
        {mensaje}
      </Dialogo>
    </form>
  );
}
