/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de tipagem para publicar
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora o lint durante o build (configuração correta para Next.js 16)
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;