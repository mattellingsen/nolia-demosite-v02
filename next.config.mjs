/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    devIndicators: false,
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
