'use client';

// El botón que copia el enlace de invitación de un miembro, listo para pegar en
// WhatsApp o en un correo. El enlace se arma con la dirección desde la que se
// está usando la app, así funciona igual en local y en producción.

import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { enlaceInvitacion, type Invitado } from '@/lib/invitaciones';
import { Dialogo } from './Dialogo';
import { Tooltip } from './Tooltip';

export function CopiarInvitacion({ invitado }: { invitado: Invitado }) {
  const t = useTranslations('miembros');
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(id);
  }, [copiado]);

  const copiar = async () => {
    const enlace = enlaceInvitacion(window.location.origin, invitado);
    const texto = t('invitacionTexto', { equipo: invitado.equipoNombre, enlace });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      // Sin portapapeles (http por IP, por ejemplo): que al menos lo pueda copiar a mano.
      setManual(texto);
    }
  };

  return (
    <>
    <Dialogo abierto={manual !== null} onCerrar={() => setManual(null)} titulo={t('copiarInvitacion')}>
      <p className="mb-2">{t('copiarManual')}</p>
      <textarea readOnly value={manual ?? ''} rows={4} className="campo text-xs" onFocus={(e) => e.currentTarget.select()} autoFocus />
    </Dialogo>
    <Tooltip texto={copiado ? t('copiado') : t('copiarInvitacion')}>
      <button type="button" onClick={copiar} aria-label={t('copiarInvitacion')} className={`rounded-md p-1.5 transition-colors ${copiado ? 'text-emerald-600' : 'text-gray-400 hover:bg-acento/10 hover:text-acento'}`}>
        {copiado ? <Check size={15} /> : <Link2 size={15} />}
      </button>
    </Tooltip>
    </>
  );
}
