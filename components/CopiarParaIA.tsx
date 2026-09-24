'use client';

// «Copiar para la IA»: trae el Markdown del equipo (con las instrucciones para
// la IA arriba) y lo deja en el portapapeles, listo para pegar en el chat.
// Pegado como texto, la IA lee las instrucciones; adjuntado como archivo, lo
// trata como datos y sólo lo reformatea.

import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Estado = 'quieto' | 'trayendo' | 'copiado' | 'error';

export function CopiarParaIA({ equipoId }: { equipoId: string }) {
  const t = useTranslations('exportar');
  const [estado, setEstado] = useState<Estado>('quieto');
  useEffect(() => {
    if (estado !== 'copiado' && estado !== 'error') return;
    const id = setTimeout(() => setEstado('quieto'), 2500);
    return () => clearTimeout(id);
  }, [estado]);

  const copiar = async () => {
    setEstado('trayendo');
    try {
      const r = await fetch(`/api/equipos/${equipoId}/exportar?formato=md`, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      await navigator.clipboard.writeText(await r.text());
      setEstado('copiado');
    } catch {
      setEstado('error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-acento/30 bg-acento/5 px-3 py-2.5">
      <button type="button" onClick={copiar} disabled={estado === 'trayendo'} className="boton shrink-0">
        {estado === 'copiado' ? <Check size={14} /> : <Sparkles size={14} />}
        {estado === 'copiado' ? t('copiadoIA') : estado === 'trayendo' ? t('copiandoIA') : t('copiarIA')}
      </button>
      <p className="min-w-0 flex-1 text-xs leading-snug text-gray-600">{estado === 'error' ? <span className="text-red-600">{t('errorIA')}</span> : t('copiarIAAyuda')}</p>
    </div>
  );
}
