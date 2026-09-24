'use client';

// Entrar y crear cuenta. Los campos son controlados para que, si algo falla,
// lo escrito no se pierda (React vacía los formularios al terminar una acción).

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LogIn, UserPlus } from 'lucide-react';
import { entrar, registrar, type Resultado } from '@/lib/acciones';
import { LARGO_MINIMO } from '@/lib/contrasenas';
import { SelectorFecha } from './SelectorFecha';

const INICIAL: Resultado = { ok: true };

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-gray-700">{etiqueta} {ayuda && <span className="font-normal text-gray-400">{ayuda}</span>}</span>
      {children}
    </label>
  );
}

export function FormularioEntrar() {
  const t = useTranslations('entrar');
  const [estado, enviar, pendiente] = useActionState(entrar, INICIAL);
  const [email, setEmail] = useState('');
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Campo etiqueta={t('correo')}>
        <input name="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" placeholder="nombre.apellido@xertica.com" />
      </Campo>
      <Campo etiqueta={t('contrasena')}>
        <input name="contrasena" type="password" required autoComplete="current-password" className="campo" />
      </Campo>
      {!estado.ok && estado.error && <p className="text-xs text-red-600">{t(`errores.${estado.error}`)}</p>}
      <button className="boton justify-center" disabled={pendiente}><LogIn size={14} /> {pendiente ? t('entrando') : t('entrar')}</button>
      <p className="text-center text-xs text-gray-500">{t('sinCuenta')} <Link href="/registro" className="font-semibold text-acento hover:underline">{t('registrate')}</Link></p>
    </form>
  );
}

export function FormularioRegistro({ correoInicial = '' }: { correoInicial?: string }) {
  const t = useTranslations('registro');
  const [estado, enviar, pendiente] = useActionState(registrar, INICIAL);
  const [datos, setDatos] = useState({ nombre: '', apellido: '', email: correoInicial });
  const campo = (k: keyof typeof datos) => ({ name: k, value: datos[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos((d) => ({ ...d, [k]: e.target.value })) });
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta={t('nombre')}><input {...campo('nombre')} required autoFocus autoComplete="given-name" className="campo" /></Campo>
        <Campo etiqueta={t('apellido')}><input {...campo('apellido')} required autoComplete="family-name" className="campo" /></Campo>
      </div>
      <Campo etiqueta={t('correo')}><input {...campo('email')} type="email" required autoComplete="email" className="campo" placeholder="nombre.apellido@xertica.com" /></Campo>
      <Campo etiqueta={t('cumpleanos')} ayuda={t('opcional')}><SelectorFecha name="cumpleanos" valor={null} modo="nacimiento" placeholder={t('elegirFecha')} /></Campo>
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={t('contrasena')}><input name="contrasena" type="password" required minLength={LARGO_MINIMO} autoComplete="new-password" className="campo" /></Campo>
          <Campo etiqueta={t('repetir')}><input name="repetir" type="password" required minLength={LARGO_MINIMO} autoComplete="new-password" className="campo" /></Campo>
        </div>
        <p className="mt-1 text-xs text-gray-400">{t('contrasenaAyuda', { n: LARGO_MINIMO })}</p>
      </div>
      {!estado.ok && estado.error && <p className="text-xs text-red-600">{t(`errores.${estado.error}`)}</p>}
      <button className="boton justify-center" disabled={pendiente}><UserPlus size={14} /> {pendiente ? t('creando') : t('crear')}</button>
      <p className="text-xs text-gray-400">{t('nota')}</p>
      <p className="text-center text-xs text-gray-500">{t('yaTienes')} <Link href="/entrar" className="font-semibold text-acento hover:underline">{t('entra')}</Link></p>
    </form>
  );
}
