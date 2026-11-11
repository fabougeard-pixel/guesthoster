import { NextResponse } from 'next/server';
import { getFreshSessionUser, isHostOrAdmin } from '@/lib/auth/session';
import { MAX_PHOTOS } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import {
    isCloudinaryConfigured,
    signPropertyUpload,
} from '@/lib/services/cloudinary';

export async function POST(
    _request: Request,
    context: { params: Promise<{ slug: string }> },
) {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return NextResponse.json(
            { message: 'Accès non autorisé.' },
            { status: 403 },
        );
    }

    const { slug } = await context.params;
    const property = await prisma.property.findUnique({
        where: { slug },
        include: { _count: { select: { images: true } } },
    });

    if (!property) {
        return NextResponse.json(
            { message: 'Logement introuvable.' },
            { status: 404 },
        );
    }

    if (property.userId !== user.id && user.role !== 'admin') {
        return NextResponse.json(
            { message: 'Accès non autorisé.' },
            { status: 403 },
        );
    }

    if (!isCloudinaryConfigured()) {
        return NextResponse.json(
            { message: 'Configuration Cloudinary manquante.' },
            { status: 503 },
        );
    }

    if (property._count.images >= MAX_PHOTOS) {
        return NextResponse.json(
            {
                message: `Maximum ${MAX_PHOTOS} photos autorisées par logement.`,
            },
            { status: 422 },
        );
    }

    return NextResponse.json(signPropertyUpload(property.id));
}

