import type { HttpTransport } from '../transport.js';
import type { CheckoutSession, CreateCheckoutSessionParams } from '../types.js';

/** The checkout session lifecycle, documented at `/docs/api/checkout-sessions/`. */
export class CheckoutSessions {
    constructor(private readonly transport: HttpTransport) {}

    /**
     * `POST /v1/sessions`. Pass `idempotencyKey` to make a retry of this exact
     * call safe — replaying the same key with the same params returns the
     * original session rather than opening a second one. Requires a key with
     * the `checkout:write` scope.
     */
    create(params: CreateCheckoutSessionParams, idempotencyKey?: string): Promise<CheckoutSession> {
        return this.transport.object<CheckoutSession>('POST', '/v1/sessions', {
            body: params,
            headers: idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey },
        });
    }

    /**
     * `GET /v1/checkout-sessions/{id}`. The server-to-server counterpart to
     * create — ask what happened to a session without waiting on a webhook.
     * Requires a key with the `checkout:read` scope.
     */
    retrieve(id: string): Promise<CheckoutSession> {
        return this.transport.object<CheckoutSession>('GET', `/v1/checkout-sessions/${encodeURIComponent(id)}`);
    }
}
