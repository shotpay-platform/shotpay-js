import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShotPayClient } from '../src/client.js';
import { ShotPayApiError } from '../src/errors.js';
import { callAt, contractPayload, fetchMock, jsonResponse } from './support.js';

const client = new ShotPayClient({
    clientId: 'mch_test_1',
    apiKey: 'sk_test_1',
    baseUrl: 'https://sandbox.shotpay.com/api',
});

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('list', () => {
    it('sends the filter as a query string and maps the page', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                data: [contractPayload()],
                links: { first: 'https://x/?page=1', last: 'https://x/?page=3', prev: null, next: 'https://x/?page=2' },
                meta: { current_page: 1, last_page: 3, per_page: 15, total: 42, from: 1, to: 15 },
            }),
        );

        const page = await client.contracts.list({ status: 'active', page: 1 });

        const { url, init } = callAt(0);
        expect(url).toBe('https://sandbox.shotpay.com/api/v1/contracts?status=active&page=1');
        expect(init.method).toBe('GET');
        expect(page.data).toHaveLength(1);
        expect(page.data[0]!.reference).toBe('LAY-XK2M9QPR7V');
        expect(page.data[0]!.items[0]!.name).toBe('Hunting Rifle');
        expect(page.meta.current_page).toBe(1);
        expect(page.meta.last_page).toBe(3);
        expect(page.meta.total).toBe(42);
        expect(page.links.next).toBe('https://x/?page=2');
        expect(page.links.prev).toBeNull();
    });

    it('sends no query string when given no parameters', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                data: [],
                links: { first: null, last: null, prev: null, next: null },
                meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null },
            }),
        );

        const page = await client.contracts.list();

        expect(callAt(0).url).toBe('https://sandbox.shotpay.com/api/v1/contracts');
        expect(page.data).toEqual([]);
    });
});

describe('retrieve', () => {
    it('carries the credential headers and sends no content type without a body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: contractPayload() }));

        await client.contracts.retrieve('LAY-XK2M9QPR7V');

        const { init } = callAt(0);
        expect(init.headers['X-Client-Id']).toBe('mch_test_1');
        expect(init.headers['X-Api-Key']).toBe('sk_test_1');
        expect(init.headers.Accept).toBe('application/json');
        expect(init.headers).not.toHaveProperty('Content-Type');
        expect(init.body).toBeUndefined();
    });

    it('maps every field including the schedule', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: contractPayload() }));

        const contract = await client.contracts.retrieve('LAY-XK2M9QPR7V');

        expect(contract.order_reference).toBe('SO-2026-0042');
        expect(contract.customer_total).toBe(105000);
        expect(contract.remaining_amount).toBe(78750);
        expect(contract.metadata).toEqual({ sales_rep: 'kim' });
        expect(contract.installments).toHaveLength(2);
        expect(contract.installments[0]!.due_date).toBe('2026-09-25');
        expect(contract.installments[0]!.paid_at).toBe('2026-09-25T10:00:00.000000Z');
        expect(contract.installments[1]!.paid_at).toBeNull();
    });

    it('passes the nullable fields through as null', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                data: contractPayload({
                    order_reference: null,
                    customer_state: null,
                    started_at: null,
                    metadata: {},
                }),
            }),
        );

        const contract = await client.contracts.retrieve('LAY-XK2M9QPR7V');

        expect(contract.order_reference).toBeNull();
        expect(contract.customer_state).toBeNull();
        expect(contract.started_at).toBeNull();
        expect(contract.metadata).toEqual({});
    });

    it('encodes a reference needing escaping into the path', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: contractPayload() }));

        await client.contracts.retrieve('LAY/../secrets');

        expect(callAt(0).url).toBe('https://sandbox.shotpay.com/api/v1/contracts/LAY%2F..%2Fsecrets');
    });
});

describe('update', () => {
    it('sends a patch carrying the body as passed', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: contractPayload({ order_reference: 'SO-9' }) }));

        const contract = await client.contracts.update('LAY-XK2M9QPR7V', { order_reference: 'SO-9' });

        const { url, init } = callAt(0);
        expect(url).toBe('https://sandbox.shotpay.com/api/v1/contracts/LAY-XK2M9QPR7V');
        expect(init.method).toBe('PATCH');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(init.body).toBe('{"order_reference":"SO-9"}');
        expect(contract.order_reference).toBe('SO-9');
    });

    it('sends json null when clearing metadata rather than dropping the key', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: contractPayload({ metadata: {} }) }));

        await client.contracts.update('LAY-XK2M9QPR7V', { metadata: null });

        expect(callAt(0).init.body).toBe('{"metadata":null}');
    });
});

describe('cancel', () => {
    it('posts to the cancel path with no body', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                data: contractPayload({ status: 'cancelled', cancelled_at: '2026-08-26T12:00:00.000000Z' }),
            }),
        );

        const contract = await client.contracts.cancel('LAY-XK2M9QPR7V');

        const { url, init } = callAt(0);
        expect(url).toBe('https://sandbox.shotpay.com/api/v1/contracts/LAY-XK2M9QPR7V/cancel');
        expect(init.method).toBe('POST');
        expect(init.body).toBeUndefined();
        expect(init.headers).not.toHaveProperty('Content-Type');
        expect(contract.status).toBe('cancelled');
        expect(contract.cancelled_at).toBe('2026-08-26T12:00:00.000000Z');
    });
});

describe('errors', () => {
    it('raises with the status and body for an unknown reference', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'No contract matches that reference.' }, 404));

        await expect(client.contracts.retrieve('LAY-NOPE')).rejects.toMatchObject({
            name: 'ShotPayApiError',
            status: 404,
            message: 'No contract matches that reference.',
        });
    });

    it('raises when the key is missing the write scope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'This key is missing the contracts:write scope.' }, 403));

        await expect(client.contracts.cancel('LAY-XK2M9QPR7V')).rejects.toMatchObject({ status: 403 });
    });

    it('preserves the body when cancelling a resolved agreement', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'This agreement has already completed.' }, 422));

        await expect(client.contracts.cancel('LAY-XK2M9QPR7V')).rejects.toMatchObject({
            status: 422,
            body: { message: 'This agreement has already completed.' },
        });
    });

    it('raises the api error, not a parse error, for a throttle with an empty body', async () => {
        fetchMock.mockResolvedValue(new Response('', { status: 429 }));

        const error = await client.contracts.list().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ShotPayApiError);
        expect((error as ShotPayApiError).status).toBe(429);
    });

    it('raises the api error for a gateway failure carrying html', async () => {
        fetchMock.mockResolvedValue(new Response('<html>502 Bad Gateway</html>', { status: 502 }));

        const error = await client.contracts.list().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ShotPayApiError);
        expect((error as ShotPayApiError).status).toBe(502);
        expect((error as ShotPayApiError).body.message).toBe('<html>502 Bad Gateway</html>');
    });

    it('raises rather than returning a half-built page when data is not an array', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: { reference: 'LAY-1' } }));

        await expect(client.contracts.list()).rejects.toBeInstanceOf(ShotPayApiError);
    });
});
