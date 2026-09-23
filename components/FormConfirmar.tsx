'use client';

/** Un formulario que pide confirmación antes de mandar. La acción viene del servidor. */
export function FormConfirmar({ action, mensaje, children, className }: {
  action: (fd: FormData) => void | Promise<void>; mensaje: string; children: React.ReactNode; className?: string;
}) {
  return (
    <form action={action} className={className} onSubmit={(e) => { if (!confirm(mensaje)) e.preventDefault(); }}>
      {children}
    </form>
  );
}
