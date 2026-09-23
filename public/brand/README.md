# Marca de Flujo — dónde dejar cada cosa

Flujo es un rastreador de pendientes de equipo: escribes una línea
(«@harold revisar /master/insights esta semana») y se crea el pendiente con
responsable, fecha y etiquetas. Tono: ligero, claro, sin ruido. Color actual de
acento: `#1899af` (teal), sobre fondo `#f3f6f8`.

Archivos que la app espera:

| Qué                         | Dónde                                | Notas                                            |
|-----------------------------|--------------------------------------|--------------------------------------------------|
| Logotipo (símbolo + nombre) | `public/brand/logo.svg`              | Fondo transparente; versión oscura `logo-dark.svg` |
| Símbolo solo                | `public/brand/simbolo.svg`           | Cuadrado, para tamaños chicos                    |
| Favicon / icono de la app   | `app/icon.png`                       | 512×512, Next.js lo sirve solo                   |
| Icono Apple                 | `app/apple-icon.png`                 | 180×180 (opcional)                               |
| Imagen para compartir       | `app/opengraph-image.png`            | 1200×630 (opcional)                              |
| Colores y tipografía        | `app/globals.css` (bloque `:root`)   | `--acento`, `--acento-oscuro`, `--background`, `--foreground` |

Si el brand kit trae una fuente, indicar el nombre de Google Fonts: se carga en
`app/layout.tsx` (hoy usa Geist).
