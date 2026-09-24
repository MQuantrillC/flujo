import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Para el contenedor: un servidor Node autónomo en .next/standalone.
  output: "standalone",
  // better-sqlite3 es un módulo nativo: se carga desde node_modules, no se empaqueta.
  serverExternalPackages: ["better-sqlite3"],
};

// Lee i18n/request.ts: el idioma sale de una cookie, sin rutas por idioma.
export default createNextIntlPlugin()(nextConfig);
