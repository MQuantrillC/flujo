'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Aparece } from './Animado';

/**
 * El campo de etiquetas de la ficha: texto libre separado por comas y, al
 * entrar o al escribir, la lista de etiquetas que ya usa el equipo, como en
 * la línea rápida. Flechas para moverse, Enter o Tab para elegir, Esc cierra.
 */
export function CampoEtiquetas({ name, inicial, existentes, placeholder }: {
  name: string; inicial: string[]; existentes: string[]; placeholder?: string;
}) {
  const t = useTranslations('tarea');
  const [valor, setValor] = useState(inicial.join(', '));
  const [foco, setFoco] = useState(false);
  const [cerrada, setCerrada] = useState(false); // Esc cierra la lista hasta que cambie el texto
  const [indice, setIndice] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  // Lo ya puesto y lo que se está escribiendo ahora: el último trozo, salvo que
  // sea ya una etiqueta entera (entonces cuenta como puesta y se sugieren las demás).
  const limpiar = (s: string) => s.trim().replace(/^#/, '').toLowerCase();
  const partes = valor.split(',').map(limpiar);
  const ultima = partes[partes.length - 1];
  const escribiendo = existentes.includes(ultima) ? '' : ultima;
  const puestas = (escribiendo ? partes.slice(0, -1) : partes).filter(Boolean);
  const sugerencias = existentes.filter((e) => !puestas.includes(e) && e.includes(escribiendo)).slice(0, 8);
  const abierta = foco && !cerrada && sugerencias.length > 0;
  const elegida = Math.min(indice, sugerencias.length - 1);

  const elegir = (e: string) => {
    const nuevo = [...puestas, e].join(', ') + ', ';
    setValor(nuevo);
    setIndice(0);
    requestAnimationFrame(() => { campo.current?.focus(); campo.current?.setSelectionRange(nuevo.length, nuevo.length); });
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierta) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setIndice((elegida + 1) % sugerencias.length); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setIndice((elegida - 1 + sugerencias.length) % sugerencias.length); }
    else if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); elegir(sugerencias[elegida]); }
    else if (ev.key === 'Escape') { ev.preventDefault(); setCerrada(true); }
  };

  return (
    <div className="relative">
      <input
        ref={campo}
        name={name}
        value={valor}
        onChange={(e) => { setValor(e.target.value); setCerrada(false); setIndice(0); }}
        onFocus={() => { setFoco(true); setCerrada(false); }}
        onBlur={() => setFoco(false)}
        onKeyDown={onKeyDown}
        className="campo"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierta}
        aria-controls="sugerencias-etiquetas"
        aria-autocomplete="list"
      />
      <Aparece visible={abierta} className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <ul role="listbox" id="sugerencias-etiquetas">
          {sugerencias.map((e, i) => (
            <li
              key={e}
              role="option"
              aria-selected={i === elegida}
              onMouseDown={(ev) => { ev.preventDefault(); elegir(e); }}
              onMouseEnter={() => setIndice(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${i === elegida ? 'bg-acento/10 text-acento' : 'text-gray-700'}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-acento/10 text-[11px] font-bold text-acento">#</span>
              <span className="font-medium">#{e}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">{t('etiquetasAtajos')}</p>
      </Aparece>
    </div>
  );
}
