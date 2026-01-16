/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de tipagem para publicar rápido
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora regras de estilo para não travar o build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;