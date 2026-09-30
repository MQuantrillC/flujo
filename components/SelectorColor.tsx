'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Palette } from 'lucide-react';
import { colorMiembroAccion } from '@/lib/acciones';
import { COLORES_PERSONA, type ColorPersona } from '@/lib/colores';
import { Flotante, medir, type Ancla } from './Flotante';
import { Tooltip } from './Tooltip';

const NOMBRES = Object.keys(COLORES_PERSONA) as ColorPersona[];

/**
 * En Ajustes, junto a cada miembro: el color de sus pendientes. Un círculo con
 * el color elegido (o una paleta gris si no tiene) que abre la paleta cerrada de
 * lib/colores.ts, más «sin color». Elegir guarda al instante.
 */
export function SelectorColor({ equipoId, email, color }: { equipoId: string; email: string; color: string | null }) {
  const t = useTranslations('miembros');
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [valor, setValor] = useState<string | null>(color);
  // Si cambió por otro camino (otra pestaña), el servidor manda otro: se adopta.
  const [servidor, setServidor] = useState(color);
  if (servidor !== color) { setServidor(color); setValor(color); }
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const hex = valor && valor in COLORES_PERSONA ? COLORES_PERSONA[valor as ColorPersona] : null;

  const elegir = (c: string | null) => {
    setAncla(null);
    if (c === valor) return;
    const antes = valor;
    setValor(c);
    iniciar(async () => {
      const r = await colorMiembroAccion(equipoId, email, c);
      if (!r.ok) setValor(antes);
      router.refresh();
    });
  };

  return (
    <>
      <Tooltip texto={hex ? `${t('color')}: ${t(`colores.${valor}`)}` : t('color')}>
        <button
          type="button"
          onClick={(e) => (ancla ? setAncla(null) : setAncla(medir(e.currentTarget)))}
          // Se cierra al hacer clic fuera: el panel no roba el foco (onMouseDown abajo), así que perderlo es salir.
          onBlur={() => setAncla(null)}
          aria-label={t('color')}
          aria-haspopup="dialog"
          aria-expanded={!!ancla}
          className="grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-gray-100"
        >
          {hex
            ? <span className="h-4 w-4 rounded-full ring-2 ring-white" style={{ background: hex, boxShadow: `0 0 0 1px ${hex}` }} />
            : <Palette size={15} className="text-gray-400" />}
        </button>
      </Tooltip>
      <Flotante abierto={!!ancla} ancla={ancla} alinear="derecha" alto={150} onCerrar={() => setAncla(null)} rol="dialog"
        className="w-60">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
        <p className="text-xs font-semibold text-gray-700">{t('color')}</p>
        <p className="mb-2.5 mt-0.5 text-[11px] leading-snug text-gray-500">{t('colorAyuda')}</p>
        <div className="grid grid-cols-8 gap-1.5">
          {NOMBRES.map((c) => (
            <Tooltip key={c} texto={t(`colores.${c}`)}>
              <button type="button" onClick={() => elegir(c)} aria-label={t(`colores.${c}`)} aria-pressed={valor === c}
                className="grid h-6 w-6 place-items-center rounded-full transition-transform hover:scale-110"
                style={{ background: COLORES_PERSONA[c] }}>
                {valor === c && <Check size={13} strokeWidth={3} className="text-white" />}
              </button>
            </Tooltip>
          ))}
        </div>
        <button type="button" onClick={() => elegir(null)} aria-pressed={valor === null}
          className={`mt-2.5 w-full rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-gray-100 ${valor === null ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
          {valor === null && <Check size={12} className="mr-1 inline" />}{t('sinColor')}
        </button>
        </div>
      </Flotante>
    </>
  );
}
