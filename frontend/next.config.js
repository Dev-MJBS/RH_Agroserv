/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Isso ajuda a resolver erros de pacotes ESM modernos no ambiente do Netlify
    transpilePackages: ['firebase', '@firebase/auth', '@firebase/app'],
}

export default nextConfig;
