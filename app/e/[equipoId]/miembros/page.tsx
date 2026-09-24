import { redirect } from 'next/navigation';

/** La página se llamaba «Miembros»; los enlaces viejos siguen funcionando. */
export default async function Miembros({ params }: { params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  redirect(`/e/${equipoId}/ajustes`);
}
