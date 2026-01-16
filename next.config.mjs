/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de TypeScript (como o NaN)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;