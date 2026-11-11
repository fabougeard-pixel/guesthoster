import crypto from 'node:crypto';
import { env } from '@/lib/env';

export type SignedUploadPayload = {
    upload_url: string;
    params: {
        api_key: string;
        folder: string;
        timestamp: number;
        signature: string;
    };
};

function requireCloudinaryCredentials(): {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
} {
    const cloudName = env.cloudinaryCloudName;
    const apiKey = env.cloudinaryApiKey;
    const apiSecret = env.cloudinaryApiSecret;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Configuration Cloudinary incomplète.');
    }

    return {
        cloudName,
        apiKey,
        apiSecret,
        folder: env.cloudinaryFolder,
    };
}

export function isCloudinaryConfigured(): boolean {
    return Boolean(
        env.cloudinaryCloudName &&
            env.cloudinaryApiKey &&
            env.cloudinaryApiSecret,
    );
}

export function propertyUploadFolder(propertyId: number): string {
    const folder = env.cloudinaryFolder;
    return folder ? `${folder}/properties/${propertyId}` : `properties/${propertyId}`;
}

export function signCloudinaryParams(
    params: Record<string, string | number>,
    apiSecret: string,
): string {
    const serialized = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

    return crypto
        .createHash('sha1')
        .update(`${serialized}${apiSecret}`)
        .digest('hex');
}

export function signPropertyUpload(
    propertyId: number,
    timestamp?: number,
): SignedUploadPayload {
    const { cloudName, apiKey, apiSecret } = requireCloudinaryCredentials();
    const unixTimestamp = timestamp ?? Math.floor(Date.now() / 1000);
    const folder = propertyUploadFolder(propertyId);

    const signature = signCloudinaryParams(
        {
            folder,
            timestamp: unixTimestamp,
        },
        apiSecret,
    );

    return {
        upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        params: {
            api_key: apiKey,
            folder,
            timestamp: unixTimestamp,
            signature,
        },
    };
}

export function verifyCloudinaryUploadSignature(
    publicId: string,
    version: number,
    signature: string,
): boolean {
    const apiSecret = env.cloudinaryApiSecret;
    if (!apiSecret || !signature) {
        return false;
    }

    const expected = signCloudinaryParams(
        {
            public_id: publicId,
            version,
        },
        apiSecret,
    );

    const bufExpected = Buffer.from(expected);
    const bufSig = Buffer.from(signature);
    if (bufExpected.length !== bufSig.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufExpected, bufSig);
}

export function isValidPropertyPublicId(
    propertyId: number,
    publicId: string,
): boolean {
    const prefix = `${propertyUploadFolder(propertyId)}/`;
    return (
        !publicId.includes('..') &&
        publicId.startsWith(prefix) &&
        publicId.length > prefix.length
    );
}

export function cloudinaryDeliveryUrls(publicId: string): {
    url: string;
    thumbnail_url: string;
} {
    const { cloudName } = requireCloudinaryCredentials();
    const normalizedId = publicId.replace(/^\/+/, '');
    const base = `https://res.cloudinary.com/${cloudName}/image/upload`;

    return {
        url: `${base}/f_auto,q_auto,c_limit,w_1600,h_1600/${normalizedId}`,
        thumbnail_url: `${base}/f_auto,q_auto,c_limit,w_640,h_640/${normalizedId}`,
    };
}

export async function destroyCloudinaryAsset(
    publicId: string | null | undefined,
): Promise<void> {
    if (!publicId || !isCloudinaryConfigured()) {
        return;
    }

    const { cloudName, apiKey, apiSecret } = requireCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams(
        {
            public_id: publicId,
            timestamp,
        },
        apiSecret,
    );

    const body = new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
    });

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body,
        },
    ).catch((err) => {
        console.warn('Échec de suppression Cloudinary:', err);
        return null;
    });

    if (response && !response.ok) {
        console.warn('Échec de suppression Cloudinary:', response.status);
    }
}

