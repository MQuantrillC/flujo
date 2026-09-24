# Flujo

Pendientes del equipo, en una línea. Escribes `@harold revisar /master/insights esta semana #insights` y queda creado el pendiente con responsable, título, fecha límite (el viernes) y etiqueta. Después: tablero con columnas por etapa (arrastrar y soltar), vistas «Lo mío», «Esta semana» y «Por persona», seguimiento con comentarios e imágenes, enlaces a documentos, importación en masa con ayuda de una IA, tema claro/oscuro y tres idiomas (ES · EN · PT).

## Correr en tu máquina

```bash
npm install
npm run dev
```

Abre http://localhost:3100, crea tu cuenta y tu primer equipo. Los datos quedan en `data/` (base SQLite e imágenes), fuera del repositorio.

- `npm test` corre las pruebas (línea rápida, importación, vistas, enlaces).
- `npm run lint` y `npx tsc --noEmit` antes de subir cambios.

## Cuentas e invitaciones

Cada persona crea su cuenta con nombre, apellido, correo, cumpleaños y contraseña (la contraseña se guarda como hash scrypt; las sesiones viven en la base y en una cookie `httpOnly`). Para invitar a alguien a un equipo basta con su correo: si todavía no tiene cuenta, verá el equipo en cuanto la cree con ese mismo correo.

## Desplegar

La app guarda todo en disco (SQLite + adjuntos), así que necesita una máquina con disco, no una plataforma sin estado. Con Docker y el `docker-compose.yml` incluido (Caddy delante, con HTTPS automático si hay dominio):

```bash
git clone https://github.com/MQuantrillC/flujo.git && cd flujo
cp .env.example .env        # FLUJO_DOMINIO=flujo.tudominio.com, o FLUJO_SIN_HTTPS=1 si entras por IP
docker compose up -d --build
```

Los datos quedan en `./data` de la máquina. Para actualizar: `git pull && docker compose up -d --build`. Sirve en una e2-micro gratuita de Google Compute Engine (agrega 2 GB de swap antes de construir), en Railway o Fly.io con un volumen en `/data`, o en cualquier VM.

Vercel y otras plataformas sin disco persistente no sirven tal cual: harían falta una base externa (Turso o Postgres) y un almacén de archivos. Todo el acceso a datos pasa por `lib/repositorio.ts`, que es lo único que habría que cambiar.

## Cómo está hecho

Next.js 16 (App Router, acciones de servidor), React 19, Tailwind 4, better-sqlite3, next-intl (idioma por cookie), motion y React Bits para las animaciones.

| Carpeta | Qué hay |
| --- | --- |
| `app/` | páginas: inicio (tus pendientes de todos los equipos), `/e/[equipo]` (tablero y vistas), `/e/[equipo]/t/[tarea]`, `/entrar`, `/registro`, `/cuenta` |
| `lib/parseRapido.ts` | la línea rápida: @responsables, #etiquetas, `!` prioridad, fechas en tres idiomas, enlaces |
| `lib/repositorio.ts` | toda la base de datos |
| `lib/importar.ts` | importación en masa (CSV, Excel o lista de líneas) |
| `messages/` | textos en español, inglés y portugués |
| `public/brand/` | logotipo y símbolo |
