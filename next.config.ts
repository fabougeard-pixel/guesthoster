import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    serverExternalPackages: ['@prisma/client', 'bcryptjs'],
    outputFileTracingIncludes: {
        '/**': ['./node_modules/.prisma/client/**/*'],
    },
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
