import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../src/mount.js';

const checkoutUrl = 'https://checkout.shotpay.test/cs_456';

function host(): HTMLElement {
    const element = document.createElement('div');
    document.body.appendChild(element);
    return element;
}

function clickAndSettle(element: HTMLElement): Promise<void> {
    (element.querySelector('button') as HTMLButtonElement).click();
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.getElementById('shotpay-button-styles')?.remove();
});

describe('endpoint mode', () => {
    it('POSTs an empty JSON body with an Idempotency-Key header', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(201, { checkout_url: checkoutUrl }));
        vi.stubGlobal('fetch', fetchMock);

        const element = host();
        mount(element, { endpoint: '/shotpay/session', onSession: () => {} });
        await clickAndSettle(element);

        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/shotpay/session');
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('same-origin');
        expect(init.body).toBe('{}');

        const headers = init.headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers.Accept).toBe('application/json');
        expect(headers['Idempotency-Key']).toMatch(/\S/);
    });

    it.each([
        ['a bare session', { checkout_url: checkoutUrl }],
        ['a Laravel data envelope', { data: { checkout_url: checkoutUrl } }],
    ])('accepts %s', async (_name, body) => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(201, body)));

        const element = host();
        const onSession = vi.fn();
        mount(element, { endpoint: '/shotpay/session', onSession });
        await clickAndSettle(element);

        expect(onSession).toHaveBeenCalledWith(
            expect.objectContaining({ checkout_url: checkoutUrl }),
        );
    });

    it('surfaces the server message on a non-2xx response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse(422, { message: 'The amount is out of range.' })),
        );

        const element = host();
        const onError = vi.fn();
        mount(element, { endpoint: '/shotpay/session', onError });
        await clickAndSettle(element);

        expect(onError).toHaveBeenCalledOnce();
        const error = onError.mock.calls[0][0] as {
            message: string;
            status?: number;
            name: string;
        };
        expect(error.name).toBe('ShotPayButtonError');
        expect(error.message).toBe('The amount is out of range.');
        expect(error.status).toBe(422);
    });

    it('falls back to a generic message when the error body has none', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, {})));

        const element = host();
        const onError = vi.fn();
        mount(element, { endpoint: '/shotpay/session', onError });
        await clickAndSettle(element);

        expect((onError.mock.calls[0][0] as Error).message).toBe(
            'The session endpoint responded with status 500.',
        );
    });

    it('rejects a 2xx response with no checkout_url', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { data: { id: 'cs_1' } })));

        const element = host();
        const onError = vi.fn();
        mount(element, { endpoint: '/shotpay/session', onError });
        await clickAndSettle(element);

        expect((onError.mock.calls[0][0] as Error).message).toBe(
            'The session endpoint did not return a checkout_url.',
        );
    });
});
