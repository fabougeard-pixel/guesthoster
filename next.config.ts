import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/settings',
                destination: '/settings/profile',
                permanent: false,
            },
        ];
    },
};

export default nextConfig;

