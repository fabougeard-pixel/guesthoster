import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compatibilité avec les hachages Laravel `$2y$` et Node `$2b$`.
 */
export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const normalizedHash = storedHash.startsWith('$2y$')
        ? `$2b$${storedHash.slice(4)}`
        : storedHash;

    return bcrypt.compare(password, normalizedHash);
}

