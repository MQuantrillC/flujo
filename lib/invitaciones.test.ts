import { describe, it, expect } from 'vitest';
import { correoInvitacion, enlaceInvitacion, type RotulosInvitacion } from './invitaciones';

const R: RotulosInvitacion = {
  asunto: 'Marco te invitó a Ventas & Co en Flujo', titulo: 'Te invitaron a Ventas & Co', cuerpo: 'Marco te agregó al equipo Ventas & Co.',
  crearCuenta: 'Crea tu cuenta con este correo:', entrar: 'Entra para verlo:', boton: 'Abrir Flujo', oEnlace: 'O copia este enlace:', pie: 'Si no lo esperabas, ignóralo.', firma: 'Flujo',
};
const ICONO = 'https://f/apple-icon.png';

describe('invitaciones', () => {
  it('sin cuenta, el enlace va al registro con el correo y el equipo puestos', () => {
    const e = enlaceInvitacion('https://flujo.xertica.com/', { email: 'ana@x.com', equipoId: 'e1', equipoNombre: 'Ventas & Co', tieneCuenta: false });
    expect(e).toBe('https://flujo.xertica.com/registro?correo=ana%40x.com&equipo=Ventas+%26+Co');
    const u = new URL(e);
    expect(u.searchParams.get('correo')).toBe('ana@x.com');
    expect(u.searchParams.get('equipo')).toBe('Ventas & Co');
  });

  it('con cuenta, el enlace va directo al equipo', () => {
    expect(enlaceInvitacion('http://localhost:3100', { email: 'ana@x.com', equipoId: 'e1', equipoNombre: 'X', tieneCuenta: true })).toBe('http://localhost:3100/e/e1');
  });

  it('el correo escapa el HTML y elige el paso según tenga cuenta o no', () => {
    const sin = correoInvitacion(R, { email: 'ana@x.com', equipoId: 'e1', equipoNombre: 'Ventas & Co', tieneCuenta: false }, 'https://f/registro?correo=ana%40x.com&equipo=Ventas+%26+Co', ICONO);
    expect(sin.asunto).toBe(R.asunto);
    expect(sin.html).toContain('<img src="https://f/apple-icon.png"');
    expect(sin.texto).toContain('Crea tu cuenta con este correo:\nhttps://f/registro?correo=ana%40x.com&equipo=Ventas+%26+Co');
    expect(sin.html).toContain('Marco te agregó al equipo <strong style="color:#132229">Ventas &amp; Co</strong>.');
    expect(sin.html).not.toContain('«');
    expect(sin.html).toContain('href="https://f/registro?correo=ana%40x.com&amp;equipo=Ventas+%26+Co"');
    expect(sin.html).not.toContain('Entra para verlo');
    const con = correoInvitacion(R, { email: 'ana@x.com', equipoId: 'e1', equipoNombre: 'X', tieneCuenta: true }, 'https://f/e/e1', ICONO);
    expect(con.texto).toContain('Entra para verlo:\nhttps://f/e/e1');
    expect(con.html).not.toContain('Crea tu cuenta');
  });
});
