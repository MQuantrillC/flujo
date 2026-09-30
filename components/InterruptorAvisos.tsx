'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff } from 'lucide-react';
import { avisosAccion } from '@/lib/acciones';

/**
 * Ajustes del equipo: los avisos por correo de quien mira la página, no los de
 * los demás. Cambia al instante; si el servidor falla, vuelve a como estaba.
 */
export function InterruptorAvisos({ equipoId, activos, configurado }: { equipoId: string; activos: boolean; configurado: boolean }) {
  const t = useTranslations('miembros');
  const [valor, setValor] = useState(activos);
  const [pendiente, iniciar] = useTransition();

  const cambiar = () => {
    const nuevo = !valor;
    setValor(nuevo);
    iniciar(async () => { const r = await avisosAccion(equipoId, nuevo); if (!r.ok) setValor(!nuevo); });
  };

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${valor ? 'bg-acento/10 text-acento' : 'bg-gray-100 text-gray-400'}`}>
          {valor ? <Bell size={15} /> : <BellOff size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-800">{t('avisos')}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{t('avisosAyuda')}</p>
          {!configurado && <p className="mt-1 text-xs text-amber-700">{t('avisosSinCorreo')}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={valor}
          aria-label={t('avisos')}
          onClick={cambiar}
          disabled={pendiente}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${valor ? 'bg-acento' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${valor ? 'translate-x-5' : 'translate-x-0.5'}`} />
          <span className="sr-only">{valor ? t('encendidos') : t('apagados')}</span>
        </button>
      </div>
    </div>
  );
}
