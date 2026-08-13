import { ShotPayApiError } from './errors.js';
import type { CheckoutSession, CreateCheckoutSessionParams } from './types.js';

export interface ShotPayClientOptions {
    clientId: string;
    apiKey: string;
    baseUrl?: string;
}

/**
 * A thin wrapper around the checkout session lifecycle documented at
 * https://shotpay-platform.test/docs/api/ — open a session, retrieve one your
 * server opened, and (via `verifyWebhookSignature`) confirm a delivery is
 * genuine. Not a full API client: everything else in the widget API is called
 * directly, the same way this client is built.
 */
export class ShotPayClient {
    private readonly clientId: string;
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(options: ShotPayClientOptions) {
        this.clientId = options.clientId;
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl ?? 'https://shotpay-platform.test/api').replace(/\/+$/, '');
    }

    /**
     * `POST /widget/sessions`. Pass `idempotencyKey` to make a retry of this
     * exact call safe — replaying the same key with the same params returns
     * the original session rather than opening a second one.
     */
    async createCheckoutSession(
        params: CreateCheckoutSessionParams,
        idempotencyKey?: string,
    ): Promise<CheckoutSession> {
        return this.request('POST', '/widget/sessions', {
            body: JSON.stringify(params),
            headers: idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey },
        });
    }

    /**
     * `GET /widget/checkout-sessions/{id}`. The server-to-server counterpart
     * to create — ask what happened to a session without waiting on a
     * webhook. Requires a key with the `widget:read` scope.
     */
    async retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
        return this.request('GET', `/widget/checkout-sessions/${encodeURIComponent(id)}`);
    }

    private async request(
        method: string,
        path: string,
        init: { body?: string; headers?: Record<string, string> } = {},
    ): Promise<CheckoutSession> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                'X-Client-Id': this.clientId,
                'X-Api-Key': this.apiKey,
                Accept: 'application/json',
                ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
                ...init.headers,
            },
            body: init.body,
        });

        const payload = (await response.json()) as { data?: CheckoutSession; message?: string };

        if (!response.ok) {
            throw new ShotPayApiError(response.status, payload as Record<string, unknown>);
        }

        return payload.data as CheckoutSession;
    }
}
