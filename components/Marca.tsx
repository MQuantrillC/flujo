import Image from 'next/image';

/** El logotipo, en su versión clara u oscura según el tema. */
export function Marca({ alto = 28, soloSimbolo = false }: { alto?: number; soloSimbolo?: boolean }) {
  if (soloSimbolo) return <Image src="/brand/simbolo.svg" alt="Flujo" width={alto} height={alto} priority />;
  const ancho = Math.round((alto * 126) / 48);
  return (
    <>
      <Image src="/brand/logo.svg" alt="Flujo" width={ancho} height={alto} className="dark:hidden" priority />
      <Image src="/brand/logo-dark.svg" alt="Flujo" width={ancho} height={alto} className="hidden dark:block" priority />
    </>
  );
}
