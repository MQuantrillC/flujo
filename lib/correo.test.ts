import { describe, expect, it } from 'vitest';
import { proveedor, remitente } from './correo';

describe('por dónde sale el correo', () => {
  it('Gmail (SMTP) gana si está completo', () => {
    expect(proveedor({ SMTP_USUARIO: 'flujo@gmail.com', SMTP_CLAVE: 'abcd efgh ijkl mnop', RESEND_API_KEY: 're_x' })).toBe('smtp');
  });
  it('sin la clave de SMTP, Resend; sin nada, ninguno', () => {
    expect(proveedor({ SMTP_USUARIO: 'flujo@gmail.com', RESEND_API_KEY: 're_x' })).toBe('resend');
    expect(proveedor({ SMTP_USUARIO: ' ', SMTP_CLAVE: ' ' })).toBeNull();
    expect(proveedor({})).toBeNull();
  });
  it('el remitente: el fijado, o la cuenta de Gmail, o el de prueba de Resend', () => {
    expect(remitente({ FLUJO_REMITENTE: 'Flujo <hola@x.com>', SMTP_USUARIO: 'a@gmail.com', SMTP_CLAVE: 'k' })).toBe('Flujo <hola@x.com>');
    expect(remitente({ SMTP_USUARIO: ' flujo.io.app@gmail.com ', SMTP_CLAVE: 'k' })).toBe('Flujo <flujo.io.app@gmail.com>');
    expect(remitente({ RESEND_API_KEY: 're_x' })).toBe('Flujo <onboarding@resend.dev>');
  });
});
