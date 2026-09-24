import { partirEnlaces } from '@/lib/enlaces';

/** Un texto tal cual, pero con sus direcciones web convertidas en enlaces que abren en otra pestaña. */
export function TextoConEnlaces({ texto, className }: { texto: string; className?: string }) {
  return (
    <p className={className}>
      {partirEnlaces(texto).map((tr, i) =>
        tr.tipo === 'enlace'
          ? <a key={i} href={tr.url} target="_blank" rel="noopener noreferrer" className="break-all text-acento underline underline-offset-2 hover:text-acento-oscuro">{tr.valor}</a>
          : <span key={i}>{tr.valor}</span>,
      )}
    </p>
  );
}
