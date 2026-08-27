import { CheckoutSessions } from './resources/checkout-sessions.js';
import { Contracts } from './resources/contracts.js';
import { HttpTransport } from './transport.js';
import type { CheckoutSession, CreateCheckoutSessionParams } from './types.js';

export interface ShotPayClientOptions {
    clientId: string;
    apiKey: string;
    baseUrl?: string;
}

/**
 * A client for the ShotPay API documented at
 * https://shotpay-platform.test/docs/api/ — the checkout session lifecycle
 * under `checkoutSessions`, your agreements under `contracts`, and (via
 * `verifyWebhookSignature`) confirmation that a delivery is genuine. Endpoints
 * without a resource here stay callable directly, the same way this client is
 * built.
 */
export class ShotPayClient {
    readonly checkoutSessions: CheckoutSessions;
    readonly contracts: Contracts;

    constructor(options: ShotPayClientOptions) {
        const transport = new HttpTransport(
            options.clientId,
            options.apiKey,
            options.baseUrl ?? 'https://sandbox.shotpay.com/api',
        );

        this.checkoutSessions = new CheckoutSessions(transport);
        this.contracts = new Contracts(transport);
    }

    /**
     * @deprecated Use `client.checkoutSessions.create()`. Removed in 0.3.0.
     */
    createCheckoutSession(
        params: CreateCheckoutSessionParams,
        idempotencyKey?: string,
    ): Promise<CheckoutSession> {
        return this.checkoutSessions.create(params, idempotencyKey);
    }

    /**
     * @deprecated Use `client.checkoutSessions.retrieve()`. Removed in 0.3.0.
     */
    retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
        return this.checkoutSessions.retrieve(id);
    }
}
