import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShotPayClient } from '../src/client.js';
import type { CheckoutSession, CreateCheckoutSessionParams } from '../src/types.js';
import { callAt, fetchMock, jsonResponse } from './support.js';

const client = new ShotPayClient({
    clientId: 'mch_test_1',
    apiKey: 'sk_test_1',
    baseUrl: 'https://sandbox.shotpay.com/api',
});

const params: CreateCheckoutSessionParams = {
    order_reference: 'ORD-1001',
    total_amount: 49999,
    return_url: 'https://store.example/checkout/complete',
    cancel_url: 'https://store.example/cart',
};

function sessionPayload(overrides: Partial<CheckoutSession> = {}): CheckoutSession {
    return {
        id: 'cs_test_123',
        status: 'pending',
        order_reference: 'ORD-1001',
        total_amount: 49999,
        down_payment_amount: 12500,
        down_payment_percentage: 25,
        checkout_url: 'https://sandbox.shotpay.com/c/cs_test_123',
        return_url: 'https://store.example/checkout/complete',
        cancel_url: 'https://store.example/cart',
        expires_at: '2026-08-26T12:00:00.000000Z',
        created_at: '2026-08-26T11:00:00.000000Z',
        metadata: {},
        ...overrides,
    };
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('create', () => {
    it('posts the params and maps the session', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: sessionPayload() }));

        const session = await client.checkoutSessions.create(params);

        const { url, init } = callAt(0);
        expect(url).toBe('https://sandbox.shotpay.com/api/v1/sessions');
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(init.body).toBe(JSON.stringify(params));
        expect(session.id).toBe('cs_test_123');
        expect(session.checkout_url).toBe('https://sandbox.shotpay.com/c/cs_test_123');
    });

    it('sends the idempotency key only when one is supplied', async () => {
        // A Response body reads once, so each call needs its own.
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ data: sessionPayload() })));

        await client.checkoutSessions.create(params, 'a-uuid-per-attempt');
        await client.checkoutSessions.create(params);

        expect(callAt(0).init.headers['Idempotency-Key']).toBe('a-uuid-per-attempt');
        expect(callAt(1).init.headers).not.toHaveProperty('Idempotency-Key');
    });
});

describe('retrieve', () => {
    it('gets the session by an encoded id', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: sessionPayload() }));

        await client.checkoutSessions.retrieve('cs test/123');

        const { url, init } = callAt(0);
        expect(url).toBe('https://sandbox.shotpay.com/api/v1/checkout-sessions/cs%20test%2F123');
        expect(init.method).toBe('GET');
    });
});

describe('deprecated aliases', () => {
    it('reach the same endpoints as the resource methods', async () => {
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ data: sessionPayload() })));

        await client.createCheckoutSession(params, 'a-uuid-per-attempt');
        await client.retrieveCheckoutSession('cs_test_123');

        expect(callAt(0).url).toBe('https://sandbox.shotpay.com/api/v1/sessions');
        expect(callAt(0).init.headers['Idempotency-Key']).toBe('a-uuid-per-attempt');
        expect(callAt(1).url).toBe('https://sandbox.shotpay.com/api/v1/checkout-sessions/cs_test_123');
    });
});

describe('errors', () => {
    it('raises with the status and body when a session is refused', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'Layaway is not available.' }, 422));

        await expect(client.checkoutSessions.retrieve('cs_test_123')).rejects.toMatchObject({
            name: 'ShotPayApiError',
            status: 422,
            message: 'Layaway is not available.',
        });
    });
});
