/**
 * Exercises this client against a real, locally-served shotpay-platform
 * instance — the thing every other test here mocks. Run by that app's own
 * `sdk-e2e-js` CI job, which boots itself, seeds a real merchant/key/contract
 * (database/seeders/E2eSdkCredentialsSeeder.php), and exports the
 * SHOTPAY_E2E_* vars these tests read. Without them, the whole file skips
 * rather than fails, so `npm test` stays green for anyone running it locally
 * with no server to hit.
 */
import { describe, expect, test } from 'vitest';
import { ShotPayClient } from '../src/client.js';
import { verifyWebhookSignature } from '../src/webhooks.js';

const baseUrl = process.env.SHOTPAY_E2E_BASE_URL;

describe.skipIf(!baseUrl)('e2e against a real server', () => {
    function client(): ShotPayClient {
        return new ShotPayClient({
            clientId: process.env.SHOTPAY_E2E_CLIENT_ID ?? '',
            apiKey: process.env.SHOTPAY_E2E_API_KEY ?? '',
            baseUrl,
        });
    }

    test('creates and retrieves a real checkout session', async () => {
        const session = await client().checkoutSessions.create({
            order_reference: `E2E-${Math.random().toString(16).slice(2)}`,
            total_amount: 49999,
            customer_state: 'TX',
            return_url: 'https://example.test/return',
            cancel_url: 'https://example.test/cancel',
        });

        expect(session.id.startsWith('cs_')).toBe(true);
        expect(session.status).toBe('pending');
        expect(session.total_amount).toBe(49999);

        const fetched = await client().checkoutSessions.retrieve(session.id);

        expect(fetched.id).toBe(session.id);
    });

    test('retrieves a real contract seeded by the server', async () => {
        const reference = process.env.SHOTPAY_E2E_CONTRACT_REFERENCE ?? '';

        const contract = await client().contracts.retrieve(reference);

        expect(contract.reference).toBe(reference);
    });

    test('verifies a signature the real server actually signed', () => {
        const verified = verifyWebhookSignature(
            process.env.SHOTPAY_E2E_WEBHOOK_PAYLOAD ?? '',
            process.env.SHOTPAY_E2E_WEBHOOK_SECRET ?? '',
            process.env.SHOTPAY_E2E_WEBHOOK_SIGNATURE ?? '',
        );

        expect(verified).toBe(true);
    });
});
