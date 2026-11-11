import { describe, expect, it, vi } from 'vitest';
import {
    ADMIN_ALREADY_CONFIGURED_MESSAGE,
    type AdminSetupDb,
    type AdminSetupTx,
    createInitialAdminUser,
} from '@/lib/auth/admin-setup';
import { verifyPassword } from '@/lib/auth/password';

function createFakeDb(overrides?: Partial<AdminSetupTx['user']>): {
    db: AdminSetupDb;
    txUser: AdminSetupTx['user'];
    createSpy: ReturnType<typeof vi.fn>;
} {
    const createSpy = vi.fn(
        async (args: Parameters<AdminSetupTx['user']['create']>[0]) => ({
            id: 1,
            email: args.data.email,
        }),
    );

    const txUser: AdminSetupTx['user'] = {
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        create: createSpy,
        ...overrides,
    };

    const db: AdminSetupDb = {
        $transaction: async (fn) => fn({ user: txUser }),
    };

    return { db, txUser, createSpy };
}

describe('Initial admin setup', () => {
    it('creates the first verified admin with normalized email and hashed password', async () => {
        const { db, createSpy } = createFakeDb();

        const result = await createInitialAdminUser(
            {
                email: '  Admin@GuestHoster.com ',
                password: 'SuperPassword123!',
                password_confirmation: 'SuperPassword123!',
            },
            db,
        );

        expect(result).toEqual({
            ok: true,
            adminId: 1,
            email: 'admin@guesthoster.com',
        });

        expect(createSpy).toHaveBeenCalledTimes(1);
        const createdData = createSpy.mock.calls[0][0].data;
        expect(createdData.name).toBe('Administrateur');
        expect(createdData.email).toBe('admin@guesthoster.com');
        expect(createdData.role).toBe('admin');
        expect(createdData.emailVerifiedAt).toBeInstanceOf(Date);
        expect(
            await verifyPassword('SuperPassword123!', createdData.password),
        ).toBe(true);
    });

    it('accepts a custom admin name and trims whitespace', async () => {
        const { db, createSpy } = createFakeDb();

        const result = await createInitialAdminUser(
            {
                name: '  Fabrice Admin  ',
                email: 'fabrice@guesthoster.com',
                password: 'SuperPassword123!',
                password_confirmation: 'SuperPassword123!',
            },
            db,
        );

        expect(result.ok).toBe(true);
        expect(createSpy.mock.calls[0][0].data.name).toBe('Fabrice Admin');
    });

    it('refuses setup once an admin already exists', async () => {
        const { db, createSpy } = createFakeDb({
            findFirst: vi.fn(async () => ({ id: 99 })),
        });

        const result = await createInitialAdminUser(
            {
                email: 'second@guesthoster.com',
                password: 'SuperPassword123!',
                password_confirmation: 'SuperPassword123!',
            },
            db,
        );

        expect(result).toEqual({
            ok: false,
            alreadyConfigured: true,
            error: ADMIN_ALREADY_CONFIGURED_MESSAGE,
        });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects duplicate email when a non-admin already uses it', async () => {
        const { db, createSpy } = createFakeDb({
            findUnique: vi.fn(async () => ({ id: 42 })),
        });

        const result = await createInitialAdminUser(
            {
                email: 'existing@guesthoster.com',
                password: 'SuperPassword123!',
                password_confirmation: 'SuperPassword123!',
            },
            db,
        );

        expect(result).toEqual({
            ok: false,
            fieldErrors: {
                email: 'Cette adresse e-mail est déjà utilisée.',
            },
        });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid input and password confirmation mismatches before touching db', async () => {
        const txSpy = vi.fn();
        const db: AdminSetupDb = { $transaction: txSpy };

        const result = await createInitialAdminUser(
            {
                email: 'not-an-email',
                password: 'short',
                password_confirmation: 'mismatch',
            },
            db,
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors?.email).toBeDefined();
            expect(result.fieldErrors?.password).toBeDefined();
            expect(result.fieldErrors?.password_confirmation).toBeDefined();
        }
        expect(txSpy).not.toHaveBeenCalled();
    });

    it('handles concurrent serializable conflict P2034 gracefully', async () => {
        const db: AdminSetupDb = {
            $transaction: async () => {
                throw { code: 'P2034' };
            },
        };

        const result = await createInitialAdminUser(
            {
                email: 'race@guesthoster.com',
                password: 'SuperPassword123!',
                password_confirmation: 'SuperPassword123!',
            },
            db,
        );

        expect(result).toEqual({
            ok: false,
            alreadyConfigured: true,
            error: ADMIN_ALREADY_CONFIGURED_MESSAGE,
        });
    });
});

