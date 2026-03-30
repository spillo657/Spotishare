/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // Mettiamo false così il tuo browser non lo memorizza in modo permanente mentre facciamo i test
      },
    ]
  },
};

export default nextConfig;