import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! ATENÇÃO !!
    // Perigosamente permite o build mesmo com erros de tipagem.
    // Usamos isso para testar rápido em produção.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora avisos de estilo durante o build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;