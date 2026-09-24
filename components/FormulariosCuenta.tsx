'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, KeyRound } from 'lucide-react';
import { actualizarPerfilAccion, cambiarContrasenaAccion, type Resultado } from '@/lib/acciones';
import { LARGO_MINIMO } from '@/lib/contrasenas';
import type { Usuario } from '@/lib/modelo';
import { SelectorFecha } from './SelectorFecha';

type Estado = Resultado & { en?: number };
const INICIAL: Estado = { ok: true };

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-gray-700">{etiqueta} {ayuda && <span className="font-normal text-gray-400">{ayuda}</span>}</span>
      {children}
    </label>
  );
}

/** Nombre, apellido y cumpleaños. El correo no se cambia: es la llave con la que te invitan. */
export function FormularioPerfil({ usuario }: { usuario: Usuario }) {
  const t = useTranslations('cuenta');
  const [estado, enviar, pendiente] = useActionState<Estado, FormData>(async (_p, fd) => ({ ...(await actualizarPerfilAccion(_p, fd)), en: Date.now() }), INICIAL);
  const [datos, setDatos] = useState({ nombre: usuario.nombrePila, apellido: usuario.apellido });
  const campo = (k: keyof typeof datos) => ({ name: k, value: datos[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos((d) => ({ ...d, [k]: e.target.value })) });
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta={t('nombre')}><input {...campo('nombre')} required autoComplete="given-name" className="campo" /></Campo>
        <Campo etiqueta={t('apellido')}><input {...campo('apellido')} autoComplete="family-name" className="campo" /></Campo>
      </div>
      <Campo etiqueta={t('correo')} ayuda={t('correoFijo')}><input value={usuario.email} readOnly className="campo bg-gray-50 text-gray-500" /></Campo>
      <Campo etiqueta={t('cumpleanos')}><SelectorFecha name="cumpleanos" valor={usuario.cumpleanos} modo="nacimiento" placeholder={t('elegirFecha')} /></Campo>
      <div className="flex items-center gap-3">
        <button className="boton" disabled={pendiente}><Check size={14} /> {t('guardar')}</button>
        {estado.en && estado.ok && !pendiente && <span key={estado.en} className="desvanecer text-sm text-emerald-700">{t('guardado')}</span>}
        {!estado.ok && estado.error && <span className="text-sm text-red-600">{t(`errores.${estado.error}`)}</span>}
      </div>
    </form>
  );
}

export function FormularioContrasena() {
  const t = useTranslations('cuenta');
  const [estado, enviar, pendiente] = useActionState<Estado, FormData>(async (_p, fd) => ({ ...(await cambiarContrasenaAccion(_p, fd)), en: Date.now() }), INICIAL);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Campo etiqueta={t('actual')}><input name="actual" type="password" required autoComplete="current-password" className="campo" /></Campo>
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={t('nueva')}><input name="nueva" type="password" required minLength={LARGO_MINIMO} autoComplete="new-password" className="campo" /></Campo>
          <Campo etiqueta={t('repetir')}><input name="repetir" type="password" required minLength={LARGO_MINIMO} autoComplete="new-password" className="campo" /></Campo>
        </div>
        <p className="mt-1 text-xs text-gray-400">{t('contrasenaAyuda', { n: LARGO_MINIMO })}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="boton-suave" disabled={pendiente}><KeyRound size={14} /> {t('cambiar')}</button>
        {estado.en && estado.ok && !pendiente && <span key={estado.en} className="desvanecer text-sm text-emerald-700">{t('cambiada')}</span>}
        {!estado.ok && estado.error && <span className="text-sm text-red-600">{t(`errores.${estado.error}`)}</span>}
      </div>
    </form>
  );
}
